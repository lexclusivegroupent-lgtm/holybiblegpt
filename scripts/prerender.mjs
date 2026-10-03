// Runs after `vite build` (see package.json "postbuild"). Generates static
// HTML for every URL in sitemap.xml — the 1,189 Bible chapter pages plus the
// 11 static routes — so crawlers get real, unique content and correct
// <title>/meta/canonical tags on the FIRST byte, instead of the same empty
// SPA shell for all 1,200+ URLs.
//
// Why this matters: App.tsx already rewrites title/meta/canonical correctly
// client-side after React mounts, but that only helps crawlers that execute
// JS (Google, eventually, on a second pass). Crawlers and bots that don't
// run JS — most link-preview scrapers (iMessage, WhatsApp, Slack), and
// Bing's/Google's first-pass crawl — see identical, generic homepage
// content for every single URL today. That's a duplicate-content signal at
// scale, and it costs render budget Google won't spend unlimited amounts of
// on a new, low-authority domain.
//
// How: reads dist/index.html as the page shell, and for each URL swaps in
// the per-page title/meta/canonical/OG tags (mirroring App.tsx's PAGE_META),
// plus — for Bible chapters — injects the actual verse text as visible,
// server-delivered HTML inside #root. React still mounts and takes over
// normally on load; this only changes what's in the HTML before JS runs.
//
// Non-fatal: wrapped so a failure here never breaks `vite build`'s output —
// worst case, this step no-ops and the site ships exactly as it did before.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const bookToSlug = (name) => name.toLowerCase().replace(/\s+/g, '-');
const escapeHtml = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Mirror of App.tsx's PAGE_META — keep these two in sync if page copy changes there.
const STATIC_PAGES = {
  '/about':         ['About Holy Bible GPT – Scripture-First, Always Free', 'Learn how Holy Bible GPT works: a Scripture-first study tool that quotes the Word of God before everything else.'],
  '/faq':           ['FAQ – Holy Bible GPT', 'Frequently asked questions about Holy Bible GPT, free AI Bible study, and how to use the Scripture study tools.'],
  '/privacy':       ['Privacy Policy – Holy Bible GPT', 'No accounts, no data collection. Holy Bible GPT stores everything on your device only. Your data stays with you.'],
  '/terms':         ['Terms of Service – Holy Bible GPT', 'Terms of service for the Holy Bible GPT free Scripture study app.'],
  '/contact':       ['Contact – Holy Bible GPT', 'Get in touch with the Holy Bible GPT team. Send feedback, report an issue, or ask a question.'],
  '/instructions':  ['How to Use – Holy Bible GPT', 'A quick guide to getting the most out of Holy Bible GPT for daily Bible study.'],
  '/disclaimer':    ['AI Disclaimer – Holy Bible GPT', 'Understanding the role and limits of AI in Holy Bible GPT.'],
  '/translations':  ['About Bible Translations – Holy Bible GPT', 'KJV, ESV, and WEB translations explained — why KJV is the default and how the others support understanding.'],
  '/faith':         ['What We Believe – Holy Bible GPT', 'The faith foundation behind Holy Bible GPT and our commitment to Scripture as the final authority.'],
  '/harmony':       ['Gospel Harmony – Holy Bible GPT', 'See parallel accounts of the life of Christ across Matthew, Mark, Luke, and John — side by side.'],
  '/changelog':     ["What's New – Holy Bible GPT Changelog", 'Latest updates and new features added to Holy Bible GPT: search tools, offline KJV, prayer journal, and more.'],
};

function injectMeta(html, { title, desc, path: urlPath }) {
  const canonicalUrl = `https://holybiblegpt.com${urlPath}`;
  return html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonicalUrl}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonicalUrl}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeHtml(desc)}$2`);
}

function injectRootContent(html, bodyHtml) {
  return html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
}

async function writePage(urlPath, html) {
  const outDir = path.join(DIST, urlPath.replace(/^\//, ''));
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'index.html'), html);
}

async function run() {
  const shell = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  let count = 0;

  // ── Static routes ──────────────────────────────────────────────────────
  for (const [urlPath, [title, desc]] of Object.entries(STATIC_PAGES)) {
    const html = injectMeta(shell, { title, desc, path: urlPath });
    await writePage(urlPath, html);
    count++;
  }

  // ── Bible chapters ──────────────────────────────────────────────────────
  let chapters = [];
  try {
    const raw = await fs.readFile(path.join(ROOT, 'public', 'bible', 'kjv.json'), 'utf8');
    chapters = JSON.parse(raw);
  } catch (err) {
    console.warn('[prerender] Could not read kjv.json, skipping Bible chapter prerendering:', err.message);
  }

  for (const { book, chapter, verses } of chapters) {
    const slug = bookToSlug(book);
    const urlPath = `/bible/${slug}/${chapter}`;
    const title = `${book} ${chapter} – Bible Reading – Holy Bible GPT`;
    const desc = `Read ${book} chapter ${chapter} (KJV, ESV, WEB). Study, highlight, bookmark, and explore Scripture.`;

    const verseHtml = verses
      .map(v => `<p><strong>${v.number}</strong> ${escapeHtml(v.text)}</p>`)
      .join('\n');
    const bodyHtml = `<main><h1>${escapeHtml(book)} ${escapeHtml(chapter)}</h1><div>${verseHtml}</div></main>`;

    let html = injectMeta(shell, { title, desc, path: urlPath });
    html = injectRootContent(html, bodyHtml);
    await writePage(urlPath, html);
    count++;
  }

  console.log(`[prerender] Generated ${count} static pages (${Object.keys(STATIC_PAGES).length} static routes + ${chapters.length} Bible chapters).`);
  if (chapters.length < 1189) {
    console.warn(`[prerender] Only ${chapters.length}/1189 chapters were prerendered — kjv.json is incomplete this build. Will fill in more on the next deploy as ensure-kjv.mjs catches up.`);
  }
}

run().catch(err => {
  console.warn('[prerender] Failed, but vite build output is untouched — site still works as a plain SPA:', err.message);
});
