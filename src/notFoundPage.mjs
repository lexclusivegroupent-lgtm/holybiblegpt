// HTML for unknown routes. Status is set by the caller (404). The document
// carries noindex and does not point a canonical at the homepage.

const TITLE = 'Page Not Found – Holy Bible GPT';
const DESCRIPTION = 'That page is not on Holy Bible GPT.';

const BODY = `<main style="max-width:36rem;margin:4rem auto;padding:1.5rem;text-align:center">
<h1>Page Not Found</h1>
<p>Lost in the wilderness</p>
<p>"I have gone astray like a lost sheep; seek thy servant; for I do not forget thy commandments." — Psalm 119:176</p>
<p><a href="/">Return to Home</a></p>
</main>`;

function standalone() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<meta name="robots" content="noindex">
</head>
<body>
${BODY}
</body>
</html>
`;
}

function replaceOnce(html, pattern, value) {
  if (!pattern.test(html)) return html;
  return html.replace(pattern, value);
}

function replaceRoot(html, inner) {
  const open = '<div id="root">';
  const start = html.indexOf(open);
  if (start < 0) return null;
  let i = start + open.length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose < 0) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        return `${html.slice(0, start)}<div id="root">${inner}</div>${html.slice(nextClose + 6)}`;
      }
      i = nextClose + 6;
    }
  }
  return null;
}

export function notFoundDocument(shell) {
  if (!shell || !shell.includes('<div id="root">')) return standalone();
  let html = replaceRoot(shell, BODY);
  if (!html) return standalone();
  html = replaceOnce(html, /<title>.*?<\/title>/, `<title>${TITLE}</title>`);
  html = replaceOnce(html, /(<meta name="description" content=")[^"]*(")/, `$1${DESCRIPTION}$2`);
  html = replaceOnce(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${TITLE}$2`);
  html = replaceOnce(html, /(<meta property="og:description" content=")[^"]*(")/, `$1${DESCRIPTION}$2`);
  html = replaceOnce(html, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${TITLE}$2`);
  html = replaceOnce(html, /(<meta name="twitter:description" content=")[^"]*(")/, `$1${DESCRIPTION}$2`);
  if (html.includes('<meta name="robots"')) {
    html = html.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex">');
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', '<meta name="robots" content="noindex">\n</head>');
  } else {
    html = `<meta name="robots" content="noindex">\n${html}`;
  }
  html = html.replace(/[ \t]*<link rel="canonical" href="[^"]*">\n?/, '');
  html = html.replace(/[ \t]*<meta property="og:url" content="[^"]*">\n?/, '');
  return html;
}
