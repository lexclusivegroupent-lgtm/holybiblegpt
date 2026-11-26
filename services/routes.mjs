// Shared by the React app and the Cloudflare Worker. Chapter counts for the
// 66-book canon come from scripts/books.json (the same file prerender uses).
// Historical books match services/bibleService.ts HISTORICAL_BOOKS.
import books from '../scripts/books.json' with { type: 'json' };

export const TAB_ROUTES = {
  home: '/',
  about: '/about',
  faq: '/faq',
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
  search: '/search',
  library: '/library',
  prayer: '/prayer',
  settings: '/settings',
  learn: '/learn',
  references: '/references',
  harmony: '/harmony',
  kids: '/kids',
  faith: '/faith',
  disclaimer: '/disclaimer',
  translations: '/translations',
  guidelines: '/guidelines',
  instructions: '/instructions',
  changelog: '/changelog',
  groups: '/groups',
  theology: '/theology',
  notes: '/notes',
  support: '/support',
  methodology: '/methodology',
  limitations: '/limitations',
  copyrights: '/copyrights',
  corrections: '/corrections',
  journal: '/journal',
};

const HISTORICAL_BOOKS = [
  { name: 'Tobit', chapters: 14 },
  { name: 'Judith', chapters: 16 },
  { name: 'Wisdom', chapters: 19 },
  { name: 'Sirach', chapters: 51 },
  { name: 'Baruch', chapters: 6 },
  { name: '1 Maccabees', chapters: 16 },
  { name: '2 Maccabees', chapters: 15 },
];

const BOOKS_BY_SLUG = new Map();
for (const book of [...books, ...HISTORICAL_BOOKS]) {
  BOOKS_BY_SLUG.set(bookToSlug(book.name), book);
}

const APP_PATHS = new Set(Object.values(TAB_ROUTES));

export function bookToSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function bookPath(name) {
  return `/bible/${bookToSlug(name)}`;
}

export function chapterPath(name, chapter) {
  return `/bible/${bookToSlug(name)}/${chapter}`;
}

export function listBooks() {
  return [...BOOKS_BY_SLUG.values()].map((book) => ({ name: book.name, chapters: book.chapters }));
}

export function normalizePathname(pathname) {
  const path = pathname && pathname.startsWith('/') ? pathname : `/${pathname || ''}`;
  if (path.length > 1 && path.endsWith('/')) return path.replace(/\/+$/, '') || '/';
  return path;
}

// Files the asset layer should serve as-is: hashed bundles, icons, journal
// images, and anything whose last segment has an extension (robots.txt,
// sitemap.xml, sw.js, kjv.json). A trailing slash is not an asset; it is
// normalized first.
export function isStaticAssetPath(pathname) {
  if (/^\/(assets|icons|journal)\//.test(pathname)) return true;
  if (pathname.endsWith('/')) return false;
  const last = pathname.split('/').pop() || '';
  return last.includes('.');
}

// Valid /bible/:book and /bible/:book/:chapter. Chapter numbers are canonical
// (no leading zero) and inside that book's chapter count.
export function parseBiblePath(pathname) {
  const path = normalizePathname(pathname);
  const chapter = path.match(/^\/bible\/([^/]+)\/([1-9]\d*)$/);
  if (chapter) {
    const book = BOOKS_BY_SLUG.get(chapter[1]);
    const n = Number(chapter[2]);
    if (!book || n < 1 || n > book.chapters) return null;
    return { name: book.name, chapter: String(n) };
  }
  const only = path.match(/^\/bible\/([^/]+)$/);
  if (only) {
    const book = BOOKS_BY_SLUG.get(only[1]);
    if (!book) return null;
    return { name: book.name, chapter: '' };
  }
  return null;
}

export function isKnownAppPath(pathname) {
  const path = normalizePathname(pathname);
  if (APP_PATHS.has(path)) return true;
  if (path.startsWith('/bible/')) return parseBiblePath(path) !== null;
  return false;
}

// Asset paths pass through. A trailing slash on any other path is a permanent
// redirect to the slashless URL. Known app and Bible paths are served (a
// prerendered file, or the SPA shell when the route has no file). Everything
// else is a real 404.
export function resolveDocumentRequest(pathname, search = '') {
  if (isStaticAssetPath(pathname)) return { type: 'asset' };
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const bare = pathname.replace(/\/+$/, '') || '/';
    const query = search && !search.startsWith('?') ? `?${search}` : (search || '');
    return { type: 'redirect', location: `${bare}${query}` };
  }
  if (isKnownAppPath(pathname)) return { type: 'app' };
  return { type: 'not-found' };
}
