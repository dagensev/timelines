import { CreateRoomPayload, CreateRoomCallbackResponse, RoomStateResponse, JoinRoomPayload } from './room.types';

export interface ServerToClientEvents {
    'room:state': (a: RoomStateResponse) => void;
}

export interface ClientToServerEvents {
    'room:create': (payload: CreateRoomPayload, callback?: (response: CreateRoomCallbackResponse) => void) => void;
    'room:join': (payload: JoinRoomPayload, callback?: (response: CreateRoomCallbackResponse) => void) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    name: string;
    age: number;
}
