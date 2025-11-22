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
          <h2 className="text-lg font-bold text-text-main mb-4">Participants :</h2>
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
                      {member.user?.primaryEmailAddress || 'Email not available'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Conditional Main Section */}
        {isPlanning && <PlanningSection trip={trip} navigate={navigate} />}
        {isVoting && <VotingSection trip={trip} fetchTripDetails={fetchTripDetails} />}
        {isConfirmed && <BookingChecklistSection trip={trip} fetchTripDetails={fetchTripDetails} />}
      </div>
    </div>
  );
}

// Planning Section - When no destinations proposed yet
function PlanningSection({ trip, navigate }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-text-main mb-4">Destination</h2>
      <div className="text-center py-12">
        <div className="inline-flex p-6 bg-blue-50 text-primary rounded-full mb-6">
          <MapPin size={48} />
        </div>
        <h3 className="text-xl font-bold text-text-main mb-2">No destinations yet</h3>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          Be the first to propose a destination for the group! Use our AI to find the perfect spot.
        </p>
        <button
          onClick={() => navigate('/create-trip')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
        >
          <Plus size={20} />
          Propose a Destination
        </button>
      </div>
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
