// Runs before every build (see package.json "prebuild"). Makes sure
// public/bible/kjv.json holds the full 1,189-chapter KJV text before the
// prerender step runs — the checked-in copy may be the old 1-chapter stub,
// or network conditions on this run may make a refetch fail.
//
// Non-fatal by design: this script NEVER throws and NEVER fails the build.
// If the fetch fails or is incomplete, the build proceeds with whatever is
// already on disk (worst case: the original 1-chapter stub, same behavior
// the app had before this change — not a regression).
//
// This also means the live app's "offline KJV download" feature (currently
// broken — Settings > Scriptorium only has Genesis 1 to offer) gets fixed
// for free on the next successful deploy.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'public', 'bible', 'kjv.json');
const EXPECTED_CHAPTERS = 1189;
const CONCURRENCY = 10;
const PER_CHAPTER_TIMEOUT_MS = 8000;
const BUDGET_MS = 4 * 60 * 1000; // never let this step eat more than ~4 min of build time

async function currentChapterCount() {
  try {
    const raw = await fs.readFile(OUT_PATH, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

async function fetchChapter(book, chapter) {
  const url = `https://bible-api.com/${encodeURIComponent(book)}%20${chapter}?translation=kjv`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_CHAPTER_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.verses) || data.verses.length === 0) return null;
    return {
      book,
      chapter: String(chapter),
      verses: data.verses.map(v => ({ number: v.verse, text: v.text.trim() })),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function run() {
  const have = await currentChapterCount();
  if (have >= EXPECTED_CHAPTERS) {
    console.log(`[ensure-kjv] Already have ${have} chapters — skipping fetch.`);
    return;
  }
  console.log(`[ensure-kjv] Only ${have}/${EXPECTED_CHAPTERS} chapters on disk. Fetching full KJV from bible-api.com...`);

  let BIBLE_BOOKS;
  try {
    BIBLE_BOOKS = JSON.parse(await fs.readFile(path.join(__dirname, 'books.json'), 'utf8'));
  } catch (err) {
    console.warn('[ensure-kjv] Could not load books.json, skipping fetch:', err.message);
    return;
  }

  const jobs = [];
  for (const b of BIBLE_BOOKS) {
    for (let c = 1; c <= b.chapters; c++) jobs.push({ book: b.name, chapter: c });
  }

  const results = [];
  let idx = 0;
  const deadline = Date.now() + BUDGET_MS;

  async function worker() {
    while (idx < jobs.length && Date.now() < deadline) {
      const { book, chapter } = jobs[idx++];
      const data = await fetchChapter(book, chapter);
      if (data) results.push(data);
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } catch (err) {
    console.warn('[ensure-kjv] Fetch pass threw, continuing with partial results:', err.message);
  }

  if (results.length <= have) {
    console.warn(`[ensure-kjv] Fetched ${results.length}, which isn't an improvement over the ${have} already on disk — leaving the existing file alone.`);
    return;
  }

  const bookOrder = new Map(BIBLE_BOOKS.map((b, i) => [b.name, i]));
  results.sort((a, b) => {
    const bo = bookOrder.get(a.book) - bookOrder.get(b.book);
    return bo !== 0 ? bo : parseInt(a.chapter) - parseInt(b.chapter);
  });

  try {
    await fs.writeFile(OUT_PATH, JSON.stringify(results));
    console.log(`[ensure-kjv] Wrote ${results.length}/${EXPECTED_CHAPTERS} chapters to ${OUT_PATH}.`);
    if (results.length < EXPECTED_CHAPTERS) {
      console.warn(`[ensure-kjv] Incomplete (${EXPECTED_CHAPTERS - results.length} missing) — will retry remaining chapters on next build.`);
    }
  } catch (err) {
    console.warn('[ensure-kjv] Failed to write output file, build continues with existing data:', err.message);
  }
}

run().catch(err => {
  console.warn('[ensure-kjv] Unexpected error, continuing build regardless:', err.message);
});
