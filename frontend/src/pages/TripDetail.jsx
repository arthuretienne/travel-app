// frontend/src/pages/TripDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Plane,
  Home,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  UserPlus,
  X,
  Mail,
  Send,
  Trash2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trip, setTrip] = useState(null);
  const [userRole, setUserRole] = useState(null);
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
      const response = await fetch(`${API_URL}/api/trips/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Trip not found');
        }
        if (response.status === 403) {
          throw new Error('Access denied');
        }
        throw new Error('Failed to load trip');
      }

      const data = await response.json();
      setTrip(data.data.trip);
      setUserRole(data.data.userRole);
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

  const handleSendInvitations = async () => {
    if (inviteEmails.length === 0) return;

    try {
      setInviting(true);
      setInviteError(null);

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: inviteEmails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitations');
      }

      // Success - reset and close modal
      setInviteEmails([]);
      setCurrentEmail('');
      setShowInviteModal(false);

      // Refresh trip data to show new invitations
      await fetchTripDetails();

      alert(`✅ ${inviteEmails.length} invitation(s) sent successfully!`);
    } catch (err) {
      console.error('Error sending invitations:', err);
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return;

    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/trips/${id}`, {
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

  const getStatusInfo = (status, trip) => {
    // Determine the actual status based on trip data
    if (trip.finalDestination) {
      return {
        label: 'Confirmed',
        color: 'bg-green-100 text-green-800',
        description: 'Destination chosen, ready for bookings',
      };
    }

    if (trip.proposedTrips && trip.proposedTrips.length > 0) {
      return {
        label: 'Voting',
        color: 'bg-purple-100 text-purple-800',
        description: 'Vote for your favorite destination',
      };
    }

    return {
      label: 'Planning',
      color: 'bg-blue-100 text-blue-800',
      description: 'Propose destinations for the group',
    };
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
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

  if (!trip) {
    return null;
  }

  const statusInfo = getStatusInfo(trip.status, trip);
  const isPlanning = !trip.finalDestination && (!trip.proposedTrips || trip.proposedTrips.length === 0);
  const isVoting = !trip.finalDestination && trip.proposedTrips && trip.proposedTrips.length > 0;
  const isConfirmed = !!trip.finalDestination;

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Minimalist Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-main mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Trips</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-text-main">
                  {trip.finalDestination
                    ? `${trip.finalDestination.city} ${trip.finalDestination.country === 'Portugal' ? '🇵🇹' : '🌍'}`
                    : trip.name}
                </h1>
              </div>
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                <UserPlus size={18} />
                Invite Friends
              </button>
              {userRole === 'creator' && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete trip"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-text-secondary">Duration</p>
                <p className="font-semibold text-text-main">
                  {trip.finalStartDate && trip.finalEndDate
                    ? `${Math.ceil((new Date(trip.finalEndDate) - new Date(trip.finalStartDate)) / (1000 * 60 * 60 * 24))} Days`
                    : '15 Days'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-text-secondary">
                  {trip.finalStartDate ? 'Start date' : 'Dates'}
                </p>
                <p className="font-semibold text-text-main">
                  {trip.finalStartDate
                    ? new Date(trip.finalStartDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                    : 'To be defined'}
                </p>
              </div>
            </div>

            {trip.finalEndDate && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-text-secondary">End date</p>
                  <p className="font-semibold text-text-main">
                    {new Date(trip.finalEndDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Participants Section */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-main">Participants ({trip.members?.length || 0} + 1 creator)</h2>
            {(userRole === 'creator' || userRole === 'organizer') && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                <UserPlus size={18} />
                Invite Friends
              </button>
            )}
          </div>

          <div className="space-y-3">
            {trip.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <img
                      src={member.user?.imageUrl || `https://ui-avatars.com/api/?name=${member.user?.firstName}+${member.user?.lastName}`}
                      alt={member.user?.firstName}
                      className="w-12 h-12 rounded-full"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-text-main">
                      {member.user?.firstName} {member.user?.lastName}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {member.user?.email || 'Email not available'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-3 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                  {member.role}
                </span>
              </div>
            ))}
          </div>

          {/* Pending Invitations */}
          {trip.invitations && trip.invitations.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Pending Invitations ({trip.invitations.length})</h3>
              <div className="space-y-2">
                {trip.invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center gap-3 p-2 text-sm">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-text-secondary">{invitation.email}</span>
                    <span className="ml-auto text-xs text-amber-600">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Conditional Main Section */}
        {isPlanning && <PlanningSection trip={trip} navigate={navigate} />}
        {isVoting && <VotingSection trip={trip} fetchTripDetails={fetchTripDetails} />}
        {isConfirmed && <BookingChecklistSection trip={trip} fetchTripDetails={fetchTripDetails} />}
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-text-main flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-primary" />
                Invite Friends
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmails([]);
                  setCurrentEmail('');
                  setInviteError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Invite friends to join "<strong>{trip.name}</strong>" by entering their email addresses.
              </p>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Email Address
                </label>
                {inviteError && <p className="text-red-500 text-sm mb-2">{inviteError}</p>}
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={addInviteEmail}
                  placeholder="friend@example.com (Press Enter)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-2 text-xs text-text-secondary">
                  Press Enter after each email to add it to the list
                </p>
              </div>

              {/* Email List */}
              {inviteEmails.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-main">
                    Emails to Invite ({inviteEmails.length})
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {inviteEmails.map((email, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">{email}</span>
                        </div>
                        <button
                          onClick={() => removeInviteEmail(email)}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                        >
                          <X size={14} className="text-blue-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmails([]);
                    setCurrentEmail('');
                    setInviteError(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-text-secondary font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvitations}
                  disabled={inviteEmails.length === 0 || inviting}
                  className="flex-1 px-4 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {inviting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Send {inviteEmails.length} Invitation{inviteEmails.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Planning Section - When no destinations proposed yet
function PlanningSection({ trip, navigate }) {
  const { getToken } = useAuth();
  const [groupPrefs, setGroupPrefs] = useState(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [proposalMode, setProposalMode] = useState(null); // 'ai' or 'custom'
  const [customDestination, setCustomDestination] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchGroupPreferences();
  }, [trip.id]);

  const fetchGroupPreferences = async () => {
    try {
      setLoadingPrefs(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/group-preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGroupPrefs(data.data);
      }
    } catch (err) {
      console.error('Error fetching group preferences:', err);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const handleSmartSearch = async () => {
    if (!groupPrefs) return;

    try {
      setSearching(true);
      const token = await getToken();

      // Build AI search payload from group preferences
      const availability = groupPrefs.availability || {};
      const duration = availability.recommendedDuration || 7;

      const payload = {
        basic: {
          budget: groupPrefs.budget.average,
          style: groupPrefs.travelStyles[0] || 'cultural',
          activities: groupPrefs.activities.slice(0, 3),
          maxFlightHours: groupPrefs.maxFlightHours,
          destinationPreference: 'any',
          travelers: groupPrefs.defaultTravelers,
        },
        preferences: {
          climate: 'any',
          accommodation: 'hotel',
          pace: 'moderate',
          gastronomy: 'important',
          natureVsCity: 50,
          nightlife: groupPrefs.activities.includes('nightlife') ? 'important' : 'optional',
          activitiesBudget: 20,
        },
        constraints: {
          budget: groupPrefs.budget.average,
          maxFlightHours: groupPrefs.maxFlightHours,
          avoidCountries: [],
        },
        availability: {
          duration: duration,
          timeHorizon: '6-mois',
          idealDuration: `${duration}-jours`,
          flexibleDates: availability.departureFlexibility === 'flexible',
          preferredMonths: availability.preferredMonths || [],
          originCity: 'CDG',
          professionalStatus: 'salaried',
          departureFlexibility: availability.departureFlexibility || 'flexible',
        },
        chatbotPreferences: {
          tone: 'friendly',
        },
      };

      const response = await fetch(`${API_URL}/api/travel/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.recommendations) {
        // Navigate to results with trip context
        navigate('/results', {
          state: {
            recommendations: data.recommendations,
            forGroupTrip: trip.id,
          },
        });
      }
    } catch (err) {
      console.error('Error searching:', err);
      alert('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleCustomSearch = async () => {
    if (!customDestination.trim()) return;

    try {
      setSearching(true);
      const token = await getToken();

      const availability = groupPrefs?.availability || {};
      const duration = availability.recommendedDuration || 7;

      const payload = {
        basic: {
          budget: groupPrefs?.budget.average || 1500,
          style: 'cultural',
          activities: ['cultural', 'nature'],
          maxFlightHours: groupPrefs?.maxFlightHours || 12,
          destinationPreference: customDestination.trim(),
          travelers: groupPrefs?.defaultTravelers || trip.members.length,
        },
        preferences: {
          climate: 'any',
          accommodation: 'hotel',
          pace: 'moderate',
          gastronomy: 'important',
          natureVsCity: 50,
          nightlife: 'optional',
          activitiesBudget: 20,
        },
        constraints: {
          budget: groupPrefs?.budget.average || 1500,
          maxFlightHours: groupPrefs?.maxFlightHours || 12,
          avoidCountries: [],
        },
        availability: {
          duration: duration,
          timeHorizon: '6-mois',
          idealDuration: `${duration}-jours`,
          flexibleDates: availability.departureFlexibility === 'flexible',
          preferredMonths: availability.preferredMonths || [],
          originCity: 'CDG',
          professionalStatus: 'salaried',
          departureFlexibility: availability.departureFlexibility || 'flexible',
        },
        chatbotPreferences: {
          tone: 'friendly',
        },
      };

      const response = await fetch(`${API_URL}/api/travel/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.recommendations) {
        navigate('/results', {
          state: {
            recommendations: data.recommendations,
            forGroupTrip: trip.id,
          },
        });
      }
    } catch (err) {
      console.error('Error searching:', err);
      alert('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-text-main mb-4">Propose a Destination</h2>

      {/* Group Preferences Summary */}
      {loadingPrefs ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Loading group preferences...</p>
        </div>
      ) : groupPrefs ? (
        <>
          <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-sm font-semibold text-text-main mb-3">Group Preferences:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-text-secondary">Budget</p>
                <p className="font-semibold text-text-main">€{groupPrefs.budget.average}</p>
              </div>
              <div>
                <p className="text-text-secondary">Travelers</p>
                <p className="font-semibold text-text-main">{groupPrefs.defaultTravelers}</p>
              </div>
              <div>
                <p className="text-text-secondary">Max Flight</p>
                <p className="font-semibold text-text-main">{groupPrefs.maxFlightHours}h</p>
              </div>
              <div>
                <p className="text-text-secondary">Top Activity</p>
                <p className="font-semibold text-text-main capitalize">{groupPrefs.activities[0] || 'Any'}</p>
              </div>
            </div>
          </div>

          {/* Availability Info */}
          {groupPrefs.availability && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-100">
              <h3 className="text-sm font-semibold text-text-main mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-green-600" />
                Group Availability
              </h3>
              <p className="text-xs text-text-secondary mb-3">{groupPrefs.availability.availabilityMessage}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-text-secondary">Suggested Duration</p>
                  <p className="font-semibold text-text-main">{groupPrefs.availability.recommendedDuration} days</p>
                </div>
                {groupPrefs.availability.minAvailableLeaveDays !== null && (
                  <div>
                    <p className="text-text-secondary">Min. Leave Days</p>
                    <p className="font-semibold text-text-main">{groupPrefs.availability.minAvailableLeaveDays} days</p>
                  </div>
                )}
                {groupPrefs.availability.preferredMonths.length > 0 && (
                  <div>
                    <p className="text-text-secondary">Preferred Months</p>
                    <p className="font-semibold text-text-main capitalize">{groupPrefs.availability.preferredMonths.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Proposal Mode Selection */}
      {!proposalMode ? (
        <div className="space-y-4">
          <button
            onClick={() => setProposalMode('ai')}
            className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary rounded-xl text-white group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-main mb-1">Smart AI Search</h3>
                <p className="text-sm text-text-secondary">
                  Let AI find the best destinations based on everyone's preferences
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setProposalMode('custom')}
            className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                <MapPin size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-main mb-1">Custom Idea</h3>
                <p className="text-sm text-text-secondary">
                  Have a specific place in mind? Tell us and we'll find the best options
                </p>
              </div>
            </div>
          </button>
        </div>
      ) : proposalMode === 'ai' ? (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <p className="text-sm text-text-main">
              <strong>AI will search for destinations matching:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-text-secondary">
              <li>• Budget: €{groupPrefs?.budget.average || 1500} per person</li>
              <li>• {groupPrefs?.defaultTravelers || trip.members.length} travelers</li>
              <li>• Duration: {groupPrefs?.availability?.recommendedDuration || 7} days</li>
              <li>• Activities: {groupPrefs?.activities.slice(0, 3).join(', ') || 'Cultural, Nature'}</li>
              <li>• Max flight time: {groupPrefs?.maxFlightHours || 12}h</li>
              {groupPrefs?.availability?.preferredMonths?.length > 0 && (
                <li>• Preferred months: {groupPrefs.availability.preferredMonths.join(', ')}</li>
              )}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setProposalMode(null)}
              className="px-6 py-3 border border-gray-300 text-text-secondary rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSmartSearch}
              disabled={searching}
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Find Best Destinations
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Where do you want to go?
            </label>
            <input
              type="text"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              placeholder="e.g., Paris, Mediterranean beach, Japan..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
            />
            <p className="mt-2 text-xs text-text-secondary">
              Type a country, city, region, or vibe. AI will find the best matches!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setProposalMode(null)}
              className="px-6 py-3 border border-gray-300 text-text-secondary rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCustomSearch}
              disabled={searching || !customDestination.trim()}
              className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl shadow-lg hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <MapPin size={20} />
                  Search Destinations
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Voting Section - When destinations are proposed
function VotingSection({ trip, fetchTripDetails }) {
  const { getToken } = useAuth();
  const [voting, setVoting] = useState(false);

  const handleVote = async (proposedTripId) => {
    try {
      setVoting(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/trips/${trip.id}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposedTripId }),
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      await fetchTripDetails();
    } catch (err) {
      console.error('Error voting:', err);
      alert('Failed to vote. Please try again.');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-text-main mb-4">Proposed Destinations</h2>
      <p className="text-sm text-text-secondary mb-6">
        Vote for your favorite destination. The trip with the most votes will be selected.
      </p>

      <div className="space-y-4">
        {trip.proposedTrips?.map((proposed) => (
          <div
            key={proposed.id}
            className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-text-main">
                  {proposed.tripData?.destination?.city}, {proposed.tripData?.destination?.country}
                </h3>
                <p className="text-sm text-text-secondary">
                  Proposed by {proposed.proposedBy?.firstName}
                </p>
              </div>
              <button
                onClick={() => handleVote(proposed.id)}
                disabled={voting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                Vote
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-text-secondary">
              {proposed.tripData?.slot?.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>
                    {new Date(proposed.tripData.slot.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {proposed.tripData?.pricing?.total && (
                <div className="flex items-center gap-2">
                  <span>€{Math.round(proposed.tripData.pricing.total)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>{proposed.votes?.length || 0} votes</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Booking Checklist Section - When destination is confirmed
function BookingChecklistSection({ trip }) {
  const [expandedSections, setExpandedSections] = useState({
    transport: true,
    accommodation: false,
    activities: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const checklistItems = {
    transport: [
      { id: 1, label: 'Paris → Lisbon', sublabel: 'Book flights', status: 'pending' },
      { id: 2, label: 'Lisbon → Paris', sublabel: 'Book return flights', status: 'pending' },
    ],
    accommodation: [
      { id: 3, label: 'Airbnb Lisbon', sublabel: 'Book accommodation', status: 'approved' },
    ],
    activities: [
      { id: 4, label: 'Sailing trip', sublabel: 'Book tickets', status: 'pending' },
      { id: 5, label: 'Surfing', sublabel: 'Book tickets', status: 'pending' },
      { id: 6, label: 'Pool day', sublabel: null, status: 'completed' },
      { id: 7, label: 'Festival', sublabel: null, status: 'completed' },
    ],
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    }
    if (status === 'in-progress') {
      return (
        <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
        </div>
      );
    }
    return <Circle className="w-5 h-5 text-gray-300" />;
  };

  const getStatusBadge = (status) => {
    if (status === 'in-progress') {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          In Progress
        </span>
      );
    }
    if (status === 'approved') {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          Approved
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-text-main mb-6">To-do list :</h2>

      {/* Transport Section */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('transport')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-text-secondary" />
            <span className="font-semibold text-text-main">Transport</span>
          </div>
          {expandedSections.transport ? (
            <ChevronDown className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-5 h-5 text-text-secondary" />
          )}
        </button>

        {expandedSections.transport && (
          <div className="space-y-3 ml-7">
            {checklistItems.transport.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-medium text-text-main">{item.label}</p>
                    {item.sublabel && (
                      <button className="text-sm text-primary hover:underline">
                        {item.sublabel} →
                      </button>
                    )}
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accommodation Section */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('accommodation')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-text-secondary" />
            <span className="font-semibold text-text-main">Accommodation</span>
          </div>
          {expandedSections.accommodation ? (
            <ChevronDown className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-5 h-5 text-text-secondary" />
          )}
        </button>

        {expandedSections.accommodation && (
          <div className="space-y-3 ml-7">
            {checklistItems.accommodation.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-medium text-text-main">{item.label}</p>
                    {item.sublabel && (
                      <button className="text-sm text-primary hover:underline">
                        {item.sublabel} →
                      </button>
                    )}
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activities Section */}
      <div>
        <button
          onClick={() => toggleSection('activities')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-text-secondary" />
            <span className="font-semibold text-text-main">Activities</span>
          </div>
          {expandedSections.activities ? (
            <ChevronDown className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-5 h-5 text-text-secondary" />
          )}
        </button>

        {expandedSections.activities && (
          <div className="space-y-3 ml-7">
            {checklistItems.activities.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-medium text-text-main">{item.label}</p>
                    {item.sublabel && (
                      <button className="text-sm text-primary hover:underline">
                        {item.sublabel} →
                      </button>
                    )}
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
