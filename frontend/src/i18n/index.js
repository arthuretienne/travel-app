// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './fr.json';
import en from './en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr', // Default to French
    // Strip region tags so `en-GB`, `en-US`, `fr-CA`, etc. all resolve to the
    // base language. Without this, navigator.language === 'en-GB' was being
    // cached verbatim and missed the `en` resource bundle.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    supportedLngs: ['fr', 'en'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // localStorage first so an explicit user choice (LanguageSwitcher)
      // always wins over the browser locale on the next visit.
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
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
