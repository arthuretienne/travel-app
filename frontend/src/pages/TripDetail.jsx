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
} from 'lucide-react';
import { PersonalizedItineraryCard, LocalEventsCard } from '../components/TripEnhancementComponents';
import StickyBookingProgress, { BookingChecklistCard } from '../components/StickyBookingProgress';
import TripChat from '../components/TripChat';
import FriendsManager from '../components/FriendsManager';
import { generateAllBookingLinks, getIataCode } from '../utils/bookingLinks';

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
  const [showFriendsManager, setShowFriendsManager] = useState(false);
  const [inviteEmails, setInviteEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

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
      {/* Sticky Booking Progress (only when confirmed) */}
      {isConfirmed && trip.finalDestination && (
        <StickyBookingProgress
          city={trip.finalDestination.city}
          country={trip.finalDestination.country}
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
              <span className="text-sm font-medium">Back to Trips</span>
            </button>
          )}

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

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Aperçu', icon: LayoutDashboard },
              { id: 'participants', label: 'Participants', icon: Users, badge: trip.members?.length || 0 },
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'checklist', label: 'Checklist', icon: ListChecks },
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
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
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
                          {member.user?.email || 'Email not available'}
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
                      <span className="text-xs font-medium px-3 py-1 bg-gray-200 text-gray-600 rounded-full capitalize">
                        {member.role}
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

        {/* ============ CHECKLIST TAB ============ */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            {isConfirmed ? (
              <>
                {/* Group Booking Status */}
                <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-text-main">Suivi des réservations</h2>
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
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${member.hasBookedFlight ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                            <Plane size={14} />
                            {member.hasBookedFlight ? 'Vol réservé' : 'Vol en attente'}
                          </div>
                          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${member.hasBookedHotel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
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
          <div className="space-y-6">
            {/* Trip Settings */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-text-main mb-6">Paramètres du voyage</h2>

              <div className="space-y-4">
                {/* Trip Name */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-sm font-medium text-text-secondary">Nom du voyage</label>
                  <p className="text-lg font-semibold text-text-main mt-1">{trip.name}</p>
                </div>

                {/* Max Members */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-sm font-medium text-text-secondary">Nombre max de participants</label>
                  <p className="text-lg font-semibold text-text-main mt-1">{trip.maxMembers || 8} personnes</p>
                </div>

                {/* Vote Deadline */}
                {trip.voteDeadline && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-sm font-medium text-text-secondary">Date limite de vote</label>
                    <p className="text-lg font-semibold text-text-main mt-1">
                      {new Date(trip.voteDeadline).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {/* Require All Votes */}
                <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Tous les votes requis</label>
                    <p className="text-sm text-text-secondary mt-1">
                      {trip.requireAllVotes
                        ? 'Tous les membres doivent voter avant de finaliser'
                        : 'Le vote peut être finalisé à tout moment'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${trip.requireAllVotes ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {trip.requireAllVotes ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            {userRole === 'creator' && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
                <h3 className="text-lg font-bold text-red-900 mb-4">Zone de danger</h3>
                <p className="text-sm text-red-700 mb-4">
                  Ces actions sont irréversibles. Procédez avec précaution.
                </p>
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
function VotingSection({ trip, fetchTripDetails, user, isCreator }) {
  const { getToken } = useAuth();
  const [voting, setVoting] = useState(false);
  const [votingProgress, setVotingProgress] = useState(null);

  // Listen for real-time voting updates via socket
  useEffect(() => {
    const handleTripUpdate = (event) => {
      const { type, data } = event.detail || {};
      if (type === 'vote_submitted') {
        setVotingProgress(data);
      }
      if (type === 'voting_complete' || type === 'destination_finalized') {
        // Refresh to show BookingChecklistSection
        fetchTripDetails();
      }
    };

    window.addEventListener('trip-update', handleTripUpdate);
    return () => window.removeEventListener('trip-update', handleTripUpdate);
  }, [fetchTripDetails]);

  // Calculate winning destination based on current votes
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

  // Finalize voting (creator only)
  const handleFinalizeVote = async () => {
    const destinationId = getWinningDestinationId();
    if (!destinationId) return;

    try {
      setVoting(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/trips/${trip.id}/finalize-vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destinationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize vote');
      }

      await fetchTripDetails();
    } catch (err) {
      console.error('Error finalizing vote:', err);
      alert(err.message || 'Failed to finalize vote.');
    } finally {
      setVoting(false);
    }
  };

  const handleVote = async (destinationId) => {
    try {
      setVoting(true);
      const token = await getToken();

      // Backend expects: { votes: [{ destinationId, rank }] }
      const response = await fetch(`${API_URL}/api/trips/${trip.id}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          votes: [{ destinationId, rank: 1 }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to vote');
      }

      await fetchTripDetails();
    } catch (err) {
      console.error('Error voting:', err);
      alert(err.message || 'Failed to vote. Please try again.');
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
                  {proposed.city || proposed.tripData?.destination?.city}, {proposed.country || proposed.tripData?.destination?.country}
                </h3>
                <p className="text-sm text-text-secondary">
                  Proposed by {proposed.proposer?.firstName || proposed.proposedBy?.firstName || 'Unknown'}
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

            {/* Match Reason - Why this destination fits */}
            {(proposed.tripData?.matchReason || proposed.tripData?.destination?.matchReason) && (
              <div className="mb-3 p-3 bg-primary-light/30 border border-primary/20 rounded-lg">
                <p className="text-sm text-text-main flex items-start gap-2">
                  <Sparkles size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <span>{proposed.tripData?.matchReason || proposed.tripData?.destination?.matchReason}</span>
                </p>
                {(proposed.tripData?.seasonReason || proposed.tripData?.destination?.seasonReason) && (
                  <p className="text-xs text-text-secondary mt-1 ml-6">
                    {proposed.tripData?.seasonReason || proposed.tripData?.destination?.seasonReason}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-text-secondary">
              {(proposed.startDate || proposed.tripData?.slot?.startDate) && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>
                    {new Date(proposed.startDate || proposed.tripData.slot.startDate).toLocaleDateString('fr-FR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {(proposed.estimatedCostPerPerson || proposed.tripData?.pricing?.total) && (
                <div className="flex items-center gap-2">
                  <span>€{Math.round(proposed.estimatedCostPerPerson || proposed.tripData.pricing.total)}/pers</span>
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

      {/* Finalize Vote Button - Creator Only */}
      {isCreator && trip.proposedTrips?.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Prêt à décider ?</h4>
              <p className="text-sm text-amber-700">
                En tant que créateur, tu peux finaliser le vote et sélectionner la destination gagnante.
              </p>
              {votingProgress && (
                <p className="text-xs text-amber-600 mt-1">
                  {votingProgress.votedMembers}/{votingProgress.totalVoters} ont voté ({votingProgress.votingProgress}%)
                </p>
              )}
            </div>
            <button
              onClick={handleFinalizeVote}
              disabled={voting || !trip.proposedTrips?.some(p => p.votes?.length > 0)}
              className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {voting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Finaliser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Booking Checklist Section - When destination is confirmed
function BookingChecklistSection({ trip, fetchTripDetails, getToken }) {
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  // Get trip data from finalDestination
  const tripData = trip.finalDestination || {};
  const city = tripData.city || 'Unknown';
  const country = tripData.country || 'Unknown';

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
                      <Hotel size={12} /> Hotel
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
  const destination = trip.finalDestination;

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
            <h3 className="text-sm font-bold text-purple-700 mb-2">Clothing</h3>
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
              <h3 className="text-sm font-bold text-gray-600 mb-2">Optional (Nice to Have)</h3>
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
