// Share cards quote the committed King James file and never draw an emoji.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import { VERSE_OF_THE_DAY } from '../data/verseOfTheDay.mjs';
import { BACKGROUNDS } from './shareCard/backgrounds.mjs';
import {
  CARD_FOOTER,
  curlyQuote,
  drawMark,
  FORMATS,
  paintShareCard,
  prepareQuote,
} from './shareCard/paint.mjs';
import {
  buildScripture,
  completeThought,
  passageFilename,
  sentenceContinues,
} from './shareCard/completeThought.mjs';

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u2020\u2021]/u;

const chapters = JSON.parse(readFileSync(new URL('../public/bible/kjv.json', import.meta.url), 'utf8'));
const scripture = buildScripture(chapters);

function storedVerse(book, chapter, number) {
  const row = chapters.find((entry) => entry.book === book && String(entry.chapter) === String(chapter));
  const verse = row.verses.find((entry) => entry.number === number);
  return verse.text.replace(/\s+/g, ' ').trim();
}

function relLuminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((index) => {
    const channel = parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const left = relLuminance(a);
  const right = relLuminance(b);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

function mix(hex, over, alpha) {
  const parse = (value) => [0, 2, 4].map((index) => parseInt(value.replace('#', '').slice(index, index + 2), 16));
  const fg = parse(hex);
  const bg = parse(over);
  const mixed = fg.map((channel, index) => Math.round(channel * alpha + bg[index] * (1 - alpha)));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function mockContext() {
  const texts = [];
  const fonts = [];
  const ops = [];
  let fontValue = '16px sans-serif';
  const gradient = { addColorStop() {} };
  const ctx = {
    texts,
    fonts,
    ops,
    canvas: { width: 1080, height: 1920 },
    fillStyle: '',
    strokeStyle: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineWidth: 1,
    lineCap: 'butt',
    globalAlpha: 1,
    save() { ops.push('save'); },
    restore() { ops.push('restore'); },
    scale() {},
    translate() {},
    rotate() {},
    beginPath() { ops.push('beginPath'); },
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    arcTo() {},
    ellipse() {},
    stroke() { ops.push('stroke'); },
    fill() { ops.push('fill'); },
    clip() {},
    fillRect() { ops.push('fillRect'); },
    strokeRect() { ops.push('strokeRect'); },
    clearRect() {},
    fillText(text) { texts.push(String(text)); },
    measureText(text) {
      const match = /(\d+(?:\.\d+)?)px/.exec(fontValue);
      const size = match ? Number(match[1]) : 16;
      return { width: [...String(text)].length * size * 0.46 };
    },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    drawImage() { ops.push('drawImage'); },
    getImageData() { return { data: new Uint8ClampedArray(4) }; },
    putImageData() {},
  };
  Object.defineProperty(ctx, 'font', {
    get() { return fontValue; },
    set(value) {
      fontValue = String(value);
      fonts.push(fontValue);
    },
  });
  return ctx;
}

test('Romans 8:38 continues through the stored King James text to 8:39', () => {
  const passage = completeThought(scripture, 'Romans', '8', 38);
  const verse38 = storedVerse('Romans', '8', 38);
  const verse39 = storedVerse('Romans', '8', 39);
  assert.equal(verse38.endsWith(','), true);
  assert.equal(passage.reference, 'Romans 8:38–39');
  assert.deepEqual(passage.verses.map((verse) => verse.number), [38, 39]);
  assert.equal(passage.verses[0].text, verse38);
  assert.equal(passage.verses[1].text, verse39);
  assert.equal(passage.text, `${verse38} ${verse39}`);
  assert.equal(passage.text.endsWith(','), false);
  assert.equal(passageFilename(passage.reference), 'holybiblegpt-romans-8-38-39.png');
});

test('Song of Solomon 8:1 stays the single stored verse', () => {
  const passage = completeThought(scripture, 'Song of Solomon', '8', 1);
  const stored = storedVerse('Song of Solomon', '8', 1);
  assert.equal(sentenceContinues(stored), false);
  assert.equal(passage.reference, 'Song of Solomon 8:1');
  assert.equal(passage.verses.length, 1);
  assert.equal(passage.text, stored);
  assert.match(passage.text, /^O that thou wert as my brother/);
  assert.match(passage.text, /I should not be despised\.$/);
});

test('a finished verse is not extended and a run longer than four verses is capped', () => {
  const john = completeThought(scripture, 'John', '3', 16);
  assert.equal(john.reference, 'John 3:16');
  assert.equal(john.text, storedVerse('John', '3', 16));

  const psalm = completeThought(scripture, 'Psalm', '23', 1);
  assert.equal(psalm.book, 'Psalms');
  assert.equal(psalm.text, storedVerse('Psalms', '23', 1));

  let capped = null;
  for (const chapter of scripture.ordered) {
    for (const verse of chapter.verses) {
      if (!sentenceContinues(verse.text)) continue;
      const passage = completeThought(scripture, chapter.book, chapter.chapter, verse.number);
      if (passage.verses.length === 4 && sentenceContinues(passage.verses[3].text)) {
        capped = passage;
        break;
      }
    }
    if (capped) break;
  }
  assert.ok(capped, 'expected a King James sentence longer than four verses');
  assert.equal(capped.verses.length, 4);
  for (const part of capped.verses) {
    assert.equal(part.text, storedVerse(part.book, part.chapter, part.number));
  }
  assert.equal(capped.text, capped.verses.map((part) => part.text).join(' '));
});

test('every verse of the day is extended only with the stored King James file', () => {
  for (const entry of VERSE_OF_THE_DAY) {
    const match = entry.ref.match(/^(.+)\s+(\d+):(\d+)$/);
    const passage = completeThought(scripture, match[1], match[2], Number(match[3]));
    assert.equal(passage.verses[0].text, entry.text.replace(/\s+/g, ' ').trim(), entry.ref);
    assert.equal(passage.text, passage.verses.map((verse) => verse.text).join(' '));
    for (const verse of passage.verses) {
      assert.equal(verse.text, storedVerse(verse.book, verse.chapter, verse.number));
    }
    assert.equal(sentenceContinues(passage.verses.at(-1).text) && passage.verses.length < 4, false);
  }
  const romans = VERSE_OF_THE_DAY.find((entry) => entry.ref === 'Romans 8:38');
  const extended = completeThought(scripture, 'Romans', '8', 38);
  assert.equal(extended.verses[0].text, romans.text);
  assert.equal(extended.reference, 'Romans 8:38–39');
});

test('passage text is only the stored verses, including a chapter boundary', () => {
  const sample = buildScripture([
    {
      book: 'Sample',
      chapter: '1',
      verses: [
        { number: 1, text: 'Alpha.' },
        { number: 2, text: 'Beta,' },
      ],
    },
    {
      book: 'Sample',
      chapter: '2',
      verses: [{ number: 1, text: 'gamma continues.' }],
    },
  ]);
  const passage = completeThought(sample, 'Sample', '1', 2);
  assert.equal(passage.reference, 'Sample 1:2–2:1');
  assert.equal(passage.text, 'Beta, gamma continues.');
  assert.deepEqual(passage.verses.map((verse) => verse.text), ['Beta,', 'gamma continues.']);
});

test('background fields stay readable against a white veil', () => {
  assert.ok(BACKGROUNDS.length >= 8);
  assert.ok(BACKGROUNDS.length <= 12);
  const ids = new Set(BACKGROUNDS.map((entry) => entry.id));
  assert.equal(ids.size, BACKGROUNDS.length);
  for (const theme of BACKGROUNDS) {
    const behind = mix(theme.field, '#ffffff', theme.veil);
    assert.ok(contrast(theme.ink, behind) >= 4.5, `${theme.id} verse`);
    assert.ok(contrast(theme.reference, behind) >= 4.5, `${theme.id} reference`);
    assert.ok(contrast(theme.muted, behind) >= 4.5, `${theme.id} footer`);
    assert.equal(typeof theme.paint, 'function');
  }
});

test('every share-card paint path draws text and a stroked mark, never an emoji or an image', () => {
  const romans = completeThought(scripture, 'Romans', '8', 38);
  const song = completeThought(scripture, 'Song of Solomon', '8', 1);
  const short = completeThought(scripture, 'John', '11', 35);
  const long = completeThought(scripture, 'Hebrews', '4', 12);
  const quotes = [
    { quote: romans.text, reference: `${romans.reference} KJV`, label: 'Verse of the Day', truncate: false },
    { quote: song.text, reference: `${song.reference} KJV`, label: '', truncate: false },
    { quote: short.text, reference: `${short.reference} KJV`, label: '', truncate: false },
    { quote: long.text, reference: `${long.reference} KJV`, label: '', truncate: false },
    { quote: 'A study note that is not a verse.', reference: 'Study note', label: '', truncate: true },
  ];

  for (const theme of BACKGROUNDS) {
    for (const format of Object.keys(FORMATS)) {
      for (const quote of quotes) {
        const ctx = mockContext();
        const drawn = paintShareCard(ctx, { ...quote, format, backgroundId: theme.id });
        const blob = ctx.texts.join('');
        assert.equal(EMOJI.test(blob), false, `${theme.id} ${format}`);
        assert.equal(ctx.ops.includes('drawImage'), false);
        assert.equal(drawn.footer, CARD_FOOTER);
        assert.equal(ctx.texts.filter((text) => text === CARD_FOOTER).length, 1);
        assert.equal(blob.includes('Holy Bible GPT'), false);
        assert.equal(drawn.lines.join(' '), curlyQuote(prepareQuote(quote.quote, { truncate: quote.truncate }).replace(/^“|”$/g, '')));
        for (const font of ctx.fonts) {
          assert.match(font, /Crimson Pro|Inter/);
          assert.doesNotMatch(font, /emoji|Apple Color/i);
        }
        if (!quote.truncate) {
          for (const word of quote.quote.split(' ')) assert.equal(blob.includes(word), true, word);
          assert.equal(blob.includes('…'), false);
        }
        const quoteBlob = drawn.lines.join(' ');
        if (quote.reference === 'Romans 8:38–39 KJV') {
          assert.equal(blob.includes('Romans 8:38–39 KJV'), true);
          assert.equal(quoteBlob.includes(romans.verses[1].text.slice(0, 24)), true);
          assert.equal(quoteBlob.includes('8:38–39'), false);
        }
        if (quote.reference === 'Song of Solomon 8:1 KJV') {
          assert.equal(blob.includes('Song of Solomon 8:1 KJV'), true);
          assert.equal(quoteBlob.includes('O that thou wert as my brother'), true);
        }
      }
    }
  }

  const mark = mockContext();
  drawMark(mark, 0, 0, 24, '#4a3b2a');
  assert.equal(mark.texts.length, 0);
  assert.ok(mark.ops.includes('stroke'));
  assert.equal(mark.ops.includes('drawImage'), false);
});

test('share card sources do not draw the cross emoji or the old logo image', () => {
  const files = [
    'services/shareCard/paint.mjs',
    'services/shareCard/backgrounds.mjs',
    'services/shareCard/completeThought.mjs',
    'services/shareCard/render.ts',
    'services/shareCard/fonts.ts',
    'services/shareCard/resolvePassage.ts',
    'components/ShareCardSheet.tsx',
    'components/ShareCardDialog.tsx',
  ];
  for (const file of files) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.equal(EMOJI.test(source), false, file);
    assert.equal(source.includes('android-chrome'), false, file);
    assert.equal(source.includes('drawImage'), false, file);
    assert.equal(source.includes('bible-api.com'), false, file);
  }
  assert.equal(existsSync(new URL('../services/shareImageService.ts', import.meta.url)), false);
  const dialog = readFileSync(new URL('../components/ShareCardDialog.tsx', import.meta.url), 'utf8');
  assert.match(dialog, /import\(\s*['"]\.\/ShareCardSheet['"]\s*\)/);
  for (const file of ['components/HomeView.tsx', 'components/BibleReader.tsx', 'components/MessageBubble.tsx']) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(source, /ShareCardDialog/);
    assert.doesNotMatch(source, /shareImageService|generateShareCard|generateStoryCard/);
    assert.doesNotMatch(source, /fillText\(/);
  }
  const resolver = readFileSync(new URL('../services/shareCard/resolvePassage.ts', import.meta.url), 'utf8');
  assert.match(resolver, /\/bible\/kjv\.json/);
});
