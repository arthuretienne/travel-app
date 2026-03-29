// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { OptimalPeriodsWidget } from '../components/OptimalPeriodsWidget';
import { OpportunitiesWidget } from '../components/OpportunitiesWidget';
import { DashboardCardSkeleton } from '../components/SkeletonLoaders';
import { SearchUsageWidget } from '../components/SearchUsageWidget';
import { Plane, Globe, Target, AlertTriangle, Map, Calendar, Clock, DollarSign, Plus, Users, MapPin, ChevronRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDestinationImage } from '../utils/destinationImages';

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
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Hero Header */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-medium text-text-main mb-2">
                Bon retour, {user?.firstName || 'Voyageur'} 👋
              </h1>
              <p className="text-text-secondary text-lg">Votre tableau de bord voyage</p>
            </div>
            <button
              className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
              onClick={handleCreateTrip}
            >
              <Plus size={20} strokeWidth={2} />
              Nouveau voyage
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-5 rounded-2xl border border-stone-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Plane size={22} />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-stone-100 rounded animate-pulse mb-1" />
              ) : (
                <div className="text-2xl font-semibold text-text-main">{savedTrips.length}</div>
              )}
              <div className="text-sm text-text-secondary">Voyages sauvegardés</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe size={22} />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-stone-100 rounded animate-pulse mb-1" />
              ) : (
                <div className="text-2xl font-semibold text-text-main">
                  {new Set(savedTrips.map(t => t.country).filter(Boolean)).size || '—'}
                </div>
              )}
              <div className="text-sm text-text-secondary">Destinations explorées</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Target size={22} />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-14 bg-stone-100 rounded animate-pulse mb-1" />
              ) : (
                <div className="text-2xl font-semibold text-text-main">
                  {savedTrips.length > 0
                    ? `${Math.round(savedTrips.reduce((acc, t) => acc + (t.tripData?.score?.total || 0), 0) / savedTrips.length)}%`
                    : '—'}
                </div>
              )}
              <div className="text-sm text-text-secondary">Compatibilité moy.</div>
            </div>
          </div>
          <SearchUsageWidget />
        </div>

        {/* Proactive deal opportunities */}
        <div className="mb-6">
          <OpportunitiesWidget />
        </div>

        {/* Optimal Periods Widget */}
        <div className="mb-12">
          <OptimalPeriodsWidget />
        </div>

        {/* Price Alerts Link */}
        <Link
          to="/price-alerts"
          className="flex items-center justify-between p-5 mb-10 bg-white rounded-2xl border border-stone-100 hover:border-primary/30 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Bell size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-text-main">Alertes prix</h3>
              <p className="text-sm text-text-secondary">Suivez les prix et soyez notifié quand ils baissent</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-text-secondary group-hover:text-primary transition-colors" />
        </Link>

        {/* All Trips Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-medium text-text-main">Mes voyages</h2>
            <div className="flex gap-1 p-1 bg-stone-100 rounded-lg">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'all' ? 'bg-white text-text-main shadow-sm' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                Tous
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
                Groupe
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
              <p className="text-text-secondary mb-6">Erreur lors du chargement : {error}</p>
              <button
                className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
                onClick={fetchSavedTrips}
              >
                Réessayer
              </button>
            </div>
          ) : (savedTrips.length === 0 && collaborativeTrips.length === 0) ? (
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
              <div className="p-10 md:p-14 text-center border-b border-stone-50">
                <div className="inline-flex p-4 bg-primary-light text-primary rounded-2xl mb-5">
                  <Map size={32} />
                </div>
                <h3 className="font-display text-xl font-medium text-text-main mb-2">Planifiez votre premier voyage</h3>
                <p className="text-text-secondary mb-8 max-w-sm mx-auto">
                  L'IA analyse votre profil et trouve les destinations idéales avec vols et hôtels en temps réel.
                </p>
                <button
                  className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors shadow-sm shadow-primary/20"
                  onClick={handleCreateTrip}
                >
                  Lancer ma première recherche
                </button>
              </div>
              <div className="grid grid-cols-3 divide-x divide-stone-100">
                {[
                  { icon: '🤖', label: 'IA personnalisée', desc: 'Selon votre profil' },
                  { icon: '✈️', label: 'Prix en temps réel', desc: 'Vols + hôtels' },
                  { icon: '⚡', label: 'Résultats en 15s', desc: '3 destinations top' },
                ].map((item) => (
                  <div key={item.label} className="p-5 text-center">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-sm font-medium text-text-main">{item.label}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (() => {
            // Filter trips based on active filter
            const soloTripsFiltered = activeFilter === 'group' ? [] : savedTrips;
            const groupTripsFiltered = activeFilter === 'solo' ? [] : collaborativeTrips;

            return (
              <div className="space-y-8">
                {/* Solo Trips */}
                {soloTripsFiltered.length > 0 && (
                  <div>
                    {activeFilter === 'all' && (
                      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">Voyages solo</h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {soloTripsFiltered.map((trip, index) => (
                        <div
                          key={`solo-${trip.id || index}`}
                          className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => navigate(`/saved-trips/${trip.id}`)}
                        >
                          {/* Destination image */}
                          <div className="relative h-36 overflow-hidden">
                            <img
                              src={getDestinationImage({ city: trip.city, country: trip.country, tripData: trip.tripData })}
                              alt={`${trip.city}, ${trip.country}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                            {trip.tripData?.score?.total > 0 && (
                              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-primary text-xs font-bold px-2 py-1 rounded-lg">
                                {Math.round(trip.tripData.score.total)}% compatible
                              </div>
                            )}
                            <div className="absolute bottom-3 left-4 right-4">
                              <h3 className="text-lg font-semibold text-white leading-tight">{trip.city || 'Unknown'}</h3>
                              <p className="text-white/75 text-xs">{trip.country || 'Unknown'}</p>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="flex items-center justify-between text-sm mb-2.5">
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <Calendar size={13} />
                                <span className="text-xs">{trip.startDate ? formatDate(trip.startDate) : 'Date à définir'}</span>
                              </div>
                              <div className="text-xs text-text-secondary">
                                {trip.startDate && trip.endDate
                                  ? `${Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))} j`
                                  : ''}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="text-base font-semibold text-text-main">
                                {trip.tripData?.pricing?.total ? `€${Math.round(trip.tripData.pricing.total)}` : '—'}
                              </div>
                              <div className="flex items-center gap-1 text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Voir le voyage
                                <ChevronRight size={14} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collaborative Trips */}
                {groupTripsFiltered.length > 0 && (
                  <div>
                  {activeFilter === 'all' && (
                    <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">Voyages en groupe</h3>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groupTripsFiltered.map((trip) => (
                      <div
                        key={`group-${trip.id}`}
                        className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-stone-200 transition-all cursor-pointer group"
                        onClick={() => navigate(`/trips/${trip.id}`)}
                      >
                        {/* Group trip header with image */}
                        <div className="relative h-32 overflow-hidden">
                          <img
                            src={trip.finalDestination
                              ? getDestinationImage({ city: trip.finalDestination.city, country: trip.finalDestination.country })
                              : 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=800'
                            }
                            alt={trip.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
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
                                <span>{trip.finalStartDate ? formatDate(trip.finalStartDate) : 'Date à définir'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Voir
                                <ChevronRight size={16} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-text-secondary">
                                {trip.status === 'draft' && 'Planification en cours'}
                                {trip.status === 'voting' && 'Vote en cours'}
                                {trip.proposedTrips?.length > 0 && `${trip.proposedTrips.length} destination(s)`}
                              </div>
                              <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Voir
                                <ChevronRight size={16} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* CTA Section */}
        {savedTrips.length > 0 && (
          <div className="bg-white rounded-2xl p-10 md:p-12 text-center border border-stone-100">
            <h3 className="font-display text-xl md:text-2xl font-medium text-text-main mb-2">Envie de partir encore ?</h3>
            <p className="text-text-secondary mb-8">Créez un nouveau voyage et découvrez votre prochaine destination</p>
            <button
              className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
              onClick={handleCreateTrip}
            >
              Planifier un autre voyage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
