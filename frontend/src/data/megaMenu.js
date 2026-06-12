/* Skusku mega menu — architecture, copy, URLs.
   Single source of truth for the desktop mega menu + mobile drawer.

   Règle (audit V3) : le menu ne contient QUE des routes qui existent.
   Les architectures SEO envisagées (/ou-partir, /outils, /itineraires,
   /magazine) ont été retirées du menu tant que les pages n'existent pas —
   un menu qui promet du contenu fictif est toxique pour la confiance.
   Les anciennes entrées sont dans l'historique git (data/megaMenu.js). */

export const MENU_PHOTO = {
  Lisbonne:  'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=900&q=80&auto=format&fit=crop',
  Porto:     'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=80&auto=format&fit=crop',
  Marrakech: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=900&q=80&auto=format&fit=crop',
  Seville:   'https://images.unsplash.com/photo-1559682468-a6a29e7d9517?w=900&q=80&auto=format&fit=crop',
  Athenes:   'https://images.unsplash.com/photo-1555993539-1732b0258235?w=900&q=80&auto=format&fit=crop',
  Istanbul:  'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=900&q=80&auto=format&fit=crop',
  Bali:      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=80&auto=format&fit=crop',
};

const M_DESTINATIONS = {
  id: 'destinations',
  label: 'Destinations',
  href: '/destinations',
  accroche:
    'Vingt destinations couvertes en profondeur : budget réel, meilleure période, quartiers où dormir.',
  columns: [
    {
      title: 'Guides destination',
      kicker: 'Budget · période · quartiers',
      items: [
        { label: 'Barcelone', href: '/destination/barcelona' },
        { label: 'Rome', href: '/destination/rome' },
        { label: 'Amsterdam', href: '/destination/amsterdam' },
        { label: 'Prague', href: '/destination/prague' },
        { label: 'Budapest', href: '/destination/budapest' },
        { label: 'Istanbul', href: '/destination/istanbul' },
        { label: 'Dubrovnik', href: '/destination/dubrovnik' },
        { label: 'Copenhague', href: '/destination/copenhagen' },
      ],
    },
    {
      title: 'Top destinations',
      kicker: 'Les plus consultées',
      items: [
        { label: 'Lisbonne', href: '/destination/lisbon', from: 240, photo: 'Lisbonne', country: 'Portugal' },
        { label: 'Marrakech', href: '/destination/marrakech', from: 180, photo: 'Marrakech', country: 'Maroc' },
        { label: 'Porto', href: '/destination/porto', from: 210, photo: 'Porto', country: 'Portugal' },
        { label: 'Bali', href: '/destination/bali', from: 520, photo: 'Bali', country: 'Indonésie' },
        { label: 'Istanbul', href: '/destination/istanbul', from: 220, photo: 'Istanbul', country: 'Turquie' },
        { label: 'Athènes', href: '/destination/athens', from: 260, photo: 'Athenes', country: 'Grèce' },
      ],
    },
  ],
  feature: {
    eyebrow: 'Le catalogue',
    title: '20 destinations sélectionnées',
    sub: 'Chaque guide couvre le budget, la meilleure période et nos conseils concrets.',
    photo: 'Seville',
    href: '/destinations',
    cta: 'Parcourir le catalogue',
  },
  secondary: { label: 'Toutes les destinations', href: '/destinations' },
};

const M_PLANIFICATEUR = {
  id: 'planificateur',
  label: 'Planificateur',
  href: '/create-trip',
  simple: true,
};

const M_TARIFS = {
  id: 'tarifs',
  label: 'Tarifs',
  href: '/pricing',
  simple: true,
};

export const MEGA_MENU = [M_DESTINATIONS, M_PLANIFICATEUR, M_TARIFS];

/* Persistent CTA — one primary action visible at all times.
   Visitor → acquisition (composer behind sign-in). Logged in → app. */
export const CTA_PERSISTANT = {
  visiteur: { label: 'Créer mon voyage', href: '/create-trip' },
  connecte: { label: 'Créer mon voyage', href: '/create-trip' },
};
