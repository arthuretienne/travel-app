// frontend/src/App.jsx
import { useState } from 'react';
import Onboarding from './components/Onboarding/Onboarding';
import Results from './components/Results/Results';
import LoadingState from './components/Loading/LoadingState';
import { API_URL } from './api.js';
import './App.css';

function App() {
  const [step, setStep] = useState('onboarding'); // 'onboarding' | 'loading' | 'results'
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (userProfile) => {
    setStep('loading');
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/travel/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userProfile),
      });

      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations);
        setStep('results');
      } else {
        throw new Error(data.error || 'Failed to get recommendations');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setStep('onboarding');
    }
  };

  const handleReset = () => {
    setStep('onboarding');
    setRecommendations(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌍 Travel AI</h1>
        <p>Your personal AI travel advisor</p>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        {step === 'onboarding' && (
          <Onboarding onSubmit={handleSubmit} />
        )}

        {step === 'loading' && (
          <LoadingState />
        )}

        {step === 'results' && recommendations && (
          <Results 
            recommendations={recommendations}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

export default App;