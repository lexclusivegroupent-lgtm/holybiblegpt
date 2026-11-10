import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const privacy = readFileSync(new URL('../components/PrivacyView.tsx', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(tsx|ts|mjs|html|md|txt|jsonc)$/.test(name)) out.push(path);
  }
  return out;
}

test('the privacy policy names the real processors and drops the old claim', () => {
  for (const name of ['Puter', 'gpt-4o-mini', 'Vercel KV', 'Stripe', 'bible-api.com', 'Vercel Analytics']) {
    assert.match(privacy, new RegExp(name.replace(/[.]/g, '\\.')));
  }
  assert.doesNotMatch(privacy, /without personal identity/);
  assert.doesNotMatch(privacy, /No accounts, no data collection/);
  assert.match(privacy, /Download my data/);
  assert.match(privacy, /Delete data on this device/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.match(privacy, /The Christian's Deck/);
  assert.match(privacy, /thechristiansdeck@gmail\.com/);
  assert.match(privacy, /Puter Technologies Inc\./);
  assert.match(privacy, /basis of consent/);
  assert.match(privacy, /basis of contract/);
  assert.match(privacy, /Integritetsskyddsmyndigheten \(IMY\)/);
  assert.match(privacy, /imy\.se/);
  assert.doesNotMatch(privacy, /\[Owner/);
  assert.doesNotMatch(privacy, new RegExp(otherEmail().replace(/[.]/g, '\\.')));
  assert.doesNotMatch(privacy, /Miami|Växjö/);
});

function otherEmail() {
  return ['lexclusive', 'groupent', '@gmail.com'].join('');
}

test('trust pages have no owner placeholders and the other email is absent', () => {
  const files = sourceFiles(root).filter((file) => !file.endsWith('privacy-copy.test.mjs'));
  const banned = new RegExp(`${otherEmail().replace(/[.]/g, '\\.')}|\\[Owner`);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, banned, file);
  }
  for (const name of ['CopyrightView.tsx', 'CorrectionsView.tsx', 'LimitationsView.tsx', 'MethodologyView.tsx', 'TranslationNoteView.tsx']) {
    const text = readFileSync(new URL(`../components/${name}`, import.meta.url), 'utf8');
    assert.match(text, /By The Christian's Deck/);
  }
});
