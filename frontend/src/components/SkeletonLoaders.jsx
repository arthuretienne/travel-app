// frontend/src/components/SkeletonLoaders.jsx
// Skeleton loading components for better UX
import React from 'react';

// Base skeleton element with animation
export function Skeleton({ className = '', rounded = 'lg' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-${rounded} ${className}`}
    />
  );
}

// Trip Card Skeleton - for Results page
export function TripCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-card border border-gray-100">
      <div className="flex flex-col lg:flex-row">
        {/* Image skeleton */}
        <div className="lg:w-1/3 h-64 lg:h-auto bg-gray-200 animate-pulse relative">
          <div className="absolute top-4 left-4 w-24 h-6 bg-gray-300 rounded-full" />
        </div>

        {/* Content skeleton */}
        <div className="lg:w-2/3 p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
          </div>

          {/* Why cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="h-24 bg-primary-light rounded-xl animate-pulse" />
            <div className="h-24 bg-amber-50 rounded-xl animate-pulse" />
          </div>

          {/* Price section */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-6">
            <div className="flex justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-8 w-32 bg-green-100 rounded-lg animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-white rounded-lg animate-pulse" />
              <div className="h-16 bg-white rounded-lg animate-pulse" />
              <div className="h-16 bg-white rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Flight info skeleton */}
          <div className="space-y-3 mb-6">
            <div className="h-6 w-full bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-6 w-full bg-gray-100 rounded-lg animate-pulse" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse" />
            <div className="flex-1 h-12 bg-primary/20 rounded-xl animate-pulse" />
            <div className="flex-1 h-12 bg-primary/20 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Trip Card Skeleton
export function DashboardCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      {/* Image */}
      <div className="h-40 bg-gray-200 animate-pulse" />

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-primary/20 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Loading screen with progress steps
export function SearchLoadingScreen({ stage = 'analyzing', scenario = 'WITHOUT_DESTINATION', onCancel }) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const stagesWithDestination = [
    { key: 'analyzing', label: 'Analyse de vos dates de voyage', icon: '📅' },
    { key: 'searching', label: 'Comparaison de 7 combinaisons de dates', icon: '💰' },
    { key: 'flights', label: 'Recherche des vols les moins chers', icon: '✈️' },
    { key: 'hotels', label: 'Vérification des hôtels disponibles', icon: '🏨' },
    { key: 'optimizing', label: 'Finalisation de la meilleure offre', icon: '✨' },
  ];

  const stagesWithoutDestination = [
    { key: 'analyzing', label: 'Analyse de votre profil voyageur', icon: '🧠' },
    { key: 'searching', label: 'Exploration de 150+ destinations', icon: '🌍' },
    { key: 'flights', label: 'Recherche des meilleures liaisons', icon: '✈️' },
    { key: 'hotels', label: 'Vérification des disponibilités', icon: '🏨' },
    { key: 'optimizing', label: 'Optimisation de vos recommandations', icon: '✨' },
  ];

  const stages = scenario === 'WITH_DESTINATION' ? stagesWithDestination : stagesWithoutDestination;
  const title = scenario === 'WITH_DESTINATION'
    ? 'Recherche des meilleures dates & prix'
    : 'Recherche de votre voyage idéal';

  const currentIndex = stages.findIndex(s => s.key === stage);
  const progressPct = Math.round(((currentIndex + 1) / stages.length) * 100);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-2xl mb-4">
            <span className="text-3xl">{stages[currentIndex]?.icon || '✈️'}</span>
          </div>
          <h2 className="text-xl font-semibold text-text-main">{title}</h2>
          <p className="text-sm text-text-secondary mt-1">
            {elapsed < 5 ? 'Démarrage…' : elapsed < 15 ? 'En cours…' : 'Presque terminé…'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Progress steps */}
        <div className="space-y-2 mb-7">
          {stages.map((s, idx) => (
            <div
              key={s.key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                idx < currentIndex
                  ? 'bg-green-50'
                  : idx === currentIndex
                    ? 'bg-primary-light'
                    : 'opacity-40'
              }`}
            >
              <span className="text-base w-5 text-center">{s.icon}</span>
              <span className={`flex-1 text-sm font-medium ${
                idx < currentIndex ? 'text-green-700' : idx === currentIndex ? 'text-primary' : 'text-text-secondary'
              }`}>{s.label}</span>
              {idx < currentIndex && (
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {idx === currentIndex && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-light">Généralement 10–20 secondes</p>
          {onCancel && elapsed >= 5 && (
            <button
              onClick={onCancel}
              className="text-xs text-text-secondary hover:text-text-main underline transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Saved Trip Detail Skeleton
export function SavedTripDetailSkeleton() {
  return (
    <div className="min-h-screen bg-surface-subtle animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-6" />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3">
              <div className="h-10 w-64 bg-gray-200 rounded-lg" />
              <div className="h-6 w-24 bg-primary/10 rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-gray-200 rounded-lg" />
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
            </div>
          </div>

          {/* Quick info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-20 bg-gray-50 rounded-xl" />
            <div className="h-20 bg-gray-50 rounded-xl" />
            <div className="h-20 bg-gray-50 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Flight section */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
          <div className="space-y-4">
            <div className="h-24 bg-primary-light rounded-xl" />
            <div className="h-24 bg-primary-light rounded-xl" />
          </div>
        </div>

        {/* Hotel section */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-24 bg-green-50 rounded-xl" />
        </div>

        {/* Book your trip section */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="h-20 bg-gradient-to-br from-primary-light to-stone-50" />
          <div className="grid lg:grid-cols-3 gap-0">
            <div className="p-6 border-r border-gray-100 space-y-4">
              <div className="h-6 w-24 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-50 rounded-xl" />
            </div>
            <div className="p-6 border-r border-gray-100 space-y-4">
              <div className="h-6 w-32 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-50 rounded-xl" />
              <div className="h-32 bg-gray-50 rounded-xl" />
            </div>
            <div className="p-6 space-y-4">
              <div className="h-6 w-24 bg-gray-200 rounded" />
              <div className="h-20 bg-gray-50 rounded-xl" />
              <div className="h-20 bg-gray-50 rounded-xl" />
              <div className="h-20 bg-gray-50 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Flight Info Skeleton
export function FlightInfoSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-20 h-4 bg-gray-200 rounded" />
        <div className="flex-1 flex items-center gap-3">
          <div className="w-12 h-5 bg-gray-200 rounded" />
          <div className="flex-1 h-px bg-gray-200" />
          <div className="w-12 h-5 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-20 h-4 bg-gray-200 rounded" />
        <div className="flex-1 flex items-center gap-3">
          <div className="w-12 h-5 bg-gray-200 rounded" />
          <div className="flex-1 h-px bg-gray-200" />
          <div className="w-12 h-5 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="w-24 h-4 bg-gray-200 rounded" />
        </div>
        <div className="w-16 h-4 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default {
  Skeleton,
  TripCardSkeleton,
  DashboardCardSkeleton,
  SearchLoadingScreen,
  SavedTripDetailSkeleton,
  FlightInfoSkeleton,
};
