// frontend/src/pages/Results.jsx
// Premium functional design - calm, structured, decision-focused

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { TripCardSkeleton } from '../components/SkeletonLoaders';

function Results() {
  const { searchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
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

  // Check if we're proposing for a group trip
  const forGroupTrip = location.state?.forGroupTrip;

  // Start streaming if we have streamingMode
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    if (location.state?.streamingMode && location.state?.searchPayload) {
      const { searchPayload, token } = location.state;

      setIsStreaming(true);
      setLoading(false);
      setStreamingStatus('Finding perfect destinations...');

      const startStreaming = async () => {
        try {
          const response = await fetch(`${API_URL}/api/travel/recommendations/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(searchPayload),
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

          setIsStreaming(false);
          setStreamingStatus('');

        } catch (err) {
          console.error('Streaming error:', err);
          setError(err.message);
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
                  setStreamingStatus('Finding perfect destinations...');
                } else if (eventData.stage === 'discovered') {
                  setStreamingStatus(`Found ${eventData.destinations?.length || 3} destinations`);
                  setExpectedTotal(eventData.destinations?.length || 3);
                }
              } else if (eventType === 'recommendation') {
                if (eventData.data) {
                  setStreamingStatus(`Loading ${eventData.index}/${eventData.total}...`);

                  setRecommendations(prev => {
                    const exists = prev.some(r => r.destination?.city === eventData.data.destination?.city);
                    if (exists) return prev;
                    return [...prev, eventData.data];
                  });
                  setExpectedTotal(eventData.total);
                }
              } else if (eventType === 'complete') {
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
      return;
    }

    if (location.state?.recommendations) {
      setRecommendations(location.state.recommendations);
      setLoading(false);
    } else if (searchId) {
      fetchRecommendations();
    } else {
      setLoading(false);
      setError('No recommendations available');
    }
  }, [location.state, searchId]);

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
          city: trip.destination?.city || trip.city,
          country: trip.destination?.country || trip.country,
          startDate: trip.slot?.startDate,
          endDate: trip.slot?.endDate,
          tripData: trip,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save trip');
      }

      const data = await response.json();

      if (!silent) {
        if (data.alreadyExists) {
          alert('This trip is already in your saved trips!');
        } else {
          alert('Trip saved successfully!');
        }
      }
      return true;
    } catch (err) {
      console.error('Error saving trip:', err);
      if (!silent) {
        alert('Failed to save trip. Please try again.');
      }
      return false;
    } finally {
      if (!silent) setSavingTripId(null);
    }
  };

  const handleAffiliateClick = async (tripIndex, linkType, url) => {
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
        throw new Error(errorData.error || 'Failed to propose destination');
      }

      alert('Destination proposed successfully!');
      navigate(`/trips/${forGroupTrip}`);
    } catch (err) {
      console.error('Error proposing destination:', err);
      alert(err.message || 'Failed to propose destination.');
    } finally {
      setProposingTripId(null);
    }
  };

  const handleBackToDashboard = () => navigate('/dashboard');
  const handleNewSearch = () => navigate('/create-trip');

  // Helpers
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-subtle p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-stone-200 rounded-lg animate-pulse mb-2" />
            <div className="h-5 w-72 bg-stone-200 rounded-lg animate-pulse" />
          </div>
          <TripCardSkeleton />
          <p className="text-center text-text-secondary mt-8 animate-pulse">
            Analyzing your profile and searching flights...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-card border border-stone-200/40">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-text-main mb-2">Something went wrong</h2>
          <p className="text-text-secondary mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleBackToDashboard}
              className="px-5 py-2.5 text-text-secondary font-medium rounded-xl border border-stone-200 hover:bg-surface-muted transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleNewSearch}
              className="px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              Try New Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (recommendations.length === 0 && !isStreaming) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-surface-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-display text-2xl text-text-main mb-2">No trips found</h3>
          <p className="text-text-secondary mb-8">Try adjusting your preferences or budget.</p>
          <button
            onClick={handleNewSearch}
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
          >
            Start new search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Header */}
      <header className="bg-white border-b border-stone-200/60">
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
                  {destinationTrips.length} {destinationTrips.length === 1 ? 'destination' : 'destinations'} found
                </p>
              )}
              <h1 className="font-display text-3xl text-text-main">
                {forGroupTrip ? 'Propose a destination' : 'Your travel options'}
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
                  Back to trip
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
                    Dashboard
                  </button>
                  <button
                    onClick={handleNewSearch}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    New search
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Streaming skeleton */}
        {isStreaming && recommendations.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-stone-200/40 overflow-hidden">
            <div className="aspect-[21/9] bg-stone-100 animate-pulse" />
            <div className="p-8 space-y-4">
              <div className="h-8 w-1/3 bg-stone-200 rounded animate-pulse" />
              <div className="h-4 w-1/4 bg-stone-200 rounded animate-pulse" />
              <div className="grid grid-cols-4 gap-4 mt-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
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
              onToggle={() => setExpandedTrip(expandedTrip === index ? null : index)}
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
  forGroupTrip
}) {
  const { destination, slot, pricing, flightDetails, hotelOptions, links } = trip;
  const hotel = hotelOptions?.hotels?.[0];
  const isUnderBudget = (pricing?.remaining ?? 0) >= 0;

  return (
    <article className="bg-white rounded-2xl shadow-card overflow-hidden border border-stone-200/40 hover:shadow-elevated transition-shadow duration-300">
      {/* Hero Image */}
      <div className="relative aspect-[21/9] overflow-hidden bg-stone-100">
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
                <span className="text-white text-sm font-medium">Best match</span>
              </div>
            )}
          </div>
        </div>

        {/* Photo credit */}
        {destination?.photo?.photographer && (
          <div className="absolute top-4 right-4 px-2 py-1 bg-black/30 backdrop-blur-sm rounded text-xs text-white/70">
            Photo by{' '}
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
            <p className="text-sm text-text-secondary">{slot?.duration} days</p>
          </InfoCard>

          <InfoCard label="Total cost">
            <p className="text-text-main font-semibold text-xl">€{formatNumber(pricing?.total)}</p>
            {isUnderBudget ? (
              <p className="text-sm text-status-positive">€{formatNumber(pricing?.remaining)} under budget</p>
            ) : (
              <p className="text-sm text-red-600">€{formatNumber(Math.abs(pricing?.remaining))} over</p>
            )}
          </InfoCard>

          <InfoCard label="Flight">
            <p className="text-text-main font-semibold">€{formatNumber(pricing?.flight)}</p>
            <p className="text-sm text-text-secondary">
              {flightDetails?.outbound?.stops === 0 ? 'Direct' : `${flightDetails?.outbound?.stops || 0} stop${(flightDetails?.outbound?.stops || 0) > 1 ? 's' : ''}`}
            </p>
          </InfoCard>

          <InfoCard label="Hotel">
            <p className="text-text-main font-semibold">€{formatNumber(pricing?.hotel)}</p>
            <p className="text-sm text-text-secondary">{hotelOptions?.nights || slot?.duration - 1} nights</p>
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
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-3">Highlights</p>
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
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-3">Recommended activities</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {destination.activities.slice(0, 6).map((activity, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-subtle rounded-lg">
                  <span className="text-sm text-text-main truncate">{activity.name}</span>
                  <span className={`text-sm font-medium flex-shrink-0 ml-2 ${activity.price === 0 ? 'text-status-positive' : 'text-text-secondary'}`}>
                    {activity.price === 0 ? 'Free' : `€${activity.price}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <div className="border-t border-stone-200/60 pt-6">
          <button
            onClick={onToggle}
            className="flex items-center justify-between w-full group"
          >
            <span className="text-sm font-medium text-text-secondary group-hover:text-text-main transition-colors">
              {isExpanded ? 'Hide details' : 'View flight & hotel details'}
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
                  <h4 className="text-sm font-semibold text-text-main mb-4">Flight details</h4>

                  {/* Outbound */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Outbound</p>
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
                      <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Return</p>
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
                  <h4 className="text-sm font-semibold text-text-main mb-4">Suggested accommodation</h4>
                  <div className="flex gap-4">
                    {hotel.mainPhoto && (
                      <div className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-stone-200">
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
                          <span className="text-sm text-amber-500">
                            {'★'.repeat(getStarRating(hotel.rating?.value, hotel.stars))}
                          </span>
                        )}
                        {hotel.rating?.value > 0 && (
                          <span className="text-sm font-medium text-primary">{hotel.rating.value.toFixed(1)}</span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">
                        €{formatNumber(hotel.price || hotel.pricePerNight)}/night
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
              {isProposing ? 'Proposing...' : 'Propose to group'}
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
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => onBook('skyscanner', links?.skyscanner)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors"
              >
                Book this trip
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button
                onClick={() => onBook('booking', links?.booking)}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-surface-muted text-text-secondary font-medium rounded-xl hover:bg-surface-hover hover:text-text-main transition-colors"
              >
                View hotels
              </button>
            </>
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
    return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-text-main">{formatTime(departureTime)}</p>
        <p className="text-xs text-text-secondary">{departureAirport || 'DEP'}</p>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-px bg-stone-300" />
        <span className="text-xs text-text-light px-2">{duration}</span>
        <div className="flex-1 h-px bg-stone-300" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-text-main">{formatTime(arrivalTime)}</p>
        <p className="text-xs text-text-secondary">{arrivalAirport || 'ARR'}</p>
      </div>
    </div>
  );
}

export default Results;
