// frontend/src/pages/Results.jsx
// Premium functional design - calm, structured, decision-focused

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';

function Results() {
  const { searchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingTripId, setSavingTripId] = useState(null);
  const [proposingTripId, setProposingTripId] = useState(null);
  const [expandedTrip, setExpandedTrip] = useState(null);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [expectedTotal, setExpectedTotal] = useState(3);
  const [streamingStatus, setStreamingStatus] = useState('');

  // Budget warning state (when flights exceed budget)
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [trainAlternatives, setTrainAlternatives] = useState([]);

  // Price alert state
  const [alertingTripId, setAlertingTripId] = useState(null);
  const [alertCreatedFor, setAlertCreatedFor] = useState(new Set());

  // Notification state (replaces alert())
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', text }
  const showNotif = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Check if we're proposing for a group trip
  const forGroupTrip = location.state?.forGroupTrip;

  // Start streaming if we have streamingMode
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const controller = new AbortController();
    let cancelled = false;
    let timeoutId = null;

    if (location.state?.streamingMode && location.state?.searchPayload) {
      const { searchPayload, token } = location.state;

      setIsStreaming(true);
      setLoading(false);
      setStreamingStatus('Recherche des destinations parfaites...');

      // Hard cap so a hung backend stream can't spin forever (cold starts
      // can be slow, so keep this generous).
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          controller.abort();
          setIsStreaming(false);
          setStreamingStatus('');
          setError((prev) => prev || 'La recherche prend trop de temps. Réessayez dans un instant (le serveur démarre peut-être).');
        }
      }, 120000);

      const startStreaming = async () => {
        try {
          const response = await fetch(`${API_URL}/api/travel/recommendations/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(searchPayload),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error('Streaming request failed');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              if (buffer.trim()) {
                processSSEChunks(buffer.split('\n\n'));
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';

            processSSEChunks(chunks);
          }

          if (timeoutId) clearTimeout(timeoutId);
          setIsStreaming(false);
          setStreamingStatus('');

        } catch (err) {
          if (err.name === 'AbortError' || cancelled) return;
          console.error('Streaming error:', err);
          if (timeoutId) clearTimeout(timeoutId);
          setError('La recherche a échoué. Réessayez dans un instant.');
          setIsStreaming(false);
        }
      };

      const processSSEChunks = (chunks) => {
        for (const chunk of chunks) {
          if (!chunk.trim()) continue;

          const eventMatch = chunk.match(/event: (\w+)/);
          const dataMatch = chunk.match(/data: (.+)/s);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            try {
              const eventData = JSON.parse(dataMatch[1]);

              if (eventType === 'status') {
                if (eventData.stage === 'discovering') {
                  setStreamingStatus('Recherche des destinations parfaites...');
                } else if (eventData.stage === 'discovered') {
                  setStreamingStatus(`${eventData.destinations?.length || 3} destinations trouvées`);
                  setExpectedTotal(eventData.destinations?.length || 3);
                }
              } else if (eventType === 'recommendation') {
                if (eventData.data) {
                  setStreamingStatus(`Chargement ${eventData.index}/${eventData.total}...`);

                  setRecommendations(prev => {
                    const exists = prev.some(r => r.destination?.city === eventData.data.destination?.city);
                    if (exists) return prev;
                    return [...prev, eventData.data];
                  });
                  setExpectedTotal(eventData.total);
                }
              } else if (eventType === 'budget_warning') {
                // Budget exceeded - show warning and alternatives
                console.log('⚠️ Budget warning received:', eventData);
                setBudgetWarning({
                  message: eventData.message,
                  suggestions: eventData.suggestions,
                  flightOptions: eventData.flightOptions
                });
                if (eventData.trainAlternatives) {
                  setTrainAlternatives(eventData.trainAlternatives);
                }
                setStreamingStatus('Budget dépassé - affichage d\'alternatives...');
                if (timeoutId) clearTimeout(timeoutId);
                setIsStreaming(false);
              } else if (eventType === 'complete') {
                if (timeoutId) clearTimeout(timeoutId);
                setIsStreaming(false);
                setStreamingStatus('');
              } else if (eventType === 'error') {
                throw new Error(eventData.message || 'Streaming error');
              }
            } catch (parseError) {
              console.warn('SSE parse error:', parseError);
            }
          }
        }
      };

      startStreaming();
      return () => {
        cancelled = true;
        controller.abort();
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    if (location.state?.recommendations) {
      setRecommendations(location.state.recommendations);
      setLoading(false);
    } else if (searchId) {
      fetchRecommendations();
    } else {
      // Refresh / direct visit lost the router state — rehydrate the last
      // results instead of dead-ending the user.
      let restored = false;
      try {
        const cached = sessionStorage.getItem('skLastResults');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length) {
            setRecommendations(parsed);
            restored = true;
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
      if (!restored) {
        setError('Aucune recommandation à afficher. Relancez une recherche.');
      }
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [location.state, searchId]);

  // Cache the latest results so a refresh/direct-visit can rehydrate them.
  useEffect(() => {
    if (recommendations.length && !isStreaming) {
      try {
        sessionStorage.setItem('skLastResults', JSON.stringify(recommendations));
      } catch { /* quota / serialization — non-critical */ }
    }
  }, [recommendations, isStreaming]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/searches/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fire-and-forget signal capture — never blocks UI
  const captureSignal = async (city, signalType) => {
    if (!city || city === 'Road trip') return;
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      fetch(`${API_URL}/api/travel/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ destinationCity: city, signalType }),
      }).catch(() => {}); // silent fail — non-critical
    } catch { /* signal is best-effort */ }
  };

  const handleSaveTrip = async (tripIndex, silent = false) => {
    const trip = recommendations[tripIndex];
    if (!silent) setSavingTripId(tripIndex);

    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/searches/trips/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: trip.destination?.city || trip.city || trip.cities?.[0]?.name || 'Road trip',
          country: trip.destination?.country || trip.country || trip.cities?.[0]?.country,
          startDate: trip.slot?.startDate,
          endDate: trip.slot?.endDate,
          tripData: trip,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save trip');
      }

      const data = await response.json();

      // Capture save signal
      const city = trip.destination?.city || trip.cities?.[0]?.name;
      captureSignal(city, 'saved');

      if (!silent) {
        if (data.alreadyExists) {
          showNotif('success', 'Ce voyage est déjà dans vos voyages sauvegardés.');
        } else {
          showNotif('success', 'Voyage sauvegardé avec succès !');
        }
      }
      return true;
    } catch (err) {
      console.error('Error saving trip:', err);
      if (!silent) {
        showNotif('error', 'Impossible de sauvegarder le voyage. Veuillez réessayer.');
      }
      return false;
    } finally {
      if (!silent) setSavingTripId(null);
    }
  };

  const handleAffiliateClick = async (tripIndex, linkType, url) => {
    const trip = recommendations[tripIndex];
    const city = trip.destination?.city || trip.cities?.[0]?.name;
    captureSignal(city, 'booked');
    await handleSaveTrip(tripIndex, true);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleProposeToGroup = async (tripIndex) => {
    const trip = recommendations[tripIndex];
    setProposingTripId(tripIndex);

    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/trips/${forGroupTrip}/destinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: trip.destination?.city || trip.city,
          country: trip.destination?.country || trip.country,
          startDate: trip.slot?.startDate,
          endDate: trip.slot?.endDate,
          estimatedCostPerPerson: trip.pricing?.total || 0,
          tripData: trip,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Impossible de proposer la destination');
      }

      navigate(`/trips/${forGroupTrip}`);
    } catch (err) {
      console.error('Error proposing destination:', err);
      showNotif('error', err.message || 'Impossible de proposer la destination.');
    } finally {
      setProposingTripId(null);
    }
  };

  const handleCreatePriceAlert = async (tripIndex) => {
    const trip = recommendations[tripIndex];
    if (!trip?.pricing?.total || !trip.slot?.startDate || !trip.slot?.endDate) {
      showNotif('error', 'Données manquantes pour créer une alerte prix');
      return;
    }

    setAlertingTripId(tripIndex);
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/price-alerts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: trip.destination?.city,
          country: trip.destination?.country,
          origin: trip.flightDetails?.outbound?.departureAirport || 'PAR',
          departureDate: trip.slot.startDate,
          returnDate: trip.slot.endDate,
          initialPrice: trip.pricing.total,
          alertType: 'flight',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create alert');
      }

      setAlertCreatedFor(prev => new Set([...prev, tripIndex]));
    } catch (err) {
      console.error('Error creating price alert:', err);
      showNotif('error', err.message || 'Impossible de créer l\'alerte prix');
    } finally {
      setAlertingTripId(null);
    }
  };

  const handleBackToDashboard = () => navigate('/dashboard');
  const handleNewSearch = () => navigate('/create-trip');

  // Helpers
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (num) => Math.round(num ?? 0).toLocaleString();

  const formatDuration = (duration) => {
    if (!duration) return '';
    if (typeof duration === 'string') return duration;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };

  const getDestinationImage = (photo, city, country) => {
    if (photo?.url) return photo.url;
    return `https://source.unsplash.com/1200x800/?${encodeURIComponent(`${city} ${country} travel`)}`;
  };

  const getStarRating = (ratingValue, hotelStars) => {
    if (hotelStars && hotelStars > 0) return hotelStars;
    if (ratingValue) return Math.round(ratingValue / 2);
    return 0;
  };

  // Filter destinations
  const destinationTrips = recommendations.filter(r => r?.destination && r?.type !== 'roadtrip');
  const roadtripTrips = recommendations.filter(r => r?.type === 'roadtrip');

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
        <div className="w-full max-w-md rounded-[20px] border border-sand-200 bg-white p-10 text-center shadow-2">
          <Loader2 className="mx-auto mb-5 h-10 w-10 animate-spin text-ember-600" />
          <h3 className="font-display text-2xl font-medium text-text-main">
            Analyse de votre profil…
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-text-secondary">
            Recherche des destinations, vols et hôtels qui vous correspondent.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-card border border-sand-200/40">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-clay-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-clay-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-text-main mb-2">Une erreur est survenue</h2>
          <p className="text-text-secondary mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleBackToDashboard}
              className="px-5 py-2.5 text-text-secondary font-medium rounded-xl border border-sand-200 hover:bg-surface-muted transition-colors"
            >
              Retour au tableau de bord
            </button>
            <button
              onClick={handleNewSearch}
              className="px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              Nouvelle recherche
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (recommendations.length === 0 && !isStreaming) {
    // Extract context from search payload if available
    const searchPayload = location.state?.searchPayload;
    const budget = searchPayload?.preferences?.budget;
    const travelers = searchPayload?.preferences?.travelers || 1;
    const nights = searchPayload?.preferences?.duration || 5;
    const totalBudget = budget ? budget * travelers : null;
    const minEstimate = travelers > 1
      ? Math.round((80 * travelers) + (50 * Math.ceil(travelers / 2) * nights))
      : Math.round(80 + 50 * nights);

    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gold-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="font-display text-2xl text-text-main mb-2">Aucun résultat trouvé</h3>

          {totalBudget && totalBudget < minEstimate ? (
            <div className="text-left bg-gold-100 border border-gold-100 rounded-2xl p-5 mb-6">
              <p className="text-sm font-semibold text-gold-500 mb-3">
                Budget insuffisant pour {travelers} {travelers > 1 ? 'personnes' : 'personne'}, {nights} nuits
              </p>
              <ul className="space-y-2 text-sm text-gold-500">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  Budget saisi : <strong>€{totalBudget}</strong> total (€{budget}/pers.)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  Minimum estimé : <strong>~€{minEstimate}</strong> (vol ~€{80 * travelers} + hôtel ~€{50 * Math.ceil(travelers / 2) * nights})
                </li>
              </ul>
              <p className="text-xs text-gold-500 mt-3 font-medium">Suggestions :</p>
              <ul className="space-y-1 text-xs text-gold-500 mt-1">
                <li>→ Augmenter le budget à €{Math.ceil(minEstimate / travelers / 50) * 50}/pers. minimum</li>
                <li>→ Réduire la durée à {Math.max(2, nights - 2)} nuits</li>
                {travelers > 2 && <li>→ Partir à {travelers - 1} personnes</li>}
              </ul>
            </div>
          ) : (
            <p className="text-text-secondary mb-6">
              Aucune destination ne correspond à vos critères actuels. Essayez d'ajuster vos préférences ou votre budget.
            </p>
          )}

          <button
            onClick={handleNewSearch}
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
          >
            Nouvelle recherche
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Inline notification (replaces alert()) */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-moss-500 text-white' : 'bg-clay-500 text-white'
        }`}>
          {notification.type === 'success' ? '✓' : '✕'} {notification.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-sand-200/60">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {isStreaming ? (
                <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  {streamingStatus || `${recommendations.length}/${expectedTotal} destinations`}
                </div>
              ) : (
                <p className="text-sm font-medium text-primary mb-1">
                  {destinationTrips.length + roadtripTrips.length} {destinationTrips.length + roadtripTrips.length === 1 ? 'résultat' : 'résultats'} trouvé{destinationTrips.length + roadtripTrips.length > 1 ? 's' : ''}{roadtripTrips.length > 0 ? ' · inclut un road trip' : ''}
                </p>
              )}
              <h1 className="font-display text-3xl text-text-main">
                {forGroupTrip ? 'Proposer une destination' : 'Vos options de voyage'}
              </h1>
            </div>
            <div className="flex gap-3">
              {forGroupTrip ? (
                <button
                  onClick={() => navigate(`/trips/${forGroupTrip}`)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-main hover:bg-surface-muted rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour au voyage
                </button>
              ) : (
                <>
                  <button
                    onClick={handleBackToDashboard}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-main hover:bg-surface-muted rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Tableau de bord
                  </button>
                  <button
                    onClick={handleNewSearch}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Nouvelle recherche
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Budget Warning Banner */}
        {budgetWarning && (
          <div className="mb-8 bg-gold-100 border border-gold-100 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gold-500 mb-2">{budgetWarning.message}</h3>
                <ul className="text-sm text-gold-500 space-y-1 mb-4">
                  {budgetWarning.suggestions?.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gold-500 mt-1">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>

                {/* Train/Bus Alternatives */}
                {trainAlternatives.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gold-100">
                    <h4 className="font-medium text-gold-500 mb-3 flex items-center gap-2">
                      <span>🚂</span> Alternatives train & bus (moins cher !)
                    </h4>
                    <div className="grid gap-2">
                      {trainAlternatives.map((alt, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gold-100">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{alt.transport === 'train' ? '🚂' : '🚌'}</span>
                            <div>
                              <p className="font-medium text-sand-900">{alt.name}, {alt.country}</p>
                              <p className="text-xs text-sand-500">{alt.operator} • {alt.duration}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-moss-500">€{alt.price}</p>
                            <p className="text-xs text-sand-500">aller-retour</p>
                          </div>
                          {alt.hasBeach && (
                            <span className="ml-2 px-2 py-0.5 bg-gold-100 text-gold-500 text-xs rounded-full">🏖️ Plage</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Streaming skeleton */}
        {isStreaming && recommendations.length === 0 && !budgetWarning && (
          <div className="rounded-[20px] border border-sand-200 bg-white p-12 text-center shadow-2">
            <Loader2 className="mx-auto mb-5 h-10 w-10 animate-spin text-ember-600" />
            <h3 className="font-display text-2xl font-medium text-text-main">
              {streamingStatus || 'Composition de vos voyages…'}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-text-secondary">
              L’IA assemble destinations, vols et hôtels qui tiennent votre budget.
            </p>
          </div>
        )}

        {/* Road Trip Cards */}
        {roadtripTrips.length > 0 && (
          <div className="space-y-8 mb-8">
            {roadtripTrips.map((trip) => {
              const originalIndex = recommendations.indexOf(trip);
              return (
                <RoadtripCard
                  key={originalIndex}
                  trip={trip}
                  onSave={() => handleSaveTrip(originalIndex)}
                  isSaving={savingTripId === originalIndex}
                  formatNumber={formatNumber}
                  forGroupTrip={forGroupTrip}
                  onPropose={() => handleProposeToGroup(originalIndex)}
                  isProposing={proposingTripId === originalIndex}
                />
              );
            })}
          </div>
        )}

        {/* Trip Cards */}
        <div className="space-y-8">
          {destinationTrips.map((trip, index) => (
            <TripCard
              key={index}
              trip={trip}
              index={index}
              isExpanded={expandedTrip === index}
              onToggle={() => {
                const isOpening = expandedTrip !== index;
                setExpandedTrip(expandedTrip === index ? null : index);
                if (isOpening) {
                  const city = trip.destination?.city || trip.cities?.[0]?.name;
                  captureSignal(city, 'clicked');
                }
              }}
              formatDate={formatDate}
              formatNumber={formatNumber}
              formatDuration={formatDuration}
              getDestinationImage={getDestinationImage}
              getStarRating={getStarRating}
              onSave={() => handleSaveTrip(index)}
              onBook={(type, url) => handleAffiliateClick(index, type, url)}
              onPropose={() => handleProposeToGroup(index)}
              isSaving={savingTripId === index}
              isProposing={proposingTripId === index}
              forGroupTrip={forGroupTrip}
              onCreateAlert={() => handleCreatePriceAlert(index)}
              isAlertCreating={alertingTripId === index}
              isAlertCreated={alertCreatedFor.has(index)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

// Trip Card Component
function TripCard({
  trip,
  index,
  isExpanded,
  onToggle,
  formatDate,
  formatNumber,
  formatDuration,
  getDestinationImage,
  getStarRating,
  onSave,
  onBook,
  onPropose,
  isSaving,
  isProposing,
  forGroupTrip,
  onCreateAlert,
  isAlertCreating,
  isAlertCreated
}) {
  const { destination, slot, pricing, flightDetails, hotelOptions, links } = trip;
  const hotel = hotelOptions?.hotels?.[0];
  const isUnderBudget = (pricing?.remaining ?? 0) >= 0;

  return (
    <article className="bg-white rounded-2xl shadow-card overflow-hidden border border-sand-200/40 hover:shadow-elevated transition-shadow duration-300">
      {/* Hero Image */}
      <div className="relative aspect-[21/9] overflow-hidden bg-sand-100">
        <img
          src={getDestinationImage(destination?.photo, destination?.city, destination?.country)}
          alt={destination?.photo?.alt || `${destination?.city}, ${destination?.country}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = `https://source.unsplash.com/1200x600/?${encodeURIComponent(destination?.city || 'travel')}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Destination name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl text-white mb-1">
                {destination?.city}
              </h2>
              <p className="text-white/80 text-lg">{destination?.country}</p>
            </div>
            {index === 0 && (
              <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                <span className="text-white text-sm font-medium">Meilleur choix</span>
              </div>
            )}
          </div>
        </div>

        {/* Photo credit */}
        {destination?.photo?.photographer && (
          <div className="absolute top-4 right-4 px-2 py-1 bg-black/30 backdrop-blur-sm rounded text-xs text-white/70">
            Photo par{' '}
            <a href={destination.photo.photographer.link} target="_blank" rel="noopener noreferrer" className="underline">
              {destination.photo.photographer.name}
            </a>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 lg:p-8">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <InfoCard label="Dates">
            <p className="text-text-main font-semibold">
              {formatDate(slot?.startDate)} – {formatDate(slot?.endDate)}
            </p>
            <p className="text-sm text-text-secondary">{slot?.duration} jours</p>
          </InfoCard>

          <InfoCard label="Coût total">
            <p className="text-text-main font-semibold text-xl">€{formatNumber(pricing?.total)}</p>
            {isUnderBudget ? (
              <p className="text-sm text-status-positive">€{formatNumber(pricing?.remaining)} sous le budget</p>
            ) : (
              <p className="text-sm text-clay-500">€{formatNumber(Math.abs(pricing?.remaining))} dépassé</p>
            )}
          </InfoCard>

          <InfoCard label="Vol">
            <p className="text-text-main font-semibold">€{formatNumber(pricing?.flight)}</p>
            <p className="text-sm text-text-secondary">
              {flightDetails?.outbound?.stops === 0 ? 'Direct' : `${flightDetails?.outbound?.stops || 0} escale${(flightDetails?.outbound?.stops || 0) > 1 ? 's' : ''}`}
            </p>
          </InfoCard>

          <InfoCard label="Hôtel">
            <p className="text-text-main font-semibold">€{formatNumber(pricing?.hotel)}</p>
            <p className="text-sm text-text-secondary">{hotelOptions?.nights || slot?.duration - 1} nuits</p>
          </InfoCard>
        </div>

        {/* AI Reasoning */}
        {(destination?.matchReason || destination?.seasonReason) && (
          <div className="mb-8 p-5 border border-primary/20 bg-primary-light/30 rounded-xl">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                {destination?.matchReason && (
                  <p className="text-text-main leading-relaxed">{destination.matchReason}</p>
                )}
                {destination?.seasonReason && (
                  <p className="text-text-secondary text-sm mt-2">{destination.seasonReason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Highlights */}
        {destination?.highlights?.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-3">Points forts</p>
            <div className="flex flex-wrap gap-2">
              {destination.highlights.map((highlight, i) => {
                const text = typeof highlight === 'string' ? highlight : (highlight?.word || highlight?.value || highlight?.text || '');
                if (!text) return null;
                return (
                  <span key={i} className="px-3 py-1.5 bg-surface-muted text-text-secondary text-sm rounded-lg">
                    {text}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Activities */}
        {destination?.activities?.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-3">Activités recommandées</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {destination.activities.slice(0, 6).map((activity, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-subtle rounded-lg">
                  <span className="text-sm text-text-main truncate">{activity.name}</span>
                  <span className={`text-sm font-medium flex-shrink-0 ml-2 ${activity.price === 0 ? 'text-status-positive' : 'text-text-secondary'}`}>
                    {activity.price === 0 ? 'Gratuit' : `€${activity.price}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <div className="border-t border-sand-200/60 pt-6">
          <button
            onClick={onToggle}
            className="flex items-center justify-between w-full group"
          >
            <span className="text-sm font-medium text-text-secondary group-hover:text-text-main transition-colors">
              {isExpanded ? 'Masquer les détails' : 'Voir les détails vols & hôtel'}
            </span>
            <svg
              className={`w-5 h-5 text-text-light transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExpanded && (
            <div className="mt-6 space-y-6 animate-fadeIn">
              {/* Flight Details */}
              {flightDetails && (
                <div className="p-5 bg-surface-subtle rounded-xl">
                  <h4 className="text-sm font-semibold text-text-main mb-4">Détails du vol</h4>

                  {/* Outbound */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Aller</p>
                    <FlightSegment
                      departureTime={flightDetails.outbound?.departureTime}
                      arrivalTime={flightDetails.outbound?.arrivalTime}
                      departureAirport={flightDetails.outbound?.departureAirport || flightDetails.outbound?.segments?.[0]?.origin}
                      arrivalAirport={flightDetails.outbound?.arrivalAirport || flightDetails.outbound?.segments?.[0]?.destination}
                      duration={formatDuration(flightDetails.outbound?.duration)}
                    />
                  </div>

                  {/* Return */}
                  {flightDetails.return && (
                    <div>
                      <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Retour</p>
                      <FlightSegment
                        departureTime={flightDetails.return?.departureTime}
                        arrivalTime={flightDetails.return?.arrivalTime}
                        departureAirport={flightDetails.return?.departureAirport || flightDetails.return?.segments?.[0]?.origin}
                        arrivalAirport={flightDetails.return?.arrivalAirport || flightDetails.return?.segments?.[0]?.destination}
                        duration={formatDuration(flightDetails.return?.duration)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Hotel Details */}
              {hotel && (
                <div className="p-5 bg-surface-subtle rounded-xl">
                  <h4 className="text-sm font-semibold text-text-main mb-4">Hébergement suggéré</h4>
                  <div className="flex gap-4">
                    {hotel.mainPhoto && (
                      <div className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-sand-200">
                        <img
                          src={hotel.mainPhoto}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-main mb-1 truncate">{hotel.name}</p>
                      <div className="flex items-center gap-3 mb-1">
                        {getStarRating(hotel.rating?.value, hotel.stars) > 0 && (
                          <span className="text-sm text-gold-500">
                            {'★'.repeat(getStarRating(hotel.rating?.value, hotel.stars))}
                          </span>
                        )}
                        {hotel.rating?.value > 0 && (
                          <span className="text-sm font-medium text-primary">{hotel.rating.value.toFixed(1)}</span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">
                        €{formatNumber(hotel.price || hotel.pricePerNight)}/nuit
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {forGroupTrip ? (
            <button
              onClick={onPropose}
              disabled={isProposing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isProposing ? 'Proposition...' : 'Proposer au groupe'}
            </button>
          ) : (
            <>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-surface-muted text-text-secondary font-medium rounded-xl hover:bg-surface-hover hover:text-text-main transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => onBook('skyscanner', links?.skyscanner)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors"
              >
                Réserver ce voyage
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button
                onClick={() => onBook('booking', links?.booking)}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-surface-muted text-text-secondary font-medium rounded-xl hover:bg-surface-hover hover:text-text-main transition-colors"
              >
                Voir les hôtels
              </button>
              <button
                onClick={onCreateAlert}
                disabled={isAlertCreating || isAlertCreated}
                className={`flex items-center justify-center gap-2 px-6 py-4 font-medium rounded-xl transition-colors ${
                  isAlertCreated
                    ? 'bg-moss-100 text-moss-500 cursor-default'
                    : 'bg-gold-100 text-gold-500 hover:bg-gold-100'
                }`}
                title="Être notifié quand le prix baisse"
              >
                {isAlertCreating ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : isAlertCreated ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                )}
                {isAlertCreated ? 'Alerte activée' : 'Alerte prix'}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// Road Trip Card Component
function RoadtripCard({ trip, onSave, isSaving, formatNumber, forGroupTrip, onPropose, isProposing }) {
  const [expandedCity, setExpandedCity] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const { cities = [], transport, pricing, narrative, duration, title, tagline, overview } = trip;
  const totalCost = pricing?.totalCost || pricing?.total || 0;

  const modeIcon = (mode) => {
    const m = mode?.toLowerCase();
    if (m === 'flight') return '✈️';
    if (m === 'train') return '🚂';
    if (m === 'bus') return '🚌';
    if (m === 'car' || m === 'rental') return '🚗';
    return '🚌';
  };

  return (
    <article className="bg-white rounded-2xl shadow-card overflow-hidden border border-sand-200/40 hover:shadow-elevated transition-shadow duration-300">
      {/* Hero: city photo strip */}
      <div className="relative h-64 overflow-hidden bg-sand-100">
        <div className="flex h-full">
          {cities.slice(0, 3).map((city, i) => (
            <div
              key={i}
              className="flex-1 relative overflow-hidden"
              style={{ borderRight: i < Math.min(cities.length, 3) - 1 ? '2px solid white' : 'none' }}
            >
              <img
                src={city.photo?.url || `https://source.unsplash.com/800x600/?${encodeURIComponent(city.name + ' travel')}`}
                alt={city.photo?.alt || city.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = `https://source.unsplash.com/800x600/?${encodeURIComponent(city.name)}`; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <p className="absolute bottom-3 left-3 text-white font-semibold text-sm drop-shadow">{city.name}</p>
            </div>
          ))}
        </div>
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold uppercase tracking-wide">
            Road trip
          </span>
        </div>
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1.5 bg-black/30 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            {duration} jours
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Title & tagline */}
        <div className="mb-6">
          <h2 className="font-display text-2xl text-text-main mb-1">
            {title || `Road trip · ${cities.map(c => c.name).join(' → ')}`}
          </h2>
          {tagline && <p className="text-text-secondary">{tagline}</p>}
        </div>

        {/* Route visualization */}
        <div className="mb-5 flex items-center gap-2 flex-wrap">
          {cities.map((city, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-subtle rounded-xl">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-text-main">{city.name}</span>
                <span className="text-xs text-text-secondary">· {city.nights}n</span>
              </div>
              {i < cities.length - 1 && (
                <svg className="w-4 h-4 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Transport modes */}
        {transport?.modes?.length > 0 && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-text-light uppercase tracking-wide">Transport</span>
            {transport.modes.map((mode, i) => (
              <span key={i} className="px-2.5 py-1 bg-surface-muted text-text-secondary text-xs rounded-lg">
                {modeIcon(mode)} {mode}
              </span>
            ))}
          </div>
        )}

        {/* Budget breakdown */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="p-4 bg-surface-subtle rounded-xl">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">Transport</p>
            <p className="text-text-main font-semibold">€{formatNumber(Math.round(pricing?.transport || 0))}</p>
          </div>
          <div className="p-4 bg-surface-subtle rounded-xl">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">Hôtels</p>
            <p className="text-text-main font-semibold">€{formatNumber(Math.round(pricing?.hotels || 0))}</p>
          </div>
          <div className="p-4 bg-surface-subtle rounded-xl">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">Activités</p>
            <p className="text-text-main font-semibold">€{formatNumber(Math.round(pricing?.activities || 0))}</p>
          </div>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Total</p>
            <p className="text-primary font-bold">€{formatNumber(Math.round(totalCost))}</p>
          </div>
        </div>

        {/* AI Narrative */}
        {(overview || narrative?.perfectFor) && (
          <div className="mb-6 p-5 border border-primary/20 bg-primary-light/30 rounded-xl">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                {overview && <p className="text-text-main leading-relaxed mb-2">{overview}</p>}
                {narrative?.perfectFor && <p className="text-text-secondary text-sm">{narrative.perfectFor}</p>}
              </div>
            </div>
          </div>
        )}

        {/* City breakdown */}
        <div className="mb-6">
          <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-3">Étapes du voyage</p>
          <div className="space-y-3">
            {cities.map((city, i) => (
              <div key={i} className="border border-sand-200/60 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCity(expandedCity === i ? null : i)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-subtle transition-colors"
                >
                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-sand-100 flex-shrink-0">
                    <img
                      src={city.photo?.url || `https://source.unsplash.com/200x150/?${encodeURIComponent(city.name)}`}
                      alt={city.name}
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="font-semibold text-text-main">{city.name}</p>
                      <span className="text-text-secondary text-sm">· {city.country}</span>
                    </div>
                    <p className="text-sm text-text-secondary ml-7">{city.nights} nuit{city.nights !== 1 ? 's' : ''}</p>
                  </div>
                  {city.hotel && (
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-sm font-medium text-text-main">€{city.hotel.pricePerNight}/nuit</p>
                      <p className="text-xs text-text-secondary truncate max-w-32">{city.hotel.name}</p>
                    </div>
                  )}
                  <svg
                    className={`w-4 h-4 text-text-light transition-transform flex-shrink-0 ${expandedCity === i ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedCity === i && (
                  <div className="border-t border-sand-200/60 p-5 bg-surface-subtle space-y-4">
                    {city.hotel && (
                      <div>
                        <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Hébergement</p>
                        <div className="flex items-center gap-3">
                          {city.hotel.photos?.[0] && (
                            <img src={city.hotel.photos[0]} alt={city.hotel.name} className="w-20 h-14 rounded-lg object-cover flex-shrink-0" onError={(e) => e.target.style.display = 'none'} />
                          )}
                          <div>
                            <p className="font-medium text-text-main">{city.hotel.name}</p>
                            <p className="text-sm text-text-secondary">
                              {city.hotel.stars > 0 && '★'.repeat(Math.min(city.hotel.stars, 5))} · €{city.hotel.pricePerNight}/nuit
                            </p>
                            {city.hotel.rating > 0 && (
                              <p className="text-sm text-primary font-medium">{city.hotel.rating}/10</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {city.topAttractions?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Activités phares</p>
                        <div className="space-y-1.5">
                          {city.topAttractions.map((a, j) => (
                            <div key={j} className="flex items-center justify-between">
                              <p className="text-sm text-text-main">{a.name}</p>
                              <p className="text-sm text-text-secondary ml-2 flex-shrink-0">
                                {a.price === 0 ? 'Gratuit' : a.price ? `€${a.price}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Expandable: transport + tips + hidden gems */}
        <div className="border-t border-sand-200/60 pt-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full group"
          >
            <span className="text-sm font-medium text-text-secondary group-hover:text-text-main transition-colors">
              {showDetails ? 'Masquer les détails' : 'Voir la logistique & conseils'}
            </span>
            <svg className={`w-5 h-5 text-text-light transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDetails && (
            <div className="mt-6 space-y-4 animate-fadeIn">
              {transport?.narrative && (
                <div className="p-4 bg-surface-subtle rounded-xl">
                  <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Transport</p>
                  <p className="text-sm text-text-main leading-relaxed">{transport.narrative}</p>
                </div>
              )}
              {narrative?.budgetExplanation && (
                <div className="p-4 bg-surface-subtle rounded-xl">
                  <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Budget</p>
                  <p className="text-sm text-text-main leading-relaxed">{narrative.budgetExplanation}</p>
                </div>
              )}
              {narrative?.practicalTips?.length > 0 && (
                <div className="p-4 bg-surface-subtle rounded-xl">
                  <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Conseils pratiques</p>
                  <ul className="space-y-1.5">
                    {narrative.practicalTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-main">
                        <span className="text-primary mt-0.5 flex-shrink-0">·</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {narrative?.hiddenGems?.length > 0 && (
                <div className="p-4 bg-surface-subtle rounded-xl">
                  <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Pépites cachées</p>
                  <ul className="space-y-1.5">
                    {narrative.hiddenGems.map((gem, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-main">
                        <span className="text-gold-500 mt-0.5 flex-shrink-0">★</span>
                        {gem}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {forGroupTrip ? (
            <button
              onClick={onPropose}
              disabled={isProposing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isProposing ? 'Proposition...' : 'Proposer au groupe'}
            </button>
          ) : (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-surface-muted text-text-secondary font-medium rounded-xl hover:bg-surface-hover hover:text-text-main transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {isSaving ? 'Enregistrement...' : 'Sauvegarder le road trip'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// Info Card Component
function InfoCard({ label, children }) {
  return (
    <div className="p-4 bg-surface-subtle rounded-xl">
      <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  );
}

// Flight Segment Component
function FlightSegment({ departureTime, arrivalTime, departureAirport, arrivalAirport, duration }) {
  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-text-main">{formatTime(departureTime)}</p>
        <p className="text-xs text-text-secondary">{departureAirport || 'DEP'}</p>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-px bg-sand-300" />
        <span className="text-xs text-text-light px-2">{duration}</span>
        <div className="flex-1 h-px bg-sand-300" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-text-main">{formatTime(arrivalTime)}</p>
        <p className="text-xs text-text-secondary">{arrivalAirport || 'ARR'}</p>
      </div>
    </div>
  );
}

export default Results;
