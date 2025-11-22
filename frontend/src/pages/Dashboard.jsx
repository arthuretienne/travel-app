// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { OptimalPeriodsWidget } from '../components/OptimalPeriodsWidget';
import { Plane, Globe, Target, AlertTriangle, Map, Calendar, Clock, DollarSign, Plus, ArrowRight, Users, Filter, MapPin } from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [savedTrips, setSavedTrips] = useState([]);
  const [collaborativeTrips, setCollaborativeTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'solo', 'group'

  useEffect(() => {
    if (user) {
      checkOnboardingAndFetchData();
    }
  }, [user]);

  const checkOnboardingAndFetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // Check if user has completed onboarding
      const prefsResponse = await fetch(`${API_URL}/api/users/preferences`, {
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

      // Fetch saved solo trips
      const tripsResponse = await fetch(`${API_URL}/api/searches/trips/saved`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!tripsResponse.ok) {
        throw new Error('Failed to fetch saved trips');
      }

      const tripsData = await tripsResponse.json();
      setSavedTrips(tripsData.savedTrips || []);

      // Fetch collaborative trips
      const collabResponse = await fetch(`${API_URL}/api/trips`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (collabResponse.ok) {
        const collabData = await collabResponse.json();
        // Combine created trips and member trips
        const allCollabTrips = [
          ...(collabData.data?.createdTrips || []),
          ...(collabData.data?.memberTrips || [])
        ];
        setCollaborativeTrips(allCollabTrips);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const tripsResponse = await fetch(`${API_URL}/api/searches/trips/saved`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!tripsResponse.ok) {
        throw new Error('Failed to fetch saved trips');
      }

      const tripsData = await tripsResponse.json();
      setSavedTrips(tripsData.savedTrips || []);
    } catch (err) {
      console.error('Error fetching saved trips:', err);
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
    <div className="min-h-screen bg-surface-subtle p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-main mb-1">Welcome back, {user?.firstName || 'Traveler'}!</h1>
            <p className="text-text-secondary">Ready to plan your next adventure?</p>
          </div>
          <button
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
            onClick={handleCreateTrip}
          >
            <Plus size={20} />
            Create a New Trip
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Plane size={28} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-main leading-none mb-1">{savedTrips.length}</div>
              <div className="text-sm font-medium text-text-secondary">Saved Trips</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <Globe size={28} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-main leading-none mb-1">{new Set(savedTrips.map(t => t.country)).size}</div>
              <div className="text-sm font-medium text-text-secondary">Countries</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Target size={28} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-main leading-none mb-1">
                {savedTrips.length > 0 ? Math.round(savedTrips.reduce((acc, t) => acc + (t.tripData?.score?.total || 0), 0) / savedTrips.length) : 0}%
              </div>
              <div className="text-sm font-medium text-text-secondary">Avg. Match Score</div>
            </div>
          </div>
        </div>

        {/* Optimal Periods Widget */}
        <OptimalPeriodsWidget />

        {/* All Trips Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-main">My Trips</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({savedTrips.length + collaborativeTrips.length})
              </button>
              <button
                onClick={() => setActiveFilter('solo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === 'solo' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Solo ({savedTrips.length})
              </button>
              <button
                onClick={() => setActiveFilter('group')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === 'group' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Group ({collaborativeTrips.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl shadow-card p-12 text-center border border-gray-100">
              <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading your trips...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-3xl shadow-card p-12 text-center border border-gray-100">
              <div className="inline-flex p-4 bg-red-50 text-red-500 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="text-red-500 mb-6">Failed to load trips: {error}</p>
              <button
                className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
                onClick={fetchSavedTrips}
              >
                Retry
              </button>
            </div>
          ) : (savedTrips.length === 0 && collaborativeTrips.length === 0) ? (
            <div className="bg-white rounded-3xl shadow-card p-16 text-center border border-gray-100">
              <div className="inline-flex p-6 bg-gray-50 text-gray-400 rounded-full mb-6">
                <Map size={48} />
              </div>
              <h3 className="text-xl font-bold text-text-main mb-2">No trips yet</h3>
              <p className="text-text-secondary mb-8">Start by creating your first trip</p>
              <button
                className="px-8 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
                onClick={handleCreateTrip}
              >
                Create Your First Trip
              </button>
            </div>
          ) : (() => {
            // Filter trips based on active filter
            const soloTripsFiltered = activeFilter === 'group' ? [] : savedTrips;
            const groupTripsFiltered = activeFilter === 'solo' ? [] : collaborativeTrips;

            return (
              <div className="space-y-6">
                {/* Solo Trips */}
                {soloTripsFiltered.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {soloTripsFiltered.map((trip, index) => (
                      <div key={`solo-${trip.id || index}`} className="bg-white rounded-2xl overflow-hidden shadow-card border border-gray-100 hover:shadow-xl hover:border-primary/30 transition-all group">
                        <div className="bg-primary p-6 text-white flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold mb-1">{trip.city || 'Unknown'}</h3>
                            <p className="text-white/90 text-sm">{trip.country || 'Unknown'}</p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg font-bold text-sm">
                            Solo
                          </div>
                        </div>

                        <div className="p-6 space-y-4">
                          <div className="flex items-center gap-3 text-text-secondary">
                            <Calendar size={18} className="text-gray-400" />
                            <span className="font-medium text-text-main">
                              {trip.startDate ? formatDate(trip.startDate) : 'Date TBD'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-text-secondary">
                            <Clock size={18} className="text-gray-400" />
                            <span className="font-medium text-text-main">
                              {trip.startDate && trip.endDate
                                ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
                                : 0} days
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-text-secondary">
                            <DollarSign size={18} className="text-gray-400" />
                            <span className="font-medium text-text-main">
                              {trip.tripData?.pricing?.total ? `€${Math.round(trip.tripData.pricing.total)}` : 'Price TBD'}
                            </span>
                          </div>
                        </div>

                        <div className="p-6 pt-0 border-t border-gray-50 mt-2">
                          <button
                            className="w-full py-3 mt-4 bg-primary text-white font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-lg shadow-primary/20 hover:bg-primary-hover"
                            onClick={() => navigate(`/dashboard`)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Collaborative Trips */}
                {groupTripsFiltered.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupTripsFiltered.map((trip) => (
                      <div key={`group-${trip.id}`} className="bg-white rounded-2xl overflow-hidden shadow-card border border-gray-100 hover:shadow-xl hover:border-primary/30 transition-all group">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 text-white flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold mb-1">{trip.name}</h3>
                            <p className="text-white/90 text-sm flex items-center gap-1">
                              <Users size={14} />
                              {trip.members?.length || 0} membres
                            </p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg font-bold text-sm">
                            Group
                          </div>
                        </div>

                        <div className="p-6 space-y-4">
                          {trip.finalDestination ? (
                            <>
                              <div className="flex items-center gap-3 text-text-secondary">
                                <MapPin size={18} className="text-gray-400" />
                                <span className="font-medium text-text-main">
                                  {trip.finalDestination.city}, {trip.finalDestination.country}
                                </span>
                              </div>
                              {trip.finalStartDate && (
                                <div className="flex items-center gap-3 text-text-secondary">
                                  <Calendar size={18} className="text-gray-400" />
                                  <span className="font-medium text-text-main">
                                    {formatDate(trip.finalStartDate)}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-sm text-gray-600">
                              {trip.status === 'draft' && 'En cours de création'}
                              {trip.status === 'voting' && 'Vote en cours'}
                              {trip.proposedTrips?.length > 0 && `${trip.proposedTrips.length} destination(s) proposée(s)`}
                            </div>
                          )}
                        </div>

                        <div className="p-6 pt-0 border-t border-gray-50 mt-2">
                          <button
                            className="w-full py-3 mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-lg shadow-blue-500/20 hover:shadow-xl"
                            onClick={() => navigate(`/trips/${trip.id}`)}
                          >
                            View Trip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* CTA Section */}
        {savedTrips.length > 0 && (
          <div className="bg-surface-subtle rounded-3xl p-12 text-center border border-blue-100">
            <h3 className="text-2xl font-bold text-text-main mb-3">Looking for more adventures?</h3>
            <p className="text-text-secondary mb-8">Create a new trip and discover your next destination</p>
            <button
              className="px-8 py-3 bg-white text-primary font-semibold rounded-xl border border-primary hover:bg-primary hover:text-white transition-all"
              onClick={handleCreateTrip}
            >
              Plan Another Trip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
