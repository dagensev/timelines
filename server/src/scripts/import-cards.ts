import { readFileSync } from 'node:fs';
import { db, initDb } from '../db/index';

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : undefined;
}

const csvPath = getArg('csv');
const setName = getArg('set-name');
const setDescription = getArg('set-description') ?? null;

if (!csvPath || !setName) {
    console.error('Usage: import-cards --csv <path> --set-name <name> [--set-description <desc>]');
    process.exit(1);
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let i = 0;
    while (i < line.length) {
        if (line[i] === '"') {
            i++;
            let field = '';
            while (i < line.length) {
                if (line[i] === '"' && line[i + 1] === '"') {
                    field += '"';
                    i += 2;
                } else if (line[i] === '"') {
                    i++;
                    break;
                } else {
                    field += line[i++];
                }
            }
            result.push(field);
            if (line[i] === ',') i++;
        } else {
            const end = line.indexOf(',', i);
            if (end === -1) {
                result.push(line.slice(i));
                break;
            }
            result.push(line.slice(i, end));
            i = end + 1;
        }
    }
    return result;
}

initDb();

const existing = db.prepare('SELECT id FROM card_sets WHERE name = ?').get(setName);
if (existing) {
    console.error(`Error: A card set named "${setName}" already exists.`);
    process.exit(1);
}

const setResult = db.prepare('INSERT INTO card_sets (name, description) VALUES (?, ?)').run(setName, setDescription);
const setId = Number(setResult.lastInsertRowid);

const content = readFileSync(csvPath, 'utf-8');
const lines = content.split('\n').filter((l) => l.trim().length > 0);
const [header, ...rows] = lines;

const headers = parseCsvLine(header);
const titleIdx = headers.indexOf('title');
const descIdx = headers.indexOf('description');
const yearIdx = headers.indexOf('year');
const urlIdx = headers.indexOf('source_url');

if ([titleIdx, descIdx, yearIdx, urlIdx].some((i) => i === -1)) {
    console.error('CSV must have columns: title, description, year, source_url');
    process.exit(1);
}

const insertCard = db.prepare(
    'INSERT INTO cards (set_id, title, description, year, source_url) VALUES (?, ?, ?, ?, ?)',
);

const parsedRows = rows.map(parseCsvLine);

db.exec('BEGIN');
try {
    for (const cols of parsedRows) {
        insertCard.run(setId, cols[titleIdx], cols[descIdx], parseInt(cols[yearIdx], 10), cols[urlIdx]);
    }
    db.exec('COMMIT');
} catch (e) {
    db.exec('ROLLBACK');
    throw e;
}

console.log(`Imported ${parsedRows.length} cards into set "${setName}" (id=${setId})`);
