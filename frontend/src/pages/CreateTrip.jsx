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
  X, Loader2
} from 'lucide-react';
import { SearchLoadingScreen } from '../components/SkeletonLoaders';
import DestinationAutocomplete from '../components/DestinationAutocomplete';

const TRAVEL_VIBES = [
  { label: 'Adventure & Nature', value: 'adventure', icon: Mountain },
  { label: 'Culture & History', value: 'cultural', icon: Landmark },
  { label: 'Beach & Relaxation', value: 'relaxation', icon: Palmtree },
  { label: 'Urban & Shopping', value: 'urban', icon: Building2 },
  { label: 'Food & Gastronomy', value: 'food', icon: Utensils },
];

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

  // Mandatory fields
  const [formData, setFormData] = useState({
    budget: 1000,
    duration: 7,
    startDate: '',
    endDate: '',
    travelers: 1,
    travelVibe: 'cultural',
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

  const [errors, setErrors] = useState({});
  const [currentEmail, setCurrentEmail] = useState('');

  // Load user preferences on mount
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  // Auto-calculate end date when start date or duration changes
  useEffect(() => {
    if (formData.startDate && formData.duration) {
      const start = new Date(formData.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + formData.duration - 1);

      const endDateStr = end.toISOString().split('T')[0];
      if (endDateStr !== formData.endDate) {
        setFormData(prev => ({ ...prev, endDate: endDateStr }));
      }
    }
  }, [formData.startDate, formData.duration]);

  const loadUserPreferences = async () => {
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/users/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setFormData(prev => ({
            ...prev,
            budget: data.preferences.budget || 1000,
            travelVibe: data.preferences.travelStyle || 'cultural',
            travelers: data.preferences.defaultTravelers || 1,
            maxFlightDuration: data.preferences.maxFlightHours || 6,
            mustHaves: data.preferences.activities || [],
          }));
        }
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

    if (!formData.duration || formData.duration < 1 || formData.duration > 30) {
      newErrors.duration = 'Duration must be between 1 and 30 days';
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
            flexibleDates: true,
            preferredMonths: [],
            originCity: 'CDG',
            professionalStatus: 'salaried',
            departureFlexibility: 'peu-importe',
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
          // Streaming mode - results appear progressively
          const streamingResults = [];

          const response = await fetch(`${API_URL}/api/travel/recommendations/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error('Streaming request failed');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // Helper to process SSE chunks
          const processChunk = (chunk) => {
            if (!chunk.trim()) return false;

            const eventMatch = chunk.match(/event: (\w+)/);
            const dataMatch = chunk.match(/data: (.+)/);

            if (eventMatch && dataMatch) {
              const eventType = eventMatch[1];
              try {
                const eventData = JSON.parse(dataMatch[1]);

                if (eventType === 'status') {
                  // Update loading stage based on backend status
                  if (eventData.stage === 'discovering') setLoadingStage('searching');
                  if (eventData.stage === 'discovered') setLoadingStage('flights');
                } else if (eventType === 'recommendation') {
                  // A recommendation is ready - extract data from wrapper
                  if (eventData.data) {
                    streamingResults.push(eventData.data);
                    setLoadingStage('optimizing');
                    console.log(`✅ Received recommendation ${eventData.index}/${eventData.total}`);
                  }
                } else if (eventType === 'complete') {
                  // All done
                  console.log(`✅ Streaming complete: ${streamingResults.length} results`);
                  return true; // Signal completion
                } else if (eventType === 'error') {
                  throw new Error(eventData.message || 'Streaming error');
                }
              } catch (parseError) {
                console.warn('SSE parse error:', parseError);
              }
            }
            return false;
          };

          let isComplete = false;

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Process any remaining buffer when stream ends
              if (buffer.trim()) {
                const finalChunks = buffer.split('\n\n');
                for (const chunk of finalChunks) {
                  if (processChunk(chunk)) {
                    isComplete = true;
                  }
                }
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const chunk of lines) {
              if (processChunk(chunk)) {
                isComplete = true;
              }
            }
          }

          // Navigate to results if we got any
          if (streamingResults.length > 0) {
            navigate('/results', { state: { recommendations: streamingResults } });
          } else if (!isComplete) {
            throw new Error('No recommendations received');
          }
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
                      <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium">
                        {email}
                        <button
                          type="button"
                          className="hover:text-blue-900"
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

          {/* Budget */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <DollarSign size={20} className="text-primary" />
              Budget per person
            </label>
            {errors.budget && <p className="text-red-500 text-sm mb-2">{errors.budget}</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BUDGET_PRESETS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-4 rounded-xl border transition-all ${formData.budget === option.value
                      ? 'bg-primary-light border-primary text-primary font-medium ring-2 ring-primary/20'
                      : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:bg-gray-50'
                    }`}
                  onClick={() => handleChange('budget', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <Clock size={20} className="text-primary" />
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

          {/* Dates */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
                <Calendar size={20} className="text-primary" />
                Start Date
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
              <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
                <Calendar size={20} className="text-primary" />
                End Date
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

          <p className="text-sm text-text-secondary italic bg-blue-50 p-3 rounded-lg border border-blue-100">
            💡 Leave dates empty to let AI find the best time for you based on your preferences.
          </p>

          {/* Travelers */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <Users size={20} className="text-primary" />
              Number of Travelers <span className="text-red-500">*</span>
            </label>
            {errors.travelers && <p className="text-red-500 text-sm mb-2">{errors.travelers}</p>}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleChange('travelers', Math.max(1, formData.travelers - 1))}
                  disabled={formData.travelers <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.travelers}
                  onChange={(e) => handleChange('travelers', parseInt(e.target.value) || 1)}
                  className="w-20 p-3 text-center text-lg font-medium border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 text-text-main hover:bg-gray-50 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleChange('travelers', Math.min(20, formData.travelers + 1))}
                  disabled={formData.travelers >= 20}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3 bg-white border border-primary text-primary rounded-xl font-medium hover:bg-primary-light transition-colors"
                onClick={() => alert('Share trip feature coming soon!')}
              >
                <Plus size={18} />
                Share trip / Add friend
              </button>
            </div>
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

          {/* Specific Destination (Optional) */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-text-main mb-4">
              <Globe size={20} className="text-primary" />
              Specific Destination (Optional)
            </label>
            <p className="text-sm text-text-secondary mb-3">
              💡 Leave empty to let AI suggest destinations, or search for a city
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
              placeholder="Search: Bali, Tokyo, Barcelona..."
            />
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
        <div className="mt-10 pt-8 border-t border-gray-100 flex justify-end gap-4">
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
            className="px-8 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {formData.isGroupTrip ? 'Creating Group Trip...' : 'Finding Your Perfect Trip...'}
              </>
            ) : (
              formData.isGroupTrip ? 'Create Group Trip' : 'Find My Perfect Trip'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTrip;
