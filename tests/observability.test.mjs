import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { cloudflareSentryOptions, sentryDsnFrom } from '../src/sentryConfig.ts';

function stripJsonc(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

test('Workers Logs and traces are enabled in wrangler.jsonc', async () => {
  const raw = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const config = JSON.parse(stripJsonc(raw));
  assert.equal(config.observability.enabled, true);
  assert.equal(config.observability.logs.enabled, true);
  assert.equal(config.observability.logs.head_sampling_rate, 1);
  assert.equal(config.observability.traces.enabled, true);
  assert.equal(config.observability.traces.head_sampling_rate, 0.01);
  assert.equal(config.vars?.SENTRY_DSN, undefined);
  assert.equal(raw.includes('ingest.sentry.io'), false);
});

test('Sentry stays disabled until a DSN is provided', () => {
  assert.equal(sentryDsnFrom(undefined), undefined);
  assert.equal(sentryDsnFrom(''), undefined);
  assert.equal(sentryDsnFrom('   '), undefined);
  assert.equal(sentryDsnFrom(123), undefined);
  const options = cloudflareSentryOptions(undefined);
  assert.equal(options.dsn, undefined);
  assert.equal(options.tracesSampleRate, undefined);
  assert.equal(options.dataCollection.httpHeaders, false);
  assert.deepEqual(options.dataCollection.httpBodies, []);

  const enabled = cloudflareSentryOptions(' https://public@example.ingest.sentry.io/1 ');
  assert.equal(enabled.dsn, 'https://public@example.ingest.sentry.io/1');
  assert.equal(enabled.tracesSampleRate, 0.05);
});

async function sourceFiles(dir, found = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'tests' || entry.name === '.wrangler') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await sourceFiles(full, found);
    else if (/\.(ts|tsx|js|mjs|jsonc|html|md|example)$/.test(entry.name)) found.push(full);
  }
  return found;
}

test('no Sentry DSN is hardcoded in the repo', async () => {
  const files = await sourceFiles(path.resolve('.'));
  const offenders = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    if (/ingest\.sentry\.io/.test(text) || /https:\/\/[a-z0-9]+@o\d+\.ingest\.sentry\.io/i.test(text)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});
