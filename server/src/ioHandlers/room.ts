import { randomBytes } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../io.types';
import type { CreateRoomPayload, CreateRoomCallbackResponse, Room, JoinRoomPayload, RoomActionPayload, RoomActionCallbackResponse, RoomStateResponse } from '../room.types';
import { advanceGuesser, evictPlayer, getPublicGameState, initializeGame } from '../gameLogic';
import { getCardCount } from '../db/cards';

const roomHandler = (
    io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    rooms: Map<string, Room>,
) => {
    const syncRoomAfterPlayerChange = (roomId: string, room: Room) => {
        if (room.players.length === 0) {
            clearTimeout(room.turnTimerHandle);
            for (const handle of room.disconnectTimers.values()) clearTimeout(handle);
            rooms.delete(roomId);
            return;
        }

        room.hostSocketId = room.players.find((player) => player.playerId === room.hostPlayerId)?.socketId ?? '';

        io.to(roomId).emit('room:state', getPublicRoomState(roomId, rooms));
    };

    const assignNextHost = (room: Room) => {
        const nextHost = room.players[0];
        if (!nextHost) return;

        room.hostPlayerId = nextHost.playerId;
        room.hostSocketId = nextHost.socketId;
        room.hostUsername = nextHost.username;
    };

    const detachSocketFromRooms = (socketId: string) => {
        for (const [roomId, room] of rooms.entries()) {
            const player = room.players.find((entry) => entry.socketId === socketId);
            if (!player) continue;

            player.socketId = '';
            if (player.playerId === room.hostPlayerId) {
                room.hostSocketId = '';
            }

            if (room.gameState && !room.gameState.winner) {
                const timeline = room.gameState.timelines.find((t) => t.playerId === player.playerId);
                if (timeline) {
                    timeline.isConnected = false;
                    timeline.disconnectedAt = Date.now();
                }

                // If it's this player's turn, advance immediately
                if (room.gameState.turn?.currentGuesserId === player.playerId) {
                    clearTimeout(room.turnTimerHandle);
                    advanceGuesser(room, roomId, io);
                } else {
                    io.to(roomId).emit('game:state', getPublicGameState(room.gameState));
                }

                // Start 60s eviction timer
                const handle = setTimeout(
                    () => evictPlayer(roomId, player.playerId, room, io, () => syncRoomAfterPlayerChange(roomId, room)),
                    60_000,
                );
                room.disconnectTimers.set(player.playerId, handle);
            } else {
                io.to(roomId).emit('room:state', getPublicRoomState(roomId, rooms));
            }
        }
    };

    const removePlayerFromRooms = (socketId: string, options?: { excludeRoomId?: string; preserveHost?: boolean }) => {
        for (const [roomId, room] of rooms.entries()) {
            if (roomId === options?.excludeRoomId) continue;

            const removedPlayer = room.players.find((player) => player.socketId === socketId);
            if (!removedPlayer) continue;

            room.players = room.players.filter((player) => player.socketId !== socketId);

            if (removedPlayer.playerId === room.hostPlayerId && !options?.preserveHost && room.players.length > 0) {
                assignNextHost(room);
            }

            syncRoomAfterPlayerChange(roomId, room);
        }
    };

    const createRoom = (payload: CreateRoomPayload, callback?: (response: CreateRoomCallbackResponse) => void) => {
        try {
            const playerId = payload.playerId?.trim();
            const username = payload.username?.trim();
            const password = payload.password?.trim();
            const cardSetId = payload.cardSetId;

            if (!playerId) {
                callback?.({ ok: false, error: 'Player ID is required' });
                return;
            }
            if (!username) {
                callback?.({ ok: false, error: 'Username is required' });
                return;
            }

            removePlayerFromRooms(socket.id);

            for (const joinedRoomId of socket.rooms) {
                if (joinedRoomId !== socket.id) socket.leave(joinedRoomId);
            }

            const roomId: string = createUniqueRoomId(rooms);

            rooms.set(roomId, {
                hostPlayerId: playerId,
                hostSocketId: socket.id,
                hostUsername: username,
                password,
                cardSetId,
                players: [{ playerId, socketId: socket.id, username }],
                createdAt: Date.now(),
                hasStarted: false,
                disconnectTimers: new Map(),
            });

            socket.join(roomId);

            callback?.({ ok: true, roomId });

            io.to(roomId).emit('room:state', getPublicRoomState(roomId, rooms));
        } catch {
            callback?.({ ok: false, error: 'Failed to create room' });
        }
    };

    const joinRoom = (payload: JoinRoomPayload, callback?: (response: CreateRoomCallbackResponse) => void) => {
        try {
            const roomId: string = payload.roomId?.trim().toUpperCase();
            const playerId: string = payload.playerId?.trim();
            const username: string = payload.username?.trim();
            const password: string = payload.password?.trim() ?? '';

            if (!roomId) {
                callback?.({ ok: false, error: 'Room ID is required' });
                return;
            }
            if (!playerId) {
                callback?.({ ok: false, error: 'Player ID is required' });
                return;
            }
            if (!username) {
                callback?.({ ok: false, error: 'Username is required' });
                return;
            }

            const room = rooms.get(roomId);

            if (!room) {
                callback?.({ ok: false, error: 'Room not found' });
                return;
            }

            const existingPlayer = room.players.find((player) => player.playerId === playerId);

            if (!existingPlayer && room.players.length >= 8) {
                callback?.({ ok: false, error: 'Room is full' });
                return;
            }

            if (!existingPlayer) {
                if ((room.password ?? '') !== password) {
                    callback?.({ ok: false, error: 'Incorrect room password' });
                    return;
                }

                const usernameTaken = room.players.some((player) => player.username.toLowerCase() === username.toLowerCase() && player.playerId !== playerId);
                if (usernameTaken) {
                    callback?.({ ok: false, error: 'Username is already taken in this room' });
                    return;
                }

                removePlayerFromRooms(socket.id, { excludeRoomId: roomId });

                for (const joinedRoomId of socket.rooms) {
                    if (joinedRoomId !== socket.id && joinedRoomId !== roomId) socket.leave(joinedRoomId);
                }

                room.players.push({ playerId, socketId: socket.id, username });
            } else {
                existingPlayer.socketId = socket.id;
                existingPlayer.username = username;

                // Reconnecting player — clear eviction timer and restore game connection
                if (room.gameState && !room.gameState.winner) {
                    const handle = room.disconnectTimers.get(playerId);
                    if (handle !== undefined) {
                        clearTimeout(handle);
                        room.disconnectTimers.delete(playerId);
                    }

                    const timeline = room.gameState.timelines.find((t) => t.playerId === playerId);
                    if (timeline) {
                        timeline.isConnected = true;
                        delete timeline.disconnectedAt;
                    }

                    // Send full game state directly to reconnecting socket
                    socket.emit('game:state', getPublicGameState(room.gameState));
                }
            }

            if (room.hostPlayerId === playerId) {
                room.hostSocketId = socket.id;
                room.hostUsername = username;
            }

            socket.join(roomId);

            callback?.({ ok: true, roomId });

            io.to(roomId).emit('room:state', getPublicRoomState(roomId, rooms));

            // Broadcast updated game state (connection status change) to all in room
            if (room.gameState) {
                io.to(roomId).emit('game:state', getPublicGameState(room.gameState));
            }
        } catch {
            callback?.({ ok: false, error: 'Failed to join room' });
        }
    };

    const leaveRoom = (payload: RoomActionPayload, callback?: (response: RoomActionCallbackResponse) => void) => {
        try {
            const roomId = payload.roomId?.trim().toUpperCase();
            const playerId = payload.playerId?.trim();
            if (!roomId) {
                callback?.({ ok: false, error: 'Room ID is required' });
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                socket.leave(roomId);
                callback?.({ ok: true });
                return;
            }

            const leavingPlayer = room.players.find((player) => player.playerId === playerId || player.socketId === socket.id);
            if (!leavingPlayer) {
                socket.leave(roomId);
                callback?.({ ok: true });
                return;
            }

            // Clear any pending eviction timer
            const evictionHandle = room.disconnectTimers.get(leavingPlayer.playerId);
            if (evictionHandle !== undefined) {
                clearTimeout(evictionHandle);
                room.disconnectTimers.delete(leavingPlayer.playerId);
            }

            room.players = room.players.filter((player) => player.playerId !== leavingPlayer.playerId);
            if (leavingPlayer.playerId === room.hostPlayerId && room.players.length > 0) {
                assignNextHost(room);
            }
            socket.leave(roomId);
            syncRoomAfterPlayerChange(roomId, room);
            callback?.({ ok: true });
        } catch {
            callback?.({ ok: false, error: 'Failed to leave room' });
        }
    };

    const startRoom = (payload: RoomActionPayload, callback?: (response: RoomActionCallbackResponse) => void) => {
        try {
            const roomId = payload.roomId?.trim().toUpperCase();
            if (!roomId) {
                callback?.({ ok: false, error: 'Room ID is required' });
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                callback?.({ ok: false, error: 'Room not found' });
                return;
            }

            const currentPlayer = room.players.find((player) => player.socketId === socket.id);
            if (!currentPlayer || currentPlayer.playerId !== room.hostPlayerId) {
                callback?.({ ok: false, error: 'Only the host can start the game' });
                return;
            }

            if (room.players.length < 2) {
                callback?.({ ok: false, error: 'At least 2 players are required to start the game' });
                return;
            }

            const cardCount = getCardCount(room.cardSetId);
            if (cardCount < room.players.length) {
                callback?.({ ok: false, error: `Not enough cards in this set (${cardCount} cards, need at least ${room.players.length})` });
                return;
            }

            room.hasStarted = true;
            io.to(roomId).emit('room:state', getPublicRoomState(roomId, rooms));
            callback?.({ ok: true });

            try {
                initializeGame(room, roomId, io);
            } catch (err) {
                console.error('Failed to initialize game:', err);
                // Roll back started state so host can try again
                room.hasStarted = false;
                io.to(roomId).emit('room:state', getPublicRoomState(roomId, rooms));
                socket.emit('game:error', { message: 'Failed to start game. Please try again.' });
            }
        } catch {
            callback?.({ ok: false, error: 'Failed to start the game' });
        }
    };

    socket.on('room:create', createRoom);
    socket.on('room:join', joinRoom);
    socket.on('room:leave', leaveRoom);
    socket.on('room:start', startRoom);
    socket.on('disconnect', () => {
        detachSocketFromRooms(socket.id);
    });
};

export default roomHandler;

const createRoomId = () => {
    return randomBytes(3).toString('hex').toUpperCase();
};

const createUniqueRoomId = (rooms: Map<string, Room>) => {
    let id = createRoomId();
    while (rooms.has(id)) id = createRoomId();
    return id;
};

const getPublicRoomState = (roomId: string, rooms: Map<string, Room>): RoomStateResponse => {
    const room = rooms.get(roomId);
    if (!room) return null;

    return {
        roomId,
        hostPlayerId: room.hostPlayerId,
        hostSocketId: room.hostSocketId,
        hostUsername: room.hostUsername,
        players: room.players.map((e) => ({ username: e.username, playerId: e.playerId })),
        hasStarted: room.hasStarted,
    };
};
