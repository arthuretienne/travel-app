// frontend/src/pages/TripDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  Settings,
  Mail,
  Vote,
  MessageCircle,
  CheckSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trip, setTrip] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

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
          throw new Error('Voyage non trouvé');
        }
        if (response.status === 403) {
          throw new Error('Accès refusé');
        }
        throw new Error('Erreur lors du chargement du voyage');
      }

      const data = await response.json();
      setTrip(data.data.trip);
      setUserRole(data.data.userRole);
      setPermissions(data.data.permissions);
    } catch (err) {
      console.error('Error fetching trip:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      inviting: { label: 'Invitations', color: 'bg-blue-100 text-blue-800' },
      voting: { label: 'Vote en cours', color: 'bg-purple-100 text-purple-800' },
      destination_selected: { label: 'Destination choisie', color: 'bg-green-100 text-green-800' },
      booking: { label: 'Réservations', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmé', color: 'bg-emerald-100 text-emerald-800' },
      cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du voyage...</p>
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
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/trips')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour aux voyages
          </button>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: MapPin },
    { id: 'members', label: 'Membres', icon: Users, count: trip.members?.length },
    { id: 'invitations', label: 'Invitations', icon: Mail, count: trip.invitations?.length, permission: 'canInvite' },
    { id: 'destinations', label: 'Destinations', icon: Vote, count: trip.proposedTrips?.length, permission: 'canPropose' },
    { id: 'chat', label: 'Discussion', icon: MessageCircle, count: trip.messages?.length },
    { id: 'booking', label: 'Réservations', icon: CheckSquare },
    { id: 'settings', label: 'Paramètres', icon: Settings, permission: 'canEditSettings' },
  ];

  // Filter tabs based on permissions
  const visibleTabs = tabs.filter(tab => !tab.permission || permissions[tab.permission]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/trips')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux voyages
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{trip.name}</h1>
                {getStatusBadge(trip.status)}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <img
                  src={trip.creator.imageUrl || `https://ui-avatars.com/api/?name=${trip.creator.firstName}+${trip.creator.lastName}`}
                  alt={trip.creator.firstName}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm">
                  Créé par {trip.creator.firstName} {trip.creator.lastName}
                </span>
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span className="text-sm">
                  {trip.members?.length} membre{trip.members?.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {userRole && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {userRole === 'creator' ? 'Créateur' : userRole === 'organizer' ? 'Organisateur' : 'Membre'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cover Image */}
      {trip.coverImageUrl && (
        <div className="h-64 bg-gray-200">
          <img
            src={trip.coverImageUrl}
            alt={trip.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab trip={trip} />}
        {activeTab === 'members' && <MembersTab trip={trip} permissions={permissions} onUpdate={fetchTripDetails} />}
        {activeTab === 'invitations' && <InvitationsTab trip={trip} onUpdate={fetchTripDetails} />}
        {activeTab === 'destinations' && <DestinationsTab trip={trip} permissions={permissions} onUpdate={fetchTripDetails} />}
        {activeTab === 'chat' && <ChatTab trip={trip} />}
        {activeTab === 'booking' && <BookingTab trip={trip} permissions={permissions} onUpdate={fetchTripDetails} />}
        {activeTab === 'settings' && <SettingsTab trip={trip} onUpdate={fetchTripDetails} />}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ trip }) {
  return (
    <div className="space-y-6">
      {/* Final Destination */}
      {trip.finalDestination && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Destination finale</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-green-600" />
              <span className="text-lg font-medium">
                {trip.finalDestination.city}, {trip.finalDestination.country}
              </span>
            </div>
            {trip.finalStartDate && (
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5" />
                <span>
                  Du {new Date(trip.finalStartDate).toLocaleDateString('fr-FR')} au {new Date(trip.finalEndDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">{trip.members?.length || 0}</span>
          </div>
          <p className="text-sm text-gray-600">Membres</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Vote className="w-8 h-8 text-purple-600" />
            <span className="text-3xl font-bold text-gray-900">{trip.proposedTrips?.length || 0}</span>
          </div>
          <p className="text-sm text-gray-600">Destinations proposées</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <MessageCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-gray-900">{trip.messages?.length || 0}</span>
          </div>
          <p className="text-sm text-gray-600">Messages</p>
        </div>
      </div>

      {/* Trip Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du voyage</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Maximum de participants:</span>
            <span className="font-medium text-gray-900">{trip.maxMembers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Votes requis:</span>
            <span className="font-medium text-gray-900">
              {trip.requireAllVotes ? 'Tous les membres' : '50% minimum'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Créé le:</span>
            <span className="font-medium text-gray-900">
              {new Date(trip.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for other tabs (to be implemented)
function MembersTab() {
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">Onglet Membres - À implémenter</div>;
}

function InvitationsTab() {
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">Onglet Invitations - À implémenter</div>;
}

function DestinationsTab() {
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">Onglet Destinations - À implémenter</div>;
}

function ChatTab() {
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">Onglet Chat - À implémenter</div>;
}

function BookingTab() {
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">Onglet Réservations - À implémenter</div>;
}

function SettingsTab() {
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">Onglet Paramètres - À implémenter</div>;
}
