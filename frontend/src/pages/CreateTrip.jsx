// frontend/src/pages/CreateTrip.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
  Mountain, Landmark, Palmtree, Building2, Utensils,
  Footprints, Palette, Martini, Waves, Sparkles, ShoppingBag,
  Briefcase, DollarSign, Clock, Calendar, Users, MapPin,
  Ban, Plane, ChevronDown, ChevronRight,
  X, Loader2, Heart, UserPlus, Baby, PenLine, Globe
} from 'lucide-react';
import { SearchLoadingScreen } from '../components/SkeletonLoaders';
import { SearchUsageWidget } from '../components/SearchUsageWidget';
import DestinationAutocomplete from '../components/DestinationAutocomplete';

// Unified activity grid
const ACTIVITY_OPTIONS = [
  // Sports & Nature
  { label: 'Ski & Neige', value: 'ski', icon: Mountain, category: 'sport' },
  { label: 'Randonnée', value: 'hiking', icon: Footprints, category: 'sport' },
  { label: 'Surf & Vagues', value: 'surf', icon: Waves, category: 'sport' },
  { label: 'Plongée', value: 'diving', icon: Waves, category: 'sport' },
  { label: 'Alpinisme', value: 'climbing', icon: Mountain, category: 'sport' },
  { label: 'Road Trip', value: 'roadtrip', icon: MapPin, category: 'sport' },
  // Culture
  { label: 'Musées & Art', value: 'museums', icon: Palette, category: 'culture' },
  { label: 'Histoire', value: 'history', icon: Landmark, category: 'culture' },
  { label: 'Architecture', value: 'architecture', icon: Building2, category: 'culture' },
  // Plaisirs
  { label: 'Plage & Soleil', value: 'beach', icon: Palmtree, category: 'relax' },
  { label: 'Spa & Bien-être', value: 'wellness', icon: Sparkles, category: 'relax' },
  { label: 'Gastronomie', value: 'food', icon: Utensils, category: 'relax' },
  { label: 'Nightlife', value: 'nightlife', icon: Martini, category: 'relax' },
  { label: 'Shopping', value: 'shopping', icon: ShoppingBag, category: 'relax' },
  { label: 'Festivals', value: 'festivals', icon: Sparkles, category: 'relax' },
];

// Trip types with auto-fill defaults
const TRIP_TYPES = [
  { label: 'Solo', value: 'solo', icon: Users, defaultTravelers: 1 },
  { label: 'Couple', value: 'couple', icon: Heart, defaultTravelers: 2 },
  { label: 'Famille', value: 'family', icon: Baby, defaultTravelers: 4 },
  { label: 'Amis', value: 'friends', icon: UserPlus, defaultTravelers: 4 },
  { label: 'Business', value: 'business', icon: Briefcase, defaultTravelers: 1 },
];

// Budget slider configuration
const BUDGET_CONFIG = {
  min: 200,
  max: 5000,
  step: 50,
  presets: [
    { label: 'Budget', value: 500, description: 'Économique', color: 'text-green-600' },
    { label: 'Confort', value: 1500, description: 'Bon rapport qualité/prix', color: 'text-blue-600' },
    { label: 'Premium', value: 3000, description: 'Expérience haut de gamme', color: 'text-amber-600' },
  ],
};

const FLIGHT_DURATION_OPTIONS = [
  { label: '3h max', value: 3 },
  { label: '6h max', value: 6 },
  { label: '12h max', value: 12 },
  { label: 'Sans limite', value: 24 },
];

function CreateTrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('analyzing');
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [profileLoadTimeout, setProfileLoadTimeout] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [usageData, setUsageData] = useState(null);

  const [formData, setFormData] = useState({
    budget: 1500,
    duration: 7,
    startDate: '',
    endDate: '',
    dateMode: 'flexible',
    travelers: 1,
    tripType: 'solo',
    travelVibe: 'cultural',
    travelVibeDescription: '',
    originCity: 'PAR',
    originCityName: 'Paris',
    destination: '',
    destinationId: null,
    destinationCode: null,
    destinationCountry: null,

    // Optional filters
    preferredWeather: 'any',
    mustHaves: [],
    avoidList: [],
    maxFlightDuration: 6,
    chatbotTone: 'friendly',

    // Group trip fields
    isGroupTrip: false,
    tripName: '',
    inviteEmails: [],
    maxMembers: 8,
    requireAllVotes: false,
  });

  const [errors, setErrors] = useState({});
  const [currentEmail, setCurrentEmail] = useState('');

  // Load user preferences on mount
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  // Pre-fill destination from Landing page search (navigation state or sessionStorage)
  useEffect(() => {
    const prefilled = location.state?.prefilledDestination
      || (() => { try { return JSON.parse(sessionStorage.getItem('pendingDestination') || 'null'); } catch { return null; } })();
    if (prefilled?.city) {
      setFormData(prev => ({
        ...prev,
        destination: prefilled.city,
        destinationCountry: prefilled.country || null,
        destinationCode: prefilled.iata || null,
      }));
      sessionStorage.removeItem('pendingDestination');
    }
  }, []);

  // Auto-calculate based on date mode
  useEffect(() => {
    if (formData.dateMode === 'flexible') {
      if (formData.startDate && formData.duration) {
        const start = new Date(formData.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + formData.duration - 1);
        const endDateStr = end.toISOString().split('T')[0];
        if (endDateStr !== formData.endDate) {
          setFormData(prev => ({ ...prev, endDate: endDateStr }));
        }
      }
    } else if (formData.dateMode === 'fixed') {
      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 0 && diffDays !== formData.duration) {
          setFormData(prev => ({ ...prev, duration: diffDays }));
        }
      }
    }
  }, [formData.startDate, formData.endDate, formData.duration, formData.dateMode]);

  const ORIGIN_CITY_NAMES = {
    'PAR': 'Paris', 'CDG': 'Paris CDG', 'ORY': 'Paris Orly',
    'LON': 'London', 'LHR': 'London Heathrow',
    'NYC': 'New York', 'JFK': 'New York JFK',
    'LAX': 'Los Angeles', 'BCN': 'Barcelona', 'MAD': 'Madrid',
    'ROM': 'Rome', 'AMS': 'Amsterdam', 'BER': 'Berlin',
    'BRU': 'Brussels', 'LIS': 'Lisbon', 'MIL': 'Milan',
    'VIE': 'Vienna', 'ZRH': 'Zurich', 'GVA': 'Geneva', 'DUB': 'Dublin',
  };

  const loadUserPreferences = async () => {
    // Timeout after 8s to handle Render cold start gracefully
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 8000)
    );
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const [prefsResponse, usageResponse] = await Promise.race([
        Promise.all([
          fetch(`${API_URL}/api/users/preferences`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }).catch(() => null),
          fetch(`${API_URL}/api/billing/usage`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }).catch(() => null),
        ]),
        timeoutPromise,
      ]);

      if (prefsResponse?.ok) {
        const data = await prefsResponse.json();
        if (data.preferences) {
          const originCode = data.preferences.originCity || 'PAR';
          setFormData(prev => ({
            ...prev,
            budget: data.preferences.budget || 1000,
            travelVibe: data.preferences.travelStyle || 'cultural',
            travelers: data.preferences.defaultTravelers || 1,
            maxFlightDuration: data.preferences.maxFlightHours || 6,
            mustHaves: data.preferences.activities || [],
            originCity: originCode,
            originCityName: ORIGIN_CITY_NAMES[originCode] || originCode,
          }));
        }
      }

      if (usageResponse?.ok) {
        const usageResult = await usageResponse.json();
        setUsageData(usageResult);
      }
    } catch (error) {
      if (error.message === 'timeout') {
        setProfileLoadTimeout(true);
      } else {
        console.error('Error loading preferences:', error);
      }
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleTripTypeChange = (tripType) => {
    const selectedType = TRIP_TYPES.find(t => t.value === tripType);
    setFormData(prev => ({
      ...prev,
      tripType,
      travelers: selectedType?.defaultTravelers || prev.travelers,
    }));
  };

  const toggleMustHave = (activity) => {
    setFormData(prev => ({
      ...prev,
      mustHaves: prev.mustHaves.includes(activity)
        ? prev.mustHaves.filter(a => a !== activity)
        : [...prev.mustHaves, activity],
    }));
  };

  const addToAvoidList = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const value = e.target.value.trim();
      if (!formData.avoidList.includes(value)) {
        setFormData(prev => ({ ...prev, avoidList: [...prev.avoidList, value] }));
      }
      e.target.value = '';
    }
  };

  const removeFromAvoidList = (item) => {
    setFormData(prev => ({ ...prev, avoidList: prev.avoidList.filter(i => i !== item) }));
  };

  const addInviteEmail = (e) => {
    if (e.key === 'Enter' && currentEmail.trim()) {
      e.preventDefault();
      const email = currentEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setErrors(prev => ({ ...prev, inviteEmail: 'Format d\'email invalide' }));
        return;
      }
      if (formData.inviteEmails.includes(email)) {
        setErrors(prev => ({ ...prev, inviteEmail: 'Email déjà ajouté' }));
        return;
      }
      if (user?.primaryEmailAddress?.emailAddress === email) {
        setErrors(prev => ({ ...prev, inviteEmail: 'Vous ne pouvez pas vous inviter vous-même' }));
        return;
      }
      setFormData(prev => ({ ...prev, inviteEmails: [...prev.inviteEmails, email] }));
      setCurrentEmail('');
      setErrors(prev => ({ ...prev, inviteEmail: null }));
    }
  };

  const removeInviteEmail = (email) => {
    setFormData(prev => ({ ...prev, inviteEmails: prev.inviteEmails.filter(e => e !== email) }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.isGroupTrip && usageData?.needsUpgrade) {
      newErrors.submit = 'Vous avez atteint votre limite mensuelle de recherches. Passez à un plan supérieur pour continuer.';
      return false;
    }

    if (!formData.budget || formData.budget < BUDGET_CONFIG.min) {
      newErrors.budget = 'Veuillez définir un budget pour votre voyage';
    }

    if (!formData.mustHaves || formData.mustHaves.length === 0) {
      newErrors.mustHaves = 'Sélectionnez au moins une activité';
    }

    if (!formData.duration || formData.duration < 1 || formData.duration > 30) {
      newErrors.duration = 'La durée doit être entre 1 et 30 jours';
    }

    if (formData.dateMode === 'fixed') {
      if (!formData.startDate) newErrors.startDate = 'La date de début est requise';
      if (!formData.endDate) newErrors.endDate = 'La date de fin est requise';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) newErrors.endDate = 'La date de fin doit être après la date de début';
    }

    if (!formData.travelers || formData.travelers < 1) {
      newErrors.travelers = 'Veuillez préciser le nombre de voyageurs';
    }

    if (!formData.travelVibe) {
      newErrors.travelVibe = 'Veuillez sélectionner un style de voyage';
    }

    if (formData.isGroupTrip) {
      if (!formData.tripName || formData.tripName.trim().length === 0) {
        newErrors.tripName = 'Le nom du voyage est requis pour un voyage de groupe';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      // The inline red text below each field was too subtle — users were
      // clicking the submit button and seeing nothing happen. Scroll the
      // first invalid field into view so the failure is obvious.
      requestAnimationFrame(() => {
        const firstError = document.querySelector('[data-error="true"], .text-red-500');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return;
    }

    setLoading(true);
    setLoadingStage('analyzing');

    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      if (formData.isGroupTrip) {
        const groupTripPayload = {
          name: formData.tripName,
          maxMembers: formData.maxMembers,
          requireAllVotes: formData.requireAllVotes,
        };

        const groupResponse = await fetch(`${API_URL}/api/trips`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(groupTripPayload),
        });

        if (!groupResponse.ok) {
          const errorData = await groupResponse.json();
          throw new Error(errorData.error || 'Failed to create group trip');
        }

        const groupData = await groupResponse.json();
        const tripId = groupData.data.id;

        if (formData.inviteEmails.length > 0) {
          await fetch(`${API_URL}/api/trips/${tripId}/invitations`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emails: formData.inviteEmails }),
          });
        }

        navigate(`/trips/${tripId}`);
      } else {
        const payload = {
          basic: {
            ...(formData.destination && { destination: formData.destination }),
            ...(formData.destinationId && { destinationId: formData.destinationId }),
            ...(formData.destinationCode && { destinationCode: formData.destinationCode }),
            ...(formData.destinationCountry && { destinationCountry: formData.destinationCountry }),
            budget: formData.budget || 1500,
            style: formData.travelVibe,
            tripType: formData.tripType,
            ...(formData.travelVibeDescription && { travelVibeDescription: formData.travelVibeDescription }),
            activities: formData.mustHaves.length > 0 ? formData.mustHaves : ['cultural', 'nature'],
            maxFlightHours: formData.maxFlightDuration,
            destinationPreference: 'any',
            travelers: formData.travelers,
          },
          preferences: {
            climate: formData.preferredWeather,
            accommodation: 'hotel',
            pace: 'moderate',
            gastronomy: 'important',
            natureVsCity: 50,
            nightlife: formData.mustHaves.includes('nightlife') ? 'important' : 'optional',
            activitiesBudget: 20,
          },
          constraints: {
            budget: formData.budget || 1500,
            maxFlightHours: formData.maxFlightDuration,
            avoidCountries: formData.avoidList,
          },
          availability: {
            startDate: formData.startDate || undefined,
            endDate: formData.endDate || undefined,
            duration: formData.duration,
            timeHorizon: '6-mois',
            idealDuration: `${formData.duration}-jours`,
            flexibleDates: formData.dateMode === 'flexible',
            preferredMonths: [],
            originCity: formData.originCity || 'PAR',
            professionalStatus: 'salaried',
            departureFlexibility: formData.dateMode === 'flexible' ? 'peu-importe' : 'fixed',
          },
          chatbotPreferences: {
            tone: formData.chatbotTone,
          },
        };

        setLoadingStage('searching');

        const useStreaming = !formData.destination;

        if (useStreaming) {
          navigate('/results', {
            state: { streamingMode: true, searchPayload: payload, token },
          });
          return;
        } else {
          const stageTimer1 = setTimeout(() => setLoadingStage('flights'), 3000);
          const stageTimer2 = setTimeout(() => setLoadingStage('hotels'), 6000);
          const stageTimer3 = setTimeout(() => setLoadingStage('optimizing'), 9000);

          const response = await fetch(`${API_URL}/api/travel/recommendations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          clearTimeout(stageTimer1);
          clearTimeout(stageTimer2);
          clearTimeout(stageTimer3);

          const data = await response.json();

          if (data.success && data.recommendations) {
            navigate('/results', { state: { recommendations: data.recommendations } });
          } else {
            throw new Error(data.error || 'Failed to get recommendations');
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loadingPreferences) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary mb-1">Chargement de vos préférences...</p>
          <p className="text-xs text-text-secondary/60">Le serveur démarre, cela peut prendre quelques secondes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle p-4 md:p-8">
      {loading && (
        <SearchLoadingScreen
          stage={loadingStage}
          scenario={formData.destination ? 'WITH_DESTINATION' : 'WITHOUT_DESTINATION'}
          onCancel={() => setLoading(false)}
        />
      )}

      {/* Cold start banner */}
      {profileLoadTimeout && (
        <div className="max-w-2xl mx-auto mb-4 flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          <Loader2 size={15} className="animate-spin flex-shrink-0" />
          <span>Démarrage en cours... Vos préférences seront chargées dans quelques instants. Vous pouvez déjà remplir le formulaire.</span>
        </div>
      )}

      {/* HERO */}
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-2">
          Planifiez votre voyage parfait
        </h1>
        <p className="text-text-secondary text-base">
          Plus vous décrivez, plus nos recommandations sont précises
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white rounded-3xl shadow-card border border-gray-100 divide-y divide-gray-100">

        {/* ── Section 1 : Description libre ── */}
        <div className="px-6 md:px-10 py-8 space-y-3">
          <label className="flex items-center gap-2 text-base font-semibold text-text-main">
            <PenLine size={18} className="text-primary" />
            Décrivez votre voyage idéal
          </label>
          <textarea
            value={formData.travelVibeDescription}
            onChange={(e) => handleChange('travelVibeDescription', e.target.value)}
            placeholder="Ex : On part skier 5 jours avec 4 amis, on veut des pistes variées et une bonne ambiance après-ski. Budget ~500 € / personne."
            className="w-full h-28 px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none text-sm text-text-main placeholder-gray-400"
            maxLength={500}
          />
          <div className="flex justify-end">
            <span className="text-xs text-text-secondary">{formData.travelVibeDescription.length}/500</span>
          </div>
        </div>

        {/* ── Section 2 : Qui voyage ? ── */}
        <div className="px-6 md:px-10 py-8 space-y-4">
          <p className="text-base font-semibold text-text-main flex items-center gap-2">
            <Users size={18} className="text-primary" />
            Qui voyage ?
          </p>

          {/* Trip type */}
          <div className="flex flex-wrap gap-2">
            {TRIP_TYPES.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTripTypeChange(option.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  formData.tripType === option.value
                    ? 'bg-primary-light border-primary text-primary ring-2 ring-primary/20'
                    : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                }`}
              >
                <option.icon size={15} />
                {option.label}
              </button>
            ))}
          </div>

          {/* Travelers stepper */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">Nombre de voyageurs :</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-40"
                onClick={() => handleChange('travelers', Math.max(1, formData.travelers - 1))}
                disabled={formData.travelers <= 1}
              >
                -
              </button>
              <span className="w-8 text-center font-semibold text-text-main">{formData.travelers}</span>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-40"
                onClick={() => handleChange('travelers', Math.min(20, formData.travelers + 1))}
                disabled={formData.travelers >= 20}
              >
                +
              </button>
            </div>
          </div>

          {/* Group trip toggle */}
          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.isGroupTrip}
                onChange={(e) => handleChange('isGroupTrip', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
            </div>
            <span className="text-sm font-medium text-text-main">
              {formData.isGroupTrip ? 'Voyage de groupe (planification collaborative)' : 'Créer un voyage de groupe'}
            </span>
          </label>

          {/* Group trip fields */}
          {formData.isGroupTrip && (
            <div className="mt-2 space-y-4 pl-1 animate-slide-down">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1">
                  Nom du voyage <span className="text-red-500">*</span>
                </label>
                {errors.tripName && <p className="text-red-500 text-xs mb-1">{errors.tripName}</p>}
                <input
                  type="text"
                  value={formData.tripName}
                  onChange={(e) => handleChange('tripName', e.target.value)}
                  placeholder="Ex : Aventure été 2025"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-1">
                  Inviter des amis <span className="text-text-secondary font-normal">(optionnel)</span>
                </label>
                <p className="text-xs text-text-secondary mb-2">Entrez un email et appuyez sur Entrée — vous pouvez aussi inviter plus tard</p>
                {errors.inviteEmail && <p className="text-red-500 text-xs mb-1">{errors.inviteEmail}</p>}
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={addInviteEmail}
                  placeholder="ami@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                />
                {formData.inviteEmails.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.inviteEmails.map((email, index) => (
                      <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-light border border-primary/20 text-primary rounded-full text-xs font-medium">
                        {email}
                        <button type="button" onClick={() => removeInviteEmail(email)} className="hover:text-primary-hover">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3 : Activités ── */}
        <div className="px-6 md:px-10 py-8 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-text-main flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              Quels types d'activités ?
              <span className="text-xs font-normal text-text-secondary ml-1">Multi-sélection</span>
            </p>
            {formData.mustHaves.length > 0 && (
              <span className="text-xs text-primary font-medium bg-primary-light px-2.5 py-1 rounded-full">
                {formData.mustHaves.length} sélectionnée{formData.mustHaves.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {errors.mustHaves && (
            <p className="text-red-500 text-xs -mt-1">{errors.mustHaves}</p>
          )}
          <div className={`flex flex-wrap gap-2 ${errors.mustHaves ? 'ring-1 ring-red-200 rounded-xl p-3 bg-red-50/30' : ''}`}>
            {ACTIVITY_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  toggleMustHave(option.value);
                  if (errors.mustHaves) setErrors(prev => ({ ...prev, mustHaves: null }));
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-all ${
                  formData.mustHaves.includes(option.value)
                    ? 'bg-primary-light border-primary text-primary font-medium ring-2 ring-primary/20'
                    : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                }`}
              >
                <option.icon size={14} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Section 4 : Budget ── */}
        <div className="px-6 md:px-10 py-8 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-text-main flex items-center gap-2">
              <DollarSign size={18} className="text-primary" />
              Budget par personne
              <span className="text-red-500 text-sm">*</span>
            </p>
            {errors.budget && (
              <p className="text-red-500 text-xs">{errors.budget}</p>
            )}
          </div>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-3">
            {BUDGET_CONFIG.presets.map(preset => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleChange('budget', preset.value)}
                className={`p-3 rounded-xl border transition-all text-center ${
                  formData.budget === preset.value
                    ? 'bg-primary-light border-primary ring-2 ring-primary/20'
                    : 'bg-white border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                }`}
              >
                <div className={`font-semibold text-sm ${preset.color}`}>{preset.label}</div>
                <div className="text-xs text-text-secondary mt-0.5">{preset.description}</div>
                <div className="text-sm font-medium text-text-main mt-1">~€{preset.value}</div>
              </button>
            ))}
          </div>

          {/* Slider */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-secondary">Affiner :</span>
              <div className="text-right">
                <span className="text-xl font-bold text-primary">€{formData.budget}</span>
                <span className="text-sm text-text-secondary ml-1">/ pers.</span>
                {formData.travelers > 1 && (
                  <div className="text-xs text-text-secondary mt-0.5">
                    = €{(formData.budget * formData.travelers).toLocaleString('fr-FR')} total pour {formData.travelers} voyageurs
                  </div>
                )}
              </div>
            </div>
            <input
              type="range"
              min={BUDGET_CONFIG.min}
              max={BUDGET_CONFIG.max}
              step={BUDGET_CONFIG.step}
              value={formData.budget}
              onChange={(e) => handleChange('budget', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1.5">
              <span>€{BUDGET_CONFIG.min}</span>
              <span>€{BUDGET_CONFIG.max}+</span>
            </div>
          </div>
        </div>

        {/* ── Section 5 : Quand ? ── */}
        <div className="px-6 md:px-10 py-8 space-y-4">
          <p className="text-base font-semibold text-text-main flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Quand souhaitez-vous partir ?
          </p>

          {/* Date mode toggle */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleChange('dateMode', 'flexible')}
              className={`flex-1 p-3 rounded-xl border-2 text-sm transition-all ${
                formData.dateMode === 'flexible'
                  ? 'bg-primary-light border-primary text-primary font-medium'
                  : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">Dates flexibles</div>
              <div className="text-xs opacity-80 mt-0.5">Je connais la durée, l'IA trouve le meilleur moment</div>
            </button>
            <button
              type="button"
              onClick={() => handleChange('dateMode', 'fixed')}
              className={`flex-1 p-3 rounded-xl border-2 text-sm transition-all ${
                formData.dateMode === 'fixed'
                  ? 'bg-primary-light border-primary text-primary font-medium'
                  : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">Dates fixes</div>
              <div className="text-xs opacity-80 mt-0.5">J'ai des dates précises</div>
            </button>
          </div>

          {/* Flexible: duration + optional start */}
          {formData.dateMode === 'flexible' && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-text-main mb-2">
                  <Clock size={15} className="text-primary" />
                  Durée du séjour (jours) <span className="text-red-500">*</span>
                </label>
                {errors.duration && <p className="text-red-500 text-xs mb-1">{errors.duration}</p>}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-40"
                    onClick={() => handleChange('duration', Math.max(1, formData.duration - 1))}
                    disabled={formData.duration <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.duration}
                    onChange={(e) => handleChange('duration', parseInt(e.target.value) || 1)}
                    className="w-16 p-2 text-center text-base font-medium border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-40"
                    onClick={() => handleChange('duration', Math.min(30, formData.duration + 1))}
                    disabled={formData.duration >= 30}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-text-main mb-2">
                  <Calendar size={15} className="text-text-secondary" />
                  Départ au plus tôt <span className="text-text-secondary font-normal">(optionnel)</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full md:w-56 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-text-secondary mt-1.5">
                  Laissez vide pour que l'IA détermine le meilleur moment
                </p>
              </div>
            </div>
          )}

          {/* Fixed: start + end */}
          {formData.dateMode === 'fixed' && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-text-main mb-2">
                    <Calendar size={15} className="text-primary" />
                    Date de départ <span className="text-red-500">*</span>
                  </label>
                  {errors.startDate && <p className="text-red-500 text-xs mb-1">{errors.startDate}</p>}
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-text-main mb-2">
                    <Calendar size={15} className="text-primary" />
                    Date de retour <span className="text-red-500">*</span>
                  </label>
                  {errors.endDate && <p className="text-red-500 text-xs mb-1">{errors.endDate}</p>}
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              {formData.startDate && formData.endDate && (
                <div className="flex items-center gap-2 text-sm text-text-secondary bg-gray-50 p-3 rounded-lg">
                  <Clock size={14} />
                  <span>Durée du séjour : <strong className="text-text-main">{formData.duration} jours</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section 6 : Destination (optionnelle) ── */}
        <div className="px-6 md:px-10 py-8 space-y-3">
          <p className="text-base font-semibold text-text-main flex items-center gap-2">
            <Globe size={18} className="text-primary" />
            Vous avez déjà une destination en tête ?
          </p>
          <p className="text-sm text-text-secondary">
            Laissez vide pour que l'IA suggère les destinations qui vous correspondent le mieux
          </p>
          {errors.destination && <p className="text-red-500 text-xs mb-1">{errors.destination}</p>}
          {formData.destination && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-light border border-primary/30 rounded-xl text-sm text-primary font-medium">
              <MapPin size={14} className="flex-shrink-0" />
              <span>Destination pré-remplie : <strong>{formData.destination}</strong>{formData.destinationCountry ? `, ${formData.destinationCountry}` : ''}</span>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  destination: '',
                  destinationId: null,
                  destinationCode: null,
                  destinationCountry: null,
                }))}
                className="ml-auto hover:text-primary-hover transition-colors"
                aria-label="Effacer la destination"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {!formData.destination && (
            <DestinationAutocomplete
              value={formData.destination}
              onChange={(data) => {
                setFormData(prev => ({
                  ...prev,
                  destination: data.destination,
                  destinationId: data.destinationId,
                  destinationCode: data.destinationCode,
                  destinationCountry: data.destinationCountry,
                }));
              }}
              placeholder="Rechercher : Bali, Tokyo, Barcelone..."
            />
          )}
        </div>

        {/* ── Section 7 : Ville de départ ── */}
        <div className="px-6 md:px-10 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                <Plane size={17} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-main">{formData.originCityName}</p>
                <p className="text-xs text-text-secondary">Ville de départ · Code {formData.originCity}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="text-xs font-medium text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary-light transition-colors"
            >
              Modifier
            </button>
          </div>
        </div>

        {/* ── Filtres avancés (collapsible) ── */}
        <div className="px-6 md:px-10 py-4">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-main transition-colors"
          >
            {showAdvancedFilters ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="font-medium">Filtres avancés</span>
            <span className="text-xs">(pays à éviter, durée de vol)</span>
          </button>

          {showAdvancedFilters && (
            <div className="mt-6 space-y-6 animate-slide-down">
              {/* Places to avoid */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-text-main mb-2">
                  <Ban size={15} className="text-primary" />
                  Pays ou villes à exclure
                </label>
                <input
                  type="text"
                  placeholder="Tapez un pays ou une ville et appuyez sur Entrée"
                  onKeyDown={addToAvoidList}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {formData.avoidList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.avoidList.map((item, index) => (
                      <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-100 text-red-600 rounded-full text-xs font-medium">
                        {item}
                        <button type="button" onClick={() => removeFromAvoidList(item)} className="hover:text-red-800">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Max flight duration */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-text-main mb-2">
                  <Plane size={15} className="text-primary" />
                  Durée de vol maximale
                </label>
                <div className="flex flex-wrap gap-2">
                  {FLIGHT_DURATION_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('maxFlightDuration', option.value)}
                      className={`px-4 py-2 rounded-full border text-sm transition-all ${
                        formData.maxFlightDuration === option.value
                          ? 'bg-primary-light border-primary text-primary font-medium'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Erreur globale + résumé des erreurs de validation ── */}
        {(errors.submit || Object.keys(errors).filter(k => k !== 'submit' && errors[k]).length > 0) && (
          <div
            data-error="true"
            className="mx-6 md:mx-10 mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            role="alert"
            aria-live="polite"
          >
            {errors.submit ? (
              <>
                <strong>Erreur :</strong> {errors.submit}
              </>
            ) : (
              <>
                <strong>Complétez les champs requis pour continuer :</strong>
                <ul className="mt-1 ml-5 list-disc">
                  {Object.entries(errors)
                    .filter(([k, v]) => k !== 'submit' && v)
                    .map(([k, v]) => (
                      <li key={k}>{v}</li>
                    ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* ── Submit ── */}
        <div className="px-6 md:px-10 py-8">
          {!formData.isGroupTrip && usageData && (
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <SearchUsageWidget compact />
              </div>
              {usageData.needsUpgrade && (
                <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800 font-medium">
                    Limite atteinte — Passez premium pour continuer
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className="flex-shrink-0 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Voir les offres →
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              className="px-6 py-3 bg-white text-text-secondary font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || (usageData?.needsUpgrade && !formData.isGroupTrip)}
              className={`px-8 py-3 font-semibold rounded-xl transition-all flex items-center gap-2 text-sm ${
                usageData?.needsUpgrade && !formData.isGroupTrip
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {formData.isGroupTrip ? 'Création du voyage...' : 'Recherche en cours...'}
                </>
              ) : usageData?.needsUpgrade && !formData.isGroupTrip ? (
                'Passer à Premium pour chercher'
              ) : (
                formData.isGroupTrip ? 'Créer le voyage de groupe' : 'Trouver mon voyage parfait'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateTrip;
