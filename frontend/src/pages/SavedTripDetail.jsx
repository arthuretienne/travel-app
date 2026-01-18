// frontend/src/pages/SavedTripDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { SavedTripDetailSkeleton } from '../components/SkeletonLoaders';
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
} from 'lucide-react';
import { CompleteTripPlanCard, PersonalizedItineraryCard, LocalEventsCard } from '../components/TripEnhancementComponents';
import StickyBookingProgress, { BookingChecklistCard } from '../components/StickyBookingProgress';

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

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

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

  if (loading) {
    return <SavedTripDetailSkeleton />;
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
  const flightDetails = tripData.flightDetails || {};
  const hotelOptions = tripData.hotelOptions || {};
  const links = tripData.links || {};

  const duration = trip.startDate && trip.endDate
    ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
    : slot.duration || 0;

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Sticky Booking Progress Bar */}
      <StickyBookingProgress
        city={safeText(trip.city)}
        country={safeText(trip.country)}
        startDate={trip.startDate}
        endDate={trip.endDate}
        adults={1}
        onBack={() => navigate('/dashboard')}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-text-main">
                  {safeText(trip.city)}, {safeText(trip.country)}
                </h1>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary-light text-primary">
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
        {/* Booking Checklist Card */}
        <BookingChecklistCard
          city={safeText(trip.city)}
          country={safeText(trip.country)}
          startDate={trip.startDate}
          endDate={trip.endDate}
          adults={1}
        />

        {/* Flight Details */}
        {flightDetails && (flightDetails.outbound || flightDetails.return) && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-text-main">Flights</h2>
              </div>
              {flightDetails.totalPrice && (
                <span className="text-lg font-bold text-primary">
                  €{Math.round(flightDetails.totalPrice)}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Outbound Flight */}
              {flightDetails.outbound && (
                <div className="p-4 bg-primary-light rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-text-main">Outbound Flight</span>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {slot.startDate ? new Date(slot.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-text-main">
                        {flightDetails.outbound.departureTime ? new Date(flightDetails.outbound.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                      <div className="text-xs text-primary">{flightDetails.outbound.departureAirport || trip.city}</div>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-px bg-primary/30 flex-1"></div>
                      <div className="text-xs text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                        <Plane size={10} className="rotate-90" />
                        {flightDetails.outbound.duration || 'Duration N/A'}
                      </div>
                      <div className="h-px bg-primary/30 flex-1"></div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-text-main">
                        {flightDetails.outbound.arrivalTime ? new Date(flightDetails.outbound.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                      <div className="text-xs text-primary">{flightDetails.outbound.arrivalAirport || destination.city}</div>
                    </div>
                  </div>
                  {/* Airline info */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary/20">
                    {flightDetails.outbound.segments?.[0]?.carrierLogo && (
                      <img src={flightDetails.outbound.segments[0].carrierLogo} alt={flightDetails.airline} className="h-5 w-auto" />
                    )}
                    <span className="text-xs text-primary">{flightDetails.airline || 'Airline'} • {flightDetails.cabinClass || 'Economy'}</span>
                  </div>
                </div>
              )}

              {/* Return Flight */}
              {flightDetails.return && (
                <div className="p-4 bg-primary-light rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-text-main">Return Flight</span>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {slot.endDate ? new Date(slot.endDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-text-main">
                        {flightDetails.return.departureTime ? new Date(flightDetails.return.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                      <div className="text-xs text-primary">{flightDetails.return.departureAirport || destination.city}</div>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-px bg-primary/30 flex-1"></div>
                      <div className="text-xs text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                        <Plane size={10} className="-rotate-90" />
                        {flightDetails.return.duration || 'Duration N/A'}
                      </div>
                      <div className="h-px bg-primary/30 flex-1"></div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-text-main">
                        {flightDetails.return.arrivalTime ? new Date(flightDetails.return.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                      <div className="text-xs text-primary">{flightDetails.return.arrivalAirport || trip.city}</div>
                    </div>
                  </div>
                  {/* Airline info */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary/20">
                    {flightDetails.return.segments?.[0]?.carrierLogo && (
                      <img src={flightDetails.return.segments[0].carrierLogo} alt={flightDetails.airline} className="h-5 w-auto" />
                    )}
                    <span className="text-xs text-primary">{flightDetails.airline || 'Airline'} • {flightDetails.cabinClass || 'Economy'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accommodation */}
        {(hotelOptions?.hotels?.length > 0 || pricing?.hotel) && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Hotel className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-text-main">Accommodation</h2>
              </div>
              {pricing?.hotel && (
                <span className="text-lg font-bold text-primary">
                  €{Math.round(pricing.hotel)}
                </span>
              )}
            </div>

            {/* Summary card */}
            <div className="p-4 bg-green-50 rounded-xl mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">
                  {duration} nights
                </span>
                <span className="text-sm text-green-700">
                  ~€{Math.round((pricing?.hotel || 0) / duration)} per night
                </span>
              </div>
            </div>

            {/* Hotel list */}
            {hotelOptions?.hotels?.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text-main">Recommended Hotels:</p>
                {hotelOptions.hotels.slice(0, 3).map((hotel, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-text-main">{safeText(hotel.name)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {hotel.stars && (
                            <span className="text-xs text-amber-600 flex items-center gap-0.5">
                              {'★'.repeat(typeof hotel.stars === 'number' ? hotel.stars : 0)}
                            </span>
                          )}
                          {hotel.rating?.value && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {safeText(hotel.rating.value)}/10
                            </span>
                          )}
                          {hotel.location && (
                            <span className="text-xs text-text-secondary flex items-center gap-1">
                              <MapPin size={10} />
                              {safeText(hotel.location)}
                            </span>
                          )}
                        </div>
                        {hotel.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {hotel.amenities.slice(0, 4).map((amenity, i) => {
                              const text = typeof amenity === 'string' ? amenity : (amenity?.word || amenity?.value || amenity?.name || '');
                              if (!text) return null;
                              return (
                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                  {text}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">
                          €{Math.round(hotel.pricePerNight || hotel.price?.amount / duration || 0)}
                        </span>
                        <span className="text-xs text-text-secondary block">/night</span>
                      </div>
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
              {destination.highlights.map((highlight, idx) => {
                // Handle both string and object highlights {word, count, value}
                const text = typeof highlight === 'string' ? highlight : (highlight?.word || highlight?.value || highlight?.text || '');
                if (!text) return null;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                    <span className="text-sm text-purple-900">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Match Reasons */}
        {tripData.matchReason && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-text-main mb-4">Why This Destination?</h2>
            <p className="text-text-secondary leading-relaxed">{safeText(tripData.matchReason)}</p>

            {tripData.seasonReason && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl">
                <p className="text-sm font-medium text-amber-900 mb-1">Best Season</p>
                <p className="text-sm text-amber-700">{safeText(tripData.seasonReason)}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {trip.notes && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-text-main mb-4">Notes</h2>
            <p className="text-text-secondary whitespace-pre-wrap">{safeText(trip.notes)}</p>
          </div>
        )}

        {/* TRIP ENHANCEMENTS - Weather, Itinerary, Packing, Events */}
        <TripEnhancementsSection trip={trip} userName={user?.firstName || 'there'} />
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
                        className="flex items-center justify-between p-2 bg-primary-light rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-primary" />
                          <span className="text-sm text-text-main">{email}</span>
                        </div>
                        <button
                          onClick={() => removeInviteEmail(email)}
                          className="p-1 hover:bg-primary/10 rounded transition-colors"
                        >
                          <X size={16} className="text-primary" />
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
// Separate components loading in parallel
// ========================================
function TripEnhancementsSection({ trip, userName }) {
  const { getToken } = useAuth();

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
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Weather */}
        {weatherLoading ? (
          <div className="bg-primary-light rounded-xl p-4 animate-pulse border border-primary/10">
            <div className="h-4 bg-primary-muted rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-primary-muted rounded w-3/4"></div>
          </div>
        ) : weather ? (
          <WeatherForecastCard weather={weather} destination={destination} />
        ) : null}

        {/* Packing */}
        {packingLoading ? (
          <div className="bg-primary-light rounded-xl p-4 animate-pulse border border-primary/10">
            <div className="h-4 bg-primary-muted rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-primary-muted rounded w-3/4"></div>
          </div>
        ) : packing ? (
          <PackingTipsCard packing={packing} />
        ) : null}
      </div>

      {/* Itinerary - Loads in background */}
      {itineraryLoading ? (
        <div className="bg-gradient-to-br from-primary-light via-white to-stone-50 rounded-2xl shadow-card border border-stone-200 p-8">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text-main mb-2">Creating Your Personalized Plan...</h3>
            <p className="text-text-secondary">
              Our AI is planning your perfect trip with flights, transfers, activities, and timing
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
function WeatherForecastCard({ weather, destination }) {
  // Get average conditions for trip period (first 5-7 days)
  const tripForecast = weather.forecast.slice(0, Math.min(5, weather.forecast.length));
  const avgTemp = Math.round(
    tripForecast.reduce((sum, day) => sum + day.day.avgtemp_c, 0) / tripForecast.length
  );
  const maxRainChance = Math.max(...tripForecast.map(d => d.day.daily_chance_of_rain));

  return (
    <div className="bg-white rounded-xl shadow-card border border-stone-200 p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center">
          <img src={weather.current.icon} alt={weather.current.condition} className="w-10 h-10" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-main">Weather Forecast</h3>
          <p className="text-sm text-text-secondary">
            Currently {Math.round(weather.current.temp_c)}°C • {weather.current.condition}
          </p>
          <p className="text-xs text-text-light mt-1">
            Trip average: ~{avgTemp}°C
            {maxRainChance > 30 && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary-light text-primary rounded text-xs">
                {maxRainChance}% rain
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Packing Tips Card Component - Teal Design System
function PackingTipsCard({ packing }) {
  // Get only the MOST important tips (first 2 essentials)
  const keyEssentials = packing.essentials.slice(0, 2);
  const keyClothing = packing.clothing.slice(0, 1);

  return (
    <div className="bg-white rounded-xl shadow-card border border-stone-200 p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
          <Backpack className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-main mb-2">Packing Essentials</h3>
          <div className="space-y-1.5 text-sm">
            {keyEssentials.map((item, idx) => {
              const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
              if (!text) return null;
              return (
                <div key={idx} className="flex items-center gap-2 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{text}</span>
                </div>
              );
            })}
            {keyClothing.map((item, idx) => {
              const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
              if (!text) return null;
              return (
                <div key={idx} className="flex items-center gap-2 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
          {packing.weatherSummary && (
            <p className="text-xs text-text-light mt-2">
              {packing.weatherSummary.tempRange}
              {packing.weatherSummary.rainChance > 30 && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary-light text-primary rounded">Rain gear</span>
              )}
              {packing.weatherSummary.maxUV > 6 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">SPF 50+</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
