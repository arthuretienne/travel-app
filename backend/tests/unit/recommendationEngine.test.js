// Tests unitaires de la couche scoring déterministe (Étape 3 du brief).
// Fonctions PURES, zéro appel réseau, zéro LLM, zéro Supabase.
import { describe, it, expect } from 'vitest';
import {
  computeContextualScore,
  passesHardConstraints,
  applyCountryDiversity,
} from '../../src/services/recommendationEngine.js';

// Destination de référence : pas chère, sûre, météo + affluence idéales en juillet (mois 7).
function makeDest(overrides = {}) {
  return {
    city: 'Split',
    country: 'Croatie',
    avg_flight_price_eur: 120,
    avg_hotel_price_eur: 80, // par nuit, par chambre
    safety_index: 8,
    trip_types: ['couple', 'friends'],
    monthly_weather_score: Array(12).fill(9), // idéal toute l'année
    monthly_crowd_score: Array(12).fill(9), // peu de monde toute l'année
    similarity: 0.8,
    ...overrides,
  };
}

const baseParams = {
  budget: 2000,
  numTravelers: 2,
  numNights: 5,
  tripType: 'couple',
  departureMonth: 7,
  minSafety: 6,
  excludedDestinations: [],
};

describe('computeContextualScore', () => {
  it('attribue un score élevé quand tout est favorable (météo, budget, affluence, type)', () => {
    const { score, reasons } = computeContextualScore(makeDest(), baseParams);
    // météo 25 + budget 30 + affluence 20 + type 15 + originalité 10 = 100
    expect(score).toBeGreaterThanOrEqual(95);
    expect(reasons).toContain('Idéale pour les couples');
  });

  it('réduit le score quand le budget est serré (ratio entre 0.7 et 1.0)', () => {
    // coût ≈ 120*2 + 80*5*1(chambre) = 240 + 400 = 640 ; pour viser un ratio ~0.86 ⇒ budget 550
    const tight = computeContextualScore(makeDest(), { ...baseParams, budget: 550 });
    const comfy = computeContextualScore(makeDest(), { ...baseParams, budget: 2000 });
    expect(tight.score).toBeLessThan(comfy.score);
    expect(tight.reasons).toContain('Budget légèrement serré');
  });

  it('pénalise la météo hors-saison (mois à mauvais score météo)', () => {
    const dest = makeDest({
      monthly_weather_score: [9,9,9,9,9,9,1,9,9,9,9,9], // juillet (index 6) = 1
    });
    const offSeason = computeContextualScore(dest, { ...baseParams, departureMonth: 7 });
    const inSeason = computeContextualScore(makeDest(), { ...baseParams, departureMonth: 7 });
    expect(offSeason.score).toBeLessThan(inSeason.score);
  });

  it('bonus originalité pour une destination hors des sentiers battus, aucun pour une mainstream', () => {
    const original = computeContextualScore(makeDest({ city: 'Tbilissi' }), baseParams);
    const mainstream = computeContextualScore(makeDest({ city: 'Paris' }), baseParams);
    expect(original.score).toBeGreaterThan(mainstream.score);
  });

  it('pénalise une destination mainstream pour un profil solo/aventure (à trip-type égal)', () => {
    // À profil solo identique : une destination mainstream subit -5 d'originalité,
    // une destination originale gagne +10 ⇒ l'originale doit dominer.
    const mainstream = computeContextualScore(
      makeDest({ city: 'Barcelone', trip_types: ['solo'] }),
      { ...baseParams, tripType: 'solo' }
    );
    const original = computeContextualScore(
      makeDest({ city: 'Tbilissi', trip_types: ['solo'] }),
      { ...baseParams, tripType: 'solo' }
    );
    expect(mainstream.score).toBeLessThan(original.score);
  });

  it('utilise une valeur par défaut (5/10) quand les scores mensuels sont absents', () => {
    const dest = makeDest({ monthly_weather_score: undefined, monthly_crowd_score: undefined });
    const { score } = computeContextualScore(dest, baseParams);
    // ne doit pas planter, score fini et borné
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });
});

describe('passesHardConstraints', () => {
  it('accepte une destination dans le budget et sûre', () => {
    expect(passesHardConstraints(makeDest(), baseParams)).toBe(true);
  });

  it('rejette quand le coût minimal dépasse le seuil budgétaire (couple = ×1.3)', () => {
    // coût ≈ 640 ; seuil = budget*1.3 ; budget 400 ⇒ seuil 520 < 640 ⇒ rejet
    expect(passesHardConstraints(makeDest(), { ...baseParams, budget: 400 })).toBe(false);
  });

  it('applique un seuil plus large (×1.6) pour les groupes de 3+', () => {
    const dest = makeDest();
    // 3 voyageurs ⇒ 2 chambres : 120*3 + 80*5*2 = 360 + 800 = 1160
    const params3 = { ...baseParams, numTravelers: 3, numNights: 5 };
    // budget 750 : seuil 750*1.6 = 1200 > 1160 ⇒ accepté
    expect(passesHardConstraints(dest, { ...params3, budget: 750 })).toBe(true);
    // budget 700 : seuil 1120 < 1160 ⇒ rejeté
    expect(passesHardConstraints(dest, { ...params3, budget: 700 })).toBe(false);
  });

  it('rejette une destination sous le seuil de sécurité', () => {
    expect(passesHardConstraints(makeDest({ safety_index: 4 }), baseParams)).toBe(false);
  });

  it('rejette une destination explicitement exclue (insensible à la casse)', () => {
    const params = { ...baseParams, excludedDestinations: ['split'] };
    expect(passesHardConstraints(makeDest({ city: 'Split' }), params)).toBe(false);
  });
});

describe('applyCountryDiversity', () => {
  function d(city, country) {
    return { city, country };
  }

  it('limite à 1 destination par pays au premier passage, complète jusqu’à 5', () => {
    const scored = [
      d('Lisbonne', 'Portugal'),
      d('Porto', 'Portugal'),
      d('Madrid', 'Espagne'),
      d('Rome', 'Italie'),
      d('Athènes', 'Grèce'),
      d('Berlin', 'Allemagne'),
    ];
    const result = applyCountryDiversity(scored);
    expect(result).toHaveLength(5);
    // Les 5 premiers pays distincts d'abord
    const countries = result.map(r => r.country);
    expect(countries.slice(0, 5)).toEqual(['Portugal', 'Espagne', 'Italie', 'Grèce', 'Allemagne']);
  });

  it('autorise au plus 2 destinations par pays si besoin de compléter le top 5', () => {
    const scored = [
      d('Lisbonne', 'Portugal'),
      d('Porto', 'Portugal'),
      d('Faro', 'Portugal'), // 3e portugaise : ne doit jamais entrer (cap 2/pays)
      d('Madrid', 'Espagne'),
      d('Barcelone', 'Espagne'),
      d('Rome', 'Italie'), // 3e pays pour permettre d'atteindre 5
    ];
    const result = applyCountryDiversity(scored);
    expect(result).toHaveLength(5);
    const portugalCount = result.filter(r => r.country === 'Portugal').length;
    expect(portugalCount).toBeLessThanOrEqual(2);
    expect(result.map(r => r.city)).not.toContain('Faro');
  });

  it('préserve l’ordre de score (entrée déjà triée)', () => {
    const scored = [d('A', 'X'), d('B', 'Y'), d('C', 'Z')];
    const result = applyCountryDiversity(scored);
    expect(result.map(r => r.city)).toEqual(['A', 'B', 'C']);
  });
});
