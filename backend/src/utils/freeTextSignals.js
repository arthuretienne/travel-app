// backend/src/utils/freeTextSignals.js
// Extraction de signaux durs depuis le texte libre (travelVibeDescription).
// Audit V3 T9/E5 : « week-end » était ignoré (7 j par défaut) et « surtout
// pas d'avion » recevait quand même un vol dans le package.

/**
 * Parse une durée explicite dans le texte libre. Retourne un nombre de jours
 * ou null si rien d'explicite. Prudent par design : ne matche que des
 * formulations non ambiguës — au moindre doute on garde la durée du profil.
 */
export function parseDurationFromText(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();

  // "5 jours", "10 days", "3 nuits", "4 nights"
  const numMatch = t.match(/(\d{1,2})\s*(?:jours?|days?|nuits?|nights?)/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= 30) return n;
  }

  // "quinze jours" est couvert ci-dessous, avant le cas générique "semaine"
  if (/quinze\s+jours/.test(t)) return 14;
  if (/(?:deux|2)\s+semaines|two\s+weeks/.test(t)) return 14;
  if (/(?:trois|3)\s+semaines|three\s+weeks/.test(t)) return 21;
  if (/(?:une|1)\s+semaine|a\s+week|one\s+week/.test(t)) return 7;
  if (/(?:un|1)\s+mois|a\s+month|one\s+month/.test(t)) return 30;

  // "week-end", "weekend", "wk-end" — vendredi→dimanche
  if (/week[\s-]?end|wk[\s-]?end/.test(t)) return 3;

  return null;
}

/**
 * Détecte un refus explicite de l'avion (contrainte dure, audit E5).
 * On exige une formulation de refus, pas la simple mention du mot "train".
 */
export function detectsNoFly(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  const patterns = [
    /pas\s+(?:d[e']\s*)?avion/,          // "pas d'avion", "pas prendre l'avion"
    /sans\s+avion/,
    /pas\s+prendre\s+l[’' ]?avion/,
    /(?:je\s+)?refuse\s+l[’' ]?avion/,
    /no\s+(?:plane|flight|flying)/,
    /don'?t\s+(?:want\s+to\s+)?fly/,
    /uniquement\s+(?:en\s+)?(?:train|bus)/,
    /seulement\s+(?:en\s+)?(?:train|bus)/,
    /(?:only|just)\s+(?:by\s+)?(?:train|bus)/,
    /peur\s+de\s+l[’' ]?avion/,           // aviophobie = même contrainte
    /phobie\s+de\s+l[’' ]?avion/,
  ];
  return patterns.some((re) => re.test(t));
}

/**
 * Applique les signaux du texte libre au profil structuré, en place.
 * Retourne un résumé des overrides pour le logging.
 */
export function applyFreeTextSignals(userProfile) {
  const vibe = userProfile?.basic?.travelVibeDescription || '';
  const applied = {};

  const parsedDuration = parseDurationFromText(vibe);
  if (parsedDuration) {
    userProfile.availability = userProfile.availability || {};
    if (userProfile.availability.duration !== parsedDuration) {
      applied.duration = { from: userProfile.availability.duration, to: parsedDuration };
      userProfile.availability.duration = parsedDuration;
    }
  }

  const refusedTransports = userProfile?.onboardingPreferences?.refusedTransports || [];
  const noFly = detectsNoFly(vibe) ||
    refusedTransports.map((m) => String(m).toLowerCase()).some((m) => ['avion', 'plane', 'flight'].includes(m));
  if (noFly) {
    userProfile.constraints = userProfile.constraints || {};
    userProfile.constraints.noFly = true;
    applied.noFly = true;
  }

  return applied;
}
