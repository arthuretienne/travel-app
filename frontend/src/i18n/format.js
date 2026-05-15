import { useTranslation } from 'react-i18next';

const toLocale = (lng) => (lng?.startsWith('fr') ? 'fr-FR' : 'en-US');

// Locale-aware date & currency formatting bound to the active i18n language.
// Returns memo-free helpers — cheap enough to recreate per render, and they
// re-run when the language changes because useTranslation re-renders.
export function useFormat() {
  const { i18n } = useTranslation();
  const locale = toLocale(i18n.language);

  const fmtDate = (value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale, opts).format(d);
  };

  const fmtCurrency = (value, currency = 'EUR') =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  return { locale, fmtDate, fmtCurrency };
}
