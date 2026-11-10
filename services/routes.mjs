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
};

export function bookToSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function bookPath(name) {
  return `/bible/${bookToSlug(name)}`;
}

export function chapterPath(name, chapter) {
  return `/bible/${bookToSlug(name)}/${chapter}`;
}
