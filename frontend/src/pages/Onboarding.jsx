// frontend/src/pages/Onboarding.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Zap, Target, Check, Calendar, MapPin, Globe, Clock, Shield, Users, Heart, Activity, Sun, Moon, Coffee, Briefcase, Plane } from 'lucide-react';
import AirportAutocomplete from '../components/AirportAutocomplete';

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

// Airports now imported from ../data/airports.js via AirportAutocomplete component

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

      // Transform preferredAirports from objects to codes before sending
      const dataToSend = {
        ...formData,
        preferredAirports: formData.preferredAirports.map(airport => airport.code),
        onboardingCompleted: true,
        onboardingType,
      };

      // Save preferences with authentication token
      const response = await fetch(`${API_URL}/api/users/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
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

  // Helper for option buttons
  const OptionButton = ({ selected, onClick, children, className = '' }) => (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left rounded-2xl border transition-all duration-200 flex items-center justify-between group ${selected
        ? 'bg-primary-light border-primary text-primary ring-1 ring-primary'
        : 'bg-white border-gray-200 text-text-main hover:border-primary/50 hover:bg-gray-50'
        } ${className}`}
    >
      <span className="font-medium">{children}</span>
      {selected && <Check size={18} className="text-primary" />}
    </button>
  );

  // Helper for slider
  const Slider = ({ value, onChange, min = 0, max = 100, leftLabel, rightLabel, centerLabel }) => (
    <div className="py-4">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between mt-2 text-sm text-text-secondary font-medium">
        <span>{leftLabel}</span>
        {centerLabel && <span className="text-primary font-bold">{centerLabel}</span>}
        <span>{rightLabel}</span>
      </div>
    </div>
  );

  // Onboarding type selection screen
  if (!onboardingType) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-4xl font-bold mb-4 text-text-main">Bienvenue sur Travel AI !</h1>
          <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto">
            Pour vous proposer les meilleures recommandations de voyage, nous avons besoin d'en savoir plus sur vos préférences.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div
              onClick={() => {
                setOnboardingType('short');
                setFormData(prev => ({ ...prev, onboardingType: 'short' }));
              }}
              className="bg-white p-8 rounded-3xl border border-gray-200 hover:border-primary hover:shadow-xl transition-all cursor-pointer group text-left relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-text-main">Onboarding Rapide</h3>
              <p className="text-sm font-medium text-text-secondary mb-4">~9 questions • 3-5 minutes</p>
              <p className="text-text-secondary mb-8 leading-relaxed">
                Les questions essentielles pour commencer. Vous pourrez compléter votre profil plus tard.
              </p>
              <button className="w-full py-3 bg-surface-subtle text-text-main font-semibold rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                Commencer rapidement
              </button>
            </div>

            <div
              onClick={() => {
                setOnboardingType('long');
                setFormData(prev => ({ ...prev, onboardingType: 'long' }));
              }}
              className="bg-white p-8 rounded-3xl border-2 border-primary shadow-soft cursor-pointer group text-left relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                Recommandé
              </div>
              <div className="w-14 h-14 bg-primary-light text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-text-main">Onboarding Complet</h3>
              <p className="text-sm font-medium text-text-secondary mb-4">~30 questions • 10-15 minutes</p>
              <p className="text-text-secondary mb-8 leading-relaxed">
                Des recommandations ultra-personnalisées basées sur un profil détaillé de vos préférences.
              </p>
              <button className="w-full py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">
                Obtenir les meilleurs résultats
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Short onboarding - one page
  if (onboardingType === 'short') {
    return (
      <div className="min-h-screen bg-surface-subtle py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-card p-8 md:p-12">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-2 text-text-main">Parlez-nous de vous</h1>
            <p className="text-text-secondary">9 questions rapides pour des recommandations personnalisées</p>
          </div>

          <div className="space-y-12">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Heart size={20} className="text-primary" /> 1. Pourquoi aimez-vous voyager ?
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {TRAVEL_REASONS.map(reason => (
                  <OptionButton
                    key={reason}
                    selected={formData.whyTravel === reason}
                    onClick={() => handleChange('whyTravel', reason)}
                  >
                    {reason}
                  </OptionButton>
                ))}
              </div>
              {errors.whyTravel && <span className="text-red-500 text-sm">{errors.whyTravel}</span>}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target size={20} className="text-primary" /> 2. Votre but principal en voyage ?
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {MAIN_GOALS.map(goal => (
                  <OptionButton
                    key={goal}
                    selected={formData.mainGoal === goal}
                    onClick={() => handleChange('mainGoal', goal)}
                  >
                    {goal}
                  </OptionButton>
                ))}
              </div>
              {errors.mainGoal && <span className="text-red-500 text-sm">{errors.mainGoal}</span>}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe size={20} className="text-primary" /> 3. Votre style de voyage ?
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {GLOBAL_STYLES.map(style => (
                  <OptionButton
                    key={style.value}
                    selected={formData.globalStyle === style.value}
                    onClick={() => handleChange('globalStyle', style.value)}
                  >
                    {style.label}
                  </OptionButton>
                ))}
              </div>
              {errors.globalStyle && <span className="text-red-500 text-sm">{errors.globalStyle}</span>}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity size={20} className="text-primary" /> 4. Sélectionnez vos 3-5 activités favorites
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ACTIVITIES.map(activity => (
                  <button
                    key={activity}
                    className={`p-3 text-sm font-medium rounded-xl border transition-all ${formData.topActivities.includes(activity)
                      ? 'bg-primary-light border-primary text-primary'
                      : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50'
                      } ${!formData.topActivities.includes(activity) && formData.topActivities.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => toggleArrayItem('topActivities', activity)}
                    disabled={!formData.topActivities.includes(activity) && formData.topActivities.length >= 5}
                  >
                    {activity}
                  </button>
                ))}
              </div>
              <p className="text-sm text-text-secondary text-right">{formData.topActivities.length}/5 sélectionnées</p>
              {errors.topActivities && <span className="text-red-500 text-sm">{errors.topActivities}</span>}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock size={20} className="text-primary" /> 5. Rythme idéal de voyage ?
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {RHYTHM_OPTIONS.map(rhythm => (
                  <OptionButton
                    key={rhythm.value}
                    selected={formData.idealRhythm === rhythm.value}
                    onClick={() => handleChange('idealRhythm', rhythm.value)}
                    className="text-sm"
                  >
                    {rhythm.label}
                  </OptionButton>
                ))}
              </div>
              {errors.idealRhythm && <span className="text-red-500 text-sm">{errors.idealRhythm}</span>}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plane size={20} className="text-primary" /> 6. Combien de fois voyagez-vous par an ?
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 1, label: '1 fois' },
                  { value: 2, label: '2-3 fois' },
                  { value: 4, label: '4-6 fois' },
                  { value: 7, label: '7+ fois' },
                ].map(option => (
                  <OptionButton
                    key={option.value}
                    selected={formData.tripsPerYear === option.value}
                    onClick={() => handleChange('tripsPerYear', option.value)}
                    className="justify-center text-center"
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>
              {errors.tripsPerYear && <span className="text-red-500 text-sm">{errors.tripsPerYear}</span>}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar size={20} className="text-primary" /> 7. Vos disponibilités de départ
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {DEPARTURE_FLEXIBILITY.map(option => (
                  <OptionButton
                    key={option.value}
                    selected={formData.departureFlexibility === option.value}
                    onClick={() => handleChange('departureFlexibility', option.value)}
                    className="text-sm"
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>
              {errors.departureFlexibility && <span className="text-red-500 text-sm">{errors.departureFlexibility}</span>}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar size={20} className="text-primary" /> 8. Connecter votre calendrier ?
              </h3>
              <p className="text-sm text-text-secondary">Cela nous permettra de vous suggérer les meilleurs moments pour voyager</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <OptionButton
                  selected={formData.calendarConnected === true}
                  onClick={() => {
                    handleChange('calendarConnected', true);
                    if (formData.calendarType === '') {
                      handleChange('calendarType', 'google');
                    }
                  }}
                >
                  Oui, connecter mon calendrier
                </OptionButton>
                <OptionButton
                  selected={formData.calendarConnected === false}
                  onClick={() => {
                    handleChange('calendarConnected', false);
                    handleChange('calendarType', 'manual');
                  }}
                >
                  Non, saisie manuelle
                </OptionButton>
              </div>

              {formData.calendarConnected && (
                <div className="p-4 bg-surface-subtle rounded-2xl border border-gray-200 mt-4">
                  <label className="text-sm font-medium mb-3 block">Type de calendrier</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <OptionButton
                      selected={formData.calendarType === 'google'}
                      onClick={() => handleChange('calendarType', 'google')}
                    >
                      Google Calendar
                    </OptionButton>
                    <OptionButton
                      selected={formData.calendarType === 'outlook'}
                      onClick={() => handleChange('calendarType', 'outlook')}
                    >
                      Outlook Calendar
                    </OptionButton>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <AirportAutocomplete
                selectedAirports={formData.preferredAirports}
                onChange={(airports) => {
                  setFormData({ ...formData, preferredAirports: airports });
                  if (errors.preferredAirports && airports.length > 0) {
                    setErrors({ ...errors, preferredAirports: null });
                  }
                }}
                maxSelection={3}
                label="9. Aéroports/Villes de départ préférées"
                placeholder="Ex: Paris, Lyon, Marseille..."
                helperText="Choisissez jusqu'à 3 aéroports de départ. Nous optimiserons vos recommandations en fonction de votre ville."
                error={errors.preferredAirports}
              />
            </div>

            <div className="pt-8 border-t border-gray-100">
              <button
                className="w-full py-4 bg-primary text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Enregistrement...' : 'Terminer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Long onboarding - multi-part
  const renderPart0 = () => (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-main mb-6">Partie 1 : Style & Objectif du voyage</h2>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Pourquoi aimez-vous voyager ?</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {TRAVEL_REASONS.map(reason => (
            <OptionButton
              key={reason}
              selected={formData.whyTravel === reason}
              onClick={() => handleChange('whyTravel', reason)}
            >
              {reason}
            </OptionButton>
          ))}
        </div>
        {errors.whyTravel && <span className="text-red-500 text-sm">{errors.whyTravel}</span>}
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Votre but principal en voyage ?</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {MAIN_GOALS.map(goal => (
            <OptionButton
              key={goal}
              selected={formData.mainGoal === goal}
              onClick={() => handleChange('mainGoal', goal)}
            >
              {goal}
            </OptionButton>
          ))}
        </div>
        {errors.mainGoal && <span className="text-red-500 text-sm">{errors.mainGoal}</span>}
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Style global de voyage</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {GLOBAL_STYLES.map(style => (
            <OptionButton
              key={style.value}
              selected={formData.globalStyle === style.value}
              onClick={() => handleChange('globalStyle', style.value)}
            >
              {style.label}
            </OptionButton>
          ))}
        </div>
        {errors.globalStyle && <span className="text-red-500 text-sm">{errors.globalStyle}</span>}
      </div>

      <div className="space-y-6 pt-4">
        <Slider
          leftLabel="Prudent"
          rightLabel="Aventureux"
          centerLabel={`${formData.riskTolerance}%`}
          value={formData.riskTolerance}
          onChange={(e) => handleChange('riskTolerance', parseInt(e.target.value))}
        />
        <Slider
          leftLabel="Classique"
          rightLabel="Original"
          centerLabel={`${formData.originalityAppetite}%`}
          value={formData.originalityAppetite}
          onChange={(e) => handleChange('originalityAppetite', parseInt(e.target.value))}
        />
        <Slider
          leftLabel="Introverti"
          rightLabel="Extraverti"
          centerLabel={`${formData.introvertExtrovert}%`}
          value={formData.introvertExtrovert}
          onChange={(e) => handleChange('introvertExtrovert', parseInt(e.target.value))}
        />
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Vous préférez planifier ou improviser ?</label>
        <div className="grid sm:grid-cols-3 gap-3">
          <OptionButton
            selected={formData.plannerImprovisator === 'planner'}
            onClick={() => handleChange('plannerImprovisator', 'planner')}
          >
            Planifier
          </OptionButton>
          <OptionButton
            selected={formData.plannerImprovisator === 'balanced'}
            onClick={() => handleChange('plannerImprovisator', 'balanced')}
          >
            Équilibré
          </OptionButton>
          <OptionButton
            selected={formData.plannerImprovisator === 'improvisator'}
            onClick={() => handleChange('plannerImprovisator', 'improvisator')}
          >
            Improviser
          </OptionButton>
        </div>
      </div>

      <Slider
        leftLabel="Confort moderne"
        rightLabel="Authenticité locale"
        centerLabel={`${formData.modernComfortAuth}%`}
        value={formData.modernComfortAuth}
        onChange={(e) => handleChange('modernComfortAuth', parseInt(e.target.value))}
      />
    </div>
  );

  const renderPart1 = () => (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-main mb-6">Partie 2 : Activités préférées</h2>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Sélectionnez vos top 3-5 activités favorites</label>
        <p className="text-sm text-text-secondary">Ces informations nous aideront à personnaliser vos recommandations</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACTIVITIES.map(activity => (
            <button
              key={activity}
              className={`p-4 text-sm font-medium rounded-xl border transition-all ${formData.topActivities.includes(activity)
                ? 'bg-primary-light border-primary text-primary'
                : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50'
                } ${!formData.topActivities.includes(activity) && formData.topActivities.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => toggleArrayItem('topActivities', activity)}
              disabled={!formData.topActivities.includes(activity) && formData.topActivities.length >= 5}
            >
              {activity}
            </button>
          ))}
        </div>
        <p className="text-sm text-text-secondary text-right">{formData.topActivities.length}/5 sélectionnées</p>
        {errors.topActivities && <span className="text-red-500 text-sm">{errors.topActivities}</span>}
      </div>
    </div>
  );

  const renderPart2 = () => (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-main mb-6">Partie 3 : Rythme et confort</h2>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Rythme idéal de voyage</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {RHYTHM_OPTIONS.map(rhythm => (
            <OptionButton
              key={rhythm.value}
              selected={formData.idealRhythm === rhythm.value}
              onClick={() => handleChange('idealRhythm', rhythm.value)}
              className="text-sm"
            >
              {rhythm.label}
            </OptionButton>
          ))}
        </div>
        {errors.idealRhythm && <span className="text-red-500 text-sm">{errors.idealRhythm}</span>}
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Préférence d'hébergement</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {ACCOMMODATION_OPTIONS.map(acc => (
            <OptionButton
              key={acc.value}
              selected={formData.accommodationPref === acc.value}
              onClick={() => handleChange('accommodationPref', acc.value)}
            >
              {acc.label}
            </OptionButton>
          ))}
        </div>
        {errors.accommodationPref && <span className="text-red-500 text-sm">{errors.accommodationPref}</span>}
      </div>

      <Slider
        leftLabel="Confort"
        rightLabel="Authenticité"
        centerLabel={`${formData.comfortAuthSlider}%`}
        value={formData.comfortAuthSlider}
        onChange={(e) => handleChange('comfortAuthSlider', parseInt(e.target.value))}
      />

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Préférence de séjour</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {STAY_OPTIONS.map(stay => (
            <OptionButton
              key={stay.value}
              selected={formData.stayOrMove === stay.value}
              onClick={() => handleChange('stayOrMove', stay.value)}
              className="text-sm"
            >
              {stay.label}
            </OptionButton>
          ))}
        </div>
        {errors.stayOrMove && <span className="text-red-500 text-sm">{errors.stayOrMove}</span>}
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Moyens de transport acceptés</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TRANSPORT_MODES.map(mode => (
            <button
              key={mode}
              className={`p-3 text-sm font-medium rounded-xl border transition-all ${formData.transportModes.includes(mode)
                ? 'bg-primary-light border-primary text-primary'
                : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50'
                }`}
              onClick={() => toggleArrayItem('transportModes', mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        {errors.transportModes && <span className="text-red-500 text-sm">{errors.transportModes}</span>}
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Confort de transport</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {TRANSPORT_COMFORT.map(comfort => (
            <OptionButton
              key={comfort.value}
              selected={formData.transportComfort === comfort.value}
              onClick={() => handleChange('transportComfort', comfort.value)}
            >
              {comfort.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Durée maximale de transport (heures)</label>
        <input
          type="number"
          min="1"
          max="24"
          value={formData.maxTransportHours}
          onChange={(e) => handleChange('maxTransportHours', parseInt(e.target.value))}
          className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
        />
      </div>

      <Slider
        leftLabel="Peu important"
        rightLabel="Très important"
        centerLabel={`${formData.materialComfort}%`}
        value={formData.materialComfort}
        onChange={(e) => handleChange('materialComfort', parseInt(e.target.value))}
      />
    </div>
  );

  const renderPart3 = () => (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-main mb-6">Partie 4 : Contraintes pratiques</h2>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Préférence visa</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {VISA_PREFERENCES.map(visa => (
            <OptionButton
              key={visa.value}
              selected={formData.visaPreference === visa.value}
              onClick={() => handleChange('visaPreference', visa.value)}
              className="text-sm"
            >
              {visa.label}
            </OptionButton>
          ))}
        </div>
        {errors.visaPreference && <span className="text-red-500 text-sm">{errors.visaPreference}</span>}
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Pays à éviter (optionnel)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={countryInput}
            onChange={(e) => setCountryInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCountry()}
            placeholder="Entrez un pays..."
            className="flex-1 p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
          />
          <button onClick={handleAddCountry} className="px-6 bg-text-main text-white font-medium rounded-xl hover:bg-black transition-colors">
            Ajouter
          </button>
        </div>
        {formData.avoidCountries.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.avoidCountries.map(country => (
              <span key={country} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-text-main rounded-lg text-sm">
                {country}
                <button onClick={() => removeCountry(country)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Besoins de mobilité</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {MOBILITY_OPTIONS.map(mobility => (
            <OptionButton
              key={mobility.value}
              selected={formData.mobilityNeeds === mobility.value}
              onClick={() => handleChange('mobilityNeeds', mobility.value)}
            >
              {mobility.label}
            </OptionButton>
          ))}
        </div>
        {formData.mobilityNeeds === 'other' && (
          <input
            type="text"
            value={formData.mobilityDetails}
            onChange={(e) => handleChange('mobilityDetails', e.target.value)}
            placeholder="Précisez vos besoins..."
            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all mt-2"
          />
        )}
      </div>

      <Slider
        leftLabel="Sécurité peu importante"
        rightLabel="Très importante"
        centerLabel={`${formData.securityImportance}%`}
        value={formData.securityImportance}
        onChange={(e) => handleChange('securityImportance', parseInt(e.target.value))}
      />

      <Slider
        leftLabel="J'évite les foules"
        rightLabel="Peu importe"
        centerLabel={`${formData.crowdTolerance}%`}
        value={formData.crowdTolerance}
        onChange={(e) => handleChange('crowdTolerance', parseInt(e.target.value))}
      />

      <Slider
        leftLabel="Écologie peu importante"
        rightLabel="Très importante"
        centerLabel={`${formData.ecoSensitivity}%`}
        value={formData.ecoSensitivity}
        onChange={(e) => handleChange('ecoSensitivity', parseInt(e.target.value))}
      />

      <Slider
        leftLabel="Adaptabilité faible"
        rightLabel="Très à l'aise"
        centerLabel={`${formData.culturalAdaptability}%`}
        value={formData.culturalAdaptability}
        onChange={(e) => handleChange('culturalAdaptability', parseInt(e.target.value))}
      />

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Sensibilité climatique</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {CLIMATE_SENSITIVITY.map(climate => (
            <OptionButton
              key={climate.value}
              selected={formData.climateSensitivity === climate.value}
              onClick={() => handleChange('climateSensitivity', climate.value)}
            >
              {climate.label}
            </OptionButton>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPart4 = () => (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-main mb-6">Partie 5 : Disponibilités et patterns</h2>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Fréquence moyenne de voyages par an</label>
        <input
          type="number"
          min="1"
          max="20"
          value={formData.tripsPerYear}
          onChange={(e) => handleChange('tripsPerYear', parseInt(e.target.value))}
          className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Flexibilité de départ</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {DEPARTURE_FLEXIBILITY.map(flex => (
            <OptionButton
              key={flex.value}
              selected={formData.departureFlexibility === flex.value}
              onClick={() => handleChange('departureFlexibility', flex.value)}
              className="text-sm"
            >
              {flex.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block font-medium text-text-main">Congés annuels (jours)</label>
          <input
            type="number"
            min="0"
            max="60"
            value={formData.annualLeaveDays}
            onChange={(e) => handleChange('annualLeaveDays', parseInt(e.target.value))}
            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="block font-medium text-text-main">Congés déjà pris</label>
          <input
            type="number"
            min="0"
            max={formData.annualLeaveDays}
            value={formData.takenLeaveDays}
            onChange={(e) => handleChange('takenLeaveDays', parseInt(e.target.value))}
            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Durée moyenne de voyage souhaitée (jours)</label>
        <input
          type="number"
          min="1"
          max="90"
          value={formData.avgTripDuration}
          onChange={(e) => handleChange('avgTripDuration', parseInt(e.target.value))}
          className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="space-y-4">
        <label className="block font-medium text-text-main">Aéroports / Villes de départ préférées</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AIRPORTS.map(airport => (
            <button
              key={airport.code}
              className={`p-3 text-sm font-medium rounded-xl border transition-all ${formData.preferredAirports.includes(airport.code)
                ? 'bg-primary-light border-primary text-primary'
                : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50'
                }`}
              onClick={() => toggleArrayItem('preferredAirports', airport.code)}
            >
              {airport.name}
            </button>
          ))}
        </div>
        {errors.preferredAirports && <span className="text-red-500 text-sm">{errors.preferredAirports}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-subtle py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-card p-8 md:p-12">
        <div className="w-full h-2 bg-gray-100 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentPart + 1) / 5) * 100}%` }}
          ></div>
        </div>

        <div className="text-center text-sm font-medium text-text-secondary mb-8">
          Partie {currentPart + 1} sur 5
        </div>

        {currentPart === 0 && renderPart0()}
        {currentPart === 1 && renderPart1()}
        {currentPart === 2 && renderPart2()}
        {currentPart === 3 && renderPart3()}
        {currentPart === 4 && renderPart4()}

        <div className="flex justify-between gap-4 mt-12 pt-8 border-t border-gray-100">
          {currentPart > 0 && (
            <button
              className="px-8 py-4 bg-white border border-gray-200 text-text-main font-semibold rounded-2xl hover:bg-gray-50 transition-colors"
              onClick={handlePrevious}
            >
              Précédent
            </button>
          )}

          {currentPart < 4 ? (
            <button
              className="flex-1 px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all ml-auto"
              onClick={handleNext}
            >
              Suivant
            </button>
          ) : (
            <button
              className="flex-1 px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all ml-auto disabled:opacity-50"
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
