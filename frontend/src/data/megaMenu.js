/* Skusku mega menu — architecture, copy, URLs.
   Single source of truth for the desktop mega menu + mobile drawer.

   RULE (SEO): every href here must resolve to a route that exists in
   App.jsx and is prerendered. We deliberately DO NOT link the future
   /ou-partir, /outils, /itineraires, /magazine clusters — they 404 today
   and a 404 in primary nav is a negative crawl signal. Re-add them here
   when those pages ship (the SEO plan's Annexe A).

   The Destinations panel is data-driven from src/data/destinations.js, so
   new destination pages appear in the menu automatically and never point
   to a missing slug. */

import { DESTINATIONS } from './destinations';
import { getDestinationImage } from '../utils/destinationImages';

const destImage = (d) => getDestinationImage({ city: d.city, country: d.country });

// Photo lookup keyed by slug — built from the destinations dataset so the
// menu can never reference a missing image.
export const MENU_PHOTO = Object.fromEntries(
  DESTINATIONS.map((d) => [d.slug, destImage(d)])
);

const TOP = DESTINATIONS.slice(0, 8);
const FEATURED = DESTINATIONS.slice(8, 12);
const SPOTLIGHT = DESTINATIONS[DESTINATIONS.length - 1]; // newest at catalog tail

const M_DESTINATIONS = {
  id: 'destinations',
  label: 'Destinations',
  href: '/destinations',
  accroche:
    'Toutes les destinations couvertes par Skusku : vol aller-retour indicatif, hôtel et meilleure période pour chacune. Parcourez le catalogue complet ou laissez l’IA choisir.',
  columns: [
    {
      title: 'Top destinations',
      kicker: 'Les plus consultées',
      items: TOP.map((d) => ({
        label: d.cityFr || d.city,
        href: `/destination/${d.slug}`,
        from: d.avgFlightPrice,
      })),
    },
    {
      title: 'Coups de cœur',
      kicker: 'À découvrir',
      items: FEATURED.map((d) => ({
        label: d.cityFr || d.city,
        href: `/destination/${d.slug}`,
        photo: d.slug,
        country: d.countryFr || d.country,
        from: d.avgFlightPrice,
      })),
    },
  ],
  feature: {
    eyebrow: 'Nouveau au catalogue',
    title: SPOTLIGHT.cityFr || SPOTLIGHT.city,
    sub: `${SPOTLIGHT.countryFr || SPOTLIGHT.country} · vol aller-retour dès €${SPOTLIGHT.avgFlightPrice}.`,
    photo: SPOTLIGHT.slug,
    href: `/destination/${SPOTLIGHT.slug}`,
    cta: `Voir ${SPOTLIGHT.cityFr || SPOTLIGHT.city}`,
  },
  secondary: { label: 'Toutes les destinations', href: '/destinations' },
};

// Simple top-level links (no panel) — both routes exist.
const M_COMMENT = {
  id: 'comment',
  label: 'Comment ça marche',
  href: '/#comment-ca-marche',
  simple: true,
};

const M_TARIFS = {
  id: 'tarifs',
  label: 'Tarifs',
  href: '/pricing',
  simple: true,
};

export const MEGA_MENU = [M_DESTINATIONS, M_COMMENT, M_TARIFS];

/* Persistent CTA — one primary action visible at all times.
   Visitor → acquisition (composer behind sign-in). Logged in → app. */
export const CTA_PERSISTANT = {
  visiteur: { label: 'Créer mon voyage', href: '/create-trip' },
  connecte: { label: 'Créer mon voyage', href: '/create-trip' },
};
