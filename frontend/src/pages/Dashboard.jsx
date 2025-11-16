// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      checkOnboardingAndFetchData();
    }
  }, [user]);

  const checkOnboardingAndFetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      // Check if user has completed onboarding
      const prefsResponse = await fetch('http://localhost:3001/api/users/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json();

        // If no preferences or onboarding not completed, redirect to onboarding
        if (!prefsData.preferences || !prefsData.preferences.onboardingCompleted) {
          navigate('/onboarding');
          return;
        }
      }

      // Fetch saved trips
      const tripsResponse = await fetch('http://localhost:3001/api/searches/trips/saved', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!tripsResponse.ok) {
        throw new Error('Failed to fetch saved trips');
      }

      const tripsData = await tripsResponse.json();
      setSavedTrips(tripsData.trips || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = () => {
    navigate('/create-trip');
  };

  const handleViewTrip = (searchId) => {
    navigate(`/results/${searchId}`);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.firstName || 'Traveler'}!</h1>
          <p>Ready to plan your next adventure?</p>
        </div>
        <button className="btn-create-trip" onClick={handleCreateTrip}>
          + Create a New Trip
        </button>
      </div>

      {/* Quick Stats */}
      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-icon">✈️</div>
          <div className="stat-content">
            <div className="stat-number">{savedTrips.length}</div>
            <div className="stat-label">Saved Trips</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <div className="stat-number">{new Set(savedTrips.map(t => t.destination?.country)).size}</div>
            <div className="stat-label">Countries</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-number">
              {savedTrips.length > 0 ? Math.round(savedTrips.reduce((acc, t) => acc + (t.score?.total || 0), 0) / savedTrips.length) : 0}
            </div>
            <div className="stat-label">Avg. Match Score</div>
          </div>
        </div>
      </div>

      {/* Saved Trips Section */}
      <div className="trips-section">
        <h2 className="section-title">My Saved Trips</h2>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your trips...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p>Failed to load trips: {error}</p>
            <button className="btn-retry" onClick={fetchSavedTrips}>Retry</button>
          </div>
        ) : savedTrips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <h3>No saved trips yet</h3>
            <p>Start by creating your first trip recommendation</p>
            <button className="btn-empty-cta" onClick={handleCreateTrip}>
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="trips-grid">
            {savedTrips.map((trip, index) => (
              <div key={trip.searchId || index} className="trip-card">
                <div className="trip-card-header">
                  <div className="destination-info">
                    <h3>{trip.destination?.city || 'Unknown'}</h3>
                    <p className="country">{trip.destination?.country || 'Unknown'}</p>
                  </div>
                  <div className="match-badge">
                    {trip.score?.total ? `${Math.round(trip.score.total)}%` : 'N/A'}
                  </div>
                </div>

                <div className="trip-card-body">
                  <div className="trip-detail">
                    <span className="detail-icon">📅</span>
                    <span className="detail-text">
                      {trip.slot?.startDate ? formatDate(trip.slot.startDate) : 'Date TBD'}
                    </span>
                  </div>
                  <div className="trip-detail">
                    <span className="detail-icon">⏱️</span>
                    <span className="detail-text">{trip.slot?.duration || 0} days</span>
                  </div>
                  <div className="trip-detail">
                    <span className="detail-icon">💰</span>
                    <span className="detail-text">
                      {trip.pricing?.total ? `€${Math.round(trip.pricing.total)}` : 'Price TBD'}
                    </span>
                  </div>
                </div>

                <div className="trip-card-footer">
                  <button
                    className="btn-view-trip"
                    onClick={() => handleViewTrip(trip.searchId)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      {savedTrips.length > 0 && (
        <div className="dashboard-cta">
          <div className="cta-content">
            <h3>Looking for more adventures?</h3>
            <p>Create a new trip and discover your next destination</p>
            <button className="btn-cta-secondary" onClick={handleCreateTrip}>
              Plan Another Trip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
