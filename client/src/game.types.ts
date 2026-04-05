export interface TimelineCard {
    id: number;
    title: string;
    description: string;
    year: number;
}

export interface PlayerTimeline {
    playerId: string;
    username: string;
    cards: TimelineCard[];
    isConnected: boolean;
    disconnectedAt?: number;
}

export interface ActiveTurn {
    activePlayerId: string;
    currentGuesserId: string;
    guessOrder: string[];
    guessIndex: number;
    timerStartedAt: number;
    cardId: number;
}

export interface PublicGameState {
    activeCard: { id: number; title: string; description: string } | null;
    timelines: PlayerTimeline[];
    turn: ActiveTurn | null;
    turnNumber: number;
    winner: string | null;
    winnerUsername: string | null;
}

export interface CardResultPayload {
    guesserPlayerId: string;
    guesserUsername: string;
    cardId: number;
    year: number;
    correct: boolean;
    position?: number;
}

export interface CardSet {
    id: number;
    name: string;
    description: string | null;
}
