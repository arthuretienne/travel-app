// frontend/src/components/SEO.jsx
// Lightweight SEO component — updates document head without external deps
import { useEffect } from 'react';

export default function SEO({ title, description, canonical, ogImage, schema }) {
  useEffect(() => {
    // Title
    if (title) {
      document.title = title;
    }

    // Meta tags
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

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // Structured data
    if (schema) {
      const id = 'seo-schema-ld';
      let script = document.getElementById(id);
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    }
  }, [title, description, canonical, ogImage, schema]);

  return null;
}
