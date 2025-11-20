// frontend/src/pages/Account.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
  User, Settings, Calendar, CheckCircle, XCircle,
  LogOut, Save, Globe, Briefcase, Heart, MapPin,
  Clock, Plane, Shield, AlertCircle
} from 'lucide-react';

// Import constants from Onboarding
const TRAVEL_REASONS = [
  'Découvrir de nouvelles cultures',
  'Me détendre et me ressourcer',
  'Vivre des aventures',
  'Apprendre et enrichir mes connaissances',
  'Rencontrer de nouvelles personnes'
];

const MAIN_GOALS = [
  'Découverte et dépaysement',
  'Repos et ressourcement',
  'Aventure et sensations',
  'Culture et patrimoine',
  'Gastronomie et plaisirs',
  'Shopping et découvertes urbaines',
  'Nature et grands espaces'
];

const GLOBAL_STYLES = [
  'Routard / Backpacker',
  'Voyage organisé / Tout compris',
  'Nomade digital / Longue durée',
  'Luxe et confort',
  'Éco-responsable',
  'Hors des sentiers battus'
];

const ACTIVITIES = [
  'Randonnée', 'Plage', 'Musées', 'Gastronomie', 'Vie nocturne',
  'Shopping', 'Sports nautiques', 'Ski', 'Yoga/Wellness', 'Photographie',
  'Architecture', 'Festivals', 'Wildlife', 'Plongée', 'Vélo',
  'Escalade', 'Surf', 'Food tours', 'Marchés locaux', 'Concerts'
];

const IDEAL_RHYTHMS = [
  { value: 'intense', label: 'Intense (beaucoup d\'activités)' },
  { value: 'balanced', label: 'Équilibré' },
  { value: 'relaxed', label: 'Relaxé (temps libre)' },
  { value: 'spontaneous', label: 'Spontané (improviser)' }
];

const AIRPORTS = [
  { code: 'CDG', name: 'Paris' },
  { code: 'LYS', name: 'Lyon' },
  { code: 'MRS', name: 'Marseille' },
  { code: 'NCE', name: 'Nice' },
  { code: 'TLS', name: 'Toulouse' },
  { code: 'NTE', name: 'Nantes' },
  { code: 'BOD', name: 'Bordeaux' },
  { code: 'LIL', name: 'Lille' }
];

function Account() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, preferences, availability
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState(null);

  const [formData, setFormData] = useState({
    // Style & Objectif
    whyTravel: '',
    mainGoal: '',
    globalStyle: '',
    topActivities: [],
    idealRhythm: '',

    // Comfort & Transport
    accommodationPref: '',
    stayOrMove: '',
    transportModes: [],
    maxTransportHours: null,

    // Budget & Practical
    budget: null,
    avoidCountries: [],

    // Availability & Leave Days
    tripsPerYear: null,
    departureFlexibility: '',
    annualLeaveDays: null,
    takenLeaveDays: null,
    avgTripDuration: null,
    calendarConnected: false,
    calendarType: '',
    preferredAirports: []
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
      checkCalendarStatus();
      handleOAuthCallback();
    }
  }, [user]);

  // Check calendar connection status
  const checkCalendarStatus = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/calendar/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  // Handle OAuth callback from Google
  const handleOAuthCallback = () => {
    const params = new URLSearchParams(window.location.search);
    const calendarSuccess = params.get('calendar_success');
    const calendarError = params.get('calendar_error');

    if (calendarSuccess === 'true') {
      alert('✅ Calendrier Google connecté avec succès!');
      fetchPreferences();
      checkCalendarStatus();
      // Clean URL
      window.history.replaceState({}, '', '/account');
    }

    if (calendarError) {
      alert(`❌ Erreur lors de la connexion: ${calendarError}`);
      // Clean URL
      window.history.replaceState({}, '', '/account');
    }
  };

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/users/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setFormData({
            whyTravel: data.preferences.whyTravel || '',
            mainGoal: data.preferences.mainGoal || '',
            globalStyle: data.preferences.globalStyle || '',
            topActivities: data.preferences.topActivities || [],
            idealRhythm: data.preferences.idealRhythm || '',
            accommodationPref: data.preferences.accommodationPref || '',
            stayOrMove: data.preferences.stayOrMove || '',
            transportModes: data.preferences.transportModes || [],
            maxTransportHours: data.preferences.maxTransportHours || null,
            budget: data.preferences.budget || null,
            avoidCountries: data.preferences.avoidCountries || [],
            tripsPerYear: data.preferences.tripsPerYear || null,
            departureFlexibility: data.preferences.departureFlexibility || '',
            annualLeaveDays: data.preferences.annualLeaveDays || null,
            takenLeaveDays: data.preferences.takenLeaveDays || null,
            avgTripDuration: data.preferences.avgTripDuration || null,
            calendarConnected: data.preferences.calendarConnected || false,
            calendarType: data.preferences.calendarType || '',
            preferredAirports: data.preferences.preferredAirports || []
          });
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/users/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      alert('Préférences sauvegardées avec succès!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Connect Google Calendar
  const handleConnectCalendar = async () => {
    try {
      setConnectingCalendar(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/calendar/oauth/authorize`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      alert('Erreur lors de la connexion au calendrier');
      setConnectingCalendar(false);
    }
  };

  // Disconnect calendar
  const handleDisconnectCalendar = async () => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter votre calendrier Google ?')) {
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/calendar/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('✅ Calendrier déconnecté avec succès');
        fetchPreferences();
        checkCalendarStatus();
      } else {
        throw new Error('Failed to disconnect calendar');
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      alert('Erreur lors de la déconnexion');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-text-main mb-2">Loading your account...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-text-main mb-2">Mon Compte</h1>
          <p className="text-text-secondary">Gérez vos informations et préférences de voyage</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'profile'
                ? 'text-primary bg-white'
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-main'
              }`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            Profil
            {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
          </button>
          <button
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'preferences'
                ? 'text-primary bg-white'
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-main'
              }`}
            onClick={() => setActiveTab('preferences')}
          >
            <Settings size={18} />
            Préférences
            {activeTab === 'preferences' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
          </button>
          <button
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'availability'
                ? 'text-primary bg-white'
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-main'
              }`}
            onClick={() => setActiveTab('availability')}
          >
            <Calendar size={18} />
            Disponibilités
            {activeTab === 'availability' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                <div className="relative">
                  <img
                    src={user?.imageUrl || '/default-avatar.png'}
                    alt="Profile"
                    className="w-24 h-24 rounded-full border-4 border-white shadow-sm object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold text-text-main mb-1">{user?.fullName || 'User'}</h2>
                  <p className="text-text-secondary flex items-center justify-center md:justify-start gap-2">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <p className="text-sm leading-relaxed">
                  Pour modifier votre nom, email ou mot de passe, veuillez utiliser le bouton de profil en haut à droite de l'application.
                </p>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="max-w-3xl mx-auto space-y-10">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Heart size={20} className="text-primary" />
                  Pourquoi aimez-vous voyager ?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TRAVEL_REASONS.map(reason => (
                    <button
                      key={reason}
                      className={`p-4 rounded-xl border text-left transition-all ${formData.whyTravel === reason
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('whyTravel', reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Globe size={20} className="text-primary" />
                  Votre objectif principal en voyage
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MAIN_GOALS.map(goal => (
                    <button
                      key={goal}
                      className={`p-4 rounded-xl border text-left transition-all ${formData.mainGoal === goal
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('mainGoal', goal)}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Briefcase size={20} className="text-primary" />
                  Votre style de voyage
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GLOBAL_STYLES.map(style => (
                    <button
                      key={style}
                      className={`p-4 rounded-xl border text-left transition-all ${formData.globalStyle === style
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('globalStyle', style)}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Vos activités préférées (min. 3)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {ACTIVITIES.map(activity => (
                    <button
                      key={activity}
                      className={`p-3 rounded-xl border text-center text-sm transition-all ${formData.topActivities.includes(activity)
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => toggleArrayItem('topActivities', activity)}
                    >
                      {activity}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Clock size={20} className="text-primary" />
                  Rythme idéal de voyage
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {IDEAL_RHYTHMS.map(rhythm => (
                    <button
                      key={rhythm.value}
                      className={`p-4 rounded-xl border text-left transition-all ${formData.idealRhythm === rhythm.value
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('idealRhythm', rhythm.value)}
                    >
                      {rhythm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button
                  className="w-full py-4 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Sauvegarder les préférences
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="max-w-3xl mx-auto space-y-10">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Plane size={20} className="text-primary" />
                  Fréquence de vos voyages
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 1, label: '1 fois / an' },
                    { value: 2, label: '2-3 fois / an' },
                    { value: 4, label: '4-6 fois / an' },
                    { value: 7, label: '7+ fois / an' },
                  ].map(option => (
                    <button
                      key={option.value}
                      className={`p-3 rounded-xl border text-center text-sm transition-all ${formData.tripsPerYear === option.value
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('tripsPerYear', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  Disponibilités de départ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'weekend', label: 'Plutôt weekend' },
                    { value: 'weekday', label: 'Plutôt semaine' },
                    { value: 'flexible', label: 'Flexible' }
                  ].map(option => (
                    <button
                      key={option.value}
                      className={`p-3 rounded-xl border text-center text-sm transition-all ${formData.departureFlexibility === option.value
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('departureFlexibility', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Plane size={20} className="text-primary" />
                  Aéroports de départ préférés
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {AIRPORTS.map(airport => (
                    <button
                      key={airport.code}
                      className={`p-3 rounded-xl border text-center text-sm transition-all ${formData.preferredAirports.includes(airport.code)
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => toggleArrayItem('preferredAirports', airport.code)}
                    >
                      {airport.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Briefcase size={20} className="text-primary" />
                  Jours de congés
                </h3>
                <p className="text-sm text-text-secondary">
                  Nous utilisons ces informations pour optimiser vos dates de voyage et maximiser vos économies
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-main">Congés annuels (jours)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      value={formData.annualLeaveDays || ''}
                      onChange={(e) => handleChange('annualLeaveDays', parseInt(e.target.value) || null)}
                      placeholder="25"
                    />
                    <span className="text-xs text-text-secondary">Ex: RTT + congés payés</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-main">Congés déjà pris cette année</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      value={formData.takenLeaveDays || ''}
                      onChange={(e) => handleChange('takenLeaveDays', parseInt(e.target.value) || null)}
                      placeholder="10"
                    />
                    <span className="text-xs text-text-secondary">Pour calculer vos jours restants</span>
                  </div>
                </div>
                {formData.annualLeaveDays && formData.takenLeaveDays !== null && (
                  <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex items-center gap-3">
                    <CheckCircle size={20} />
                    <p>
                      Il vous reste <strong>{formData.annualLeaveDays - formData.takenLeaveDays} jours</strong> de congés
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Clock size={20} className="text-primary" />
                  Durée moyenne souhaitée
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: 3, label: '3-4 jours (weekend)' },
                    { value: 7, label: '7 jours (semaine)' },
                    { value: 10, label: '10-14 jours' },
                    { value: 21, label: '21+ jours' },
                  ].map(option => (
                    <button
                      key={option.value}
                      className={`p-4 rounded-xl border text-left transition-all ${formData.avgTripDuration === option.value
                          ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('avgTripDuration', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  Calendrier Google
                </h3>
                <div className="p-8 bg-gray-50 rounded-2xl border border-gray-200 border-dashed text-center">
                  {calendarStatus?.connected ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
                        <CheckCircle size={16} />
                        Calendrier Google connecté
                      </div>
                      <p className="text-text-secondary max-w-md mx-auto">
                        Nous analysons automatiquement vos disponibilités pour vous proposer les meilleures dates de voyage
                      </p>
                      <button
                        className="px-6 py-2 text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                        onClick={handleDisconnectCalendar}
                      >
                        <LogOut size={16} />
                        Déconnecter
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <button
                        className="px-6 py-3 bg-white border border-gray-300 text-text-main font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-3 shadow-sm"
                        onClick={handleConnectCalendar}
                        disabled={connectingCalendar}
                      >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        {connectingCalendar ? 'Connexion...' : 'Connecter Google Calendar'}
                      </button>
                      <p className="text-sm text-text-secondary max-w-md mx-auto">
                        Connectez votre calendrier pour que nous trouvions automatiquement les meilleures périodes de voyage selon vos disponibilités
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button
                  className="w-full py-4 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Sauvegarder les disponibilités
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Account;
