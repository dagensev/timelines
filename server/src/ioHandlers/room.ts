import { randomBytes } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../io.types';
import type { CreateRoomPayload, CreateRoomCallbackResponse, Room, JoinRoomPayload } from '../room.types';

const roomHandler = (
    io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    rooms: Map<string, Room>,
) => {
    const createRoom = (payload: CreateRoomPayload, callback?: (response: CreateRoomCallbackResponse) => void) => {
        try {
            const username = payload.username?.trim();
            if (!username) {
                callback?.({ ok: false, error: 'Username is required' });
                return;
            }

            // Leave all previous rooms
            for (const room of socket.rooms) {
                if (room !== socket.id) socket.leave(room);
            }

            const roomId: string = createUniqueRoomId(rooms);

            rooms.set(roomId, {
                hostSocketId: socket.id,
                players: [{ socketId: socket.id, username }],
                createdAt: Date.now(),
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
            const username: string = payload.username?.trim();

            if (!roomId) {
                callback?.({ ok: false, error: 'Room ID is required' });
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

            if (room.players.length >= 8) {
                callback?.({ ok: false, error: 'Room is full' });
                return;
            }

            // Prevent same socket from joining twice
            const alreadyInRoom = room.players.some((e) => e.socketId === socket.id);
            if (!alreadyInRoom) {
                // Prevent duplicate usernames
                const usernameTaken = room.players.some((e) => e.username.toLowerCase() === username.toLowerCase());
                if (usernameTaken) {
                    callback?.({ ok: false, error: 'Username is already taken in this room' });
                    return;
                }

                // Leave all previous rooms
                for (const room of socket.rooms) {
                    if (room !== socket.id) socket.leave(room);
                }

                room.players.push({ socketId: socket.id, username });
            }

            // Ensure hostSocketId is valid, otherwise assign to current player
            const hostStillPresent = room.players.some((p) => p.socketId === room.hostSocketId);
            if (!hostStillPresent) {
                room.hostSocketId = room.players[0]?.socketId ?? socket.id;
            }

            socket.join(roomId);

            callback?.({ ok: true, roomId });

            io.to(roomId).emit('room:state', getPublicRoomState(roomId, rooms));
        } catch {
            callback?.({ ok: false, error: 'Failed to join room' });
        }
    };

    socket.on('room:create', createRoom);
    socket.on('room:join', joinRoom);
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

const getPublicRoomState = (roomId: string, rooms: Map<string, Room>) => {
    const room = rooms.get(roomId);
    if (!room) return null;

    return {
        roomId,
        hostSocketId: room.hostSocketId,
        players: room.players.map((e) => ({ username: e.username })),
    };
};
