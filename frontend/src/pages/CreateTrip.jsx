// frontend/src/pages/CreateTrip.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
  Mountain, Landmark, Palmtree, Building2, Utensils,
  Sun, CloudSun, Snowflake, Globe, Footprints, Palette,
  Martini, Waves, Sparkles, ShoppingBag, Smile, Briefcase,
  Glasses, DollarSign, Clock, Calendar, Users, Plus,
  Thermometer, Target, Ban, Plane, Bot, ChevronDown, ChevronRight,
  X, Loader2, Heart, UserPlus, Baby, Handshake, PenLine
} from 'lucide-react';
import { SearchLoadingScreen } from '../components/SkeletonLoaders';
import { SearchUsageWidget } from '../components/SearchUsageWidget';
import DestinationAutocomplete from '../components/DestinationAutocomplete';

const TRAVEL_VIBES = [
  { label: 'Adventure & Nature', value: 'adventure', icon: Mountain },
  { label: 'Culture & History', value: 'cultural', icon: Landmark },
  { label: 'Beach & Relaxation', value: 'relaxation', icon: Palmtree },
  { label: 'Urban & Shopping', value: 'urban', icon: Building2 },
  { label: 'Food & Gastronomy', value: 'food', icon: Utensils },
];

// Trip types with auto-fill defaults
const TRIP_TYPES = [
  { label: 'Solo', value: 'solo', icon: Users, defaultTravelers: 1, description: 'Just me' },
  { label: 'Couple', value: 'couple', icon: Heart, defaultTravelers: 2, description: 'Romantic getaway' },
  { label: 'Family', value: 'family', icon: Baby, defaultTravelers: 4, description: 'With kids' },
  { label: 'Friends', value: 'friends', icon: UserPlus, defaultTravelers: 4, description: 'Group adventure' },
  { label: 'Business', value: 'business', icon: Briefcase, defaultTravelers: 1, description: 'Work trip' },
  { label: 'Other', value: 'other', icon: PenLine, defaultTravelers: 2, description: 'Tell us more' },
];

// Budget slider configuration
const BUDGET_CONFIG = {
  min: 200,
  max: 5000,
  step: 50,
  presets: [
    { label: 'Budget', value: 500, description: 'Économique', color: 'text-green-600' },
    { label: 'Comfort', value: 1500, description: 'Bon rapport qualité/prix', color: 'text-blue-600' },
    { label: 'Premium', value: 3000, description: 'Expérience haut de gamme', color: 'text-amber-600' },
  ]
};

const BUDGET_PRESETS = [
  { label: '< €500', value: 500 },
  { label: '€500-1500', value: 1000 },
  { label: '€1500-3000', value: 2250 },
  { label: '> €3000', value: 4000 },
];

const WEATHER_OPTIONS = [
  { label: 'Hot', value: 'hot', icon: Sun },
  { label: 'Mild', value: 'mild', icon: CloudSun },
  { label: 'Cold', value: 'cold', icon: Snowflake },
  { label: 'Any', value: 'any', icon: Globe },
];

const MUST_HAVE_ACTIVITIES = [
  { label: 'Hiking', value: 'hiking', icon: Footprints },
  { label: 'Museums', value: 'museums', icon: Palette },
  { label: 'Beach', value: 'beach', icon: Palmtree },
  { label: 'Nightlife', value: 'nightlife', icon: Martini },
  { label: 'Adventure Sports', value: 'sports', icon: Waves },
  { label: 'Wellness', value: 'wellness', icon: Sparkles },
  { label: 'Shopping', value: 'shopping', icon: ShoppingBag },
  { label: 'Food Tours', value: 'food', icon: Utensils },
];

const FLIGHT_DURATION_OPTIONS = [
  { label: '3h', value: 3 },
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: 'Any', value: 24 },
];

const CHATBOT_TONES = [
  { label: 'Friendly', value: 'friendly', icon: Smile },
  { label: 'Professional', value: 'professional', icon: Briefcase },
  { label: 'Casual', value: 'casual', icon: Glasses },
  { label: 'Inspiring', value: 'inspiring', icon: Sparkles },
];

function CreateTrip() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('analyzing');
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [showOptionalFilters, setShowOptionalFilters] = useState(false);
  const [usageData, setUsageData] = useState(null);

  // Mandatory fields
  const [formData, setFormData] = useState({
    budget: 1500,
    duration: 7,
    startDate: '',
    endDate: '',
    dateMode: 'flexible', // 'fixed' or 'flexible'
    travelers: 1,
    tripType: 'solo', // NEW: solo, couple, family, friends, business
    travelVibe: 'cultural',
    travelVibeDescription: '', // Free text field for custom trip description
    originCity: 'PAR', // Departure city code (loaded from preferences)
    originCityName: 'Paris', // Display name for departure city
    destination: '', // Optional: specific destination (display name)
    destinationId: null, // API destination ID for accurate search
    destinationCode: null, // Airport/city code
    destinationCountry: null, // Country name

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

  // State for showing/hiding the free text description
  const [showVibeDescription, setShowVibeDescription] = useState(false);

  const [errors, setErrors] = useState({});
  const [currentEmail, setCurrentEmail] = useState('');

  // Load user preferences on mount
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  // Auto-calculate based on date mode
  useEffect(() => {
    if (formData.dateMode === 'flexible') {
      // In flexible mode: calculate end date from start date + duration
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
      // In fixed mode: calculate duration from start and end dates
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

  // Map of common airport codes to city names
  const ORIGIN_CITY_NAMES = {
    'PAR': 'Paris',
    'CDG': 'Paris CDG',
    'ORY': 'Paris Orly',
    'LON': 'London',
    'LHR': 'London Heathrow',
    'NYC': 'New York',
    'JFK': 'New York JFK',
    'LAX': 'Los Angeles',
    'BCN': 'Barcelona',
    'MAD': 'Madrid',
    'ROM': 'Rome',
    'AMS': 'Amsterdam',
    'BER': 'Berlin',
    'BRU': 'Brussels',
    'LIS': 'Lisbon',
    'MIL': 'Milan',
    'VIE': 'Vienna',
    'ZRH': 'Zurich',
    'GVA': 'Geneva',
    'DUB': 'Dublin',
  };

  const loadUserPreferences = async () => {
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // Fetch preferences and usage in parallel (independent — one failure shouldn't block the other)
      const [prefsResponse, usageResponse] = await Promise.all([
        fetch(`${API_URL}/api/users/preferences`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${API_URL}/api/billing/usage`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).catch(() => null),
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
      console.error('Error loading preferences:', error);
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

  // Handle trip type change with auto-fill travelers
  const handleTripTypeChange = (tripType) => {
    const selectedType = TRIP_TYPES.find(t => t.value === tripType);
    setFormData(prev => ({
      ...prev,
      tripType,
      travelers: selectedType?.defaultTravelers || prev.travelers,
    }));
    // Auto-open the description field when "Other" is selected
    if (tripType === 'other') {
      setShowVibeDescription(true);
    }
  };

  const toggleMustHave = (activity) => {
    setFormData(prev => ({
      ...prev,
      mustHaves: prev.mustHaves.includes(activity)
        ? prev.mustHaves.filter(a => a !== activity)
        : [...prev.mustHaves, activity]
    }));
  };

  const addToAvoidList = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const value = e.target.value.trim();
      if (!formData.avoidList.includes(value)) {
        setFormData(prev => ({
          ...prev,
          avoidList: [...prev.avoidList, value]
        }));
      }
      e.target.value = '';
    }
  };

  const removeFromAvoidList = (item) => {
    setFormData(prev => ({
      ...prev,
      avoidList: prev.avoidList.filter(i => i !== item)
    }));
  };

  const addInviteEmail = (e) => {
    if (e.key === 'Enter' && currentEmail.trim()) {
      e.preventDefault();
      const email = currentEmail.trim().toLowerCase();

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setErrors(prev => ({ ...prev, inviteEmail: 'Invalid email format' }));
        return;
      }

      // Check for duplicates
      if (formData.inviteEmails.includes(email)) {
        setErrors(prev => ({ ...prev, inviteEmail: 'Email already added' }));
        return;
      }

      // Check for self-invite
      if (user?.primaryEmailAddress?.emailAddress === email) {
        setErrors(prev => ({ ...prev, inviteEmail: 'Cannot invite yourself' }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        inviteEmails: [...prev.inviteEmails, email]
      }));
      setCurrentEmail('');
      setErrors(prev => ({ ...prev, inviteEmail: null }));
    }
  };

  const removeInviteEmail = (email) => {
    setFormData(prev => ({
      ...prev,
      inviteEmails: prev.inviteEmails.filter(e => e !== email)
    }));
  };

  const validate = () => {
    const newErrors = {};

    // Check usage limits (only for solo trips - group trips don't trigger search)
    if (!formData.isGroupTrip && usageData?.needsUpgrade) {
      newErrors.submit = 'You have reached your monthly search limit. Please upgrade to continue.';
      return false;
    }

    if (!formData.duration || formData.duration < 1 || formData.duration > 30) {
      newErrors.duration = 'Duration must be between 1 and 30 days';
    }

    // Fixed dates mode requires both start and end dates
    if (formData.dateMode === 'fixed') {
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required for fixed dates';
      }
      if (!formData.endDate) {
        newErrors.endDate = 'End date is required for fixed dates';
      }
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (!formData.travelers || formData.travelers < 1) {
      newErrors.travelers = 'Please specify number of travelers';
    }

    if (!formData.travelVibe) {
      newErrors.travelVibe = 'Please select a travel vibe';
    }

    // Group trip validation
    if (formData.isGroupTrip) {
      if (!formData.tripName || formData.tripName.trim().length === 0) {
        newErrors.tripName = 'Trip name is required for group trips';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setLoadingStage('analyzing');

    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // If group trip, create collaborative trip first
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

        // Send invitations if any emails were provided
        if (formData.inviteEmails.length > 0) {
          await fetch(`${API_URL}/api/trips/${tripId}/invitations`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              emails: formData.inviteEmails,
            }),
          });
        }

        // Navigate to the trip detail page
        navigate(`/trips/${tripId}`);
      } else {
        // Solo trip - get recommendations as before
        const payload = {
          basic: {
            ...(formData.destination && { destination: formData.destination }), // Add destination if provided
            ...(formData.destinationId && { destinationId: formData.destinationId }), // API destination ID
            ...(formData.destinationCode && { destinationCode: formData.destinationCode }), // Airport code
            ...(formData.destinationCountry && { destinationCountry: formData.destinationCountry }), // Country
            budget: formData.budget || 1500,
            style: formData.travelVibe,
            tripType: formData.tripType, // NEW: solo, couple, family, friends, business
            ...(formData.travelVibeDescription && { travelVibeDescription: formData.travelVibeDescription }), // Custom trip description
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
            flexibleDates: formData.dateMode === 'flexible', // Use the date mode
            preferredMonths: [],
            originCity: formData.originCity || 'PAR', // Use origin city from preferences
            professionalStatus: 'salaried',
            departureFlexibility: formData.dateMode === 'flexible' ? 'peu-importe' : 'fixed',
          },
          chatbotPreferences: {
            tone: formData.chatbotTone,
          },
        };

        // Use streaming endpoint for progressive loading
        setLoadingStage('searching');

        // Try streaming first, fallback to regular endpoint
        const useStreaming = !formData.destination; // Only stream for discovery mode

        if (useStreaming) {
          // Navigate to Results page immediately with search payload
          // Results page will handle the streaming directly
          navigate('/results', {
            state: {
              streamingMode: true,
              searchPayload: payload,
              token: token
            }
          });
          return; // Exit early - Results page handles the rest
        } else {
          // Regular mode for specific destination
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
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle p-4 md:p-8">
      {loading && <SearchLoadingScreen stage={loadingStage} scenario={formData.destination ? 'WITH_DESTINATION' : 'WITHOUT_DESTINATION'} />}

      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-2">Create Your Perfect Trip</h1>
        <p className="text-text-secondary">Fill in the details below to get personalized recommendations</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-3xl shadow-card border border-gray-100 p-6 md:p-10">
        {/* TRIP TYPE TOGGLE */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.isGroupTrip}
                onChange={(e) => handleChange('isGroupTrip', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors"></div>
              <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-7 shadow-sm"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Users size={20} className={formData.isGroupTrip ? 'text-primary' : 'text-gray-400'} />
                <span className="font-semibold text-text-main">
                  {formData.isGroupTrip ? 'Group Trip' : 'Solo Trip'}
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                {formData.isGroupTrip
                  ? 'Create a collaborative trip and invite friends to help plan together'
                  : 'Plan a personal trip and get AI-powered destination recommendations'}
              </p>
            </div>
          </label>

          {/* GROUP TRIP FIELDS */}
          {formData.isGroupTrip && (
            <div className="mt-6 space-y-6 pl-18 animate-slide-down">
              {/* Trip Name */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Trip Name <span className="text-red-500">*</span>
                </label>
                {errors.tripName && <p className="text-red-500 text-sm mb-2">{errors.tripName}</p>}
                <input
                  type="text"
                  value={formData.tripName}
                  onChange={(e) => handleChange('tripName', e.target.value)}
                  placeholder="e.g., Summer Adventure 2025"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Invite Friends */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Invite Friends (Optional)
                </label>
                <p className="text-xs text-text-secondary mb-3">
                  You can invite friends now or later from the trip page
                </p>
                {errors.inviteEmail && <p className="text-red-500 text-sm mb-2">{errors.inviteEmail}</p>}
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={addInviteEmail}
                  placeholder="Enter email and press Enter"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {formData.inviteEmails.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.inviteEmails.map((email, index) => (
                      <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-primary-light border border-primary/20 text-primary rounded-lg text-sm font-medium">
                        {email}
                        <button
                          type="button"
                          className="hover:text-primary-hover"
                          onClick={() => removeInviteEmail(email)}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Group Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Max Members */}
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Maximum Members
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={formData.maxMembers}
                      onChange={(e) => handleChange('maxMembers', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg min-w-[60px] justify-center">
                      <span className="font-medium text-gray-900">{formData.maxMembers}</span>
                    </div>
                  </div>
                </div>

                {/* Require All Votes */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer pt-6">
                    <input
                      type="checkbox"
                      checked={formData.requireAllVotes}
                      onChange={(e) => handleChange('requireAllVotes', e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-text-main">
                        Require all votes
                      </span>
                      <p className="text-xs text-text-secondary mt-1">
                        Everyone must vote before finalizing
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MANDATORY FIELDS */}
        <div className="space-y-10">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <h2 className="text-xl font-bold text-text-main">Essential Details</h2>
          </div>

          {/* 1. DESTINATION (moved to first position) */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <Globe size={20} className="text-primary" />
              Where do you want to go?
            </label>
            <p className="text-sm text-text-secondary mb-3">
              Leave empty to let AI suggest destinations, or search for a specific city
            </p>
            {errors.destination && <p className="text-red-500 text-sm mb-2">{errors.destination}</p>}
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
              placeholder="Search: Bali, Tokyo, Barcelona... or leave empty for AI suggestions"
            />
          </div>

          {/* 2. TRIP TYPE (new) */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <Users size={20} className="text-primary" />
              Who's traveling?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {TRIP_TYPES.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${formData.tripType === option.value
                      ? 'bg-primary-light border-primary text-primary font-medium ring-2 ring-primary/20'
                      : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                    }`}
                  onClick={() => handleTripTypeChange(option.value)}
                >
                  <option.icon size={24} />
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs opacity-70">{option.description}</span>
                </button>
              ))}
            </div>
            {/* Travelers count - auto-filled but adjustable */}
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-text-secondary">Number of travelers:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-50"
                  onClick={() => handleChange('travelers', Math.max(1, formData.travelers - 1))}
                  disabled={formData.travelers <= 1}
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold text-text-main">{formData.travelers}</span>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-50"
                  onClick={() => handleChange('travelers', Math.min(20, formData.travelers + 1))}
                  disabled={formData.travelers >= 20}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 3. BUDGET with slider + presets */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <DollarSign size={20} className="text-primary" />
              Budget per person
            </label>
            {errors.budget && <p className="text-red-500 text-sm mb-2">{errors.budget}</p>}

            {/* Quick presets */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {BUDGET_CONFIG.presets.map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  className={`p-3 rounded-xl border transition-all text-center ${formData.budget === preset.value
                      ? 'bg-primary-light border-primary text-primary ring-2 ring-primary/20'
                      : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                    }`}
                  onClick={() => handleChange('budget', preset.value)}
                >
                  <div className={`font-semibold ${preset.color}`}>{preset.label}</div>
                  <div className="text-xs opacity-70">{preset.description}</div>
                  <div className="text-sm font-medium mt-1">~€{preset.value}</div>
                </button>
              ))}
            </div>

            {/* Fine-tune slider */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-secondary">Fine-tune your budget:</span>
                <span className="text-xl font-bold text-primary">€{formData.budget}</span>
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
              <div className="flex justify-between text-xs text-text-secondary mt-2">
                <span>€{BUDGET_CONFIG.min}</span>
                <span>€{BUDGET_CONFIG.max}+</span>
              </div>
            </div>
          </div>

          {/* Date Mode Toggle */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <Calendar size={20} className="text-primary" />
              When do you want to travel?
            </label>
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  formData.dateMode === 'flexible'
                    ? 'bg-primary-light border-primary text-primary'
                    : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50'
                }`}
                onClick={() => handleChange('dateMode', 'flexible')}
              >
                <div className="font-semibold mb-1">Flexible Dates</div>
                <div className="text-sm opacity-80">I know the duration, AI finds the best time</div>
              </button>
              <button
                type="button"
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  formData.dateMode === 'fixed'
                    ? 'bg-primary-light border-primary text-primary'
                    : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50'
                }`}
                onClick={() => handleChange('dateMode', 'fixed')}
              >
                <div className="font-semibold mb-1">Fixed Dates</div>
                <div className="text-sm opacity-80">I have specific travel dates</div>
              </button>
            </div>

            {/* Flexible Mode: Duration + Optional Start Date */}
            {formData.dateMode === 'flexible' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Duration */}
                <div>
                  <label className="flex items-center gap-2 text-base font-medium text-text-main mb-3">
                    <Clock size={18} className="text-primary" />
                    Duration (days) <span className="text-red-500">*</span>
                  </label>
                  {errors.duration && <p className="text-red-500 text-sm mb-2">{errors.duration}</p>}
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="w-20 p-3 text-center text-lg font-medium border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleChange('duration', Math.min(30, formData.duration + 1))}
                      disabled={formData.duration >= 30}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Optional Start Date */}
                <div>
                  <label className="flex items-center gap-2 text-base font-medium text-text-main mb-3">
                    <Calendar size={18} className="text-text-secondary" />
                    Earliest departure (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="w-full md:w-64 p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-sm text-text-secondary mt-2">
                    Leave empty to let AI find the best time based on your preferences
                  </p>
                </div>
              </div>
            )}

            {/* Fixed Mode: Start Date + End Date */}
            {formData.dateMode === 'fixed' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-base font-medium text-text-main mb-3">
                      <Calendar size={18} className="text-primary" />
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    {errors.startDate && <p className="text-red-500 text-sm mb-2">{errors.startDate}</p>}
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleChange('startDate', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-base font-medium text-text-main mb-3">
                      <Calendar size={18} className="text-primary" />
                      End Date <span className="text-red-500">*</span>
                    </label>
                    {errors.endDate && <p className="text-red-500 text-sm mb-2">{errors.endDate}</p>}
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleChange('endDate', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Show calculated duration */}
                {formData.startDate && formData.endDate && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary bg-gray-50 p-3 rounded-lg">
                    <Clock size={16} />
                    <span>Trip duration: <strong className="text-text-main">{formData.duration} days</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Travel Vibe */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <Sparkles size={20} className="text-primary" />
              Travel Vibe <span className="text-red-500">*</span>
            </label>
            {errors.travelVibe && <p className="text-red-500 text-sm mb-2">{errors.travelVibe}</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {TRAVEL_VIBES.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${formData.travelVibe === option.value
                      ? 'bg-primary-light border-primary text-primary font-medium ring-2 ring-primary/20'
                      : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                    }`}
                  onClick={() => handleChange('travelVibe', option.value)}
                >
                  <option.icon size={24} />
                  <span className="text-sm text-center">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Travel Vibe Description - Revealed on click */}
          <div>
            {!showVibeDescription ? (
              <button
                type="button"
                onClick={() => setShowVibeDescription(true)}
                className="flex items-center gap-2 px-4 py-3 text-primary border border-dashed border-primary/50 rounded-xl hover:bg-primary-light hover:border-primary transition-colors w-full justify-center"
              >
                <PenLine size={18} />
                <span className="font-medium">Describe your vibe in your own words</span>
              </button>
            ) : (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-lg font-semibold text-text-main">
                    <PenLine size={20} className="text-primary" />
                    Your trip in your own words
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVibeDescription(false);
                      handleChange('travelVibeDescription', '');
                    }}
                    className="text-sm text-text-secondary hover:text-text-main"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-sm text-text-secondary mb-3">
                  Special occasion? Specific vibe? Tell us everything - this helps us find the perfect match!
                </p>
                <textarea
                  value={formData.travelVibeDescription}
                  onChange={(e) => handleChange('travelVibeDescription', e.target.value)}
                  placeholder="e.g., Romantic trip with my wife for her 50th birthday, looking for a peaceful place with good food and spa..."
                  className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none h-24"
                  maxLength={500}
                  autoFocus
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-text-secondary">{formData.travelVibeDescription.length}/500</span>
                </div>
              </div>
            )}
          </div>

          {/* Departure City */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <Plane size={20} className="text-primary" />
              Departure City
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center">
                    <Plane size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-text-main">{formData.originCityName}</div>
                    <div className="text-sm text-text-secondary">Code: {formData.originCity}</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
                className="px-4 py-3 text-sm font-medium text-primary border border-primary rounded-xl hover:bg-primary-light transition-colors"
              >
                Change
              </button>
            </div>
            <p className="text-sm text-text-secondary mt-2">
              This is set in your profile settings and used for flight searches
            </p>
          </div>

        </div>

        {/* OPTIONAL FILTERS - Collapsible */}
        <div className="mt-10 pt-8 border-t border-gray-100">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
            onClick={() => setShowOptionalFilters(!showOptionalFilters)}
          >
            <div className="flex items-center gap-3">
              {showOptionalFilters ? <ChevronDown size={20} className="text-text-secondary" /> : <ChevronRight size={20} className="text-text-secondary" />}
              <span className="font-semibold text-text-main">Optional Filters</span>
            </div>
            <span className="text-sm text-text-secondary">(Advanced preferences)</span>
          </button>

          {showOptionalFilters && (
            <div className="mt-6 space-y-10 animate-slide-down">
              {/* Preferred Weather */}
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
                  <Thermometer size={20} className="text-primary" />
                  Preferred Weather
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {WEATHER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${formData.preferredWeather === option.value
                          ? 'bg-primary-light border-primary text-primary font-medium'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('preferredWeather', option.value)}
                    >
                      <option.icon size={18} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Must Haves */}
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
                  <Target size={20} className="text-primary" />
                  Must-Have Activities
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {MUST_HAVE_ACTIVITIES.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${formData.mustHaves.includes(option.value)
                          ? 'bg-primary-light border-primary text-primary font-medium'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                        }`}
                      onClick={() => toggleMustHave(option.value)}
                    >
                      <option.icon size={24} />
                      <span className="text-sm text-center">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avoid List */}
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
                  <Ban size={20} className="text-primary" />
                  Places to Avoid
                </label>
                <input
                  type="text"
                  placeholder="Type a country or city and press Enter"
                  onKeyDown={addToAvoidList}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-3"
                />
                {formData.avoidList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.avoidList.map((item, index) => (
                      <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                        {item}
                        <button
                          type="button"
                          className="hover:text-red-800"
                          onClick={() => removeFromAvoidList(item)}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Max Flight Duration */}
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
                  <Plane size={20} className="text-primary" />
                  Maximum Flight Duration
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {FLIGHT_DURATION_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`p-3 rounded-xl border transition-all ${formData.maxFlightDuration === option.value
                          ? 'bg-primary-light border-primary text-primary font-medium'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('maxFlightDuration', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chatbot Tone */}
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
                  <Bot size={20} className="text-primary" />
                  AI Assistant Tone
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CHATBOT_TONES.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${formData.chatbotTone === option.value
                          ? 'bg-primary-light border-primary text-primary font-medium'
                          : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                        }`}
                      onClick={() => handleChange('chatbotTone', option.value)}
                    >
                      <option.icon size={24} />
                      <span className="text-sm text-center">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            <strong>Error:</strong> {errors.submit}
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-10 pt-8 border-t border-gray-100">
          {/* Usage indicator for solo trips */}
          {!formData.isGroupTrip && usageData && (
            <div className="mb-6 flex items-center justify-between">
              <SearchUsageWidget compact />
              {usageData.needsUpgrade && (
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Upgrade Now
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="px-6 py-3 bg-white text-text-secondary font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-8 py-3 font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                usageData?.needsUpgrade && !formData.isGroupTrip
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white shadow-primary/20 hover:bg-primary-hover disabled:opacity-70 disabled:cursor-not-allowed'
              }`}
              disabled={loading || (usageData?.needsUpgrade && !formData.isGroupTrip)}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {formData.isGroupTrip ? 'Creating Group Trip...' : 'Finding Your Perfect Trip...'}
                </>
              ) : usageData?.needsUpgrade && !formData.isGroupTrip ? (
                'Upgrade to Search'
              ) : (
                formData.isGroupTrip ? 'Create Group Trip' : 'Find My Perfect Trip'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateTrip;
