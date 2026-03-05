import { CreateRoomPayload, CreateRoomCallbackResponse, RoomStateResponse } from './room.types';

export interface ServerToClientEvents {
    'room:state': (a: RoomStateResponse) => void;
}

export interface ClientToServerEvents {
    'room:create': (payload: CreateRoomPayload, callback?: (response: CreateRoomCallbackResponse) => void) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    name: string;
    age: number;
}
