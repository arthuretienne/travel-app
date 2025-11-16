// frontend/src/pages/Results.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import './Results.css';

function Results() {
  const { searchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingTripId, setSavingTripId] = useState(null);

  useEffect(() => {
    // If recommendations are passed via state, use them directly
    if (location.state?.recommendations) {
      setRecommendations(location.state.recommendations);
      setLoading(false);
    } else if (searchId) {
      // Otherwise fetch from API using searchId
      fetchRecommendations();
    } else {
      setLoading(false);
      setError('No recommendations available');
    }
  }, [searchId, location.state]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const token = await user?.getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/searches/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async (tripIndex) => {
    const trip = recommendations[tripIndex];
    setSavingTripId(tripIndex);

    try {
      const token = await user?.getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/searches/trips/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          searchId,
          tripData: trip,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save trip');
      }

      alert('Trip saved successfully!');
    } catch (err) {
      console.error('Error saving trip:', err);
      alert('Failed to save trip. Please try again.');
    } finally {
      setSavingTripId(null);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNewSearch = () => {
    navigate('/create-trip');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatNumber = (num) => {
    return parseFloat(num.toFixed(2));
  };

  const getDestinationImage = (photo, city, country) => {
    if (photo && photo.url) {
      return photo.url;
    }
    const query = encodeURIComponent(`${city} ${country} travel`);
    return `https://source.unsplash.com/800x400/?${query}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#3b82f6';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="results-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <h2>Finding your perfect trips...</h2>
          <p>Analyzing your profile and searching thousands of flights</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn-secondary" onClick={handleBackToDashboard}>
              Back to Dashboard
            </button>
            <button className="btn-primary" onClick={handleNewSearch}>
              Try New Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-header">
        <div className="header-content">
          <h1>Your Perfect Trips</h1>
          <p>We found <strong>{recommendations.length} amazing destinations</strong> tailored just for you</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
          <button className="btn-primary" onClick={handleNewSearch}>
            New Search
          </button>
        </div>
      </div>

      <div className="trips-list">
        {recommendations.map((trip, index) => (
          <div key={index} className="trip-card-modern">
            {/* Destination Image */}
            <div className="destination-image-container">
              <img
                src={getDestinationImage(trip.destination.photo, trip.destination.city, trip.destination.country)}
                alt={trip.destination.photo?.alt || `${trip.destination.city}, ${trip.destination.country}`}
                className="destination-image"
                onError={(e) => {
                  e.target.src = `https://source.unsplash.com/800x400/?${encodeURIComponent(trip.destination.city)}`;
                }}
              />
              <div className="image-overlay"></div>
              {trip.destination.photo && trip.destination.photo.photographer && (
                <div className="photo-credit">
                  Photo by{' '}
                  <a
                    href={trip.destination.photo.photographer.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {trip.destination.photo.photographer.name}
                  </a>
                  {' '}on Unsplash
                </div>
              )}
              <div className="rank-badge" style={{ background: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#cd7f32' }}>
                {index === 0 ? '🏆' : `#${index + 1}`}
              </div>
            </div>

            {/* Main Content */}
            <div className="trip-main">
              {/* Destination Header */}
              <div className="destination-header">
                <div className="destination-info">
                  <h3 className="destination-name">
                    {trip.destination.city}
                    <span className="destination-country">{trip.destination.country}</span>
                  </h3>
                  <div className="trip-dates-badge">
                    📅 {formatDate(trip.slot.startDate)} - {formatDate(trip.slot.endDate)}
                    <span className="trip-duration">• {trip.slot.duration} days</span>
                  </div>
                </div>
                <div className="match-score" style={{ borderColor: getScoreColor(trip.score.total) }}>
                  <div className="score-number" style={{ color: getScoreColor(trip.score.total) }}>
                    {formatNumber(trip.score.total)}
                  </div>
                  <div className="score-label">match</div>
                </div>
              </div>

              {/* Why This Trip */}
              <div className="why-section">
                <div className="why-card">
                  <div className="why-icon">💡</div>
                  <div className="why-content">
                    <strong>Why this destination?</strong>
                    <p>{trip.destination.matchReason}</p>
                  </div>
                </div>
                <div className="why-card">
                  <div className="why-icon">🌤️</div>
                  <div className="why-content">
                    <strong>Why now?</strong>
                    <p>{trip.destination.seasonReason}</p>
                  </div>
                </div>
              </div>

              {/* Price Overview */}
              <div className="price-overview">
                <div className="price-main">
                  <div className="price-label">Total Trip Cost</div>
                  <div className="price-value">€{formatNumber(trip.pricing.total)}</div>
                  {trip.pricing.remaining >= 0 ? (
                    <div className="price-remaining positive">
                      €{formatNumber(trip.pricing.remaining)} under budget ✓
                    </div>
                  ) : (
                    <div className="price-remaining negative">
                      €{formatNumber(Math.abs(trip.pricing.remaining))} over budget
                    </div>
                  )}
                </div>

                <div className="price-breakdown-compact">
                  <div className="price-item">
                    <span className="price-icon">✈️</span>
                    <span className="price-label">Flight</span>
                    <span className="price-amount">€{formatNumber(trip.pricing.flight)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-icon">🏨</span>
                    <span className="price-label">Hotel ({trip.slot.duration - 1}n)</span>
                    <span className="price-amount">€{formatNumber(trip.pricing.hotel)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-icon">🎭</span>
                    <span className="price-label">Activities</span>
                    <span className="price-amount">€{formatNumber(trip.pricing.activities)}</span>
                  </div>
                </div>
              </div>

              {/* Flight Info */}
              <div className="flight-info-compact">
                <div className="flight-route">
                  <span className="airport">{trip.flightDetails.outbound.departure}</span>
                  <div className="flight-line">
                    <span className="flight-icon">✈️</span>
                    <span className="flight-duration">{trip.flightDetails.duration}</span>
                  </div>
                  <span className="airport">{trip.flightDetails.outbound.arrival}</span>
                </div>
                <div className="airline-info">
                  {trip.flightDetails.airline} • Departure {new Date(trip.flightDetails.outbound.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="trip-actions">
                <button
                  className="action-button save"
                  onClick={() => handleSaveTrip(index)}
                  disabled={savingTripId === index}
                >
                  <span className="button-icon">💾</span>
                  <span className="button-text">
                    <strong>{savingTripId === index ? 'Saving...' : 'Save Trip'}</strong>
                  </span>
                </button>
                <a
                  href={trip.links.skyscanner}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button primary"
                >
                  <span className="button-icon">✈️</span>
                  <span className="button-text">
                    <strong>Book Flights</strong>
                    <small>via Skyscanner</small>
                  </span>
                </a>
                <a
                  href={trip.links.booking}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  <span className="button-icon">🏨</span>
                  <span className="button-text">
                    <strong>Book Hotels</strong>
                    <small>via Booking.com</small>
                  </span>
                </a>
              </div>
            </div>

            {/* Collapsible Details */}
            <details className="trip-details">
              <summary className="details-toggle">
                📊 View detailed scoring
              </summary>
              <div className="details-content">
                <div className="score-breakdown-detailed">
                  <h4>How we scored this trip:</h4>
                  <div className="score-bars">
                    <div className="score-bar-item">
                      <div className="score-bar-header">
                        <span>AI Match (40%)</span>
                        <strong>{formatNumber(trip.score.breakdown.aiMatch)}pts</strong>
                      </div>
                      <div className="score-bar-fill-container">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${formatNumber(trip.score.breakdown.aiMatch)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="score-bar-item">
                      <div className="score-bar-header">
                        <span>Price Value (30%)</span>
                        <strong>{formatNumber(trip.score.breakdown.price)}pts</strong>
                      </div>
                      <div className="score-bar-fill-container">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${formatNumber(trip.score.breakdown.price)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="score-bar-item">
                      <div className="score-bar-header">
                        <span>Originality (20%)</span>
                        <strong>{formatNumber(trip.score.breakdown.originality)}pts</strong>
                      </div>
                      <div className="score-bar-fill-container">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${formatNumber(trip.score.breakdown.originality)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="score-bar-item">
                      <div className="score-bar-header">
                        <span>Availability (10%)</span>
                        <strong>{formatNumber(trip.score.breakdown.availability)}pts</strong>
                      </div>
                      <div className="score-bar-fill-container">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${formatNumber(trip.score.breakdown.availability)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">😔</div>
          <h3>No trips found</h3>
          <p>Try adjusting your preferences or budget</p>
          <button className="btn-primary" onClick={handleNewSearch}>
            Try New Search
          </button>
        </div>
      )}
    </div>
  );
}

export default Results;
