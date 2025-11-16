// frontend/src/components/Onboarding/OnboardingNew.jsx
import { useState } from 'react';
import './OnboardingNew.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CITIES = [
  { name: 'Paris', code: 'PAR' },
  { name: 'Lyon', code: 'LYS' },
  { name: 'Marseille', code: 'MRS' },
  { name: 'Nice', code: 'NCE' },
  { name: 'Toulouse', code: 'TLS' },
  { name: 'Bordeaux', code: 'BOD' },
  { name: 'Nantes', code: 'NTE' },
  { name: 'Strasbourg', code: 'SXB' },
];

function OnboardingNew({ onSubmit }) {
  const [formData, setFormData] = useState({
    budget: 1500,
    style: 'cultural',
    preferredMonths: [],
    maxFlightHours: 6,
    activities: [],
    destinationPreference: 'europe',
    originCity: 'PAR',
    travelers: 1,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user interacts
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const toggleMonth = (month) => {
    setFormData(prev => ({
      ...prev,
      preferredMonths: prev.preferredMonths.includes(month)
        ? prev.preferredMonths.filter(m => m !== month)
        : [...prev.preferredMonths, month]
    }));
  };

  const toggleActivity = (activity) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (formData.preferredMonths.length === 0) {
      newErrors.preferredMonths = 'Please select at least one month';
    }

    if (formData.activities.length === 0) {
      newErrors.activities = 'Please select at least one activity';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Transform data to match backend expectations
    const payload = {
      basic: {
        originCity: formData.originCity,
        travelers: formData.travelers,
      },
      preferences: {
        travelStyle: formData.style,
        activities: formData.activities,
        destinationTypes: [formData.destinationPreference],
      },
      constraints: {
        budget: formData.budget,
        maxFlightHours: formData.maxFlightHours,
      },
      availability: {
        preferredMonths: formData.preferredMonths,
        flexibleDates: true,
      },
    };

    onSubmit(payload);
  };

  return (
    <div className="onboarding-new">
      <div className="onboarding-header">
        <h2>Plan Your Perfect Trip</h2>
        <p>Tell us about your travel preferences and we'll find the best destinations for you</p>
      </div>

      <form onSubmit={handleSubmit} className="onboarding-form">
        {/* Budget */}
        <div className="form-section">
          <label className="section-label">
            <span className="label-icon">💰</span>
            What's your budget per person?
          </label>
          <div className="budget-options">
            {[
              { label: 'Budget (< €500)', value: 500 },
              { label: 'Moderate (€500-1500)', value: 1500 },
              { label: 'Comfortable (€1500-3000)', value: 3000 },
              { label: 'Luxury (> €3000)', value: 5000 },
            ].map(option => (
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

        {/* Travel Style */}
        <div className="form-section">
          <label className="section-label">
            <span className="label-icon">✨</span>
            What type of experience are you looking for?
          </label>
          <div className="style-options">
            {[
              { label: 'Adventure & Nature', value: 'adventure', icon: '🏔️' },
              { label: 'Culture & History', value: 'cultural', icon: '🏛️' },
              { label: 'Beach & Relaxation', value: 'relaxation', icon: '🏖️' },
              { label: 'Urban & Shopping', value: 'urban', icon: '🏙️' },
              { label: 'Food & Gastronomy', value: 'food', icon: '🍽️' },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                className={`style-button ${formData.style === option.value ? 'active' : ''}`}
                onClick={() => handleChange('style', option.value)}
              >
                <span className="style-icon">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Months */}
        <div className="form-section">
          <label className="section-label">
            <span className="label-icon">📅</span>
            When do you want to travel? (Select one or more months)
          </label>
          {errors.preferredMonths && <p className="error-text">{errors.preferredMonths}</p>}
          <div className="months-grid">
            {MONTHS.map(month => (
              <button
                key={month}
                type="button"
                className={`month-button ${formData.preferredMonths.includes(month) ? 'active' : ''}`}
                onClick={() => toggleMonth(month)}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Flight Duration */}
        <div className="form-section">
          <label className="section-label">
            <span className="label-icon">✈️</span>
            Maximum flight duration you're comfortable with?
          </label>
          <div className="flight-options">
            {[
              { label: 'Short (< 3h)', value: 3 },
              { label: 'Medium (3-6h)', value: 6 },
              { label: 'Long (6-12h)', value: 12 },
              { label: 'Any duration', value: 24 },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                className={`option-button ${formData.maxFlightHours === option.value ? 'active' : ''}`}
                onClick={() => handleChange('maxFlightHours', option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div className="form-section">
          <label className="section-label">
            <span className="label-icon">🎯</span>
            What activities interest you? (Select all that apply)
          </label>
          {errors.activities && <p className="error-text">{errors.activities}</p>}
          <div className="activities-grid">
            {[
              { label: 'Hiking & Nature', value: 'hiking', icon: '🥾' },
              { label: 'Museums & Culture', value: 'museums', icon: '🎨' },
              { label: 'Beach & Swimming', value: 'beach', icon: '🏊' },
              { label: 'Nightlife & Bars', value: 'nightlife', icon: '🍸' },
              { label: 'Sports & Adventure', value: 'sports', icon: '🏄' },
              { label: 'Spa & Wellness', value: 'wellness', icon: '💆' },
              { label: 'Shopping', value: 'shopping', icon: '🛍️' },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                className={`activity-button ${formData.activities.includes(option.value) ? 'active' : ''}`}
                onClick={() => toggleActivity(option.value)}
              >
                <span className="activity-icon">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Region Preference */}
        <div className="form-section">
          <label className="section-label">
            <span className="label-icon">🌍</span>
            Which region of the world attracts you?
          </label>
          <div className="region-options">
            {[
              { label: 'Europe', value: 'europe', icon: '🇪🇺' },
              { label: 'Asia', value: 'asia', icon: '🌏' },
              { label: 'Americas', value: 'americas', icon: '🌎' },
              { label: 'Africa', value: 'africa', icon: '🌍' },
              { label: 'Oceania', value: 'oceania', icon: '🏝️' },
              { label: 'Surprise me!', value: 'any', icon: '🎲' },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                className={`region-button ${formData.destinationPreference === option.value ? 'active' : ''}`}
                onClick={() => handleChange('destinationPreference', option.value)}
              >
                <span className="region-icon">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Origin & Travelers */}
        <div className="form-section-row">
          <div className="form-section-half">
            <label className="section-label">
              <span className="label-icon">📍</span>
              Departure city
            </label>
            <select
              value={formData.originCity}
              onChange={(e) => handleChange('originCity', e.target.value)}
              className="select-input"
            >
              {CITIES.map(city => (
                <option key={city.code} value={city.code}>
                  {city.name} ({city.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-section-half">
            <label className="section-label">
              <span className="label-icon">👥</span>
              Number of travelers
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.travelers}
              onChange={(e) => handleChange('travelers', parseInt(e.target.value))}
              className="number-input"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button type="submit" className="btn-primary btn-submit">
            Find My Perfect Trips 🚀
          </button>
        </div>
      </form>
    </div>
  );
}

export default OnboardingNew;
