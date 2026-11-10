// The committed King James Version is the text source. The build fails
// unless all 1,189 chapters are present and the file matches its checksum.
// Public domain. Spacing after LORD, GOD, and JEHOVAH was normalized to the
// punctuation used by bible-api.com, checked on 10 Nov 2026.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(join(root, 'public/bible/kjv.json'));
const expectedHash = readFileSync(join(root, 'public/bible/kjv.sha256'), 'utf8').trim();
const hash = createHash('sha256').update(raw).digest('hex');
if (hash !== expectedHash) {
  throw new Error(`KJV checksum mismatch.\n expected ${expectedHash}\n actual   ${hash}`);
}

const chapters = JSON.parse(raw.toString('utf8'));
const books = JSON.parse(readFileSync(join(root, 'scripts/books.json'), 'utf8'));
if (chapters.length !== 1189) {
  throw new Error(`KJV chapter count is ${chapters.length}, expected 1189.`);
}

const seen = new Map();
for (const chapter of chapters) {
  if (!chapter.book || !chapter.chapter || !Array.isArray(chapter.verses) || chapter.verses.length === 0) {
    throw new Error(`Incomplete chapter record for ${chapter.book} ${chapter.chapter}`);
  }
  seen.set(chapter.book, (seen.get(chapter.book) || 0) + 1);
  for (const verse of chapter.verses) {
    if (!verse.number || typeof verse.text !== 'string' || !verse.text.trim()) {
      throw new Error(`Empty verse in ${chapter.book} ${chapter.chapter}`);
    }
  }
}
for (const book of books) {
  if (seen.get(book.name) !== book.chapters) {
    throw new Error(`${book.name} has ${seen.get(book.name) || 0} chapters, expected ${book.chapters}`);
  }
}

function verse(book, chapter, number) {
  const found = chapters.find((item) => item.book === book && item.chapter === String(chapter));
  return found.verses.find((item) => item.number === number).text;
}

const locks = {
  'Genesis 1:1': 'In the beginning God created the heaven and the earth.',
  'John 3:16': 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  'Philippians 4:7': 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
};
for (const [ref, text] of Object.entries(locks)) {
  const match = ref.match(/^(.*) (\d+):(\d+)$/);
  const actual = verse(match[1], match[2], Number(match[3]));
  if (actual !== text) throw new Error(`${ref} does not match the locked KJV text.`);
}

console.log(`[verify-kjv] 1189 chapters, checksum ${hash.slice(0, 12)}.`);
