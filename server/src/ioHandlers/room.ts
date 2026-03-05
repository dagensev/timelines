import { randomBytes } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../io.types';
import type { CreateRoomPayload, CreateRoomCallbackResponse, Room } from '../room.types';

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

            const roomId = createUniqueRoomId(rooms);

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

    socket.on('room:create', createRoom);
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
