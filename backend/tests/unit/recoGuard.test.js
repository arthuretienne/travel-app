// Tests unitaires du garde-fou de pertinence (pure, synchrone, zéro coût).
import { describe, it, expect } from 'vitest';
import { guardRecommendation } from '../../src/services/recoGuard.js';

function makeResult(overrides = {}) {
  return {
    destination: { city: 'Lisbonne', country: 'Portugal' },
    pricing: { flight: 150, realisticTotal: 900 },
    ...overrides,
  };
}

describe('guardRecommendation', () => {
  it('garde une reco saine', () => {
    expect(guardRecommendation(makeResult(), { budget: 1500 })).toEqual({ keep: true });
  });

  it('rejette une ville manquante', () => {
    const r = makeResult({ destination: { city: '', country: 'Portugal' } });
    expect(guardRecommendation(r, { budget: 1500 }).keep).toBe(false);
  });

  it('rejette un pays invalide (null/undefined/unknown)', () => {
    for (const country of ['null', 'undefined', 'unknown', '']) {
      const r = makeResult({ destination: { city: 'X', country } });
      expect(guardRecommendation(r, { budget: 1500 }).keep).toBe(false);
    }
  });

  it('rejette city === country sauf cité-État', () => {
    const corrupt = makeResult({ destination: { city: 'Maldives', country: 'Maldives' } });
    expect(guardRecommendation(corrupt, { budget: 1500 }).keep).toBe(false);

    const cityState = makeResult({ destination: { city: 'Singapore', country: 'Singapore' } });
    expect(guardRecommendation(cityState, { budget: 1500 }).keep).toBe(true);
  });

  it('rejette un prix de vol manquant ou nul', () => {
    const r = makeResult({ pricing: { flight: 0 } });
    expect(guardRecommendation(r, { budget: 1500 }).keep).toBe(false);
  });

  it('rejette un prix de vol implausible (plancher / plafond)', () => {
    expect(guardRecommendation(makeResult({ pricing: { flight: 5 } }), { budget: 1500 }).keep).toBe(false);
    expect(guardRecommendation(makeResult({ pricing: { flight: 9999 } }), { budget: 1500 }).keep).toBe(false);
  });

  it('retombe sur flightDetails.totalPrice si pricing.flight absent', () => {
    const r = { destination: { city: 'Rome', country: 'Italie' }, flightDetails: { totalPrice: 200 } };
    expect(guardRecommendation(r, { budget: 1500 }).keep).toBe(true);
  });

  it('rejette un vol qui dépasse 100% du budget sans option terrestre', () => {
    const r = makeResult({ pricing: { flight: 800 } });
    expect(guardRecommendation(r, { budget: 500 }).keep).toBe(false);
  });

  it('garde un vol cher si une substitution terrestre est attachée', () => {
    const r = makeResult({ pricing: { flight: 800 }, recommendedTransport: { mode: 'train' } });
    expect(guardRecommendation(r, { budget: 500 }).keep).toBe(true);
  });

  it('rejette un all-in > 160% du budget', () => {
    const r = makeResult({ pricing: { flight: 150, realisticTotal: 2000 } });
    expect(guardRecommendation(r, { budget: 1000 }).keep).toBe(false);
  });

  it('ne contraint pas le budget quand budget = 0 / absent', () => {
    const r = makeResult({ pricing: { flight: 800, realisticTotal: 5000 } });
    expect(guardRecommendation(r, {}).keep).toBe(true);
  });
});
