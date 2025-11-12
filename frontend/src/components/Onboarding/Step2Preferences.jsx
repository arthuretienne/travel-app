// frontend/src/components/Onboarding/Step2Preferences.jsx
import { useState, useEffect } from 'react';

function Step2Preferences({ data, onUpdate, onNext, onPrev }) {
  const [formData, setFormData] = useState({
    climate: data.climate || 'peu-importe',
    accommodation: data.accommodation || 'hotel',
    pace: data.pace || 'equilibre',
    gastronomy: data.gastronomy || 'important',
    natureVsCity: data.natureVsCity || 50,
    nightlife: data.nightlife || 'secondaire',
    activitiesBudget: data.activitiesBudget || 20,
    avoidCrowds: data.avoidCrowds || false
  });

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  return (
    <div className="step-container">
      <h2>🎨 Your Travel Preferences</h2>

      <div className="form-group">
        <label>Preferred Climate</label>
        <div className="button-group">
          {[
            { value: 'chaud', label: '☀️ Hot' },
            { value: 'tempere', label: '🌤️ Mild' },
            { value: 'froid', label: '❄️ Cold' },
            { value: 'peu-importe', label: '🎲 Any' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.climate === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, climate: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Accommodation Type</label>
        <div className="button-group">
          {[
            { value: 'hotel', label: '🏨 Hotel' },
            { value: 'auberge', label: '🏠 Hostel' },
            { value: 'airbnb', label: '🏡 Airbnb' },
            { value: 'mixte', label: '🎲 Mix' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.accommodation === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, accommodation: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Travel Pace</label>
        <div className="button-group">
          {[
            { value: 'relax', label: '🧘 Relaxed' },
            { value: 'equilibre', label: '⚖️ Balanced' },
            { value: 'intense', label: '⚡ Intense' },
            { value: 'aventure', label: '🏃 Adventure' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.pace === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, pace: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Food Importance</label>
        <div className="button-group">
          {[
            { value: 'tres-important', label: '🍽️ Very Important' },
            { value: 'important', label: '🍴 Important' },
            { value: 'secondaire', label: '🥪 Secondary' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.gastronomy === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, gastronomy: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Nature vs City ({formData.natureVsCity}% nature)</label>
        <div className="slider-container">
          <span>🏙️ City</span>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.natureVsCity}
            onChange={(e) => setFormData({ ...formData, natureVsCity: parseInt(e.target.value) })}
          />
          <span>🌲 Nature</span>
        </div>
      </div>

      <div className="form-group">
        <label>Activities Budget</label>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="40"
            step="5"
            value={formData.activitiesBudget}
            onChange={(e) => setFormData({ ...formData, activitiesBudget: parseInt(e.target.value) })}
          />
          <span className="slider-value">{formData.activitiesBudget}% of total</span>
        </div>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.avoidCrowds}
            onChange={(e) => setFormData({ ...formData, avoidCrowds: e.target.checked })}
          />
          <span>Avoid tourist crowds</span>
        </label>
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={onPrev}>
          ← Back
        </button>
        <button className="btn-primary" onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

export default Step2Preferences;