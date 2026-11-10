// Builds a shareable passage from stored verse text only.
// Callers pass chapters already loaded from public/bible/kjv.json.
// Nothing here writes, paraphrases, or requests a verse.

import { canonicalBook } from '../scriptureGrounding.mjs';

export const MAX_THOUGHT_VERSES = 4;

const CLOSING = /[\s"'“”‘’«»()[\]{}]+$/u;

/**
 * A verse still in the middle of a sentence ends with a comma, semicolon,
 * colon, or no terminal mark. Periods, question marks, and exclamation marks
 * close it. Closing quotes and brackets are ignored.
 */
export function sentenceContinues(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  const core = trimmed.replace(CLOSING, '');
  if (!core) return false;
  return !/[.!?]$/.test(core);
}

export function parseVerseRef(ref) {
  const match = String(ref || '').trim().match(/^(.+?)\s+(\d+):(\d+)\s*$/);
  if (!match) return null;
  const verse = Number(match[3]);
  if (!Number.isInteger(verse) || verse < 1) return null;
  return { book: match[1].trim(), chapter: match[2], verse };
}

function normalizeStored(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

export function buildScripture(chapters) {
  const ordered = [];
  if (!Array.isArray(chapters)) return { ordered };
  for (const chapter of chapters) {
    if (!chapter || !Array.isArray(chapter.verses)) continue;
    const book = canonicalBook(String(chapter.book || ''));
    if (!book) continue;
    const verses = [];
    for (const verse of chapter.verses) {
      const number = Number(verse?.number);
      if (!Number.isInteger(number) || number < 1) continue;
      if (verse?.isNotice || typeof verse?.text !== 'string') continue;
      const text = normalizeStored(verse.text);
      if (!text) continue;
      verses.push({ number, text });
    }
    ordered.push({ book, chapter: String(chapter.chapter), verses });
  }
  return { ordered };
}

export function formatReference(book, chapter, start, endChapter, end) {
  if (String(endChapter) === String(chapter) && end === start) {
    return `${book} ${chapter}:${start}`;
  }
  if (String(endChapter) === String(chapter)) {
    return `${book} ${chapter}:${start}–${end}`;
  }
  return `${book} ${chapter}:${start}–${endChapter}:${end}`;
}

/**
 * Starting at one verse, append the following stored verses until the
 * sentence ends or MAX_THOUGHT_VERSES is reached. Text is the stored verses
 * joined with spaces. The reference uses an en dash for a range.
 */
export function completeThought(scripture, book, chapter, verse, options = {}) {
  const maxVerses = options.maxVerses ?? MAX_THOUGHT_VERSES;
  const name = canonicalBook(String(book || ''));
  const chapterKey = String(chapter);
  const start = Number(verse);
  if (!scripture || !Array.isArray(scripture.ordered)) return null;
  if (!name || !Number.isInteger(start) || start < 1) return null;
  if (!Number.isInteger(maxVerses) || maxVerses < 1) return null;

  let index = scripture.ordered.findIndex((entry) => entry.book === name && entry.chapter === chapterKey);
  if (index < 0) return null;

  const parts = [];
  let number = start;
  while (parts.length < maxVerses && index < scripture.ordered.length) {
    const current = scripture.ordered[index];
    if (current.book !== name) break;
    const found = current.verses.find((entry) => entry.number === number);
    if (!found) break;
    parts.push({
      book: current.book,
      chapter: current.chapter,
      number,
      text: found.text,
    });
    if (!sentenceContinues(found.text)) break;
    if (current.verses.some((entry) => entry.number === number + 1)) {
      number += 1;
      continue;
    }
    index += 1;
    number = 1;
  }

  if (!parts.length) return null;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return {
    book: first.book,
    chapter: first.chapter,
    start: first.number,
    end: last.number,
    endChapter: last.chapter,
    verses: parts,
    text: parts.map((part) => part.text).join(' '),
    reference: formatReference(first.book, first.chapter, first.number, last.chapter, last.number),
  };
}

export function passageFilename(reference) {
  const slug = String(reference || 'verse')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `holybiblegpt-${slug || 'verse'}.png`;
}
