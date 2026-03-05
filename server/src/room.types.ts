export interface Room {
    hostSocketId: string;
    players: { socketId: string; username: string }[];
    createdAt: number;
}

export interface CreateRoomPayload {
    username: string;
}

export interface JoinRoomPayload {
    username: string;
    roomId: string;
}

export type CreateRoomCallbackResponse = { ok: true; roomId: string } | { ok: false; error: string };

export type RoomStateResponse = {
    roomId: string;
    hostSocketId: string;
    players: { username: string }[];
} | null;
