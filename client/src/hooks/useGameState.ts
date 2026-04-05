import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { CardResultPayload, PublicGameState } from '../game.types';

export function useGameState(socket: Socket) {
    const [gameState, setGameState] = useState<PublicGameState | null>(null);
    const [lastCardResult, setLastCardResult] = useState<CardResultPayload | null>(null);

    useEffect(() => {
        const onGameState = (state: PublicGameState) => setGameState(state);
        const onCardResult = (result: CardResultPayload) => setLastCardResult(result);

        socket.on('game:state', onGameState);
        socket.on('game:card-result', onCardResult);

        return () => {
            socket.off('game:state', onGameState);
            socket.off('game:card-result', onCardResult);
        };
    }, [socket]);

    return { gameState, lastCardResult };
}
