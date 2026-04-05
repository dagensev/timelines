import type { CreateRoomPayload, CreateRoomCallbackResponse, RoomStateResponse, JoinRoomPayload, RoomActionPayload, RoomActionCallbackResponse } from './room.types';
import type { PlaceCardPayload, PublicGameState, CardResultPayload } from './game.types';

export interface ServerToClientEvents {
    'room:state': (a: RoomStateResponse) => void;
    'game:state': (a: PublicGameState) => void;
    'game:card-result': (a: CardResultPayload) => void;
    'game:error': (a: { message: string }) => void;
}

export interface ClientToServerEvents {
    'room:create': (payload: CreateRoomPayload, callback?: (response: CreateRoomCallbackResponse) => void) => void;
    'room:join': (payload: JoinRoomPayload, callback?: (response: CreateRoomCallbackResponse) => void) => void;
    'room:leave': (payload: RoomActionPayload, callback?: (response: RoomActionCallbackResponse) => void) => void;
    'room:start': (payload: RoomActionPayload, callback?: (response: RoomActionCallbackResponse) => void) => void;
    'game:place-card': (payload: PlaceCardPayload, callback?: (response: RoomActionCallbackResponse) => void) => void;
    'game:request-state': (payload: { roomId: string; playerId: string }) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    name: string;
    age: number;
}
