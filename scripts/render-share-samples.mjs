// Renders share-card samples with headless Chrome.
// Verse text is read from public/bible/kjv.json. Fonts are the bundled OFL files.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScripture, completeThought } from '../services/shareCard/completeThought.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const sampleHtml = join(tmpdir(), 'holybiblegpt-share-sample.html');
const outDir = process.env.SHARE_CARD_OUT || '/opt/cursor/artifacts/share-cards';
const chapters = JSON.parse(readFileSync(join(root, 'public/bible/kjv.json'), 'utf8'));
const scripture = buildScripture(chapters);

function passage(book, chapter, verse) {
  const result = completeThought(scripture, book, chapter, verse);
  if (!result) throw new Error(`Missing ${book} ${chapter}:${verse}`);
  return result;
}

const romans = passage('Romans', '8', 38);
const song = passage('Song of Solomon', '8', 1);
const shortVerse = passage('John', '11', 35);
const longVerse = passage('Hebrews', '4', 12);

const samples = [
  { file: 'romans-8-38-39-story-dawn.png', format: 'story', backgroundId: 'dawn', label: 'Verse of the Day', passage: romans },
  { file: 'romans-8-38-39-square-navy.png', format: 'square', backgroundId: 'navy-gold', label: 'Verse of the Day', passage: romans },
  { file: 'song-8-1-story-linen.png', format: 'story', backgroundId: 'linen', label: '', passage: song },
  { file: 'song-8-1-square-bokeh.png', format: 'square', backgroundId: 'bokeh', label: '', passage: song },
  { file: 'john-11-35-story-blossom.png', format: 'story', backgroundId: 'blossom', label: '', passage: shortVerse },
  { file: 'john-11-35-square-mist.png', format: 'square', backgroundId: 'mist', label: '', passage: shortVerse },
  { file: 'hebrews-4-12-story-candle.png', format: 'story', backgroundId: 'candle', label: '', passage: longVerse },
  { file: 'hebrews-4-12-square-parchment.png', format: 'square', backgroundId: 'parchment', label: '', passage: longVerse },
];

const types = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/sample.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(readFileSync(sampleHtml));
        return;
      }
      const relative = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
      if (relative.startsWith('..')) {
        res.writeHead(403);
        res.end();
        return;
      }
      const file = join(root, relative);
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const body = readFileSync(file);
        res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function page(spec) {
  return `<!doctype html>
<meta charset="utf-8">
<pre id="png"></pre>
<script id="spec" type="application/json">${JSON.stringify(spec).replace(/</g, '\\u003c')}</script>
<script type="module">
import { paintShareCard, FORMATS } from '/services/shareCard/paint.mjs';
const faces = [
  ['Crimson Pro', '/node_modules/@fontsource/crimson-pro/files/crimson-pro-latin-400-italic.woff2', { style: 'italic', weight: '400' }],
  ['Inter', '/node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2', { style: 'normal', weight: '400' }],
  ['Inter', '/node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2', { style: 'normal', weight: '500' }],
];
for (const [family, url, options] of faces) {
  const face = new FontFace(family, 'url(' + url + ')', options);
  document.fonts.add(await face.load());
}
await document.fonts.load('italic 64px "Crimson Pro"');
await document.fonts.load('500 28px Inter');
if (!document.fonts.check('italic 64px "Crimson Pro"') || !document.fonts.check('500 28px Inter')) {
  document.getElementById('png').textContent = 'FONT_MISSING';
  throw new Error('font');
}
const spec = JSON.parse(document.getElementById('spec').textContent);
const format = FORMATS[spec.format];
const canvas = document.createElement('canvas');
canvas.width = format.width;
canvas.height = format.height;
paintShareCard(canvas.getContext('2d'), spec);
document.getElementById('png').textContent = canvas.toDataURL('image/png');
</script>`;
}

function dump(url) {
  return new Promise((resolve, reject) => {
    const chrome = spawn('/usr/bin/google-chrome-stable', [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--user-data-dir=/tmp/holybiblegpt-chrome-share',
      '--virtual-time-budget=20000',
      '--timeout=20000',
      '--dump-dom',
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    chrome.stdout.on('data', (chunk) => { out += chunk; });
    chrome.stderr.on('data', (chunk) => { err += chunk; });
    chrome.on('close', (code) => {
      const match = out.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/);
      if (!match) {
        reject(new Error(`chrome ${code}\n${err.slice(-500)}\n${out.slice(0, 400)}`));
        return;
      }
      resolve(Buffer.from(match[0].slice('data:image/png;base64,'.length), 'base64'));
    });
  });
}

const server = await startServer();
const { port } = server.address();
mkdirSync(outDir, { recursive: true });
try {
  for (const sample of samples) {
    const spec = {
      format: sample.format,
      backgroundId: sample.backgroundId,
      label: sample.label,
      quote: sample.passage.text,
      reference: `${sample.passage.reference} KJV`,
      truncate: false,
    };
    writeFileSync(sampleHtml, page(spec));
    const png = await dump(`http://127.0.0.1:${port}/sample.html`);
    const dest = join(outDir, sample.file);
    writeFileSync(dest, png);
    console.log(`${sample.file} ${png.length} ${sample.passage.reference}`);
  }
} finally {
  server.close();
}
