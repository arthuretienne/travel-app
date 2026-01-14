// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { OptimalPeriodsWidget } from '../components/OptimalPeriodsWidget';
import { DashboardCardSkeleton } from '../components/SkeletonLoaders';
import { Plane, Globe, Target, AlertTriangle, Map, Calendar, Clock, DollarSign, Plus, Users, MapPin, ChevronRight } from 'lucide-react';

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
        const errorData = await tripsResponse.json().catch(() => ({}));
        console.error('Trips fetch failed:', tripsResponse.status, errorData);
        throw new Error(errorData.message || `Failed to fetch saved trips (${tripsResponse.status})`);
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
        const errorData = await tripsResponse.json().catch(() => ({}));
        console.error('Trips fetch failed:', tripsResponse.status, errorData);
        throw new Error(errorData.message || `Failed to fetch saved trips (${tripsResponse.status})`);
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
    <div className="min-h-screen bg-surface-subtle">
      {/* Hero Header */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-medium text-text-main mb-2">
                Welcome back, {user?.firstName || 'Traveler'}
              </h1>
              <p className="text-text-secondary text-lg">Your travel dashboard</p>
            </div>
            <button
              className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
              onClick={handleCreateTrip}
            >
              <Plus size={20} strokeWidth={2} />
              New Trip
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white p-5 rounded-2xl border border-stone-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-xl flex items-center justify-center">
              <Plane size={22} />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-main">{savedTrips.length}</div>
              <div className="text-sm text-text-secondary">Saved Trips</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-xl flex items-center justify-center">
              <Globe size={22} />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-main">{new Set(savedTrips.map(t => t.country)).size}</div>
              <div className="text-sm text-text-secondary">Countries</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-xl flex items-center justify-center">
              <Target size={22} />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-main">
                {savedTrips.length > 0 ? Math.round(savedTrips.reduce((acc, t) => acc + (t.tripData?.score?.total || 0), 0) / savedTrips.length) : 0}%
              </div>
              <div className="text-sm text-text-secondary">Avg. Match</div>
            </div>
          </div>
        </div>

        {/* Optimal Periods Widget */}
        <div className="mb-12">
          <OptimalPeriodsWidget />
        </div>

        {/* All Trips Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-medium text-text-main">My Trips</h2>
            <div className="flex gap-1 p-1 bg-stone-100 rounded-lg">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'all' ? 'bg-white text-text-main shadow-sm' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('solo')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'solo' ? 'bg-white text-text-main shadow-sm' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                Solo
              </button>
              <button
                onClick={() => setActiveFilter('group')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'group' ? 'bg-white text-text-main shadow-sm' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                Group
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-stone-100">
              <div className="inline-flex p-4 bg-stone-50 text-text-secondary rounded-full mb-4">
                <AlertTriangle size={28} />
              </div>
              <p className="text-text-secondary mb-6">Failed to load trips: {error}</p>
              <button
                className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
                onClick={fetchSavedTrips}
              >
                Try again
              </button>
            </div>
          ) : (savedTrips.length === 0 && collaborativeTrips.length === 0) ? (
            <div className="bg-white rounded-2xl p-12 md:p-16 text-center border border-stone-100">
              <div className="inline-flex p-5 bg-primary-light text-primary rounded-2xl mb-6">
                <Map size={36} />
              </div>
              <h3 className="font-display text-xl font-medium text-text-main mb-2">No trips yet</h3>
              <p className="text-text-secondary mb-8">Start by creating your first trip</p>
              <button
                className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
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
              <div className="space-y-8">
                {/* Solo Trips */}
                {soloTripsFiltered.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {soloTripsFiltered.map((trip, index) => (
                      <div
                        key={`solo-${trip.id || index}`}
                        className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-stone-200 transition-all cursor-pointer group"
                        onClick={() => navigate(`/saved-trips/${trip.id}`)}
                      >
                        {/* Image or colored header */}
                        <div className="relative h-32 bg-gradient-to-br from-primary to-teal-600">
                          <div className="absolute inset-0 bg-black/10" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-xl font-semibold text-white mb-0.5">{trip.city || 'Unknown'}</h3>
                            <p className="text-white/80 text-sm">{trip.country || 'Unknown'}</p>
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex items-center justify-between text-sm mb-3">
                            <div className="flex items-center gap-2 text-text-secondary">
                              <Calendar size={15} />
                              <span>{trip.startDate ? formatDate(trip.startDate) : 'Date TBD'}</span>
                            </div>
                            <div className="text-text-secondary">
                              {trip.startDate && trip.endDate
                                ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
                                : 0} days
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold text-text-main">
                              {trip.tripData?.pricing?.total ? `€${Math.round(trip.tripData.pricing.total)}` : '—'}
                            </div>
                            <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              View details
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Collaborative Trips */}
                {groupTripsFiltered.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groupTripsFiltered.map((trip) => (
                      <div
                        key={`group-${trip.id}`}
                        className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-stone-200 transition-all cursor-pointer group"
                        onClick={() => navigate(`/trips/${trip.id}`)}
                      >
                        {/* Group trip header */}
                        <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600">
                          <div className="absolute inset-0 bg-black/10" />
                          <div className="absolute top-4 right-4">
                            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-white text-xs font-medium">
                              <Users size={12} />
                              {trip.members?.length || 0}
                            </div>
                          </div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-xl font-semibold text-white mb-0.5">{trip.name}</h3>
                            {trip.finalDestination && (
                              <p className="text-white/80 text-sm">{trip.finalDestination.city}, {trip.finalDestination.country}</p>
                            )}
                          </div>
                        </div>

                        <div className="p-5">
                          {trip.finalDestination ? (
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-text-secondary">
                                <Calendar size={15} />
                                <span>{trip.finalStartDate ? formatDate(trip.finalStartDate) : 'Date TBD'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                View trip
                                <ChevronRight size={16} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-text-secondary">
                                {trip.status === 'draft' && 'Planning in progress'}
                                {trip.status === 'voting' && 'Voting in progress'}
                                {trip.proposedTrips?.length > 0 && `${trip.proposedTrips.length} destination(s)`}
                              </div>
                              <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                View trip
                                <ChevronRight size={16} />
                              </div>
                            </div>
                          )}
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
          <div className="bg-white rounded-2xl p-10 md:p-12 text-center border border-stone-100">
            <h3 className="font-display text-xl md:text-2xl font-medium text-text-main mb-2">Looking for more adventures?</h3>
            <p className="text-text-secondary mb-8">Create a new trip and discover your next destination</p>
            <button
              className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
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
