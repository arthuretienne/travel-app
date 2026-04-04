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
  CheckSquare,
  Square,
  Star,
  Hotel,
  ExternalLink,
  Bell,
  CloudRain,
  Sun,
  Cloudy,
  CloudSnow,
  Wind,
  Droplet,
  Backpack,
  TrendingUp,
  Navigation,
  Coffee,
  Utensils,
  PartyPopper,
  CalendarDays,
  Music,
  Heart,
  MessageCircle,
  Settings,
  ListChecks,
  LayoutDashboard,
  Bot,
  Wallet,
} from 'lucide-react';
import { PersonalizedItineraryCard, LocalEventsCard } from '../components/TripEnhancementComponents';
import StickyBookingProgress, { BookingChecklistCard } from '../components/StickyBookingProgress';
import TripChat from '../components/TripChat';
import FriendsManager from '../components/FriendsManager';
import TripBookingDetails from '../components/TripBookingDetails';
import TripExpenses from '../components/TripExpenses';
import { generateAllBookingLinks, getIataCode } from '../utils/bookingLinks';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Country name → flag emoji
const COUNTRY_EMOJIS = {
  'France': '🇫🇷', 'Spain': '🇪🇸', 'Espagne': '🇪🇸', 'Italy': '🇮🇹', 'Italie': '🇮🇹',
  'Portugal': '🇵🇹', 'Germany': '🇩🇪', 'Allemagne': '🇩🇪', 'Greece': '🇬🇷', 'Grèce': '🇬🇷',
  'Japan': '🇯🇵', 'Japon': '🇯🇵', 'Morocco': '🇲🇦', 'Maroc': '🇲🇦', 'Thailand': '🇹🇭',
  'Thaïlande': '🇹🇭', 'Netherlands': '🇳🇱', 'Pays-Bas': '🇳🇱', 'Czech Republic': '🇨🇿',
  'Czechia': '🇨🇿', 'Tchéquie': '🇨🇿', 'Austria': '🇦🇹', 'Autriche': '🇦🇹', 'Croatia': '🇭🇷',
  'Croatie': '🇭🇷', 'Hungary': '🇭🇺', 'Hongrie': '🇭🇺', 'Poland': '🇵🇱', 'Pologne': '🇵🇱',
  'Iceland': '🇮🇸', 'Islande': '🇮🇸', 'Ireland': '🇮🇪', 'Irlande': '🇮🇪', 'UK': '🇬🇧',
  'United Kingdom': '🇬🇧', 'Royaume-Uni': '🇬🇧', 'USA': '🇺🇸', 'United States': '🇺🇸',
  'États-Unis': '🇺🇸', 'Turkey': '🇹🇷', 'Turquie': '🇹🇷', 'Indonesia': '🇮🇩', 'Indonésie': '🇮🇩',
  'Bali': '🇮🇩', 'Vietnam': '🇻🇳', 'Colombia': '🇨🇴', 'Colombie': '🇨🇴', 'Peru': '🇵🇪',
  'Pérou': '🇵🇪', 'Mexico': '🇲🇽', 'Mexique': '🇲🇽', 'Canada': '🇨🇦', 'Brazil': '🇧🇷',
  'Brésil': '🇧🇷', 'Argentina': '🇦🇷', 'Argentine': '🇦🇷', 'Australia': '🇦🇺', 'Australie': '🇦🇺',
  'New Zealand': '🇳🇿', 'Nouvelle-Zélande': '🇳🇿', 'South Africa': '🇿🇦', 'Afrique du Sud': '🇿🇦',
  'Egypt': '🇪🇬', 'Égypte': '🇪🇬', 'Kenya': '🇰🇪', 'Dubai': '🇦🇪', 'UAE': '🇦🇪',
  'Émirats arabes unis': '🇦🇪', 'Singapore': '🇸🇬', 'Singapour': '🇸🇬',
};
function getCountryEmoji(country) {
  if (!country) return '✈️';
  return COUNTRY_EMOJIS[country] || '🌍';
}

// Helper to extract city/country from finalDestination which can be flat or nested
function getDestinationInfo(finalDestination) {
  if (!finalDestination) return { city: null, country: null };
  return {
    city: finalDestination.city || finalDestination.destination?.city || null,
    country: finalDestination.country || finalDestination.destination?.country || null,
  };
}

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trip, setTrip] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showFriendsManager, setShowFriendsManager] = useState(false);
  const [inviteEmails, setInviteEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  // Tab navigation for group trip sections
  const [activeTab, setActiveTab] = useState('overview');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState(null);

  // Guest session detection - check if we have a valid guest session for this trip
  const [guestSession, setGuestSession] = useState(null);

  useEffect(() => {
    // Check for guest session in localStorage
    try {
      const storedSession = localStorage.getItem('guestSession');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        // Only use the session if it's for this specific trip
        if (session.tripId === id) {
          setGuestSession(session);
          console.log('🔐 Guest session found for this trip');
        }
      }
    } catch (e) {
      console.error('Error parsing guest session:', e);
    }
  }, [id]);

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
      setCurrentUserId(data.data.currentUserId || null);
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
        setInviteError('Format d\'email invalide');
        return;
      }

      // Check for duplicates
      if (inviteEmails.includes(email)) {
        setInviteError('Email déjà ajouté');
        return;
      }

      // In development, allow self-invite for testing (Resend sandbox)
      const isDevelopment = import.meta.env.DEV;
      if (user?.primaryEmailAddress?.emailAddress === email && !isDevelopment) {
        setInviteError('Vous ne pouvez pas vous inviter vous-même');
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
    // Auto-add any email typed but not yet confirmed with Enter
    let emailsToSend = [...inviteEmails];
    if (currentEmail.trim()) {
      const email = currentEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email) && !emailsToSend.includes(email)) {
        emailsToSend = [...emailsToSend, email];
        setInviteEmails(emailsToSend);
        setCurrentEmail('');
      }
    }
    if (emailsToSend.length === 0) {
      setInviteError('Ajoutez au moins une adresse email');
      return;
    }

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
        body: JSON.stringify({ emails: emailsToSend }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Impossible d\'envoyer les invitations');
      }

      // Success - reset and close modal
      setInviteEmails([]);
      setCurrentEmail('');
      setShowInviteModal(false);
      setInviteSuccess(`${emailsToSend.length} invitation${emailsToSend.length > 1 ? 's' : ''} envoyée${emailsToSend.length > 1 ? 's' : ''} !`);
      setTimeout(() => setInviteSuccess(null), 4000);

      // Refresh trip data to show new invitations
      await fetchTripDetails();
    } catch (err) {
      console.error('Error sending invitations:', err);
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible.')) return;

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
      setError('Impossible de supprimer le voyage. Veuillez réessayer.');
    }
  };

  // Send reminder emails to members who haven't completed their bookings
  const sendReminders = async () => {
    if (sendingReminder) return;

    setSendingReminder(true);
    setReminderMessage(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${id}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setReminderMessage({
          type: 'success',
          text: data.sentCount > 0
            ? `✅ ${data.sentCount} rappel(s) envoyé(s)!`
            : '✨ Tout le monde a déjà réservé!'
        });
        fetchTripDetails();
      } else {
        setReminderMessage({
          type: 'error',
          text: data.error || 'Erreur lors de l\'envoi'
        });
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      setReminderMessage({
        type: 'error',
        text: 'Erreur de connexion'
      });
    } finally {
      setSendingReminder(false);
      setTimeout(() => setReminderMessage(null), 5000);
    }
  };

  const getStatusInfo = (status, trip) => {
    // Determine the actual status based on trip data
    if (trip.finalDestination) {
      return {
        label: 'Confirmé',
        color: 'bg-green-100 text-green-800',
        description: 'Destination choisie, prêt pour les réservations',
      };
    }

    if (trip.proposedTrips && trip.proposedTrips.length > 0) {
      return {
        label: 'Vote',
        color: 'bg-purple-100 text-purple-800',
        description: 'Votez pour votre destination préférée',
      };
    }

    return {
      label: 'Planification',
      color: 'bg-blue-100 text-blue-800',
      description: 'Proposez des destinations pour le groupe',
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Chargement...</p>
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
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour au tableau de bord
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
      {/* Sticky Booking Progress (only when confirmed) */}
      {isConfirmed && trip.finalDestination && (
        <StickyBookingProgress
          city={getDestinationInfo(trip.finalDestination).city}
          country={getDestinationInfo(trip.finalDestination).country}
          startDate={trip.finalStartDate}
          endDate={trip.finalEndDate}
          adults={trip.members?.length || 1}
          onBack={() => navigate('/dashboard')}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back button only when not confirmed (sticky has back button) */}
          {!isConfirmed && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-main mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Retour aux voyages</span>
            </button>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-text-main leading-tight">
                  {trip.finalDestination
                    ? getDestinationInfo(trip.finalDestination).city
                    : trip.name}
                </h1>
                {trip.finalDestination && (
                  <span className="text-2xl">
                    {getCountryEmoji(getDestinationInfo(trip.finalDestination).country)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                {trip.finalDestination && getDestinationInfo(trip.finalDestination).country && (
                  <span className="text-sm text-text-secondary">{getDestinationInfo(trip.finalDestination).country}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {inviteSuccess && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 size={16} />
                  {inviteSuccess}
                </span>
              )}
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                <UserPlus size={16} />
                <span className="hidden sm:inline">Inviter des amis</span>
                <span className="sm:hidden">Inviter</span>
              </button>
              {userRole === 'creator' && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  title="Supprimer le voyage"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Supprimer</span>
                </button>
              )}
            </div>
          </div>

          {/* Lifecycle Stepper */}
          <div className="mt-5 flex items-center gap-0">
            {[
              { key: 'plan', label: 'Propositions', active: isPlanning, done: !isPlanning },
              { key: 'vote', label: 'Vote', active: isVoting, done: isConfirmed },
              { key: 'confirm', label: 'Destination', active: false, done: isConfirmed },
              { key: 'book', label: 'Réservation', active: isConfirmed, done: false },
            ].map((step, i, arr) => (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    step.done ? 'bg-primary text-white' :
                    step.active ? 'bg-primary text-white ring-2 ring-primary/30' :
                    'bg-stone-200 text-stone-400'
                  }`}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    step.active ? 'text-primary' : step.done ? 'text-text-main' : 'text-stone-400'
                  }`}>{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${step.done ? 'bg-primary' : 'bg-stone-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Quick Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-text-secondary">Durée</p>
                <p className="font-semibold text-text-main">
                  {trip.finalStartDate && trip.finalEndDate
                    ? `${Math.ceil((new Date(trip.finalEndDate) - new Date(trip.finalStartDate)) / (1000 * 60 * 60 * 24))} j`
                    : '15 j'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-text-secondary">
                  {trip.finalStartDate ? 'Date de départ' : 'Dates'}
                </p>
                <p className="font-semibold text-text-main">
                  {trip.finalStartDate
                    ? new Date(trip.finalStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                    : 'À définir'}
                </p>
              </div>
            </div>

            {trip.finalEndDate && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-text-secondary">Date de fin</p>
                  <p className="font-semibold text-text-main">
                    {new Date(trip.finalEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Aperçu', icon: LayoutDashboard },
              { id: 'participants', label: 'Participants', icon: Users, badge: trip.members?.length || 0 },
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'expenses', label: 'Dépenses', icon: Wallet },
              { id: 'checklist', label: 'À faire', icon: ListChecks },
              { id: 'settings', label: 'Réglages', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:bg-gray-100 hover:text-text-main'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ============ OVERVIEW TAB ============ */}
        {activeTab === 'overview' && (
          <>
            {/* Conditional Main Section based on trip status */}
            {isPlanning && <PlanningSection trip={trip} navigate={navigate} />}
            {isVoting && <VotingSection trip={trip} fetchTripDetails={fetchTripDetails} user={user} isCreator={userRole === 'creator'} />}
            {isConfirmed && (
              <>
                {/* Show saved flight/hotel recommendations */}
                <TripBookingDetails
                  tripData={trip.finalDestination}
                  city={getDestinationInfo(trip.finalDestination).city}
                  country={getDestinationInfo(trip.finalDestination).country}
                  startDate={trip.finalStartDate}
                  endDate={trip.finalEndDate}
                  adults={trip.members?.length || 1}
                />
                <BookingChecklistSection trip={trip} fetchTripDetails={fetchTripDetails} getToken={getToken} />
                <TripEnhancementsSection trip={trip} userName={user?.firstName || 'there'} />
              </>
            )}
          </>
        )}

        {/* ============ PARTICIPANTS TAB ============ */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            {/* Members List */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-main">
                  Membres ({trip.members?.length || 0})
                </h2>
                <div className="flex items-center gap-2">
                  {reminderMessage && (
                    <span className={`text-sm ${reminderMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {reminderMessage.text}
                    </span>
                  )}
                  {isConfirmed && (
                    <button
                      onClick={sendReminders}
                      disabled={sendingReminder}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 font-medium rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
                    >
                      {sendingReminder ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Bell size={18} />
                      )}
                      {sendingReminder ? 'Envoi...' : 'Rappeler'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    <UserPlus size={18} />
                    Inviter
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {trip.members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={member.user?.imageUrl || `https://ui-avatars.com/api/?name=${member.user?.firstName}+${member.user?.lastName}`}
                        alt={member.user?.firstName}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <p className="font-semibold text-text-main">
                          {member.user?.firstName} {member.user?.lastName}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {member.user?.email || 'Email non disponible'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConfirmed && (
                        <>
                          {member.hasBookedFlight && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                              <Plane size={12} /> Vol
                            </span>
                          )}
                          {member.hasBookedHotel && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                              <Hotel size={12} /> Hôtel
                            </span>
                          )}
                          {member.bookingConfirmed && (
                            <CheckCircle2 size={18} className="text-green-600" />
                          )}
                        </>
                      )}
                      <span className="text-xs font-medium px-3 py-1 bg-stone-100 text-stone-600 rounded-full">
                        {member.role === 'creator' ? 'Créateur' : 'Membre'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Invitations */}
            {trip.invitations && trip.invitations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-text-main mb-4">
                  Invitations en attente ({trip.invitations.length})
                </h3>
                <div className="space-y-2">
                  {trip.invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <Mail size={18} className="text-amber-600" />
                      <span className="text-text-main">{invitation.email}</span>
                      <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded">
                        En attente
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Add Friends */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-text-main mb-4">Inviter depuis mes amis</h3>
              <button
                onClick={() => setShowFriendsManager(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-primary-light text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors"
              >
                <Users size={20} />
                Gérer mes amis & Inviter
              </button>
            </div>
          </div>
        )}

        {/* ============ CHAT TAB ============ */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            {/* AI Assistant Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-600 rounded-xl text-white">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main mb-1">Assistant IA</h3>
                  <p className="text-sm text-text-secondary">
                    Mentionnez <span className="font-mono bg-purple-100 px-1 rounded">@assistant</span> dans le chat pour demander à l'IA de modifier l'itinéraire, suggérer des activités, ou répondre à vos questions sur le voyage.
                  </p>
                </div>
              </div>
            </div>

            {/* Full Chat Component - Inline instead of floating */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-text-main flex items-center gap-2">
                  <MessageCircle size={20} className="text-primary" />
                  Chat du groupe
                </h3>
              </div>
              <div className="h-[500px]">
                <TripChat tripId={id} tripName={trip.name} embedded={true} guestSession={guestSession} />
              </div>
            </div>
          </div>
        )}

        {/* ============ EXPENSES TAB ============ */}
        {activeTab === 'expenses' && (
          <TripExpenses
            tripId={trip.id}
            currentUserId={trip.members?.find(m => m.user?.email === user?.primaryEmailAddress?.emailAddress)?.user?.id}
          />
        )}

        {/* ============ CHECKLIST TAB ============ */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            {isConfirmed ? (
              <>
                {/* My Booking Status — quick actions for current user */}
                {currentUserId && (() => {
                  const myMember = trip.members?.find(m => m.user?.id === currentUserId);
                  if (!myMember) return null;
                  return (
                    <MyBookingCard
                      member={myMember}
                      tripId={trip.id}
                      getToken={getToken}
                      onUpdate={fetchTripDetails}
                    />
                  );
                })()}

                {/* Group Booking Status */}
                <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-text-main">Suivi du groupe</h2>
                    <button
                      onClick={sendReminders}
                      disabled={sendingReminder}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 font-medium rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
                    >
                      {sendingReminder ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
                      {sendingReminder ? 'Envoi...' : 'Rappeler les retardataires'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {trip.members?.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.user?.imageUrl || `https://ui-avatars.com/api/?name=${member.user?.firstName}`}
                            alt={member.user?.firstName}
                            className="w-10 h-10 rounded-full"
                          />
                          <span className="font-medium text-text-main">
                            {member.user?.firstName} {member.user?.lastName}
                            {member.user?.id === currentUserId && (
                              <span className="ml-2 text-xs text-primary font-normal">(vous)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${member.hasBookedFlight ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Plane size={14} />
                            {member.hasBookedFlight ? 'Vol réservé' : 'Vol en attente'}
                          </div>
                          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${member.hasBookedHotel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Hotel size={14} />
                            {member.hasBookedHotel ? 'Hôtel réservé' : 'Hôtel en attente'}
                          </div>
                          {member.bookingConfirmed && (
                            <CheckCircle2 size={20} className="text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booking Links */}
                <BookingChecklistSection trip={trip} fetchTripDetails={fetchTripDetails} getToken={getToken} />
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center">
                <ListChecks size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text-main mb-2">Checklist non disponible</h3>
                <p className="text-text-secondary">
                  La checklist de réservation sera disponible une fois la destination confirmée.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============ SETTINGS TAB ============ */}
        {activeTab === 'settings' && (
          <TripSettingsTab
            trip={trip}
            userRole={userRole}
            getToken={getToken}
            fetchTripDetails={fetchTripDetails}
            handleDelete={handleDelete}
          />
        )}
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-text-main flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-primary" />
                Inviter des amis
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
                Invitez des amis à rejoindre "<strong>{trip.name}</strong>" en entrant leurs adresses email.
              </p>

              {/* Quick add from friends list */}
              <button
                onClick={() => setShowFriendsManager(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-light text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors"
              >
                <Users size={18} />
                Inviter depuis mes amis
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-text-secondary">ou</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Adresse email
                </label>
                {inviteError && <p className="text-red-500 text-sm mb-2">{inviteError}</p>}
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={addInviteEmail}
                  placeholder="ami@exemple.com (Appuyez sur Entrée)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-2 text-xs text-text-secondary">
                  Appuyez sur Entrée après chaque email pour l'ajouter à la liste
                </p>
              </div>

              {/* Email List */}
              {inviteEmails.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-main">
                    Emails à inviter ({inviteEmails.length})
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
                  Annuler
                </button>
                <button
                  onClick={handleSendInvitations}
                  disabled={inviteEmails.length === 0 || inviting}
                  className="flex-1 px-4 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {inviting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Envoyer {inviteEmails.length} invitation{inviteEmails.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friends Manager Modal */}
      <FriendsManager
        isOpen={showFriendsManager}
        onClose={() => setShowFriendsManager(false)}
        onSelectFriend={(friend) => {
          if (friend.email && !inviteEmails.includes(friend.email)) {
            setInviteEmails([...inviteEmails, friend.email]);
          }
        }}
      />

      {/* Real-time Chat - Floating button (hide when on chat tab) */}
      {activeTab !== 'chat' && (
        <TripChat tripId={id} tripName={trip.name} guestSession={guestSession} />
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
  const [searchError, setSearchError] = useState(null);

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
      setSearchError('Erreur lors de la recherche. Veuillez réessayer.');
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
      setSearchError('Erreur lors de la recherche. Veuillez réessayer.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-text-main mb-4">Proposer une destination</h2>

      {/* Group Preferences Summary */}
      {loadingPrefs ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Chargement des préférences du groupe...</p>
        </div>
      ) : groupPrefs ? (
        <>
          <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-sm font-semibold text-text-main mb-3">Préférences du groupe :</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-text-secondary">Budget</p>
                <p className="font-semibold text-text-main">€{groupPrefs.budget.average}</p>
              </div>
              <div>
                <p className="text-text-secondary">Voyageurs</p>
                <p className="font-semibold text-text-main">{groupPrefs.defaultTravelers}</p>
              </div>
              <div>
                <p className="text-text-secondary">Vol max</p>
                <p className="font-semibold text-text-main">{groupPrefs.maxFlightHours}h</p>
              </div>
              <div>
                <p className="text-text-secondary">Activité principale</p>
                <p className="font-semibold text-text-main capitalize">{groupPrefs.activities[0] || 'Toutes'}</p>
              </div>
            </div>
          </div>

          {/* Availability Info */}
          {groupPrefs.availability && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-100">
              <h3 className="text-sm font-semibold text-text-main mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-green-600" />
                Disponibilités du groupe
              </h3>
              <p className="text-xs text-text-secondary mb-3">{groupPrefs.availability.availabilityMessage}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-text-secondary">Durée suggérée</p>
                  <p className="font-semibold text-text-main">{groupPrefs.availability.recommendedDuration} j</p>
                </div>
                {groupPrefs.availability.minAvailableLeaveDays !== null && (
                  <div>
                    <p className="text-text-secondary">Congés min.</p>
                    <p className="font-semibold text-text-main">{groupPrefs.availability.minAvailableLeaveDays} j</p>
                  </div>
                )}
                {groupPrefs.availability.preferredMonths.length > 0 && (
                  <div>
                    <p className="text-text-secondary">Mois préférés</p>
                    <p className="font-semibold text-text-main capitalize">{groupPrefs.availability.preferredMonths.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Search Error */}
      {searchError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {searchError}
          <button onClick={() => setSearchError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      {/* Proposal Mode Selection */}
      {!proposalMode ? (
        <div className="space-y-4">
          <button
            onClick={() => setProposalMode('ai')}
            className="w-full p-6 border-2 border-stone-200 rounded-xl hover:border-primary hover:bg-primary-light transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary rounded-xl text-white group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-main mb-1">Recherche IA intelligente</h3>
                <p className="text-sm text-text-secondary">
                  Laissez l'IA trouver les meilleures destinations selon les préférences de tous
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setProposalMode('custom')}
            className="w-full p-6 border-2 border-stone-200 rounded-xl hover:border-primary hover:bg-primary-light transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                <MapPin size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-main mb-1">Idée personnalisée</h3>
                <p className="text-sm text-text-secondary">
                  Vous avez un endroit en tête ? Dites-le nous et nous trouverons les meilleures options
                </p>
              </div>
            </div>
          </button>
        </div>
      ) : proposalMode === 'ai' ? (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <p className="text-sm text-text-main">
              <strong>L'IA cherchera des destinations correspondant à :</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-text-secondary">
              <li>• Budget : €{groupPrefs?.budget.average || 1500} / pers.</li>
              <li>• {groupPrefs?.defaultTravelers || trip.members.length} voyageurs</li>
              <li>• Durée : {groupPrefs?.availability?.recommendedDuration || 7} j</li>
              <li>• Activités : {groupPrefs?.activities.slice(0, 3).join(', ') || 'Culture, Nature'}</li>
              <li>• Vol max : {groupPrefs?.maxFlightHours || 12}h</li>
              {groupPrefs?.availability?.preferredMonths?.length > 0 && (
                <li>• Mois préférés : {groupPrefs.availability.preferredMonths.join(', ')}</li>
              )}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setProposalMode(null)}
              className="px-6 py-3 border border-gray-300 text-text-secondary rounded-xl hover:bg-gray-50 transition-colors"
            >
              Retour
            </button>
            <button
              onClick={handleSmartSearch}
              disabled={searching}
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Trouver les meilleures destinations
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Où voulez-vous aller ?
            </label>
            <input
              type="text"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              placeholder="Ex : Paris, plage méditerranéenne, Japon..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
            />
            <p className="mt-2 text-xs text-text-secondary">
              Tapez un pays, une ville, une région ou une ambiance. L'IA trouvera les meilleures options !
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setProposalMode(null)}
              className="px-6 py-3 border border-gray-300 text-text-secondary rounded-xl hover:bg-gray-50 transition-colors"
            >
              Retour
            </button>
            <button
              onClick={handleCustomSearch}
              disabled={searching || !customDestination.trim()}
              className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl shadow-lg hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <MapPin size={20} />
                  Rechercher des destinations
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
function VotingSection({ trip, fetchTripDetails, user, isCreator }) {
  const { getToken } = useAuth();
  const [voting, setVoting] = useState(false);
  const [votedForId, setVotedForId] = useState(null); // track locally which dest user just voted for
  const [voteError, setVoteError] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [votingProgress, setVotingProgress] = useState(null);

  // Detect if user has already voted (from trip data)
  const userVotedDestId = (() => {
    if (!user || !trip.proposedTrips) return null;
    for (const dest of trip.proposedTrips) {
      const myVote = dest.votes?.find(v =>
        v.voter?.email === user.primaryEmailAddress?.emailAddress
      );
      if (myVote) return dest.id;
    }
    return null;
  })();

  const hasVoted = votedForId || userVotedDestId;

  // Total votes across all destinations
  const totalVotes = trip.proposedTrips?.reduce((sum, d) => sum + (d.votes?.length || 0), 0) || 0;
  const memberCount = trip.members?.length || 1;

  // Listen for real-time voting updates
  useEffect(() => {
    const handleTripUpdate = (event) => {
      const { type, data } = event.detail || {};
      if (type === 'vote_submitted') setVotingProgress(data);
      if (type === 'voting_complete' || type === 'destination_finalized') fetchTripDetails();
    };
    window.addEventListener('trip-update', handleTripUpdate);
    return () => window.removeEventListener('trip-update', handleTripUpdate);
  }, [fetchTripDetails]);

  const getWinningDestinationId = () => {
    if (!trip.proposedTrips?.length) return null;
    const scored = trip.proposedTrips.map(dest => ({
      id: dest.id,
      score: (dest.votes || []).reduce((sum, v) => {
        if (v.rank === 1) return sum + 5;
        if (v.rank === 2) return sum + 3;
        if (v.rank === 3) return sum + 1;
        return sum;
      }, 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.id;
  };

  const handleFinalizeVote = async () => {
    const destinationId = getWinningDestinationId();
    if (!destinationId) return;
    try {
      setFinalizing(true);
      setFinalizeError(null);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/finalize-vote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de la finalisation');
      }
      await fetchTripDetails();
    } catch (err) {
      console.error('Error finalizing vote:', err);
      setFinalizeError(err.message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleVote = async (destinationId) => {
    try {
      setVoting(true);
      setVoteError(null);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/vote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes: [{ destinationId, rank: 1 }] }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Impossible de voter');
      }
      setVotedForId(destinationId);
      await fetchTripDetails();
    } catch (err) {
      console.error('Error voting:', err);
      setVoteError(err.message);
    } finally {
      setVoting(false);
    }
  };

  const votedMembersCount = votingProgress?.votedMembers
    ?? trip.proposedTrips?.reduce((set, d) => {
      (d.votes || []).forEach(v => v.voter?.email && set.add(v.voter.email));
      return set;
    }, new Set()).size;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h2 className="text-lg font-bold text-text-main">Vote pour la destination</h2>
        {hasVoted && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={14} />
            Vous avez voté
          </span>
        )}
      </div>

      {/* Progress bar: votes cast */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-text-secondary mb-1.5">
          <span>{votedMembersCount} membre{votedMembersCount !== 1 ? 's' : ''} ont voté</span>
          <span>sur {memberCount}</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (votedMembersCount / memberCount) * 100)}%` }}
          />
        </div>
      </div>

      {voteError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {voteError}
        </div>
      )}

      {/* Destination cards */}
      <div className="space-y-4">
        {trip.proposedTrips?.map((proposed) => {
          const voteCount = proposed.votes?.length || 0;
          const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isMyVote = (votedForId === proposed.id) || (userVotedDestId === proposed.id);
          const city = proposed.city || proposed.tripData?.destination?.city || '?';
          const country = proposed.country || proposed.tripData?.destination?.country || '';

          return (
            <div
              key={proposed.id}
              className={`p-5 border-2 rounded-xl transition-all ${
                isMyVote
                  ? 'border-primary bg-primary-light'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-base font-bold text-text-main truncate">
                      {city}{country ? `, ${country}` : ''}
                    </h3>
                    <span className="text-lg">{getCountryEmoji(country)}</span>
                    {isMyVote && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        Votre choix
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Proposé par {proposed.proposer?.firstName || 'Inconnu'}
                  </p>
                </div>
                <button
                  onClick={() => handleVote(proposed.id)}
                  disabled={voting}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                    isMyVote
                      ? 'bg-primary text-white'
                      : hasVoted
                        ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        : 'bg-primary text-white hover:bg-primary-hover'
                  }`}
                >
                  {voting && votedForId === proposed.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isMyVote ? (
                    '✓ Voté'
                  ) : (
                    hasVoted ? 'Changer' : 'Voter'
                  )}
                </button>
              </div>

              {/* Match reason */}
              {(proposed.tripData?.matchReason || proposed.tripData?.destination?.matchReason) && (
                <div className="mb-3 p-2.5 bg-white/60 rounded-lg text-xs text-text-secondary flex items-start gap-1.5">
                  <Sparkles size={13} className="text-primary mt-0.5 flex-shrink-0" />
                  <span>{proposed.tripData?.matchReason || proposed.tripData?.destination?.matchReason}</span>
                </div>
              )}

              {/* Meta + Vote bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary mb-3">
                {(proposed.startDate || proposed.tripData?.slot?.startDate) && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {new Date(proposed.startDate || proposed.tripData.slot.startDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {(proposed.estimatedCostPerPerson || proposed.tripData?.pricing?.total) && (
                  <span>€{Math.round(proposed.estimatedCostPerPerson || proposed.tripData.pricing.total)}/pers</span>
                )}
              </div>

              {/* Vote bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isMyVote ? 'bg-primary' : 'bg-stone-400'}`}
                    style={{ width: `${votePercent}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold flex-shrink-0 ${isMyVote ? 'text-primary' : 'text-text-secondary'}`}>
                  {voteCount} vote{voteCount !== 1 ? 's' : ''} · {votePercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Finalize Vote - Creator Only */}
      {isCreator && trip.proposedTrips?.length > 0 && (
        <div className="mt-6 p-4 bg-stone-50 border border-stone-200 rounded-xl">
          {finalizeError && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={14} />
              {finalizeError}
            </div>
          )}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-text-main mb-1">Clôturer le vote</h4>
              <p className="text-sm text-text-secondary">
                La destination avec le plus de votes sera confirmée et le voyage passera en phase de réservation.
              </p>
            </div>
            <button
              onClick={handleFinalizeVote}
              disabled={finalizing || !trip.proposedTrips?.some(p => p.votes?.length > 0)}
              className="flex-shrink-0 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {finalizing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Booking Checklist Section - When destination is confirmed
// Editable settings tab (creator only for editing)
function TripSettingsTab({ trip, userRole, getToken, fetchTripDetails, handleDelete }) {
  const isCreator = userRole === 'creator';
  const [name, setName] = useState(trip.name);
  const [maxMembers, setMaxMembers] = useState(trip.maxMembers || 8);
  const [requireAllVotes, setRequireAllVotes] = useState(trip.requireAllVotes || false);
  const [voteDeadline, setVoteDeadline] = useState(
    trip.voteDeadline ? new Date(trip.voteDeadline).toISOString().split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          maxMembers: parseInt(maxMembers, 10),
          requireAllVotes,
          voteDeadline: voteDeadline || null,
        }),
      });
      if (!res.ok) throw new Error('Impossible de sauvegarder les modifications');
      await fetchTripDetails();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-main">Paramètres du voyage</h2>
          {!isCreator && (
            <span className="text-xs text-text-secondary bg-stone-100 px-3 py-1 rounded-full">Lecture seule</span>
          )}
        </div>

        <div className="space-y-5">
          {/* Trip Name */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5">Nom du voyage</label>
            {isCreator ? (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="px-4 py-2.5 bg-stone-50 rounded-xl font-medium text-text-main">{trip.name}</p>
            )}
          </div>

          {/* Max Members */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5">Nombre max de participants</label>
            {isCreator ? (
              <input
                type="number"
                min={trip.members?.length || 1}
                max={50}
                value={maxMembers}
                onChange={e => setMaxMembers(e.target.value)}
                className="w-32 px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="px-4 py-2.5 bg-stone-50 rounded-xl font-medium text-text-main">{trip.maxMembers || 8} personnes</p>
            )}
          </div>

          {/* Vote Deadline */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5">Date limite de vote</label>
            {isCreator ? (
              <input
                type="date"
                value={voteDeadline}
                onChange={e => setVoteDeadline(e.target.value)}
                className="w-48 px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="px-4 py-2.5 bg-stone-50 rounded-xl font-medium text-text-main">
                {trip.voteDeadline
                  ? new Date(trip.voteDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Non définie'}
              </p>
            )}
          </div>

          {/* Require All Votes */}
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-text-main">Tous les votes requis</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {requireAllVotes
                  ? 'Tous les membres doivent voter avant de finaliser'
                  : 'Le vote peut être finalisé à tout moment'}
              </p>
            </div>
            {isCreator ? (
              <button
                onClick={() => setRequireAllVotes(!requireAllVotes)}
                className={`relative w-11 h-6 rounded-full transition-colors ${requireAllVotes ? 'bg-primary' : 'bg-stone-300'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${requireAllVotes ? 'left-6' : 'left-1'}`} />
              </button>
            ) : (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${requireAllVotes ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-600'}`}>
                {requireAllVotes ? 'Oui' : 'Non'}
              </span>
            )}
          </div>
        </div>

        {/* Save button */}
        {isCreator && (
          <div className="mt-6 flex items-center gap-3">
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            {saveSuccess && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 size={14} /> Sauvegardé</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {isCreator && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
          <h3 className="text-lg font-bold text-red-900 mb-2">Zone de danger</h3>
          <p className="text-sm text-red-700 mb-4">Ces actions sont irréversibles.</p>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={18} />
            Supprimer ce voyage
          </button>
        </div>
      )}
    </div>
  );
}

// My Booking Card — lets the current user mark their own flight/hotel as booked
function MyBookingCard({ member, tripId, getToken, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const updateStatus = async (field, value) => {
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/trips/${tripId}/booking-status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise à jour');
      await onUpdate();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const allBooked = member.hasBookedFlight && member.hasBookedHotel;

  return (
    <div className={`rounded-2xl border-2 p-5 ${allBooked ? 'bg-green-50 border-green-200' : 'bg-white border-primary/20'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-text-main flex items-center gap-2">
          <CheckSquare size={18} className={allBooked ? 'text-green-600' : 'text-primary'} />
          Mes réservations
        </h3>
        {allBooked && (
          <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={13} /> Tout réservé
          </span>
        )}
      </div>
      {saveError && <p className="text-red-500 text-sm mb-3">{saveError}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => updateStatus('hasBookedFlight', !member.hasBookedFlight)}
          disabled={saving}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
            member.hasBookedFlight
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border-2 border-transparent'
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plane size={16} />}
          {member.hasBookedFlight ? 'Vol réservé ✓' : 'Marquer vol réservé'}
        </button>
        <button
          onClick={() => updateStatus('hasBookedHotel', !member.hasBookedHotel)}
          disabled={saving}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
            member.hasBookedHotel
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border-2 border-transparent'
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Hotel size={16} />}
          {member.hasBookedHotel ? 'Hôtel réservé ✓' : 'Marquer hôtel réservé'}
        </button>
      </div>
    </div>
  );
}

function BookingChecklistSection({ trip, fetchTripDetails, getToken }) {
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  // Get trip data from finalDestination (handles both flat and nested structures)
  const tripData = trip.finalDestination || {};
  const { city: destCity, country: destCountry } = getDestinationInfo(trip.finalDestination);
  const city = destCity || 'Unknown';
  const country = destCountry || 'Unknown';

  // Generate optimized booking links
  const links = generateAllBookingLinks({
    destinationCity: city,
    destinationIata: getIataCode(city, country),
    destinationCountry: country,
    startDate: trip.finalStartDate,
    endDate: trip.finalEndDate,
    adults: trip.members?.length || 1
  });

  // Count members who need reminders
  const membersNeedingReminder = trip.members?.filter(
    m => !m.hasBookedFlight || !m.hasBookedHotel
  ) || [];

  // Send reminder emails to members who haven't booked
  const handleSendReminders = async () => {
    if (sendingReminders) return;

    setSendingReminders(true);
    setReminderResult(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setReminderResult({
          type: 'success',
          message: data.sentCount > 0
            ? `✅ ${data.sentCount} rappel(s) envoyé(s)!`
            : '✨ Tout le monde a déjà réservé!'
        });
        // Refresh trip details to update chat
        if (fetchTripDetails) fetchTripDetails();
      } else {
        setReminderResult({
          type: 'error',
          message: data.error || 'Erreur lors de l\'envoi'
        });
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      setReminderResult({
        type: 'error',
        message: 'Erreur de connexion'
      });
    } finally {
      setSendingReminders(false);
      // Clear result after 5 seconds
      setTimeout(() => setReminderResult(null), 5000);
    }
  };

  return (
    <>
      {/* Group Members Booking Status */}
      {trip.members && trip.members.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-main">Suivi du groupe</h2>
            <div className="flex items-center gap-2">
              {reminderResult && (
                <span className={`text-sm ${reminderResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {reminderResult.message}
                </span>
              )}
              <button
                onClick={handleSendReminders}
                disabled={sendingReminders || membersNeedingReminder.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 font-medium rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReminders ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Bell size={18} />
                )}
                {sendingReminders ? 'Envoi...' : 'Rappeler les amis'}
                {membersNeedingReminder.length > 0 && !sendingReminders && (
                  <span className="bg-amber-800 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {membersNeedingReminder.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {trip.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={member.user?.imageUrl || `https://ui-avatars.com/api/?name=${member.user?.firstName}`}
                    alt={member.user?.firstName}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium text-text-main">
                    {member.user?.firstName} {member.user?.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {member.hasBookedFlight && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                      <Plane size={12} /> Vol
                    </span>
                  )}
                  {member.hasBookedHotel && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                      <Hotel size={12} /> Hôtel
                    </span>
                  )}
                  {member.bookingConfirmed && (
                    <CheckCircle2 size={18} className="text-green-600" />
                  )}
                  {!member.hasBookedFlight && !member.hasBookedHotel && (
                    <span className="text-xs text-text-secondary">En attente</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Checklist Card using optimized links */}
      <BookingChecklistCard
        city={city}
        country={country}
        startDate={trip.finalStartDate}
        endDate={trip.finalEndDate}
        adults={trip.members?.length || 1}
        members={trip.members || []}
      />
    </>
  );
}

// ========================================
// TRIP ENHANCEMENTS SECTION
// Weather, Itinerary, Packing, Events
// Uses SSE streaming for itinerary generation
// ========================================
function TripEnhancementsSection({ trip, userName }) {
  const { getToken } = useAuth();
  const [weather, setWeather] = useState(null);
  const [events, setEvents] = useState({ upcoming: [], regular: [] });
  const [packing, setPacking] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingItinerary, setLoadingItinerary] = useState(true);
  const [generatingDay, setGeneratingDay] = useState(null);
  const [totalDays, setTotalDays] = useState(0);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [aiLoadingText, setAiLoadingText] = useState('Planification de votre aventure');

  // AI loading text animation
  const loadingPhrases = [
    'Planification de votre aventure',
    'Découverte des pépites cachées',
    'Vérification des coups de cœur locaux',
    'Optimisation de votre planning',
    'Ajout de conseils d\'initiés',
    'Création de la journée parfaite',
    'Sélection des incontournables',
    'Personnalisation des activités',
  ];

  useEffect(() => {
    let phraseIndex = 0;
    const interval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
      setAiLoadingText(loadingPhrases[phraseIndex]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather and events (fast endpoints)
  useEffect(() => {
    const fetchFastData = async () => {
      try {
        const token = await getToken();

        // Fetch weather and events in parallel
        const [weatherRes, eventsRes] = await Promise.all([
          fetch(`${API_URL}/api/trips/${trip.id}/weather`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/trips/${trip.id}/events`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);

        if (weatherRes.ok) {
          const weatherData = await weatherRes.json();
          setWeather(weatherData.data?.weather);
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData.data?.events || { upcoming: [], regular: [] });
        }
      } catch (err) {
        console.error('Error fetching fast data:', err);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchFastData();
  }, [trip.id, getToken]);

  // Stream itinerary using SSE
  useEffect(() => {
    let eventSource = null;

    const streamItinerary = async () => {
      try {
        const token = await getToken();

        // Use EventSource with auth header via fetch
        const response = await fetch(`${API_URL}/api/trips/${trip.id}/itinerary/stream`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to start itinerary stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let eventType = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (eventType) {
                  case 'status':
                    console.log('📊 Stream status:', data.message);
                    break;

                  case 'day':
                    console.log(`📅 Received day ${data.dayNumber}/${data.totalDays}`);
                    setTotalDays(data.totalDays);
                    setGeneratingDay(data.dayNumber);
                    setItinerary(prev => {
                      // Add or update day
                      const existing = prev.findIndex(d => d.day === data.dayNumber);
                      if (existing >= 0) {
                        const updated = [...prev];
                        updated[existing] = data.day;
                        return updated;
                      }
                      return [...prev, data.day].sort((a, b) => a.day - b.day);
                    });
                    break;

                  case 'packing':
                    console.log('🎒 Received packing data');
                    setPacking(data.packing);
                    break;

                  case 'complete':
                    console.log('✅ Itinerary stream complete');
                    setLoadingItinerary(false);
                    setGeneratingDay(null);
                    if (data.packing) setPacking(data.packing);
                    break;

                  case 'error':
                    console.error('❌ Stream error:', data.message);
                    setError(data.message);
                    setLoadingItinerary(false);
                    break;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error streaming itinerary:', err);
        setError(err.message);
        setLoadingItinerary(false);
      }
    };

    streamItinerary();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [trip.id, getToken]);

  // Build destination object with proper city/country (handles nested tripData structure)
  const destInfo = getDestinationInfo(trip.finalDestination);
  const destination = {
    ...(trip.finalDestination || {}),
    city: destInfo.city,
    country: destInfo.country,
  };

  return (
    <div className="space-y-6">
      {/* Weather & Packing Section - Side by Side */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weather Forecast */}
        {loadingWeather ? (
          <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl shadow-card border border-blue-100 p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-text-secondary">Chargement de la météo...</span>
            </div>
          </div>
        ) : weather ? (
          <WeatherForecastCard weather={weather} destination={destination} />
        ) : null}

        {/* Packing Tips */}
        {packing ? (
          <PackingTipsCard packing={packing} destination={destination} />
        ) : loadingItinerary ? (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-card border border-amber-100 p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <span className="text-text-secondary">Préparation de la liste de bagages...</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Personalized Itinerary - Streaming */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              Votre itinéraire personnalisé
            </h2>
            {loadingItinerary && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="animate-pulse">{aiLoadingText}...</span>
              </div>
            )}
          </div>
        </div>

        {/* Day tabs */}
        {(itinerary.length > 0 || generatingDay) && (
          <div className="flex overflow-x-auto gap-2 p-4 border-b border-gray-100 bg-gray-50">
            {itinerary.map((day, idx) => (
              <button
                key={day.day}
                onClick={() => setActiveDay(idx)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeDay === idx
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Jour {day.day}
              </button>
            ))}
            {/* Loading placeholder for next day */}
            {loadingItinerary && generatingDay && generatingDay > itinerary.length && (
              <div className="flex-shrink-0 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-primary font-medium">Jour {generatingDay}</span>
              </div>
            )}
            {/* Future days placeholder */}
            {loadingItinerary && totalDays > 0 && Array.from({ length: Math.max(0, totalDays - Math.max(itinerary.length, generatingDay || 0)) }, (_, i) => (
              <div
                key={`future-${i}`}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-400"
              >
                Jour {Math.max(itinerary.length, generatingDay || 0) + i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Day content */}
        <div className="p-6">
          {itinerary.length === 0 && loadingItinerary ? (
            <div className="text-center py-12">
              <div className="relative inline-block">
                <Sparkles className="w-16 h-16 text-primary animate-pulse mx-auto mb-4" />
                <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">{aiLoadingText}...</p>
              <p className="text-sm text-text-secondary">
                Création d'un itinéraire jour par jour personnalisé pour vous
              </p>
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : itinerary.length > 0 ? (
            <PersonalizedItineraryCard
              itinerary={itinerary}
              userName={userName}
              activeDay={activeDay}
              setActiveDay={setActiveDay}
              destination={destination}
              isStreaming={true}
            />
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-900 font-medium mb-1">Impossible de générer l'itinéraire</p>
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Local Events */}
      {(events.upcoming.length > 0 || events.regular.length > 0) && (
        <LocalEventsCard events={events} destination={destination} />
      )}
    </div>
  );
}

// Weather Forecast Card Component
function WeatherForecastCard({ weather, destination }) {
  const getWeatherIcon = (condition) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain')) return <CloudRain className="w-6 h-6 text-blue-500" />;
    if (lower.includes('snow')) return <CloudSnow className="w-6 h-6 text-blue-300" />;
    if (lower.includes('cloud')) return <Cloudy className="w-6 h-6 text-gray-400" />;
    return <Sun className="w-6 h-6 text-yellow-500" />;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl shadow-card border border-blue-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sun className="w-6 h-6 text-yellow-500" />
            Météo prévue
          </h2>
          <span className="text-sm text-gray-600">{destination.city}</span>
        </div>

        {/* Current Weather */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Conditions actuelles</p>
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
          <p className="text-sm font-semibold text-gray-700 mb-3">Prévisions 7 jours</p>
          {weather.forecast.map((day, idx) => (
            <div key={idx} className="bg-white rounded-lg p-3 flex items-center justify-between hover:bg-blue-50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-gray-700 w-20">
                  {idx === 0 ? "Aujourd'hui" : new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
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
            Conseils bagages
          </h2>
          <span className="text-sm text-gray-600">{destination.city}</span>
        </div>

        {/* Weather Summary */}
        {packing.weatherSummary && (
          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Conditions prévues</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Température moy.</p>
                <p className="font-bold text-gray-900">{packing.weatherSummary.avgTemp}°C</p>
              </div>
              <div>
                <p className="text-gray-600">Plage</p>
                <p className="font-bold text-gray-900">{packing.weatherSummary.tempRange}</p>
              </div>
              {packing.weatherSummary.rainChance > 20 && (
                <div>
                  <p className="text-gray-600">Risque de pluie</p>
                  <p className="font-bold text-blue-600">{packing.weatherSummary.rainChance}%</p>
                </div>
              )}
              {packing.weatherSummary.maxUV > 5 && (
                <div>
                  <p className="text-gray-600">UV max</p>
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
              Essentiels (À ne pas oublier !)
            </h3>
            <div className="bg-white rounded-lg p-3 space-y-1.5">
              {packing.essentials.map((item, idx) => {
                const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
                if (!text) return null;
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-gray-700">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clothing */}
          <div>
            <h3 className="text-sm font-bold text-purple-700 mb-2">Vêtements</h3>
            <div className="bg-white rounded-lg p-3 space-y-1.5">
              {packing.clothing.map((item, idx) => {
                const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
                if (!text) return null;
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Circle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-700">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional Items */}
          {packing.optional.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-600 mb-2">Optionnel (confort)</h3>
              <div className="bg-white rounded-lg p-3 space-y-1.5">
                {packing.optional.map((item, idx) => {
                  const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
                  if (!text) return null;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
