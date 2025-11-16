// frontend/src/pages/Onboarding.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import './Onboarding.css';

// Constants
const TRAVEL_REASONS = [
  'Découvrir de nouvelles cultures',
  'Me détendre et me ressourcer',
  'Vivre des aventures',
  'Apprendre et enrichir mes connaissances',
  'Rencontrer des gens',
  'Pratiquer mes passions',
];

const MAIN_GOALS = [
  'Repos et relaxation',
  'Aventure et adrénaline',
  'Culture et histoire',
  'Gastronomie',
  'Nature et paysages',
  'Vie nocturne et fête',
];

const GLOBAL_STYLES = [
  { value: 'backpacker', label: 'Backpacker / Baroudeur' },
  { value: 'balanced', label: 'Équilibré' },
  { value: 'comfort', label: 'Confort et détente' },
  { value: 'luxury', label: 'Luxe et exclusivité' },
];

const ACTIVITIES = [
  'Histoire et patrimoine',
  'Musées et galeries',
  'Gastronomie locale',
  'Sports et aventure',
  'Plage et mer',
  'Randonnée et nature',
  'Vie nocturne',
  'Shopping',
  'Spa et bien-être',
  'Échanges culturels',
  'Photographie',
  'Sports nautiques',
];

const RHYTHM_OPTIONS = [
  { value: 'slow', label: 'Tranquille - Je prends mon temps' },
  { value: 'balanced', label: 'Équilibré - Mix activités/repos' },
  { value: 'intense', label: 'Intense - Je veux tout voir !' },
];

const ACCOMMODATION_OPTIONS = [
  { value: 'hotel', label: 'Hôtel' },
  { value: 'hostel', label: 'Auberge de jeunesse' },
  { value: 'airbnb', label: 'Airbnb/Location' },
  { value: 'guesthouse', label: 'Maison d\'hôtes' },
  { value: 'camping', label: 'Camping' },
  { value: 'mix', label: 'Je mixe selon les destinations' },
];

const STAY_OPTIONS = [
  { value: 'same_place', label: 'Même endroit - Je pose mes valises' },
  { value: 'itinerant', label: 'Itinérant - Je change régulièrement' },
  { value: 'roadtrip', label: 'Road trip - En mouvement constant' },
];

const TRANSPORT_MODES = [
  'Avion',
  'Train',
  'Bus',
  'Voiture',
  'Vélo',
  'Moto',
  'Bateau',
  'Auto-stop',
];

const TRANSPORT_COMFORT = [
  { value: 'basic', label: 'Basique - Le moins cher' },
  { value: 'standard', label: 'Standard - Bon rapport qualité/prix' },
  { value: 'comfort', label: 'Confortable - Je privilégie le confort' },
  { value: 'premium', label: 'Premium - Business class, etc.' },
];

const VISA_PREFERENCES = [
  { value: 'no_visa', label: 'Sans visa uniquement' },
  { value: 'easy_visa', label: 'Visa facile acceptable (e-visa)' },
  { value: 'all', label: 'Peu importe, je peux faire un visa' },
];

const MOBILITY_OPTIONS = [
  { value: 'none', label: 'Aucune contrainte' },
  { value: 'reduced', label: 'Mobilité réduite (PMR)' },
  { value: 'wheelchair', label: 'Fauteuil roulant' },
  { value: 'other', label: 'Autre (à préciser)' },
];

const DEPARTURE_FLEXIBILITY = [
  { value: 'weekend_only', label: 'Weekend uniquement' },
  { value: 'weekday', label: 'En semaine possible' },
  { value: 'flexible', label: 'Totalement flexible' },
];

const AIRPORTS = [
  { name: 'Paris', code: 'PAR' },
  { name: 'Lyon', code: 'LYS' },
  { name: 'Marseille', code: 'MRS' },
  { name: 'Nice', code: 'NCE' },
  { name: 'Toulouse', code: 'TLS' },
  { name: 'Bordeaux', code: 'BOD' },
  { name: 'Nantes', code: 'NTE' },
  { name: 'Strasbourg', code: 'SXB' },
];

const CLIMATE_SENSITIVITY = [
  { value: 'none', label: 'Peu importe' },
  { value: 'no_cold', label: 'J\'évite le froid' },
  { value: 'no_heat', label: 'J\'évite la chaleur excessive' },
  { value: 'temperate', label: 'Je préfère les climats tempérés' },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Choose onboarding type first
  const [onboardingType, setOnboardingType] = useState(null); // 'short' or 'long'
  const [currentPart, setCurrentPart] = useState(0); // For long onboarding

  const [formData, setFormData] = useState({
    // Metadata
    onboardingType: '',

    // Part 1: Style & Objectif
    whyTravel: '',
    mainGoal: '',
    globalStyle: '',
    riskTolerance: 50,
    originalityAppetite: 50,
    introvertExtrovert: 50,
    plannerImprovisator: 'balanced',
    modernComfortAuth: 50,

    // Part 2: Activities
    topActivities: [],

    // Part 3: Rhythm & Comfort
    idealRhythm: '',
    accommodationPref: '',
    comfortAuthSlider: 50,
    stayOrMove: '',
    transportModes: [],
    transportComfort: '',
    maxTransportHours: 6,
    materialComfort: 50,

    // Part 4: Constraints
    visaPreference: '',
    avoidCountries: [],
    mobilityNeeds: 'none',
    mobilityDetails: '',
    securityImportance: 50,
    crowdTolerance: 50,
    ecoSensitivity: 50,
    culturalAdaptability: 50,
    climateSensitivity: 'none',

    // Part 5: Availability & Patterns
    tripsPerYear: 2,
    departureFlexibility: '',
    calendarConnected: false,
    annualLeaveDays: 25,
    takenLeaveDays: 0,
    avgTripDuration: 7,
    preferredAirports: [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [countryInput, setCountryInput] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleAddCountry = () => {
    if (countryInput.trim() && !formData.avoidCountries.includes(countryInput.trim())) {
      setFormData(prev => ({
        ...prev,
        avoidCountries: [...prev.avoidCountries, countryInput.trim()]
      }));
      setCountryInput('');
    }
  };

  const removeCountry = (country) => {
    setFormData(prev => ({
      ...prev,
      avoidCountries: prev.avoidCountries.filter(c => c !== country)
    }));
  };

  const validateCurrentPart = () => {
    const newErrors = {};

    if (onboardingType === 'short') {
      // Short onboarding - only validate essential fields
      if (!formData.whyTravel) newErrors.whyTravel = 'Requis';
      if (!formData.mainGoal) newErrors.mainGoal = 'Requis';
      if (!formData.globalStyle) newErrors.globalStyle = 'Requis';
      if (formData.topActivities.length < 3) newErrors.topActivities = 'Sélectionnez au moins 3 activités';
      if (!formData.idealRhythm) newErrors.idealRhythm = 'Requis';
      // Removed: tripsPerYear, departureFlexibility, calendarConnected, preferredAirports - not required for short onboarding
    } else {
      // Long onboarding - validate by part
      if (currentPart === 0) {
        if (!formData.whyTravel) newErrors.whyTravel = 'Requis';
        if (!formData.mainGoal) newErrors.mainGoal = 'Requis';
        if (!formData.globalStyle) newErrors.globalStyle = 'Requis';
      } else if (currentPart === 1) {
        if (formData.topActivities.length < 3) newErrors.topActivities = 'Sélectionnez au moins 3 activités';
      } else if (currentPart === 2) {
        if (!formData.idealRhythm) newErrors.idealRhythm = 'Requis';
        if (!formData.accommodationPref) newErrors.accommodationPref = 'Requis';
        if (!formData.stayOrMove) newErrors.stayOrMove = 'Requis';
        if (formData.transportModes.length === 0) newErrors.transportModes = 'Sélectionnez au moins un mode';
      } else if (currentPart === 3) {
        if (!formData.visaPreference) newErrors.visaPreference = 'Requis';
      } else if (currentPart === 4) {
        if (formData.preferredAirports.length === 0) newErrors.preferredAirports = 'Sélectionnez au moins un aéroport';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentPart()) {
      if (onboardingType === 'short') {
        handleSubmit();
      } else {
        setCurrentPart(prev => Math.min(prev + 1, 4));
      }
    }
  };

  const handlePrevious = () => {
    setCurrentPart(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateCurrentPart()) return;

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // Get Clerk session token
      const token = await getToken();

      // First, sync user with backend (if not already synced)
      if (user) {
        try {
          await fetch(`${API_URL}/api/users/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'user.created',
              data: {
                id: user.id,
                email_addresses: user.emailAddresses,
                first_name: user.firstName,
                last_name: user.lastName,
                image_url: user.imageUrl,
              },
            }),
          });
        } catch (syncError) {
          console.log('User may already exist:', syncError);
        }
      }

      // Save preferences with authentication token
      const response = await fetch(`${API_URL}/api/users/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          onboardingCompleted: true,
          onboardingType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save preferences');
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Onboarding type selection screen
  if (!onboardingType) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-type-selection">
          <h1>Bienvenue sur Travel AI !</h1>
          <p className="subtitle">
            Pour vous proposer les meilleures recommandations de voyage, nous avons besoin d'en savoir plus sur vos préférences.
          </p>

          <div className="type-cards">
            <div className="type-card" onClick={() => {
              setOnboardingType('short');
              setFormData(prev => ({ ...prev, onboardingType: 'short' }));
            }}>
              <div className="type-icon">⚡</div>
              <h3>Onboarding Rapide</h3>
              <p className="type-duration">~9 questions • 3-5 minutes</p>
              <p className="type-description">
                Les questions essentielles pour commencer. Vous pourrez compléter votre profil plus tard.
              </p>
              <button className="type-button primary">Commencer rapidement</button>
            </div>

            <div className="type-card recommended" onClick={() => {
              setOnboardingType('long');
              setFormData(prev => ({ ...prev, onboardingType: 'long' }));
            }}>
              <div className="recommended-badge">Recommandé</div>
              <div className="type-icon">🎯</div>
              <h3>Onboarding Complet</h3>
              <p className="type-duration">~30 questions • 10-15 minutes</p>
              <p className="type-description">
                Des recommandations ultra-personnalisées basées sur un profil détaillé de vos préférences.
              </p>
              <button className="type-button primary">Obtenir les meilleurs résultats</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Short onboarding - one page
  if (onboardingType === 'short') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-content short">
          <div className="onboarding-header">
            <h1>Parlez-nous de vous</h1>
            <p>9 questions rapides pour des recommandations personnalisées</p>
          </div>

          <div className="form-section">
            <h3>1. Pourquoi aimez-vous voyager ?</h3>
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
            {errors.whyTravel && <span className="error">{errors.whyTravel}</span>}
          </div>

          <div className="form-section">
            <h3>2. Votre but principal en voyage ?</h3>
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
            {errors.mainGoal && <span className="error">{errors.mainGoal}</span>}
          </div>

          <div className="form-section">
            <h3>3. Votre style de voyage ?</h3>
            <div className="options-grid">
              {GLOBAL_STYLES.map(style => (
                <button
                  key={style.value}
                  className={`option-button ${formData.globalStyle === style.value ? 'selected' : ''}`}
                  onClick={() => handleChange('globalStyle', style.value)}
                >
                  {style.label}
                </button>
              ))}
            </div>
            {errors.globalStyle && <span className="error">{errors.globalStyle}</span>}
          </div>

          <div className="form-section">
            <h3>4. Sélectionnez vos 3-5 activités favorites</h3>
            <div className="activities-grid">
              {ACTIVITIES.map(activity => (
                <button
                  key={activity}
                  className={`activity-button ${formData.topActivities.includes(activity) ? 'selected' : ''}`}
                  onClick={() => toggleArrayItem('topActivities', activity)}
                  disabled={!formData.topActivities.includes(activity) && formData.topActivities.length >= 5}
                >
                  {activity}
                </button>
              ))}
            </div>
            <p className="helper-text">{formData.topActivities.length}/5 sélectionnées (minimum 3)</p>
            {errors.topActivities && <span className="error">{errors.topActivities}</span>}
          </div>

          <div className="form-section">
            <h3>5. Rythme idéal de voyage ?</h3>
            <div className="options-grid">
              {RHYTHM_OPTIONS.map(rhythm => (
                <button
                  key={rhythm.value}
                  className={`option-button ${formData.idealRhythm === rhythm.value ? 'selected' : ''}`}
                  onClick={() => handleChange('idealRhythm', rhythm.value)}
                >
                  {rhythm.label}
                </button>
              ))}
            </div>
            {errors.idealRhythm && <span className="error">{errors.idealRhythm}</span>}
          </div>

          <div className="form-section">
            <h3>6. Combien de fois voyagez-vous par an ?</h3>
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
            {errors.tripsPerYear && <span className="error">{errors.tripsPerYear}</span>}
          </div>

          <div className="form-section">
            <h3>7. Vos disponibilités de départ</h3>
            <div className="options-grid">
              {DEPARTURE_FLEXIBILITY.map(option => (
                <button
                  key={option.value}
                  className={`option-button ${formData.departureFlexibility === option.value ? 'selected' : ''}`}
                  onClick={() => handleChange('departureFlexibility', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.departureFlexibility && <span className="error">{errors.departureFlexibility}</span>}
          </div>

          <div className="form-section">
            <h3>8. Connecter votre calendrier (Google, Outlook) ?</h3>
            <p className="helper-text">Cela nous permettra de vous suggérer les meilleurs moments pour voyager</p>
            <div className="options-grid">
              <button
                className={`option-button ${formData.calendarConnected === true ? 'selected' : ''}`}
                onClick={() => {
                  handleChange('calendarConnected', true);
                  if (formData.calendarType === '') {
                    handleChange('calendarType', 'google');
                  }
                }}
              >
                Oui, connecter mon calendrier
              </button>
              <button
                className={`option-button ${formData.calendarConnected === false ? 'selected' : ''}`}
                onClick={() => {
                  handleChange('calendarConnected', false);
                  handleChange('calendarType', 'manual');
                }}
              >
                Non, saisie manuelle
              </button>
            </div>

            {formData.calendarConnected && (
              <div className="sub-section">
                <label>Type de calendrier</label>
                <div className="options-grid">
                  <button
                    className={`option-button ${formData.calendarType === 'google' ? 'selected' : ''}`}
                    onClick={() => handleChange('calendarType', 'google')}
                  >
                    Google Calendar
                  </button>
                  <button
                    className={`option-button ${formData.calendarType === 'outlook' ? 'selected' : ''}`}
                    onClick={() => handleChange('calendarType', 'outlook')}
                  >
                    Outlook Calendar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>9. Vos aéroports/villes de départ</h3>
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
            {errors.preferredAirports && <span className="error">{errors.preferredAirports}</span>}
          </div>

          <div className="form-actions">
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Terminer'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Long onboarding - multi-part
  const renderPart0 = () => (
    <div className="form-content">
      <h2>Partie 1 : Style & Objectif du voyage</h2>

      <div className="form-section">
        <label>Pourquoi aimez-vous voyager ?</label>
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
        {errors.whyTravel && <span className="error">{errors.whyTravel}</span>}
      </div>

      <div className="form-section">
        <label>Votre but principal en voyage ?</label>
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
        {errors.mainGoal && <span className="error">{errors.mainGoal}</span>}
      </div>

      <div className="form-section">
        <label>Style global de voyage</label>
        <div className="options-grid">
          {GLOBAL_STYLES.map(style => (
            <button
              key={style.value}
              className={`option-button ${formData.globalStyle === style.value ? 'selected' : ''}`}
              onClick={() => handleChange('globalStyle', style.value)}
            >
              {style.label}
            </button>
          ))}
        </div>
        {errors.globalStyle && <span className="error">{errors.globalStyle}</span>}
      </div>

      <div className="form-section">
        <label>Tolérance au risque et à l'imprévu</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.riskTolerance}
          onChange={(e) => handleChange('riskTolerance', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Prudent</span>
          <span className="slider-value">{formData.riskTolerance}%</span>
          <span>Aventureux</span>
        </div>
      </div>

      <div className="form-section">
        <label>Appétence pour l'originalité</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.originalityAppetite}
          onChange={(e) => handleChange('originalityAppetite', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Classique</span>
          <span className="slider-value">{formData.originalityAppetite}%</span>
          <span>Original</span>
        </div>
      </div>

      <div className="form-section">
        <label>Introverti ou extraverti ?</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.introvertExtrovert}
          onChange={(e) => handleChange('introvertExtrovert', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Introverti</span>
          <span className="slider-value">{formData.introvertExtrovert}%</span>
          <span>Extraverti</span>
        </div>
      </div>

      <div className="form-section">
        <label>Vous préférez planifier ou improviser ?</label>
        <div className="options-grid">
          <button
            className={`option-button ${formData.plannerImprovisator === 'planner' ? 'selected' : ''}`}
            onClick={() => handleChange('plannerImprovisator', 'planner')}
          >
            Planifier à l'avance
          </button>
          <button
            className={`option-button ${formData.plannerImprovisator === 'balanced' ? 'selected' : ''}`}
            onClick={() => handleChange('plannerImprovisator', 'balanced')}
          >
            Un peu des deux
          </button>
          <button
            className={`option-button ${formData.plannerImprovisator === 'improvisator' ? 'selected' : ''}`}
            onClick={() => handleChange('plannerImprovisator', 'improvisator')}
          >
            Improviser sur place
          </button>
        </div>
      </div>

      <div className="form-section">
        <label>Confort moderne vs Expérience authentique</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.modernComfortAuth}
          onChange={(e) => handleChange('modernComfortAuth', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Confort moderne</span>
          <span className="slider-value">{formData.modernComfortAuth}%</span>
          <span>Authenticité locale</span>
        </div>
      </div>
    </div>
  );

  const renderPart1 = () => (
    <div className="form-content">
      <h2>Partie 2 : Activités préférées</h2>

      <div className="form-section">
        <label>Sélectionnez vos top 3-5 activités favorites</label>
        <p className="helper-text">Ces informations nous aideront à personnaliser vos recommandations</p>
        <div className="activities-grid">
          {ACTIVITIES.map(activity => (
            <button
              key={activity}
              className={`activity-button ${formData.topActivities.includes(activity) ? 'selected' : ''}`}
              onClick={() => toggleArrayItem('topActivities', activity)}
              disabled={!formData.topActivities.includes(activity) && formData.topActivities.length >= 5}
            >
              {activity}
            </button>
          ))}
        </div>
        <p className="helper-text">{formData.topActivities.length}/5 sélectionnées (minimum 3)</p>
        {errors.topActivities && <span className="error">{errors.topActivities}</span>}
      </div>
    </div>
  );

  const renderPart2 = () => (
    <div className="form-content">
      <h2>Partie 3 : Rythme et confort</h2>

      <div className="form-section">
        <label>Rythme idéal de voyage</label>
        <div className="options-grid">
          {RHYTHM_OPTIONS.map(rhythm => (
            <button
              key={rhythm.value}
              className={`option-button ${formData.idealRhythm === rhythm.value ? 'selected' : ''}`}
              onClick={() => handleChange('idealRhythm', rhythm.value)}
            >
              {rhythm.label}
            </button>
          ))}
        </div>
        {errors.idealRhythm && <span className="error">{errors.idealRhythm}</span>}
      </div>

      <div className="form-section">
        <label>Préférence d'hébergement</label>
        <div className="options-grid">
          {ACCOMMODATION_OPTIONS.map(acc => (
            <button
              key={acc.value}
              className={`option-button ${formData.accommodationPref === acc.value ? 'selected' : ''}`}
              onClick={() => handleChange('accommodationPref', acc.value)}
            >
              {acc.label}
            </button>
          ))}
        </div>
        {errors.accommodationPref && <span className="error">{errors.accommodationPref}</span>}
      </div>

      <div className="form-section">
        <label>Confort vs Authenticité</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.comfortAuthSlider}
          onChange={(e) => handleChange('comfortAuthSlider', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Confort</span>
          <span className="slider-value">{formData.comfortAuthSlider}%</span>
          <span>Authenticité</span>
        </div>
      </div>

      <div className="form-section">
        <label>Préférence de séjour</label>
        <div className="options-grid">
          {STAY_OPTIONS.map(stay => (
            <button
              key={stay.value}
              className={`option-button ${formData.stayOrMove === stay.value ? 'selected' : ''}`}
              onClick={() => handleChange('stayOrMove', stay.value)}
            >
              {stay.label}
            </button>
          ))}
        </div>
        {errors.stayOrMove && <span className="error">{errors.stayOrMove}</span>}
      </div>

      <div className="form-section">
        <label>Moyens de transport acceptés</label>
        <div className="transport-grid">
          {TRANSPORT_MODES.map(mode => (
            <button
              key={mode}
              className={`transport-button ${formData.transportModes.includes(mode) ? 'selected' : ''}`}
              onClick={() => toggleArrayItem('transportModes', mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        {errors.transportModes && <span className="error">{errors.transportModes}</span>}
      </div>

      <div className="form-section">
        <label>Confort de transport</label>
        <div className="options-grid">
          {TRANSPORT_COMFORT.map(comfort => (
            <button
              key={comfort.value}
              className={`option-button ${formData.transportComfort === comfort.value ? 'selected' : ''}`}
              onClick={() => handleChange('transportComfort', comfort.value)}
            >
              {comfort.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label>Durée maximale de transport acceptable (heures)</label>
        <input
          type="number"
          min="1"
          max="24"
          value={formData.maxTransportHours}
          onChange={(e) => handleChange('maxTransportHours', parseInt(e.target.value))}
          className="number-input"
        />
      </div>

      <div className="form-section">
        <label>Importance du confort matériel</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.materialComfort}
          onChange={(e) => handleChange('materialComfort', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Peu important</span>
          <span className="slider-value">{formData.materialComfort}%</span>
          <span>Très important</span>
        </div>
      </div>
    </div>
  );

  const renderPart3 = () => (
    <div className="form-content">
      <h2>Partie 4 : Contraintes pratiques</h2>

      <div className="form-section">
        <label>Préférence visa</label>
        <div className="options-grid">
          {VISA_PREFERENCES.map(visa => (
            <button
              key={visa.value}
              className={`option-button ${formData.visaPreference === visa.value ? 'selected' : ''}`}
              onClick={() => handleChange('visaPreference', visa.value)}
            >
              {visa.label}
            </button>
          ))}
        </div>
        {errors.visaPreference && <span className="error">{errors.visaPreference}</span>}
      </div>

      <div className="form-section">
        <label>Pays à éviter (optionnel)</label>
        <div className="country-input-group">
          <input
            type="text"
            value={countryInput}
            onChange={(e) => setCountryInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCountry()}
            placeholder="Entrez un pays..."
            className="text-input"
          />
          <button onClick={handleAddCountry} className="add-button">Ajouter</button>
        </div>
        {formData.avoidCountries.length > 0 && (
          <div className="tags">
            {formData.avoidCountries.map(country => (
              <span key={country} className="tag">
                {country}
                <button onClick={() => removeCountry(country)} className="tag-remove">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="form-section">
        <label>Besoins de mobilité</label>
        <div className="options-grid">
          {MOBILITY_OPTIONS.map(mobility => (
            <button
              key={mobility.value}
              className={`option-button ${formData.mobilityNeeds === mobility.value ? 'selected' : ''}`}
              onClick={() => handleChange('mobilityNeeds', mobility.value)}
            >
              {mobility.label}
            </button>
          ))}
        </div>
        {formData.mobilityNeeds === 'other' && (
          <input
            type="text"
            value={formData.mobilityDetails}
            onChange={(e) => handleChange('mobilityDetails', e.target.value)}
            placeholder="Précisez vos besoins..."
            className="text-input"
          />
        )}
      </div>

      <div className="form-section">
        <label>Importance de la sécurité</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.securityImportance}
          onChange={(e) => handleChange('securityImportance', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Peu important</span>
          <span className="slider-value">{formData.securityImportance}%</span>
          <span>Très important</span>
        </div>
      </div>

      <div className="form-section">
        <label>Tolérance aux foules</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.crowdTolerance}
          onChange={(e) => handleChange('crowdTolerance', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>J'évite les foules</span>
          <span className="slider-value">{formData.crowdTolerance}%</span>
          <span>Peu importe</span>
        </div>
      </div>

      <div className="form-section">
        <label>Sensibilité écologique</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.ecoSensitivity}
          onChange={(e) => handleChange('ecoSensitivity', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Peu important</span>
          <span className="slider-value">{formData.ecoSensitivity}%</span>
          <span>Très important</span>
        </div>
      </div>

      <div className="form-section">
        <label>Adaptabilité culturelle</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.culturalAdaptability}
          onChange={(e) => handleChange('culturalAdaptability', parseInt(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>Moins à l'aise</span>
          <span className="slider-value">{formData.culturalAdaptability}%</span>
          <span>Très à l'aise</span>
        </div>
      </div>

      <div className="form-section">
        <label>Sensibilité climatique</label>
        <div className="options-grid">
          {CLIMATE_SENSITIVITY.map(climate => (
            <button
              key={climate.value}
              className={`option-button ${formData.climateSensitivity === climate.value ? 'selected' : ''}`}
              onClick={() => handleChange('climateSensitivity', climate.value)}
            >
              {climate.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPart4 = () => (
    <div className="form-content">
      <h2>Partie 5 : Disponibilités et patterns de voyage</h2>

      <div className="form-section">
        <label>Fréquence moyenne de voyages par an</label>
        <input
          type="number"
          min="1"
          max="20"
          value={formData.tripsPerYear}
          onChange={(e) => handleChange('tripsPerYear', parseInt(e.target.value))}
          className="number-input"
        />
      </div>

      <div className="form-section">
        <label>Flexibilité de départ</label>
        <div className="options-grid">
          {DEPARTURE_FLEXIBILITY.map(flex => (
            <button
              key={flex.value}
              className={`option-button ${formData.departureFlexibility === flex.value ? 'selected' : ''}`}
              onClick={() => handleChange('departureFlexibility', flex.value)}
            >
              {flex.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label>Congés annuels (jours)</label>
        <input
          type="number"
          min="0"
          max="60"
          value={formData.annualLeaveDays}
          onChange={(e) => handleChange('annualLeaveDays', parseInt(e.target.value))}
          className="number-input"
        />
      </div>

      <div className="form-section">
        <label>Congés déjà pris cette année (jours)</label>
        <input
          type="number"
          min="0"
          max={formData.annualLeaveDays}
          value={formData.takenLeaveDays}
          onChange={(e) => handleChange('takenLeaveDays', parseInt(e.target.value))}
          className="number-input"
        />
      </div>

      <div className="form-section">
        <label>Durée moyenne de voyage souhaitée (jours)</label>
        <input
          type="number"
          min="1"
          max="90"
          value={formData.avgTripDuration}
          onChange={(e) => handleChange('avgTripDuration', parseInt(e.target.value))}
          className="number-input"
        />
      </div>

      <div className="form-section">
        <label>Aéroports / Villes de départ préférées</label>
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
        {errors.preferredAirports && <span className="error">{errors.preferredAirports}</span>}
      </div>
    </div>
  );

  return (
    <div className="onboarding-container">
      <div className="onboarding-content long">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentPart + 1) / 5) * 100}%` }}></div>
        </div>

        <div className="progress-text">
          Partie {currentPart + 1} sur 5
        </div>

        {currentPart === 0 && renderPart0()}
        {currentPart === 1 && renderPart1()}
        {currentPart === 2 && renderPart2()}
        {currentPart === 3 && renderPart3()}
        {currentPart === 4 && renderPart4()}

        <div className="form-actions">
          {currentPart > 0 && (
            <button className="nav-button secondary" onClick={handlePrevious}>
              Précédent
            </button>
          )}

          {currentPart < 4 ? (
            <button className="nav-button primary" onClick={handleNext}>
              Suivant
            </button>
          ) : (
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Terminer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
