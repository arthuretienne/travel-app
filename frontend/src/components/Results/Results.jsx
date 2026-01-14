// frontend/src/components/Results/Results.jsx
// Premium functional design - calm, structured, decision-focused

import { useState } from 'react';

function Results({ recommendations, onReset }) {
  const [expandedTrip, setExpandedTrip] = useState(null);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (num) => {
    return Math.round(num ?? 0).toLocaleString();
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    if (typeof duration === 'string') return duration;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };

  const getDestinationImage = (photo, city, country) => {
    if (photo?.url) return photo.url;
    const query = encodeURIComponent(`${city} ${country} travel landmark`);
    return `https://source.unsplash.com/1200x800/?${query}`;
  };

  const getStarRating = (ratingValue, hotelStars) => {
    if (hotelStars && hotelStars > 0) return hotelStars;
    if (ratingValue) return Math.round(ratingValue / 2);
    return 0;
  };

  // Filter out roadtrips for this view, handle only destinations
  const destinationTrips = recommendations.filter(r => r?.destination && r?.type !== 'roadtrip');

  if (recommendations.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-surface-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-display text-2xl text-text-main mb-2">No trips found</h3>
          <p className="text-text-secondary mb-8">Try adjusting your preferences or budget to discover new destinations.</p>
          <button
            onClick={onReset}
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
          >
            Start new search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Header */}
      <header className="bg-white border-b border-stone-200/60">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary mb-1">
                {destinationTrips.length} {destinationTrips.length === 1 ? 'destination' : 'destinations'} found
              </p>
              <h1 className="font-display text-3xl text-text-main">
                Your travel options
              </h1>
            </div>
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-main hover:bg-surface-muted rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              New search
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="space-y-8">
          {destinationTrips.map((trip, index) => (
            <TripCard
              key={index}
              trip={trip}
              index={index}
              isExpanded={expandedTrip === index}
              onToggle={() => setExpandedTrip(expandedTrip === index ? null : index)}
              formatDate={formatDate}
              formatNumber={formatNumber}
              formatDuration={formatDuration}
              getDestinationImage={getDestinationImage}
              getStarRating={getStarRating}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function TripCard({
  trip,
  index,
  isExpanded,
  onToggle,
  formatDate,
  formatNumber,
  formatDuration,
  getDestinationImage,
  getStarRating
}) {
  const { destination, slot, pricing, flightDetails, hotelOptions, links } = trip;
  const hotel = hotelOptions?.hotels?.[0];
  const isUnderBudget = (pricing?.remaining ?? 0) >= 0;

  return (
    <article className="bg-white rounded-2xl shadow-card overflow-hidden border border-stone-200/40 hover:shadow-elevated transition-shadow duration-300">
      {/* Hero Image Section */}
      <div className="relative aspect-[21/9] overflow-hidden bg-stone-100">
        <img
          src={getDestinationImage(destination?.photo, destination?.city, destination?.country)}
          alt={destination?.photo?.alt || `${destination?.city}, ${destination?.country}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = `https://source.unsplash.com/1200x600/?${encodeURIComponent(destination?.city || 'travel')}`;
          }}
        />
        {/* Subtle gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Destination name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-4xl text-white mb-1">
                {destination?.city}
              </h2>
              <p className="text-white/80 text-lg">{destination?.country}</p>
            </div>
            {/* Rank indicator - subtle */}
            {index === 0 && (
              <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                <span className="text-white text-sm font-medium">Best match</span>
              </div>
            )}
          </div>
        </div>

        {/* Photo credit */}
        {destination?.photo?.photographer && (
          <div className="absolute top-4 right-4 px-2 py-1 bg-black/30 backdrop-blur-sm rounded text-xs text-white/70">
            Photo by{' '}
            <a href={destination.photo.photographer.link} target="_blank" rel="noopener noreferrer" className="underline">
              {destination.photo.photographer.name}
            </a>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 lg:p-8">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Dates */}
          <div className="p-4 bg-surface-subtle rounded-xl">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">Dates</p>
            <p className="text-text-main font-semibold">
              {formatDate(slot?.startDate)} – {formatDate(slot?.endDate)}
            </p>
            <p className="text-sm text-text-secondary">{slot?.duration} days</p>
          </div>

          {/* Total Cost */}
          <div className="p-4 bg-surface-subtle rounded-xl">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">Total cost</p>
            <p className="text-text-main font-semibold text-xl">€{formatNumber(pricing?.total)}</p>
            {isUnderBudget ? (
              <p className="text-sm text-status-positive">€{formatNumber(pricing?.remaining)} under budget</p>
            ) : (
              <p className="text-sm text-red-600">€{formatNumber(Math.abs(pricing?.remaining))} over</p>
            )}
          </div>

          {/* Flight */}
          <div className="p-4 bg-surface-subtle rounded-xl">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">Flight</p>
            <p className="text-text-main font-semibold">€{formatNumber(pricing?.flight)}</p>
            <p className="text-sm text-text-secondary">
              {flightDetails?.outbound?.stops === 0 ? 'Direct' : `${flightDetails?.outbound?.stops || 0} stop${flightDetails?.outbound?.stops > 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Hotel */}
          <div className="p-4 bg-surface-subtle rounded-xl">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">Hotel</p>
            <p className="text-text-main font-semibold">€{formatNumber(pricing?.hotel)}</p>
            <p className="text-sm text-text-secondary">{hotelOptions?.nights || slot?.duration - 1} nights</p>
          </div>
        </div>

        {/* Why This Trip - AI Reasoning */}
        {(destination?.matchReason || destination?.seasonReason) && (
          <div className="mb-8 p-5 border border-primary/20 bg-primary-light/30 rounded-xl">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                {destination?.matchReason && (
                  <p className="text-text-main leading-relaxed">{destination.matchReason}</p>
                )}
                {destination?.seasonReason && (
                  <p className="text-text-secondary text-sm mt-2">{destination.seasonReason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Highlights */}
        {destination?.highlights?.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-3">Highlights</p>
            <div className="flex flex-wrap gap-2">
              {destination.highlights.map((highlight, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-surface-muted text-text-secondary text-sm rounded-lg"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <div className="border-t border-stone-200/60 pt-6">
          <button
            onClick={onToggle}
            className="flex items-center justify-between w-full group"
          >
            <span className="text-sm font-medium text-text-secondary group-hover:text-text-main transition-colors">
              {isExpanded ? 'Hide details' : 'View flight & hotel details'}
            </span>
            <svg
              className={`w-5 h-5 text-text-light transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExpanded && (
            <div className="mt-6 space-y-6 animate-fadeIn">
              {/* Flight Details */}
              {flightDetails && (
                <div className="p-5 bg-surface-subtle rounded-xl">
                  <h4 className="text-sm font-semibold text-text-main mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Flight details
                  </h4>

                  {/* Outbound */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Outbound</p>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-text-main">
                          {flightDetails.outbound?.departureTime ? new Date(flightDetails.outbound.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </p>
                        <p className="text-xs text-text-secondary">{flightDetails.outbound?.departureAirport || 'DEP'}</p>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-px bg-stone-300" />
                        <span className="text-xs text-text-light px-2">{formatDuration(flightDetails.outbound?.duration)}</span>
                        <div className="flex-1 h-px bg-stone-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-text-main">
                          {flightDetails.outbound?.arrivalTime ? new Date(flightDetails.outbound.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </p>
                        <p className="text-xs text-text-secondary">{flightDetails.outbound?.arrivalAirport || 'ARR'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Return */}
                  {flightDetails.return && (
                    <div>
                      <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">Return</p>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-text-main">
                            {flightDetails.return?.departureTime ? new Date(flightDetails.return.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </p>
                          <p className="text-xs text-text-secondary">{flightDetails.return?.departureAirport || 'DEP'}</p>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-px bg-stone-300" />
                          <span className="text-xs text-text-light px-2">{formatDuration(flightDetails.return?.duration)}</span>
                          <div className="flex-1 h-px bg-stone-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-text-main">
                            {flightDetails.return?.arrivalTime ? new Date(flightDetails.return.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </p>
                          <p className="text-xs text-text-secondary">{flightDetails.return?.arrivalAirport || 'ARR'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hotel Details */}
              {hotel && (
                <div className="p-5 bg-surface-subtle rounded-xl">
                  <h4 className="text-sm font-semibold text-text-main mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Suggested accommodation
                  </h4>

                  <div className="flex gap-4">
                    {hotel.mainPhoto && (
                      <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={hotel.mainPhoto}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-text-main mb-1">{hotel.name}</p>
                      <div className="flex items-center gap-3 mb-2">
                        {getStarRating(hotel.rating?.value, hotel.stars) > 0 && (
                          <span className="text-sm text-text-secondary">
                            {'★'.repeat(getStarRating(hotel.rating?.value, hotel.stars))}
                          </span>
                        )}
                        {hotel.rating?.value > 0 && (
                          <span className="text-sm font-medium text-primary">{hotel.rating.value.toFixed(1)}</span>
                        )}
                        {hotel.rating?.count > 0 && (
                          <span className="text-sm text-text-light">({hotel.rating.count} reviews)</span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">
                        €{formatNumber(hotel.price || hotel.pricePerNight)}/night · {hotelOptions?.nights || 'N'} nights
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {/* Primary CTA */}
          <a
            href={links?.skyscanner}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors"
          >
            Book this trip
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>

          {/* Secondary CTA */}
          <a
            href={links?.booking}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-4 bg-surface-muted text-text-secondary font-medium rounded-xl hover:bg-surface-hover hover:text-text-main transition-colors"
          >
            View hotels
          </a>
        </div>
      </div>
    </article>
  );
}

export default Results;
