/*
Usage:
- Set `OPENAI_API_KEY` in your environment or `server/.env`.
- Run from `server/`, for example:
  `npx tsx --env-file .env src/scripts/generate-cards-csv.ts --count 100 --out cards.csv`
- Optional flags:
  `--category history|science|technology|politics|sports|entertainment|business|culture|exploration`
  `--startYear 1900 --endYear 2025 --seed 42`
*/

import { writeFile } from 'node:fs/promises';

enum Category {
    HISTORY = 'history',
    SCIENCE = 'science',
    TECHNOLOGY = 'technology',
    POLITICS = 'politics',
    SPORTS = 'sports',
    ENTERTAINMENT = 'entertainment',
    BUSINESS = 'business',
    CULTURE = 'culture',
    EXPLORATION = 'exploration',
}

type Args = {
    count: number;
    category?: Category;
    startYear?: number;
    endYear?: number;
    out: string;
    seed?: number;
};

type WikidataCandidate = {
    wikidataId: string;
    title: string;
    year: number;
    fullDate: string;
    sourceUrl: string;
    rawDescription?: string;
};

type FinalCard = {
    title: string;
    description: string;
    year: number;
    category: Category;
    source_url: string;
    difficulty: number;
};

type YearBucket = {
    id: string;
    startYear: number;
    endYear: number;
    targetCount: number;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in .env');
    process.exit(1);
}

const CATEGORY_VALUES = Object.values(Category);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const EXCLUDED_DESCRIPTION_PATTERNS = [
    /\bhuman\b/i,
    /\bmale\b/i,
    /\bfemale\b/i,
    /\bperson\b/i,
    /\bpseudonym\b/i,
    /\bgiven name\b/i,
    /\bfamily name\b/i,
    /\bdisambiguation\b/i,
    /\bWikimedia\b/i,
];

const EXCLUDED_TITLE_PATTERNS = [/\bbirths?\b/i, /\bdeaths?\b/i, /\belection in\b/i, /\blist of\b/i, /\bseason\b/i, /\bepisode\b/i];

const isUsableWikidataCandidate = (candidate: WikidataCandidate) => {
    if (!candidate.title.trim()) return false;
    if (!candidate.sourceUrl.trim()) return false;

    if (EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(candidate.title))) {
        return false;
    }

    const description = candidate.rawDescription;
    if (description && EXCLUDED_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(description))) {
        return false;
    }

    return true;
};

const extractTextFromResponse = (json: {
    output_text?: string;
    output?: Array<{
        type?: string;
        content?: Array<{
            type?: string;
            text?: string;
        }>;
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

    if (contentText) {
        return contentText;
    }

    return null;
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
                {
                    role: 'system',
                    content: [{ type: 'input_text', text: systemPrompt }],
                },
                {
                    role: 'user',
                    content: [{ type: 'input_text', text: userPrompt }],
                },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API request failed: ${response.status} ${errorText}`);
    }

    const json = (await response.json()) as {
        output_text?: string;
        output?: Array<{
            type?: string;
            content?: Array<{
                type?: string;
                text?: string;
            }>;
        }>;
    };

    const outputText = extractTextFromResponse(json);
    if (!outputText) {
        throw new Error(`OpenAI API response did not include text output: ${JSON.stringify(json).slice(0, 1000)}`);
    }

    return outputText;
};

const parseArgs = (): Args => {
    const raw = process.argv.slice(2);
    const args: Partial<Args> = {
        out: 'chronology_cards.csv',
    };

    for (let i = 0; i < raw.length; i += 1) {
        const key = raw[i];
        const value = raw[i + 1];

        if (!key.startsWith('--')) continue;

        switch (key) {
            case '--count':
                args.count = Number(value);
                i += 1;
                break;
            case '--category': {
                const normalized = String(value || '').toLowerCase();
                if (!CATEGORY_VALUES.includes(normalized as Category)) {
                    console.error(`Invalid category. Use one of: ${CATEGORY_VALUES.join(', ')}`);
                    process.exit(1);
                }
                args.category = normalized as Category;
                i += 1;
                break;
            }
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
    for (let i = 0; i < items.length; i += 1 * size) {
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
    const headers = ['title', 'description', 'year', 'category', 'source_url', 'difficulty'];

    const rows = cards.map((card) => [
        csvEscape(card.title),
        csvEscape(card.description),
        csvEscape(card.year),
        csvEscape(card.category),
        csvEscape(card.source_url),
        csvEscape(card.difficulty),
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

const normalizeCard = (card: Partial<FinalCard>, forcedCategory?: Category): FinalCard | null => {
    if (!card.title || !card.description || !card.source_url) return null;
    if (!Number.isInteger(card.year)) return null;
    if (!Number.isInteger(card.difficulty)) return null;

    const category = forcedCategory ?? card.category;
    if (!category || !CATEGORY_VALUES.includes(category)) return null;
    if ((card.difficulty as number) < 1 || (card.difficulty as number) > 5) return null;

    return {
        title: String(card.title).trim(),
        description: String(card.description).trim(),
        year: Number(card.year),
        category,
        source_url: String(card.source_url).trim(),
        difficulty: Number(card.difficulty),
    };
};

const getDifficultyTargets = (count: number) => {
    const ratios = [
        { difficulty: 1, ratio: 0.22 },
        { difficulty: 2, ratio: 0.28 },
        { difficulty: 3, ratio: 0.25 },
        { difficulty: 4, ratio: 0.17 },
        { difficulty: 5, ratio: 0.08 },
    ];

    const targets = new Map<number, number>();
    let assigned = 0;

    for (const { difficulty, ratio } of ratios) {
        const value = Math.floor(count * ratio);
        targets.set(difficulty, value);
        assigned += value;
    }

    let remaining = count - assigned;
    let cursor = 1;

    while (remaining > 0) {
        targets.set(cursor, (targets.get(cursor) || 0) + 1);
        remaining -= 1;
        cursor += 1;
        if (cursor > 5) cursor = 1;
    }

    return targets;
};

const getBucketSize = (startYear: number, endYear: number) => {
    const span = endYear - startYear + 1;

    if (span <= 80) return 10;
    if (span <= 160) return 25;
    if (span <= 400) return 50;
    return 100;
};

const buildYearBuckets = (startYear: number, endYear: number, count: number): YearBucket[] => {
    const bucketSize = getBucketSize(startYear, endYear);
    const buckets: YearBucket[] = [];

    let cursor = startYear;

    while (cursor <= endYear) {
        const bucketEnd = Math.min(cursor + bucketSize - 1, endYear);
        buckets.push({
            id: `${cursor}-${bucketEnd}`,
            startYear: cursor,
            endYear: bucketEnd,
            targetCount: 0,
        });
        cursor = bucketEnd + 1;
    }

    const weights = buckets.map((bucket, index) => {
        const relativePosition = buckets.length === 1 ? 1 : index / (buckets.length - 1);

        const modernBias = 1 + relativePosition * 0.35;
        const width = bucket.endYear - bucket.startYear + 1;
        const widthBias = width / bucketSize;

        return modernBias * widthBias;
    });

    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    let assigned = 0;

    for (let i = 0; i < buckets.length; i += 1) {
        const target = Math.floor((weights[i] / totalWeight) * count);
        buckets[i].targetCount = target;
        assigned += target;
    }

    let remaining = count - assigned;
    let cursorIndex = buckets.length - 1;

    while (remaining > 0) {
        buckets[cursorIndex].targetCount += 1;
        remaining -= 1;
        cursorIndex -= 1;
        if (cursorIndex < 0) cursorIndex = buckets.length - 1;
    }

    for (const bucket of buckets) {
        if (bucket.targetCount < 1 && count >= buckets.length) {
            bucket.targetCount = 1;
        }
    }

    let totalAssigned = buckets.reduce((sum, bucket) => sum + bucket.targetCount, 0);

    while (totalAssigned > count) {
        const removable = [...buckets].sort((a, b) => b.targetCount - a.targetCount).find((bucket) => bucket.targetCount > 1);

        if (!removable) break;
        removable.targetCount -= 1;
        totalAssigned -= 1;
    }

    return buckets;
};

const sampleYearsInRange = ({ startYear, endYear, desiredCount }: { startYear: number; endYear: number; desiredCount: number }) => {
    const span = endYear - startYear + 1;
    const sampleCount = Math.min(span, Math.max(3, Math.min(desiredCount + 2, 8)));
    const years = new Set<number>();

    if (sampleCount === 1) return [startYear];

    for (let i = 0; i < sampleCount; i += 1) {
        const ratio = i / (sampleCount - 1);
        years.add(Math.round(startYear + ratio * (endYear - startYear)));
    }

    return [...years].sort((a, b) => a - b);
};

const stripWikiMarkup = (text: string) =>
    text
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
        .replace(/<ref[^/>]*\/>/gi, '')
        .replace(/\{\{[^{}]*\}\}/g, '')
        .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/\[https?:\/\/[^\s\]]+\s([^\]]+)\]/g, '$1')
        .replace(/'''+/g, '')
        .replace(/''/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const parseWikipediaYearEvents = ({ year, wikitext }: { year: number; wikitext: string }): WikidataCandidate[] => {
    const match = wikitext.match(/==\s*Events\s*==([\s\S]*?)(?:\n==[^=]|\n$|$)/i);
    if (!match) return [];

    const section = match[1];
    const candidates: WikidataCandidate[] = [];
    const lines = section.split('\n').map((line) => line.trim());

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line.startsWith('*')) continue;
        if (line.startsWith('**')) continue;

        const cleaned = stripWikiMarkup(line.replace(/^\*\s*/, ''));
        if (!cleaned) continue;

        const title = cleaned
            .replace(/^[A-Z][a-z]+ \d{1,2}\s+[–-]\s+/, '')
            .replace(/^[A-Z][a-z]+ \d{1,2},\s*/, '')
            .replace(/^\d{1,2}\s+[A-Z][a-z]+\s+[–-]\s+/, '')
            .trim();

        if (!title) continue;

        candidates.push({
            wikidataId: `wiki-year-${year}-${i}`,
            title,
            year,
            fullDate: String(year),
            sourceUrl: `https://en.wikipedia.org/wiki/${year}`,
            rawDescription: cleaned,
        });
    }

    return candidates.filter(isUsableWikidataCandidate);
};

const fetchWikipediaYearCandidates = async (year: number): Promise<WikidataCandidate[]> => {
    const title = year < 0 ? `${Math.abs(year)}_BC` : String(year);
    const url = 'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=' + encodeURIComponent(title);

    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'chronology-card-generator/1.0',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Wikipedia year page request failed: ${response.status} ${text}`);
    }

    const json = (await response.json()) as { parse?: { wikitext?: string } };
    const wikitext = json.parse?.wikitext;

    if (!wikitext) {
        return [];
    }

    return parseWikipediaYearEvents({ year, wikitext });
};

const fetchWikidataCandidatesForRange = async ({
    desiredCount,
    startYear,
    endYear,
}: {
    desiredCount: number;
    startYear: number;
    endYear: number;
}): Promise<WikidataCandidate[]> => {
    const sampledYears = sampleYearsInRange({ startYear, endYear, desiredCount: Math.max(desiredCount, 4) });
    const allCandidates: WikidataCandidate[] = [];

    for (const year of sampledYears) {
        try {
            const candidates = await fetchWikipediaYearCandidates(year);
            allCandidates.push(...candidates);
        } catch (error) {
            console.warn(`Wikipedia year page failed for ${year}: ${error instanceof Error ? error.message : String(error)}`);
        }

        await sleep(50);
    }

    return dedupeBy(allCandidates, (item) => item.wikidataId);
};

const curateBucketWithModel = async ({
    candidates,
    targetCount,
    category,
    bucket,
    seed,
}: {
    candidates: WikidataCandidate[];
    targetCount: number;
    category?: Category;
    bucket: YearBucket;
    seed?: number;
}): Promise<FinalCard[]> => {
    if (!candidates.length) return [];

    const yearContext =
        bucket.endYear - bucket.startYear < 5
            ? `All events must be from ${bucket.startYear} to ${bucket.endYear}.`
            : `All events must be from ${bucket.startYear} through ${bucket.endYear}.`;

    const targetCategoryText = category
        ? `Only include events in this category: ${category}.`
        : `Prefer a healthy category mix across: ${CATEGORY_VALUES.join(', ')}.`;

    const systemPrompt = `
You are curating cards for a chronology-style card game.

Select only events that are good game material:
- well-known or at least broadly recognizable
- easy to understand in one line
- meaningful as a dated event
- suitable for players making chronological guesses

Reject:
- births and deaths
- obscure local events
- minor office appointments
- overly technical scientific entries
- niche product versions
- vague entries
- near-duplicates
- things that are famous only to experts

Use only these categories: ${CATEGORY_VALUES.join(', ')}

Title rules:
- short, clean, game-friendly
- phrase as a dated event
- examples:
  - "Apollo 11 lands on the Moon"
  - "World War I begins"
  - "The first iPhone is released"
  - "The Berlin Wall falls"

Description rules:
- 1 sentence
- clear, direct, plain language

Difficulty:
- 1 = almost everyone knows it
- 2 = very widely known
- 3 = reasonably known by general audiences
- 4 = harder but still fair
- 5 = use sparingly, only if still fair in a mainstream game

Preserve the exact year from the candidate.
Return only valid JSON.
`.trim();

    const rawCards: FinalCard[] = [];
    const chunks = chunk(shuffle(candidates, seed), 30);
    const wantedRaw = Math.max(targetCount * 3, targetCount + 8);

    for (const candidateChunk of chunks) {
        if (rawCards.length >= wantedRaw) break;

        const askFor = Math.min(Math.max(targetCount * 2, 8), 20);

        const input = `
${yearContext}
${targetCategoryText}

Choose up to ${askFor} candidates from this list.

Return JSON in this shape:
{
  "cards": [
    {
      "title": "string",
      "description": "string",
      "year": 1969,
      "category": "science",
      "source_url": "https://...",
      "difficulty": 1
    }
  ]
}

Candidates:
${JSON.stringify(candidateChunk, null, 2)}
`.trim();

        const outputText = await createResponse({
            model: 'gpt-5-nano',
            systemPrompt,
            userPrompt: input,
        });

        const parsed = safeJsonParse<{ cards: Partial<FinalCard>[] }>(outputText);
        if (!parsed?.cards) continue;

        const normalized = parsed.cards
            .map((card) => normalizeCard(card, category))
            .filter((card): card is FinalCard => card !== null)
            .filter((card) => card.year >= bucket.startYear && card.year <= bucket.endYear);

        rawCards.push(...normalized);
    }

    return dedupeBy(rawCards, (card) => `${card.title.toLowerCase()}|${card.year}|${card.category}`);
};

const validateCardsWithModel = async ({ cards, category }: { cards: FinalCard[]; category?: Category }): Promise<FinalCard[]> => {
    if (!cards.length) return [];

    const systemPrompt = `
You are validating chronology-game cards.

Keep only cards that are:
- fair for a mainstream chronology game
- clearly worded
- not duplicates or near-duplicates
- not too vague
- not too obscure
- assigned a reasonable difficulty

You may:
- remove cards
- rewrite title or description for clarity
- adjust category if clearly wrong
- adjust difficulty

Rules:
- Use only these categories: ${CATEGORY_VALUES.join(', ')}
- Preserve source_url and year for the same event
- Return only valid JSON
`.trim();

    const input = `
${category ? `All cards must remain in category: ${category}.` : 'Keep a reasonable category mix.'}

Return JSON in this shape:
{
  "cards": [
    {
      "title": "string",
      "description": "string",
      "year": 1969,
      "category": "science",
      "source_url": "https://...",
      "difficulty": 1
    }
  ]
}

Validate these cards:
${JSON.stringify(cards, null, 2)}
`.trim();

    const outputText = await createResponse({
        model: 'gpt-5-nano',
        systemPrompt,
        userPrompt: input,
    });

    const parsed = safeJsonParse<{ cards: Partial<FinalCard>[] }>(outputText);
    if (!parsed?.cards) return cards;

    return dedupeBy(
        parsed.cards.map((card) => normalizeCard(card, category)).filter((card): card is FinalCard => card !== null),
        (card) => `${card.title.toLowerCase()}|${card.year}|${card.category}`,
    );
};

const pickBalancedCardsWithinBucket = ({ cards, targetCount, seed }: { cards: FinalCard[]; targetCount: number; seed?: number }): FinalCard[] => {
    if (cards.length <= targetCount) return cards;

    const shuffled = shuffle(cards, seed);
    const difficultyTargets = getDifficultyTargets(targetCount);

    const buckets = new Map<number, FinalCard[]>();
    for (let i = 1; i <= 5; i += 1) {
        buckets.set(i, []);
    }

    for (const card of shuffled) {
        buckets.get(card.difficulty)?.push(card);
    }

    const selected: FinalCard[] = [];

    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
        const needed = difficultyTargets.get(difficulty) || 0;
        const pool = buckets.get(difficulty) || [];
        selected.push(...pool.slice(0, needed));
    }

    if (selected.length < targetCount) {
        const seen = new Set(selected.map((card) => `${card.title.toLowerCase()}|${card.year}|${card.category}`));

        for (const card of shuffled) {
            const key = `${card.title.toLowerCase()}|${card.year}|${card.category}`;
            if (seen.has(key)) continue;
            selected.push(card);
            seen.add(key);
            if (selected.length >= targetCount) break;
        }
    }

    return selected.slice(0, targetCount);
};

const rebalanceGloballyByDifficulty = ({ cards, finalCount, seed }: { cards: FinalCard[]; finalCount: number; seed?: number }): FinalCard[] => {
    if (cards.length <= finalCount) return cards;

    const shuffled = shuffle(cards, seed);
    const targets = getDifficultyTargets(finalCount);

    const pools = new Map<number, FinalCard[]>();
    for (let i = 1; i <= 5; i += 1) {
        pools.set(i, []);
    }

    for (const card of shuffled) {
        pools.get(card.difficulty)?.push(card);
    }

    const selected: FinalCard[] = [];

    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
        const needed = targets.get(difficulty) || 0;
        selected.push(...(pools.get(difficulty) || []).slice(0, needed));
    }

    if (selected.length < finalCount) {
        const seen = new Set(selected.map((card) => `${card.title.toLowerCase()}|${card.year}|${card.category}`));

        for (const card of shuffled) {
            const key = `${card.title.toLowerCase()}|${card.year}|${card.category}`;
            if (seen.has(key)) continue;
            selected.push(card);
            seen.add(key);
            if (selected.length >= finalCount) break;
        }
    }

    return selected.slice(0, finalCount);
};

const main = async () => {
    const args = parseArgs();

    const startYear = args.startYear ?? 1000;
    const endYear = args.endYear ?? new Date().getUTCFullYear();

    const yearBuckets = buildYearBuckets(startYear, endYear, args.count);

    console.log('Year buckets:');
    for (const bucket of yearBuckets) {
        console.log(`- ${bucket.id}: target ${bucket.targetCount}`);
    }

    const allSelected: FinalCard[] = [];

    for (let i = 0; i < yearBuckets.length; i += 1) {
        const bucket = yearBuckets[i];
        const bucketSeed = args.seed === undefined ? undefined : args.seed + i;

        console.log(`Fetching candidates for ${bucket.id}...`);
        let candidates: WikidataCandidate[] = [];

        try {
            candidates = await fetchWikidataCandidatesForRange({
                desiredCount: Math.max(bucket.targetCount * 2, 8),
                startYear: bucket.startYear,
                endYear: bucket.endYear,
            });
        } catch (error) {
            console.warn(`Skipping bucket ${bucket.id} after Wikidata failures: ${error instanceof Error ? error.message : String(error)}`);
            continue;
        }

        if (!candidates.length) {
            console.warn(`No candidates found for bucket ${bucket.id}`);
            continue;
        }

        console.log(`Fetched ${candidates.length} candidates for ${bucket.id}`);

        const curated = await curateBucketWithModel({
            candidates,
            targetCount: bucket.targetCount,
            category: args.category,
            bucket,
            seed: bucketSeed,
        });

        if (!curated.length) {
            console.warn(`No curated cards for bucket ${bucket.id}`);
            continue;
        }

        const validated = await validateCardsWithModel({
            cards: curated,
            category: args.category,
        });

        if (!validated.length) {
            console.warn(`No validated cards for bucket ${bucket.id}`);
            continue;
        }

        const selected = pickBalancedCardsWithinBucket({
            cards: validated,
            targetCount: bucket.targetCount,
            seed: bucketSeed,
        });

        console.log(`Selected ${selected.length}/${bucket.targetCount} cards for ${bucket.id}`);

        allSelected.push(...selected);
    }

    if (!allSelected.length) {
        throw new Error('No usable cards were produced.');
    }

    const deduped = dedupeBy(allSelected, (card) => `${card.title.toLowerCase()}|${card.year}|${card.category}`);

    let finalCards = deduped;

    if (finalCards.length > args.count) {
        finalCards = rebalanceGloballyByDifficulty({
            cards: finalCards,
            finalCount: args.count,
            seed: args.seed,
        });
    }

    finalCards = finalCards.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.title.localeCompare(b.title);
    });

    if (!finalCards.length) {
        throw new Error('No final cards were selected.');
    }

    const csv = toCsv(finalCards);
    await writeFile(args.out, csv, 'utf8');

    const difficultyCounts = finalCards.reduce<Record<number, number>>((acc, card) => {
        acc[card.difficulty] = (acc[card.difficulty] || 0) + 1;
        return acc;
    }, {});

    console.log(`Saved ${finalCards.length} cards to ${args.out}`);
    console.log('Final difficulty spread:', difficultyCounts);
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
