/* Skusku mega menu — architecture, copy, URLs.
   Single source of truth for the desktop mega menu + mobile drawer.

   Route note: existing app routes (/destinations, /destination/:slug, /pricing,
   /create-trip) are wired live. The /ou-partir, /outils, /itineraires and
   /magazine paths are the intended SEO architecture and not yet built — they
   are kept as descriptive anchors for internal linking and to confirm with SEO. */

export const MENU_PHOTO = {
  Lisbonne:  'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=900&q=80&auto=format&fit=crop',
  Porto:     'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=80&auto=format&fit=crop',
  Marrakech: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=900&q=80&auto=format&fit=crop',
  Seville:   'https://images.unsplash.com/photo-1559682468-a6a29e7d9517?w=900&q=80&auto=format&fit=crop',
  Athenes:   'https://images.unsplash.com/photo-1555993539-1732b0258235?w=900&q=80&auto=format&fit=crop',
  Naples:    'https://images.unsplash.com/photo-1633321702518-7feccafb94d5?w=900&q=80&auto=format&fit=crop',
  Bali:      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=80&auto=format&fit=crop',
  Mexico:    'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=900&q=80&auto=format&fit=crop',
  CapVert:   'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=900&q=80&auto=format&fit=crop',
  Magazine1: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80&auto=format&fit=crop',
};

const M_DESTINATIONS = {
  id: 'destinations',
  label: 'Destinations',
  href: '/destinations',
  accroche:
    'Toutes les destinations couvertes par Skusku. Filtrez par région, comparez les top destinations du moment, ou parcourez le catalogue complet.',
  columns: [
    {
      title: 'Par région',
      kicker: 'Vue géographique',
      items: [
        { label: 'Europe du Sud', href: '/destinations/europe-du-sud' },
        { label: 'Méditerranée', href: '/destinations/mediterranee' },
        { label: 'Afrique du Nord', href: '/destinations/afrique-du-nord' },
        { label: 'Asie du Sud-Est', href: '/destinations/asie-du-sud-est' },
        { label: 'Amérique latine', href: '/destinations/amerique-latine' },
        { label: 'Moyen-Orient', href: '/destinations/moyen-orient' },
      ],
    },
    {
      title: 'Top destinations',
      kicker: 'Les plus réservées',
      items: [
        { label: 'Lisbonne', href: '/destination/lisbon', from: 240, photo: 'Lisbonne', country: 'Portugal' },
        { label: 'Marrakech', href: '/destination/marrakech', from: 180, photo: 'Marrakech', country: 'Maroc' },
        { label: 'Porto', href: '/destination/porto', from: 210, photo: 'Porto', country: 'Portugal' },
        { label: 'Bali', href: '/destination/bali', from: 520, photo: 'Bali', country: 'Indonésie' },
        { label: 'Mexico', href: '/destination/mexico', from: 480, photo: 'Mexico', country: 'Mexique' },
        { label: 'Athènes', href: '/destination/athens', from: 260, photo: 'Athenes', country: 'Grèce' },
      ],
    },
  ],
  feature: {
    eyebrow: 'Nouveau au catalogue',
    title: 'Cap-Vert',
    sub: 'Sept îles atlantiques, vols directs depuis Paris dès novembre.',
    photo: 'CapVert',
    href: '/destinations',
    cta: 'Voir le Cap-Vert',
  },
  secondary: { label: 'Toutes les destinations', href: '/destinations' },
};

const M_OU_PARTIR = {
  id: 'ou-partir',
  label: 'Où partir',
  href: '/ou-partir',
  accroche:
    'Vous savez quand, ou vous savez avec qui. Skusku trouve la destination qui correspond — météo, prix, fréquentation.',
  columns: [
    {
      title: 'Par période',
      kicker: 'Vous avez les dates',
      items: [
        { label: 'Où partir en janvier', href: '/ou-partir/janvier' },
        { label: 'Où partir en février', href: '/ou-partir/fevrier' },
        { label: 'Où partir en mars', href: '/ou-partir/mars' },
        { label: 'Où partir en avril', href: '/ou-partir/avril' },
        { label: 'Où partir en mai', href: '/ou-partir/mai' },
        { label: 'Où partir en juillet', href: '/ou-partir/juillet' },
        { label: 'Où partir en août', href: '/ou-partir/aout' },
        { label: 'Où partir en octobre', href: '/ou-partir/octobre' },
        { label: 'Où partir ce week-end', href: '/ou-partir/week-end' },
      ],
    },
    {
      title: 'Par envie',
      kicker: 'Vous savez ce que vous voulez',
      items: [
        { label: 'Soleil garanti', href: '/ou-partir/soleil' },
        { label: 'Plage et farniente', href: '/ou-partir/plage' },
        { label: 'City-trip culturel', href: '/ou-partir/city-trip' },
        { label: 'Nature et randonnée', href: '/ou-partir/nature' },
        { label: 'Gastronomie', href: '/ou-partir/gastronomie' },
        { label: 'Hors des sentiers battus', href: '/ou-partir/hors-sentiers' },
      ],
    },
    {
      title: 'Par profil',
      kicker: 'Vous savez avec qui',
      items: [
        { label: 'Voyage en couple', href: '/ou-partir/couple' },
        { label: 'Voyage en famille', href: '/ou-partir/famille' },
        { label: 'Voyage entre amis', href: '/ou-partir/amis' },
        { label: 'Voyage solo', href: '/ou-partir/solo' },
        { label: 'Lune de miel', href: '/ou-partir/lune-de-miel' },
      ],
    },
  ],
  feature: {
    eyebrow: 'Pas cher ce mois-ci',
    title: 'Mai 2026',
    sub: 'Trois destinations dont les prix ont chuté cette semaine.',
    list: [
      { city: 'Séville', country: 'Espagne', price: 198, drop: -22, photo: 'Seville' },
      { city: 'Naples', country: 'Italie', price: 224, drop: -18, photo: 'Naples' },
      { city: 'Marrakech', country: 'Maroc', price: 180, drop: -15, photo: 'Marrakech' },
    ],
    href: '/ou-partir/bons-plans',
    cta: 'Voir les bons plans',
  },
  secondary: { label: 'Voir tous les mois', href: '/ou-partir' },
};

const M_OUTILS = {
  id: 'outils',
  label: 'Outils',
  href: '/outils',
  accroche: 'Quatre outils gratuits pour décider. Pas de compte requis pour les essayer.',
  hero: {
    eyebrow: "L'outil principal",
    title: 'Planificateur IA',
    sub: 'Décrivez vos envies en une phrase. Skusku revient avec destination, dates, vol et hôtel — en 3 minutes.',
    href: '/create-trip',
    cta: 'Lancer le planificateur',
  },
  columns: [
    {
      title: 'Outils complémentaires',
      kicker: 'À la carte',
      items: [
        {
          label: 'Calculateur de budget voyage',
          href: '/outils/budget',
          icon: 'wallet',
          desc: 'Estimez vol + hôtel + sur-place pour votre destination.',
        },
        {
          label: 'Meilleure période pour partir',
          href: '/outils/meilleure-periode',
          icon: 'calendar',
          desc: 'Climat, prix et affluence sur 12 mois pour 84 destinations.',
        },
        {
          label: 'Comparateur vols et hôtels',
          href: '/outils/comparateur',
          icon: 'plane',
          desc: 'Compare les prix partenaires en direct, sans surcouche.',
        },
      ],
    },
  ],
  secondary: { label: 'Voir tous les outils', href: '/outils' },
};

const M_ITI_MAG = {
  id: 'itineraires-magazine',
  label: 'Itinéraires & Magazine',
  href: '/magazine',
  accroche:
    'Pour lire avant de partir : itinéraires testés, guides destinations, conseils budget.',
  columns: [
    {
      title: 'Itinéraires types',
      kicker: 'Prêts à personnaliser',
      items: [
        { label: '7 jours au Portugal', href: '/itineraires/portugal-7-jours' },
        { label: '10 jours au Maroc', href: '/itineraires/maroc-10-jours' },
        { label: '14 jours à Bali', href: '/itineraires/bali-14-jours' },
        { label: 'Road trip côte amalfitaine', href: '/itineraires/cote-amalfitaine' },
        { label: 'Île de Lombok et Gili', href: '/itineraires/lombok-gili' },
        { label: 'Tous les itinéraires (32)', href: '/itineraires' },
      ],
    },
    {
      title: 'Magazine',
      kicker: 'Lecture longue',
      items: [
        { label: 'Guides destination', href: '/magazine/guides' },
        { label: 'Conseils budget', href: '/magazine/budget' },
        { label: 'Astuces réservation', href: '/magazine/astuces' },
        { label: 'Carnets de voyageurs', href: '/magazine/carnets' },
        { label: 'Tous les articles', href: '/magazine' },
      ],
    },
  ],
  feature: {
    eyebrow: 'Article en avant',
    title: 'Voyager moins cher en haute saison : 7 leviers',
    sub: '8 min de lecture · mis à jour il y a 3 jours',
    photo: 'Magazine1',
    href: '/magazine/voyager-moins-cher-haute-saison',
    cta: "Lire l'article",
  },
  secondary: { label: 'Tous les itinéraires', href: '/itineraires' },
};

const M_TARIFS = {
  id: 'tarifs',
  label: 'Tarifs',
  href: '/pricing',
  simple: true,
};

export const MEGA_MENU = [M_DESTINATIONS, M_OU_PARTIR, M_OUTILS, M_ITI_MAG, M_TARIFS];

/* Persistent CTA — one primary action visible at all times.
   Visitor → acquisition (composer behind sign-in). Logged in → app. */
export const CTA_PERSISTANT = {
  visiteur: { label: 'Créer mon voyage', href: '/create-trip' },
  connecte: { label: 'Créer mon voyage', href: '/create-trip' },
};
