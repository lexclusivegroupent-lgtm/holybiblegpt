import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isKnownAppPath,
  listBooks,
  parseBiblePath,
  resolveDocumentRequest,
} from '../services/routes.mjs';
import { notFoundDocument } from '../src/notFoundPage.mjs';

test('app paths, Bible chapters, and unknown URLs are classified', () => {
  assert.equal(resolveDocumentRequest('/about').type, 'app');
  assert.equal(resolveDocumentRequest('/journal').type, 'app');
  assert.equal(resolveDocumentRequest('/search').type, 'app');
  assert.equal(resolveDocumentRequest('/').type, 'app');
  assert.equal(resolveDocumentRequest('/bible/john/3').type, 'app');
  assert.equal(resolveDocumentRequest('/bible/john').type, 'app');
  assert.equal(resolveDocumentRequest('/bible/revelation/22').type, 'app');
  assert.equal(resolveDocumentRequest('/bible/psalms/150').type, 'app');
  assert.equal(resolveDocumentRequest('/bible/tobit/1').type, 'app');
  assert.equal(resolveDocumentRequest('/bible/tobit/14').type, 'app');
  assert.equal(parseBiblePath('/bible/john/3')?.name, 'John');

  assert.equal(resolveDocumentRequest('/this-page-does-not-exist-xyz').type, 'not-found');
  assert.equal(resolveDocumentRequest('/bible/john/999').type, 'not-found');
  assert.equal(resolveDocumentRequest('/bible/john/0').type, 'not-found');
  assert.equal(resolveDocumentRequest('/bible/john/03').type, 'not-found');
  assert.equal(resolveDocumentRequest('/bible/not-a-book').type, 'not-found');
  assert.equal(resolveDocumentRequest('/bible/not-a-book/1').type, 'not-found');
  assert.equal(resolveDocumentRequest('/bible/tobit/99').type, 'not-found');
  assert.equal(resolveDocumentRequest('/bible').type, 'not-found');
  assert.equal(isKnownAppPath('/roadmap'), false);

  const aboutSlash = resolveDocumentRequest('/about/', '?from=nav');
  assert.equal(aboutSlash.type, 'redirect');
  assert.equal(aboutSlash.location, '/about?from=nav');
  const chapterSlash = resolveDocumentRequest('/bible/genesis/1/');
  assert.equal(chapterSlash.type, 'redirect');
  assert.equal(chapterSlash.location, '/bible/genesis/1');

  assert.equal(resolveDocumentRequest('/robots.txt').type, 'asset');
  assert.equal(resolveDocumentRequest('/assets/index-abc.js').type, 'asset');
  assert.equal(resolveDocumentRequest('/bible/kjv.json').type, 'asset');
  assert.equal(resolveDocumentRequest('/icons/og-image.png').type, 'asset');
  assert.equal(resolveDocumentRequest('/journal/cover.webp').type, 'asset');
});

test('chapter counts match the Bible lists used by the reader', () => {
  const source = readFileSync(new URL('../services/bibleService.ts', import.meta.url), 'utf8');
  const pairs = [...source.matchAll(/name: "([^"]+)", chapters: (\d+)/g)].map((match) => [match[1], Number(match[2])]);
  const listed = new Map(listBooks().map((book) => [book.name, book.chapters]));
  assert.equal(pairs.length, listed.size);
  for (const [name, chapters] of pairs) assert.equal(listed.get(name), chapters, name);
  assert.equal(listed.get('John'), 21);
  assert.equal(listed.get('Revelation'), 22);
  assert.equal(listed.get('Psalms'), 150);
});

test('the not-found document is not the homepage', () => {
  const shell = `<!DOCTYPE html><html><head>
<title>Holy Bible GPT – Free Scripture-First Bible Study</title>
<meta name="description" content="home desc">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://holybiblegpt.com/">
<meta property="og:url" content="https://holybiblegpt.com/">
<meta property="og:title" content="Holy Bible GPT – Free Scripture-First Bible Study">
</head><body><div id="root"><main>Home books</main></div></body></html>`;
  const html = notFoundDocument(shell);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<h1>Page Not Found<\/h1>/);
  assert.match(html, /Psalm 119:176/);
  assert.match(html, /<a href="\/">Return to Home<\/a>/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.doesNotMatch(html, /og:url/);
  assert.doesNotMatch(html, /Home books/);
  assert.doesNotMatch(html, /home desc/);

  const bare = notFoundDocument('<!doctype html><title>APP_SHELL</title>');
  assert.match(bare, /noindex/);
  assert.match(bare, /Page Not Found/);
  assert.doesNotMatch(bare, /APP_SHELL/);
  assert.doesNotMatch(bare, /canonical/);
});
