// Writes real HTML for the homepage, every book, and all 1,189 chapters.
// Titles, descriptions, canonicals, and BreadcrumbList markup are unique.
// The sitemap lists only the pages this step wrote.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookPath, bookToSlug, chapterPath } from '../services/routes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const origin = 'https://holybiblegpt.com';

const STATIC_PAGES = {
  '/about': ['About Holy Bible GPT – Scripture-First, Always Free', 'Learn how Holy Bible GPT works: a Scripture-first study tool. The Bible is the authority and the study aid is an assistant.'],
  '/faq': ['FAQ – Holy Bible GPT', 'Questions about Holy Bible GPT, the public-domain Bible text, and the study aid.'],
  '/privacy': ['Privacy Policy – Holy Bible GPT', 'How Holy Bible GPT uses Puter, the model provider, this browser, Vercel KV, Stripe, bible-api.com, and Vercel Analytics.'],
  '/methodology': ['How answers are made – Holy Bible GPT', 'Scripture is retrieved before an explanation. A quotation and an explanation are kept apart.'],
  '/limitations': ['Limits of the study aid – Holy Bible GPT', 'The study aid can be wrong. It is instructed to say when a claim is not established from Scripture.'],
  '/copyrights': ['Translation copyright – Holy Bible GPT', 'The King James Version and the World English Bible are public domain. The English Standard Version is not offered.'],
  '/corrections': ['Corrections – Holy Bible GPT', 'How to report a verse that does not match its label, or an answer that adds to the text.'],
  '/terms': ['Terms of Service – Holy Bible GPT', 'Terms of service for the Holy Bible GPT Scripture study app.'],
  '/contact': ['Contact – Holy Bible GPT', 'Send feedback, report a verse that does not match its label, or ask a question.'],
  '/instructions': ['How to Use – Holy Bible GPT', 'A short guide to reading and studying with Holy Bible GPT.'],
  '/disclaimer': ['AI Disclaimer – Holy Bible GPT', 'The study aid can be wrong. Scripture remains the authority.'],
  '/translations': ['About Bible Translations – Holy Bible GPT', 'The King James Version and the World English Bible are public domain. The English Standard Version is not offered.'],
  '/faith': ['What We Believe – Holy Bible GPT', 'The faith foundation behind Holy Bible GPT and the commitment to Scripture as the final authority.'],
  '/harmony': ['Gospel Harmony – Holy Bible GPT', 'Parallel accounts of the life of Christ in Matthew, Mark, Luke, and John.'],
  '/changelog': ["What's New – Holy Bible GPT Changelog", 'Recent updates to Holy Bible GPT.'],
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function breadcrumbJson(items) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  });
}

function inject(html, { title, desc, path, crumbs }) {
  const canonical = `${origin}${path === '/' ? '/' : path}`;
  let next = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeHtml(desc)}$2`);
  const block = `<script type="application/ld+json" id="breadcrumb-jsonld">${breadcrumbJson(crumbs)}</script>`;
  if (next.includes('id="breadcrumb-jsonld"')) {
    next = next.replace(/<script type="application\/ld\+json" id="breadcrumb-jsonld">.*?<\/script>/, block);
  } else {
    next = next.replace('</head>', `${block}\n</head>`);
  }
  return next;
}

function write(urlPath, html) {
  const dir = urlPath === '/' ? dist : join(dist, urlPath.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

function nav(links) {
  return `<nav>${links.map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join(' · ')}</nav>`;
}

const shell = readFileSync(join(dist, 'index.html'), 'utf8');
const chapters = JSON.parse(readFileSync(join(root, 'public/bible/kjv.json'), 'utf8'));
if (chapters.length !== 1189) {
  throw new Error(`Refusing to prerender ${chapters.length} chapters.`);
}

const byBook = new Map();
for (const chapter of chapters) {
  if (!byBook.has(chapter.book)) byBook.set(chapter.book, []);
  byBook.get(chapter.book).push(chapter);
}

const urls = [];
const homeLinks = [...byBook.keys()].map((book) => `<a href="${bookPath(book)}">${escapeHtml(book)}</a>`).join(' ');
const homeBody = `<main><h1>Holy Bible GPT</h1><p>Read the King James Version, public domain.</p><nav aria-label="Books of the Bible">${homeLinks}</nav></main>`;
let home = inject(shell, {
  title: 'Holy Bible GPT – Free Scripture-First Bible Study',
  desc: 'Read every chapter of the King James Version. Scripture is the authority and the study aid is an assistant.',
  path: '/',
  crumbs: [{ name: 'Home', path: '/' }],
});
home = home.replace('<div id="root"></div>', `<div id="root">${homeBody}</div>`);
write('/', home);
urls.push('/');

for (const [urlPath, [title, desc]] of Object.entries(STATIC_PAGES)) {
  const html = inject(shell, {
    title,
    desc,
    path: urlPath,
    crumbs: [{ name: 'Home', path: '/' }, { name: title.split('–')[0].trim(), path: urlPath }],
  });
  write(urlPath, html);
  urls.push(urlPath);
}

const bookNames = [...byBook.keys()];
bookNames.forEach((book, bookIndex) => {
  const list = byBook.get(book);
  const chapterLinks = list.map((chapter) => `<a href="${chapterPath(book, chapter.chapter)}">${escapeHtml(book)} ${escapeHtml(chapter.chapter)}</a>`).join(' ');
  const neighbors = [];
  if (bookIndex > 0) neighbors.push({ href: bookPath(bookNames[bookIndex - 1]), label: bookNames[bookIndex - 1] });
  neighbors.push({ href: '/', label: 'All books' });
  if (bookIndex < bookNames.length - 1) neighbors.push({ href: bookPath(bookNames[bookIndex + 1]), label: bookNames[bookIndex + 1] });
  const body = `<main><nav aria-label="Breadcrumb"><a href="/">Home</a> / <span>${escapeHtml(book)}</span></nav><h1>${escapeHtml(book)}</h1><p>King James Version, public domain. ${list.length} chapters.</p><nav aria-label="Chapters">${chapterLinks}</nav>${nav(neighbors)}</main>`;
  let html = inject(shell, {
    title: `${book} – King James Version – Holy Bible GPT`,
    desc: `King James Version, public domain. ${book} has ${list.length} chapters on Holy Bible GPT.`,
    path: bookPath(book),
    crumbs: [{ name: 'Home', path: '/' }, { name: book, path: bookPath(book) }],
  });
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  write(bookPath(book), html);
  urls.push(bookPath(book));

  list.forEach((chapter, index) => {
    const verses = chapter.verses.map((verse) => `<p><strong>${verse.number}</strong> ${escapeHtml(verse.text)}</p>`).join('\n');
    const prev = index > 0
      ? { href: chapterPath(book, list[index - 1].chapter), label: `Previous: ${book} ${list[index - 1].chapter}` }
      : { href: bookPath(book), label: `${book} chapters` };
    const next = index < list.length - 1
      ? { href: chapterPath(book, list[index + 1].chapter), label: `Next: ${book} ${list[index + 1].chapter}` }
      : { href: bookPath(book), label: `${book} chapters` };
    const path = chapterPath(book, chapter.chapter);
    const bodyHtml = `<main><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="${bookPath(book)}">${escapeHtml(book)}</a> / <span>${escapeHtml(chapter.chapter)}</span></nav><h1>${escapeHtml(book)} ${escapeHtml(chapter.chapter)}</h1><p>King James Version, public domain.</p><article>${verses}</article>${nav([prev, { href: bookPath(book), label: 'All chapters' }, next])}</main>`;
    let page = inject(shell, {
      title: `${book} ${chapter.chapter} KJV – Holy Bible GPT`,
      desc: `King James Version, public domain. ${book} ${chapter.chapter} has ${chapter.verses.length} verses on Holy Bible GPT.`,
      path,
      crumbs: [
        { name: 'Home', path: '/' },
        { name: book, path: bookPath(book) },
        { name: `${book} ${chapter.chapter}`, path },
      ],
    });
    page = page.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
    write(path, page);
    urls.push(path);
  });
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
  urls.map((url) => `  <url><loc>${origin}${url === '/' ? '/' : url}</loc></url>`).join('\n')
}\n</urlset>\n`;
writeFileSync(join(dist, 'sitemap.xml'), sitemap);
writeFileSync(join(root, 'public/sitemap.xml'), sitemap);
if (urls.length !== 1 + Object.keys(STATIC_PAGES).length + 66 + 1189) {
  throw new Error(`Sitemap has ${urls.length} URLs, expected ${1 + Object.keys(STATIC_PAGES).length + 66 + 1189}.`);
}
console.log(`[prerender] Wrote ${urls.length} pages and a sitemap of the same URLs.`);
