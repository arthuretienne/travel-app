// frontend/src/utils/bookingLinks.js
// Optimized affiliate link generators for travel booking platforms

import { AIRPORTS, getPrimaryAirport } from '../data/airports';

// Default origin airport (Paris CDG)
const DEFAULT_ORIGIN = 'CDG';

/**
 * Format date as YYMMDD for Skyscanner
 */
function formatDateSky(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Format date as YYYY-MM-DD for Booking.com
 */
function formatDateBooking(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Get IATA code for a destination city
 */
export function getIataCode(city, country = '') {
  if (!city) return null;

  // First try exact city match
  const airport = getPrimaryAirport(city);
  if (airport) return airport.code;

  // Try fuzzy matching
  const lowerCity = city.toLowerCase().trim();
  const lowerCountry = country?.toLowerCase().trim() || '';

  const match = AIRPORTS.find(a => {
    const cityMatch = a.city.toLowerCase() === lowerCity;
    const countryMatch = !lowerCountry || a.country.toLowerCase().includes(lowerCountry);
    return cityMatch && countryMatch && a.primary;
  });

  return match?.code || null;
}

/**
 * Generate optimized Skyscanner flight search link
 * Uses IATA codes when available, falls back to city name search
 */
export function generateFlightLink({
  originCity = null,
  originIata = null,
  destinationCity,
  destinationIata = null,
  destinationCountry = '',
  startDate,
  endDate,
  adults = 1,
  cabinClass = 'economy'
}) {
  // Determine origin IATA
  let origin = originIata;
  if (!origin && originCity) {
    origin = getIataCode(originCity);
  }
  if (!origin) {
    origin = DEFAULT_ORIGIN; // Default to Paris CDG
  }

  // Determine destination IATA
  let destination = destinationIata;
  if (!destination) {
    destination = getIataCode(destinationCity, destinationCountry);
  }

  // Format dates
  const depDate = formatDateSky(startDate);
  const retDate = formatDateSky(endDate);

  // Build URL
  // Skyscanner format: /transport/flights/{origin}/{destination}/{outDate}/{inDate}/
  let url = 'https://www.skyscanner.fr/transport/vols';

  if (destination && depDate && retDate) {
    // Full link with all parameters
    url += `/${origin}/${destination}/${depDate}/${retDate}/`;
    url += `?adultsv2=${adults}&cabinclass=${cabinClass}&childrenv2=&inboundaltsenabled=false&outboundaltsenabled=false&preferdirects=false&ref=home&rtn=1`;
  } else if (destination) {
    // Just origin and destination
    url += `/${origin}/${destination}/`;
    url += `?adultsv2=${adults}&cabinclass=${cabinClass}`;
  } else {
    // Fallback: search by city name
    const searchTerm = encodeURIComponent(destinationCity || 'destination');
    url = `https://www.skyscanner.fr/transport/vols/${origin}/${searchTerm}/`;
  }

  return url;
}

/**
 * Generate optimized Booking.com hotel search link
 */
export function generateHotelLink({
  city,
  country = '',
  startDate,
  endDate,
  adults = 2,
  rooms = 1,
  children = 0
}) {
  const baseUrl = 'https://www.booking.com/searchresults.html';
  const params = new URLSearchParams();

  // Search string (city, country)
  const searchString = country ? `${city}, ${country}` : city;
  params.set('ss', searchString);

  // Dates
  const checkin = formatDateBooking(startDate);
  const checkout = formatDateBooking(endDate);
  if (checkin) params.set('checkin', checkin);
  if (checkout) params.set('checkout', checkout);

  // Guests
  params.set('group_adults', adults.toString());
  params.set('no_rooms', rooms.toString());
  if (children > 0) {
    params.set('group_children', children.toString());
  }

  // Additional useful params
  params.set('selected_currency', 'EUR');
  params.set('lang', 'fr');

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate GetYourGuide activities link
 */
export function generateActivitiesLink({
  city,
  country = '',
  startDate = null,
  endDate = null
}) {
  const searchTerm = encodeURIComponent(city);
  let url = `https://www.getyourguide.fr/s/?q=${searchTerm}&searchSource=1`;

  // Add date range if provided
  const start = formatDateBooking(startDate);
  const end = formatDateBooking(endDate);
  if (start && end) {
    url += `&date_from=${start}&date_to=${end}`;
  }

  return url;
}

/**
 * Generate Viator activities link (alternative to GetYourGuide)
 */
export function generateViatorLink({
  city,
  country = '',
  startDate = null,
  endDate = null
}) {
  const searchTerm = encodeURIComponent(`${city}${country ? ' ' + country : ''}`);
  let url = `https://www.viator.com/fr-FR/searchResults/all?text=${searchTerm}`;

  // Add date range if provided
  const start = formatDateBooking(startDate);
  const end = formatDateBooking(endDate);
  if (start && end) {
    url += `&startDate=${start}&endDate=${end}`;
  }

  return url;
}

/**
 * Generate all booking links for a trip
 */
export function generateAllBookingLinks({
  originCity = null,
  originIata = null,
  destinationCity,
  destinationIata = null,
  destinationCountry = '',
  startDate,
  endDate,
  adults = 1,
  rooms = 1
}) {
  return {
    flight: generateFlightLink({
      originCity,
      originIata,
      destinationCity,
      destinationIata,
      destinationCountry,
      startDate,
      endDate,
      adults
    }),
    hotel: generateHotelLink({
      city: destinationCity,
      country: destinationCountry,
      startDate,
      endDate,
      adults,
      rooms
    }),
    activities: generateActivitiesLink({
      city: destinationCity,
      country: destinationCountry,
      startDate,
      endDate
    }),
    viator: generateViatorLink({
      city: destinationCity,
      country: destinationCountry,
      startDate,
      endDate
    })
  };
}

/**
 * Check booking progress status
 */
export function getBookingProgress(bookingStatus = {}) {
  const items = [
    { key: 'flight', label: 'Vol', icon: 'Plane', booked: !!bookingStatus.flight },
    { key: 'hotel', label: 'Hébergement', icon: 'Hotel', booked: !!bookingStatus.hotel },
    { key: 'activities', label: 'Activités', icon: 'Sparkles', booked: !!bookingStatus.activities }
  ];

  const bookedCount = items.filter(i => i.booked).length;
  const totalCount = items.length;
  const progress = Math.round((bookedCount / totalCount) * 100);

  return {
    items,
    bookedCount,
    totalCount,
    progress,
    isComplete: bookedCount === totalCount
  };
}
