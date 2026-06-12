// frontend/src/components/Onboarding/Step1Basic.jsx
import { useState, useEffect } from 'react';
import { formatEUR } from '../../utils/format';

function Step1Basic({ data, onUpdate, onNext }) {
  const [formData, setFormData] = useState({
    budget: data.budget || 1000,
    style: data.style || 'confort',
    activities: data.activities || [],
    maxFlightHours: data.maxFlightHours || 8,
    destinationPreference: data.destinationPreference || 'mixte'
  });

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  const handleActivityToggle = (activity) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  const activities = [
    { id: 'culture', label: '🎭 Culture', icon: '🏛️' },
    { id: 'sport', label: '⚽ Sport', icon: '🏃' },
    { id: 'plage', label: '🏖️ Beach', icon: '🌊' },
    { id: 'nature', label: '🌲 Nature', icon: '⛰️' },
    { id: 'gastro', label: '🍽️ Food', icon: '🍴' },
    { id: 'shopping', label: '🛍️ Shopping', icon: '🏬' },
    { id: 'montagne', label: '⛰️ Mountains', icon: '🗻' },
    { id: 'histoire', label: '📚 History', icon: '🏰' }
  ];

  const canProceed = formData.activities.length > 0;

  return (
    <div className="step-container">
      <h2>✈️ Let's start with the basics</h2>

      <div className="form-group">
        <label>Budget (total per trip)</label>
        <div className="slider-container">
          <input
            type="range"
            min="300"
            max="3000"
            step="50"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
          />
          <span className="slider-value">{formatEUR(formData.budget)}</span>
        </div>
      </div>

      <div className="form-group">
        <label>Travel Style</label>
        <div className="button-group">
          {['backpacker', 'confort', 'aventure', 'luxe'].map(style => (
            <button
              key={style}
              className={`option-button ${formData.style === style ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, style })}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>What activities interest you? (select all that apply)</label>
        <div className="activity-grid">
          {activities.map(activity => (
            <button
              key={activity.id}
              className={`activity-button ${formData.activities.includes(activity.id) ? 'active' : ''}`}
              onClick={() => handleActivityToggle(activity.id)}
            >
              <span className="activity-icon">{activity.icon}</span>
              <span className="activity-label">{activity.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Maximum flight duration</label>
        <div className="slider-container">
          <input
            type="range"
            min="2"
            max="12"
            step="1"
            value={formData.maxFlightHours}
            onChange={(e) => setFormData({ ...formData, maxFlightHours: parseInt(e.target.value) })}
          />
          <span className="slider-value">{formData.maxFlightHours}h</span>
        </div>
      </div>

      <div className="form-group">
        <label>Destination preference</label>
        <div className="button-group">
          <button
            className={`option-button ${formData.destinationPreference === 'populaires' ? 'active' : ''}`}
            onClick={() => setFormData({ ...formData, destinationPreference: 'populaires' })}
          >
            🔥 Popular
          </button>
          <button
            className={`option-button ${formData.destinationPreference === 'mixte' ? 'active' : ''}`}
            onClick={() => setFormData({ ...formData, destinationPreference: 'mixte' })}
          >
            🎲 Mix
          </button>
          <button
            className={`option-button ${formData.destinationPreference === 'insolites' ? 'active' : ''}`}
            onClick={() => setFormData({ ...formData, destinationPreference: 'insolites' })}
          >
            💎 Off-beaten
          </button>
        </div>
      </div>

      <div className="step-actions">
        <button 
          className="btn-primary" 
          onClick={onNext}
          disabled={!canProceed}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default Step1Basic;