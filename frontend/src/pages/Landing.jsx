import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { track } from '../lib/analytics';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Globe,
  MapPin,
  Plane,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge, Button, Logo, PhotoBlock } from '../components/ui';
import MegaMenu from '../components/Navigation/MegaMenu';
import { getDestinationImage } from '../utils/destinationImages';
import { searchAirports, getPrimaryAirport } from '../data/airports';
import { formatEUR } from '../utils/format';
import { countryFr, cityFr } from '../utils/i18nNames';

const POPULAR_DESTINATIONS = [
  { city: 'Lisbon', country: 'Portugal', iata: 'LIS' },
  { city: 'Barcelona', country: 'Spain', iata: 'BCN' },
  { city: 'Rome', country: 'Italy', iata: 'FCO' },
  { city: 'Porto', country: 'Portugal', iata: 'OPO' },
  { city: 'Amsterdam', country: 'Netherlands', iata: 'AMS' },
  { city: 'Prague', country: 'Czech Republic', iata: 'PRG' },
  { city: 'Marrakech', country: 'Morocco', iata: 'RAK' },
  { city: 'Dubrovnik', country: 'Croatia', iata: 'DBV' },
];

const COPY = {
  fr: {
    eyebrow: 'Voyage par IA · sans carte bancaire',
    title: ['Le voyage', 'qui vous ressemble', 'déjà pensé.'],
    subtitle: "Décrivez vos envies. Skusku compose vols, hôtels et itinéraire — vous n'avez plus qu'à dire oui.",
    cta: 'Composer mon voyage — gratuit',
    proof: '3 minutes · gratuit · puis vous comparez.',
    how: 'Comment ça marche',
    howTitle: ['Trois moments,', 'pas trente onglets.'],
    steps: [
      ['01 · Vous', "On parle d'abord de vous", 'Budget, style, dates flexibles, qui voyage. Pas de formulaire administratif.'],
      ['02 · IA', 'Une proposition complète', 'Une destination, ses dates idéales, son vol réel, son hôtel réel.'],
      ['03 · Départ', 'Vous partez', "Réservation directe chez les partenaires. Skusku garde l'œil sur les prix."],
    ],
    whyTitle: ['Pensé pour les voyages', 'abordables mais stylés.'],
    whySub: 'Pas du luxe inaccessible, pas du voyage au rabais. Le bon plan qui se raconte au retour.',
    features: [
      ['Vrais vols, vrais prix', "Données partenaires et liens de réservation, pas de tarifs d'appel."],
      ['Dates intelligentes', "L'IA cherche les fenêtres où climat, prix et disponibilité s'alignent."],
      ['Voyages de groupe', 'Invitez vos amis, votez, suivez qui a réservé quoi.'],
    ],
    finalTitle: 'Et si vous partiez, vraiment ?',
    finalCta: 'Trouver mon prochain voyage',
    signin: 'Se connecter',
    dashboard: 'Tableau de bord',
    createTrip: 'Créer mon voyage',
    mySpace: 'Mon espace',
    pricing: 'Tarifs',
    popular: 'Propositions récentes',
    powered: "Propulsé par l'IA",
    searchPlaceholder: 'Où voulez-vous partir ?',
    searchButton: 'Chercher',
    searchButtonAnon: 'Voir mes destinations',
    searchSignupHint: 'Créez votre compte pour découvrir vos 3 destinations — 30 secondes, gratuit.',
  },
  en: {
    eyebrow: 'AI travel · no card required',
    title: ['The trip', 'that looks like you', 'already planned.'],
    subtitle: 'Tell us what you want. We compose flights, hotels and the itinerary, you just say yes.',
    cta: 'Compose my trip',
    proof: '3 minutes · free · then you compare.',
    how: 'How it works',
    howTitle: ['Three moments,', 'not thirty tabs.'],
    steps: [
      ['01 · You', 'About you first', "Budget, style, flexible dates, who's coming. No admin form."],
      ['02 · AI', 'One complete proposal', 'A destination, ideal dates, a real flight, a real hotel.'],
      ['03 · Go', 'You leave', 'Direct booking with partners. Skusku keeps an eye on prices.'],
    ],
    whyTitle: ['Built for travel', 'affordable but stylish.'],
    whySub: 'Not unreachable luxury, not bargain-bin travel. The kind of trip you talk about after coming home.',
    features: [
      ['Real flights, real prices', 'Partner data and booking links, no bait pricing.'],
      ['Smart dates', 'AI looks for windows where weather, price and availability line up.'],
      ['Group trips', 'Invite friends, vote, track who booked what.'],
    ],
    finalTitle: 'What if you actually went?',
    finalCta: 'Find my next trip',
    signin: 'Sign in',
    dashboard: 'Dashboard',
    createTrip: 'Create my trip',
    mySpace: 'My space',
    pricing: 'Pricing',
    popular: 'Recent proposals',
    powered: 'AI powered',
    searchPlaceholder: 'Where do you want to go?',
    searchButton: 'Search',
    searchButtonAnon: 'See my destinations',
    searchSignupHint: 'Create your account to discover your 3 destinations — 30 seconds, free.',
  },
};

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  return (
    <button
      onClick={() => i18n.changeLanguage(currentLang === 'fr' ? 'en' : 'fr')}
      className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-sand-200 bg-white px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-sand-50 hover:text-text-main"
      title={currentLang === 'fr' ? 'Switch to English' : 'Passer en français'}
    >
      <Globe size={14} />
      {currentLang === 'fr' ? 'EN' : 'FR'}
    </button>
  );
}

// CTA principal pour un anonyme : un nouveau visiteur doit atterrir sur le
// SIGN-UP (l'ancien SignInButton ouvrait la connexion — friction au moment
// exact de la conversion, audit V3 P1).
function SignUpPrimary({ children, className = '' }) {
  return (
    <SignUpButton mode="modal">
      <Button size="lg" iconRight={<ArrowRight size={18} />} className={className}>
        {children}
      </Button>
    </SignUpButton>
  );
}

function Landing() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { isSignedIn } = useAuth();
  const { openSignUp } = useClerk();
  const { user } = useUser();
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const c = COPY[lang];
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase()
    || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase()
    || '·';

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [showSignupHint, setShowSignupHint] = useState(false);
  const searchRef = useRef(null);
  const howItWorksRef = useRef(null);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length >= 2) {
      const airportMatches = searchAirports(query);
      const popularMatches = POPULAR_DESTINATIONS.filter((d) =>
        d.city.toLowerCase().includes(query.toLowerCase()) ||
        d.country.toLowerCase().includes(query.toLowerCase())
      );

      const combined = [
        ...popularMatches.map((d) => ({ type: 'destination', ...d })),
        ...airportMatches.map((a) => ({ type: 'airport', city: a.city, country: a.country, iata: a.code })),
      ];

      const unique = combined.filter((item, index, self) =>
        index === self.findIndex((t) => t.city.toLowerCase() === item.city.toLowerCase())
      );

      setSuggestions(unique.slice(0, 6));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectDestination = (dest) => {
    setSelectedDestination(dest);
    setSearchQuery(dest.city);
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    let dest = selectedDestination;
    if (!dest && searchQuery) {
      const airport = getPrimaryAirport(searchQuery);
      dest = airport
        ? { city: airport.city, country: airport.country, iata: airport.code }
        : { city: searchQuery, country: '' };
    }

    if (!dest?.city) return;

    // Anonyme : l'intention la plus chaude du site. On conserve la saisie et
    // on ouvre le sign-up — plus de rebond silencieux vers / (audit V3 P0).
    if (!isSignedIn) {
      sessionStorage.setItem('pendingDestination', JSON.stringify(dest));
      setShowSignupHint(true);
      track('hero_search_submitted', { city: dest.city });
      openSignUp();
      return;
    }

    navigate('/create-trip', { state: { prefilledDestination: dest } });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Un anonyme renvoyé d'une route protégée (?signup=1) voit la modal de
  // création de compte au lieu d'un rebond silencieux.
  useEffect(() => {
    if (isSignedIn) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === '1') {
      window.history.replaceState({}, '', '/');
      openSignUp();
    }
  }, [isSignedIn, openSignUp]);

  return (
    <div className="min-h-screen bg-surface-subtle font-sans text-text-main">
      <MegaMenu
        actions={
          <>
            {/* LanguageSwitcher hidden for the FR-only launch (core pages are
                not translated yet). Re-add alongside the i18n detector once
                Results/TripDetail/Pricing are localised. */}
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="md" className="whitespace-nowrap">{c.signin}</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button
                  variant="primary"
                  size="md"
                  className="whitespace-nowrap"
                  iconRight={<ArrowRight size={16} />}
                >
                  {c.createTrip}
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button
                variant="ghost"
                size="md"
                className="whitespace-nowrap"
                onClick={() => navigate('/dashboard')}
              >
                {c.dashboard}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="whitespace-nowrap"
                onClick={() => navigate('/create-trip')}
                iconRight={<ArrowRight size={16} />}
              >
                {c.createTrip}
              </Button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </>
        }
        mobileFooter={
          <>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="flex w-full items-center justify-between py-3 text-sm text-text-secondary">
                  {c.signin} <ArrowRight size={14} />
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                className="flex items-center gap-3 py-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ember-100 text-xs font-semibold text-ember-800">
                  {initials}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-text-main">{c.dashboard}</span>
                  <span className="block text-xs text-text-light">{c.mySpace}</span>
                </span>
                <ArrowRight size={14} className="text-text-light" />
              </Link>
            </SignedIn>
          </>
        }
        mobileCta={
          <>
            <SignedOut>
              <SignUpButton mode="modal">
                <Button variant="primary" size="lg" full iconRight={<ArrowRight size={16} />}>
                  {c.createTrip}
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button
                variant="primary"
                size="lg"
                full
                onClick={() => navigate('/create-trip')}
                iconRight={<ArrowRight size={16} />}
              >
                {c.createTrip}
              </Button>
            </SignedIn>
          </>
        }
      />

      <main>
        <section className="px-5 pb-14 pt-28 md:px-8 md:pb-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.92fr] lg:items-end">
            <div>
              <Badge tone="ember" dot>{c.eyebrow}</Badge>
              <h1 className="mt-5 font-display text-[48px] font-medium leading-[0.98] text-text-main md:text-[72px]">
                <span className="block">{c.title[0]}</span>
                <span className="block italic text-ember-700">{c.title[1]}</span>
                <span className="block">{c.title[2]}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary">
                {c.subtitle}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <SignedOut>
                  <SignUpPrimary>{c.cta}</SignUpPrimary>
                </SignedOut>
                <SignedIn>
                  <Button size="lg" onClick={() => navigate('/create-trip')} iconRight={<ArrowRight size={18} />}>
                    {c.cta}
                  </Button>
                </SignedIn>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  iconRight={<ChevronDown size={18} />}
                >
                  {c.how}
                </Button>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{c.proof}</p>
            </div>

            <div className="grid grid-cols-[1.35fr_0.9fr] grid-rows-[170px_110px] gap-3 md:grid-rows-[260px_150px]">
              {/* Image LCP de la landing : preload couplé dans index.html —
                  garder le sizes synchronisé avec imagesizes là-bas. */}
              <PhotoBlock
                city="Marrakech"
                country="Morocco"
                className="row-span-2 rounded-[22px] shadow-2"
                alt="Marrakech"
                overlay={false}
                priority
                sizes="(max-width: 1023px) 56vw, 360px"
              />
              <PhotoBlock city="Lisbon" country="Portugal" className="rounded-[22px] shadow-1" alt="Lisbon" overlay={false} sizes="(max-width: 1023px) 38vw, 245px" />
              <PhotoBlock city="Porto" country="Portugal" className="rounded-[22px] shadow-1" alt="Porto" overlay={false} sizes="(max-width: 1023px) 38vw, 245px" />
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-5xl rounded-[22px] border border-sand-200 bg-white p-4 shadow-2">
            <div ref={searchRef} className="relative">
              <div className="flex flex-col gap-3 rounded-[16px] border border-sand-200 bg-sand-50 p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[12px] bg-white px-3 py-3">
                  <MapPin size={20} className="text-ember-700" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                    placeholder={c.searchPlaceholder}
                    className="w-full bg-transparent text-text-main outline-none placeholder:text-text-secondary"
                  />
                </div>
                <Button variant="ink" onClick={handleSearch} disabled={!searchQuery} icon={<Search size={18} />}>
                  {isSignedIn ? c.searchButton : c.searchButtonAnon}
                </Button>
              </div>

              {!isSignedIn && showSignupHint && (
                <p className="mt-3 px-1 text-sm text-ember-700">{c.searchSignupHint}</p>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[16px] border border-sand-200 bg-white shadow-3">
                  {suggestions.map((dest, idx) => (
                    <button
                      key={`${dest.city}-${idx}`}
                      onClick={() => handleSelectDestination(dest)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sand-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ember-50 text-ember-700">
                        <Plane size={16} />
                      </span>
                      <span>
                        <span className="block font-medium text-text-main">{cityFr(dest.city)}</span>
                        <span className="block text-sm text-text-secondary">{dest.country}</span>
                      </span>
                      {dest.iata && (
                        <span className="ml-auto rounded-md bg-sand-100 px-2 py-1 font-mono text-xs text-sand-700">
                          {dest.iata}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                <span className="text-xs font-medium text-text-secondary">{c.popular}</span>
                {POPULAR_DESTINATIONS.slice(0, 4).map((dest) => (
                  <button
                    key={dest.city}
                    onClick={() => handleSelectDestination(dest)}
                    className="rounded-full border border-sand-200 bg-white px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-ember-300 hover:text-ember-700"
                  >
                    {cityFr(dest.city)}
                  </button>
                ))}
                <span className="ml-auto hidden items-center gap-1 text-xs text-text-secondary sm:flex">
                  <Sparkles size={12} className="text-ember-700" />
                  {c.powered}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {/* Audit V3 P2 : « 96 % de match » pour un anonyme = claim de
                  personnalisation sans données. Badge factuel à la place. */}
              {[
                { city: 'Lisbon', country: 'Portugal', price: 847, badge: 'Vol direct' },
                { city: 'Marrakech', country: 'Morocco', price: 258, badge: 'Petit budget' },
                { city: 'Porto', country: 'Portugal', price: 620, badge: 'Week-end idéal' },
              ].map((dest) => (
                <div key={dest.city} className="overflow-hidden rounded-[16px] border border-sand-200 bg-white shadow-1">
                  <PhotoBlock city={dest.city} country={dest.country} className="h-32" alt={`${cityFr(dest.city)}, ${countryFr(dest.country)}`}>
                    <Badge tone="ember" className="absolute right-3 top-3 shadow-1">
                      {dest.badge}
                    </Badge>
                  </PhotoBlock>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {/* p, pas h3 : label de carte avant le premier h2 — heading-order Lighthouse (audit V3) */}
                        <p className="font-display text-xl font-medium">{cityFr(dest.city)}</p>
                        <p className="text-sm text-text-secondary">{countryFr(dest.country)}</p>
                      </div>
                      <p className="font-display text-xl font-medium">{formatEUR(dest.price)}</p>
                    </div>
                    <p className="mt-3 border-t border-sand-100 pt-3 text-xs text-text-secondary">7 j · vol + hôtel</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={howItWorksRef} className="border-y border-sand-200 bg-white px-5 py-20 md:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">{c.how}</p>
            <h2 className="mt-3 font-display text-4xl font-medium leading-tight md:text-5xl">
              {c.howTitle[0]} <span className="italic text-ember-700">{c.howTitle[1]}</span>
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {c.steps.map(([eyebrow, title, desc], index) => {
                const StepIcon = [Users, Sparkles, Plane][index];
                return (
                  <div key={title} className="rounded-[16px] border border-sand-200 bg-surface-subtle p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-ember-50 text-ember-700">
                      <StepIcon size={20} />
                    </span>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-text-secondary">{eyebrow}</p>
                    <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-5 py-28 text-white md:px-8">
          <PhotoBlock
            src={getDestinationImage({ city: 'Porto', country: 'Portugal' })}
            alt="Porto"
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sand-900 via-sand-900/70 to-sand-900/10" />
          <div className="relative mx-auto max-w-6xl">
            <h2 className="max-w-2xl font-display text-4xl font-medium leading-tight md:text-6xl">
              {c.whyTitle[0]} <span className="italic text-ember-200">{c.whyTitle[1]}</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/78">{c.whySub}</p>
          </div>
        </section>

        <section className="px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Badge tone="neutral">Skusku</Badge>
              <h2 className="mt-4 font-display text-4xl font-medium leading-tight">
                Voyage clair, choix simple, groupe aligné.
              </h2>
            </div>
            <div className="grid gap-5">
              {c.features.map(([title, desc], index) => {
                const FeatureIcon = [Globe, Calendar, Users][index];
                return (
                  <div key={title} className="grid grid-cols-[44px_1fr] gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-sand-100 text-sand-800">
                      <FeatureIcon size={19} />
                    </span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="mt-1 block text-sm leading-6 text-text-secondary">{desc}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Réassurance vérifiable — remplace les témoignages à initiales
            invérifiables (audit V3 P1 : sous la barre Revolut). Chaque claim
            est factuel ; brancher de vraies métriques/avis quand ils existent. */}
        <section className="border-y border-sand-200 bg-white px-5 py-14 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 sm:grid-cols-3">
              {(lang === 'fr'
                ? [
                    [Plane, 'Données réelles', 'Vols et hôtels issus de nos partenaires de réservation — pas de tarifs d’appel.'],
                    [Sparkles, 'Gratuit pour essayer', 'Vos premières recherches sans carte bancaire, sans engagement.'],
                    [Users, 'Pensé pour les groupes', 'Invitation, vote et partage des dépenses inclus — même pour les invités sans compte.'],
                  ]
                : [
                    [Plane, 'Real data', 'Flights and hotels from our booking partners — no teaser fares.'],
                    [Sparkles, 'Free to try', 'Your first searches without a credit card, no commitment.'],
                    [Users, 'Built for groups', 'Invitations, voting and expense splitting included — even for guests without an account.'],
                  ]
              ).map(([Icon, title, body]) => (
                <div key={title} className="rounded-[16px] border border-sand-200 bg-surface-subtle p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-ember-50 text-ember-700">
                    <Icon size={20} />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-text-main">{title}</p>
                  <p className="mt-1.5 text-sm leading-6 text-text-secondary">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:px-8">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[22px] bg-sand-900 p-8 text-center text-white shadow-3 md:p-12">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2"
              style={{ background: 'radial-gradient(circle, rgba(132,58,35,0.55) 0%, rgba(132,58,35,0) 65%)' }}
            />
            <h2 className="relative font-display text-4xl font-medium">{c.finalTitle}</h2>
            <div className="relative mt-8 flex justify-center">
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button size="lg" iconRight={<ArrowRight size={18} />}>{c.finalCta}</Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button size="lg" onClick={() => navigate('/create-trip')} iconRight={<ArrowRight size={18} />}>
                  {c.finalCta}
                </Button>
              </SignedIn>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-sand-200 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <Logo size={26} />
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-secondary">
            {POPULAR_DESTINATIONS.map((d) => (
              <Link key={d.city} to={`/destination/${d.city.toLowerCase()}`} className="hover:text-ember-700">
                {cityFr(d.city)}
              </Link>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-3 border-t border-sand-200 pt-5 text-sm text-text-secondary md:flex-row md:items-center md:justify-between">
          <span>Skusku © 2026</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/mentions-legales" className="hover:text-ember-700">Mentions légales</Link>
            <Link to="/terms" className="hover:text-ember-700">Conditions générales</Link>
            <Link to="/privacy" className="hover:text-ember-700">Confidentialité</Link>
            <Link to="/contact" className="hover:text-ember-700">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
