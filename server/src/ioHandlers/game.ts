import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../io.types';
import type { Room, RoomActionCallbackResponse } from '../room.types';
import type { PlaceCardPayload } from '../game.types';
import { advanceGuesser, getPublicGameState, isPlacementValid, startNextTurn } from '../gameLogic';

const gameHandler = (
    io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    rooms: Map<string, Room>,
) => {
    const handlePlaceCard = (payload: PlaceCardPayload, callback?: (response: RoomActionCallbackResponse) => void) => {
        const { roomId, playerId, position, cardId } = payload;

        const room = rooms.get(roomId?.toUpperCase());
        if (!room) {
            callback?.({ ok: false, error: 'Room not found' });
            return;
        }

        const gs = room.gameState;
        if (!gs || gs.winner) {
            callback?.({ ok: false, error: 'Game is not active' });
            return;
        }

        const turn = gs.turn;
        if (!turn) {
            callback?.({ ok: false, error: 'No active turn' });
            return;
        }

        if (playerId !== turn.currentGuesserId) {
            callback?.({ ok: false, error: 'It is not your turn to guess' });
            socket.emit('game:error', { message: 'It is not your turn to guess' });
            return;
        }

        if (cardId !== turn.cardId) {
            callback?.({ ok: false, error: 'Card mismatch — please refresh' });
            return;
        }

        const playerTimeline = gs.timelines.find((t) => t.playerId === playerId);
        if (!playerTimeline) {
            callback?.({ ok: false, error: 'Player not found in game' });
            return;
        }

        if (position < 0 || position > playerTimeline.cards.length) {
            callback?.({ ok: false, error: 'Invalid position' });
            return;
        }

        const activeCard = gs.activeCard!;
        const correct = isPlacementValid(playerTimeline.cards, position, activeCard.year);

        clearTimeout(room.turnTimerHandle);

        const guesserUsername = playerTimeline.username;

        if (correct) {
            // Insert card at position, then sort by year
            const newCard = { id: activeCard.id, title: activeCard.title, description: activeCard.description, year: activeCard.year };
            playerTimeline.cards.splice(position, 0, newCard);
            playerTimeline.cards.sort((a, b) => a.year - b.year);

            io.to(roomId).emit('game:card-result', {
                guesserPlayerId: playerId,
                guesserUsername,
                cardId: activeCard.id,
                year: activeCard.year,
                correct: true,
                position,
            });

            gs.activeCard = null;
            gs.turn = null;

            callback?.({ ok: true });

            // Check win condition
            if (playerTimeline.cards.length >= 10) {
                gs.winner = playerId;
                gs.winnerUsername = guesserUsername;
                io.to(roomId).emit('game:state', getPublicGameState(gs));
                return;
            }

            startNextTurn(room, roomId, io);
        } else {
            io.to(roomId).emit('game:card-result', {
                guesserPlayerId: playerId,
                guesserUsername,
                cardId: activeCard.id,
                year: activeCard.year,
                correct: false,
            });

            callback?.({ ok: true });

            advanceGuesser(room, roomId, io);
        }
    };

    const handleRequestState = (payload: { roomId: string; playerId: string }) => {
        const room = rooms.get(payload.roomId?.toUpperCase());
        if (!room?.gameState) return;
        socket.emit('game:state', getPublicGameState(room.gameState));
    };

    socket.on('game:place-card', handlePlaceCard);
    socket.on('game:request-state', handleRequestState);
};

export default gameHandler;
