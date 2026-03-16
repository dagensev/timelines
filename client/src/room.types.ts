export type RoomStateResponse = {
    roomId: string;
    hostPlayerId: string;
    hostSocketId: string;
    hostUsername: string;
    players: { username: string }[];
    hasStarted: boolean;
} | null;

export type RoomActionCallbackResponse = { ok: true } | { ok: false; error: string };
