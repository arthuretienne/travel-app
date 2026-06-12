// frontend/src/utils/format.js
// LE formateur devise/date du produit. Un seul format partout : « 1 136 € »,
// jamais « €1,136 » / « €60.00 » / « €6.99/month » (audit V3 : 4 formats
// différents pour la même devise selon l'écran).

const eurFormatters = new Map();

export function formatEUR(value, { decimals = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '— €';
  if (!eurFormatters.has(decimals)) {
    eurFormatters.set(decimals, new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }));
  }
  return eurFormatters.get(decimals).format(n);
}

// « 14 juillet 2026 »
export function formatDateFR(date, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', options).format(d);
}

// « 14 juil. 2026, 17:50 » — pour les timestamps (fini les ISO bruts)
export function formatDateTimeFR(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

// « 17:50 » — horaires de vol
export function formatTimeFR(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d);
}
