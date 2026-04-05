import type { GameState } from './game.types';

export interface Room {
    hostPlayerId: string;
    hostSocketId: string;
    hostUsername: string;
    password?: string;
    cardSetId?: number;
    players: { playerId: string; socketId: string; username: string }[];
    createdAt: number;
    hasStarted: boolean;
    gameState?: GameState;
    disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
    turnTimerHandle?: ReturnType<typeof setTimeout>;
}

export interface CreateRoomPayload {
    playerId: string;
    username: string;
    password?: string;
    cardSetId?: number;
}

export interface JoinRoomPayload {
    playerId: string;
    username: string;
    roomId: string;
    password?: string;
}

export type CreateRoomCallbackResponse = { ok: true; roomId: string } | { ok: false; error: string };

export interface RoomActionPayload {
    roomId: string;
    playerId?: string;
}

export type RoomActionCallbackResponse = { ok: true } | { ok: false; error: string };

export type RoomStateResponse = {
    roomId: string;
    hostPlayerId: string;
    hostSocketId: string;
    hostUsername: string;
    players: { username: string; playerId: string }[];
    hasStarted: boolean;
} | null;
