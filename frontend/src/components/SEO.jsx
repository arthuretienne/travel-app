// frontend/src/components/SEO.jsx
// Lightweight SEO component — updates document head without external deps.
// Works with the build-time prerenderer (scripts/prerender.mjs): the effect
// runs during the headless render and the resulting <head> is frozen into
// static HTML. Do NOT migrate to react-helmet — the prerenderer relies on
// this synchronous-on-mount DOM mutation.
import { useEffect } from 'react';

const SITE_URL = 'https://skusku.life';

function buildBreadcrumbList(breadcrumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      ...(b.path ? { item: `${SITE_URL}${b.path}` } : {}),
    })),
  };
}

export default function SEO({
  title,
  description,
  canonical,
  ogImage,
  schema,
  breadcrumbs,
  noindex = false,
}) {
  useEffect(() => {
    if (title) document.title = title;

    const metas = {
      description,
      'og:title': title,
      'og:description': description,
      'og:url': canonical,
      'og:image': ogImage,
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': ogImage,
    };

    Object.entries(metas).forEach(([key, value]) => {
      if (!value) return;
      const isOg = key.startsWith('og:') || key.startsWith('twitter:');
      const attr = isOg ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    });

    // Robots: explicit per-page. App pages pass noindex; public pages stay
    // indexable. Keep `follow` so internal links still pass equity.
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', noindex ? 'noindex,follow' : 'index,follow');

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // Structured data: accept a single object or an array, plus an optional
    // auto-generated BreadcrumbList. Each schema gets its own <script> so
    // crawlers parse them independently. All SEO-managed scripts are tagged
    // with data-seo-ld and fully replaced on every navigation.
    const schemas = [];
    if (Array.isArray(schema)) schemas.push(...schema.filter(Boolean));
    else if (schema) schemas.push(schema);
    if (breadcrumbs?.length) schemas.push(buildBreadcrumbList(breadcrumbs));

    document
      .querySelectorAll('script[data-seo-ld]')
      .forEach((node) => node.remove());

    schemas.forEach((s, i) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-ld', String(i));
      script.textContent = JSON.stringify(s);
      document.head.appendChild(script);
    });
  }, [title, description, canonical, ogImage, schema, breadcrumbs, noindex]);

  return null;
}
