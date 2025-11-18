// frontend/src/pages/Account.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import './Account.css';

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
      <div className="account-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>Mon Compte</h1>
          <p>Gérez vos informations et préférences de voyage</p>
        </div>

        {/* Tabs */}
        <div className="account-tabs">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profil
          </button>
          <button
            className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            ⚙️ Préférences
          </button>
          <button
            className={`tab-button ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            📅 Disponibilités
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="profile-section">
              <div className="profile-card">
                <img
                  src={user?.imageUrl || '/default-avatar.png'}
                  alt="Profile"
                  className="profile-avatar"
                />
                <div className="profile-info">
                  <h2>{user?.fullName || 'User'}</h2>
                  <p className="profile-email">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>

              <div className="info-box">
                <p>Pour modifier votre nom, email ou mot de passe, utilisez le bouton de profil en haut à droite.</p>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="preferences-section">
              <div className="form-section">
                <h3>Pourquoi aimez-vous voyager ?</h3>
                <div className="options-grid">
                  {TRAVEL_REASONS.map(reason => (
                    <button
                      key={reason}
                      className={`option-button ${formData.whyTravel === reason ? 'selected' : ''}`}
                      onClick={() => handleChange('whyTravel', reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Votre objectif principal en voyage</h3>
                <div className="options-grid">
                  {MAIN_GOALS.map(goal => (
                    <button
                      key={goal}
                      className={`option-button ${formData.mainGoal === goal ? 'selected' : ''}`}
                      onClick={() => handleChange('mainGoal', goal)}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Votre style de voyage</h3>
                <div className="options-grid">
                  {GLOBAL_STYLES.map(style => (
                    <button
                      key={style}
                      className={`option-button ${formData.globalStyle === style ? 'selected' : ''}`}
                      onClick={() => handleChange('globalStyle', style)}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Vos activités préférées (min. 3)</h3>
                <div className="activities-grid">
                  {ACTIVITIES.map(activity => (
                    <button
                      key={activity}
                      className={`activity-button ${formData.topActivities.includes(activity) ? 'selected' : ''}`}
                      onClick={() => toggleArrayItem('topActivities', activity)}
                    >
                      {activity}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Rythme idéal de voyage</h3>
                <div className="options-grid">
                  {IDEAL_RHYTHMS.map(rhythm => (
                    <button
                      key={rhythm.value}
                      className={`option-button ${formData.idealRhythm === rhythm.value ? 'selected' : ''}`}
                      onClick={() => handleChange('idealRhythm', rhythm.value)}
                    >
                      {rhythm.label}
                    </button>
                  ))}
                </div>
              </div>

              <button className="save-button" onClick={handleSave} disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder les préférences'}
              </button>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="availability-section">
              <div className="form-section">
                <h3>Fréquence de vos voyages</h3>
                <div className="options-grid">
                  {[
                    { value: 1, label: '1 fois par an' },
                    { value: 2, label: '2-3 fois par an' },
                    { value: 4, label: '4-6 fois par an' },
                    { value: 7, label: '7+ fois par an' },
                  ].map(option => (
                    <button
                      key={option.value}
                      className={`option-button ${formData.tripsPerYear === option.value ? 'selected' : ''}`}
                      onClick={() => handleChange('tripsPerYear', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Disponibilités de départ</h3>
                <div className="options-grid">
                  {[
                    { value: 'weekend', label: 'Plutôt weekend' },
                    { value: 'weekday', label: 'Plutôt semaine' },
                    { value: 'flexible', label: 'Flexible' }
                  ].map(option => (
                    <button
                      key={option.value}
                      className={`option-button ${formData.departureFlexibility === option.value ? 'selected' : ''}`}
                      onClick={() => handleChange('departureFlexibility', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Aéroports de départ préférés</h3>
                <div className="airports-grid">
                  {AIRPORTS.map(airport => (
                    <button
                      key={airport.code}
                      className={`airport-button ${formData.preferredAirports.includes(airport.code) ? 'selected' : ''}`}
                      onClick={() => toggleArrayItem('preferredAirports', airport.code)}
                    >
                      {airport.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>📊 Jours de congés</h3>
                <p className="helper-text">
                  Nous utilisons ces informations pour optimiser vos dates de voyage et maximiser vos économies
                </p>
                <div className="leave-days-grid">
                  <div className="input-group">
                    <label>Congés annuels (jours)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.annualLeaveDays || ''}
                      onChange={(e) => handleChange('annualLeaveDays', parseInt(e.target.value) || null)}
                      placeholder="25"
                    />
                    <span className="input-hint">Ex: RTT + congés payés</span>
                  </div>
                  <div className="input-group">
                    <label>Congés déjà pris cette année</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.takenLeaveDays || ''}
                      onChange={(e) => handleChange('takenLeaveDays', parseInt(e.target.value) || null)}
                      placeholder="10"
                    />
                    <span className="input-hint">Pour calculer vos jours restants</span>
                  </div>
                </div>
                {formData.annualLeaveDays && formData.takenLeaveDays !== null && (
                  <div className="leave-summary">
                    <p>
                      ✅ Il vous reste <strong>{formData.annualLeaveDays - formData.takenLeaveDays} jours</strong> de congés
                    </p>
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>Durée moyenne souhaitée</h3>
                <div className="options-grid">
                  {[
                    { value: 3, label: '3-4 jours (weekend)' },
                    { value: 7, label: '7 jours (semaine)' },
                    { value: 10, label: '10-14 jours' },
                    { value: 21, label: '21+ jours' },
                  ].map(option => (
                    <button
                      key={option.value}
                      className={`option-button ${formData.avgTripDuration === option.value ? 'selected' : ''}`}
                      onClick={() => handleChange('avgTripDuration', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>📅 Calendrier Google</h3>
                <div className="calendar-connect">
                  {calendarStatus?.connected ? (
                    <>
                      <div className="connected-badge">
                        ✅ Calendrier Google connecté
                      </div>
                      <p className="helper-text">
                        Nous analysons automatiquement vos disponibilités pour vous proposer les meilleures dates de voyage
                      </p>
                      <button
                        className="disconnect-button"
                        onClick={handleDisconnectCalendar}
                      >
                        Déconnecter
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="connect-button"
                        onClick={handleConnectCalendar}
                        disabled={connectingCalendar}
                      >
                        {connectingCalendar ? 'Connexion...' : '📅 Connecter Google Calendar'}
                      </button>
                      <p className="helper-text">
                        Connectez votre calendrier pour que nous trouvions automatiquement les meilleures périodes de voyage selon vos disponibilités
                      </p>
                    </>
                  )}
                </div>
              </div>

              <button className="save-button" onClick={handleSave} disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder les disponibilités'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Account;
