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

  // Format duration from minutes to "Xh Ym" format
  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    // If already formatted as string (e.g., "2h30m"), return as is
    if (typeof duration === 'string') return duration;
    // If number (minutes), convert to hours and minutes
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h${mins > 0 ? mins + 'm' : ''}`;
  };

  // Calculate layover time between two segments
  const calculateLayover = (arrivalTime, departureTime) => {
    if (!arrivalTime || !departureTime) return null;
    const arrival = new Date(arrivalTime);
    const departure = new Date(departureTime);
    const diffMs = departure - arrival;
    if (diffMs <= 0) return null;
    const minutes = Math.round(diffMs / (1000 * 60));
    return formatDuration(minutes);
  };

  // Generate star rating based on hotel rating value (1-10 scale)
  const getStarRating = (ratingValue, hotelStars) => {
    // If hotel has explicit star rating, use it
    if (hotelStars && hotelStars > 0) {
      return hotelStars;
    }
    // Otherwise derive from review score (1-10 scale -> 1-5 stars)
    if (ratingValue) {
      return Math.round(ratingValue / 2);
    }
    return 0;
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
                {/* OUTBOUND FLIGHT */}
                <div className="flight-section">
                  <div className="flight-label">OUTBOUND</div>
                  <div className="flight-header-row">
                    <span className="flight-total-duration">
                      {formatDuration(trip.flightDetails.outbound?.duration)} total
                      {(trip.flightDetails.outbound?.stops || 0) > 0 && (
                        <span className="stops-badge">{trip.flightDetails.outbound.stops} stop{trip.flightDetails.outbound.stops > 1 ? 's' : ''}</span>
                      )}
                      {(trip.flightDetails.outbound?.stops || 0) === 0 && (
                        <span className="direct-badge">Direct</span>
                      )}
                    </span>
                  </div>

                  {/* Flight Segments */}
                  <div className="flight-segments">
                    {trip.flightDetails.outbound?.segments?.map((segment, segIdx) => {
                      const segments = trip.flightDetails.outbound.segments;
                      const nextSegment = segments[segIdx + 1];
                      const layoverTime = nextSegment ? calculateLayover(segment.arrivalTime, nextSegment.departureTime) : null;

                      return (
                        <div key={segIdx} className="segment-wrapper">
                          <div className="flight-segment">
                            {/* Airline Logo & Info */}
                            <div className="segment-airline">
                              {segment.carrierLogo ? (
                                <img src={segment.carrierLogo} alt={segment.carrier} className="airline-logo" />
                              ) : (
                                <span className="airline-icon">✈️</span>
                              )}
                              <div className="airline-details">
                                <span className="airline-name">{segment.carrier || 'Airline'}</span>
                                {segment.flightNumber && <span className="flight-number">{segment.flightNumber}</span>}
                              </div>
                            </div>

                            {/* Route & Times */}
                            <div className="segment-route">
                              <div className="segment-endpoint">
                                <span className="segment-time">
                                  {segment.departureTime ? new Date(segment.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <span className="segment-airport">{segment.origin || segment.departureAirport}</span>
                              </div>
                              <div className="segment-line">
                                <span className="segment-duration">{segment.duration ? formatDuration(segment.duration) : ''}</span>
                              </div>
                              <div className="segment-endpoint">
                                <span className="segment-time">
                                  {segment.arrivalTime ? new Date(segment.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <span className="segment-airport">{segment.destination || segment.arrivalAirport}</span>
                              </div>
                            </div>
                          </div>

                          {/* Layover indicator */}
                          {layoverTime && (
                            <div className="layover-indicator">
                              <span className="layover-icon">⏱️</span>
                              <span className="layover-text">{layoverTime} layover in {segment.destination || segment.arrivalAirport}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Fallback if no segments (old data format) */}
                    {(!trip.flightDetails.outbound?.segments || trip.flightDetails.outbound.segments.length === 0) && (
                      <div className="flight-segment">
                        <div className="segment-airline">
                          <span className="airline-icon">✈️</span>
                          <span className="airline-name">{trip.flightDetails.airline || 'Airline'}</span>
                        </div>
                        <div className="segment-route">
                          <div className="segment-endpoint">
                            <span className="segment-time">
                              {trip.flightDetails.outbound?.departureTime ? new Date(trip.flightDetails.outbound.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            <span className="segment-airport">{trip.flightDetails.outbound?.departureAirport || 'PAR'}</span>
                          </div>
                          <div className="segment-line">
                            <span className="segment-duration">{formatDuration(trip.flightDetails.outbound?.duration)}</span>
                          </div>
                          <div className="segment-endpoint">
                            <span className="segment-time">
                              {trip.flightDetails.outbound?.arrivalTime ? new Date(trip.flightDetails.outbound.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            <span className="segment-airport">{trip.flightDetails.outbound?.arrivalAirport || trip.destination.iataCode}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RETURN FLIGHT */}
                {trip.flightDetails.return && (
                  <div className="flight-section">
                    <div className="flight-label">RETURN</div>
                    <div className="flight-header-row">
                      <span className="flight-total-duration">
                        {formatDuration(trip.flightDetails.return?.duration)} total
                        {(trip.flightDetails.return?.stops || 0) > 0 && (
                          <span className="stops-badge">{trip.flightDetails.return.stops} stop{trip.flightDetails.return.stops > 1 ? 's' : ''}</span>
                        )}
                        {(trip.flightDetails.return?.stops || 0) === 0 && (
                          <span className="direct-badge">Direct</span>
                        )}
                      </span>
                    </div>

                    {/* Return Flight Segments */}
                    <div className="flight-segments">
                      {trip.flightDetails.return?.segments?.map((segment, segIdx) => {
                        const segments = trip.flightDetails.return.segments;
                        const nextSegment = segments[segIdx + 1];
                        const layoverTime = nextSegment ? calculateLayover(segment.arrivalTime, nextSegment.departureTime) : null;

                        return (
                          <div key={segIdx} className="segment-wrapper">
                            <div className="flight-segment">
                              <div className="segment-airline">
                                {segment.carrierLogo ? (
                                  <img src={segment.carrierLogo} alt={segment.carrier} className="airline-logo" />
                                ) : (
                                  <span className="airline-icon">✈️</span>
                                )}
                                <div className="airline-details">
                                  <span className="airline-name">{segment.carrier || 'Airline'}</span>
                                  {segment.flightNumber && <span className="flight-number">{segment.flightNumber}</span>}
                                </div>
                              </div>

                              <div className="segment-route">
                                <div className="segment-endpoint">
                                  <span className="segment-time">
                                    {segment.departureTime ? new Date(segment.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                  <span className="segment-airport">{segment.origin || segment.departureAirport}</span>
                                </div>
                                <div className="segment-line">
                                  <span className="segment-duration">{segment.duration ? formatDuration(segment.duration) : ''}</span>
                                </div>
                                <div className="segment-endpoint">
                                  <span className="segment-time">
                                    {segment.arrivalTime ? new Date(segment.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                  <span className="segment-airport">{segment.destination || segment.arrivalAirport}</span>
                                </div>
                              </div>
                            </div>

                            {layoverTime && (
                              <div className="layover-indicator">
                                <span className="layover-icon">⏱️</span>
                                <span className="layover-text">{layoverTime} layover in {segment.destination || segment.arrivalAirport}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Fallback if no segments */}
                      {(!trip.flightDetails.return?.segments || trip.flightDetails.return.segments.length === 0) && (
                        <div className="flight-segment">
                          <div className="segment-airline">
                            <span className="airline-icon">✈️</span>
                            <span className="airline-name">{trip.flightDetails.airline || 'Airline'}</span>
                          </div>
                          <div className="segment-route">
                            <div className="segment-endpoint">
                              <span className="segment-time">
                                {trip.flightDetails.return?.departureTime ? new Date(trip.flightDetails.return.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              <span className="segment-airport">{trip.flightDetails.return?.departureAirport || trip.destination.iataCode}</span>
                            </div>
                            <div className="segment-line">
                              <span className="segment-duration">{formatDuration(trip.flightDetails.return?.duration)}</span>
                            </div>
                            <div className="segment-endpoint">
                              <span className="segment-time">
                                {trip.flightDetails.return?.arrivalTime ? new Date(trip.flightDetails.return.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              <span className="segment-airport">{trip.flightDetails.return?.arrivalAirport || 'PAR'}</span>
                            </div>
                          </div>
                        </div>
                      )}
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
                    {/* Dynamic stars based on hotel stars or derived from rating */}
                    {(() => {
                      const stars = getStarRating(
                        trip.hotelOptions.hotels[0].rating?.value,
                        trip.hotelOptions.hotels[0].stars
                      );
                      return stars > 0 ? (
                        <span className="hotel-stars">{'⭐'.repeat(Math.min(stars, 5))}</span>
                      ) : null;
                    })()}
                  </div>
                  {/* Rating with review count */}
                  {trip.hotelOptions.hotels[0].rating?.value > 0 && (
                    <div className="hotel-rating">
                      <span className={`rating-badge ${
                        trip.hotelOptions.hotels[0].rating.value >= 9 ? 'exceptional' :
                        trip.hotelOptions.hotels[0].rating.value >= 8 ? 'excellent' :
                        trip.hotelOptions.hotels[0].rating.value >= 7 ? 'good' : ''
                      }`}>
                        {trip.hotelOptions.hotels[0].rating.value.toFixed(1)}
                      </span>
                      <span className="rating-word">{trip.hotelOptions.hotels[0].rating.word || (
                        trip.hotelOptions.hotels[0].rating.value >= 9 ? 'Exceptional' :
                        trip.hotelOptions.hotels[0].rating.value >= 8 ? 'Excellent' :
                        trip.hotelOptions.hotels[0].rating.value >= 7 ? 'Very Good' :
                        trip.hotelOptions.hotels[0].rating.value >= 6 ? 'Good' : 'Pleasant'
                      )}</span>
                      {trip.hotelOptions.hotels[0].rating.count > 0 && (
                        <span className="rating-count">
                          ({trip.hotelOptions.hotels[0].rating.count.toLocaleString()} reviews)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="hotel-details">
                    <span className="hotel-price">€{formatNumber(trip.hotelOptions.hotels[0].price || trip.hotelOptions.hotels[0].pricePerNight)}/night</span>
                    <span className="hotel-separator">•</span>
                    <span>{trip.hotelOptions.nights} nights</span>
                    <span className="hotel-separator">•</span>
                    <span className="hotel-total">€{formatNumber((trip.hotelOptions.hotels[0].price || trip.hotelOptions.hotels[0].pricePerNight) * trip.hotelOptions.nights)} total</span>
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