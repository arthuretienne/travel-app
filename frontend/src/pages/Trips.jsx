// frontend/src/pages/Trips.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Users, Plus, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Trips() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trips, setTrips] = useState({
    createdTrips: [],
    memberTrips: [],
    pendingInvitations: [],
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }

      const data = await response.json();
      setTrips(data.data);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createNewTrip = () => {
    navigate('/trips/new');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      inviting: { label: 'Invitations en cours', color: 'bg-blue-100 text-blue-800' },
      voting: { label: 'Vote en cours', color: 'bg-purple-100 text-purple-800' },
      destination_selected: { label: 'Destination choisie', color: 'bg-green-100 text-green-800' },
      booking: { label: 'Réservations', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmé', color: 'bg-emerald-100 text-emerald-800' },
      cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const TripCard = ({ trip, role }) => {
    const memberCount = trip._count?.members || trip.members?.length || 0;
    const proposalCount = trip._count?.proposedTrips || 0;
    const messageCount = trip._count?.messages || 0;

    return (
      <div
        onClick={() => navigate(`/trips/${trip.id}`)}
        className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer overflow-hidden group"
      >
        {/* Cover Image */}
        <div className="relative h-40 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
          {trip.coverImageUrl ? (
            <img
              src={trip.coverImageUrl}
              alt={trip.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="w-16 h-16 text-white/30" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            {getStatusBadge(trip.status)}
          </div>

          {/* Role Badge */}
          {role && (
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-800">
                {role === 'creator' ? 'Créateur' : role === 'organizer' ? 'Organisateur' : 'Membre'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
            {trip.name}
          </h3>

          {/* Creator Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <img
              src={trip.creator.imageUrl || `https://ui-avatars.com/api/?name=${trip.creator.firstName}+${trip.creator.lastName}`}
              alt={trip.creator.firstName}
              className="w-5 h-5 rounded-full"
            />
            <span>
              Créé par {trip.creator.firstName} {trip.creator.lastName}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{memberCount} membre{memberCount > 1 ? 's' : ''}</span>
            </div>

            {proposalCount > 0 && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{proposalCount} destination{proposalCount > 1 ? 's' : ''}</span>
              </div>
            )}

            {messageCount > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{messageCount} message{messageCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Final Destination (if selected) */}
          {trip.finalDestination && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-gray-900 font-medium">
                  Destination: {trip.finalDestination.city}, {trip.finalDestination.country}
                </span>
              </div>
              {trip.finalStartDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(trip.finalStartDate).toLocaleDateString('fr-FR')} - {new Date(trip.finalEndDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const InvitationCard = ({ invitation }) => {
    const [accepting, setAccepting] = useState(false);
    const [declining, setDeclining] = useState(false);

    const handleAccept = async (e) => {
      e.stopPropagation();
      try {
        setAccepting(true);
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/invitations/${invitation.token}/accept`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to accept invitation');
        }

        // Refresh trips list
        await fetchTrips();
      } catch (err) {
        console.error('Error accepting invitation:', err);
        alert('Erreur lors de l\'acceptation de l\'invitation');
      } finally {
        setAccepting(false);
      }
    };

    const handleDecline = async (e) => {
      e.stopPropagation();
      try {
        setDeclining(true);
        const response = await fetch(`${API_URL}/api/invitations/${invitation.token}/decline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to decline invitation');
        }

        // Refresh trips list
        await fetchTrips();
      } catch (err) {
        console.error('Error declining invitation:', err);
        alert('Erreur lors du refus de l\'invitation');
      } finally {
        setDeclining(false);
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {invitation.trip.name}
            </h3>
            <p className="text-sm text-gray-600">
              Invitation de {invitation.inviter.firstName} {invitation.inviter.lastName}
            </p>
          </div>
          <AlertCircle className="w-5 h-5 text-blue-500" />
        </div>

        {invitation.message && (
          <p className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded-lg">
            "{invitation.message}"
          </p>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Users className="w-4 h-4" />
          <span>{invitation.trip._count?.members || 0} membre(s)</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {accepting ? 'Acceptation...' : 'Accepter'}
          </button>
          <button
            onClick={handleDecline}
            disabled={accepting || declining}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {declining ? 'Refus...' : 'Refuser'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des voyages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchTrips}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const hasTrips = trips.createdTrips.length > 0 || trips.memberTrips.length > 0;
  const hasInvitations = trips.pendingInvitations.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Voyages collaboratifs</h1>
              <p className="text-gray-600 mt-1">Organisez vos voyages en groupe</p>
            </div>
            <button
              onClick={createNewTrip}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Nouveau voyage
            </button>
          </div>
        </div>

        {/* Pending Invitations */}
        {hasInvitations && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Invitations en attente ({trips.pendingInvitations.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.pendingInvitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          </div>
        )}

        {/* Created Trips */}
        {trips.createdTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Mes voyages ({trips.createdTrips.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.createdTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} role="creator" />
              ))}
            </div>
          </div>
        )}

        {/* Member Trips */}
        {trips.memberTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Voyages auxquels je participe ({trips.memberTrips.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.memberTrips.map((trip) => {
                const myMembership = trip.members?.find(m => m.user?.email === trip.creator.email);
                return (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    role={myMembership?.role || 'member'}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasTrips && !hasInvitations && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun voyage collaboratif</h3>
            <p className="text-gray-600 mb-6">
              Commencez à organiser votre premier voyage en groupe
            </p>
            <button
              onClick={createNewTrip}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Créer un voyage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
