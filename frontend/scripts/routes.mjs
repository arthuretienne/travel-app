// Single source of truth for public, prerendered + sitemapped routes.
// Consumed by prerender.mjs and generate-sitemap.mjs.
// Keep in sync with the public <Route> entries in src/App.jsx.
// RULE: only list routes that render a real public page (no 404, no auth gate).

import { DESTINATIONS, DESTINATIONS_LAST_UPDATED } from '../src/data/destinations.js';

export const SITE_URL = 'https://skusku.life';

// Static public routes. `lastmod` is ISO date; null => omit from sitemap lastmod.
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: 1.0, lastmod: null },
  { path: '/destinations', changefreq: 'weekly', priority: 0.8, lastmod: null },
  { path: '/pricing', changefreq: 'monthly', priority: 0.8, lastmod: null },
];

function destinationRoutes() {
  return DESTINATIONS.map((d) => ({
    path: `/destination/${d.slug}`,
    changefreq: 'monthly',
    priority: 0.7,
    lastmod: d.lastUpdated || DESTINATIONS_LAST_UPDATED,
  }));
}

// Full ordered list of public routes.
export function getRoutes() {
  return [...STATIC_ROUTES, ...destinationRoutes()];
}

// Just the path strings (used by the prerenderer).
export function getRoutePaths() {
  return getRoutes().map((r) => r.path);
}
