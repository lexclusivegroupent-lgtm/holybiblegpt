
import { Translation } from "../types";

export interface VerseData {
  number: number;
  text: string;
  isNotice?: boolean;
}

export interface BibleBook {
  name: string;
  chapters: number;
  isHistorical?: boolean;
}

// ── IndexedDB ─────────────────────────────────────────────────────────────────

const DB_NAME = 'HolyBibleDB_v2';
const STORE_NAME = 'Chapters_Cache';
const METADATA_STORE = 'Meta_Store';
const DB_VERSION = 2;

let _db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      if (!db.objectStoreNames.contains(METADATA_STORE)) db.createObjectStore(METADATA_STORE);
    };
    request.onsuccess = () => { _db = request.result; resolve(_db!); };
    request.onerror = () => reject(request.error);
  });
};

const getFromDB = async (key: string): Promise<VerseData[] | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
};

const saveToDB = async (key: string, data: VerseData[]): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, key);
  } catch { /* Non-fatal */ }
};

// ── In-memory cache (fastest — avoids repeated IndexedDB lookups) ─────────────
const memoryCache = new Map<string, VerseData[]>();

// ── Book Lists ─────────────────────────────────────────────────────────────────

export const BIBLE_BOOKS: BibleBook[] = [
  { name: "Genesis", chapters: 50 }, { name: "Exodus", chapters: 40 }, { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 }, { name: "Deuteronomy", chapters: 34 }, { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 }, { name: "Ruth", chapters: 4 }, { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 }, { name: "1 Kings", chapters: 22 }, { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 }, { name: "2 Chronicles", chapters: 36 }, { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 }, { name: "Esther", chapters: 10 }, { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 }, { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 }, { name: "Isaiah", chapters: 66 }, { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 }, { name: "Ezekiel", chapters: 48 }, { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 }, { name: "Joel", chapters: 3 }, { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 }, { name: "Jonah", chapters: 4 }, { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 }, { name: "Habakkuk", chapters: 3 }, { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 }, { name: "Zechariah", chapters: 14 }, { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 }, { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 }, { name: "Acts", chapters: 28 }, { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 }, { name: "2 Corinthians", chapters: 13 }, { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 }, { name: "Philippians", chapters: 4 }, { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 }, { name: "2 Thessalonians", chapters: 3 }, { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 }, { name: "Titus", chapters: 3 }, { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 }, { name: "James", chapters: 5 }, { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 }, { name: "1 John", chapters: 5 }, { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 }, { name: "Jude", chapters: 1 }, { name: "Revelation", chapters: 22 },
];

export const HISTORICAL_BOOKS: BibleBook[] = [
  { name: "Tobit", chapters: 14, isHistorical: true },
  { name: "Judith", chapters: 16, isHistorical: true },
  { name: "Wisdom", chapters: 19, isHistorical: true },
  { name: "Sirach", chapters: 51, isHistorical: true },
  { name: "Baruch", chapters: 6, isHistorical: true },
  { name: "1 Maccabees", chapters: 16, isHistorical: true },
  { name: "2 Maccabees", chapters: 15, isHistorical: true },
];

// ── Network Helpers ───────────────────────────────────────────────────────────

const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }
};

// ── ESV Fetch (via Cloudflare Worker proxy) ────────────────────────────────────

const fetchESV = async (book: string, chapter: string): Promise<VerseData[]> => {
  const url = `/api/esv?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`;
  const res = await fetch(url);

  if (res.status === 503) {
    // ESV_API_KEY not configured — fall back to KJV silently
    throw new Error('ESV_NOT_CONFIGURED');
  }
  if (!res.ok) throw new Error(`ESV proxy error: ${res.status}`);

  const data = await res.json() as { verses?: VerseData[]; error?: string };
  if (!data.verses?.length) throw new Error('No ESV verses returned');
  return data.verses;
};

// ── KJV Fetch (public domain via bible-api.com) ────────────────────────────────

const fetchKJV = async (book: string, chapter: string): Promise<VerseData[]> => {
  const data = await fetchWithRetry(
    `https://bible-api.com/${encodeURIComponent(book)}%20${chapter}?translation=kjv`
  );
  if (!data.verses?.length) throw new Error('No KJV verses returned');
  return data.verses.map((v: any) => ({ number: v.verse, text: v.text.trim() }));
};

// ── WEB Fetch (World English Bible, public domain) ────────────────────────────

const fetchWEB = async (book: string, chapter: string): Promise<VerseData[]> => {
  const data = await fetchWithRetry(
    `https://bible-api.com/${encodeURIComponent(book)}%20${chapter}?translation=web`
  );
  if (!data.verses?.length) throw new Error('No WEB verses returned');
  return data.verses.map((v: any) => ({ number: v.verse, text: v.text.trim() }));
};

// ── Primary Verse Fetcher ──────────────────────────────────────────────────────

export const getVerseText = async (
  translation: Translation,
  book: string,
  chapter: string
): Promise<VerseData[]> => {
  const key = `${translation}_${book}_${chapter}`;

  // 1. Memory cache (fastest)
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  // 2. IndexedDB cache
  const cached = await getFromDB(key);
  if (cached) {
    memoryCache.set(key, cached);
    return cached;
  }

  // 3. Network
  try {
    let verses: VerseData[];

    if (translation === Translation.ESV) {
      try {
        verses = await fetchESV(book, chapter);
      } catch (esvErr: any) {
        if (esvErr.message === 'ESV_NOT_CONFIGURED') {
          console.info('ESV API not configured; falling back to KJV.');
        } else {
          console.warn('ESV fetch failed; falling back to KJV:', esvErr.message);
        }
        verses = await fetchKJV(book, chapter);
      }
    } else if (translation === Translation.WEB) {
      verses = await fetchWEB(book, chapter);
    } else {
      verses = await fetchKJV(book, chapter);
    }

    saveToDB(key, verses);
    memoryCache.set(key, verses);
    return verses;
  } catch (error) {
    console.error('Bible Engine Error:', error);
    return [{ number: 0, text: 'Chapter unavailable. Please check your connection.', isNotice: true }];
  }
};

export const isChapterOffline = async (
  translation: Translation,
  book: string,
  chapter: string
): Promise<boolean> => !!(await getFromDB(`${translation}_${book}_${chapter}`));

// ── Offline KJV Preparation ───────────────────────────────────────────────────

export const initializeOfflineKJV = async (onProgress: (msg: string) => void): Promise<void> => {
  try {
    const db = await openDB();
    const isReady = await new Promise<boolean>(resolve => {
      const tx = db.transaction(METADATA_STORE, 'readonly');
      const req = tx.objectStore(METADATA_STORE).get('kjv_ready');
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
    if (isReady) return;

    onProgress('Downloading KJV data…');
    const res = await fetch('/bible/kjv.json');
    if (!res.ok) throw new Error('Local KJV file missing');
    const data: Array<{ book: string; chapter: string; verses: VerseData[] }> = await res.json();

    onProgress('Caching for offline use…');
    const tx = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const item of data) {
      const key = `${Translation.KJV}_${item.book}_${item.chapter}`;
      store.put(item.verses, key);
      memoryCache.set(key, item.verses);
    }
    tx.objectStore(METADATA_STORE).put(true, 'kjv_ready');

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Offline KJV init skipped:', err);
  }
};

export const prefetchAdjacent = (translation: Translation, book: string, chapter: string): void => {
  const num = parseInt(chapter, 10);
  const allBooks = [...BIBLE_BOOKS, ...HISTORICAL_BOOKS];
  const found = allBooks.find(b => b.name === book);
  if (!found) return;
  if (num < found.chapters) getVerseText(translation, book, (num + 1).toString());
  if (num > 1) getVerseText(translation, book, (num - 1).toString());
};

// ── KJV/ESV Verse Lookup Utilities ───────────────────────────────────────────

// Parse "John 3:16" → { book: "John", chapter: "3", verse: 16 }
export const parseVerseRef = (
  ref: string
): { book: string; chapter: string; verse: number } | null => {
  const match = ref.trim().match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)$/);
  if (!match) return null;
  return { book: match[1].trim(), chapter: match[2], verse: parseInt(match[3], 10) };
};

// Fetch a single verse and return it as a quoted string
export const getVerse = async (
  book: string,
  chapter: string,
  verseNum: number,
  translation: Translation = Translation.KJV
): Promise<string | null> => {
  try {
    const verses = await getVerseText(translation, book, chapter);
    const found = verses.find(v => v.number === verseNum);
    if (!found || found.isNotice) return null;
    return `"${found.text.trim()}" — ${book} ${chapter}:${verseNum} (${translation})`;
  } catch {
    return null;
  }
};

// All 66 canonical book names for reference detection
const ALL_BOOK_NAMES: string[] = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

// Lazy-build the regex once
let _verseRefRegex: RegExp | null = null;
const getVerseRefRegex = (): RegExp => {
  if (!_verseRefRegex) {
    const bookPattern = ALL_BOOK_NAMES
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(b => b.replace(/\s+/g, '\\s+'))
      .join('|');
    _verseRefRegex = new RegExp(`(${bookPattern})\\s+(\\d+):(\\d+)`, 'gi');
  }
  return _verseRefRegex;
};

// Detect verse references in a message, fetch the actual text, append as context.
// The AI then sees the real verse text and quotes it accurately.
export const enrichWithVerseContext = async (
  message: string,
  translation: Translation = Translation.KJV
): Promise<string> => {
  const regex = getVerseRefRegex();
  regex.lastIndex = 0;
  const matches = [...message.matchAll(regex)].slice(0, 3);
  if (matches.length === 0) return message;

  const lines: string[] = [];
  for (const m of matches) {
    const text = await getVerse(m[1], m[2], parseInt(m[3], 10), translation);
    if (text) lines.push(text);
  }

  if (lines.length === 0) return message;
  return `${message}\n\n[${translation} verse text for reference:]\n${lines.join('\n')}`;
};
