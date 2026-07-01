// frontend/src/pages/TripDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { track } from '../lib/analytics';
import { readGuestSession, useTripAuthToken } from '../lib/guestSession';
import {
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  Clock,
  Check,
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
  Star,
  Hotel,
  ExternalLink,
  Bell,
  Sun,
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
  Wallet,
  Vote,
  Trophy,
  Search,
  Pencil,
} from 'lucide-react';
import { PersonalizedItineraryCard } from '../components/TripEnhancementComponents';
import { BookingChecklistCard } from '../components/StickyBookingProgress';
import TripChat from '../components/TripChat';
import FriendsManager from '../components/FriendsManager';
import TripExpenses from '../components/TripExpenses';
import GroupTripOverview from '../components/group/GroupTripOverview';
import JourneyRibbon from '../components/group/JourneyRibbon';
import { Avatar, AvatarStack, Badge, Button, Card, PhotoBlock } from '../components/ui';
import { STATIC_DESTINATION_PHOTOS } from '../utils/destinationImages';
import { formatEUR, formatTimeFR } from '../utils/format';

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
  const { getToken, isSignedIn } = useAuth();
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

  // Guest session detection - check if we have a valid guest session for this
  // trip. Lazy init (pas un effect) : le premier fetchTripDetails doit déjà
  // savoir s'il authentifie en invité, sinon l'invité reçoit un 401 et croit
  // que le voyage a disparu.
  const [guestSession, setGuestSession] = useState(() => readGuestSession(id));

  useEffect(() => {
    // Re-evaluate when navigating between trips
    setGuestSession(readGuestSession(id));
  }, [id]);

  // Jeton d'API : session invitée (`guest:<token>`, même convention que le
  // socket) quand l'utilisateur n'a pas de compte, sinon jeton Clerk.
  const getAuthToken = async () => (
    guestSession && !isSignedIn ? `guest:${guestSession.sessionToken}` : await getToken()
  );

  useEffect(() => {
    fetchTripDetails();
  }, [id]);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
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

      const token = await getAuthToken();
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
      track('invitation_sent', { tripId: trip.id, count: emailsToSend.length });
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
      const token = await getAuthToken();
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
      const token = await getAuthToken();
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
        color: 'bg-moss-100 text-[#3d5a24]',
        description: 'Destination choisie, prêt pour les réservations',
      };
    }

    if (trip.proposedTrips && trip.proposedTrips.length > 0) {
      return {
        label: 'Vote',
        color: 'bg-ember-50 text-ember-800',
        description: 'Votez pour votre destination préférée',
      };
    }

    return {
      label: 'Planification',
      color: 'bg-gold-100 text-[#7a5c1a]',
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
        <div className="bg-clay-100 border border-clay-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-clay-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-clay-500 mb-2">Erreur</h3>
          <p className="text-clay-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-clay-500 text-white rounded-lg hover:brightness-95 transition-colors"
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
      {/* Compact page header. The group-trip overview carries the visual hierarchy. */}
      <div className="border-b border-sand-200 bg-surface-subtle">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-main"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux voyages
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {inviteSuccess && (
              <span className="flex items-center gap-1 text-sm font-medium text-moss-500">
                <CheckCircle2 size={16} />
                {inviteSuccess}
              </span>
            )}
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-sand-50"
            >
              <UserPlus size={16} />
              Inviter
            </button>
            {userRole === 'creator' && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-clay-500 transition-colors hover:bg-clay-100"
                title="Supprimer le voyage"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation — cibles 44px + fondu de débordement mobile (audit V3 T9 :
          tabs 40px et onglets cachés par un scroll horizontal non évident) */}
      <div className="bg-white border-b border-sand-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent sm:hidden" aria-hidden="true" />
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
                className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:bg-sand-100 hover:text-text-main'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-sand-200 text-text-secondary'
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ============ OVERVIEW TAB ============ */}
        {activeTab === 'overview' && (
          <>
            {/* The spine that ties the three lifecycle states together */}
            <JourneyRibbon state={isConfirmed ? 'confirmed' : isVoting ? 'voting' : 'planning'} />

            {/* Conditional Main Section based on trip status */}
            {isPlanning && <PlanningSection trip={trip} navigate={navigate} />}
            {isVoting && <VotingSection trip={trip} fetchTripDetails={fetchTripDetails} user={user} isCreator={userRole === 'creator'} />}
            {isConfirmed && (
              <>
                <GroupTripOverview
                  trip={trip}
                  currentUserId={currentUserId}
                  onInvite={() => setShowInviteModal(true)}
                  onBook={() => setActiveTab('checklist')}
                />
                <TripEnhancementsSection trip={trip} userName={user?.firstName || 'there'} />
              </>
            )}
          </>
        )}

        {/* ============ PARTICIPANTS TAB ============ */}
        {activeTab === 'participants' && (
          <div className="flex flex-col gap-5">
            {/* Members */}
            <Card className="px-6 pb-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {trip.members?.length || 0} voyageur{(trip.members?.length || 0) > 1 ? 's' : ''}
                  </span>
                  <h2 className="mt-0.5 font-display text-[22px] font-medium text-text-main">Participants</h2>
                </div>
                <div className="flex items-center gap-2">
                  {reminderMessage && (
                    <span className={`text-sm ${reminderMessage.type === 'success' ? 'text-moss-500' : 'text-clay-500'}`}>
                      {reminderMessage.text}
                    </span>
                  )}
                  <Button icon={<Plus size={16} />} onClick={() => setShowInviteModal(true)}>
                    Inviter
                  </Button>
                </div>
              </div>

              <div>
                {trip.members?.map((member, i) => {
                  const name = `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || 'Membre';
                  const isCreator = member.role === 'creator';
                  return (
                    <div
                      key={member.id}
                      className={['flex items-center gap-3.5 py-3.5', i ? 'border-t border-sand-200' : ''].join(' ')}
                    >
                      <Avatar name={name} src={member.user?.imageUrl} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-text-main">{name}</span>
                          <Badge tone={isCreator ? 'ember' : 'neutral'}>{isCreator ? 'Créateur' : 'Membre'}</Badge>
                          {member.user?.id === currentUserId && (
                            <span className="text-[13px] text-text-muted">· vous</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[13px] text-text-muted">
                          {member.user?.email || 'Email non disponible'}
                        </div>
                        {isConfirmed && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge tone={member.hasBookedFlight ? 'moss' : 'neutral'}>
                              <Plane size={12} /> {member.hasBookedFlight ? 'Vol réservé' : 'Vol à réserver'}
                            </Badge>
                            <Badge tone={member.hasBookedHotel ? 'moss' : 'neutral'}>
                              <Hotel size={12} /> {member.hasBookedHotel ? 'Hôtel réservé' : 'Hôtel à réserver'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {isConfirmed && member.bookingConfirmed ? (
                        <CheckCircle2 size={20} className="shrink-0 text-moss-500" />
                      ) : isConfirmed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Bell size={14} />}
                          onClick={sendReminders}
                          disabled={sendingReminder}
                        >
                          Rappeler
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Pending invites + friends */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Card className="p-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Invitations en attente
                </span>
                {!trip.invitations || trip.invitations.length === 0 ? (
                  <div className="mt-3 text-sm text-text-muted">Aucune invitation en attente.</div>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {trip.invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand-100 text-sand-500">
                          <Mail size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-text-main">{invitation.email}</div>
                        </div>
                        <Badge tone="gold" dot>En attente</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="flex flex-col p-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Inviter depuis mes amis
                </span>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                  Ajoutez en un clic les amis avec qui vous voyagez souvent. Skusku garde votre cercle sous la main.
                </p>
                <div className="mt-4">
                  <Button variant="outline" icon={<Users size={16} />} onClick={() => setShowFriendsManager(true)}>
                    Gérer mes amis & inviter
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ============ CHAT TAB ============ */}
        {activeTab === 'chat' && (
          <div className="flex flex-col gap-5">
            {/* AI Assistant explainer — dark, calm, matching the design handoff */}
            <Card className="border-0 bg-sand-900 p-5 text-white">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-ember-600 text-white">
                  <Sparkles size={22} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-white">Discutez avec l'assistant</h3>
                  <p className="mt-1 text-sm text-sand-300">
                    Mentionnez{' '}
                    <span className="font-mono text-ember-200">@assistant</span>{' '}
                    dans le chat pour modifier l'itinéraire, suggérer des activités ou poser une question sur le voyage. Tout le groupe voit la réponse.
                  </p>
                </div>
              </div>
            </Card>

            {/* Full Chat Component - Inline instead of floating */}
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-sand-200 bg-sand-50 px-5 py-4">
                <MessageCircle size={18} className="text-primary" />
                <h3 className="font-semibold text-text-main">Chat du groupe</h3>
              </div>
              <div className="h-[500px]">
                <TripChat tripId={id} tripName={trip.name} embedded={true} guestSession={guestSession} />
              </div>
            </Card>
          </div>
        )}

        {/* ============ EXPENSES TAB ============ */}
        {activeTab === 'expenses' && (
          <TripExpenses
            tripId={trip.id}
            currentUserId={currentUserId}
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
                      getToken={getAuthToken}
                      onUpdate={fetchTripDetails}
                    />
                  );
                })()}

                {/* Group tracking + optimized booking links */}
                <BookingChecklistSection trip={trip} fetchTripDetails={fetchTripDetails} getToken={getAuthToken} />

                {/* Weather & packing prep */}
                <TripPrepSection trip={trip} />
              </>
            ) : (
              <Card className="px-8 py-14 text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] bg-sand-100 text-sand-500">
                  <ListChecks size={30} />
                </span>
                <h3 className="mt-4 font-display text-[20px] font-medium tracking-[-0.01em] text-text-main">
                  Disponible une fois la destination confirmée
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
                  Dès que le vote sera clôturé, vous retrouverez ici vos réservations à faire, le suivi du groupe et les liens optimisés.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ============ SETTINGS TAB ============ */}
        {activeTab === 'settings' && (
          <TripSettingsTab
            trip={trip}
            userRole={userRole}
            getToken={getAuthToken}
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
                className="p-2 hover:bg-sand-100 rounded-full transition-colors"
              >
                <X size={20} className="text-text-light" />
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
                <div className="flex-1 h-px bg-sand-200"></div>
                <span className="text-xs text-text-secondary">ou</span>
                <div className="flex-1 h-px bg-sand-200"></div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Adresse email
                </label>
                {inviteError && <p className="text-clay-500 text-sm mb-2">{inviteError}</p>}
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={addInviteEmail}
                  placeholder="ami@exemple.com (Appuyez sur Entrée)"
                  className="w-full px-4 py-3 border border-sand-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                        className="flex items-center justify-between p-3 bg-gold-100 border border-gold-100 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-[#7a5c1a]" />
                          <span className="text-sm font-medium text-[#7a5c1a]">{email}</span>
                        </div>
                        <button
                          onClick={() => removeInviteEmail(email)}
                          className="p-1 hover:bg-gold-100 rounded transition-colors"
                        >
                          <X size={14} className="text-[#7a5c1a]" />
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
                  className="flex-1 px-4 py-3 border border-sand-300 text-text-secondary font-medium rounded-xl hover:bg-sand-50 transition-colors"
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
const AMBIANCE_CHIPS = ['Soleil & gastronomie', 'Citytrip culturel', 'Bord de mer', 'Petit budget'];

function IconChip({ children, tone = 'sand' }) {
  const tones = {
    sand: 'bg-sand-100 text-sand-600',
    ember: 'bg-ember-50 text-ember-700',
    moss: 'bg-moss-100 text-[#3d5a24]',
  };
  return (
    <span className={['grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone] || tones.sand].join(' ')}>
      {children}
    </span>
  );
}

function PrefRow({ Icon, label, value, last }) {
  return (
    <div className={['flex items-center gap-3.5 py-2.5', last ? '' : 'border-b border-sand-200'].join(' ')}>
      <IconChip><Icon size={19} /></IconChip>
      <div className="min-w-0">
        <div className="text-[12.5px] text-text-muted">{label}</div>
        <div className="mt-0.5 text-[15px] font-semibold text-text-main">{value}</div>
      </div>
    </div>
  );
}

function PlanningSection({ trip, navigate }) {
  const getToken = useTripAuthToken(trip.id);
  const [groupPrefs, setGroupPrefs] = useState(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [proposalMode, setProposalMode] = useState('ai'); // 'ai' or 'custom'
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

      const vibe = customDestination.trim();
      const payload = {
        basic: {
          budget: groupPrefs.budget.average,
          style: groupPrefs.travelStyles[0] || 'cultural',
          activities: groupPrefs.activities.slice(0, 3),
          maxFlightHours: groupPrefs.maxFlightHours,
          destinationPreference: 'any',
          travelers: groupPrefs.defaultTravelers,
          ...(vibe ? { travelVibeDescription: vibe } : {}),
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
      } else {
        setSearchError(data.error || 'Aucune recommandation trouvée. Réessayez dans un instant.');
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
      } else {
        setSearchError(data.error || 'Aucune recommandation trouvée. Réessayez dans un instant.');
      }
    } catch (err) {
      console.error('Error searching:', err);
      setSearchError('Erreur lors de la recherche. Veuillez réessayer.');
    } finally {
      setSearching(false);
    }
  };

  const memberCount = trip.members?.length || groupPrefs?.defaultTravelers || 0;
  const avail = groupPrefs?.availability;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const prefRows = groupPrefs
    ? [
        { Icon: Wallet, label: 'Budget moyen', value: `${formatEUR(groupPrefs.budget?.average ?? '—')} / pers.` },
        { Icon: Users, label: 'Voyageurs', value: `${groupPrefs.defaultTravelers || memberCount}` },
        { Icon: Plane, label: 'Vol maximum', value: `${groupPrefs.maxFlightHours || 12} h` },
        { Icon: Heart, label: 'Activité phare', value: cap(groupPrefs.activities?.[0]) || 'Toutes' },
      ]
    : [];
  const availRows = avail
    ? [
        { Icon: Clock, label: 'Durée suggérée', value: `${avail.recommendedDuration || 7} jours` },
        ...(avail.minAvailableLeaveDays != null
          ? [{ Icon: Calendar, label: 'Congés disponibles', value: `${avail.minAvailableLeaveDays} j` }]
          : []),
        ...(avail.preferredMonths?.length
          ? [{ Icon: Sun, label: 'Mois préférés', value: avail.preferredMonths.map(cap).join(', ') }]
          : []),
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <Card>
        <PhotoBlock src={STATIC_DESTINATION_PHOTOS.Porto} className="h-[160px]">
          <div className="absolute inset-x-0 bottom-0 z-[2] p-6 text-white">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              Voyage de groupe · {memberCount} {memberCount > 1 ? 'personnes' : 'personne'}
            </span>
            <h2 className="mt-1.5 font-display text-[32px] font-medium leading-[1.05] tracking-[-0.015em]">
              On part <span className="italic text-ember-200">où</span> cette fois‑ci&nbsp;?
            </h2>
          </div>
        </PhotoBlock>
        <p className="px-6 py-4 text-[14.5px] text-text-secondary">
          Rien n'est encore proposé. Lancez une recherche pour transformer vos envies en propositions
          concrètes, que le groupe pourra ensuite voter.
        </p>
      </Card>

      {/* Group preferences + availability */}
      {loadingPrefs ? (
        <Card className="px-5 py-6">
          <div className="flex items-center gap-3 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Chargement des préférences du groupe…</span>
          </div>
        </Card>
      ) : groupPrefs ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card className="px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Préférences du groupe
            </span>
            <div className="mt-2">
              {prefRows.map((r, i) => (
                <PrefRow key={r.label} {...r} last={i === prefRows.length - 1} />
              ))}
            </div>
          </Card>

          <Card className="px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Disponibilités
            </span>
            <div className="mt-2">
              {availRows.map((r, i) => (
                <PrefRow key={r.label} {...r} last={i === availRows.length - 1} />
              ))}
            </div>
            {avail?.availabilityMessage && (
              <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-sand-50 px-3.5 py-3 text-[13px] text-text-muted">
                <Users size={15} className="text-moss-500 shrink-0" />
                <span>{avail.availabilityMessage}</span>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {/* Search error */}
      {searchError && (
        <div className="flex items-center gap-2 rounded-xl bg-clay-100 px-3.5 py-3 text-sm text-clay-500">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{searchError}</span>
          <button onClick={() => setSearchError(null)} className="text-clay-500 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Propose block */}
      {searching ? (
        <Card className="p-7">
          <div className="flex items-center gap-3">
            <span className="sk-pulse grid h-11 w-11 place-items-center rounded-[14px] bg-ember-50 text-ember-700">
              <Sparkles size={22} />
            </span>
            <div>
              <div className="text-base font-semibold text-text-main">Skusku compose vos propositions…</div>
              <div className="mt-0.5 text-[13.5px] text-text-muted">
                Vols directs, climat et budget du groupe analysés.
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="sk-skel h-14 w-14 rounded-xl" />
                <div className="grid flex-1 gap-2">
                  <div className="sk-skel h-3 w-[42%]" />
                  <div className="sk-skel h-2.5 w-[78%]" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="px-6 pt-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Prochaine étape
            </span>
            <h2 className="mt-2 font-display text-[22px] font-medium text-text-main">Proposer une destination</h2>
            <p className="mt-2 max-w-xl text-[14.5px] text-text-secondary">
              Skusku part de vos envies et de vos disponibilités pour bâtir des propositions complètes —
              destination, dates, vol et hôtel.
            </p>
            <div className="mt-4 inline-flex gap-1 rounded-full bg-sand-100 p-1">
              {[
                ['ai', 'Recherche IA', Sparkles],
                ['custom', 'Idée personnalisée', Pencil],
              ].map(([k, label, Ic]) => (
                <button
                  key={k}
                  onClick={() => setProposalMode(k)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-all',
                    proposalMode === k ? 'bg-white text-text-main shadow-1' : 'text-text-muted',
                  ].join(' ')}
                >
                  <Ic size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-6 pt-5">
            {proposalMode === 'custom' ? (
              <div>
                <input
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
                  placeholder="Une ville, un pays, une vibe… ex : « Porto en mars »"
                  className="h-[50px] w-full rounded-[14px] border border-sand-200 bg-sand-50 px-[18px] text-[15px] text-text-main outline-none focus:border-primary"
                />
                <div className="mt-4">
                  <Button size="lg" icon={<Search size={17} />} onClick={handleCustomSearch} disabled={!customDestination.trim()}>
                    Proposer cette idée au groupe
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2.5 text-[13px] text-text-muted">Affinez l'ambiance recherchée (optionnel)</div>
                <div className="mb-[18px] flex flex-wrap gap-2">
                  {AMBIANCE_CHIPS.map((x) => {
                    const on = customDestination === x;
                    return (
                      <button
                        key={x}
                        onClick={() => setCustomDestination(on ? '' : x)}
                        className={[
                          'rounded-full border px-3.5 py-[7px] text-[13px] font-medium transition-all',
                          on
                            ? 'border-ember-300 bg-ember-50 text-ember-700'
                            : 'border-sand-200 bg-white text-text-secondary hover:border-sand-300',
                        ].join(' ')}
                      >
                        {x}
                      </button>
                    );
                  })}
                </div>
                <Button size="lg" icon={<Sparkles size={18} />} onClick={handleSmartSearch} disabled={!groupPrefs}>
                  Lancer la recherche IA
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function FlightLeg({ label, leg }) {
  if (!leg) return null;
  const dep = leg.departureAirport || leg.from || '';
  const arr = leg.arrivalAirport || leg.to || '';
  // Horaire déjà formaté (« 17:50 ») ou timestamp ISO brut selon la source —
  // on ne montre jamais l'ISO à l'utilisateur.
  const legTime = (value) => (
    typeof value === 'string' && value.includes('T') ? (formatTimeFR(value) || value) : (value || '')
  );
  return (
    <div className="flex items-center gap-3 rounded-xl bg-sand-50 px-4 py-3">
      <Plane size={16} className="shrink-0 text-ember-600" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
        <div className="font-mono text-[13px] text-text-main">
          {dep} {legTime(leg.departureTime)} → {arr} {legTime(leg.arrivalTime)}
        </div>
      </div>
      <div className="shrink-0 text-right text-xs text-text-muted">
        {leg.duration && <div>{leg.duration}</div>}
        <div>{leg.stops ? `${leg.stops} escale${leg.stops > 1 ? 's' : ''}` : 'Direct'}</div>
      </div>
    </div>
  );
}

function ProposalDetailModal({ proposal, onClose }) {
  if (!proposal) return null;
  const td = proposal.tripData || {};
  const city = proposal.city || td.destination?.city || '?';
  const country = proposal.country || td.destination?.country || '';
  const flight = td.flightDetails;
  const hotel = td.hotelOptions?.hotels?.[0];
  const price = Math.round(proposal.estimatedCostPerPerson || td.pricing?.total || 0);
  const match = td.matchReason || td.destination?.matchReason;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-sand-900/45 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[20px] bg-white shadow-3 sm:rounded-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <PhotoBlock city={city} country={country} tripData={td} className="h-[180px]">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-[2] grid h-9 w-9 place-items-center rounded-full bg-white/90 text-text-main hover:bg-white"
          >
            <X size={18} />
          </button>
          <div className="absolute inset-x-0 bottom-0 z-[2] p-5 text-white">
            <span className="text-2xl">{getCountryEmoji(country)}</span>
            <h3 className="font-display text-[26px] font-medium leading-tight">{city}</h3>
            {country && <div className="text-sm text-white/80">{country}</div>}
          </div>
        </PhotoBlock>

        <div className="flex flex-col gap-4 p-5">
          {match && (
            <div className="flex items-start gap-2 rounded-xl bg-ember-50 px-3.5 py-3 text-[13.5px] text-ember-800">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-ember-600" />
              <span>{match}</span>
            </div>
          )}

          {flight && (flight.outbound || flight.return) && (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Vol</div>
              <div className="flex flex-col gap-2">
                <FlightLeg label="Aller" leg={flight.outbound} />
                <FlightLeg label="Retour" leg={flight.return} />
              </div>
            </div>
          )}

          {hotel && (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Hébergement</div>
              <div className="flex gap-3 rounded-xl border border-sand-200 p-3">
                {hotel.mainPhoto && (
                  <img src={hotel.mainPhoto} alt={hotel.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text-main">{hotel.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
                    {hotel.stars ? (
                      <span className="flex items-center gap-0.5 text-gold-500">
                        {Array.from({ length: Math.round(hotel.stars) }).map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                      </span>
                    ) : null}
                    {hotel.rating?.value && <span>· {hotel.rating.value} {hotel.rating.word}</span>}
                  </div>
                  {hotel.location && <div className="mt-0.5 truncate text-xs text-text-muted">{hotel.location}</div>}
                </div>
              </div>
            </div>
          )}

          {!!price && (
            <div className="flex items-center justify-between rounded-xl bg-sand-900 px-4 py-3 text-white">
              <span className="text-sm text-white/75">Estimation par personne</span>
              <span className="font-mono text-lg font-semibold">{formatEUR(price)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Voting Section - When destinations are proposed
function VotingSection({ trip, fetchTripDetails, user, isCreator }) {
  const getToken = useTripAuthToken(trip.id);
  const [voting, setVoting] = useState(false);
  const [votedForId, setVotedForId] = useState(null); // track locally which dest user just voted for
  const [voteError, setVoteError] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [votingProgress, setVotingProgress] = useState(null);
  const [detailProposal, setDetailProposal] = useState(null);

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

  const winningId = getWinningDestinationId();
  const scoreOf = (d) =>
    (d.votes || []).reduce((s, v) => s + (v.rank === 1 ? 5 : v.rank === 2 ? 3 : v.rank === 3 ? 1 : 0), 0);
  const sortedProposals = [...(trip.proposedTrips || [])].sort((a, b) => scoreOf(b) - scoreOf(a));
  const progressPct = memberCount > 0 ? Math.min(100, Math.round((votedMembersCount / memberCount) * 100)) : 0;
  const memberPeople = (trip.members || []).map((m) => ({
    id: m.id,
    name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || 'Membre',
    src: m.user?.imageUrl,
  }));
  const canFinalize = trip.proposedTrips?.some((p) => p.votes?.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Live progress */}
      <Card className="px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="sk-pulse h-2.5 w-2.5 rounded-full bg-ember-600" />
            <div>
              <div className="text-[15px] font-semibold text-text-main">Vote en cours</div>
              <div className="text-[13px] text-text-muted">
                {votedMembersCount} / {memberCount} membre{memberCount > 1 ? 's' : ''} ont voté
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {memberPeople.length > 0 && <AvatarStack people={memberPeople} size={32} max={5} />}
            <span className="font-mono text-[15px] font-semibold text-ember-700">{progressPct}%</span>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand-100">
          <div
            className="h-full rounded-full bg-ember-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {hasVoted && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-moss-500">
            <CheckCircle2 size={14} /> Vous avez voté
          </div>
        )}
      </Card>

      {voteError && (
        <div className="flex items-center gap-2 rounded-xl bg-clay-100 px-3.5 py-3 text-sm text-clay-500">
          <AlertCircle size={16} className="shrink-0" />
          {voteError}
        </div>
      )}

      {/* Proposal cards */}
      <div className="flex flex-col gap-4">
        {sortedProposals.map((proposed) => {
          const voteCount = proposed.votes?.length || 0;
          const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isMyVote = votedForId === proposed.id || userVotedDestId === proposed.id;
          const isLeading = proposed.id === winningId && voteCount > 0;
          const td = proposed.tripData || {};
          const city = proposed.city || td.destination?.city || '?';
          const country = proposed.country || td.destination?.country || '';
          const price = Math.round(proposed.estimatedCostPerPerson || td.pricing?.total || 0);
          const match = td.matchReason || td.destination?.matchReason;
          const startDate = proposed.startDate || td.slot?.startDate;
          const flight = td.flightDetails;
          const hotel = td.hotelOptions?.hotels?.[0];
          const hasDetails = !!(flight?.outbound || flight?.return || hotel || match);

          return (
            <Card key={proposed.id} className={isMyVote ? 'ring-2 ring-moss-500' : ''}>
              <PhotoBlock city={city} country={country} tripData={td} className="h-[168px]">
                <span className="absolute left-3 top-3 z-[2] text-2xl drop-shadow">{getCountryEmoji(country)}</span>
                {isLeading && (
                  <span className="absolute right-3 top-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-ember-600 px-2.5 py-1 text-xs font-semibold text-white shadow-2">
                    <Trophy size={12} /> En tête
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 z-[2] p-4 text-white">
                  <h3 className="font-display text-[24px] font-medium leading-none">{city}</h3>
                  <div className="mt-1 text-[13px] text-white/80">
                    {country}
                    {proposed.proposer?.firstName ? ` · proposé par ${proposed.proposer.firstName}` : ''}
                  </div>
                </div>
              </PhotoBlock>

              <div className="flex flex-col gap-3 p-4">
                {/* Price + dates */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[13px] text-text-secondary">
                    {startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {new Date(startDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {!!price && (
                      <span className="font-mono font-semibold text-text-main">{formatEUR(price)}<span className="font-sans font-normal text-text-muted">/pers</span></span>
                    )}
                  </div>
                  {isMyVote && <Badge tone="moss" dot>Votre choix</Badge>}
                </div>

                {/* Match reason */}
                {match && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-ember-50 px-2.5 py-2 text-[12.5px] text-ember-800">
                    <Sparkles size={13} className="mt-0.5 shrink-0 text-ember-600" />
                    <span className="line-clamp-2">{match}</span>
                  </div>
                )}

                {/* Flight / hotel quick-read */}
                {hasDetails && (
                  <button
                    onClick={() => setDetailProposal(proposed)}
                    className="flex items-center gap-3 rounded-xl border border-sand-200 px-3 py-2.5 text-left transition-colors hover:bg-sand-50"
                  >
                    <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-text-secondary">
                      {flight && (
                        <span className="flex items-center gap-1.5">
                          <Plane size={13} className="text-ember-600" />
                          {flight.outbound?.stops ? `${flight.outbound.stops} escale` : 'Vol direct'}
                        </span>
                      )}
                      {hotel && (
                        <span className="flex items-center gap-1.5">
                          <Hotel size={13} className="text-ember-600" />
                          <span className="max-w-[140px] truncate">{hotel.name}</span>
                        </span>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-ember-700">
                      Détails <ChevronRight size={14} />
                    </span>
                  </button>
                )}

                {/* Vote bar */}
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand-100">
                    <div
                      className={['h-full rounded-full transition-all duration-500', isLeading ? 'bg-ember-600' : 'bg-sand-400'].join(' ')}
                      style={{ width: `${votePercent}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold text-text-secondary">
                    {voteCount} · {votePercent}%
                  </span>
                </div>

                {/* Vote button */}
                <Button
                  variant={isMyVote ? 'secondary' : 'primary'}
                  full
                  onClick={() => handleVote(proposed.id)}
                  disabled={voting}
                  icon={
                    voting && votedForId === proposed.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isMyVote ? (
                      <CheckCircle2 size={16} className="text-moss-500" />
                    ) : (
                      <Vote size={16} />
                    )
                  }
                  className={isMyVote ? 'bg-moss-100 text-[#3d5a24] hover:bg-moss-100' : ''}
                >
                  {isMyVote ? 'Voté' : hasVoted ? 'Changer mon vote' : 'Voter'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Finalize Vote — creator only */}
      {isCreator && trip.proposedTrips?.length > 0 && (
        <Card className="border-0 bg-sand-900 p-5 text-white">
          {finalizeError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-clay-100 px-3 py-2.5 text-sm text-clay-500">
              <AlertCircle size={14} className="shrink-0" />
              {finalizeError}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-ember-600">
                <Trophy size={22} className="text-white" />
              </span>
              <div>
                <div className="text-[15.5px] font-semibold">Clôturer le vote</div>
                <p className="mt-0.5 max-w-md text-[13.5px] text-white/70">
                  La destination en tête sera confirmée et le voyage passera en phase de réservation.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleFinalizeVote}
              disabled={finalizing || !canFinalize}
              icon={finalizing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            >
              Confirmer la destination
            </Button>
          </div>
        </Card>
      )}

      <ProposalDetailModal proposal={detailProposal} onClose={() => setDetailProposal(null)} />
    </div>
  );
}

// Booking Checklist Section - When destination is confirmed
// Editable settings tab (creator only for editing)
// One settings row: label + hint on the left, control on the right
function SettingsField({ label, hint, children, first }) {
  return (
    <div className={['flex flex-wrap items-center justify-between gap-5 py-[18px]', first ? '' : 'border-t border-sand-200'].join(' ')}>
      <div className="min-w-[200px] flex-1">
        <div className="text-[14.5px] font-semibold text-text-main">{label}</div>
        {hint && <div className="mt-0.5 text-[13px] text-text-secondary">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

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
    <div className="sk-stagger mx-auto flex max-w-[760px] flex-col gap-5">
      <Card className="px-6 pb-6 pt-5">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">
            {isCreator ? 'Créateur' : 'Lecture seule'}
          </span>
          <h2 className="mt-1 font-display text-[22px] font-medium tracking-[-0.01em] text-text-main">Réglages du voyage</h2>
        </div>

        {!isCreator && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-sand-50 px-3.5 py-3 text-[13px] text-text-secondary">
            <Users size={15} /> Seul le créateur du voyage peut modifier ces réglages.
          </div>
        )}

        <div className="mt-2">
          <SettingsField first label="Nom du voyage" hint="Visible par tous les participants">
            {isCreator ? (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-[42px] min-w-[220px] rounded-[11px] border border-sand-200 bg-white px-3.5 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <span className="text-[14.5px] font-medium text-text-main">{trip.name}</span>
            )}
          </SettingsField>

          <SettingsField label="Nombre max de participants" hint="Au-delà, les invitations sont bloquées">
            {isCreator ? (
              <input
                type="number"
                min={trip.members?.length || 1}
                max={50}
                value={maxMembers}
                onChange={e => setMaxMembers(e.target.value)}
                className="h-[42px] w-28 rounded-[11px] border border-sand-200 bg-white px-3.5 font-mono text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <span className="font-mono text-[14.5px] font-medium text-text-main">{trip.maxMembers || 8}</span>
            )}
          </SettingsField>

          <SettingsField label="Date limite de vote" hint="Le vote se clôture automatiquement à cette date">
            {isCreator ? (
              <input
                type="date"
                value={voteDeadline}
                onChange={e => setVoteDeadline(e.target.value)}
                className="h-[42px] rounded-[11px] border border-sand-200 bg-white px-3.5 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <span className="text-[14.5px] font-medium text-text-main">
                {trip.voteDeadline
                  ? new Date(trip.voteDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Non définie'}
              </span>
            )}
          </SettingsField>

          <SettingsField label="Tous les votes requis" hint="Attendre que 100 % des membres aient voté avant de clôturer">
            {isCreator ? (
              <button
                onClick={() => setRequireAllVotes(!requireAllVotes)}
                className={`relative h-6 w-11 rounded-full transition-colors ${requireAllVotes ? 'bg-primary' : 'bg-sand-300'}`}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${requireAllVotes ? 'left-6' : 'left-1'}`} />
              </button>
            ) : (
              <Badge tone={requireAllVotes ? 'moss' : 'neutral'}>{requireAllVotes ? 'Oui' : 'Non'}</Badge>
            )}
          </SettingsField>
        </div>

        {isCreator && (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-sand-200 pt-5">
            {saveError && <p className="text-sm text-clay-500">{saveError}</p>}
            {saveSuccess && (
              <p className="flex items-center gap-1 text-sm text-moss-500"><CheckCircle2 size={14} /> Sauvegardé</p>
            )}
            <Button
              icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </Button>
          </div>
        )}
      </Card>

      {/* Danger zone */}
      {isCreator && (
        <Card className="!border-clay-100 p-6">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-500">Zone de danger</span>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[14.5px] font-semibold text-text-main">Supprimer le voyage</div>
              <div className="mt-0.5 text-[13px] text-text-secondary">
                Action irréversible. Tous les votes, dépenses et messages seront perdus.
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-[10px] bg-clay-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
            >
              <Trash2 size={15} /> Supprimer
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// One bookable item row (flight / hotel) with a mark-as-booked toggle
function MyBookingRow({ icon, label, sub, done, saving, onToggle }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <IconChip tone={done ? 'moss' : 'ember'}>{icon}</IconChip>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-text-main">{label}</div>
        {sub && <div className="text-[12.5px] text-text-muted">{sub}</div>}
      </div>
      <button
        onClick={onToggle}
        disabled={saving}
        className={[
          'inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13.5px] font-semibold transition-colors disabled:opacity-50',
          done
            ? 'bg-moss-100 text-[#3d5a24]'
            : 'border border-sand-200 bg-white text-text-main hover:bg-sand-50',
        ].join(' ')}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : done ? <><Check size={15} /> Réservé</> : 'Marquer réservé'}
      </button>
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
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 px-6 pt-5">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Vous</span>
          <h2 className="mt-1 font-display text-[22px] font-medium tracking-[-0.01em] text-text-main">Mes réservations</h2>
        </div>
        {allBooked && (
          <Badge tone="moss"><CheckCircle2 size={13} /> Tout réservé</Badge>
        )}
      </div>
      {saveError && <p className="px-6 pt-3 text-sm text-clay-500">{saveError}</p>}
      <div className="px-6 pb-5 pt-1">
        <MyBookingRow
          icon={<Plane size={19} />}
          label="Mon vol"
          done={member.hasBookedFlight}
          saving={saving}
          onToggle={() => updateStatus('hasBookedFlight', !member.hasBookedFlight)}
        />
        <div className="h-px bg-sand-200" />
        <MyBookingRow
          icon={<Hotel size={19} />}
          label="Ma chambre"
          done={member.hasBookedHotel}
          saving={saving}
          onToggle={() => updateStatus('hasBookedHotel', !member.hasBookedHotel)}
        />
      </div>
    </Card>
  );
}

function BookingChecklistSection({ trip, fetchTripDetails, getToken }) {
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);
  const { city: destCity, country: destCountry } = getDestinationInfo(trip.finalDestination);
  const city = destCity || 'Unknown';
  const country = destCountry || 'Unknown';

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
        <Card className="mb-5 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Suivi du groupe</span>
              <h2 className="mt-1 font-display text-[22px] font-medium tracking-[-0.01em] text-text-main">Qui a réservé quoi</h2>
            </div>
            <div className="flex items-center gap-2">
              {reminderResult && (
                <span className={`text-sm ${reminderResult.type === 'success' ? 'text-moss-500' : 'text-clay-500'}`}>
                  {reminderResult.message}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                icon={sendingReminders ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                onClick={handleSendReminders}
                disabled={sendingReminders || membersNeedingReminder.length === 0}
              >
                {sendingReminders ? 'Envoi…' : 'Rappeler les retardataires'}
              </Button>
            </div>
          </div>

          <div className="px-6 pb-5 pt-2">
            {trip.members.map((member, i) => (
              <div
                key={member.id}
                className={['flex items-center gap-3.5 py-3', i ? 'border-t border-sand-200' : ''].join(' ')}
              >
                <Avatar
                  name={`${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim()}
                  src={member.user?.imageUrl}
                  size={36}
                />
                <span className="flex-1 text-[14.5px] font-medium text-text-main">
                  {member.user?.firstName || 'Invité'}
                </span>
                <span className="flex gap-1.5">
                  <Badge tone={member.hasBookedFlight ? 'moss' : 'neutral'}>
                    <Plane size={12} /> {member.hasBookedFlight ? 'Vol ✓' : 'Vol …'}
                  </Badge>
                  <Badge tone={member.hasBookedHotel ? 'moss' : 'neutral'}>
                    <Hotel size={12} /> {member.hasBookedHotel ? 'Hôtel ✓' : 'Hôtel …'}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        </Card>
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
  const getToken = useTripAuthToken(trip.id);
  const [itinerary, setItinerary] = useState([]);
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

  // Stream itinerary using SSE
  useEffect(() => {
    // Abort the in-flight stream when the component unmounts or trip.id changes
    // (e.g. switching tabs). Without this, every remount spawned a second
    // concurrent reader writing into the same state — and could re-trigger
    // server-side Claude generation when the itinerary wasn't cached yet.
    const controller = new AbortController();

    const streamItinerary = async () => {
      try {
        const token = await getToken();

        // Use EventSource with auth header via fetch
        const response = await fetch(`${API_URL}/api/trips/${trip.id}/itinerary/stream`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
          signal: controller.signal,
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

                  case 'complete':
                    console.log('✅ Itinerary stream complete');
                    setLoadingItinerary(false);
                    setGeneratingDay(null);
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
        // A deliberate abort is not an error worth surfacing to the user.
        if (err.name === 'AbortError') return;
        console.error('Error streaming itinerary:', err);
        setError(err.message);
        setLoadingItinerary(false);
      }
    };

    streamItinerary();

    return () => {
      controller.abort();
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
    <div className="overflow-hidden rounded-[18px] border border-sand-200 bg-white shadow-1">
      <div className="border-b border-sand-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Itinéraire jour par jour</span>
            <h2 className="mt-1.5 flex items-center gap-2 font-display text-[26px] font-medium tracking-[-0.015em] text-text-main">
              Votre itinéraire
            </h2>
          </div>
          {loadingItinerary && (
            <div className="flex items-center gap-2 rounded-full bg-ember-50 px-3 py-1.5 text-sm text-ember-700">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="animate-pulse">{aiLoadingText}...</span>
            </div>
          )}
        </div>
      </div>

      {/* Day tabs */}
      {(itinerary.length > 0 || generatingDay) && (
        <div className="flex gap-2 overflow-x-auto border-b border-sand-200 bg-sand-50 p-4">
          {itinerary.map((day, idx) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(idx)}
              className={`flex-shrink-0 rounded-[10px] px-4 py-2 font-medium transition-all ${
                activeDay === idx
                  ? 'bg-ember-600 text-white shadow-2'
                  : 'border border-sand-200 bg-white text-text-secondary hover:bg-sand-100'
              }`}
            >
              Jour {day.day}
            </button>
          ))}
          {/* Loading placeholder for next day */}
          {loadingItinerary && generatingDay && generatingDay > itinerary.length && (
            <div className="flex flex-shrink-0 items-center gap-2 rounded-[10px] border border-ember-300/40 bg-ember-50 px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-ember-600" />
              <span className="font-medium text-ember-700">Jour {generatingDay}</span>
            </div>
          )}
          {/* Future days placeholder */}
          {loadingItinerary && totalDays > 0 && Array.from({ length: Math.max(0, totalDays - Math.max(itinerary.length, generatingDay || 0)) }, (_, i) => (
            <div
              key={`future-${i}`}
              className="flex-shrink-0 rounded-[10px] border border-sand-200 bg-sand-100 px-4 py-2 text-text-light"
            >
              Jour {Math.max(itinerary.length, generatingDay || 0) + i + 1}
            </div>
          ))}
        </div>
      )}

      {/* Day content */}
      <div className="p-6">
        {itinerary.length === 0 && loadingItinerary ? (
          <div className="py-12 text-center">
            <div className="relative inline-block">
              <Sparkles className="mx-auto mb-4 h-16 w-16 animate-pulse text-ember-500" />
              <div className="absolute inset-0 mx-auto h-16 w-16 animate-spin rounded-full border-4 border-ember-300/30 border-t-ember-600" />
            </div>
            <p className="mb-2 font-display text-lg font-medium text-text-main">{aiLoadingText}...</p>
            <p className="text-sm text-text-secondary">
              Création d'un itinéraire jour par jour personnalisé pour vous
            </p>
            <div className="mt-4 flex justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-ember-500"
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
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-12 w-12 text-gold-500" />
            <p className="mb-1 font-medium text-text-main">Impossible de générer l'itinéraire</p>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Weather + packing prep, relocated from overview to the "À faire" tab
function TripPrepSection({ trip }) {
  const getToken = useTripAuthToken(trip.id);
  const [weather, setWeather] = useState(null);
  const [packing, setPacking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const destInfo = getDestinationInfo(trip.finalDestination);
  const destination = { city: destInfo.city, country: destInfo.country };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [wRes, pRes] = await Promise.all([
          fetch(`${API_URL}/api/trips/${trip.id}/weather`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`${API_URL}/api/trips/${trip.id}/packing`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (cancelled) return;
        if (wRes?.data?.weather) setWeather(wRes.data.weather);
        if (pRes?.data?.packing) setPacking(pRes.data.packing);
        if (!wRes?.data?.weather && !pRes?.data?.packing) {
          setError('Données indisponibles pour le moment.');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [trip.id, getToken]);

  return (
    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Avant le départ</span>
      <h2 className="mt-1.5 font-display text-[26px] font-medium tracking-[-0.015em] text-text-main">Préparer vos valises</h2>
      <div className="mt-4">
        {loading ? (
          <Card className="py-12 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-ember-500" />
            <p className="text-sm text-text-secondary">Chargement de la météo et des conseils bagages…</p>
          </Card>
        ) : (weather || packing) ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {weather && <WeatherForecastCard weather={weather} destination={destination} />}
            {packing && <PackingTipsCard packing={packing} destination={destination} />}
          </div>
        ) : (
          <Card className="py-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gold-500" />
            <p className="text-sm text-text-secondary">{error || 'Données indisponibles pour le moment.'}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function WeatherForecastCard({ weather, destination }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Météo</span>
          <h3 className="mt-1 font-display text-[20px] font-medium tracking-[-0.01em] text-text-main">{destination.city}</h3>
        </div>
        <Sun className="h-6 w-6 text-gold-500" />
      </div>

      {/* Current Weather */}
      <div className="mt-4 rounded-[12px] bg-sand-50 p-4">
        <p className="mb-2 text-[12.5px] text-text-muted">Conditions actuelles</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={weather.current.icon} alt={weather.current.condition} className="h-16 w-16" />
            <div>
              <p className="font-mono text-3xl font-semibold text-text-main">{Math.round(weather.current.temp_c)}°C</p>
              <p className="text-sm text-text-secondary">{weather.current.condition}</p>
            </div>
          </div>
          <div className="text-right text-sm text-text-secondary">
            <div className="flex items-center justify-end gap-1">
              <Droplet className="h-4 w-4" />
              <span className="font-mono">{weather.current.humidity}%</span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-1">
              <Wind className="h-4 w-4" />
              <span className="font-mono">{Math.round(weather.current.wind_kph)} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Prévisions 7 jours</p>
        <div className="space-y-1.5">
          {weather.forecast.map((day, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-[10px] px-2 py-2 transition-colors hover:bg-sand-50">
              <div className="flex flex-1 items-center gap-3">
                <span className="w-16 text-sm font-medium text-text-secondary">
                  {idx === 0 ? "Auj." : new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                </span>
                <img src={day.day.icon} alt={day.day.condition} className="h-8 w-8" />
                <span className="flex-1 truncate text-xs text-text-muted">{day.day.condition}</span>
              </div>
              <div className="flex items-center gap-3">
                {day.day.daily_chance_of_rain > 30 && (
                  <span className="flex items-center gap-1 font-mono text-xs text-[#7a5c1a]">
                    <Droplet className="h-3 w-3" />
                    {day.day.daily_chance_of_rain}%
                  </span>
                )}
                <span className="font-mono text-sm font-semibold text-text-main">
                  {Math.round(day.day.maxtemp_c)}° / {Math.round(day.day.mintemp_c)}°
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Packing Tips Card Component
function PackingTipsCard({ packing, destination }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Bagages</span>
          <h3 className="mt-1 font-display text-[20px] font-medium tracking-[-0.01em] text-text-main">Conseils valise</h3>
        </div>
        <Backpack className="h-6 w-6 text-ember-600" />
      </div>

      {/* Weather Summary */}
      {packing.weatherSummary && (
        <div className="mt-4 rounded-[12px] bg-sand-50 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Conditions prévues</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-text-muted">Température moy.</p>
              <p className="font-mono font-semibold text-text-main">{packing.weatherSummary.avgTemp}°C</p>
            </div>
            <div>
              <p className="text-text-muted">Plage</p>
              <p className="font-mono font-semibold text-text-main">{packing.weatherSummary.tempRange}</p>
            </div>
            {packing.weatherSummary.rainChance > 20 && (
              <div>
                <p className="text-text-muted">Risque de pluie</p>
                <p className="font-mono font-semibold text-[#7a5c1a]">{packing.weatherSummary.rainChance}%</p>
              </div>
            )}
            {packing.weatherSummary.maxUV > 5 && (
              <div>
                <p className="text-text-muted">UV max</p>
                <p className="font-mono font-semibold text-ember-700">{packing.weatherSummary.maxUV}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Packing Lists */}
      <div className="mt-4 space-y-4">
        {/* Essential Items */}
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-500">
            <Heart className="h-3.5 w-3.5" />
            Essentiels
          </h4>
          <div className="space-y-1.5 rounded-[10px] bg-sand-50 p-3">
            {packing.essentials.map((item, idx) => {
              const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
              if (!text) return null;
              return (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-clay-500" />
                  <span className="text-text-secondary">{text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clothing */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ember-700">Vêtements</h4>
          <div className="space-y-1.5 rounded-[10px] bg-sand-50 p-3">
            {packing.clothing.map((item, idx) => {
              const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
              if (!text) return null;
              return (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Circle className="h-4 w-4 flex-shrink-0 text-ember-300" />
                  <span className="text-text-secondary">{text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Items */}
        {packing.optional.length > 0 && (
          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Optionnel</h4>
            <div className="space-y-1.5 rounded-[10px] bg-sand-50 p-3">
              {packing.optional.map((item, idx) => {
                const text = typeof item === 'string' ? item : (item?.word || item?.value || item?.name || '');
                if (!text) return null;
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Plus className="h-4 w-4 flex-shrink-0 text-text-light" />
                    <span className="text-text-secondary">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
