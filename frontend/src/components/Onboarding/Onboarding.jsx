// frontend/src/components/Onboarding/Onboarding.jsx
import { useState } from 'react';
import Step1Basic from './Step1Basic';
import Step2Preferences from './Step2Preferences';
import Step3Constraints from './Step3Constraints';
import Step4Availability from './Step4Availability';
import './Onboarding.css';

function Onboarding({ onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    basic: {},
    preferences: {},
    constraints: {},
    availability: {}
  });

  const updateFormData = (section, data) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const progress = (currentStep / 4) * 100;

  return (
    <div className="onboarding">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="step-indicator">
        Step {currentStep} of 4 ({Math.round(progress)}%)
      </div>

      {currentStep === 1 && (
        <Step1Basic
          data={formData.basic}
          onUpdate={(data) => updateFormData('basic', data)}
          onNext={nextStep}
        />
      )}

      {currentStep === 2 && (
        <Step2Preferences
          data={formData.preferences}
          onUpdate={(data) => updateFormData('preferences', data)}
          onNext={nextStep}
          onPrev={prevStep}
        />
      )}

      {currentStep === 3 && (
        <Step3Constraints
          data={formData.constraints}
          onUpdate={(data) => updateFormData('constraints', data)}
          onNext={nextStep}
          onPrev={prevStep}
        />
      )}

      {currentStep === 4 && (
        <Step4Availability
          data={formData.availability}
          onUpdate={(data) => updateFormData('availability', data)}
          onSubmit={handleSubmit}
          onPrev={prevStep}
        />
      )}
    </div>
  );
}

export default Onboarding;