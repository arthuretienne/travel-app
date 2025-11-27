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
  ExternalLink,
  Users,
  Loader2,
  AlertCircle,
  Trash2,
  UserPlus,
  X,
  Mail,
  Send,
  Building,
  CheckSquare,
  Square,
  Star,
  Sun,
  CloudRain,
  Cloudy,
  CloudSnow,
  Wind,
  Droplet,
  Backpack,
  Heart,
  Circle,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { PersonalizedItineraryCard, LocalEventsCard } from '../components/TripEnhancementComponents';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function SavedTripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [bookingChecklist, setBookingChecklist] = useState({
    flight: false,
    transportAlternatives: {},
    hotels: {},
    activities: {},
  });

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
        setInviteError('Invalid email format');
        return;
      }

      // Check for duplicates
      if (inviteEmails.includes(email)) {
        setInviteError('Email already added');
        return;
      }

      // In development, allow self-invite for testing (Resend sandbox)
      const isDevelopment = import.meta.env.DEV;
      if (user?.primaryEmailAddress?.emailAddress === email && !isDevelopment) {
        setInviteError('Cannot invite yourself');
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
      setInviteError('Please add at least one email');
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
      const groupTripId = convertData.data?.trip?.id;

      if (!groupTripId) {
        throw new Error('Group trip ID not found');
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

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
      alert('Failed to delete trip');
    }
  };

  const toggleBookingItem = (category, itemId = null) => {
    setBookingChecklist(prev => {
      if (itemId === null) {
        // Toggle simple boolean (flight)
        return { ...prev, [category]: !prev[category] };
      } else {
        // Toggle nested object (hotels, activities, transportAlternatives)
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [itemId]: !prev[category][itemId],
          },
        };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700 mb-4">{error || 'Trip not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tripData = trip.tripData || {};
  const destination = tripData.destination || {};
  const pricing = tripData.pricing || {};
  const slot = tripData.slot || {};
  const flights = tripData.flights || {};
  const hotels = tripData.hotels || {};

  const duration = trip.startDate && trip.endDate
    ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
    : slot.duration || 0;

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-main mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-text-main">
                  {trip.city}, {trip.country}
                </h1>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                Solo Trip
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                <UserPlus size={18} />
                Invite Friends
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete trip"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-text-secondary">Departure</p>
                <p className="font-semibold text-text-main">
                  {trip.startDate
                    ? new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Date not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-text-secondary">Duration</p>
                <p className="font-semibold text-text-main">{duration} Days</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-text-secondary">Total Budget</p>
                <p className="font-semibold text-text-main">
                  €{Math.round(pricing.total || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Flight Details */}
        {flights && (flights.outbound || flights.return) && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plane className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text-main">Flights</h2>
            </div>

            <div className="space-y-4">
              {/* Outbound Flight */}
              {flights.outbound && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Outbound</span>
                    <span className="text-lg font-bold text-blue-900">
                      €{Math.round(flights.outbound.price || 0)}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <p>{flights.outbound.origin} → {flights.outbound.destination}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {flights.outbound.carrier} • {flights.outbound.duration || 'Duration N/A'}
                    </p>
                  </div>
                </div>
              )}

              {/* Return Flight */}
              {flights.return && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Return</span>
                    <span className="text-lg font-bold text-blue-900">
                      €{Math.round(flights.return.price || 0)}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <p>{flights.return.origin} → {flights.return.destination}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {flights.return.carrier} • {flights.return.duration || 'Duration N/A'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accommodation */}
        {hotels && hotels.averagePrice && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Hotel className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text-main">Accommodation</h2>
            </div>

            <div className="p-4 bg-green-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">
                  {duration} nights • {hotels.source === 'booking_com' ? 'Booking.com' : 'Estimated'}
                </span>
                <span className="text-lg font-bold text-green-900">
                  €{Math.round(hotels.totalCost || 0)}
                </span>
              </div>
              <p className="text-sm text-green-700">
                Average: €{Math.round(hotels.averagePrice || 0)} per night
              </p>
              {hotels.confidence && (
                <p className="text-xs text-green-600 mt-1">
                  Confidence: {hotels.confidence}
                </p>
              )}
            </div>

            {hotels.options && hotels.options.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-text-secondary">Suggested Hotels:</p>
                {hotels.options.slice(0, 3).map((hotel, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-text-main">{hotel.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-text-secondary">
                        {hotel.rating ? `⭐ ${hotel.rating}/10` : 'No rating'}
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        €{Math.round(hotel.price?.total || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activities & Highlights */}
        {destination.highlights && destination.highlights.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text-main">Highlights & Activities</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {destination.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                  <span className="text-sm text-purple-900">{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match Reasons */}
        {tripData.matchReason && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-text-main mb-4">Why This Destination?</h2>
            <p className="text-text-secondary leading-relaxed">{tripData.matchReason}</p>

            {tripData.seasonReason && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl">
                <p className="text-sm font-medium text-amber-900 mb-1">Best Season</p>
                <p className="text-sm text-amber-700">{tripData.seasonReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {trip.notes && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-text-main mb-4">Notes</h2>
            <p className="text-text-secondary whitespace-pre-wrap">{trip.notes}</p>
          </div>
        )}

        {/* TRIP ENHANCEMENTS - Weather, Itinerary, Packing, Events */}
        <TripEnhancementsSection trip={trip} userName={user?.firstName || 'there'} />

        {/* Book Your Trip - 3 Column Layout */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-text-main mb-1">Book Your Trip</h2>
            <p className="text-sm text-text-secondary">Everything you need to make your journey perfect</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-0">
            {/* Transport Column */}
            <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="text-blue-600" size={20} />
                <h3 className="font-bold text-gray-900">Transport</h3>
              </div>

              {/* Flight Details */}
              {trip.tripData?.flightDetails && (
                <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => toggleBookingItem('flight')}
                      className="flex-shrink-0 hover:scale-110 transition-transform"
                    >
                      {bookingChecklist.flight ? (
                        <CheckSquare size={18} className="text-green-600" />
                      ) : (
                        <Square size={18} className="text-gray-400" />
                      )}
                    </button>
                    <Plane size={16} className="text-blue-600" />
                    <span className="font-semibold text-sm">Flight</span>
                    {trip.tripData.flightDetails.isEstimate && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Estimated</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 ml-7">
                    <div>{trip.tripData.flightDetails.airline || 'TBD'}</div>
                    <div className="font-bold text-lg text-gray-900">€{trip.tripData.flightDetails.totalPrice}</div>
                    {trip.tripData.flightDetails.outbound?.duration && (
                      <div className="text-gray-500">Duration: {trip.tripData.flightDetails.outbound.duration}</div>
                    )}
                  </div>
                  <a
                    href={`https://www.skyscanner.com/transport/flights/${encodeURIComponent(trip.city.toLowerCase())}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 ml-0"
                  >
                    Book Flight
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {/* Alternative Transport */}
              {trip.tripData?.transportAlternatives && trip.tripData.transportAlternatives.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alternatives</div>
                  {trip.tripData.transportAlternatives.map((alt, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => toggleBookingItem('transportAlternatives', idx)}
                          className="flex-shrink-0 hover:scale-110 transition-transform"
                        >
                          {bookingChecklist.transportAlternatives[idx] ? (
                            <CheckSquare size={16} className="text-green-600" />
                          ) : (
                            <Square size={16} className="text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm font-medium flex-1">{alt.operator}</span>
                        {alt.isEstimate && <span className="text-xs text-gray-500">Estimé</span>}
                      </div>
                      <div className="text-lg font-bold text-gray-900 ml-6">€{alt.price}</div>
                      {alt.duration && <div className="text-xs text-gray-500 ml-6">{Math.round(alt.duration / 60)}h</div>}
                      <a
                        href={alt.bookingUrl || 'https://www.trainline.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 w-full py-1.5 px-3 bg-gray-200 text-gray-800 text-xs font-medium rounded hover:bg-gray-300 transition-colors flex items-center justify-center gap-1"
                      >
                        Book {alt.type}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accommodation Column */}
            <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Hotel className="text-green-600" size={20} />
                <h3 className="font-bold text-gray-900">Accommodation</h3>
              </div>

              {trip.tripData?.hotelOptions?.hotels && trip.tripData.hotelOptions.hotels.length > 0 ? (
                <div className="space-y-3">
                  {trip.tripData.hotelOptions.hotels.slice(0, 3).map((hotel, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => toggleBookingItem('hotels', idx)}
                          className="flex-shrink-0 hover:scale-110 transition-transform"
                        >
                          {bookingChecklist.hotels[idx] ? (
                            <CheckSquare size={18} className="text-green-600" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </button>
                        <div className="font-semibold text-sm text-gray-900 flex-1">{hotel.name}</div>
                      </div>
                      <div className="flex items-center gap-1 mb-2 ml-7">
                        {[...Array(Math.round(hotel.rating || 3))].map((_, i) => (
                          <Star key={i} size={12} className="text-yellow-500 fill-yellow-500" />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">{hotel.rating || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1 ml-7">
                        €{Math.round(hotel.pricePerNight)}/night × {trip.tripData.hotelOptions.nights} nights
                      </div>
                      <div className="text-lg font-bold text-gray-900 mb-3 ml-7">
                        €{Math.round(hotel.pricePerNight * trip.tripData.hotelOptions.nights)}
                      </div>
                      <a
                        href={hotel.url || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(trip.city)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-4 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        Book Hotel
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Hotel size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hotels loaded</p>
                  <a
                    href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(trip.city + ', ' + trip.country)}${trip.startDate ? `&checkin=${trip.startDate}` : ''}${trip.endDate ? `&checkout=${trip.endDate}` : ''}&group_adults=1&no_rooms=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block py-2 px-4 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Search on Booking.com
                  </a>
                </div>
              )}
            </div>

            {/* Activities Column */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-purple-600" size={20} />
                <h3 className="font-bold text-gray-900">Activities</h3>
              </div>

              {trip.tripData?.suggestedActivities && trip.tripData.suggestedActivities.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {trip.tripData.suggestedActivities.map((activity, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => toggleBookingItem('activities', idx)}
                          className="flex-shrink-0 hover:scale-110 transition-transform"
                        >
                          {bookingChecklist.activities[idx] ? (
                            <CheckSquare size={16} className="text-green-600" />
                          ) : (
                            <Square size={16} className="text-gray-400" />
                          )}
                        </button>
                        <div className="font-semibold text-sm text-gray-900 flex-1">{activity.name}</div>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 ml-6">{activity.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2 ml-6">
                        <span>{activity.duration}</span>
                        <span className="font-semibold text-gray-900">
                          {activity.estimatedPrice === 0 ? 'FREE' : `€${activity.estimatedPrice}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-6">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{activity.category}</span>
                        <span className="text-xs text-gray-500">{activity.when}</span>
                      </div>
                    </div>
                  ))}
                  <a
                    href={`https://www.getyourguide.com/s/?q=${encodeURIComponent(trip.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full py-2 px-4 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Book Activities
                    <ExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activities suggested</p>
                  <a
                    href={`https://www.google.com/travel/things-to-do?dest_src=tc&dest_mid=/m/${encodeURIComponent(trip.city)}&q=${encodeURIComponent(trip.city + ' things to do')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block py-2 px-4 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Discover Activities
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-main">Invite Friends</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmails([]);
                  setCurrentEmail('');
                  setInviteError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                This will convert your solo trip into a group trip and send invitations to your friends.
              </p>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Email Addresses
                </label>
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={addInviteEmail}
                  placeholder="Enter email and press Enter"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-text-secondary mt-1">Press Enter to add multiple emails</p>
              </div>

              {/* Email List */}
              {inviteEmails.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-main">Inviting ({inviteEmails.length}):</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {inviteEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-blue-600" />
                          <span className="text-sm text-blue-900">{email}</span>
                        </div>
                        <button
                          onClick={() => removeInviteEmail(email)}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                        >
                          <X size={16} className="text-blue-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {inviteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{inviteError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmails([]);
                  setCurrentEmail('');
                  setInviteError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-text-secondary rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={inviting}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteFriends}
                disabled={inviting || inviteEmails.length === 0}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {inviting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Invitations
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// TRIP ENHANCEMENTS SECTION
// Weather, Itinerary, Packing, Events
// ========================================
function TripEnhancementsSection({ trip, userName }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enhancements, setEnhancements] = useState(null);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    fetchEnhancements();
  }, [trip.id]);

  const fetchEnhancements = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/enhancements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Enhancement API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to load enhancements');
      }

      const data = await response.json();
      console.log('✅ Enhancements loaded:', data);
      setEnhancements(data.data);
    } catch (err) {
      console.error('Error fetching enhancements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Preparing your personalized trip plan...</p>
          <p className="text-sm text-text-secondary mt-2">Checking weather, planning itinerary, finding events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Unable to load trip enhancements</h3>
            <p className="text-sm text-amber-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!enhancements) return null;

  const { weather, packing, itinerary, events } = enhancements;
  // For SavedTrip, create a pseudo destination object from trip data
  const destination = {
    city: trip.city,
    country: trip.country,
    startDate: trip.startDate,
    endDate: trip.endDate,
  };

  return (
    <div className="space-y-6">
      {/* Weather & Packing Section - Side by Side */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weather Forecast */}
        {weather && <WeatherForecastCard weather={weather} destination={destination} />}

        {/* Packing Tips */}
        {packing && <PackingTipsCard packing={packing} destination={destination} />}
      </div>

      {/* Personalized Itinerary */}
      {itinerary && itinerary.length > 0 && (
        <PersonalizedItineraryCard
          itinerary={itinerary}
          userName={userName}
          activeDay={activeDay}
          setActiveDay={setActiveDay}
          destination={destination}
        />
      )}

      {/* Local Events */}
      {(events.upcoming.length > 0 || events.regular.length > 0) && (
        <LocalEventsCard events={events} destination={destination} />
      )}
    </div>
  );
}

// Weather Forecast Card Component
function WeatherForecastCard({ weather, destination }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl shadow-card border border-blue-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sun className="w-6 h-6 text-yellow-500" />
            Weather Forecast
          </h2>
          <span className="text-sm text-gray-600">{destination.city}</span>
        </div>

        {/* Current Weather */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Current Conditions</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={weather.current.icon} alt={weather.current.condition} className="w-16 h-16" />
              <div>
                <p className="text-3xl font-bold text-gray-900">{Math.round(weather.current.temp_c)}°C</p>
                <p className="text-sm text-gray-600">{weather.current.condition}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div className="flex items-center gap-1 justify-end">
                <Droplet className="w-4 h-4" />
                <span>{weather.current.humidity}%</span>
              </div>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Wind className="w-4 h-4" />
                <span>{Math.round(weather.current.wind_kph)} km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-3">7-Day Forecast</p>
          {weather.forecast.map((day, idx) => (
            <div key={idx} className="bg-white rounded-lg p-3 flex items-center justify-between hover:bg-blue-50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-gray-700 w-20">
                  {idx === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <img src={day.day.icon} alt={day.day.condition} className="w-8 h-8" />
                <span className="text-xs text-gray-600 flex-1">{day.day.condition}</span>
              </div>
              <div className="flex items-center gap-3">
                {day.day.daily_chance_of_rain > 30 && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Droplet className="w-3 h-3" />
                    {day.day.daily_chance_of_rain}%
                  </span>
                )}
                <span className="text-sm font-semibold text-gray-900">
                  {Math.round(day.day.maxtemp_c)}° / {Math.round(day.day.mintemp_c)}°
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Packing Tips Card Component
function PackingTipsCard({ packing, destination }) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-card border border-purple-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Backpack className="w-6 h-6 text-purple-600" />
            Packing Tips
          </h2>
          <span className="text-sm text-gray-600">{destination.city}</span>
        </div>

        {/* Weather Summary */}
        {packing.weatherSummary && (
          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Expected Conditions</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Avg Temperature</p>
                <p className="font-bold text-gray-900">{packing.weatherSummary.avgTemp}°C</p>
              </div>
              <div>
                <p className="text-gray-600">Range</p>
                <p className="font-bold text-gray-900">{packing.weatherSummary.tempRange}</p>
              </div>
              {packing.weatherSummary.rainChance > 20 && (
                <div>
                  <p className="text-gray-600">Rain Chance</p>
                  <p className="font-bold text-blue-600">{packing.weatherSummary.rainChance}%</p>
                </div>
              )}
              {packing.weatherSummary.maxUV > 5 && (
                <div>
                  <p className="text-gray-600">Max UV</p>
                  <p className="font-bold text-orange-600">{packing.weatherSummary.maxUV}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Packing Lists */}
        <div className="space-y-4">
          {/* Essential Items */}
          <div>
            <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
              <Heart className="w-4 h-4" />
              Essentials (Don't Forget!)
            </h3>
            <div className="bg-white rounded-lg p-3 space-y-1.5">
              {packing.essentials.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clothing */}
          <div>
            <h3 className="text-sm font-bold text-purple-700 mb-2">Clothing</h3>
            <div className="bg-white rounded-lg p-3 space-y-1.5">
              {packing.clothing.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Circle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Items */}
          {packing.optional.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-600 mb-2">Optional (Nice to Have)</h3>
              <div className="bg-white rounded-lg p-3 space-y-1.5">
                {packing.optional.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
