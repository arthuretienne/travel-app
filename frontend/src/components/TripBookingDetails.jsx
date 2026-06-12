// frontend/src/components/TripBookingDetails.jsx
// Component to display flight and hotel details from saved trip data
import {
  Plane,
  Hotel,
  Clock,
  MapPin,
  Star,
  ExternalLink,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { generateAllBookingLinks, getIataCode } from '../utils/bookingLinks';
import { formatEUR } from '../utils/format';

/**
 * TripBookingDetails - Shows saved flight and hotel recommendations
 * @param {Object} tripData - The trip data from finalDestination
 * @param {string} city - Destination city
 * @param {string} country - Destination country
 * @param {string} startDate - Trip start date
 * @param {string} endDate - Trip end date
 * @param {number} adults - Number of travelers
 */
export default function TripBookingDetails({
  tripData,
  city,
  country,
  startDate,
  endDate,
  adults = 1,
}) {
  const flightDetails = tripData?.flightDetails;
  const hotelOptions = tripData?.hotelOptions;
  const pricing = tripData?.pricing;
  const hotel = hotelOptions?.hotels?.[0];

  // Generate booking links as fallback
  const links = generateAllBookingLinks({
    destinationCity: city,
    destinationIata: getIataCode(city, country),
    destinationCountry: country,
    startDate,
    endDate,
    adults,
  });

  // Format time
  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    if (timeStr.includes(':')) return timeStr;
    return timeStr;
  };

  // Format duration
  const formatDuration = (duration) => {
    if (!duration) return null;
    if (typeof duration === 'string') return duration;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h${mins > 0 ? mins + 'm' : ''}`;
  };

  const flightSentence = (segment, direction) => {
    if (!segment) return null;
    const departure = formatTime(segment.departureTime) || 'horaire à confirmer';
    const arrival = formatTime(segment.arrivalTime) || 'arrivée à confirmer';
    const from = segment.departureAirport || (direction === 'outbound' ? 'départ' : city);
    const to = segment.arrivalAirport || (direction === 'outbound' ? city : 'arrivée');
    const duration = formatDuration(segment.duration);
    const stops = Number(segment.stops || 0);
    const stopText = stops > 0 ? `${stops} escale${stops > 1 ? 's' : ''}` : 'direct';
    return `Départ ${from} ${departure}, arrivée ${to} ${arrival}${duration ? `, ${duration}` : ''}, ${stopText}.`;
  };

  // If no flight or hotel data, don't render
  if (!flightDetails && !hotel) {
    return null;
  }

  return (
    <div className="bg-white rounded-[20px] shadow-card border border-sand-200 overflow-hidden mb-6">
      <div className="p-6 border-b border-sand-100">
        <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Recommandations de réservation
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Formats lisibles pour décider vite, détails techniques en sous-ligne.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Flight Section */}
        {flightDetails && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-main flex items-center gap-2">
                <Plane className="w-5 h-5 text-primary" />
                Vol recommandé
              </h3>
              {pricing?.flight && (
                <span className="font-display text-2xl text-primary">
                  {formatEUR(Math.round(pricing.flight))}
                </span>
              )}
            </div>

            {/* Outbound Flight */}
            {flightDetails.outbound && (
              <div className="bg-ember-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-ember-800 font-medium">
                  <Calendar className="w-4 h-4" />
                  Aller - {startDate ? new Date(startDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'N/A'}
                </div>

                <p className="text-sm leading-6 text-text-main">
                  {flightSentence(flightDetails.outbound, 'outbound')}
                </p>

                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-xl font-bold text-text-main">
                      {formatTime(flightDetails.outbound.departureTime) || '--:--'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {flightDetails.outbound.departureAirport || 'Départ'}
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col items-center px-4">
                    <div className="text-xs text-text-secondary">
                      {formatDuration(flightDetails.outbound.duration) || 'Direct'}
                    </div>
                    <div className="w-full flex items-center gap-1 my-1">
                      <div className="h-px flex-1 bg-ember-200" />
                      <Plane className="w-4 h-4 text-primary rotate-90" />
                      <div className="h-px flex-1 bg-ember-200" />
                    </div>
                    {flightDetails.outbound.stops > 0 && (
                      <div className="text-xs text-gold-500">
                        {flightDetails.outbound.stops} escale{flightDetails.outbound.stops > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold text-text-main">
                      {formatTime(flightDetails.outbound.arrivalTime) || '--:--'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {flightDetails.outbound.arrivalAirport || city}
                    </p>
                  </div>
                </div>

                {flightDetails.airlines?.[0] && (
                  <div className="text-xs text-text-secondary">
                    Compagnie: {flightDetails.airlines.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Return Flight */}
            {flightDetails.return && (
              <div className="bg-ember-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-ember-800 font-medium">
                  <Calendar className="w-4 h-4" />
                  Retour - {endDate ? new Date(endDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'N/A'}
                </div>

                <p className="text-sm leading-6 text-text-main">
                  {flightSentence(flightDetails.return, 'return')}
                </p>

                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-xl font-bold text-text-main">
                      {formatTime(flightDetails.return.departureTime) || '--:--'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {flightDetails.return.departureAirport || city}
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col items-center px-4">
                    <div className="text-xs text-text-secondary">
                      {formatDuration(flightDetails.return.duration) || 'Direct'}
                    </div>
                    <div className="w-full flex items-center gap-1 my-1">
                      <div className="h-px flex-1 bg-ember-200" />
                      <Plane className="w-4 h-4 text-primary -rotate-90" />
                      <div className="h-px flex-1 bg-ember-200" />
                    </div>
                    {flightDetails.return.stops > 0 && (
                      <div className="text-xs text-gold-500">
                        {flightDetails.return.stops} escale{flightDetails.return.stops > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold text-text-main">
                      {formatTime(flightDetails.return.arrivalTime) || '--:--'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {flightDetails.return.arrivalAirport || 'Arrivée'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <a
              href={links.flight}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              <Plane className="w-5 h-5" />
              Rechercher ce vol
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Hotel Section */}
        {hotel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-main flex items-center gap-2">
                <Hotel className="w-5 h-5 text-moss-500" />
                Hébergement recommandé
              </h3>
              {hotel.pricePerNight && (
                <span className="font-display text-2xl text-moss-500">
                  {formatEUR(Math.round(hotel.pricePerNight))}/nuit
                </span>
              )}
            </div>

            <div className="bg-sand-50 rounded-xl overflow-hidden border border-sand-100">
              {/* Hotel Photo */}
              {hotel.mainPhoto && (
                <div className="h-48 w-full overflow-hidden">
                  <img
                    src={hotel.mainPhoto}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-text-main text-lg">{hotel.name}</h4>
                  {hotel.location && (
                    <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {hotel.location}
                    </p>
                  )}
                </div>

                {/* Rating & Stars */}
                <div className="flex items-center gap-4">
                  {hotel.stars > 0 && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-gold-500 fill-gold-500" />
                      ))}
                    </div>
                  )}
                  {hotel.rating?.value && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-moss-100 rounded-lg">
                      <span className="font-bold text-[#3d5a24]">{hotel.rating.value}</span>
                      {hotel.rating.word && (
                        <span className="text-xs text-[#3d5a24]">{hotel.rating.word}</span>
                      )}
                      {hotel.rating.count && (
                        <span className="text-xs text-moss-500">({hotel.rating.count} avis)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Check-in/out times */}
                {(hotel.checkInTime || hotel.checkOutTime) && (
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    {hotel.checkInTime && (
                      <span>Check-in: {hotel.checkInTime}</span>
                    )}
                    {hotel.checkOutTime && (
                      <span>Check-out: {hotel.checkOutTime}</span>
                    )}
                  </div>
                )}

                {/* Amenities */}
                {hotel.amenities && hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hotel.amenities.slice(0, 5).map((amenity, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white text-xs text-text-secondary rounded-full border border-sand-200"
                      >
                        {amenity}
                      </span>
                    ))}
                    {hotel.amenities.length > 5 && (
                      <span className="px-2 py-1 text-xs text-text-secondary">
                        +{hotel.amenities.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                {/* Total Price */}
                {hotel.totalPrice && (
                  <div className="pt-2 border-t border-sand-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        {hotelOptions?.nights || Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) - 1} nuits
                      </span>
                      <span className="font-bold text-text-main">
                        Total: {formatEUR(Math.round(hotel.totalPrice))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <a
              href={links.hotel}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-sand-900 text-white font-medium rounded-xl hover:bg-sand-800 transition-colors"
            >
              <Hotel className="w-5 h-5" />
              Réserver cet hôtel
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Total Price Summary */}
        {pricing && (pricing.flight || pricing.hotel) && (
          <div className="pt-4 border-t border-sand-200">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Budget estimé total</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">
                  {formatEUR(Math.round(pricing.total || (pricing.flight || 0) + (pricing.hotel || 0)))}
                </span>
                <span className="text-sm text-text-secondary ml-1">/personne</span>
              </div>
            </div>
            {pricing.activities > 0 && (
              <p className="text-xs text-text-secondary mt-1">
                + {formatEUR(Math.round(pricing.activities))} budget activités
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
