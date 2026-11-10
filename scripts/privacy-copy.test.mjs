import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const privacy = readFileSync(new URL('../components/PrivacyView.tsx', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the privacy policy names the real processors and drops the old claim', () => {
  for (const name of ['Puter', 'gpt-4o-mini', 'Vercel KV', 'Stripe', 'bible-api.com', 'Vercel Analytics']) {
    assert.match(privacy, new RegExp(name.replace(/[.]/g, '\\.')));
  }
  assert.doesNotMatch(privacy, /without personal identity/);
  assert.doesNotMatch(privacy, /No accounts, no data collection/);
  assert.match(privacy, /Download my data/);
  assert.match(privacy, /Delete data on this device/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
});
