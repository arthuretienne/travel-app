import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const fetchJSON = async (path, token) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed: ${path} (${res.status})`);
  }
  return res.json();
};

const isBookingComplete = (trip) => {
  const td = trip?.tripData || {};
  return !!(td.flightDetails?.outbound || td.flights?.outbound) && !!(td.hotelDetails || td.hotel?.bookingId);
};

const hasFlight = (trip) => {
  const td = trip?.tripData || {};
  return !!(td.flightDetails?.outbound || td.flights?.outbound);
};

const hasHotel = (trip) => {
  const td = trip?.tripData || {};
  return !!(td.hotelDetails || td.hotel?.bookingId || td.hotelOptions?.hotels?.length);
};

const hasItinerary = (trip) => {
  const td = trip?.tripData || {};
  return !!(td.cachedItinerary?.days?.length || td.itinerary?.days?.length);
};

const hasPacking = (trip) => {
  const td = trip?.tripData || {};
  return !!(td.cachedItinerary?.packing || td.packing);
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const diff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const normalizeGroupDestination = (trip) => {
  const fd = trip?.finalDestination;
  if (!fd) return null;
  return {
    city: fd.city || fd.destination?.city,
    country: fd.country || fd.destination?.country,
    iata: fd.iataCode || fd.destination?.iataCode,
  };
};

export default function useDashboardData() {
  const { getToken } = useAuth();
  const [savedTrips, setSavedTrips] = useState([]);
  const [collaborativeTrips, setCollaborativeTrips] = useState([]);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      const [prefsRes, savedRes, collabRes, alertsRes] = await Promise.all([
        fetchJSON('/api/users/preferences', token).catch(() => null),
        fetchJSON('/api/searches/trips/saved', token).catch(() => ({ savedTrips: [] })),
        fetchJSON('/api/trips', token).catch(() => ({ data: {} })),
        fetchJSON('/api/price-alerts', token).catch(() => ({ alerts: [] })),
      ]);

      if (prefsRes?.preferences && !prefsRes.preferences.onboardingCompleted) {
        setNeedsOnboarding(true);
        return;
      }

      setPreferences(prefsRes?.preferences || null);
      setSavedTrips(savedRes.savedTrips || []);
      setCollaborativeTrips([
        ...(collabRes.data?.createdTrips || []),
        ...(collabRes.data?.memberTrips || []),
      ]);
      setPriceAlerts(alertsRes.alerts || []);
    } catch (err) {
      console.error('[useDashboardData] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Derive next trip across solo + group (upcoming only)
  const nextTrip = useMemo(() => {
    const now = Date.now();
    const solo = (savedTrips || [])
      .filter((t) => t.startDate && new Date(t.startDate).getTime() > now)
      .map((t) => ({
        kind: 'solo',
        id: t.id,
        startDate: t.startDate,
        endDate: t.endDate,
        city: t.city,
        country: t.country,
        tripData: t.tripData,
        raw: t,
      }));

    const group = (collaborativeTrips || [])
      .filter((t) => t.finalStartDate && new Date(t.finalStartDate).getTime() > now)
      .map((t) => {
        const dest = normalizeGroupDestination(t);
        return {
          kind: 'group',
          id: t.id,
          startDate: t.finalStartDate,
          endDate: t.finalEndDate,
          city: dest?.city,
          country: dest?.country,
          tripData: t.finalDestination,
          name: t.name,
          members: t.members,
          status: t.status,
          raw: t,
        };
      });

    const all = [...solo, ...group].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    return all[0] || null;
  }, [savedTrips, collaborativeTrips]);

  // Compute action items
  const actionItems = useMemo(() => {
    const items = [];
    const now = Date.now();

    // 1) Group invites with pending status (user is invited but not yet accepted)
    (collaborativeTrips || []).forEach((trip) => {
      const pendingMembers = (trip.members || []).filter((m) => m.role === 'guest' && !m.joinedAt);
      // simplified — UI surfaces accepted invitations; "pending" invitations live in TripInvitation
      // we surface trips where current user has a pending vote instead (more actionable on this data)
    });

    // 2) Votes pending: collab trip in voting status with proposedTrips and user hasn't voted
    (collaborativeTrips || []).forEach((trip) => {
      if (trip.status === 'voting' && (trip.proposedTrips || []).length > 0) {
        const totalMembers = trip.members?.length || 0;
        const dest = normalizeGroupDestination(trip);
        items.push({
          id: `vote-${trip.id}`,
          type: 'vote-pending',
          tone: 'gold',
          eyebrow: trip.voteDeadline
            ? `Vote · ferme le ${new Date(trip.voteDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
            : 'Vote en attente',
          title: trip.name,
          sub: `${trip.proposedTrips.length} proposition(s) · ${totalMembers} membres`,
          deeplink: `/trips/${trip.id}`,
          ctaLabel: 'Voter',
          score: 85,
        });
      }
    });

    // 3) Price drops: alerts with currentPrice <= targetPrice
    (priceAlerts || []).forEach((alert) => {
      if (alert.currentPrice && alert.currentPrice <= alert.targetPrice) {
        const drop = Math.round(((alert.initialPrice - alert.currentPrice) / alert.initialPrice) * 100);
        items.push({
          id: `drop-${alert.id}`,
          type: 'price-drop',
          tone: 'moss',
          eyebrow: 'Baisse de prix détectée',
          title: `${alert.destination} · ${alert.currentPrice}€`,
          sub: `Seuil cible ${alert.targetPrice}€ · économie ${drop}%`,
          deeplink: `/price-alerts`,
          ctaLabel: "Voir l'offre",
          score: 100,
          extra: { drop, before: alert.initialPrice, after: alert.currentPrice },
        });
      }
    });

    // 4) Upcoming trips with incomplete booking (< 30 days)
    (savedTrips || []).forEach((trip) => {
      const d = daysUntil(trip.startDate);
      if (d !== null && d >= 0 && d <= 30) {
        if (!hasHotel(trip)) {
          items.push({
            id: `incomplete-hotel-${trip.id}`,
            type: 'upcoming-trip-incomplete',
            tone: 'clay',
            eyebrow: `${trip.city} · J−${d}`,
            title: 'Hôtel pas encore réservé',
            sub: hasFlight(trip) ? 'Vol confirmé. À compléter.' : 'Vol et hôtel à confirmer.',
            deeplink: `/saved-trips/${trip.id}`,
            ctaLabel: 'Voir les options',
            score: d <= 7 ? 80 : 50,
          });
        } else if (!hasItinerary(trip)) {
          items.push({
            id: `incomplete-itin-${trip.id}`,
            type: 'upcoming-trip-incomplete',
            tone: 'sand',
            eyebrow: `${trip.city} · J−${d}`,
            title: 'Itinéraire à générer',
            sub: 'Vol et hôtel prêts — manque le détail jour par jour.',
            deeplink: `/saved-trips/${trip.id}`,
            ctaLabel: "Générer l'itinéraire",
            score: 40,
          });
        }
      }
    });

    // Sort by score desc
    return items.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [collaborativeTrips, priceAlerts, savedTrips]);

  // Hero context computation
  const heroContext = useMemo(() => {
    const decisions = actionItems.length;
    const next = nextTrip;
    const countdown = next ? daysUntil(next.startDate) : null;
    const priceDrop = actionItems.find((a) => a.type === 'price-drop');

    // Scoring rules from spec
    let variant = 'empty';
    if (countdown !== null && countdown <= 14) variant = 'countdown';
    else if (decisions > 0) variant = 'decisions';
    else if (priceDrop) variant = 'priceDrop';
    else if (countdown !== null && countdown <= 30) variant = 'countdown';

    return { variant, countdown, decisions, next, priceDrop };
  }, [actionItems, nextTrip]);

  // Insights — computed client-side (fallback, no /api/insights yet)
  const insights = useMemo(() => {
    const out = [];
    const totalTrips = savedTrips.length + collaborativeTrips.length;
    if (totalTrips < 3) return out;

    // seasonal-pattern: month most searched
    const months = savedTrips
      .map((t) => t.startDate && new Date(t.startDate).getMonth())
      .filter((m) => m !== null && m !== undefined);
    const monthCount = months.reduce((acc, m) => {
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
    const topMonth = Object.entries(monthCount).sort((a, b) => b[1] - a[1])[0];
    if (topMonth && topMonth[1] >= 2) {
      const monthName = new Date(2000, parseInt(topMonth[0], 10), 1).toLocaleDateString('fr-FR', { month: 'long' });
      out.push({
        id: 'seasonal',
        eyebrow: 'Fenêtre récurrente',
        keyword: monthName,
        body: 'Vous cherchez souvent en {keyword}. De nouvelles destinations correspondent à votre profil.',
        cta: 'Voir les pistes',
        href: '/create-trip',
      });
    }

    // budget-pattern
    const prices = savedTrips
      .map((t) => t.tripData?.pricing?.total)
      .filter((p) => typeof p === 'number' && p > 0);
    if (prices.length >= 3) {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const low = Math.round(avg * 0.85);
      const high = Math.round(avg * 1.15);
      out.push({
        id: 'budget',
        eyebrow: 'Budget moyen',
        keyword: `${low} € – ${high} €`,
        body: 'Tes derniers trips sont entre {keyword}. Voici des options qui rentrent.',
        cta: 'Explorer',
        href: '/create-trip',
      });
    }

    // silence-prompt
    const lastTrip = [...savedTrips, ...collaborativeTrips].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
    if (lastTrip?.createdAt) {
      const daysSince = Math.floor((Date.now() - new Date(lastTrip.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) {
        out.push({
          id: 'silence',
          eyebrow: 'Silence',
          keyword: `${daysSince} jours`,
          body: 'Pas de nouveau trip depuis {keyword}. Envie d\'un week-end ?',
          cta: 'Lancer une recherche',
          href: '/create-trip',
        });
      }
    }

    return out.slice(0, 3);
  }, [savedTrips, collaborativeTrips]);

  return {
    loading,
    error,
    needsOnboarding,
    savedTrips,
    collaborativeTrips,
    priceAlerts,
    preferences,
    nextTrip,
    actionItems,
    heroContext,
    insights,
    refetch: fetchAll,
    helpers: { hasFlight, hasHotel, hasItinerary, hasPacking, isBookingComplete, daysUntil, normalizeGroupDestination },
  };
}
