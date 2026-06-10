// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './fr.json';
import en from './en.json';

// LAUNCH DECISION (2026-06): FR-only. The core pages (Results, TripDetail,
// Pricing) are hardcoded French, so auto-detecting EN gave English visitors a
// broken half-translated experience after the first search. We force French
// and hide the Landing switcher; EN resources stay bundled so re-enabling is
// just restoring the LanguageDetector setup below once the core pages use t().
//
// To re-enable EN:
//   import LanguageDetector from 'i18next-browser-languagedetector';
//   i18n.use(LanguageDetector)..., remove `lng: 'fr'`, and restore:
//   detection: {
//     order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
//     lookupQuerystring: 'lang',
//     caches: ['localStorage'],
//   },
i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: 'fr',
    fallbackLng: 'fr',
    // Strip region tags so `en-GB`, `en-US`, `fr-CA`, etc. all resolve to the
    // base language.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    supportedLngs: ['fr', 'en'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

// Keep <html lang="…"> in sync with the resolved language so SEO crawlers,
// screen readers and CSS :lang() selectors see a consistent value.
function syncHtmlLang(lng) {
  if (typeof document !== 'undefined' && lng) {
    document.documentElement.lang = lng.split('-')[0];
  }
}
syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
