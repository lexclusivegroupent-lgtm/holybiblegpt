// Topic search may name a reference. The words shown as Scripture come from a
// stored chapter. Model-written verse text is never used. Book names and
// Psalm → Psalms come from the Scripture-grounding helper.

import { BOOK_NAMES, canonicalBook } from "./scriptureGrounding.mjs";

export const MAX_SEARCH_VERSES = 5;
export const MAX_RANGE_SPAN = 8;

const EXTRA_ALIASES = {
  "ps": "Psalms",
  "psa": "Psalms",
  "song of songs": "Song of Solomon",
  "song of sol": "Song of Solomon",
  "canticles": "Song of Solomon",
  "gen": "Genesis",
  "ex": "Exodus",
  "exod": "Exodus",
  "lev": "Leviticus",
  "num": "Numbers",
  "deut": "Deuteronomy",
  "josh": "Joshua",
  "judg": "Judges",
  "neh": "Nehemiah",
  "esth": "Esther",
  "isa": "Isaiah",
  "jer": "Jeremiah",
  "lam": "Lamentations",
  "ezek": "Ezekiel",
  "dan": "Daniel",
  "hos": "Hosea",
  "mic": "Micah",
  "nah": "Nahum",
  "hab": "Habakkuk",
  "zeph": "Zephaniah",
  "hag": "Haggai",
  "zech": "Zechariah",
  "mal": "Malachi",
  "matt": "Matthew",
  "mt": "Matthew",
  "mk": "Mark",
  "lk": "Luke",
  "jn": "John",
  "joh": "John",
  "rom": "Romans",
  "1 cor": "1 Corinthians",
  "2 cor": "2 Corinthians",
  "gal": "Galatians",
  "eph": "Ephesians",
  "phil": "Philippians",
  "col": "Colossians",
  "1 thess": "1 Thessalonians",
  "2 thess": "2 Thessalonians",
  "1 tim": "1 Timothy",
  "2 tim": "2 Timothy",
  "tit": "Titus",
  "phlm": "Philemon",
  "heb": "Hebrews",
  "jas": "James",
  "1 pet": "1 Peter",
  "2 pet": "2 Peter",
  "1 jn": "1 John",
  "2 jn": "2 John",
  "3 jn": "3 John",
  "rev": "Revelation",
  "revelations": "Revelation",
};

const NUMBER_PREFIXES = {
  "1": ["i", "1st", "first"],
  "2": ["ii", "2nd", "second"],
  "3": ["iii", "3rd", "third"],
};

function normalizeAlias(value) {
  return String(value || "").replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function buildAliases() {
  const aliases = new Map();
  const add = (alias, canonical) => {
    const key = normalizeAlias(alias);
    if (!key || aliases.has(key)) return;
    aliases.set(key, canonical);
    const numbered = key.match(/^([123])\s+(.+)$/);
    if (!numbered) return;
    for (const prefix of NUMBER_PREFIXES[numbered[1]]) add(`${prefix} ${numbered[2]}`, canonical);
  };
  for (const name of BOOK_NAMES) add(name, canonicalBook(name));
  for (const [alias, canonical] of Object.entries(EXTRA_ALIASES)) add(alias, canonical);
  return [...aliases.entries()].sort((a, b) => b[0].length - a[0].length);
}

const ALIASES = buildAliases();

function endsWithAlias(text, alias) {
  if (!text.endsWith(alias)) return false;
  if (text.length === alias.length) return true;
  return /[^a-z0-9]/.test(text[text.length - alias.length - 1]);
}

function bookFromPrefix(prefix) {
  const normalized = normalizeAlias(prefix);
  for (const [alias, canonical] of ALIASES) {
    if (endsWithAlias(normalized, alias)) return canonical;
  }
  return null;
}

function expandVerseSpec(spec, maxSpan) {
  const numbers = [];
  for (const part of String(spec).split(",")) {
    const piece = part.trim();
    const range = piece.match(/^(\d+)\s*[\u2013\u2014-]\s*(\d+)$/);
    if (range) {
      let start = parseInt(range[1], 10);
      let end = parseInt(range[2], 10);
      if (start > end) [start, end] = [end, start];
      const capped = Math.min(end, start + maxSpan - 1);
      for (let n = start; n <= capped; n += 1) numbers.push(n);
      continue;
    }
    if (/^\d+$/.test(piece)) numbers.push(parseInt(piece, 10));
  }
  return numbers;
}

const VERSE_PATTERN = /\b(\d+)\s*[:.]\s*(\d+(?:\s*(?:[\u2013\u2014-]|,)\s*\d+)*)/g;

export function parseSearchMentions(aiText, maxSpan = MAX_RANGE_SPAN) {
  if (typeof aiText !== "string" || !aiText.trim()) return [];
  const mentions = [];
  for (const match of aiText.matchAll(VERSE_PATTERN)) {
    const chapter = parseInt(match[1], 10);
    if (!Number.isInteger(chapter) || chapter < 1) continue;
    const book = bookFromPrefix(aiText.slice(0, match.index));
    if (!book) continue;
    const verses = expandVerseSpec(match[2], maxSpan).filter((n) => Number.isInteger(n) && n > 0);
    if (!verses.length) continue;
    mentions.push({ book, chapter: String(chapter), verses });
  }
  return mentions;
}

export function indexChapters(chapters) {
  const index = new Map();
  if (!Array.isArray(chapters)) return index;
  for (const chapter of chapters) {
    if (!chapter || chapter.chapter == null || !Array.isArray(chapter.verses)) continue;
    const book = canonicalBook(String(chapter.book || ""));
    if (!book) continue;
    const chapterNumber = Number(chapter.chapter);
    const chapterKey = Number.isInteger(chapterNumber) && chapterNumber > 0
      ? String(chapterNumber)
      : String(chapter.chapter);
    index.set(`${book}|${chapterKey}`, chapter.verses);
  }
  return index;
}

export function chapterVerses(index, book, chapter) {
  if (!index || typeof index.has !== "function") return null;
  const key = `${book}|${String(chapter)}`;
  return index.has(key) ? index.get(key) : null;
}

export function verseFromChapter(verses, verseNumber) {
  if (!Array.isArray(verses) || verses.length === 0) return null;
  if (verses.some((verse) => verse && verse.isNotice)) return null;
  const wanted = Number(verseNumber);
  if (!Number.isInteger(wanted) || wanted < 1) return null;
  const found = verses.find((verse) => Number(verse?.number) === wanted);
  if (!found || found.isNotice || typeof found.text !== "string") return null;
  const text = found.text.trim();
  return text || null;
}

// A stored chapter is authoritative, including when the verse number is absent.
// The fetched chapter is used only when that chapter is not stored.
export function chooseVerseText(storedChapter, fetchedChapter, verseNumber) {
  if (Array.isArray(storedChapter)) return verseFromChapter(storedChapter, verseNumber);
  return verseFromChapter(fetchedChapter, verseNumber);
}

export function bundledBiblePath(translation) {
  if (translation === "KJV") return "/bible/kjv.json";
  if (translation === "WEB") return "/bible/web.json";
  return null;
}

export async function loadBundledIndex(translation, fetchImpl = globalThis.fetch) {
  const path = bundledBiblePath(translation);
  if (!path || typeof fetchImpl !== "function") return indexChapters([]);
  try {
    const res = await fetchImpl(path);
    const type = String(res?.headers?.get?.("content-type") || "");
    if (!res?.ok) return indexChapters([]);
    if (type && !type.includes("json")) return indexChapters([]);
    return indexChapters(await res.json());
  } catch {
    return indexChapters([]);
  }
}

function stripQuotedScripture(text) {
  return text.replace(/[“"][^“”"]{12,}[”"]/g, " ").replace(/\s+/g, " ").trim();
}

export function extractCommentary(aiText) {
  if (typeof aiText !== "string") return null;
  const parts = [];
  for (const line of aiText.split(/\r?\n/)) {
    const match = line.trim().match(/^(?:commentary|explanation)\s*:\s*(.*)$/i);
    if (!match) continue;
    const cleaned = stripQuotedScripture(match[1]);
    if (cleaned) parts.push(cleaned);
  }
  if (!parts.length) return null;
  const text = parts.join(" ").slice(0, 700).trim();
  return text || null;
}

export async function resolveTopicSearch(aiText, lookup, options = {}) {
  const limit = options.limit ?? MAX_SEARCH_VERSES;
  const mentions = parseSearchMentions(aiText, options.maxSpan ?? MAX_RANGE_SPAN);
  const verses = [];
  const seen = new Set();
  if (typeof lookup === "function") {
    for (const mention of mentions) {
      for (const number of mention.verses) {
        if (verses.length >= limit) break;
        const key = `${mention.book}|${mention.chapter}|${number}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let text = null;
        try {
          text = await lookup(mention.book, mention.chapter, number);
        } catch {
          text = null;
        }
        if (typeof text !== "string" || !text.trim()) continue;
        verses.push({
          book: mention.book,
          chapter: mention.chapter,
          verse: String(number),
          text: text.trim(),
        });
      }
      if (verses.length >= limit) break;
    }
  }
  return {
    verses,
    commentary: extractCommentary(aiText),
  };
}
