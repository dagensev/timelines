/*
Usage:
- Set `OPENAI_API_KEY` in your environment or `server/.env`.
- Run from `server/`, for example:
  `npx tsx --env-file .env src/scripts/generate-cards-csv.ts --count 100 --out cards.csv`
- Optional flags:
  `--startYear 1900 --endYear 2025 --seed 42`
*/

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type Args = {
    count: number;
    startYear?: number;
    endYear?: number;
    out: string;
    seed?: number;
};

type OnThisDayEvent = {
    year: number;
    text: string;
    sourceUrl: string;
};

type FinalCard = {
    title: string;
    description: string;
    year: number;
    source_url: string;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in .env');
    process.exit(1);
}

const CACHE_DIR = join(tmpdir(), 'card-gen-onthisday-cache');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// --- Utilities ---

const runWithConcurrency = async <T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> => {
    const results: T[] = new Array(tasks.length);
    let index = 0;

    const worker = async () => {
        while (index < tasks.length) {
            const i = index;
            index += 1;
            results[i] = await tasks[i]();
        }
    };

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
    return results;
};

const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
        a += 0x6d2b79f5;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const shuffle = <T>(items: T[], seed?: number): T[] => {
    const copy = [...items];
    const random = seed === undefined ? Math.random : mulberry32(seed);
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const chunk = <T>(items: T[], size: number): T[][] => {
    const output: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        output.push(items.slice(i, i + size));
    }
    return output;
};

const dedupeBy = <T>(items: T[], keyFn: (item: T) => string): T[] => {
    const seen = new Set<string>();
    const output: T[] = [];
    for (const item of items) {
        const key = keyFn(item);
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(item);
    }
    return output;
};

const csvEscape = (value: string | number): string => {
    const str = String(value ?? '');
    return `"${str.replaceAll('"', '""')}"`;
};

const toCsv = (cards: FinalCard[]): string => {
    const headers = ['title', 'description', 'year', 'source_url'];
    const rows = cards.map((card) => [
        csvEscape(card.title),
        csvEscape(card.description),
        csvEscape(card.year),
        csvEscape(card.source_url),
    ]);
    return [headers.map(csvEscape).join(','), ...rows.map((row) => row.join(','))].join('\n');
};

const safeJsonParse = <T>(text: string): T | null => {
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
};

// --- Args ---

const parseArgs = (): Args => {
    const raw = process.argv.slice(2);
    const args: Partial<Args> = { out: 'chronology_cards.csv' };

    for (let i = 0; i < raw.length; i += 1) {
        const key = raw[i];
        const value = raw[i + 1];

        if (!key.startsWith('--')) continue;

        switch (key) {
            case '--count':
                args.count = Number(value);
                i += 1;
                break;
            case '--startYear':
                args.startYear = Number(value);
                i += 1;
                break;
            case '--endYear':
                args.endYear = Number(value);
                i += 1;
                break;
            case '--out':
                args.out = value || 'chronology_cards.csv';
                i += 1;
                break;
            case '--seed':
                args.seed = Number(value);
                i += 1;
                break;
            default:
                console.warn(`Ignoring unknown arg: ${key}`);
        }
    }

    if (!args.count || Number.isNaN(args.count) || args.count < 1) {
        console.error('You must provide --count with a positive integer');
        process.exit(1);
    }

    if (args.startYear !== undefined && (Number.isNaN(args.startYear) || !Number.isInteger(args.startYear) || args.startYear < 1)) {
        console.error('--startYear must be a positive integer');
        process.exit(1);
    }

    if (args.endYear !== undefined && (Number.isNaN(args.endYear) || !Number.isInteger(args.endYear) || args.endYear < 1)) {
        console.error('--endYear must be a positive integer');
        process.exit(1);
    }

    if (args.seed !== undefined && (Number.isNaN(args.seed) || !Number.isInteger(args.seed))) {
        console.error('--seed must be an integer');
        process.exit(1);
    }

    if (args.startYear !== undefined && args.endYear !== undefined && args.startYear > args.endYear) {
        console.error('--startYear cannot be greater than --endYear');
        process.exit(1);
    }

    return args as Args;
};

// --- Wikipedia On This Day API ---

const getCachePath = (month: number, day: number) =>
    join(CACHE_DIR, `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}.json`);

const readCache = async (month: number, day: number): Promise<OnThisDayEvent[] | null> => {
    const cachePath = getCachePath(month, day);
    if (!existsSync(cachePath)) return null;
    try {
        const content = await readFile(cachePath, 'utf8');
        const parsed = JSON.parse(content) as { timestamp: number; events: OnThisDayEvent[] };
        if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
        return parsed.events;
    } catch {
        return null;
    }
};

const writeCache = async (month: number, day: number, events: OnThisDayEvent[]): Promise<void> => {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(getCachePath(month, day), JSON.stringify({ timestamp: Date.now(), events }), 'utf8');
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const fetchOnThisDayForDate = async (month: number, day: number): Promise<OnThisDayEvent[]> => {
    const cached = await readCache(month, day);
    if (cached) return cached;

    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
        if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
        }

        let response: Response;
        try {
            response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'chronology-card-generator/1.0',
                },
            });
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            continue;
        }

        if (response.status === 404) return [];

        if (RETRYABLE_STATUSES.has(response.status)) {
            lastError = new Error(`Wikipedia On This Day API failed for ${month}/${day}: ${response.status}`);
            continue;
        }

        if (!response.ok) {
            throw new Error(`Wikipedia On This Day API failed for ${month}/${day}: ${response.status}`);
        }

        const json = (await response.json()) as {
            events?: Array<{
                year: number;
                text: string;
                pages?: Array<{
                    content_urls?: { desktop?: { page?: string } };
                }>;
            }>;
        };

        const events: OnThisDayEvent[] = (json.events ?? [])
            .filter((e) => e.year && e.text && e.pages?.[0]?.content_urls?.desktop?.page)
            .map((e) => ({
                year: e.year,
                text: e.text.trim(),
                sourceUrl: e.pages![0].content_urls!.desktop!.page!,
            }));

        await writeCache(month, day, events);
        return events;
    }

    throw lastError ?? new Error(`Wikipedia On This Day API failed for ${month}/${day} after retries`);
};

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const fetchAllOnThisDayEvents = async (): Promise<OnThisDayEvent[]> => {
    const tasks: (() => Promise<OnThisDayEvent[]>)[] = [];

    for (let month = 1; month <= 12; month += 1) {
        for (let day = 1; day <= DAYS_IN_MONTH[month - 1]; day += 1) {
            const m = month;
            const d = day;
            tasks.push(() =>
                fetchOnThisDayForDate(m, d).catch((err) => {
                    console.warn(`  Skipping ${m}/${d}: ${err instanceof Error ? err.message : String(err)}`);
                    return [] as OnThisDayEvent[];
                }),
            );
        }
    }

    console.log(`Fetching On This Day events for all 366 dates (concurrency 10)...`);
    const results = await runWithConcurrency(tasks, 10);
    const allEvents = results.flat();
    console.log(`Fetched ${allEvents.length} total events across all dates`);
    return allEvents;
};

// --- OpenAI ---

const extractTextFromResponse = (json: {
    output_text?: string;
    output?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
    }>;
}) => {
    if (typeof json.output_text === 'string' && json.output_text.trim()) {
        return json.output_text;
    }

    const contentText = (json.output || [])
        .flatMap((item) => (item.type === 'message' ? item.content || [] : []))
        .flatMap((content) => (typeof content.text === 'string' ? [content.text] : []))
        .join('\n')
        .trim();

    return contentText || null;
};

const createResponse = async ({ model, systemPrompt, userPrompt }: { model: string; systemPrompt: string; userPrompt: string }): Promise<string> => {
    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            input: [
                { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
                { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API request failed: ${response.status} ${errorText}`);
    }

    const json = (await response.json()) as {
        output_text?: string;
        output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
    };

    const outputText = extractTextFromResponse(json);
    if (!outputText) {
        throw new Error(`OpenAI API response did not include text output: ${JSON.stringify(json).slice(0, 1000)}`);
    }

    return outputText;
};

// --- Date stripping ---

const MONTH_NAMES = 'January|February|March|April|May|June|July|August|September|October|November|December';

const stripDates = (text: string): string =>
    text
        // "(1969)" or "(c. 1969)" or "(ca. 1969)"
        .replace(/\s*\(c(?:a?)?\.\s*\d{3,4}\)/gi, '')
        .replace(/\s*\(\d{3,4}\)/g, '')
        // "– 1969" or "- 1969" at end
        .replace(/\s*[–-]\s*\d{3,4}\s*$/, '')
        // "January 15, 1969", "15 January 1969", "January 1969"
        .replace(new RegExp(`(?:${MONTH_NAMES})\\s+\\d{1,2},?\\s+\\d{3,4}`, 'gi'), '')
        .replace(new RegExp(`\\d{1,2}\\s+(?:${MONTH_NAMES})\\s+\\d{3,4}`, 'gi'), '')
        .replace(new RegExp(`(?:${MONTH_NAMES})\\s+\\d{3,4}`, 'gi'), '')
        // "In 1969, " or "1969: " or "2020 " at start
        .replace(/^In\s+\d{3,4},?\s+/i, '')
        .replace(/^\d{3,4}[:\s]\s*/i, '')
        // Inline year: "The 1707 earthquake" — standalone 3–4 digit year surrounded by spaces
        .replace(/(?<=\s)\d{3,4}(?=\s)/g, '')
        // Clean up leftover punctuation/whitespace
        .replace(/\s{2,}/g, ' ')
        .replace(/^[,–\-\s]+/, '')
        .replace(/[,–\-\s]+$/, '')
        .trim();

// --- Title generation ---

const generateTitlesChunk = async (events: OnThisDayEvent[]): Promise<FinalCard[]> => {
    const systemPrompt = `
You are generating titles for historical events to be used in a chronology card game.

For each event, write a short, clean, game-friendly title that describes what happened.

Rules:
- Phrase as a completed event (e.g. "Apollo 11 lands on the Moon", "The Berlin Wall falls", "The Titanic sinks")
- Do not include any years, dates, months, or numbers referring to time
- Keep it concise — ideally under 10 words
- Skip events that are births, deaths, minor local events, or routine appointments — omit them from the response

Return only valid JSON:
{
  "cards": [
    {
      "index": 0,
      "title": "string"
    }
  ]
}

Use "index" to reference the input event. Omit events you are skipping.
`.trim();

    const userPrompt = `Generate titles for these events:\n${JSON.stringify(
        events.map((e, i) => ({ index: i, text: e.text })),
        null,
        2,
    )}`;

    const outputText = await createResponse({ model: 'gpt-5-nano', systemPrompt, userPrompt });

    const parsed = safeJsonParse<{ cards: Array<{ index: number; title: string }> }>(outputText);
    if (!parsed?.cards) return [];

    const results: FinalCard[] = [];

    for (const card of parsed.cards) {
        const event = events[card.index];
        if (!event || !card.title) continue;

        results.push({
            title: stripDates(String(card.title).trim()),
            description: stripDates(event.text),
            year: event.year,
            source_url: event.sourceUrl,
        });
    }

    return results;
};

const generateTitles = async (events: OnThisDayEvent[]): Promise<FinalCard[]> => {
    const chunks = chunk(events, 50);
    console.log(`Generating titles for ${events.length} events in ${chunks.length} chunks (concurrency 5)...`);

    const tasks = chunks.map((c, i) => async () => {
        try {
            const cards = await generateTitlesChunk(c);
            console.log(`  Chunk ${i + 1}/${chunks.length}: ${cards.length}/${c.length} kept`);
            return cards;
        } catch (error) {
            console.warn(`  Chunk ${i + 1}/${chunks.length} failed: ${error instanceof Error ? error.message : String(error)}`);
            return [] as FinalCard[];
        }
    });

    const results = await runWithConcurrency(tasks, 5);
    return dedupeBy(results.flat(), (card) => `${card.title.toLowerCase()}|${card.year}`);
};

// --- Main ---

const main = async () => {
    const args = parseArgs();

    const startYear = args.startYear ?? 1000;
    const endYear = args.endYear ?? new Date().getUTCFullYear();

    // 1. Fetch all On This Day events (cached after first run)
    const allEvents = await fetchAllOnThisDayEvents();

    // 2. Filter by year range and dedupe
    const filtered = dedupeBy(
        allEvents.filter((e) => e.year >= startYear && e.year <= endYear),
        (e) => `${e.year}|${e.text.slice(0, 60)}`,
    );

    console.log(`${filtered.length} events in year range ${startYear}–${endYear}`);

    if (filtered.length === 0) {
        throw new Error(`No events found in year range ${startYear}–${endYear}. Try a wider range.`);
    }

    if (filtered.length < args.count) {
        console.warn(`Warning: only ${filtered.length} events available in range; you asked for ${args.count}`);
    }

    // 3. Sample a pool (~4x requested count) to give the AI headroom to skip bad events
    const poolSize = Math.min(filtered.length, args.count * 4);
    const pool = shuffle(filtered, args.seed).slice(0, poolSize);
    console.log(`Sampled pool of ${pool.length} events`);

    // 4. AI generates a title for each event; description comes directly from Wikipedia text
    const cards = await generateTitles(pool);
    console.log(`${cards.length} cards after title generation`);

    if (cards.length === 0) {
        throw new Error('No cards were produced. Try a wider year range or larger --count.');
    }

    // 5. Trim to requested count
    let finalCards = shuffle(cards, args.seed).slice(0, args.count);

    // 6. Sort by year
    finalCards = finalCards.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.title.localeCompare(b.title);
    });

    const csv = toCsv(finalCards);
    await writeFile(args.out, csv, 'utf8');

    console.log(`Saved ${finalCards.length} cards to ${args.out}`);
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
