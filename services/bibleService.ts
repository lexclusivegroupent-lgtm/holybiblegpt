
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

const DB_NAME = 'HolyBibleDB_v2';
const STORE_NAME = 'Chapters_Cache';
const METADATA_STORE = 'Meta_Store';
const DB_VERSION = 2; // Incremented for new store

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      if (!db.objectStoreNames.contains(METADATA_STORE)) db.createObjectStore(METADATA_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// In-Memory Cache
const memoryCache = new Map<string, VerseData[]>();

const getFromDB = async (key: string): Promise<VerseData[] | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch { return null; }
};

const saveToDB = async (key: string, data: VerseData[]) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(data, key);
  } catch { }
};

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
  { name: "3 John", chapters: 1 }, { name: "Jude", chapters: 1 }, { name: "Revelation", chapters: 22 }
];

export const HISTORICAL_BOOKS: BibleBook[] = [
  { name: "Tobit", chapters: 14, isHistorical: true },
  { name: "Judith", chapters: 16, isHistorical: true },
  { name: "Wisdom", chapters: 19, isHistorical: true },
  { name: "Sirach", chapters: 51, isHistorical: true },
  { name: "Baruch", chapters: 6, isHistorical: true },
  { name: "1 Maccabees", chapters: 16, isHistorical: true },
  { name: "2 Maccabees", chapters: 15, isHistorical: true }
];

const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};

export const getVerseText = async (translation: Translation, book: string, chapter: string): Promise<VerseData[]> => {
  const key = `${translation}_${book}_${chapter}`;

  // 1. Check Memory Cache
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  // 2. Check IndexedDB
  const cached = await getFromDB(key);
  if (cached) {
    memoryCache.set(key, cached); // Populate memory
    return cached;
  }

  // 3. Fallback to Network
  try {
    const translationQuery = translation.toLowerCase();
    const data = await fetchWithRetry(`https://bible-api.com/${book}%20${chapter}?translation=${translationQuery}`);

    if (!data.verses || data.verses.length === 0) {
      throw new Error("No verses returned");
    }

    const verses = data.verses.map((v: any) => ({
      number: v.verse,
      text: v.text.trim()
    }));

    saveToDB(key, verses);
    memoryCache.set(key, verses); // Populate memory
    return verses;
  } catch (error) {
    console.error("Bible Engine Error:", error);
    return [{ number: 0, text: "Chapter unavailable. Please check connection.", isNotice: true }];
  }
};

export const isChapterOffline = async (translation: Translation, book: string, chapter: string): Promise<boolean> => {
  return !!(await getFromDB(`${translation}_${book}_${chapter}`));
};


// --- OFFLINE KJV PREPARATION ---

export const initializeOfflineKJV = async (onProgress: (msg: string) => void): Promise<void> => {
  try {
    // Check if already initialized
    const db = await openDB();
    const isReady = await new Promise((resolve) => {
      const tx = db.transaction(METADATA_STORE, 'readonly');
      const req = tx.objectStore(METADATA_STORE).get('kjv_ready');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(false);
    });

    if (isReady) return;

    onProgress("Downloading KJV data...");

    // Fetch the local JSON file
    const res = await fetch('/bible/kjv.json');
    if (!res.ok) throw new Error("Local KJV file missing");

    const data = await res.json();

    onProgress("Optimizing for offline use...");

    const tx = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    let count = 0;
    for (const chapterData of data) {
      const key = `${Translation.KJV}_${chapterData.book}_${chapterData.chapter}`;
      store.put(chapterData.verses, key);
      count++;
    }

    tx.objectStore(METADATA_STORE).put(true, 'kjv_ready');

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log(`Available offline: ${count} chapters`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });

  } catch (error) {
    console.warn("Offline KJV init failed:", error);
    // Don't block app, just log
  }
};

export const prefetchAdjacent = (translation: Translation, book: string, chapter: string) => {
  const cNum = parseInt(chapter);
  const books = [...BIBLE_BOOKS, ...HISTORICAL_BOOKS];
  const b = books.find(x => x.name === book);
  if (!b) return;
  if (cNum < b.chapters) getVerseText(translation, book, (cNum + 1).toString());
  if (cNum > 1) getVerseText(translation, book, (cNum - 1).toString());
};

// ── KJV Verse Lookup Utilities ────────────────────────────────────────────────

// Parse "John 3:16" → { book: "John", chapter: "3", verse: 16 }
export const parseVerseRef = (
  ref: string
): { book: string; chapter: string; verse: number } | null => {
  const trimmed = ref.trim();
  // Handles: "Genesis 1:1", "1 John 3:16", "Song of Solomon 2:3"
  const match = trimmed.match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)$/);
  if (!match) return null;
  return { book: match[1].trim(), chapter: match[2], verse: parseInt(match[3], 10) };
};

// Fetch a single verse and return it as a formatted KJV string
export const getVerse = async (
  book: string,
  chapter: string,
  verseNum: number
): Promise<string | null> => {
  try {
    const verses = await getVerseText(Translation.KJV, book, chapter);
    const found = verses.find(v => v.number === verseNum);
    if (!found || found.isNotice) return null;
    return `"${found.text.trim()}" — ${book} ${chapter}:${verseNum} (KJV)`;
  } catch {
    return null;
  }
};

// All 66 canonical book names (used by the verse-ref detector)
const ALL_BOOK_NAMES: string[] = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Psalm","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts","Romans",
  "1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation",
];

// Detect verse references in a message, fetch their KJV text, and append to context.
// This lets the AI see the actual verse before answering — greatly improves accuracy.
export const enrichWithVerseContext = async (message: string): Promise<string> => {
  // Build a regex from book names (longest first to avoid partial matches)
  const bookPattern = ALL_BOOK_NAMES
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(b => b.replace(/\s+/g, "\\s+"))
    .join("|");

  const refRegex = new RegExp(`(${bookPattern})\\s+(\\d+):(\\d+)`, "gi");
  const found = [...message.matchAll(refRegex)].slice(0, 3); // cap at 3 refs
  if (found.length === 0) return message;

  const lines: string[] = [];
  for (const m of found) {
    const text = await getVerse(m[1], m[2], parseInt(m[3], 10));
    if (text) lines.push(text);
  }

  if (lines.length === 0) return message;
  return `${message}\n\n[KJV verse text for your reference:]\n${lines.join("\n")}`;
};
