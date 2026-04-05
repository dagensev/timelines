import type { Server } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './io.types';
import type { Room } from './room.types';
import type { ActiveCard, ActiveTurn, GameState, PlayerTimeline, PublicGameState, TimelineCard } from './game.types';
import { getCardCount, getRandomCards } from './db/cards';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// ─── Public state (strips year from activeCard) ───────────────────────────────

export function getPublicGameState(gameState: GameState): PublicGameState {
    return {
        activeCard: gameState.activeCard
            ? { id: gameState.activeCard.id, title: gameState.activeCard.title, description: gameState.activeCard.description }
            : null,
        timelines: gameState.timelines,
        turn: gameState.turn,
        turnNumber: gameState.turnNumber,
        winner: gameState.winner,
        winnerUsername: gameState.winnerUsername,
    };
}

// ─── Placement validation ─────────────────────────────────────────────────────

export function isPlacementValid(timeline: TimelineCard[], position: number, year: number): boolean {
    const yearBefore = position > 0 ? timeline[position - 1].year : -Infinity;
    const yearAfter = position < timeline.length ? timeline[position].year : Infinity;
    return yearBefore <= year && year <= yearAfter;
}

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─── Initialize game ──────────────────────────────────────────────────────────

export function initializeGame(room: Room, roomId: string, io: IO): void {
    const cardSetId = room.cardSetId;
    const totalCards = getCardCount(cardSetId);
    const fetchCount = Math.min(totalCards, 200);

    const rawCards = getRandomCards(fetchCount, cardSetId);
    const allCards = new Map<number, ActiveCard>(
        rawCards.map((c) => [c.id, { id: c.id, title: c.title, description: c.description, year: c.year }])
    );

    const shuffledIds = shuffle(rawCards.map((c) => c.id));

    // Deal 1 starting card per player
    const timelines: PlayerTimeline[] = room.players.map((player) => {
        const cardId = shuffledIds.pop()!;
        const card = allCards.get(cardId)!;
        return {
            playerId: player.playerId,
            username: player.username,
            cards: [{ id: card.id, title: card.title, description: card.description, year: card.year }],
            isConnected: true,
        };
    });

    const gameState: GameState = {
        deck: shuffledIds,
        allCards,
        discardPile: [],
        activeCard: null,
        timelines,
        turn: null,
        turnNumber: 0,
        activePlayerIndex: 0,
        winner: null,
        winnerUsername: null,
    };

    room.gameState = gameState;

    startNextTurn(room, roomId, io);
}

// ─── Start next turn ──────────────────────────────────────────────────────────

export function startNextTurn(room: Room, roomId: string, io: IO): void {
    const gs = room.gameState!;

    // Refill deck from discard if empty
    if (gs.deck.length === 0) {
        if (gs.discardPile.length === 0) return; // no cards at all — shouldn't happen
        gs.deck = shuffle(gs.discardPile);
        gs.discardPile = [];
    }

    const cardId = gs.deck.pop()!;
    gs.activeCard = gs.allCards.get(cardId)!;

    const connectedPlayers = room.players.filter((p) => {
        const tl = gs.timelines.find((t) => t.playerId === p.playerId);
        return tl?.isConnected !== false;
    });

    if (connectedPlayers.length === 0) return;

    // Rotate activePlayerIndex among connected players
    const connectedIds = connectedPlayers.map((p) => p.playerId);
    const currentActiveIndex = gs.activePlayerIndex % connectedIds.length;
    const activePlayerId = connectedIds[currentActiveIndex];
    gs.activePlayerIndex = (currentActiveIndex + 1) % connectedIds.length;

    // Build guess order: start after active player, wrap around, active player last
    const activeIdx = connectedIds.indexOf(activePlayerId);
    const guessOrder: string[] = [];
    for (let i = 1; i <= connectedIds.length; i++) {
        guessOrder.push(connectedIds[(activeIdx + i) % connectedIds.length]);
    }

    gs.turn = {
        activePlayerId,
        currentGuesserId: guessOrder[0],
        guessOrder,
        guessIndex: 0,
        timerStartedAt: Date.now(),
        cardId,
    };

    gs.turnNumber += 1;

    clearTimeout(room.turnTimerHandle);
    room.turnTimerHandle = setTimeout(() => onTimerExpired(roomId, room, io), 45_000);

    io.to(roomId).emit('game:state', getPublicGameState(gs));
}

// ─── Advance guesser ──────────────────────────────────────────────────────────

export function advanceGuesser(room: Room, roomId: string, io: IO): void {
    const gs = room.gameState!;
    const turn = gs.turn!;

    const nextIndex = turn.guessIndex + 1;

    if (nextIndex >= turn.guessOrder.length) {
        // All guessed wrong — discard card
        if (gs.activeCard) {
            gs.discardPile.push(gs.activeCard.id);
        }
        gs.activeCard = null;
        gs.turn = null;
        io.to(roomId).emit('game:state', getPublicGameState(gs));
        startNextTurn(room, roomId, io);
        return;
    }

    turn.guessIndex = nextIndex;
    turn.currentGuesserId = turn.guessOrder[nextIndex];
    turn.timerStartedAt = Date.now();

    clearTimeout(room.turnTimerHandle);
    room.turnTimerHandle = setTimeout(() => onTimerExpired(roomId, room, io), 45_000);

    io.to(roomId).emit('game:state', getPublicGameState(gs));
}

// ─── Timer expiry ─────────────────────────────────────────────────────────────

function onTimerExpired(roomId: string, room: Room, io: IO): void {
    const gs = room.gameState;
    if (!gs?.turn) return;

    const elapsed = Date.now() - gs.turn.timerStartedAt;
    if (elapsed < 44_000) return; // spurious early fire

    advanceGuesser(room, roomId, io);
}

// ─── Evict player ─────────────────────────────────────────────────────────────

export function evictPlayer(
    roomId: string,
    playerId: string,
    room: Room,
    io: IO,
    broadcastRoomState: () => void
): void {
    room.players = room.players.filter((p) => p.playerId !== playerId);
    room.disconnectTimers.delete(playerId);

    if (room.gameState) {
        room.gameState.timelines = room.gameState.timelines.filter((t) => t.playerId !== playerId);

        // End game if fewer than 2 players remain
        if (room.players.length < 2) {
            const remaining = room.gameState.timelines[0];
            if (remaining) {
                room.gameState.winner = remaining.playerId;
                room.gameState.winnerUsername = remaining.username;
            }
            clearTimeout(room.turnTimerHandle);
            room.gameState.turn = null;
            io.to(roomId).emit('game:state', getPublicGameState(room.gameState));
        } else {
            io.to(roomId).emit('game:state', getPublicGameState(room.gameState));
        }
    }

    broadcastRoomState();
}
