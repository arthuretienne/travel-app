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

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 80) return '#3b82f6'; // blue
    if (score >= 70) return '#f59e0b'; // orange
    return '#ef4444'; // red
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
                  <div className="match-score" style={{ borderColor: getScoreColor(trip.score?.total || 90) }}>
                    <div className="score-number" style={{ color: getScoreColor(trip.score?.total || 90) }}>
                      {formatNumber(trip.score?.total || 90)}
                    </div>
                    <div className="score-label">match</div>
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
              {trip.flightDetails && (
              <div className="flight-info-compact">
                <div className="flight-route">
                  <span className="airport">{trip.flightDetails.outbound?.segments?.[0]?.origin || 'PAR'}</span>
                  <div className="flight-line">
                    <span className="flight-icon">✈️</span>
                    <span className="flight-duration">{trip.flightDetails.outbound?.duration || '2h'}</span>
                  </div>
                  <span className="airport">{trip.flightDetails.outbound?.segments?.[0]?.destination || trip.destination.iataCode}</span>
                </div>
                <div className="airline-info">
                  {trip.flightDetails.airline || 'Airline'} • €{formatNumber(trip.flightDetails.totalPrice)} round-trip
                  {trip.flightDetails.outbound?.departureTime && ` • Departs ${new Date(trip.flightDetails.outbound.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              </div>
              )}

              {/* Hotel Info */}
              {trip.hotelOptions && trip.hotelOptions.hotels && trip.hotelOptions.hotels[0] && (
              <div className="hotel-info-compact">
                <div className="hotel-header">
                  <span className="hotel-icon">🏨</span>
                  <span className="hotel-name">{trip.hotelOptions.hotels[0].name}</span>
                  {trip.hotelOptions.hotels[0].stars > 0 && (
                    <span className="hotel-stars">{'⭐'.repeat(Math.min(trip.hotelOptions.hotels[0].stars, 5))}</span>
                  )}
                </div>
                <div className="hotel-details">
                  €{formatNumber(trip.hotelOptions.hotels[0].price)}/night • {trip.hotelOptions.nights} nights
                  {trip.hotelOptions.hotels[0].location && ` • ${trip.hotelOptions.hotels[0].location}`}
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