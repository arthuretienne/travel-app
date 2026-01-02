// frontend/src/components/SkeletonLoaders.jsx
// Skeleton loading components for better UX

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
            <div className="h-24 bg-blue-50 rounded-xl animate-pulse" />
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
            <div className="flex-1 h-12 bg-blue-200 rounded-xl animate-pulse" />
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
export function SearchLoadingScreen({ stage = 'analyzing' }) {
  const stages = [
    { key: 'analyzing', label: 'Analyzing your preferences', icon: '🧠' },
    { key: 'searching', label: 'Searching destinations worldwide', icon: '🌍' },
    { key: 'flights', label: 'Finding best flight options', icon: '✈️' },
    { key: 'hotels', label: 'Checking hotel availability', icon: '🏨' },
    { key: 'optimizing', label: 'Optimizing your itinerary', icon: '✨' },
  ];

  const currentIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-10 max-w-lg w-[90%] shadow-2xl">
        {/* Animated plane */}
        <div className="relative h-20 mb-8 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-5xl animate-bounce">✈️</div>
          </div>
          {/* Flying trail */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-ping" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-ping" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-ping" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-text-main mb-8">
          Finding Your Perfect Trip
        </h2>

        {/* Progress steps */}
        <div className="space-y-3">
          {stages.map((s, idx) => (
            <div
              key={s.key}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                idx < currentIndex
                  ? 'bg-green-50 text-green-700'
                  : idx === currentIndex
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span className="text-xl">{s.icon}</span>
              <span className="flex-1 text-sm font-medium">{s.label}</span>
              {idx < currentIndex && (
                <span className="text-green-500 text-lg">✓</span>
              )}
              {idx === currentIndex && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          This usually takes 10-15 seconds
        </p>
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
              <div className="h-6 w-24 bg-blue-100 rounded-full" />
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
            <div className="h-24 bg-blue-50 rounded-xl" />
            <div className="h-24 bg-blue-50 rounded-xl" />
          </div>
        </div>

        {/* Hotel section */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-24 bg-green-50 rounded-xl" />
        </div>

        {/* Book your trip section */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="h-20 bg-gradient-to-br from-blue-50 to-purple-50" />
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
