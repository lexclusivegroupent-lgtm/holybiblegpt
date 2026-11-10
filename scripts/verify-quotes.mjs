// Every stored quotation must be the full verse from public/bible/kjv.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITED_VERSES } from '../data/citedVerses.mjs';
import { VERSE_OF_THE_DAY } from '../data/verseOfTheDay.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chapters = JSON.parse(readFileSync(join(root, 'public/bible/kjv.json'), 'utf8'));
const index = new Map();
for (const chapter of chapters) {
  for (const verse of chapter.verses) {
    index.set(`${chapter.book}|${chapter.chapter}|${verse.number}`, verse.text);
  }
}

function lookup(ref) {
  const match = ref.match(/^(.*) (\d+):(\d+)$/);
  if (!match) throw new Error(`Unparsed reference ${ref}`);
  const book = match[1] === 'Psalm' ? 'Psalms' : match[1];
  const text = index.get(`${book}|${match[2]}|${Number(match[3])}`);
  if (!text) throw new Error(`No KJV text for ${ref}`);
  return text;
}

const quotes = [
  ...VERSE_OF_THE_DAY.map((verse) => [verse.ref, verse.text]),
  ...Object.entries(CITED_VERSES),
];
for (const [ref, text] of quotes) {
  const source = lookup(ref);
  if (text !== source) {
    throw new Error(`Unverified quote for ${ref}.\n source: ${source}\n stored: ${text}`);
  }
}

const home = readFileSync(join(root, 'components/HomeView.tsx'), 'utf8');
const referenced = readFileSync(join(root, 'components/ReferencedView.tsx'), 'utf8');
if (home.includes('only begotten Son.') || referenced.includes('Arnon...')) {
  throw new Error('A study page still hardcodes a truncated verse. Quote the KJV module instead.');
}

console.log(`[verify-quotes] ${quotes.length} quotations match the stored KJV.`);
