// Fetches the full public-domain KJV text (all 1,189 canonical chapters) from
// bible-api.com — the same source services/bibleService.ts uses for live
// chapter fetches — and writes public/bible/kjv.json.
//
// This file currently only contains Genesis 1 (a stub), which silently
// breaks the app's "offline KJV" feature for every other chapter. This
// script also produces the data source the prerender script (prerender.mjs)
// uses to bake real Bible text into each chapter's static HTML for SEO.
//
// Run manually when the KJV text needs regenerating:
//   node scripts/fetch-kjv.mjs
// Safe to re-run — it's idempotent and overwrites the output file wholesale.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BIBLE_BOOKS = JSON.parse(
  await fs.readFile(path.join(__dirname, 'books.json'), 'utf8')
);

const CONCURRENCY = 8;
const MAX_RETRIES = 4;

async function fetchChapter(book, chapter) {
  const url = `https://bible-api.com/${encodeURIComponent(book)}%20${chapter}?translation=kjv`;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.verses) || data.verses.length === 0) {
        throw new Error('empty verses array');
      }
      return {
        book,
        chapter: String(chapter),
        verses: data.verses.map(v => ({ number: v.verse, text: v.text.trim() })),
      };
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(`FAILED ${book} ${chapter} after ${MAX_RETRIES} attempts: ${err.message}`);
        return null;
      }
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
}

async function run() {
  const jobs = [];
  for (const b of BIBLE_BOOKS) {
    for (let c = 1; c <= b.chapters; c++) jobs.push({ book: b.name, chapter: c });
  }
  console.log(`Fetching ${jobs.length} chapters, concurrency ${CONCURRENCY}...`);

  const results = [];
  let done = 0;
  let idx = 0;

  async function worker() {
    while (idx < jobs.length) {
      const myIdx = idx++;
      const { book, chapter } = jobs[myIdx];
      const data = await fetchChapter(book, chapter);
      if (data) results.push(data);
      done++;
      if (done % 100 === 0 || done === jobs.length) {
        console.log(`  ${done}/${jobs.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Sort back into canonical book/chapter order (concurrent fetches finish out of order)
  const bookOrder = new Map(BIBLE_BOOKS.map((b, i) => [b.name, i]));
  results.sort((a, b) => {
    const bo = bookOrder.get(a.book) - bookOrder.get(b.book);
    if (bo !== 0) return bo;
    return parseInt(a.chapter) - parseInt(b.chapter);
  });

  const expected = jobs.length;
  console.log(`Fetched ${results.length}/${expected} chapters successfully.`);
  if (results.length < expected) {
    console.warn(`WARNING: ${expected - results.length} chapters failed. Re-run this script to retry — it's safe, it overwrites the whole file.`);
  }

  const outPath = path.join(ROOT, 'public', 'bible', 'kjv.json');
  await fs.writeFile(outPath, JSON.stringify(results));
  console.log(`Wrote ${outPath} (${(JSON.stringify(results).length / 1024 / 1024).toFixed(1)} MB)`);
}

run();
