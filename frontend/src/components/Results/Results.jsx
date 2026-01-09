// frontend/src/components/Results/Results.jsx
import './Results.css';

function Results({ recommendations, onReset }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatNumber = (num) => {
    // Format number to maximum 2 decimal places, removing unnecessary zeros
    // Handle undefined/null values gracefully
    return parseFloat((num ?? 0).toFixed(2));
  };

  const getDestinationImage = (photo, city, country) => {
    // Use photo from backend if available, otherwise fallback to Unsplash
    if (photo && photo.url) {
      return photo.url;
    }
    // Fallback to Unsplash API
    const query = encodeURIComponent(`${city} ${country} travel`);
    return `https://source.unsplash.com/800x400/?${query}`;
  };

  // Check if any recommendation is a roadtrip
  const hasRoadtrip = recommendations.some(r => r.type === 'roadtrip');

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>✨ Your Perfect Trips</h2>
        <p className="results-subtitle">
          We found <strong>{recommendations.length} amazing {hasRoadtrip ? 'adventure' : 'destinations'}</strong> tailored just for you
        </p>
        <button className="btn-new-search" onClick={onReset}>
          🔄 Start New Search
        </button>
      </div>

      <div className="trips-list">
        {recommendations.map((trip, index) => (
          // Handle ROADTRIP type
          trip?.type === 'roadtrip' ? (
            <div key={index} className="trip-card-modern roadtrip-card">
              {/* Roadtrip Header with first city image */}
              <div className="destination-image-container">
                <img
                  src={getDestinationImage(trip.cities?.[0]?.photo, trip.cities?.[0]?.name, trip.cities?.[0]?.country)}
                  alt={trip.title}
                  className="destination-image"
                  onError={(e) => {
                    e.target.src = `https://source.unsplash.com/800x400/?roadtrip,travel`;
                  }}
                />
                <div className="image-overlay"></div>
                {/* Roadtrip Badge */}
                <div className="rank-badge" style={{ background: '#8b5cf6' }}>
                  🗺️
                </div>
              </div>

              {/* Roadtrip Main Content */}
              <div className="trip-main">
                {/* Roadtrip Header */}
                <div className="destination-header">
                  <div className="destination-info">
                    <h3 className="destination-name">
                      {trip.title || 'Multi-City Adventure'}
                      <span className="destination-country">{trip.cities?.length} cities</span>
                    </h3>
                    <div className="trip-dates-badge">
                      📅 {trip.duration} days • {trip.cities?.map(c => c.name).join(' → ')}
                    </div>
                  </div>
                </div>

                {/* Roadtrip Overview */}
                <div className="why-section">
                  <div className="why-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="why-icon">🗺️</div>
                    <div className="why-content">
                      <strong>Your Adventure</strong>
                      <p>{trip.tagline || trip.overview}</p>
                    </div>
                  </div>
                </div>

                {/* Cities Preview */}
                <div className="roadtrip-cities">
                  {trip.cities?.map((city, cityIndex) => (
                    <div key={cityIndex} className="roadtrip-city-card">
                      <div className="city-image-small">
                        <img
                          src={getDestinationImage(city.photo, city.name, city.country)}
                          alt={city.name}
                          onError={(e) => {
                            e.target.src = `https://source.unsplash.com/200x150/?${encodeURIComponent(city.name)}`;
                          }}
                        />
                      </div>
                      <div className="city-info">
                        <strong>{city.name}</strong>
                        <span>{city.nights} night{city.nights > 1 ? 's' : ''}</span>
                        {city.hotel && <small>🏨 {city.hotel.name}</small>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Overview */}
                <div className="price-overview">
                  <div className="price-main">
                    <div className="price-label">Total Roadtrip Cost</div>
                    <div className="price-value">€{formatNumber(trip.pricing?.totalCost || trip.pricing?.total)}</div>
                  </div>

                  <div className="price-breakdown-compact">
                    <div className="price-item">
                      <span className="price-icon">🚗</span>
                      <span className="price-label">Transport</span>
                      <span className="price-amount">€{formatNumber(trip.pricing?.transport)}</span>
                    </div>
                    <div className="price-item">
                      <span className="price-icon">🏨</span>
                      <span className="price-label">Hotels</span>
                      <span className="price-amount">€{formatNumber(trip.pricing?.hotels)}</span>
                    </div>
                    <div className="price-item">
                      <span className="price-icon">🎭</span>
                      <span className="price-label">Activities</span>
                      <span className="price-amount">€{formatNumber(trip.pricing?.activities)}</span>
                    </div>
                  </div>
                </div>

                {/* Narrative highlights */}
                {trip.narrative && (
                  <div className="roadtrip-narrative">
                    <h4>✨ Highlights</h4>
                    <ul>
                      {trip.narrative.practicalTips?.slice(0, 3).map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                    {trip.narrative.hiddenGems?.length > 0 && (
                      <p className="hidden-gem">💎 Hidden gem: {trip.narrative.hiddenGems[0]}</p>
                    )}
                  </div>
                )}

                {/* Transport info */}
                {trip.transport?.modes && (
                  <div className="flight-info-compact">
                    <div className="transport-modes">
                      <span>🚀 Transport: {trip.transport.modes.join(', ')}</span>
                    </div>
                    <div className="airline-info">
                      {trip.transport.narrative || `Travel between ${trip.cities?.length} cities`}
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Details */}
              <details className="trip-details">
                <summary className="details-toggle">
                  📊 View detailed itinerary
                </summary>
                <div className="details-content">
                  <div className="roadtrip-day-by-day">
                    <h4>Day-by-Day Highlights</h4>
                    {trip.narrative?.dayByDayHighlights?.map((day, i) => (
                      <div key={i} className="day-highlight">
                        <strong>Day {day.day}: {day.city}</strong>
                        <p>{day.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          ) :
          // Handle regular DESTINATION type
          trip?.destination && (
          <div key={index} className="trip-card-modern">
            {/* Destination Image */}
            <div className="destination-image-container">
              <img
                src={getDestinationImage(trip.destination?.photo, trip.destination?.city, trip.destination?.country)}
                alt={trip.destination?.photo?.alt || `${trip.destination?.city}, ${trip.destination?.country}`}
                className="destination-image"
                onError={(e) => {
                  // Fallback to a placeholder if image fails to load
                  e.target.src = `https://source.unsplash.com/800x400/?${encodeURIComponent(trip.destination.city)}`;
                }}
              />
              <div className="image-overlay"></div>
              {/* Photo Credit */}
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
              {/* Rank Badge */}
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
              </div>

              {/* Why This Trip - Only show if we have AI-generated content */}
              {(trip.destination.matchReason || trip.destination.seasonReason) && (
                <div className="why-section">
                  {trip.destination.matchReason && (
                    <div className="why-card">
                      <div className="why-icon">💡</div>
                      <div className="why-content">
                        <strong>Why this destination?</strong>
                        <p>{trip.destination.matchReason}</p>
                      </div>
                    </div>
                  )}
                  {trip.destination.seasonReason && (
                    <div className="why-card">
                      <div className="why-icon">🌤️</div>
                      <div className="why-content">
                        <strong>Why now?</strong>
                        <p>{trip.destination.seasonReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Highlights */}
              {trip.destination.highlights?.length > 0 && (
                <div className="highlights-section">
                  <div className="highlights-title">✨ Must-do experiences</div>
                  <div className="highlights-list">
                    {trip.destination.highlights.map((highlight, i) => (
                      <span key={i} className="highlight-tag">{highlight}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Overview */}
              {trip.pricing && (
              <div className="price-overview">
                <div className="price-main">
                  <div className="price-label">Total Trip Cost</div>
                  <div className="price-value">€{formatNumber(trip.pricing?.total || 0)}</div>
                  {(trip.pricing?.remaining ?? 0) >= 0 ? (
                    <div className="price-remaining positive">
                      €{formatNumber(trip.pricing?.remaining || 0)} under budget ✓
                    </div>
                  ) : (
                    <div className="price-remaining negative">
                      €{formatNumber(Math.abs(trip.pricing?.remaining || 0))} over budget
                    </div>
                  )}
                </div>

                <div className="price-breakdown-compact">
                  <div className="price-item">
                    <span className="price-icon">✈️</span>
                    <span className="price-label">Flight</span>
                    <span className="price-amount">€{formatNumber(trip.pricing?.flight || 0)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-icon">🏨</span>
                    <span className="price-label">Hotel ({(trip.slot?.duration || 1) - 1}n)</span>
                    <span className="price-amount">€{formatNumber(trip.pricing?.hotel || 0)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-icon">🎭</span>
                    <span className="price-label">Activities</span>
                    <span className="price-amount">€{formatNumber(trip.pricing?.activities || 0)}</span>
                  </div>
                </div>
              </div>
              )}

              {/* Flight Info */}
              {trip.flightDetails && (
              <div className="flight-info-compact">
                <div className="flight-section">
                  <div className="flight-label">OUTBOUND</div>
                  <div className="flight-route">
                    <span className="flight-time">{trip.flightDetails.outbound?.departureTime ? new Date(trip.flightDetails.outbound.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    <span className="airport">{trip.flightDetails.outbound?.departureAirport || 'PAR'}</span>
                    <div className="flight-line">
                      <span className="flight-duration">{trip.flightDetails.outbound?.duration || '2h'} • {trip.flightDetails.outbound?.stops || 0} stop{(trip.flightDetails.outbound?.stops || 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="flight-time">{trip.flightDetails.outbound?.arrivalTime ? new Date(trip.flightDetails.outbound.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    <span className="airport">{trip.flightDetails.outbound?.arrivalAirport || trip.destination.iataCode}</span>
                  </div>
                  <div className="airline-info">
                    {trip.flightDetails.airlines?.length > 0
                      ? trip.flightDetails.airlines.join(' + ')
                      : trip.flightDetails.airline || 'Airline'}
                  </div>
                </div>
                {trip.flightDetails.return && (
                  <div className="flight-section">
                    <div className="flight-label">RETURN</div>
                    <div className="flight-route">
                      <span className="flight-time">{trip.flightDetails.return?.departureTime ? new Date(trip.flightDetails.return.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <span className="airport">{trip.flightDetails.return?.departureAirport || trip.destination.iataCode}</span>
                      <div className="flight-line">
                        <span className="flight-duration">{trip.flightDetails.return?.duration || '2h'} • {trip.flightDetails.return?.stops || 0} stop{(trip.flightDetails.return?.stops || 0) !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="flight-time">{trip.flightDetails.return?.arrivalTime ? new Date(trip.flightDetails.return.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <span className="airport">{trip.flightDetails.return?.arrivalAirport || 'PAR'}</span>
                    </div>
                    <div className="airline-info">
                      {trip.flightDetails.returnAirlines?.length > 0
                        ? trip.flightDetails.returnAirlines.join(' + ')
                        : trip.flightDetails.airline || 'Airline'}
                    </div>
                  </div>
                )}
                <div className="flight-price">
                  €{formatNumber(trip.flightDetails.totalPrice)} round-trip
                </div>
              </div>
              )}

              {/* Ground Transport Info (if flying to nearby airport) */}
              {trip.groundTransport && (
              <div className="transport-info-compact">
                <div className="transport-header">
                  <span className="transport-icon">
                    {trip.groundTransport.type === 'train' ? '🚄' :
                     trip.groundTransport.type === 'bus' ? '🚌' :
                     trip.groundTransport.type === 'ferry' ? '⛴️' :
                     trip.groundTransport.type === 'car' ? '🚗' : '🚐'}
                  </span>
                  <span className="transport-title">
                    {trip.groundTransport.type.charAt(0).toUpperCase() + trip.groundTransport.type.slice(1)} to {trip.groundTransport.to.split(',')[0]}
                  </span>
                </div>
                <div className="transport-details">
                  <span className="transport-route">
                    From {trip.groundTransport.from} Airport
                  </span>
                  <span className="transport-separator">•</span>
                  <span className="transport-duration">{trip.groundTransport.duration}</span>
                  <span className="transport-separator">•</span>
                  <span className="transport-cost">~€{trip.groundTransport.estimatedCostRoundTrip} round-trip</span>
                </div>
                <div className="transport-note">
                  <span className="note-icon">ℹ️</span>
                  <span>Nearest airport - no direct flights to {trip.groundTransport.to.split(',')[0]}</span>
                </div>
              </div>
              )}

              {/* Hotel Info */}
              {trip.hotelOptions && trip.hotelOptions.hotels && trip.hotelOptions.hotels[0] && (
              <div className="hotel-info-compact">
                {/* Hotel Photo */}
                {trip.hotelOptions.hotels[0].mainPhoto && (
                  <div className="hotel-photo">
                    <img
                      src={trip.hotelOptions.hotels[0].mainPhoto}
                      alt={trip.hotelOptions.hotels[0].name}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
                <div className="hotel-content">
                  <div className="hotel-header">
                    <span className="hotel-icon">🏨</span>
                    <span className="hotel-name">{trip.hotelOptions.hotels[0].name}</span>
                    {trip.hotelOptions.hotels[0].stars > 0 && (
                      <span className="hotel-stars">{'⭐'.repeat(Math.min(trip.hotelOptions.hotels[0].stars, 5))}</span>
                    )}
                  </div>
                  {/* Rating */}
                  {trip.hotelOptions.hotels[0].rating?.value > 0 && (
                    <div className="hotel-rating">
                      <span className="rating-badge">{trip.hotelOptions.hotels[0].rating.value.toFixed(1)}</span>
                      <span className="rating-word">{trip.hotelOptions.hotels[0].rating.word}</span>
                      {trip.hotelOptions.hotels[0].rating.count > 0 && (
                        <span className="rating-count">({trip.hotelOptions.hotels[0].rating.count} reviews)</span>
                      )}
                    </div>
                  )}
                  <div className="hotel-details">
                    <span className="hotel-price">€{formatNumber(trip.hotelOptions.hotels[0].price)}/night</span>
                    <span className="hotel-separator">•</span>
                    <span>{trip.hotelOptions.nights} nights</span>
                    {trip.hotelOptions.hotels[0].checkInTime && (
                      <>
                        <span className="hotel-separator">•</span>
                        <span className="hotel-checkin">Check-in {trip.hotelOptions.hotels[0].checkInTime}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Action Buttons */}
              <div className="trip-actions">
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

          </div>
          )
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">😔</div>
          <h3>No trips found</h3>
          <p>Try adjusting your preferences or budget</p>
          <button className="btn-primary" onClick={onReset}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default Results;