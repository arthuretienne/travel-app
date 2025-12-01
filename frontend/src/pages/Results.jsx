// frontend/src/pages/Results.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
  AlertTriangle, Trophy, Calendar, Lightbulb, CloudSun, Plane,
  Building, Ticket, Save, BarChart, Frown, ArrowLeft, Search,
  ExternalLink, Clock, MapPin, Star, Check, X, ChevronLeft, ChevronRight,
  Hotel, Sparkles, Users
} from 'lucide-react';

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
  const [currentIndex, setCurrentIndex] = useState(0);

  // Check if we're proposing for a group trip
  const forGroupTrip = location.state?.forGroupTrip;

  // Carousel navigation
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % recommendations.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + recommendations.length) % recommendations.length);
  };

  const goToIndex = (index) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    // If recommendations are passed via state, use them directly
    if (location.state?.recommendations) {
      setRecommendations(location.state.recommendations);
      setCurrentIndex(0); // Reset to first destination
      setLoading(false);
    } else if (searchId) {
      // Otherwise fetch from API using searchId
      fetchRecommendations();
    } else {
      setLoading(false);
      setError('No recommendations available');
    }
  }, [searchId, location.state]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (recommendations.length > 1) {
        if (e.key === 'ArrowLeft') {
          goToPrevious();
        } else if (e.key === 'ArrowRight') {
          goToNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [recommendations.length, currentIndex]);

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

      if (!silent) {
        alert('Trip saved successfully!');
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
    // Auto-save trip silently before navigating
    await handleSaveTrip(tripIndex, true);

    // Track click (could send to analytics later)
    console.log(`Affiliate click tracked: ${linkType} for trip ${tripIndex}`);

    // Navigate to affiliate link
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
      alert(err.message || 'Failed to propose destination. Please try again.');
    } finally {
      setProposingTripId(null);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNewSearch = () => {
    navigate('/create-trip');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatNumber = (num) => {
    return parseFloat(num.toFixed(2));
  };

  const getDestinationImage = (photo, city, country) => {
    if (photo && photo.url) {
      return photo.url;
    }
    const query = encodeURIComponent(`${city} ${country} travel`);
    return `https://source.unsplash.com/800x400/?${query}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-500 border-emerald-500 bg-emerald-50';
    if (score >= 80) return 'text-blue-500 border-blue-500 bg-blue-50';
    if (score >= 70) return 'text-amber-500 border-amber-500 bg-amber-50';
    return 'text-red-500 border-red-500 bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-text-main mb-2">Finding your perfect trips...</h2>
          <p className="text-text-secondary">Analyzing your profile and searching thousands of flights to find the best matches.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-lg w-full text-center shadow-card border border-gray-100">
          <div className="inline-flex p-4 bg-red-50 text-red-500 rounded-full mb-6">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-text-main mb-2">Oops! Something went wrong</h2>
          <p className="text-text-secondary mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="px-6 py-3 bg-white text-text-secondary font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={handleBackToDashboard}
            >
              Back to Dashboard
            </button>
            <button
              className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
              onClick={handleNewSearch}
            >
              Try New Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            {forGroupTrip ? (
              <>
                <h1 className="text-3xl font-bold text-text-main mb-2">Propose a Destination</h1>
                <p className="text-text-secondary">
                  We crafted <strong className="text-primary">{recommendations.length} exceptional destinations</strong> based on your group's preferences. Choose one to propose!
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-text-main mb-2">Your Perfect Trips</h1>
                <p className="text-text-secondary">
                  We crafted <strong className="text-primary">{recommendations.length} exceptional destinations</strong> tailored just for you
                </p>
              </>
            )}
          </div>
          <div className="flex gap-3">
            {forGroupTrip ? (
              <button
                className="flex items-center gap-2 px-4 py-2 bg-white text-text-secondary font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/trips/${forGroupTrip}`)}
              >
                <ArrowLeft size={18} />
                Back to Trip
              </button>
            ) : (
              <>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-white text-text-secondary font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  onClick={handleBackToDashboard}
                >
                  <ArrowLeft size={18} />
                  Dashboard
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
                  onClick={handleNewSearch}
                >
                  <Search size={18} />
                  New Search
                </button>
              </>
            )}
          </div>
        </div>

        {/* Carousel Navigation Dots */}
        {recommendations.length > 1 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {recommendations.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`transition-all ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-primary rounded-full'
                    : 'w-2 h-2 bg-gray-300 rounded-full hover:bg-gray-400'
                }`}
                aria-label={`Go to destination ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Carousel Container with Navigation */}
        {recommendations.length > 0 && (
          <div className="relative">
            {/* Previous Button */}
            {recommendations.length > 1 && (
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 hover:bg-white hover:scale-110 transition-all"
                aria-label="Previous destination"
              >
                <ChevronLeft size={24} className="text-gray-700" />
              </button>
            )}

            {/* Next Button */}
            {recommendations.length > 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 hover:bg-white hover:scale-110 transition-all"
                aria-label="Next destination"
              >
                <ChevronRight size={24} className="text-gray-700" />
              </button>
            )}

            {/* Current Destination Card */}
            {recommendations.map((trip, index) => (
              index === currentIndex && (
            <div key={index} className="bg-white rounded-3xl overflow-hidden shadow-card border border-gray-100 hover:border-primary/30 transition-all group">
              <div className="flex flex-col lg:flex-row">
                {/* Destination Image */}
                <div className="lg:w-1/3 relative h-64 lg:h-auto overflow-hidden">
                  <img
                    src={getDestinationImage(trip.destination.photo, trip.destination.city, trip.destination.country)}
                    alt={trip.destination.photo?.alt || `${trip.destination.city}, ${trip.destination.country}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = `https://source.unsplash.com/800x400/?${encodeURIComponent(trip.destination.city)}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:bg-gradient-to-r"></div>

                  {/* Rank Badge */}
                  <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-bold text-white shadow-sm flex items-center gap-1 ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                    }`}>
                    {index === 0 ? <Trophy size={14} /> : <span>#{index + 1}</span>}
                    {index === 0 ? 'Top Match' : 'Great Choice'}
                  </div>

                  {trip.destination.photo && trip.destination.photo.photographer && (
                    <div className="absolute bottom-2 right-2 text-[10px] text-white/70 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                      Photo by <a href={trip.destination.photo.photographer.link} target="_blank" rel="noopener noreferrer" className="hover:text-white underline">{trip.destination.photo.photographer.name}</a> on Unsplash
                    </div>
                  )}
                </div>

                {/* Main Content */}
                <div className="lg:w-2/3 p-6 md:p-8 flex flex-col">
                  {/* Destination Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-text-main flex items-baseline gap-3 mb-2">
                        {trip.destination.city}
                        <span className="text-lg md:text-xl font-normal text-text-secondary">{trip.destination.country}</span>
                      </h3>
                      <div className="flex items-center gap-2 text-sm font-medium text-text-secondary bg-gray-50 px-3 py-1.5 rounded-lg w-fit">
                        <Calendar size={16} className="text-primary" />
                        {formatDate(trip.slot.startDate)} - {formatDate(trip.slot.endDate)}
                        <span className="text-gray-300">|</span>
                        <Clock size={16} className="text-primary" />
                        {trip.slot.duration} days
                      </div>
                    </div>

                    <div className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 ${getScoreColor(trip.score.total)}`}>
                      <div className="text-2xl font-bold leading-none">
                        {formatNumber(trip.score.total)}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">match</div>
                    </div>
                  </div>

                  {/* Why This Trip */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold text-sm">
                        <Lightbulb size={16} />
                        Why this destination?
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{trip.destination.matchReason}</p>
                    </div>
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold text-sm">
                        <CloudSun size={16} />
                        Why now?
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{trip.destination.seasonReason}</p>
                    </div>
                  </div>

                  {/* Price Overview */}
                  <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <div className="text-sm text-text-secondary mb-1">Total Trip Cost</div>
                        <div className="text-2xl font-bold text-text-main">€{formatNumber(trip.pricing.total)}</div>
                      </div>
                      {trip.pricing.remaining >= 0 ? (
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                          <Check size={14} />
                          €{formatNumber(trip.pricing.remaining)} under budget
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center gap-1">
                          <AlertTriangle size={14} />
                          €{formatNumber(Math.abs(trip.pricing.remaining))} over budget
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-gray-100">
                        <Plane size={16} className="text-blue-500 mb-1" />
                        <span className="text-text-secondary text-xs">Flight</span>
                        <span className="font-semibold">€{formatNumber(trip.pricing.flight)}</span>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-gray-100">
                        <Building size={16} className="text-purple-500 mb-1" />
                        <span className="text-text-secondary text-xs">Hotel</span>
                        <span className="font-semibold">€{formatNumber(trip.pricing.hotel)}</span>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-gray-100">
                        <Ticket size={16} className="text-pink-500 mb-1" />
                        <span className="text-text-secondary text-xs">Activities</span>
                        <span className="font-semibold">€{formatNumber(trip.pricing.activities)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Flight Info */}
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="w-20 font-medium text-text-secondary">Outbound</div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="font-mono font-semibold">{new Date(trip.flightDetails.outbound.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-[1px] bg-gray-300 flex-1"></div>
                          <div className="text-xs text-text-secondary flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                            <Plane size={10} className="rotate-90" />
                            {trip.flightDetails.outbound.duration}
                          </div>
                          <div className="h-[1px] bg-gray-300 flex-1"></div>
                        </div>
                        <div className="font-mono font-semibold">{new Date(trip.flightDetails.outbound.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>

                    {trip.flightDetails.return && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="w-20 font-medium text-text-secondary">Return</div>
                        <div className="flex-1 flex items-center gap-3">
                          <div className="font-mono font-semibold">{new Date(trip.flightDetails.return.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="h-[1px] bg-gray-300 flex-1"></div>
                            <div className="text-xs text-text-secondary flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Plane size={10} className="-rotate-90" />
                              {trip.flightDetails.return.duration}
                            </div>
                            <div className="h-[1px] bg-gray-300 flex-1"></div>
                          </div>
                          <div className="font-mono font-semibold">{new Date(trip.flightDetails.return.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-text-secondary pt-2 border-t border-gray-100 flex justify-between">
                      <div className="flex items-center gap-2">
                        {trip.flightDetails.outbound?.segments?.[0]?.carrierLogo && (
                          <img
                            src={trip.flightDetails.outbound.segments[0].carrierLogo}
                            alt={trip.flightDetails.airline}
                            className="h-4 w-auto"
                          />
                        )}
                        <span>{trip.flightDetails.airline} • {trip.flightDetails.cabinClass}</span>
                      </div>
                      <span className="font-medium">€{trip.flightDetails.totalPrice}</span>
                    </div>
                  </div>

                  {/* Hotel Options */}
                  {trip.hotelOptions && trip.hotelOptions.hotels && trip.hotelOptions.hotels.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-sm font-bold text-text-main mb-3 uppercase tracking-wider">Recommended Hotels</h4>
                      <div className="space-y-3">
                        {trip.hotelOptions.hotels.slice(0, 3).map((hotel, hotelIndex) => (
                          <div key={hotelIndex} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-primary/30 transition-colors">
                            <div>
                              <div className="font-medium text-text-main">{hotel.name}</div>
                              <div className="flex text-yellow-400 text-xs mt-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={10} fill={i < hotel.rating ? "currentColor" : "none"} className={i < hotel.rating ? "" : "text-gray-300"} />
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-text-main">€{Math.round(hotel.price.total)}</div>
                              <button
                                onClick={() => handleAffiliateClick(index, 'booking_hotel', hotel.bookingUrl)}
                                className="text-xs text-primary hover:underline flex items-center justify-end gap-1"
                              >
                                View <ExternalLink size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-6 border-t border-gray-100">
                    {forGroupTrip ? (
                      <button
                        className="flex-1 py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                        onClick={() => handleProposeToGroup(index)}
                        disabled={proposingTripId === index}
                      >
                        <Users size={18} className={proposingTripId === index ? "animate-pulse" : ""} />
                        {proposingTripId === index ? 'Proposing...' : 'Propose to Group'}
                      </button>
                    ) : (
                      <button
                        className="flex-1 py-3 px-4 bg-white border border-gray-200 text-text-main font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={() => handleSaveTrip(index)}
                        disabled={savingTripId === index}
                      >
                        <Save size={18} className={savingTripId === index ? "animate-pulse" : ""} />
                        {savingTripId === index ? 'Saving...' : 'Save Trip'}
                      </button>
                    )}
                    <button
                      onClick={() => handleAffiliateClick(index, 'skyscanner', trip.links.skyscanner)}
                      className="flex-1 py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                      <Plane size={18} />
                      Book Flights
                    </button>
                    <button
                      onClick={() => handleAffiliateClick(index, 'booking', trip.links.booking)}
                      className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      <Building size={18} />
                      Book Hotels
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Details */}
              <details className="group/details border-t border-gray-100 bg-gray-50/50">
                <summary className="flex items-center justify-center gap-2 p-4 cursor-pointer text-sm font-medium text-text-secondary hover:text-primary transition-colors list-none">
                  <BarChart size={16} />
                  View detailed scoring breakdown
                  <span className="group-open/details:rotate-180 transition-transform">
                    <ArrowLeft size={14} className="-rotate-90" />
                  </span>
                </summary>
                <div className="p-6 pt-0 border-t border-gray-100/50">
                  <div className="max-w-2xl mx-auto pt-6">
                    <h4 className="text-sm font-bold text-text-main mb-4">Scoring Breakdown</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-secondary">AI Match (40%)</span>
                          <span className="font-bold">{formatNumber(trip.score.breakdown.aiMatch)}pts</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${formatNumber(trip.score.breakdown.aiMatch)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-secondary">Price Value (30%)</span>
                          <span className="font-bold">{formatNumber(trip.score.breakdown.price)}pts</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${formatNumber(trip.score.breakdown.price)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-secondary">Originality (20%)</span>
                          <span className="font-bold">{formatNumber(trip.score.breakdown.originality)}pts</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${formatNumber(trip.score.breakdown.originality)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-secondary">Availability (10%)</span>
                          <span className="font-bold">{formatNumber(trip.score.breakdown.availability)}pts</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${formatNumber(trip.score.breakdown.availability)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
              )
            ))}
          </div>
        )}

        {recommendations.length === 0 && (
          <div className="bg-white rounded-3xl p-16 text-center shadow-card border border-gray-100">
            <div className="inline-flex p-6 bg-gray-50 text-gray-400 rounded-full mb-6">
              <Frown size={48} />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">No trips found</h3>
            <p className="text-text-secondary mb-8">Try adjusting your preferences or budget to find more options.</p>
            <button
              className="px-8 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
              onClick={handleNewSearch}
            >
              Try New Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Results;
