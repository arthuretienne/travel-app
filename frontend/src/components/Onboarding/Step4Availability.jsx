import React, { useState, useEffect } from 'react';

function Step4Availability({ data = {}, onUpdate = () => {}, onSubmit = () => {}, onPrev = () => {} }) {
  const [formData, setFormData] = useState({
    originCity: (data.originCity || 'CDG').toUpperCase(),
    professionalStatus: data.professionalStatus || 'salarié',
    idealDuration: data.idealDuration || '1-semaine',
    departureFlexibility: data.departureFlexibility || 'peu-importe',
  });

  useEffect(() => {
    onUpdate(formData);
  }, [formData, onUpdate]);

  const durationOptions = [
    { value: '3-5-jours', label: '3-5 days' },
    { value: '1-semaine', label: '1 week' },
    { value: '2-semaines', label: '2 weeks' },
    { value: 'flexible', label: 'Flexible' },
  ];

  return (
    <div className="step-container">
      <div className="step-content">
        <h2>📅 When can you travel?</h2>
        <p className="step-description">Tell us about your travel preferences and we'll find the best options for you.</p>

        <div className="form-group">
          <label htmlFor="originCity">Origin City (Airport Code)</label>
          <input
            id="originCity"
            type="text"
            value={formData.originCity}
            onChange={(e) => setFormData({ ...formData, originCity: e.target.value.toUpperCase() })}
            placeholder="CDG, ORY, LHR..."
            maxLength={3}
            className="text-input"
          />
          <small>3-letter IATA code (e.g., CDG for Paris, LHR for London)</small>
        </div>

        <div className="form-group">
          <label htmlFor="professionalStatus">Professional Status</label>
          <select
            id="professionalStatus"
            value={formData.professionalStatus}
            onChange={(e) => setFormData({ ...formData, professionalStatus: e.target.value })}
            className="select-input"
          >
            <option value="salarié">Employee</option>
            <option value="freelance">Freelance</option>
            <option value="étudiant">Student</option>
            <option value="retraité">Retired</option>
            <option value="autre">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Ideal trip duration</label>
          <div className="button-group">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={"option-button " + (formData.idealDuration === option.value ? 'active' : '')}
                onClick={() => setFormData({ ...formData, idealDuration: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Departure preference</label>
          <div className="button-group">
            <button
              type="button"
              className={"option-button " + (formData.departureFlexibility === 'semaine' ? 'active' : '')}
              onClick={() => setFormData({ ...formData, departureFlexibility: 'semaine' })}
            >
              📅 Weekday
            </button>
            <button
              type="button"
              className={"option-button " + (formData.departureFlexibility === 'weekend' ? 'active' : '')}
              onClick={() => setFormData({ ...formData, departureFlexibility: 'weekend' })}
            >
              🎉 Weekend
            </button>
            <button
              type="button"
              className={"option-button " + (formData.departureFlexibility === 'peu-importe' ? 'active' : '')}
              onClick={() => setFormData({ ...formData, departureFlexibility: 'peu-importe' })}
            >
              🎲 Any
            </button>
          </div>
        </div>

        <div className="nav-buttons">
          <button type="button" className="back-button" onClick={onPrev}>
            ⬅️ Back
          </button>
          <button type="button" className="next-button" onClick={() => onSubmit(formData)}>
            Find Destinations 🌍
          </button>
        </div>
      </div>
    </div>
  );
}

export default Step4Availability;
