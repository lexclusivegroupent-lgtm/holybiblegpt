/**
 * Reproduction and regression test for the Worker asset 500s.
 *
 * Production (before this fix), probed 2026-11-10 against holybiblegpt.com
 * which runs main fc29e0f. Requests without `Sec-Fetch-Mode: navigate`
 * returned Cloudflare error 1101 on routes that are not uploaded files.
 * The same URLs with the navigate header returned 200, because
 * compatibility_date 2026-08-18 serves the SPA shell for navigations
 * without calling the Worker.
 *
 *   curl -sI https://holybiblegpt.com/search
 *   curl -sI -H 'Sec-Fetch-Mode: navigate' https://holybiblegpt.com/search
 *   curl -sI https://holybiblegpt.com/bible/john/3
 *   curl -sI https://holybiblegpt.com/bible/genesis/1
 *
 * Local cause, confirmed with `wrangler dev` / unstable_dev against the
 * config from 73cd302 (2026-08-18): src/worker.ts calls env.ASSETS.fetch,
 * but wrangler.jsonc had no assets.binding, so the call threw
 * `TypeError: Cannot read properties of undefined (reading 'fetch')`.
 *
 * This test boots that Worker with the repository wrangler.jsonc and a
 * tiny asset directory. It fails if the binding or the SPA fallback is
 * removed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { unstable_dev } from 'wrangler';

function stripJsonc(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

test('Worker serves chapter pages, SPA routes, and /api/esv', { timeout: 60_000 }, async (t) => {
  const raw = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const config = JSON.parse(stripJsonc(raw));
  assert.equal(config.main, 'src/worker.ts');
  assert.equal(config.assets.binding, 'ASSETS', 'src/worker.ts calls env.ASSETS.fetch');
  assert.equal(config.assets.not_found_handling, 'single-page-application');
  assert.ok(
    Array.isArray(config.assets.run_worker_first) && config.assets.run_worker_first.includes('/api/*'),
    'API routes must run the Worker before the SPA fallback',
  );

  const assetsDir = await mkdtemp(path.join(tmpdir(), 'hbgpt-assets-'));
  t.after(() => rm(assetsDir, { recursive: true, force: true }));
  await mkdir(path.join(assetsDir, 'bible', 'genesis', '1'), { recursive: true });
  await writeFile(path.join(assetsDir, 'index.html'), '<!doctype html><title>APP_SHELL</title>\n');
  await writeFile(
    path.join(assetsDir, 'bible', 'genesis', '1', 'index.html'),
    '<!doctype html><title>GENESIS_1</title>\n',
  );

  const port = 18000 + (process.pid % 2000);
  const worker = await unstable_dev(path.resolve('src/worker.ts'), {
    config: path.resolve('wrangler.jsonc'),
    assets: assetsDir,
    logLevel: 'error',
    local: true,
    ip: '127.0.0.1',
    port,
    experimental: { disableExperimentalWarning: true, disableDevRegistry: true },
  });
  t.after(() => worker.stop());

  async function get(pathname, headers) {
    const response = await worker.fetch(`http://127.0.0.1:${port}${pathname}`, {
      headers,
      redirect: 'manual',
    });
    return {
      status: response.status,
      location: response.headers.get('location'),
      body: await response.text(),
    };
  }

  // No static file: these are the routes that returned HTTP 500 / error 1101.
  for (const pathname of ['/search', '/settings', '/library', '/prayer', '/bible/john/3', '/bible/revelation/22']) {
    const response = await get(pathname);
    assert.equal(response.status, 200, `${pathname} should fall back to the SPA shell`);
    assert.match(response.body, /APP_SHELL/);
  }

  const prerendered = await get('/bible/genesis/1');
  assert.equal(prerendered.status, 200);
  assert.match(prerendered.body, /GENESIS_1/);
  assert.doesNotMatch(prerendered.body, /APP_SHELL/);

  const trailing = await get('/bible/genesis/1/');
  assert.ok(trailing.status === 307 || trailing.status === 308);
  assert.equal(trailing.location, '/bible/genesis/1');

  const navigate = await get('/bible/john/3', {
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document',
  });
  assert.equal(navigate.status, 200);
  assert.match(navigate.body, /APP_SHELL/);

  for (const headers of [undefined, { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' }]) {
    const api = await get('/api/esv', headers);
    assert.equal(api.status, 503, 'ESV proxy stays on the Worker when the key is unset');
    assert.match(api.body, /ESV_API_KEY/);
    assert.doesNotMatch(api.body, /APP_SHELL|<!doctype html>/i);
  }
});
