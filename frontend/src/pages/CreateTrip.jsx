// frontend/src/pages/CreateTrip.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { IntelligentDatePicker } from '../components/IntelligentDatePicker';
import './CreateTrip.css';

const TRAVEL_VIBES = [
  { label: 'Adventure & Nature', value: 'adventure', icon: '🏔️' },
  { label: 'Culture & History', value: 'cultural', icon: '🏛️' },
  { label: 'Beach & Relaxation', value: 'relaxation', icon: '🏖️' },
  { label: 'Urban & Shopping', value: 'urban', icon: '🏙️' },
  { label: 'Food & Gastronomy', value: 'food', icon: '🍽️' },
];

const BUDGET_PRESETS = [
  { label: '< €500', value: 500 },
  { label: '€500-1500', value: 1000 },
  { label: '€1500-3000', value: 2250 },
  { label: '> €3000', value: 4000 },
];

const WEATHER_OPTIONS = [
  { label: 'Hot', value: 'hot', icon: '☀️' },
  { label: 'Mild', value: 'mild', icon: '⛅' },
  { label: 'Cold', value: 'cold', icon: '❄️' },
  { label: 'Any', value: 'any', icon: '🌍' },
];

const MUST_HAVE_ACTIVITIES = [
  { label: 'Hiking', value: 'hiking', icon: '🥾' },
  { label: 'Museums', value: 'museums', icon: '🎨' },
  { label: 'Beach', value: 'beach', icon: '🏖️' },
  { label: 'Nightlife', value: 'nightlife', icon: '🍸' },
  { label: 'Adventure Sports', value: 'sports', icon: '🏄' },
  { label: 'Wellness', value: 'wellness', icon: '💆' },
  { label: 'Shopping', value: 'shopping', icon: '🛍️' },
  { label: 'Food Tours', value: 'food', icon: '🍽️' },
];

const FLIGHT_DURATION_OPTIONS = [
  { label: '3h', value: 3 },
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: 'Any', value: 24 },
];

const CHATBOT_TONES = [
  { label: 'Friendly', value: 'friendly', icon: '😊' },
  { label: 'Professional', value: 'professional', icon: '💼' },
  { label: 'Casual', value: 'casual', icon: '😎' },
  { label: 'Inspiring', value: 'inspiring', icon: '✨' },
];

function CreateTrip() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [showOptionalFilters, setShowOptionalFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(true);
  const [selectedSmartPeriod, setSelectedSmartPeriod] = useState(null);

  // Mandatory fields
  const [formData, setFormData] = useState({
    budget: 1000,
    duration: 7,
    startDate: '',
    endDate: '',
    travelers: 1,
    travelVibe: 'cultural',

    // Optional filters
    preferredWeather: 'any',
    mustHaves: [],
    avoidList: [],
    maxFlightDuration: 6,
    chatbotTone: 'friendly',
  });

  const [errors, setErrors] = useState({});

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

  // Handler for when user selects a smart period
  const handleSelectSmartPeriod = (period) => {
    console.log('📅 Selected smart period:', period);
    setSelectedSmartPeriod(period);
    setFormData(prev => ({
      ...prev,
      startDate: period.startDate,
      endDate: period.endDate,
      duration: period.duration,
    }));
    setShowDatePicker(false);
    // Scroll to form
    setTimeout(() => {
      document.querySelector('.trip-form-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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

  const validate = () => {
    const newErrors = {};

    // Budget is now OPTIONAL - no validation needed

    if (!formData.duration || formData.duration < 1 || formData.duration > 30) {
      newErrors.duration = 'Duration must be between 1 and 30 days';
    }

    // Dates are now OPTIONAL - no validation needed
    // But if both are provided, validate the relationship
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();

      // Transform data to match backend expectations
      const payload = {
        basic: {
          budget: formData.budget || 1500, // Default budget if not specified
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
          originCity: 'CDG', // Default to Paris CDG
          professionalStatus: 'salaried', // Default
          departureFlexibility: 'peu-importe',
        },
        chatbotPreferences: {
          tone: formData.chatbotTone,
        },
      };

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
        // Navigate to results page with recommendations
        navigate('/results', { state: { recommendations: data.recommendations } });
      } else {
        throw new Error(data.error || 'Failed to get recommendations');
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
      <div className="create-trip-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-trip-page">
      {loading && (
        <div className="trip-loading-modal">
          <div className="trip-loading-content">
            <div className="trip-loading-animation">
              <div className="plane-icon">✈️</div>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <h2>Finding Your Perfect Trip</h2>
            <div className="loading-steps">
              <div className="loading-step active">
                <div className="step-icon">🤖</div>
                <p>Analyzing your preferences...</p>
              </div>
              <div className="loading-step">
                <div className="step-icon">🌍</div>
                <p>Searching destinations worldwide...</p>
              </div>
              <div className="loading-step">
                <div className="step-icon">✈️</div>
                <p>Finding best flight options...</p>
              </div>
            </div>
            <p className="loading-tip">This usually takes 10-15 seconds</p>
          </div>
        </div>
      )}

      <div className="create-trip-header">
        <h1>Create Your Perfect Trip</h1>
        <p>Fill in the details below to get personalized recommendations</p>
      </div>

      {/* INTELLIGENT DATE PICKER */}
      {showDatePicker && (
        <div className="intelligent-picker-section">
          <IntelligentDatePicker onSelectPeriod={handleSelectSmartPeriod} />
          <div className="picker-actions">
            <button
              type="button"
              className="skip-picker-button"
              onClick={() => setShowDatePicker(false)}
            >
              Choisir mes dates manuellement
            </button>
          </div>
        </div>
      )}

      {!showDatePicker && selectedSmartPeriod && (
        <div className="selected-period-banner">
          <div className="banner-content">
            <span className="icon">✨</span>
            <div className="text">
              <strong>Période sélectionnée :</strong> {selectedSmartPeriod.title} ({new Date(selectedSmartPeriod.startDate).toLocaleDateString('fr-FR')} - {new Date(selectedSmartPeriod.endDate).toLocaleDateString('fr-FR')})
              <span className="savings-badge">💰 {selectedSmartPeriod.savings} d'économies</span>
            </div>
            <button
              type="button"
              className="change-dates-button"
              onClick={() => setShowDatePicker(true)}
            >
              Changer les dates
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-trip-form trip-form-container">
        {/* MANDATORY FIELDS */}
        <div className="mandatory-section">
          <h2 className="section-title">Essential Details</h2>

          {/* Budget */}
          <div className="form-section">
            <label className="section-label">
              <span className="label-icon">💰</span>
              Budget per person
            </label>
            {errors.budget && <p className="error-text">{errors.budget}</p>}
            <div className="budget-options">
              {BUDGET_PRESETS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`option-button ${formData.budget === option.value ? 'active' : ''}`}
                  onClick={() => handleChange('budget', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="form-section">
            <label className="section-label">
              <span className="label-icon">⏱️</span>
              Duration (days) <span className="required">*</span>
            </label>
            {errors.duration && <p className="error-text">{errors.duration}</p>}
            <div className="number-control">
              <button
                type="button"
                className="number-btn"
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
                className="number-input-center"
              />
              <button
                type="button"
                className="number-btn"
                onClick={() => handleChange('duration', Math.min(30, formData.duration + 1))}
                disabled={formData.duration >= 30}
              >
                +
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="form-section-row">
            <div className="form-section-half">
              <label className="section-label">
                <span className="label-icon">📅</span>
                Start Date
              </label>
              {errors.startDate && <p className="error-text">{errors.startDate}</p>}
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="date-input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-section-half">
              <label className="section-label">
                <span className="label-icon">📅</span>
                End Date
              </label>
              {errors.endDate && <p className="error-text">{errors.endDate}</p>}
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="date-input"
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <p style={{ marginTop: '-8px', marginBottom: '20px', fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
            💡 Laissez vide pour que nous trouvions automatiquement les meilleures dates selon vos disponibilités
          </p>

          {/* Travelers */}
          <div className="form-section">
            <label className="section-label">
              <span className="label-icon">👥</span>
              Number of Travelers <span className="required">*</span>
            </label>
            {errors.travelers && <p className="error-text">{errors.travelers}</p>}
            <div className="travelers-control">
              <div className="number-control">
                <button
                  type="button"
                  className="number-btn"
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
                  className="number-input-center"
                />
                <button
                  type="button"
                  className="number-btn"
                  onClick={() => handleChange('travelers', Math.min(20, formData.travelers + 1))}
                  disabled={formData.travelers >= 20}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="share-trip-btn"
                onClick={() => alert('Share trip feature coming soon!')}
              >
                <span className="label-icon">➕</span>
                Share trip / Add friend
              </button>
            </div>
          </div>

          {/* Travel Vibe */}
          <div className="form-section">
            <label className="section-label">
              <span className="label-icon">✨</span>
              Travel Vibe <span className="required">*</span>
            </label>
            {errors.travelVibe && <p className="error-text">{errors.travelVibe}</p>}
            <div className="style-options">
              {TRAVEL_VIBES.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`style-button ${formData.travelVibe === option.value ? 'active' : ''}`}
                  onClick={() => handleChange('travelVibe', option.value)}
                >
                  <span className="style-icon">{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OPTIONAL FILTERS - Collapsible */}
        <div className="optional-section">
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setShowOptionalFilters(!showOptionalFilters)}
          >
            <span className="toggle-icon">{showOptionalFilters ? '▼' : '▶'}</span>
            <span className="toggle-text">Optional Filters</span>
            <span className="toggle-hint">(Advanced preferences)</span>
          </button>

          {showOptionalFilters && (
            <div className="optional-content">
              {/* Preferred Weather */}
              <div className="form-section">
                <label className="section-label">
                  <span className="label-icon">🌡️</span>
                  Preferred Weather
                </label>
                <div className="weather-options">
                  {WEATHER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`option-button ${formData.preferredWeather === option.value ? 'active' : ''}`}
                      onClick={() => handleChange('preferredWeather', option.value)}
                    >
                      <span className="label-icon">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Must Haves */}
              <div className="form-section">
                <label className="section-label">
                  <span className="label-icon">🎯</span>
                  Must-Have Activities
                </label>
                <div className="activities-grid">
                  {MUST_HAVE_ACTIVITIES.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`activity-button ${formData.mustHaves.includes(option.value) ? 'active' : ''}`}
                      onClick={() => toggleMustHave(option.value)}
                    >
                      <span className="activity-icon">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avoid List */}
              <div className="form-section">
                <label className="section-label">
                  <span className="label-icon">🚫</span>
                  Places to Avoid
                </label>
                <input
                  type="text"
                  placeholder="Type a country or city and press Enter"
                  onKeyDown={addToAvoidList}
                  className="text-input"
                />
                {formData.avoidList.length > 0 && (
                  <div className="tags-container">
                    {formData.avoidList.map((item, index) => (
                      <span key={index} className="tag">
                        {item}
                        <button
                          type="button"
                          className="tag-remove"
                          onClick={() => removeFromAvoidList(item)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Max Flight Duration */}
              <div className="form-section">
                <label className="section-label">
                  <span className="label-icon">✈️</span>
                  Maximum Flight Duration
                </label>
                <div className="flight-options">
                  {FLIGHT_DURATION_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`option-button ${formData.maxFlightDuration === option.value ? 'active' : ''}`}
                      onClick={() => handleChange('maxFlightDuration', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chatbot Tone */}
              <div className="form-section">
                <label className="section-label">
                  <span className="label-icon">🤖</span>
                  AI Assistant Tone
                </label>
                <div className="tone-options">
                  {CHATBOT_TONES.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`tone-button ${formData.chatbotTone === option.value ? 'active' : ''}`}
                      onClick={() => handleChange('chatbotTone', option.value)}
                    >
                      <span className="tone-icon">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="error-banner">
            <strong>Error:</strong> {errors.submit}
          </div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/dashboard')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Finding Your Perfect Trip...' : 'Find My Perfect Trip'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTrip;
