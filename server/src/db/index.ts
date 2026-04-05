import { DatabaseSync } from 'node:sqlite';

const dbPath = process.env.DATABASE_PATH ?? './timelines.db';
export const db = new DatabaseSync(dbPath);

export function initDb(): void {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(`
        CREATE TABLE IF NOT EXISTS card_sets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL UNIQUE,
            description TEXT
        )
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS cards (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            set_id      INTEGER NOT NULL REFERENCES card_sets(id),
            title       TEXT NOT NULL,
            description TEXT NOT NULL,
            year        INTEGER NOT NULL,
            source_url  TEXT NOT NULL
        )
    `);
    console.log(`Database ready at ${dbPath}`);
}
