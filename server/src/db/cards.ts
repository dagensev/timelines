import { db } from './index';

export interface Card {
    id: number;
    set_id: number;
    title: string;
    description: string;
    year: number;
    source_url: string;
}

export interface CardSet {
    id: number;
    name: string;
    description: string | null;
}

export function getRandomCards(count: number, setId?: number): Card[] {
    if (setId !== undefined) {
        return db
            .prepare('SELECT * FROM cards WHERE set_id = ? ORDER BY RANDOM() LIMIT ?')
            .all(setId, count) as unknown as Card[];
    }
    return db.prepare('SELECT * FROM cards ORDER BY RANDOM() LIMIT ?').all(count) as unknown as Card[];
}

export function getCardSets(): CardSet[] {
    return db.prepare('SELECT * FROM card_sets').all() as unknown as CardSet[];
}

export function getCardCount(setId?: number): number {
    if (setId !== undefined) {
        const row = db
            .prepare('SELECT COUNT(*) as count FROM cards WHERE set_id = ?')
            .get(setId) as { count: number };
        return row.count;
    }
    const row = db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number };
    return row.count;
}
