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
  assert.equal(
    config.assets.run_worker_first,
    true,
    'The Worker must run before assets so unknown URLs can 404 and /api/* is not the SPA shell',
  );

  const assetsDir = await mkdtemp(path.join(tmpdir(), 'hbgpt-assets-'));
  t.after(() => rm(assetsDir, { recursive: true, force: true }));
  await mkdir(path.join(assetsDir, 'bible', 'genesis', '1'), { recursive: true });
  await mkdir(path.join(assetsDir, 'assets'), { recursive: true });
  await writeFile(path.join(assetsDir, 'index.html'), '<!doctype html><title>APP_SHELL</title><div id="root"></div>\n');
  await writeFile(
    path.join(assetsDir, 'bible', 'genesis', '1', 'index.html'),
    '<!doctype html><title>GENESIS_1</title>\n',
  );
  await writeFile(path.join(assetsDir, 'assets', 'app.js'), 'console.log("bundle")\n');
  await writeFile(path.join(assetsDir, 'robots.txt'), 'User-agent: *\nAllow: /\n');

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
      robots: response.headers.get('x-robots-tag'),
      body: await response.text(),
    };
  }

  // No static file: these are the routes that returned HTTP 500 / error 1101.
  for (const pathname of ['/search', '/settings', '/library', '/prayer', '/about', '/privacy', '/faq', '/journal', '/bible/john/3', '/bible/revelation/22', '/bible/tobit/1']) {
    const response = await get(pathname);
    assert.equal(response.status, 200, `${pathname} should fall back to the SPA shell`);
    assert.match(response.body, /APP_SHELL/);
  }

  const prerendered = await get('/bible/genesis/1');
  assert.equal(prerendered.status, 200);
  assert.match(prerendered.body, /GENESIS_1/);
  assert.doesNotMatch(prerendered.body, /APP_SHELL/);

  function locationPath(location) {
    if (!location) return '';
    if (location.startsWith('http')) {
      const url = new URL(location);
      return `${url.pathname}${url.search}`;
    }
    return location;
  }

  const trailing = await get('/bible/genesis/1/');
  assert.equal(trailing.status, 301);
  assert.equal(locationPath(trailing.location), '/bible/genesis/1');

  const aboutSlash = await get('/about/?from=nav');
  assert.equal(aboutSlash.status, 301);
  assert.equal(locationPath(aboutSlash.location), '/about?from=nav');

  const missing = await get('/this-page-does-not-exist-xyz', {
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document',
  });
  assert.equal(missing.status, 404);
  assert.match(missing.body, /Page Not Found/);
  assert.match(missing.body, /noindex/);
  assert.doesNotMatch(missing.body, /canonical/);
  assert.doesNotMatch(missing.body, /APP_SHELL/);
  assert.equal(missing.robots, 'noindex');

  for (const pathname of ['/bible/john/999', '/bible/not-a-book', '/bible/tobit/99']) {
    const response = await get(pathname);
    assert.equal(response.status, 404, pathname);
    assert.match(response.body, /Page Not Found/);
    assert.doesNotMatch(response.body, /APP_SHELL/);
  }

  const bundle = await get('/assets/app.js');
  assert.equal(bundle.status, 200);
  assert.match(bundle.body, /bundle/);

  const robots = await get('/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(robots.body, /Allow: \//);

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

  const status = await get('/api/get-status');
  assert.equal(status.status, 401);
  assert.match(status.body, /Authentication required/);
  assert.doesNotMatch(status.body, /APP_SHELL|<!doctype html>/i);

  const billing = await get('/api/create-checkout-session');
  assert.equal(billing.status, 200);
  assert.deepEqual(JSON.parse(billing.body), {
    checkout: false,
    portal: false,
    intervals: { month: false, year: false },
    giftUrl: 'https://donate.stripe.com/3cIcN57qad0l3bA6gAcEw00',
  });

  const push = await get('/api/push-send-daily');
  assert.equal(push.status, 503);
  assert.match(push.body, /CRON_SECRET/);
  assert.doesNotMatch(push.body, /APP_SHELL|<!doctype html>/i);
});
