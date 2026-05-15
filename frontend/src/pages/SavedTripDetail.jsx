// frontend/src/pages/SavedTripDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Plane,
  Hotel,
  Sparkles,
  Users,
  Loader2,
  AlertCircle,
  Trash2,
  UserPlus,
  X,
  Mail,
  Send,
  Backpack,
  CheckCircle2,
  Bell,
  Download,
} from 'lucide-react';
import { CompleteTripPlanCard, PersonalizedItineraryCard, LocalEventsCard } from '../components/TripEnhancementComponents';
import { generateFlightLink, generateHotelLink, generateActivitiesLink } from '../utils/bookingLinks';
import { Badge, Button, PhotoBlock, EmptyState } from '../components/ui';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../i18n/format';

// Build a warm, human-readable flight sentence (spec Étape 5). Locale-aware:
// FR renders "22 h 15", other locales use the locale's own time format.
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

const flightSentence = (leg, fromFallback, toFallback, t, locale) => {
  if (!leg) return null;
  const dep = fmtClock(leg.departureTime, locale);
  const arr = fmtClock(leg.arrivalTime, locale);
  const depPlace = leg.departureAirport || fromFallback || t('savedTrip.fsDepFallback');
  const arrPlace = leg.arrivalAirport || toFallback || t('savedTrip.fsArrFallback');
  let nextDay = false;
  if (leg.departureTime && leg.arrivalTime) {
    const d1 = new Date(leg.departureTime);
    const d2 = new Date(leg.arrivalTime);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      nextDay = d2 > d1 && d2.toDateString() !== d1.toDateString();
    }
  }
  const stops = Array.isArray(leg.segments)
    ? Math.max(0, leg.segments.length - 1)
    : (typeof leg.stops === 'number' ? leg.stops : null);
  let stopPart = '';
  if (stops === 0) stopPart = t('savedTrip.fsDirect');
  else if (stops === 1) stopPart = t('savedTrip.fsOneStop');
  else if (stops > 1) stopPart = t('savedTrip.fsStops', { count: stops });
  const first = `${t('savedTrip.fsDepart')} ${depPlace}${dep ? ` ${dep}` : ''}, ${t('savedTrip.fsArrive')} ${arrPlace}${nextDay ? ` ${t('savedTrip.fsNextDay')}` : ''}${arr ? ` ${arr}` : ''}.`;
  const durBit = leg.duration ? `${leg.duration} ${t('savedTrip.fsTotal')}` : '';
  let second = '';
  if (stopPart && durBit) second = ` ${stopPart}, ${durBit}.`;
  else if (stopPart) second = ` ${stopPart}.`;
  else if (durBit) second = ` ${durBit}.`;
  return `${first}${second}`;
};

const flightMono = (leg, locale) => {
  if (!leg) return null;
  const from = leg.departureAirport;
  const to = leg.arrivalAirport;
  const rawDep = fmtRaw(leg.departureTime, locale);
  const rawArr = fmtRaw(leg.arrivalTime, locale);
  const route = from && to ? `${from} → ${to}` : null;
  const times = rawDep && rawArr ? `${rawDep} – ${rawArr}` : null;
  return [route, times].filter(Boolean).join(' · ') || null;
};
// PDF imports are lazy-loaded in handleExportPdf to keep bundle small

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Utility function to safely extract text from potentially object values
const safeText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return value.word || value.value || value.name || value.text || value.label || JSON.stringify(value);
  }
  return String(value);
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

  useEffect(() => {
    fetchTripDetails();
  }, [id]);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/searches/trips/saved`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load trips');
      }

      const data = await response.json();
      const savedTrip = data.savedTrips?.find(t => t.id === id);

      if (!savedTrip) {
        throw new Error('Trip not found');
      }

      setTrip(savedTrip);
    } catch (err) {
      console.error('Error fetching trip:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addInviteEmail = (e) => {
    if (e.key === 'Enter' && currentEmail.trim()) {
      e.preventDefault();
      const email = currentEmail.trim().toLowerCase();

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setInviteError(t('savedTrip.errInvalidEmail'));
        return;
      }

      // Check for duplicates
      if (inviteEmails.includes(email)) {
        setInviteError(t('savedTrip.errEmailDup'));
        return;
      }

      // In development, allow self-invite for testing (Resend sandbox)
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

  const removeInviteEmail = (email) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };

  const handleInviteFriends = async () => {
    // Convert to group trip first, then send invitations
    if (inviteEmails.length === 0) {
      setInviteError(t('savedTrip.errAddEmail'));
      return;
    }

    try {
      setInviting(true);
      setInviteError(null);

      // Step 1: Convert to group trip
      const token = await getToken();
      const convertResponse = await fetch(`${API_URL}/api/trips/from-saved/${trip.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!convertResponse.ok) {
        const errorData = await convertResponse.json();
        throw new Error(errorData.error || 'Failed to convert trip');
      }

      const convertData = await convertResponse.json();
      const groupTripId = convertData.data?.id;

      if (!groupTripId) {
        console.error('Convert response:', convertData);
        throw new Error('Group trip ID not found in response');
      }

      // Step 2: Send invitations
      const inviteResponse = await fetch(`${API_URL}/api/trips/${groupTripId}/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: inviteEmails,
        }),
      });

      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json();
        throw new Error(errorData.error || 'Failed to send invitations');
      }

      // Success - navigate to group trip
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
      // Fetch itinerary and packing data for PDF
      const token = await getToken();
      const [itineraryRes, packingRes] = await Promise.all([
        fetch(`${API_URL}/api/trips/${trip.id}/itinerary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/trips/${trip.id}/packing`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let itinerary = null;
      let packing = null;

      if (itineraryRes.ok) {
        const data = await itineraryRes.json();
        itinerary = data.data?.itinerary;
      }
      if (packingRes.ok) {
        const data = await packingRes.json();
        packing = data.data?.packing;
      }

      if (!itinerary || itinerary.length === 0) {
        setActionError(t('savedTrip.errPdfPending'));
        return;
      }

      const userName = user?.firstName || t('savedTrip.voyagerFallback');
      // Dynamic import to keep PDF renderer out of main bundle
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <EmptyState
          className="max-w-md"
          icon={<AlertCircle size={24} />}
          title={t('savedTrip.notFoundTitle')}
          sub={t('savedTrip.notFoundSub')}
          action={{
            label: t('savedTrip.back'),
            variant: 'outline',
            onClick: () => navigate('/dashboard'),
          }}
        />
      </div>
    );
  }

  const tripData = trip.tripData || {};
  const destination = tripData.destination || {};
  const pricing = tripData.pricing || {};
  const slot = tripData.slot || {};
  const flightDetails = tripData.flightDetails || {};
  const hotelOptions = tripData.hotelOptions || {};
  const duration = Math.max(1, trip.startDate && trip.endDate
    ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
    : slot.duration || 1);
  const primaryBookingUrl = flightDetails.bookingUrl || generateFlightLink({
    destinationCity: safeText(trip.city),
    destinationIata: destination.iataCode,
    destinationCountry: safeText(trip.country),
    startDate: trip.startDate,
    endDate: trip.endDate,
    adults: 1,
  });

  return (
    <div className="min-h-screen bg-surface-subtle">
      {actionError && (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-clay-500 px-5 py-3 text-sm font-medium text-white shadow-2">
          <AlertCircle size={16} /> {actionError}
          <button onClick={() => setActionError(null)} className="ml-2 hover:opacity-80">×</button>
        </div>
      )}
      <section className="relative h-[430px] overflow-hidden">
        <PhotoBlock
          city={safeText(trip.city)}
          country={safeText(trip.country)}
          tripData={trip.tripData}
          className="absolute inset-0 h-full w-full"
          imgClassName="h-full"
          alt={`${safeText(trip.city)}, ${safeText(trip.country)}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sand-900 via-sand-900/70 to-sand-900/10" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-10 text-white sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="absolute left-4 top-6 flex items-center gap-2 rounded-full bg-white/14 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/22 sm:left-6 lg:left-8"
          >
            <ArrowLeft size={16} />
            {t('savedTrip.back')}
          </button>
          <Badge tone="ink" className="mb-5 w-fit bg-white/15 text-white">
            {t('savedTrip.soloBadge', { count: duration })}
          </Badge>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/65">{t('savedTrip.eyebrow')}</p>
              <h1 className="mt-2 font-display text-6xl font-medium leading-[0.94] md:text-[80px]">
                {safeText(trip.city)}, <span className="italic text-ember-200">{safeText(trip.country)}</span>
              </h1>
              <p className="mt-4 max-w-2xl text-white/78">
                {tripData.matchReason ? safeText(tripData.matchReason) : t('savedTrip.defaultIntro')}
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-sm text-white/65">
                {trip.startDate
                  ? fmtDate(trip.startDate, { day: 'numeric', month: 'short' })
                  : t('savedTrip.dateTBD')}
              </p>
              <p className="mt-1 font-display text-5xl font-medium">{fmtCurrency(pricing.total || 0)}</p>
              <p className="text-xs text-white/55">{t('savedTrip.totalEstimate')}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-30 border-b border-sand-200 bg-white/95 shadow-1 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex gap-5 overflow-x-auto text-sm">
            {[
              ['vol', t('savedTrip.tabFlight')],
              ['hôtel', t('savedTrip.tabHotel')],
              ['jours', t('savedTrip.tabDays')],
              ['météo', t('savedTrip.tabWeather')],
            ].map(([anchor, label], index) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className={`shrink-0 border-b-2 pb-1 font-medium ${index === 0 ? 'border-ember-700 text-text-main' : 'border-transparent text-text-secondary hover:text-text-main'}`}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInviteModal(true)} icon={<UserPlus size={15} />}>
              {t('savedTrip.invite')}
            </Button>
            <Button
              variant={alertCreated ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleCreatePriceAlert}
              disabled={creatingAlert || alertCreated}
              icon={creatingAlert ? <Loader2 size={15} className="animate-spin" /> : alertCreated ? <CheckCircle2 size={15} /> : <Bell size={15} />}
            >
              {alertCreated ? t('savedTrip.alertCreated') : t('savedTrip.priceTrack')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              icon={exportingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            >
              {t('savedTrip.export')}
            </Button>
            <Button
              size="sm"
              icon={<Plane size={15} />}
              onClick={() => window.open(primaryBookingUrl, '_blank', 'noopener,noreferrer')}
            >
              {t('savedTrip.bookAll')}
            </Button>
            <button
              onClick={handleDelete}
              className="grid h-8 w-8 place-items-center rounded-[10px] text-clay-500 transition-colors hover:bg-clay-100"
              title={t('savedTrip.deleteTrip')}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Flight Details — human sentence by default (spec Étape 5) */}
        {flightDetails && (flightDetails.outbound || flightDetails.return) && (
          <div id="vol" className="rounded-[14px] border border-sand-200 bg-white p-6 shadow-2">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">{t('savedTrip.flightEyebrow')}</p>
                <h2 className="mt-1 font-display text-2xl font-medium text-text-main">{t('savedTrip.flightTitle')}</h2>
              </div>
              {flightDetails.totalPrice && (
                <span className="font-display text-2xl font-medium text-text-main">
                  {fmtCurrency(flightDetails.totalPrice)}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {[
                { leg: flightDetails.outbound, label: t('savedTrip.legOut'), date: slot.startDate, fromFb: trip.city, toFb: destination.city || trip.city },
                { leg: flightDetails.return, label: t('savedTrip.legReturn'), date: slot.endDate, fromFb: destination.city || trip.city, toFb: trip.city },
              ].filter((f) => f.leg).map((f, i) => {
                const sentence = flightSentence(f.leg, f.fromFb, f.toFb, t, locale);
                const mono = flightMono(f.leg, locale);
                const dateLabel = f.date
                  ? fmtDate(f.date, { weekday: 'long', day: 'numeric', month: 'long' })
                  : null;
                return (
                  <div key={i} className="rounded-[12px] border border-sand-200 bg-sand-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          {f.label}{dateLabel ? ` · ${dateLabel}` : ''}
                        </p>
                        <p className="mt-2 text-base font-medium leading-relaxed text-text-main">
                          {sentence}
                        </p>
                        {mono && (
                          <p className="mt-2 font-mono text-[13px] text-text-secondary">{mono}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-sand-200 pt-3 text-xs text-text-secondary">
                      {f.leg.segments?.[0]?.carrierLogo && (
                        <img src={f.leg.segments[0].carrierLogo} alt={safeText(flightDetails.airline)} className="h-4 w-auto" />
                      )}
                      <span>{safeText(flightDetails.airline) || t('savedTrip.airlineFallback')} · {safeText(flightDetails.cabinClass) || t('savedTrip.cabinFallback')}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-sand-200 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(
                  flightDetails.bookingUrl || generateFlightLink({
                    destinationCity: safeText(trip.city),
                    destinationIata: destination.iataCode,
                    destinationCountry: safeText(trip.country),
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                    adults: 1,
                  }),
                  '_blank',
                  'noopener,noreferrer'
                )}
              >
                {t('savedTrip.otherFlights')}
              </Button>
            </div>
          </div>
        )}

        {/* Accommodation */}
        {(hotelOptions?.hotels?.length > 0 || pricing?.hotel) && (
          <div id="hôtel" className="rounded-[14px] border border-sand-200 bg-white p-6 shadow-2">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">{t('savedTrip.hotelEyebrow')}</p>
                <h2 className="mt-1 font-display text-2xl font-medium text-text-main">{t('savedTrip.hotelTitle')}</h2>
              </div>
              {pricing?.hotel && (
                <span className="font-display text-2xl font-medium text-text-main">
                  {fmtCurrency(pricing.hotel)}
                </span>
              )}
            </div>

            <div className="mb-4 flex items-center justify-between rounded-[12px] bg-sand-50 px-4 py-3">
              <span className="text-sm font-medium text-text-main">{t('savedTrip.nights', { count: duration })}</span>
              <span className="text-sm text-text-secondary">
                {t('savedTrip.perNight', { price: fmtCurrency(Math.round((pricing?.hotel || 0) / duration)) })}
              </span>
            </div>

            {hotelOptions?.hotels?.length > 0 && (
              <div className="space-y-3">
                {hotelOptions.hotels.slice(0, 3).map((hotel, idx) => {
                  const photo = hotel.mainPhoto || hotel.photos?.[0];
                  return (
                    <div key={idx} className="overflow-hidden rounded-[12px] border border-sand-200 transition-colors hover:border-ember-200">
                      {photo && (
                        <img
                          src={photo}
                          alt={safeText(hotel.name)}
                          className="h-36 w-full object-cover"
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-semibold text-text-main">{safeText(hotel.name)}</p>
                            <div className="mt-1 flex items-center gap-2">
                              {hotel.stars && (
                                <span className="text-xs text-gold-500">
                                  {'★'.repeat(typeof hotel.stars === 'number' ? hotel.stars : 0)}
                                </span>
                              )}
                              {hotel.rating?.value && (
                                <Badge tone="moss" dot>{safeText(hotel.rating.value)}/10</Badge>
                              )}
                              {hotel.location && (
                                <span className="flex items-center gap-1 text-xs text-text-secondary">
                                  <MapPin size={10} />
                                  {safeText(hotel.location)}
                                </span>
                              )}
                            </div>
                            {hotel.amenities?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {hotel.amenities.slice(0, 4).map((amenity, i) => {
                                  const text = typeof amenity === 'string' ? amenity : (amenity?.word || amenity?.value || amenity?.name || '');
                                  if (!text) return null;
                                  return (
                                    <span key={i} className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs text-text-secondary">
                                      {text}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-display text-xl font-medium text-text-main">
                              {fmtCurrency(Math.round(hotel.pricePerNight || hotel.price?.amount / duration || 0))}
                            </span>
                            <span className="block text-xs text-text-secondary">{t('savedTrip.perNightShort')}</span>
                          </div>
                        </div>
                        {hotel.bookingUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            icon={<Hotel size={14} />}
                            onClick={() => window.open(hotel.bookingUrl, '_blank', 'noopener,noreferrer')}
                          >
                            {t('savedTrip.hotelDetails')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => window.open(
                    generateHotelLink({
                      city: safeText(trip.city),
                      country: safeText(trip.country),
                      startDate: trip.startDate,
                      endDate: trip.endDate,
                      adults: 1,
                    }),
                    '_blank',
                    'noopener,noreferrer'
                  )}
                >
                  {t('savedTrip.otherHotels', { city: safeText(trip.city) })}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Activities & Highlights */}
        {destination.highlights && destination.highlights.length > 0 && (
          <div className="rounded-[14px] border border-sand-200 bg-white p-6 shadow-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">{t('savedTrip.activitiesEyebrow')}</p>
            <h2 className="mt-1 mb-4 font-display text-2xl font-medium text-text-main">{t('savedTrip.highlights')}</h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {destination.highlights.map((highlight, idx) => {
                const text = typeof highlight === 'string' ? highlight : (highlight?.word || highlight?.value || highlight?.text || '');
                if (!text) return null;
                return (
                  <div key={idx} className="flex items-start gap-3 rounded-[10px] bg-ember-50 p-3">
                    <div className="mt-2 h-1.5 w-1.5 rounded-full bg-ember-600"></div>
                    <span className="text-sm text-text-main">{text}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 border-t border-sand-200 pt-4">
              <Button
                variant="ghost"
                size="sm"
                icon={<Sparkles size={14} />}
                onClick={() => window.open(
                  generateActivitiesLink({
                    city: safeText(trip.city),
                    country: safeText(trip.country),
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                  }),
                  '_blank',
                  'noopener,noreferrer'
                )}
              >
                {t('savedTrip.findActivities', { city: safeText(trip.city) })}
              </Button>
            </div>
          </div>
        )}

        {/* Match Reasons */}
        {tripData.matchReason && (
          <div className="rounded-[14px] border border-sand-200 bg-white p-6 shadow-2">
            <h2 className="mb-4 font-display text-2xl font-medium text-text-main">{t('savedTrip.whyDest')}</h2>
            <p className="leading-relaxed text-text-secondary">{safeText(tripData.matchReason)}</p>

            {tripData.seasonReason && (
              <div className="mt-4 rounded-[12px] bg-gold-100 p-4">
                <p className="mb-1 text-sm font-semibold text-[#7a5c1a]">{t('savedTrip.bestSeason')}</p>
                <p className="text-sm text-[#7a5c1a]">{safeText(tripData.seasonReason)}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {trip.notes && (
          <div className="rounded-[14px] border border-sand-200 bg-white p-6 shadow-2">
            <h2 className="mb-4 font-display text-2xl font-medium text-text-main">{t('savedTrip.notes')}</h2>
            <p className="whitespace-pre-wrap text-text-secondary">{safeText(trip.notes)}</p>
          </div>
        )}

        {/* TRIP ENHANCEMENTS - Weather, Itinerary, Packing, Events */}
        <TripEnhancementsSection trip={trip} userName={user?.firstName || t('savedTrip.voyagerFallback')} />
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sand-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[20px] border border-sand-200 bg-white p-6 shadow-3">
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-2xl font-medium text-text-main">{t('savedTrip.inviteFriends')}</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmails([]);
                  setCurrentEmail('');
                  setInviteError(null);
                }}
                className="rounded-[10px] p-2 transition-colors hover:bg-sand-100"
              >
                <X size={20} className="text-text-secondary" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                {t('savedTrip.inviteIntro')}
              </p>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  {t('savedTrip.emailLabel')}
                </label>
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={addInviteEmail}
                  placeholder={t('savedTrip.emailPlaceholder')}
                  className="w-full rounded-[10px] border border-sand-200 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-ember-600"
                />
                <p className="text-xs text-text-secondary mt-1">{t('savedTrip.emailHint')}</p>
              </div>

              {/* Email List */}
              {inviteEmails.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-main">{t('savedTrip.invitations', { count: inviteEmails.length })}</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {inviteEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between rounded-[10px] bg-ember-50 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-ember-700" />
                          <span className="text-sm text-text-main">{email}</span>
                        </div>
                        <button
                          onClick={() => removeInviteEmail(email)}
                          className="rounded p-1 transition-colors hover:bg-ember-100"
                        >
                          <X size={16} className="text-ember-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {inviteError && (
                <div className="flex items-start gap-2 rounded-[10px] bg-clay-100 p-3">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-clay-500" />
                  <p className="text-sm text-[#7a3a25]">{inviteError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                size="md"
                full
                disabled={inviting}
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmails([]);
                  setCurrentEmail('');
                  setInviteError(null);
                }}
              >
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
      )}
    </div>
  );
}

// ========================================
// TRIP ENHANCEMENTS SECTION
// Separate components loading in parallel
// ========================================
function TripEnhancementsSection({ trip, userName }) {
  const { getToken } = useAuth();
  const { t } = useTranslation();

  // Separate states for each component
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [packing, setPacking] = useState(null);
  const [packingLoading, setPackingLoading] = useState(true);

  const [itinerary, setItinerary] = useState(null);
  const [itineraryLoading, setItineraryLoading] = useState(true);

  const [events, setEvents] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  const destination = {
    city: trip.city,
    country: trip.country,
    startDate: trip.startDate,
    endDate: trip.endDate,
  };

  useEffect(() => {
    // Fetch all in parallel!
    fetchWeather();
    fetchPacking();
    fetchItinerary();
    fetchEvents();
  }, [trip.id]);

  const fetchWeather = async () => {
    try {
      setWeatherLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/weather`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWeather(data.data.weather);
      }
    } catch (err) {
      console.error('Error fetching weather:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchPacking = async () => {
    try {
      setPackingLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/packing`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPacking(data.data.packing);
      }
    } catch (err) {
      console.error('Error fetching packing:', err);
    } finally {
      setPackingLoading(false);
    }
  };

  const fetchItinerary = async () => {
    try {
      setItineraryLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/itinerary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setItinerary(data.data.itinerary);
      }
    } catch (err) {
      console.error('Error fetching itinerary:', err);
    } finally {
      setItineraryLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/events`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.data.events);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Weather & Packing - Load FIRST (fast) */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Weather */}
        {!weatherLoading && weather ? (
          <WeatherForecastCard weather={weather} destination={destination} />
        ) : null}

        {/* Packing */}
        {!packingLoading && packing ? (
          <PackingTipsCard packing={packing} />
        ) : null}
      </div>

      {/* Itinerary - Loads in background */}
      {itineraryLoading ? (
        <div className="rounded-[14px] border border-sand-200 bg-white p-8 shadow-2">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-ember-600" />
            <h3 className="font-display text-2xl font-medium text-text-main">{t('savedTrip.buildingItinerary')}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
              {t('savedTrip.buildingItineraryDesc')}
            </p>
          </div>
        </div>
      ) : itinerary ? (
        <CompleteTripPlanCard
          trip={trip}
          enhancements={{ weather, itinerary }}
          userName={userName}
        />
      ) : null}

      {/* Events - Load fast */}
      {!eventsLoading && events && (events.upcoming.length > 0 || events.regular.length > 0) && (
        <LocalEventsCard events={events} destination={destination} />
      )}
    </div>
  );
}

// Weather Forecast Card Component - Teal Design System
function WeatherForecastCard({ weather }) {
  const { t } = useTranslation();
  // Get average conditions for trip period (first 5-7 days)
  const tripForecast = weather.forecast.slice(0, Math.min(5, weather.forecast.length));
  const avgTemp = Math.round(
    tripForecast.reduce((sum, day) => sum + day.day.avgtemp_c, 0) / tripForecast.length
  );
  const maxRainChance = Math.max(...tripForecast.map(d => d.day.daily_chance_of_rain));

  return (
    <div className="rounded-[14px] border border-sand-200 bg-white p-4 shadow-1 transition-colors hover:border-ember-200">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[12px] bg-ember-50">
          <img src={weather.current.icon} alt={weather.current.condition} className="w-10 h-10" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-main">{t('savedTrip.weatherTitle')}</h3>
          <p className="text-sm text-text-secondary">
            {t('savedTrip.weatherNow', { temp: Math.round(weather.current.temp_c), cond: weather.current.condition })}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {t('savedTrip.weatherAvg', { temp: avgTemp })}
            {maxRainChance > 30 && (
              <span className="ml-2 rounded bg-gold-100 px-1.5 py-0.5 text-xs text-[#7a5c1a]">
                {t('savedTrip.rainChance', { pct: maxRainChance })}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Packing Tips Card Component - handles both AI format and static format
function PackingTipsCard({ packing }) {
  const { t } = useTranslation();
  // AI format: { essentials: string[], clothing: string[], activityItems: string[], tip: string }
  // Static format: { essentials: string[], clothing: string[], weatherSummary: { tempRange, rainChance, maxUV } }
  const essentials = (packing.essentials || []).slice(0, 3);
  const clothing = (packing.clothing || []).slice(0, 2);
  const activityItems = (packing.activityItems || []).slice(0, 2);

  const allItems = [...essentials, ...clothing, ...activityItems];

  return (
    <div className="rounded-[14px] border border-sand-200 bg-white p-4 shadow-1 transition-colors hover:border-ember-200">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-ember-50">
          <Backpack className="w-5 h-5 text-ember-700" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-main mb-2">{t('savedTrip.packTitle')}</h3>
          <div className="space-y-1.5 text-sm">
            {allItems.map((item, idx) => {
              const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
              if (!text) return null;
              return (
                <div key={idx} className="flex items-center gap-2 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-moss-500 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
          {/* AI tip */}
          {packing.tip && (
            <p className="mt-2 rounded-[10px] border border-sand-200 bg-sand-50 px-3 py-2 text-xs leading-relaxed text-text-secondary">
              {packing.tip}
            </p>
          )}
          {/* Static weather summary */}
          {packing.weatherSummary && (
            <p className="text-xs text-text-secondary mt-2">
              {packing.weatherSummary.tempRange}
              {packing.weatherSummary.rainChance > 30 && (
                <span className="ml-1 rounded bg-gold-100 px-1.5 py-0.5 text-[#7a5c1a]">{t('savedTrip.raincoat')}</span>
              )}
              {packing.weatherSummary.maxUV > 6 && (
                <span className="ml-1 rounded bg-gold-100 px-1.5 py-0.5 text-[#7a5c1a]">SPF 50+</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
