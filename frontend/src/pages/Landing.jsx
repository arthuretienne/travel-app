// frontend/src/pages/Landing.jsx
import { useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/create-trip');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  // Removed automatic onboarding check from Landing page
  // The check is done in Dashboard.jsx instead to avoid redirect loops
  // Users who need onboarding will be redirected when they try to access Dashboard

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="logo">Travel AI</div>
          <div className="header-actions">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn-signin">Sign In</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Your AI-Powered
            <br />
            <span className="gradient-text">Travel Companion</span>
          </h1>
          <p className="hero-subtitle">
            Discover personalized travel destinations that match your preferences, budget, and style.
            Let AI find your next adventure.
          </p>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-cta">Get Started Free</button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className="cta-group">
              <button className="btn-cta" onClick={handleGoToDashboard}>
                Go to Dashboard
              </button>
              <button className="btn-cta-secondary" onClick={handleGetStarted}>
                Create New Trip
              </button>
            </div>
          </SignedIn>

          <div className="hero-badges">
            <div className="badge">AI-Powered</div>
            <div className="badge">Personalized</div>
            <div className="badge">Free to Use</div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-card card-1">
            <div className="card-icon">🏖️</div>
            <div className="card-title">Beach Paradise</div>
            <div className="card-price">from 450€</div>
          </div>
          <div className="visual-card card-2">
            <div className="card-icon">🏔️</div>
            <div className="card-title">Mountain Adventure</div>
            <div className="card-price">from 680€</div>
          </div>
          <div className="visual-card card-3">
            <div className="card-icon">🏛️</div>
            <div className="card-title">Cultural Journey</div>
            <div className="card-price">from 520€</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Tell Us Your Preferences</h3>
            <p>Answer a few questions about your travel style, budget, and interests</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Finds Perfect Matches</h3>
            <p>Our AI analyzes thousands of destinations and flights to find your ideal trips</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✈️</div>
            <h3>Book Your Adventure</h3>
            <p>Get personalized recommendations with real flight prices and booking links</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <h2 className="section-title">Why Choose Travel AI?</h2>
        <div className="benefits-grid">
          <div className="benefit-item">
            <div className="benefit-icon">💰</div>
            <div className="benefit-content">
              <h4>Best Prices</h4>
              <p>Real-time flight data from Amadeus API</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">🎯</div>
            <div className="benefit-content">
              <h4>Personalized</h4>
              <p>Recommendations tailored to your profile</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">⚡</div>
            <div className="benefit-content">
              <h4>Fast & Easy</h4>
              <p>Get results in seconds, not hours</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">🌍</div>
            <div className="benefit-content">
              <h4>Global Coverage</h4>
              <p>Destinations worldwide</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Find Your Next Adventure?</h2>
          <p>Join thousands of travelers discovering their perfect destinations</p>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-cta-large">Start Planning Now</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <button className="btn-cta-large" onClick={handleGetStarted}>
              Start Planning Now
            </button>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2025 Travel AI. Powered by Claude AI & Amadeus.</p>
      </footer>
    </div>
  );
}

export default Landing;
