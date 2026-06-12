// frontend/src/pages/SavedTripDetail.jsx
// Solo trip detail — editorial single-page layout adapted from the
// Skusku design handoff (`Trip Detail - Rome`). Cinematic hero,
// "Pourquoi ce plan ?" band, Kayak-style flight tickets, magazine
// hotel split, day strip + magazine itinerary, packing/weather/events
// tier, sticky summary bar.

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Calendar,
  Plane,
  Hotel,
  Sparkles,
  Loader2,
  AlertCircle,
  Trash2,
  UserPlus,
  X,
  Mail,
  Send,
  Bell,
  Download,
  ExternalLink,
  Ticket,
  Footprints,
  Euro,
  Clock,
  Compass,
  Utensils,
  Wine,
  Mountain,
  Palette,
  CheckCircle2,
  Edit3,
  Sun,
  Cloud,
  CloudRain,
  PartyPopper,
  ChevronRight,
  Star,
  Share2,
  MoreHorizontal,
} from 'lucide-react';

import { generateFlightLink, generateHotelLink, generateActivitiesLink, wrapAffiliate } from '../utils/bookingLinks';
import { Badge, Button, EmptyState } from '../components/ui';
import PhotoBlock from '../components/ui/PhotoBlock';
import { getDestinationImage } from '../utils/destinationImages';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../i18n/format';
import '../styles/tripDetail.css';
import { formatEUR } from '../utils/format';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Upgrade Booking.com CDN thumbnails to a large variant.
const hiResPhoto = (url) =>
  typeof url === 'string' && url.includes('bstatic.com')
    ? url.replace(/\/(square\d+|max\d+(?:x\d+)?|source)\//, '/max1024x768/')
    : url;

const safeText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return value.word || value.value || value.name || value.text || value.label || '';
  }
  return String(value);
};

// Some records store the city with the country already appended
// (e.g. "Lisbon, Portugal"). Strip a trailing ", <country>" so the
// country isn't rendered twice when we concatenate city + country.
const stripCountrySuffix = (city, country) => {
  const c = safeText(city).trim();
  const co = safeText(country).trim();
  if (!c || !co) return c;
  const suffix = `, ${co}`;
  if (c.toLowerCase().endsWith(suffix.toLowerCase())) {
    return c.slice(0, c.length - suffix.length).trim();
  }
  return c;
};

const fmtClock = (iso, locale) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const s = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
  return locale.startsWith('fr') ? s.replace(':', ' h ') : s;
};

const fmtRaw = (iso, locale) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
};

const computeDuration = (leg) => {
  if (leg?.duration) return leg.duration;
  if (!leg?.departureTime || !leg?.arrivalTime) return null;
  const d1 = new Date(leg.departureTime);
  const d2 = new Date(leg.arrivalTime);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const mins = Math.round((d2 - d1) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
};

const stopsLabel = (leg, t) => {
  const stops = Array.isArray(leg?.segments)
    ? Math.max(0, leg.segments.length - 1)
    : (typeof leg?.stops === 'number' ? leg.stops : null);
  if (stops === 0) return t('savedTrip.fsDirect');
  if (stops === 1) return t('savedTrip.fsOneStop');
  if (stops > 1) return t('savedTrip.fsStops', { count: stops });
  return null;
};

// Categorise an itinerary item type into one of our four warm icons.
const iconForActivityType = (type) => {
  switch (String(type || '').toLowerCase()) {
    case 'food':       return Utensils;
    case 'culture':    return Compass;
    case 'nature':     return Mountain;
    case 'transport':  return Plane;
    case 'shopping':   return Palette;
    case 'detente':
    case 'détente':    return Wine;
    default:           return Sparkles;
  }
};

const weatherIcon = (code) => {
  const c = String(code || '').toLowerCase();
  if (c.includes('rain') || c.includes('pluie')) return CloudRain;
  if (c.includes('cloud') || c.includes('couvert') || c.includes('nuag')) return Cloud;
  return Sun;
};

// Personalisation reasons — derived from the trip data (with sensible
// defaults). Maps to the three icon columns in the "Pourquoi ce plan" band.
const buildReasons = ({ tripData, destination, pricing, duration, t }) => {
  const reasons = [];
  const highlights = (destination?.highlights || [])
    .map(safeText)
    .filter(Boolean);
  const matchList = Array.isArray(tripData?.matchReasons) ? tripData.matchReasons.map(safeText).filter(Boolean) : [];

  if (highlights[0]) {
    reasons.push({ icon: Compass, title: t('savedTrip.reasonStyleTitle'), detail: highlights.slice(0, 2).join(' · ') });
  } else {
    reasons.push({ icon: Compass, title: t('savedTrip.reasonStyleTitle'), detail: t('savedTrip.reasonStyleDefault') });
  }

  reasons.push({
    icon: Clock,
    title: t('savedTrip.reasonRhythmTitle'),
    detail: t('savedTrip.reasonRhythmDetail', { days: duration }),
  });

  const budgetTotal = pricing?.total || 0;
  reasons.push({
    icon: Euro,
    title: t('savedTrip.reasonBudgetTitle'),
    detail: budgetTotal
      ? t('savedTrip.reasonBudgetDetail', { amount: Math.round(budgetTotal) })
      : (matchList[0] || t('savedTrip.reasonBudgetDefault')),
  });

  return reasons;
};

export default function SavedTripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { t } = useTranslation();
  const { fmtDate, fmtCurrency, locale } = useFormat();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  const [creatingAlert, setCreatingAlert] = useState(false);
  const [alertCreated, setAlertCreated] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Trip enhancements (fetched in parallel, displayed inline)
  const [weather, setWeather] = useState(null);
  const [packing, setPacking] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [events, setEvents] = useState(null);
  const [itineraryLoading, setItineraryLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState(0);
  const [showSticky, setShowSticky] = useState(false);
  const heroRef = useRef(null);

  // Le toast d'erreur se ferme tout seul (la croix reste disponible)
  useEffect(() => {
    if (!actionError) return undefined;
    const timer = setTimeout(() => setActionError(null), 6000);
    return () => clearTimeout(timer);
  }, [actionError]);

  // --- Fetch trip ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/searches/trips/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to load trips');
        const data = await response.json();
        const savedTrip = data.savedTrips?.find((t) => t.id === id);
        if (!savedTrip) throw new Error('Trip not found');
        if (!cancelled) {
          setTrip({
            ...savedTrip,
            city: stripCountrySuffix(savedTrip.city, savedTrip.country),
          });
        }
      } catch (err) {
        console.error('Error fetching trip:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, getToken]);

  // --- Fetch enhancements in parallel once trip is loaded ------------------
  useEffect(() => {
    if (!trip?.id) return;
    let cancelled = false;
    let retryTimer = null;

    const fetchItinerary = (headers) =>
      fetch(`${API_URL}/api/trips/${trip.id}/itinerary`, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

    const fetchAll = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [w, p, it, ev] = await Promise.all([
          fetch(`${API_URL}/api/trips/${trip.id}/weather`,   { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_URL}/api/trips/${trip.id}/packing`,   { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetchItinerary(headers),
          fetch(`${API_URL}/api/trips/${trip.id}/events`,    { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (cancelled) return;
        setWeather(w?.data?.weather || null);
        setPacking(p?.data?.packing || null);
        setEvents(ev?.data?.events || null);

        if (it?.data?.itinerary?.length) {
          setItinerary(it.data.itinerary);
          setItineraryLoading(false);
          return;
        }

        // La génération continue côté serveur même quand NOTRE requête a
        // échoué/expiré : une fois le cache écrit, la relecture est
        // instantanée. On re-tente quelques fois au lieu de laisser l'UI
        // bloquée sur « Création de votre itinéraire… » jusqu'au reload
        // manuel (audit V3 P1). Après ~2 min sans succès, on rend l'état
        // vide (avec son invitation à rafraîchir).
        let attempts = 0;
        const poll = async () => {
          if (cancelled) return;
          attempts += 1;
          const again = await fetchItinerary(headers);
          if (cancelled) return;
          if (again?.data?.itinerary?.length) {
            setItinerary(again.data.itinerary);
            setItineraryLoading(false);
            return;
          }
          if (attempts >= 5) {
            setItineraryLoading(false);
            return;
          }
          retryTimer = setTimeout(poll, 20000);
        };
        retryTimer = setTimeout(poll, 15000);
      } catch (err) {
        console.error('Error loading enhancements:', err);
        if (!cancelled) setItineraryLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; clearTimeout(retryTimer); };
  }, [trip?.id, getToken]);

  // --- Sticky summary bar reveal on scroll past hero -----------------------
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 460);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // --- Actions -------------------------------------------------------------
  const addInviteEmail = (e) => {
    if (e.key === 'Enter' && currentEmail.trim()) {
      e.preventDefault();
      const email = currentEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setInviteError(t('savedTrip.errInvalidEmail'));
        return;
      }
      if (inviteEmails.includes(email)) {
        setInviteError(t('savedTrip.errEmailDup'));
        return;
      }
      const isDevelopment = import.meta.env.DEV;
      if (user?.primaryEmailAddress?.emailAddress === email && !isDevelopment) {
        setInviteError(t('savedTrip.errSelfInvite'));
        return;
      }
      setInviteEmails([...inviteEmails, email]);
      setCurrentEmail('');
      setInviteError(null);
    }
  };

  const removeInviteEmail = (email) =>
    setInviteEmails(inviteEmails.filter((e) => e !== email));

  const handleInviteFriends = async () => {
    if (inviteEmails.length === 0) {
      setInviteError(t('savedTrip.errAddEmail'));
      return;
    }
    try {
      setInviting(true);
      setInviteError(null);
      const token = await getToken();
      const convertResponse = await fetch(`${API_URL}/api/trips/from-saved/${trip.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!convertResponse.ok) {
        const errorData = await convertResponse.json();
        throw new Error(errorData.error || 'Failed to convert trip');
      }
      const convertData = await convertResponse.json();
      const groupTripId = convertData.data?.id;
      if (!groupTripId) throw new Error('Group trip ID not found in response');

      const inviteResponse = await fetch(`${API_URL}/api/trips/${groupTripId}/invitations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: inviteEmails }),
      });
      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json();
        throw new Error(errorData.error || 'Failed to send invitations');
      }
      setInviteEmails([]);
      setCurrentEmail('');
      setShowInviteModal(false);
      navigate(`/trips/${groupTripId}`);
    } catch (err) {
      console.error('Error inviting friends:', err);
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      if (!itinerary || itinerary.length === 0) {
        setActionError(t('savedTrip.errPdfPending'));
        return;
      }
      const userName = user?.firstName || t('savedTrip.voyagerFallback');
      const [{ pdf }, { default: ItineraryPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/ItineraryPDF'),
      ]);
      const blob = await pdf(
        <ItineraryPDF trip={trip} itinerary={itinerary} packing={packing} userName={userName} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeText(trip.city)}-trip-plan.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PDF Export] Error:', err);
      setActionError(t('savedTrip.errPdf'));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('savedTrip.confirmDelete'))) return;
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/searches/trips/${trip.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting trip:', err);
      setActionError(t('savedTrip.errDelete'));
    }
  };

  const handleCreatePriceAlert = async () => {
    if (!trip?.tripData?.pricing?.total || !trip.startDate || !trip.endDate) {
      setActionError(t('savedTrip.errAlertData'));
      return;
    }
    setCreatingAlert(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/price-alerts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          savedTripId: trip.id,
          destination: trip.city,
          country: trip.country,
          origin: trip.tripData?.slot?.origin || 'PAR',
          departureDate: trip.startDate,
          returnDate: trip.endDate,
          initialPrice: trip.tripData.pricing.total,
          alertType: 'flight',
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create alert');
      }
      setAlertCreated(true);
      setTimeout(() => setAlertCreated(false), 3000);
    } catch (err) {
      console.error('Error creating price alert:', err);
      setActionError(err.message || t('savedTrip.errAlert'));
    } finally {
      setCreatingAlert(false);
    }
  };

  // --- Derived data --------------------------------------------------------
  const tripData = trip?.tripData || {};
  const destination = tripData.destination || {};
  const pricing = tripData.pricing || {};
  const slot = tripData.slot || {};
  const flightDetails = tripData.flightDetails || {};
  const hotelOptions = tripData.hotelOptions || {};
  // Fallback when a day has no Pexels photo: the destination's hero image.
  const fallbackDayPhoto = hiResPhoto(getDestinationImage({ city: trip?.city, country: trip?.country, tripData }));
  const duration = Math.max(
    1,
    trip?.startDate && trip?.endDate
      ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
      : slot.duration || 1
  );

  const searchContext = tripData.searchContext || {};
  const tripTypeRaw = safeText(searchContext.tripType).toLowerCase();
  const tripTypeBadgeKey =
    tripTypeRaw === 'couple' ? 'savedTrip.coupleBadge'
    : tripTypeRaw === 'friends' ? 'savedTrip.friendsBadge'
    : tripTypeRaw === 'family' ? 'savedTrip.familyBadge'
    : 'savedTrip.soloBadge';
  // Origin city for flight legs — backend stores departure as IATA codes
  // only (ORY/BVA), so fall back to the slot's origin rather than the
  // destination city, which would mislabel the departure airport.
  const originLabel = safeText(flightDetails.outbound?.departureCity) || safeText(slot.origin) || '';

  const reasons = useMemo(
    () => trip ? buildReasons({ tripData, destination, pricing, duration, t }) : [],
    [trip, tripData, destination, pricing, duration, t]
  );

  const primaryBookingUrl = trip
    ? (flightDetails.bookingUrl || generateFlightLink({
        destinationCity: safeText(trip.city),
        destinationIata: destination.iataCode,
        destinationCountry: safeText(trip.country),
        startDate: trip.startDate,
        endDate: trip.endDate,
        adults: 1,
      }))
    : '#';

  const dateRangeLabel = trip?.startDate && trip?.endDate
    ? `${fmtDate(trip.startDate, { day: 'numeric', month: 'short' })} — ${fmtDate(trip.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : (trip?.startDate ? fmtDate(trip.startDate, { day: 'numeric', month: 'short', year: 'numeric' }) : t('savedTrip.dateTBD'));

  const hotel = hotelOptions?.hotels?.[0];
  const hotelGallery = hotel
    ? [...new Set([hotel.mainPhoto, ...(hotel.photos || [])].filter(Boolean))].map(hiResPhoto).slice(0, 5)
    : [];

  // ------------- LOADING / ERROR --------------
  if (loading) {
    return (
      <div className="sk-trip-detail flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[20px] border border-sand-200 bg-white p-10 text-center shadow-2">
          <Loader2 className="mx-auto mb-5 h-10 w-10 animate-spin text-ember-600" />
          <h3 className="font-display text-2xl font-medium text-text-main">{t('common.loadingTitle')}</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-text-secondary">{t('common.loadingSub')}</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="sk-trip-detail flex min-h-screen items-center justify-center p-4">
        <EmptyState
          className="max-w-md"
          icon={<AlertCircle size={24} />}
          title={t('savedTrip.notFoundTitle')}
          sub={t('savedTrip.notFoundSub')}
          action={{ label: t('savedTrip.back'), variant: 'outline', onClick: () => navigate('/dashboard') }}
        />
      </div>
    );
  }

  // ------------- RENDER --------------
  return (
    <div className="sk-trip-detail min-h-screen">
      {actionError && (
        <div className="fixed top-4 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-clay-500 px-5 py-3 text-sm font-medium text-white shadow-2">
          <AlertCircle size={16} /> {actionError}
          <button onClick={() => setActionError(null)} className="ml-2 hover:opacity-80">×</button>
        </div>
      )}

      <StickySummary
        show={showSticky}
        trip={trip}
        pricing={pricing}
        dateRangeLabel={dateRangeLabel}
        duration={duration}
        bookingUrl={primaryBookingUrl}
        fmtCurrency={fmtCurrency}
      />

      {/* ============ HERO ============ */}
      <section ref={heroRef} className="relative">
        <PhotoBlock
          city={safeText(trip.city)}
          country={safeText(trip.country)}
          tripData={trip.tripData}
          className="absolute inset-0 h-full w-full"
          overlay={false}
          alt={`${safeText(trip.city)}, ${safeText(trip.country)}`}
        />
        <div className="sk-hero-scrim absolute inset-0" />
        <div className="relative z-10 mx-auto flex min-h-[580px] max-w-[1280px] flex-col justify-between gap-12 px-5 pb-16 pt-8 text-white sm:px-8 lg:px-20">
          {/* Top row */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ArrowLeft size={14} />
              {t('savedTrip.back')}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <HeroChip icon={Share2} onClick={() => setShowInviteModal(true)}>{t('savedTrip.invite')}</HeroChip>
              <HeroChip
                icon={alertCreated ? CheckCircle2 : Bell}
                onClick={handleCreatePriceAlert}
                disabled={creatingAlert || alertCreated}
                trail={!alertCreated && <span className="sk-pulse ml-1 inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />}
              >
                {alertCreated ? t('savedTrip.alertCreated') : t('savedTrip.priceTrack')}
              </HeroChip>
              <HeroChip
                icon={exportingPdf ? Loader2 : Download}
                onClick={handleExportPdf}
                disabled={exportingPdf}
                spinning={exportingPdf}
              >
                {t('savedTrip.export')}
              </HeroChip>
              <HeroChip
                icon={Trash2}
                onClick={handleDelete}
                title={t('savedTrip.deleteTrip')}
                iconOnly
              />
            </div>
          </div>

          {/* Bottom row: destination + price card */}
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
            <div>
              <div
                className="inline-flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90"
                style={{ textShadow: '0 1px 8px rgba(26,22,18,.5)' }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-ember-200 backdrop-blur">
                  <Sparkles size={12} />
                  <span>{t('savedTrip.heroEyebrowBrand')}</span>
                </span>
                <span className="opacity-85">{dateRangeLabel}</span>
                <span className="opacity-85">·</span>
                <span className="opacity-85">{t(tripTypeBadgeKey, { count: duration })}</span>
              </div>

              <h1
                className="mt-4 font-display font-medium leading-[0.98] tracking-[-0.02em]"
                style={{ fontSize: 'clamp(48px, 7vw, 92px)' }}
              >
                <span className="text-white">{safeText(trip.city)},</span>
                <br />
                <span className="font-normal italic text-ember-200">{safeText(trip.country)}</span>
              </h1>

              <div
                className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/90"
                style={{ textShadow: '0 1px 8px rgba(26,22,18,.55)' }}
              >
                <Pillet icon={MapPin}>{safeText(trip.city)}, {safeText(trip.country)}</Pillet>
                <Pillet icon={Calendar}>{duration} {duration > 1 ? t('savedTrip.nightsLabelPlural') : t('savedTrip.nightsLabelSingular')} · {dateRangeLabel}</Pillet>
                {user?.firstName && (
                  <Pillet icon={Footprints}>
                    {t('savedTrip.bonVoyage')}{' '}
                    <em className="font-display not-italic">
                      <span className="italic text-ember-200">{user.firstName}</span>
                    </em>
                  </Pillet>
                )}
              </div>
            </div>

            {/* Price card */}
            <div className="w-full max-w-[360px] rounded-[22px] border border-white/10 bg-sand-900/55 p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                {t('savedTrip.totalEstimateUpper')}
                {tripData?.priceDrop && (
                  <span className="sk-pulse inline-flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/15 px-2 py-0.5 text-[10px] tracking-normal text-gold-500">
                    <span className="h-1 w-1 rounded-full bg-gold-500" />
                    {t('savedTrip.priceDropPing')}
                  </span>
                )}
              </div>
              <div className="mt-2 font-display text-[56px] font-medium leading-none tracking-[-0.02em] text-white">
                {fmtCurrency(pricing.total || 0)}
              </div>
              <div className="mt-2 font-mono text-[12px] text-white/65">
                {pricing.flight ? `${fmtCurrency(pricing.flight)} ${t('savedTrip.priceFlight')}` : ''}
                {pricing.flight && pricing.hotel ? ' · ' : ''}
                {pricing.hotel ? `${fmtCurrency(pricing.hotel)} ${t('savedTrip.priceHotel')}` : ''}
                {(pricing.total - (pricing.flight || 0) - (pricing.hotel || 0)) > 0 && (
                  ` · ${fmtCurrency(pricing.total - (pricing.flight || 0) - (pricing.hotel || 0))} ${t('savedTrip.priceActivities')}`
                )}
              </div>

              <button
                onClick={() => window.open(primaryBookingUrl, '_blank', 'noopener,noreferrer')}
                className="mt-5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[12px] bg-ember-600 px-5 text-[15px] font-semibold text-white shadow-[0_12px_32px_rgba(132,58,35,.45)] transition-colors hover:bg-ember-700"
              >
                <Ticket size={18} />
                {t('savedTrip.bookAll')}
                <ArrowRight size={16} />
              </button>
              <div className="mt-3 text-center font-mono text-[11px] text-white/55">
                {t('savedTrip.partnerLinks')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY THIS PLAN ============ */}
      <section className="border-b border-sand-200 bg-sand-100">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[340px_1fr] lg:gap-16 lg:px-20">
          <div>
            <div className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">
              <Sparkles size={15} className="text-ember-700" />
              {t('savedTrip.whyEyebrow')}
            </div>
            <h3 className="mt-3 font-display text-[26px] font-medium leading-[1.12] tracking-[-0.01em]">
              {t('savedTrip.whyTitlePre')}{' '}
              <span className="italic text-ember-700">{t('savedTrip.whyTitleItalic')}</span>
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {safeText(tripData.matchReason) || t('savedTrip.whyParagraphDefault', { city: safeText(trip.city) })}
            </p>
          </div>
          <div className="grid sm:grid-cols-3">
            {reasons.map((r, i) => {
              const IconEl = r.icon;
              return (
                <div
                  key={r.title}
                  className={['px-0 py-1 sm:px-7', i > 0 ? 'sm:border-l sm:border-sand-200' : ''].join(' ')}
                >
                  <span className="grid h-[42px] w-[42px] place-items-center rounded-[12px] bg-ember-50 text-ember-700">
                    <IconEl size={20} />
                  </span>
                  <div className="mt-3.5 text-[15px] font-semibold text-text-main">{r.title}</div>
                  <div className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{r.detail}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FLIGHT ============ */}
      {(flightDetails.outbound || flightDetails.return) && (
        <SectionWrap
          id="vol"
          eyebrow={`${t('savedTrip.flightEyebrow')} · ${safeText(flightDetails.airline) || t('savedTrip.airlineFallback')}`}
          title={t('savedTrip.flightTitle')}
        >
          {[
            { leg: flightDetails.outbound, label: t('savedTrip.legOut'), date: slot.startDate || trip.startDate, fromFb: originLabel, toFb: destination.city || trip.city },
            { leg: flightDetails.return,   label: t('savedTrip.legReturn'), date: slot.endDate || trip.endDate, fromFb: destination.city || trip.city, toFb: originLabel },
          ].filter((f) => f.leg).map((f, i) => (
            <FlightTicket
              key={i}
              leg={f.leg}
              label={f.label}
              date={f.date}
              fromFb={f.fromFb}
              toFb={f.toFb}
              airline={flightDetails.airline}
              t={t}
              fmtDate={fmtDate}
              locale={locale}
            />
          ))}

          <div className="mt-4 grid items-center gap-6 rounded-[16px] border border-sand-200 bg-sand-50 px-6 py-5 md:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">{t('savedTrip.flightTotal')}</div>
                <div className="mt-1 flex items-baseline gap-3 font-display text-4xl font-medium leading-none">
                  {fmtCurrency(flightDetails.totalPrice || pricing.flight || 0)}
                </div>
              </div>
              <div className="max-w-md text-[13px] text-text-secondary">
                {safeText(flightDetails.cabinClass) || t('savedTrip.cabinFallback')} ·{' '}
                <a href={primaryBookingUrl} target="_blank" rel="noopener noreferrer" className="border-b border-current text-ember-700">
                  {t('savedTrip.flightAddBag')}
                </a>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(generateFlightLink({
                  destinationCity: safeText(trip.city),
                  destinationIata: destination.iataCode,
                  destinationCountry: safeText(trip.country),
                  startDate: trip.startDate,
                  endDate: trip.endDate,
                  adults: 1,
                }), '_blank', 'noopener,noreferrer')}
              >
                {t('savedTrip.otherFlights')}
              </Button>
              <Button
                variant="primary"
                icon={<Plane size={16} />}
                iconRight={<ExternalLink size={14} />}
                onClick={() => window.open(
                  flightDetails.bookingUrl ? wrapAffiliate(flightDetails.bookingUrl, 'skyscanner') : primaryBookingUrl,
                  '_blank', 'noopener,noreferrer'
                )}
              >
                {t('savedTrip.bookFlight')}
              </Button>
            </div>
          </div>
        </SectionWrap>
      )}

      {/* ============ HOTEL ============ */}
      {hotel && (
        <SectionWrap
          id="hôtel"
          eyebrow={`${t('savedTrip.hotelEyebrow')} · ${t('savedTrip.nights', { count: duration })}`}
          title={t('savedTrip.hotelTitle')}
          subtitle={safeText(hotel.location) || `${safeText(trip.city)}, ${safeText(trip.country)}`}
        >
          <HotelCard
            hotel={hotel}
            gallery={hotelGallery}
            duration={duration}
            pricing={pricing}
            trip={trip}
            t={t}
            fmtCurrency={fmtCurrency}
          />
        </SectionWrap>
      )}

      {/* ============ ITINERARY ============ */}
      <section id="jours" className="border-t border-sand-200 bg-sand-100">
        <div className="mx-auto max-w-[1280px] px-5 pb-6 pt-16 sm:px-8 lg:px-20 lg:pt-20">
          <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <Eyebrow>
                {t('savedTrip.itineraryEyebrow', { days: duration })}
              </Eyebrow>
              <h2 className="mt-2 font-display font-medium leading-none tracking-[-0.02em]" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>
                {t('savedTrip.itineraryTitlePre', { count: duration })}{' '}
                <span className="italic text-ember-700">{safeText(trip.city)}</span>
              </h2>
            </div>
          </div>

          {itineraryLoading ? (
            <div className="mt-8 rounded-[20px] border border-sand-200 bg-white p-10 text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-ember-600" />
              <h3 className="font-display text-2xl font-medium text-text-main">{t('savedTrip.buildingItinerary')}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">{t('savedTrip.buildingItineraryDesc')}</p>
            </div>
          ) : itinerary && itinerary.length > 0 ? (
            <>
              <DayStrip
                days={itinerary}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                t={t}
                fmtCurrency={fmtCurrency}
                fallbackPhoto={fallbackDayPhoto}
              />
              <div className="mt-8">
                <MagazineDay
                  day={itinerary[selectedDay]}
                  index={selectedDay}
                  total={itinerary.length}
                  t={t}
                  fmtCurrency={fmtCurrency}
                  city={safeText(trip.city)}
                  fallbackPhoto={fallbackDayPhoto}
                />
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-[20px] border border-dashed border-sand-300 bg-white p-10 text-center">
              <p className="text-sm text-text-secondary">{t('savedTrip.itineraryEmpty')}</p>
            </div>
          )}
        </div>
      </section>

      {/* ============ BOTTOM TIER: packing + weather + events ============ */}
      <SectionWrap id="météo" eyebrow={t('savedTrip.contextEyebrow')} title={t('savedTrip.contextTitle')}>
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.85fr_1.4fr]">
          <PackingCard packing={packing} t={t} />
          <WeatherCard weather={weather} itinerary={itinerary} duration={duration} t={t} />
          <EventsCard events={events} t={t} fmtDate={fmtDate} />
        </div>
      </SectionWrap>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-sand-200 bg-surface-subtle">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-3 px-5 py-8 text-xs text-text-secondary sm:flex-row sm:items-center sm:px-8 lg:px-20">
          <span>© {new Date().getFullYear()} Skusku · {t('savedTrip.footerTagline')}</span>
          <div className="flex gap-6">
            <a href="/privacy">{t('savedTrip.footerPrivacy')}</a>
            <a href="/terms">{t('savedTrip.footerTerms')}</a>
            <a href="mailto:hello@skusku.life">{t('savedTrip.footerSupport')}</a>
          </div>
        </div>
      </footer>

      {/* Invite Friends Modal — unchanged behaviour, restyled shell */}
      {showInviteModal && (
        <InviteModal
          t={t}
          inviteEmails={inviteEmails}
          currentEmail={currentEmail}
          setCurrentEmail={setCurrentEmail}
          addInviteEmail={addInviteEmail}
          removeInviteEmail={removeInviteEmail}
          inviteError={inviteError}
          inviting={inviting}
          handleInviteFriends={handleInviteFriends}
          close={() => {
            setShowInviteModal(false);
            setInviteEmails([]);
            setCurrentEmail('');
            setInviteError(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Sub-components
   ============================================================ */

function HeroChip({ icon: IconEl, children, disabled, spinning, iconOnly, trail, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60',
        iconOnly ? 'p-2.5' : 'px-4 py-2',
      ].join(' ')}
    >
      <IconEl size={14} className={spinning ? 'animate-spin' : ''} />
      {!iconOnly && children}
      {trail}
    </button>
  );
}

function Pillet({ icon: IconEl, children }) {
  return (
    <span className="inline-flex items-center gap-2">
      <IconEl size={15} className="text-white/70" />
      {children}
    </span>
  );
}

function Eyebrow({ children, className = '' }) {
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700 ${className}`}>
      {children}
    </span>
  );
}

function SectionWrap({ id, eyebrow, title, subtitle, children }) {
  return (
    <section id={id} className="bg-surface-subtle">
      <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:px-20 lg:py-20">
        <div className="mb-8">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-2 font-display font-medium leading-[1.05] tracking-[-0.015em]" style={{ fontSize: 'clamp(28px, 3.5vw, 40px)' }}>
            {title}
          </h2>
          {subtitle && <div className="mt-1.5 text-sm text-text-secondary">{subtitle}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

function StickySummary({ show, trip, pricing, dateRangeLabel, duration, bookingUrl, fmtCurrency }) {
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[95] border-b border-sand-200 bg-white shadow-[0_8px_24px_rgba(26,22,18,.06)] transition-all duration-300"
      style={{
        transform: show ? 'translateY(0)' : 'translateY(-100%)',
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
      }}
    >
      <div className="mx-auto grid h-[60px] max-w-[1280px] grid-cols-[auto_1fr_auto_auto] items-center gap-6 px-5 sm:px-8 lg:px-20">
        <div className="flex items-center gap-3">
          <PhotoBlock
            city={safeText(trip.city)}
            country={safeText(trip.country)}
            tripData={trip.tripData}
            className="h-9 w-9 rounded-[10px]"
            overlay={false}
            alt=""
          />
          <div>
            <div className="font-display text-[18px] font-medium leading-none">{safeText(trip.city)}</div>
            <div className="mt-1 text-[11px] text-text-secondary">{dateRangeLabel} · {duration}j</div>
          </div>
        </div>
        <div className="hidden justify-center gap-1 md:flex">
          <a href="#vol" className="sk-tab-pill">Vol</a>
          <a href="#hôtel" className="sk-tab-pill">Hôtel</a>
          <a href="#jours" className="sk-tab-pill is-active">Itinéraire</a>
          <a href="#météo" className="sk-tab-pill">Contexte</a>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary">Total</div>
          <div className="font-display text-[22px] font-medium leading-none">{fmtCurrency(pricing.total || 0)}</div>
        </div>
        <button
          onClick={() => window.open(bookingUrl, '_blank', 'noopener,noreferrer')}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-ember-600 px-5 text-sm font-semibold text-white shadow-2 transition-colors hover:bg-ember-700"
        >
          <Ticket size={16} />
          Tout réserver
        </button>
      </div>
    </div>
  );
}

function FlightTicket({ leg, label, date, fromFb, toFb, airline, t, fmtDate, locale }) {
  const fromCode = leg.departureAirport || leg?.segments?.[0]?.departureAirport || '—';
  const toCode = leg.arrivalAirport || leg?.segments?.[leg?.segments?.length - 1]?.arrivalAirport || '—';
  const depTime = fmtRaw(leg.departureTime, locale) || '—';
  const arrTime = fmtRaw(leg.arrivalTime, locale) || '—';
  const dur = computeDuration(leg) || '—';
  const stops = stopsLabel(leg, t);
  const dateLabel = date ? fmtDate(date, { weekday: 'long', day: 'numeric', month: 'short' }) : '';
  const carrier = safeText(airline) || '';

  return (
    <div className="mb-3 grid items-center gap-7 rounded-[16px] border border-sand-200 bg-white p-5 shadow-1 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto] md:px-6">
      <div className="min-w-[130px]">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ember-700">
          <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
          {label}
        </div>
        <div className="mt-1.5 text-[15px] font-semibold text-text-main">{dateLabel}</div>
        {leg.flightNumber && (
          <div className="mt-0.5 font-mono text-[11px] text-text-secondary">{safeText(leg.flightNumber)}</div>
        )}
      </div>

      <div>
        <div className="font-mono text-[30px] font-medium leading-none text-text-main">{depTime}</div>
        <div className="mt-1 font-display text-[20px] font-medium text-text-main">{fromCode}</div>
        <div className="text-xs text-text-secondary">{safeText(leg.departureCity) || safeText(fromFb)}</div>
      </div>

      <div className="flex flex-col items-center gap-2 pt-1.5">
        <div className="whitespace-nowrap font-mono text-[11px] font-medium tracking-wide text-text-secondary">
          {dur}{stops ? ` · ${stops}` : ''}
        </div>
        <div className="relative flex w-full items-center">
          <span className="h-2 w-2 shrink-0 rounded-full bg-ember-600" />
          <span className="flex-1 border-t border-dashed border-sand-400" />
          <span className="-mx-0.5 text-ember-700"><Plane size={20} /></span>
          <span className="flex-1 border-t border-dashed border-sand-400" />
          <span className="h-2 w-2 shrink-0 rounded-full bg-ember-600" />
        </div>
        <div className="text-[11px] text-text-secondary">{carrier || t('savedTrip.airlineFallback')}</div>
      </div>

      <div>
        <div className="font-mono text-[30px] font-medium leading-none text-text-main">{arrTime}</div>
        <div className="mt-1 font-display text-[20px] font-medium text-text-main">{toCode}</div>
        <div className="text-xs text-text-secondary">{safeText(leg.arrivalCity) || safeText(toFb)}</div>
      </div>

      <div className="grid h-14 w-14 place-items-center rounded-[12px] border border-sand-200 bg-sand-100 font-display text-[20px] italic text-ember-700">
        {carrier ? carrier.slice(0, 2).toUpperCase() : 'FR'}
      </div>
    </div>
  );
}

function HotelCard({ hotel, gallery, duration, pricing, trip, t, fmtCurrency }) {
  const hotelPrice = hotel.price?.amount || pricing.hotel || (hotel.pricePerNight ? hotel.pricePerNight * duration : 0);
  const perNight = hotel.pricePerNight || (hotelPrice ? Math.round(hotelPrice / duration) : 0);
  const photo = gallery[0];
  const thumbs = gallery.slice(1, 4);

  return (
    <div className="grid gap-0 overflow-hidden rounded-[22px] border border-sand-200 bg-white shadow-2 lg:grid-cols-[1.15fr_1fr]">
      <div className="relative min-h-[420px] bg-sand-200">
        {photo ? (
          <img src={photo} alt={safeText(hotel.name)} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-sand-100 text-sand-400">
            <Hotel size={48} />
          </div>
        )}
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          {hotel.rating?.value && <Badge tone="gold" dot>{safeText(hotel.rating.value)}/10 · {t('savedTrip.hotelExceptional')}</Badge>}
          {(hotel.cancellation === 'free' || hotel.freeCancellation) && <Badge tone="moss" dot>{t('savedTrip.hotelFreeCancel')}</Badge>}
        </div>
        {thumbs.length > 0 && (
          <div className="absolute bottom-5 right-5 flex gap-2">
            {thumbs.map((g, i) => (
              <img
                key={i}
                src={g}
                alt=""
                className="h-16 w-[88px] rounded-[10px] object-cover shadow-[0_4px_12px_rgba(0,0,0,.3)]"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-between p-8 md:p-10">
        <div>
          {typeof hotel.stars === 'number' && hotel.stars > 0 && (
            <div className="flex gap-1 text-gold-500">
              {Array.from({ length: Math.min(5, Math.floor(hotel.stars)) }).map((_, i) => (
                <Star key={i} size={14} fill="currentColor" />
              ))}
            </div>
          )}
          <h3 className="mt-3 font-display text-[32px] font-medium leading-[1.05] tracking-[-0.01em] text-text-main md:text-[36px]">
            {safeText(hotel.name)}
          </h3>
          {hotel.location && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-text-secondary">
              <MapPin size={14} /> {safeText(hotel.location)}
            </div>
          )}
          {hotel.description && (
            <p className="mt-4 text-sm leading-relaxed text-text-secondary line-clamp-3">
              {safeText(hotel.description)}
            </p>
          )}
          {hotel.amenities?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {hotel.amenities.slice(0, 5).map((amenity, i) => {
                const text = safeText(amenity);
                if (!text) return null;
                return <Badge key={i} tone="neutral">{text}</Badge>;
              })}
            </div>
          )}
        </div>

        <hr className="my-7 border-t border-sand-200" />

        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
              {t('savedTrip.nightsTotal', { count: duration })}
            </div>
            <div className="mt-1 font-display text-[36px] font-medium leading-none">
              {fmtCurrency(hotelPrice)}
            </div>
            {perNight > 0 && (
              <div className="mt-1 font-mono text-[12px] text-text-secondary">
                ~ {fmtCurrency(perNight)} {t('savedTrip.perNightShort')} · {t('savedTrip.taxesIncluded')}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(generateHotelLink({
                city: safeText(trip.city),
                country: safeText(trip.country),
                startDate: trip.startDate,
                endDate: trip.endDate,
                adults: 1,
              }), '_blank', 'noopener,noreferrer')}
            >
              {t('savedTrip.otherHotels', { city: safeText(trip.city) })}
            </Button>
            <Button
              variant="primary"
              icon={<Hotel size={16} />}
              iconRight={<ExternalLink size={14} />}
              onClick={() => window.open(
                hotel.bookingUrl
                  ? wrapAffiliate(hotel.bookingUrl, 'booking')
                  : generateHotelLink({
                      city: safeText(trip.city),
                      country: safeText(trip.country),
                      startDate: trip.startDate,
                      endDate: trip.endDate,
                      adults: 1,
                    }),
                '_blank', 'noopener,noreferrer'
              )}
            >
              {t('savedTrip.bookHotel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayStrip({ days, selectedDay, setSelectedDay, t, fmtCurrency, fallbackPhoto }) {
  return (
    <div className="-mx-5 mt-8 flex gap-3 overflow-x-auto px-5 pb-2 sm:-mx-0 sm:px-0 lg:grid lg:grid-cols-7 lg:gap-3">
      {days.map((d, idx) => {
        const active = idx === selectedDay;
        const dayNum = d.day || idx + 1;
        const dayBudget = d.totalCost || d.budget || 0;
        const dayDate = d.date ? new Date(d.date) : null;
        return (
          <button
            key={idx}
            onClick={() => setSelectedDay(idx)}
            className={['sk-day-card overflow-hidden rounded-[16px] border border-sand-200 bg-white text-left lg:w-auto', active ? 'is-active' : ''].join(' ')}
            style={{ minWidth: 200 }}
          >
            <div className="sk-photo-scrim relative h-[110px] bg-sand-200">
              {(d.photo || fallbackPhoto) ? (
                <img src={d.photo || fallbackPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              ) : null}
              <span
                className="absolute left-3 top-2.5 font-display text-[22px] font-medium leading-none text-white"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,.4)' }}
              >
                {t('savedTrip.dayLabel', { n: dayNum })}
              </span>
            </div>
            <div className="px-3.5 pb-3.5 pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                {dayDate ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(dayDate) : `J${dayNum}`}
              </div>
              <div className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-text-main">
                {safeText(d.theme) || safeText(d.title) || t('savedTrip.dayUntitled')}
              </div>
              <div className="mt-2.5 flex gap-2.5 font-mono text-[11px] text-text-secondary">
                {d.walkingDistance && <span>{safeText(d.walkingDistance)}</span>}
                {d.walkingDistance && dayBudget ? <span className="text-sand-300">·</span> : null}
                {dayBudget ? <span>{fmtCurrency(dayBudget)}</span> : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MagazineDay({ day, index, total, t, fmtCurrency, city, fallbackPhoto }) {
  if (!day) return null;
  const dayNum = day.day || index + 1;
  const dayDate = day.date ? new Date(day.date) : null;
  const intro = safeText(day.intro) || safeText(day.summary) || safeText(day.theme);
  const highlights = (day.highlights || []).map(safeText).filter(Boolean);
  const dayBudget = day.totalCost || day.budget || 0;

  return (
    <div className="grid items-start gap-7 lg:grid-cols-2">
      {/* Left — photo + intro */}
      <div>
        <div className="sk-photo-scrim relative h-[460px] overflow-hidden rounded-[22px] bg-sand-200 lg:h-[540px]">
          {(day.photo || fallbackPhoto) ? (
            <img src={day.photo || fallbackPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          ) : null}
          <div className="absolute left-7 top-6 inline-flex items-center gap-2.5">
            <span className="rounded-full bg-ember-700/70 px-3 py-1 font-display text-[16px] font-medium italic text-white backdrop-blur">
              {t('savedTrip.dayOf', { n: dayNum, total })}
            </span>
          </div>
          <div className="absolute bottom-6 left-7 right-7 text-white">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90" style={{ textShadow: '0 1px 8px rgba(26,22,18,.6)' }}>
              {dayDate ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dayDate) : `${t('savedTrip.dayLabel', { n: dayNum })}`}
              {day.weather ? ` · ${safeText(day.weather.condition || day.weather.label)} ${day.weather.temp_c || day.weather.c || ''}°C` : ''}
            </div>
            <h3
              className="mt-2 font-display text-[34px] font-medium leading-[1.05] tracking-[-0.015em] md:text-[40px]"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,.35)' }}
            >
              {safeText(day.theme) || safeText(day.title) || t('savedTrip.dayUntitled')}
            </h3>
          </div>
        </div>

        {intro && (
          <p className="sk-drop-cap mt-7 text-base leading-[1.7] text-text-secondary">{intro}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {highlights.slice(0, 4).map((tg) => (
            <Badge key={tg} tone="clay">{tg}</Badge>
          ))}
          <span className="ml-auto flex items-center gap-4 font-mono text-xs text-text-secondary">
            {day.walkingDistance && (
              <span className="inline-flex items-center gap-1.5">
                <Footprints size={13} /> {safeText(day.walkingDistance)}
              </span>
            )}
            {dayBudget > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Euro size={13} /> {fmtCurrency(dayBudget)}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Right — program rail */}
      <div className="sk-rail pl-1">
        {(day.schedule || []).map((step, i) => (
          <ProgramStep key={i} step={step} t={t} />
        ))}
        <div className="ml-9 mt-3 flex items-center justify-between rounded-[14px] bg-ember-900 px-5 py-4 text-white">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {t('savedTrip.endOfDay')}
            </div>
            <div className="mt-1 font-display text-[22px] font-medium italic">
              {t('savedTrip.backToHotel', { city })}
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium text-white">
            <Edit3 size={12} />
            {t('savedTrip.adjustDay')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgramStep({ step, t }) {
  const IconEl = iconForActivityType(step.type);
  return (
    <div className="grid grid-cols-[24px_1fr] gap-3.5 py-2.5">
      <div className="sk-rail-dot">
        <IconEl size={12} />
      </div>
      <div className="ml-2 rounded-[12px] border border-sand-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2.5 whitespace-nowrap">
              <span className="font-mono text-[13px] font-semibold text-ember-700">{safeText(step.time)}</span>
              {step.duration && <span className="text-[11px] text-text-secondary">· {safeText(step.duration)}</span>}
            </div>
            <div className="mt-1 text-[15px] font-semibold text-text-main">{safeText(step.activity) || safeText(step.title)}</div>
            {step.location && (
              <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-text-secondary">
                <MapPin size={12} />{safeText(step.location)}
              </div>
            )}
          </div>
          {(step.cost || step.cost === 0) && (
            <span className="whitespace-nowrap font-mono text-[13px] font-semibold text-text-main">
              {step.cost === 0 ? t('savedTrip.free') : formatEUR(step.cost)}
            </span>
          )}
        </div>
        {step.tips && (
          <div className="mt-2.5 text-[13px] leading-[1.55] text-text-secondary">{safeText(step.tips)}</div>
        )}
        {step.transport && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sand-50 px-2.5 py-1 font-mono text-[11px] text-text-secondary">
            <Footprints size={11} />{safeText(step.transport)}
          </div>
        )}
      </div>
    </div>
  );
}

function PackingCard({ packing, t }) {
  const items = packing ? [
    ...((packing.essentials || []).slice(0, 3).map((i) => ({ label: safeText(i), done: false }))),
    ...((packing.clothing || []).slice(0, 3).map((i) => ({ label: safeText(i), done: false }))),
    ...((packing.activityItems || []).slice(0, 2).map((i) => ({ label: safeText(i), done: false }))),
  ].filter((x) => x.label) : [];

  return (
    <div className="rounded-[22px] border border-sand-200 bg-white p-6 shadow-1">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow>{t('savedTrip.packEyebrow')}</Eyebrow>
          <h3 className="mt-1.5 text-xl font-semibold">{t('savedTrip.packTitleEditorial')}</h3>
        </div>
        {items.length > 0 && (
          <span className="font-mono text-xs text-text-secondary">{items.filter((p) => p.done).length}/{items.length}</span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="mt-4 text-sm text-text-secondary">{t('savedTrip.packLoading')}</div>
      ) : (
        <ul className="m-0 mt-4 list-none p-0">
          {items.map((p, i) => (
            <li
              key={i}
              className={['flex items-center gap-3 py-2.5 text-sm', i > 0 ? 'border-t border-sand-200' : '', p.done ? 'text-text-secondary line-through' : 'text-text-main'].join(' ')}
            >
              <span
                className={['grid h-[18px] w-[18px] place-items-center rounded-[5px] text-white', p.done ? 'border-[1.5px] border-moss-500 bg-moss-500' : 'border-[1.5px] border-sand-300'].join(' ')}
              >
                {p.done && <CheckCircle2 size={11} />}
              </span>
              <span className="flex-1">{p.label}</span>
            </li>
          ))}
        </ul>
      )}
      {packing?.tip && (
        <div className="mt-4 rounded-[10px] bg-gold-100 p-3.5 text-xs leading-relaxed text-[#7a5c1a]">
          <strong>{t('savedTrip.packTipLabel')}</strong> {safeText(packing.tip)}
        </div>
      )}
    </div>
  );
}

function WeatherCard({ weather, itinerary, duration, t }) {
  const days = (weather?.forecast || []).slice(0, Math.max(1, duration));
  const avg = days.length
    ? Math.round(days.reduce((sum, d) => sum + (d.day?.avgtemp_c || d.day?.maxtemp_c || 0), 0) / days.length)
    : null;
  const current = weather?.current;

  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-[22px] bg-sand-900 p-6 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="none">
          <circle cx="160" cy="50" r="40" fill="var(--gold-500)" />
          <circle cx="60" cy="180" r="60" fill="var(--ember-700)" />
        </svg>
      </div>
      <div className="relative">
        <Eyebrow className="!text-gold-500">{t('savedTrip.weatherEyebrow')}</Eyebrow>
        <div className="mt-3 font-display text-[56px] font-medium leading-none">
          {current ? `${Math.round(current.temp_c)}°C` : avg ? `${avg}°C` : '—'}
        </div>
        <div className="mt-1.5 text-sm text-white/70">
          {current?.condition || t('savedTrip.weatherFallback')}
        </div>
        <hr className="my-5 border-t border-white/15" />
        <div className="grid grid-cols-7 gap-1">
          {(itinerary && itinerary.length > 0 ? itinerary : Array.from({ length: Math.min(7, duration) })).slice(0, 7).map((d, i) => {
            const dayWeather = days[i] || (d?.weather ? { day: { avgtemp_c: d.weather.temp_c || d.weather.c } } : null);
            const temp = dayWeather?.day?.avgtemp_c || dayWeather?.day?.maxtemp_c;
            const IconEl = weatherIcon(dayWeather?.day?.condition?.text || d?.weather?.condition);
            return (
              <div key={i} className="text-center">
                <div className="font-mono text-[10px] text-white/50">J{i + 1}</div>
                <div className="mt-1 text-gold-500"><IconEl size={16} className="mx-auto" /></div>
                <div className="mt-1 font-mono text-[11px]">{temp ? `${Math.round(temp)}°` : '—'}</div>
              </div>
            );
          })}
        </div>
        {avg && (
          <div className="mt-5 text-xs leading-relaxed text-white/55">
            {t('savedTrip.weatherAvgFooter', { avg })}
          </div>
        )}
      </div>
    </div>
  );
}

function EventsCard({ events, t, fmtDate }) {
  const list = [
    ...((events?.upcoming || []).slice(0, 3)),
    ...((events?.regular || []).slice(0, Math.max(0, 3 - (events?.upcoming?.length || 0)))),
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-[22px] border border-sand-200 bg-white shadow-1">
      <div className="px-6 pt-6 pb-1">
        <Eyebrow>{t('savedTrip.eventsEyebrow')}</Eyebrow>
        <h3 className="mt-1.5 text-xl font-semibold">{t('savedTrip.eventsTitle')}</h3>
      </div>
      <div className="flex-1 px-6 pb-6 pt-3">
        {list.length === 0 ? (
          <div className="grid h-full place-items-center py-6 text-center text-sm text-text-secondary">
            <div>
              <PartyPopper className="mx-auto mb-2 h-6 w-6 text-sand-400" />
              {t('savedTrip.eventsEmpty')}
            </div>
          </div>
        ) : (
          list.map((e, i) => {
            const date = e.startDate || e.date;
            const dateLabel = date ? fmtDate(date, { day: 'numeric', month: 'short' }) : safeText(e.dates);
            return (
              <div
                key={i}
                className={['grid grid-cols-[84px_1fr_auto] items-center gap-4 py-3.5', i > 0 ? 'border-t border-sand-200' : ''].join(' ')}
              >
                <div className="h-16 w-[84px] overflow-hidden rounded-[10px] bg-sand-200">
                  {e.photo && <img src={e.photo} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div>
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ember-700">
                    {dateLabel}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">{safeText(e.title) || safeText(e.name)}</div>
                  <div className="mt-1 line-clamp-2 max-w-md text-xs text-text-secondary">
                    {safeText(e.description) || safeText(e.body)}
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-secondary" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function InviteModal({
  t, inviteEmails, currentEmail, setCurrentEmail, addInviteEmail,
  removeInviteEmail, inviteError, inviting, handleInviteFriends, close,
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-sand-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[20px] border border-sand-200 bg-white p-6 shadow-3">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-2xl font-medium text-text-main">{t('savedTrip.inviteFriends')}</h3>
          <button onClick={close} className="rounded-[10px] p-2 transition-colors hover:bg-sand-100">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{t('savedTrip.inviteIntro')}</p>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">{t('savedTrip.emailLabel')}</label>
            <input
              type="email"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              onKeyDown={addInviteEmail}
              placeholder={t('savedTrip.emailPlaceholder')}
              className="w-full rounded-[10px] border border-sand-200 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-ember-600"
            />
            <p className="mt-1 text-xs text-text-secondary">{t('savedTrip.emailHint')}</p>
          </div>
          {inviteEmails.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-main">{t('savedTrip.invitations', { count: inviteEmails.length })}</p>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {inviteEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between rounded-[10px] bg-ember-50 p-2">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-ember-700" />
                      <span className="text-sm text-text-main">{email}</span>
                    </div>
                    <button onClick={() => removeInviteEmail(email)} className="rounded p-1 transition-colors hover:bg-ember-100">
                      <X size={16} className="text-ember-700" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {inviteError && (
            <div className="flex items-start gap-2 rounded-[10px] bg-clay-100 p-3">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-clay-500" />
              <p className="text-sm text-[#7a3a25]">{inviteError}</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" size="md" full disabled={inviting} onClick={close}>
            {t('savedTrip.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            full
            onClick={handleInviteFriends}
            disabled={inviting || inviteEmails.length === 0}
            icon={inviting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          >
            {inviting ? t('savedTrip.sending') : t('savedTrip.sendInvites')}
          </Button>
        </div>
      </div>
    </div>
  );
}
