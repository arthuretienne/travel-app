// Postbuild prerenderer: turns the SPA in dist/ into real static HTML per
// public route, so crawlers (Googlebot, GPTBot, ClaudeBot, PerplexityBot…)
// receive content + meta + JSON-LD without executing JS.
//
// Strategy: serve dist/ with a tiny static server, drive a headless Chromium
// over each route, wait for the [data-prerender-ready] marker, snapshot
// document.documentElement.outerHTML, then write dist/<route>/index.html.
//
// French is forced via ?lang=fr (i18n detection order starts with
// querystring) so prerendered HTML is the FR-indexable variant (v1 scope).

import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { getRoutePaths } from './routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const HOST = '127.0.0.1';
const READY_SELECTOR = '[data-prerender-ready]';
const READY_TIMEOUT_MS = 20000;
const CONCURRENCY = 4;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

function startStaticServer() {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('dist/index.html missing — run `vite build` first.');
  }
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const candidate = path.join(DIST, urlPath);
    // Serve a real file when it exists and stays inside dist/.
    if (
      candidate.startsWith(DIST) &&
      existsSync(candidate) &&
      statSync(candidate).isFile()
    ) {
      res.setHeader('Content-Type', MIME[path.extname(candidate)] || 'application/octet-stream');
      createReadStream(candidate).pipe(res);
      return;
    }
    // SPA fallback: every unknown route gets the built shell so the client
    // router can render it. (Outputs are written only after all snapshots,
    // so the server never serves a half-prerendered file.)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    createReadStream(path.join(DIST, 'index.html')).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, HOST, () => resolve(server));
  });
}

function outputFileFor(routePath) {
  const clean = routePath.replace(/\/+$/, '');
  if (clean === '' || clean === '/') return path.join(DIST, 'index.html');
  return path.join(DIST, clean, 'index.html');
}

async function snapshotRoute(browser, baseUrl, routePath) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; SkuskuPrerender/1.0; +https://skusku.life)'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9' });

    // Block cross-origin requests (Clerk FAPI, Google Fonts, Pexels images).
    // Same-origin assets still load; Clerk simply stays unloaded so the
    // public content (which is outside <SignedIn>/<SignedOut>) renders fully
    // without networkidle hangs.
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      try {
        const u = new URL(r.url());
        if (u.hostname === HOST) r.continue();
        else r.abort();
      } catch {
        r.abort();
      }
    });

    const sep = routePath.includes('?') ? '&' : '?';
    const url = `${baseUrl}${routePath}${sep}lang=fr`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: READY_TIMEOUT_MS });
    await page.waitForSelector(READY_SELECTOR, { timeout: READY_TIMEOUT_MS });

    const html = await page.evaluate(
      () => '<!doctype html>\n' + document.documentElement.outerHTML
    );
    return html;
  } finally {
    await page.close();
  }
}

async function run() {
  const server = await startStaticServer();
  const { port } = server.address();
  const baseUrl = `http://${HOST}:${port}`;
  const routes = getRoutePaths();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--lang=fr-FR'],
  });

  const results = new Map();
  const failures = [];
  let cursor = 0;

  async function worker() {
    while (cursor < routes.length) {
      const routePath = routes[cursor++];
      try {
        const html = await snapshotRoute(browser, baseUrl, routePath);
        results.set(routePath, html);
        process.stdout.write(`  ✓ ${routePath}\n`);
      } catch (err) {
        failures.push({ routePath, message: err?.message || String(err) });
        process.stdout.write(`  ✗ ${routePath} — ${err?.message || err}\n`);
      }
    }
  }

  console.log(`[prerender] ${routes.length} routes, concurrency ${CONCURRENCY}`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await browser.close();
  server.close();

  if (failures.length) {
    console.error(`\n[prerender] FAILED: ${failures.length}/${routes.length} routes did not render.`);
    for (const f of failures) console.error(`  - ${f.routePath}: ${f.message}`);
    process.exit(1);
  }

  for (const [routePath, html] of results) {
    const file = outputFileFor(routePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, html, 'utf8');
  }

  console.log(`\n[prerender] wrote ${results.size} static HTML files to dist/`);
}

run().catch((err) => {
  console.error('[prerender] fatal:', err);
  process.exit(1);
});
