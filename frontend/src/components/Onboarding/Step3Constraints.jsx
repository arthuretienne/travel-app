// frontend/src/components/Onboarding/Step3Constraints.jsx
import { useState, useEffect } from 'react';

function Step3Constraints({ data, onUpdate, onNext, onPrev }) {
  const [formData, setFormData] = useState({
    languages: data.languages || 'peu-importe',
    security: data.security || 'important',
    visa: data.visa || 'eviter',
    mobility: data.mobility || 'une-base',
    travelers: data.travelers || 'solo'
  });

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  return (
    <div className="step-container">
      <h2>⚙️ Practical Constraints</h2>

      <div className="form-group">
        <label>Language Preference</label>
        <div className="button-group">
          {[
            { value: 'francophone', label: '🇫🇷 French-speaking' },
            { value: 'anglophone', label: '🇬🇧 English-speaking' },
            { value: 'peu-importe', label: '🌍 Any' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.languages === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, languages: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Safety Level</label>
        <div className="button-group">
          {[
            { value: 'tres-important', label: '🛡️ Very Important' },
            { value: 'important', label: '✅ Important' },
            { value: 'peu-importe', label: '🎲 Any' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.security === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, security: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Visa Requirements</label>
        <div className="button-group">
          {[
            { value: 'eviter', label: '❌ Avoid' },
            { value: 'simple-ok', label: '✅ Simple OK' },
            { value: 'peu-importe', label: '🌍 Any' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.visa === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, visa: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Travel Mobility</label>
        <div className="button-group">
          {[
            { value: 'une-base', label: '🏨 One Base' },
            { value: 'mixte', label: '🎒 Mixed' },
            { value: 'multi-villes', label: '🚗 Multi-City' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.mobility === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, mobility: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Traveling With</label>
        <div className="button-group">
          {[
            { value: 'solo', label: '🚶 Solo' },
            { value: 'couple', label: '💑 Couple' },
            { value: 'famille', label: '👨‍👩‍👧‍👦 Family' },
            { value: 'groupe', label: '👥 Group' }
          ].map(option => (
            <button
              key={option.value}
              className={`option-button ${formData.travelers === option.value ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, travelers: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
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

export default Step3Constraints;