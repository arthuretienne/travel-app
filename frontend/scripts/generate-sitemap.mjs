// Generates dist/sitemap.xml from the single route source (routes.mjs),
// the same list the prerenderer uses, so the sitemap can never drift from
// what actually exists. Run after vite build (routes need no network).

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRoutes, SITE_URL } from './routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../dist/sitemap.xml');

const today = new Date().toISOString().slice(0, 10);

function urlEntry({ path: routePath, changefreq, priority, lastmod }) {
  const loc = `${SITE_URL}${routePath === '/' ? '/' : routePath}`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod || today}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n');
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...getRoutes().map(urlEntry),
  '</urlset>',
  '',
].join('\n');

await writeFile(OUT, xml, 'utf8');
console.log(`[sitemap] wrote ${getRoutes().length} urls to dist/sitemap.xml`);
