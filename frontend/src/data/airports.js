// frontend/src/data/airports.js
// Comprehensive airport database with IATA codes
// Sorted by popularity/usage for better autocomplete experience

export const AIRPORTS = [
  // France - Major cities
  { city: 'Paris', name: 'Paris Charles de Gaulle', code: 'CDG', country: 'France', primary: true },
  { city: 'Paris', name: 'Paris Orly', code: 'ORY', country: 'France' },
  { city: 'Paris', name: 'Paris Beauvais', code: 'BVA', country: 'France' },
  { city: 'Lyon', name: 'Lyon-Saint Exupéry', code: 'LYS', country: 'France', primary: true },
  { city: 'Marseille', name: 'Marseille Provence', code: 'MRS', country: 'France', primary: true },
  { city: 'Nice', name: 'Nice Côte d\'Azur', code: 'NCE', country: 'France', primary: true },
  { city: 'Toulouse', name: 'Toulouse-Blagnac', code: 'TLS', country: 'France', primary: true },
  { city: 'Bordeaux', name: 'Bordeaux-Mérignac', code: 'BOD', country: 'France', primary: true },
  { city: 'Nantes', name: 'Nantes Atlantique', code: 'NTE', country: 'France', primary: true },
  { city: 'Strasbourg', name: 'Strasbourg', code: 'SXB', country: 'France', primary: true },
  { city: 'Lille', name: 'Lille', code: 'LIL', country: 'France', primary: true },
  { city: 'Montpellier', name: 'Montpellier-Méditerranée', code: 'MPL', country: 'France', primary: true },
  { city: 'Bâle', name: 'EuroAirport Basel-Mulhouse-Freiburg', code: 'BSL', country: 'France/Switzerland', primary: true },
  { city: 'Rennes', name: 'Rennes-Saint-Jacques', code: 'RNS', country: 'France' },
  { city: 'Brest', name: 'Brest Bretagne', code: 'BES', country: 'France' },
  { city: 'Clermont-Ferrand', name: 'Clermont-Ferrand Auvergne', code: 'CFE', country: 'France' },
  { city: 'Biarritz', name: 'Biarritz-Pays Basque', code: 'BIQ', country: 'France' },
  { city: 'La Rochelle', name: 'La Rochelle-Île de Ré', code: 'LRH', country: 'France' },

  // Europe - Major hubs
  { city: 'London', name: 'London Heathrow', code: 'LHR', country: 'United Kingdom', primary: true },
  { city: 'London', name: 'London Gatwick', code: 'LGW', country: 'United Kingdom' },
  { city: 'London', name: 'London Stansted', code: 'STN', country: 'United Kingdom' },
  { city: 'London', name: 'London Luton', code: 'LTN', country: 'United Kingdom' },
  { city: 'London', name: 'London City', code: 'LCY', country: 'United Kingdom' },
  { city: 'Amsterdam', name: 'Amsterdam Schiphol', code: 'AMS', country: 'Netherlands', primary: true },
  { city: 'Frankfurt', name: 'Frankfurt', code: 'FRA', country: 'Germany', primary: true },
  { city: 'Munich', name: 'Munich', code: 'MUC', country: 'Germany', primary: true },
  { city: 'Berlin', name: 'Berlin Brandenburg', code: 'BER', country: 'Germany', primary: true },
  { city: 'Madrid', name: 'Madrid-Barajas', code: 'MAD', country: 'Spain', primary: true },
  { city: 'Barcelona', name: 'Barcelona-El Prat', code: 'BCN', country: 'Spain', primary: true },
  { city: 'Rome', name: 'Rome Fiumicino', code: 'FCO', country: 'Italy', primary: true },
  { city: 'Rome', name: 'Rome Ciampino', code: 'CIA', country: 'Italy' },
  { city: 'Milan', name: 'Milan Malpensa', code: 'MXP', country: 'Italy', primary: true },
  { city: 'Milan', name: 'Milan Linate', code: 'LIN', country: 'Italy' },
  { city: 'Milan', name: 'Milan Bergamo', code: 'BGY', country: 'Italy' },
  { city: 'Zurich', name: 'Zurich', code: 'ZRH', country: 'Switzerland', primary: true },
  { city: 'Geneva', name: 'Geneva', code: 'GVA', country: 'Switzerland', primary: true },
  { city: 'Vienna', name: 'Vienna', code: 'VIE', country: 'Austria', primary: true },
  { city: 'Brussels', name: 'Brussels', code: 'BRU', country: 'Belgium', primary: true },
  { city: 'Brussels', name: 'Brussels Charleroi', code: 'CRL', country: 'Belgium' },
  { city: 'Copenhagen', name: 'Copenhagen', code: 'CPH', country: 'Denmark', primary: true },
  { city: 'Stockholm', name: 'Stockholm Arlanda', code: 'ARN', country: 'Sweden', primary: true },
  { city: 'Oslo', name: 'Oslo Gardermoen', code: 'OSL', country: 'Norway', primary: true },
  { city: 'Helsinki', name: 'Helsinki-Vantaa', code: 'HEL', country: 'Finland', primary: true },
  { city: 'Dublin', name: 'Dublin', code: 'DUB', country: 'Ireland', primary: true },
  { city: 'Lisbon', name: 'Lisbon', code: 'LIS', country: 'Portugal', primary: true },
  { city: 'Porto', name: 'Porto', code: 'OPO', country: 'Portugal', primary: true },
  { city: 'Athens', name: 'Athens', code: 'ATH', country: 'Greece', primary: true },
  { city: 'Prague', name: 'Prague Václav Havel', code: 'PRG', country: 'Czech Republic', primary: true },
  { city: 'Budapest', name: 'Budapest Ferenc Liszt', code: 'BUD', country: 'Hungary', primary: true },
  { city: 'Warsaw', name: 'Warsaw Chopin', code: 'WAW', country: 'Poland', primary: true },
  { city: 'Krakow', name: 'Kraków John Paul II', code: 'KRK', country: 'Poland', primary: true },

  // Spain - Popular destinations
  { city: 'Valencia', name: 'Valencia', code: 'VLC', country: 'Spain', primary: true },
  { city: 'Seville', name: 'Seville', code: 'SVQ', country: 'Spain', primary: true },
  { city: 'Malaga', name: 'Málaga-Costa del Sol', code: 'AGP', country: 'Spain', primary: true },
  { city: 'Bilbao', name: 'Bilbao', code: 'BIO', country: 'Spain', primary: true },
  { city: 'Palma de Mallorca', name: 'Palma de Mallorca', code: 'PMI', country: 'Spain', primary: true },
  { city: 'Alicante', name: 'Alicante-Elche', code: 'ALC', country: 'Spain', primary: true },
  { city: 'Ibiza', name: 'Ibiza', code: 'IBZ', country: 'Spain', primary: true },

  // Italy - Popular destinations
  { city: 'Venice', name: 'Venice Marco Polo', code: 'VCE', country: 'Italy', primary: true },
  { city: 'Florence', name: 'Florence', code: 'FLR', country: 'Italy', primary: true },
  { city: 'Naples', name: 'Naples', code: 'NAP', country: 'Italy', primary: true },
  { city: 'Bologna', name: 'Bologna', code: 'BLQ', country: 'Italy', primary: true },
  { city: 'Pisa', name: 'Pisa', code: 'PSA', country: 'Italy', primary: true },
  { city: 'Turin', name: 'Turin', code: 'TRN', country: 'Italy', primary: true },
  { city: 'Catania', name: 'Catania', code: 'CTA', country: 'Italy', primary: true },
  { city: 'Palermo', name: 'Palermo', code: 'PMO', country: 'Italy', primary: true },

  // Eastern Europe
  { city: 'Bucharest', name: 'Bucharest Henri Coandă', code: 'OTP', country: 'Romania', primary: true },
  { city: 'Sofia', name: 'Sofia', code: 'SOF', country: 'Bulgaria', primary: true },
  { city: 'Belgrade', name: 'Belgrade Nikola Tesla', code: 'BEG', country: 'Serbia', primary: true },
  { city: 'Zagreb', name: 'Zagreb', code: 'ZAG', country: 'Croatia', primary: true },
  { city: 'Dubrovnik', name: 'Dubrovnik', code: 'DBV', country: 'Croatia', primary: true },
  { city: 'Split', name: 'Split', code: 'SPU', country: 'Croatia', primary: true },
  { city: 'Riga', name: 'Riga', code: 'RIX', country: 'Latvia', primary: true },
  { city: 'Tallinn', name: 'Tallinn', code: 'TLL', country: 'Estonia', primary: true },
  { city: 'Vilnius', name: 'Vilnius', code: 'VNO', country: 'Lithuania', primary: true },

  // Greece - Islands
  { city: 'Santorini', name: 'Santorini (Thira)', code: 'JTR', country: 'Greece', primary: true },
  { city: 'Mykonos', name: 'Mykonos', code: 'JMK', country: 'Greece', primary: true },
  { city: 'Heraklion', name: 'Heraklion', code: 'HER', country: 'Greece', primary: true },
  { city: 'Rhodes', name: 'Rhodes', code: 'RHO', country: 'Greece', primary: true },
  { city: 'Corfu', name: 'Corfu', code: 'CFU', country: 'Greece', primary: true },
  { city: 'Thessaloniki', name: 'Thessaloniki', code: 'SKG', country: 'Greece', primary: true },

  // North Africa & Middle East
  { city: 'Marrakech', name: 'Marrakech Menara', code: 'RAK', country: 'Morocco', primary: true },
  { city: 'Casablanca', name: 'Casablanca Mohammed V', code: 'CMN', country: 'Morocco', primary: true },
  { city: 'Fez', name: 'Fès–Saïs', code: 'FEZ', country: 'Morocco', primary: true },
  { city: 'Agadir', name: 'Agadir-Al Massira', code: 'AGA', country: 'Morocco', primary: true },
  { city: 'Tunis', name: 'Tunis-Carthage', code: 'TUN', country: 'Tunisia', primary: true },
  { city: 'Istanbul', name: 'Istanbul', code: 'IST', country: 'Turkey', primary: true },
  { city: 'Istanbul', name: 'Istanbul Sabiha Gökçen', code: 'SAW', country: 'Turkey' },
  { city: 'Tel Aviv', name: 'Tel Aviv Ben Gurion', code: 'TLV', country: 'Israel', primary: true },
  { city: 'Dubai', name: 'Dubai', code: 'DXB', country: 'UAE', primary: true },

  // Scandinavia
  { city: 'Reykjavik', name: 'Reykjavík Keflavík', code: 'KEF', country: 'Iceland', primary: true },
  { city: 'Bergen', name: 'Bergen', code: 'BGO', country: 'Norway', primary: true },
  { city: 'Tromsø', name: 'Tromsø', code: 'TOS', country: 'Norway', primary: true },
  { city: 'Gothenburg', name: 'Gothenburg Landvetter', code: 'GOT', country: 'Sweden', primary: true },

  // Atlantic Islands
  { city: 'Funchal', name: 'Funchal (Madeira)', code: 'FNC', country: 'Portugal', primary: true },
  { city: 'Ponta Delgada', name: 'Ponta Delgada (Azores)', code: 'PDL', country: 'Portugal', primary: true },
  { city: 'Tenerife', name: 'Tenerife South', code: 'TFS', country: 'Spain', primary: true },
  { city: 'Tenerife', name: 'Tenerife North', code: 'TFN', country: 'Spain' },
  { city: 'Gran Canaria', name: 'Gran Canaria', code: 'LPA', country: 'Spain', primary: true },
  { city: 'Lanzarote', name: 'Lanzarote', code: 'ACE', country: 'Spain', primary: true },
  { city: 'Fuerteventura', name: 'Fuerteventura', code: 'FUE', country: 'Spain', primary: true },

  // Long-haul popular from Europe
  { city: 'New York', name: 'New York JFK', code: 'JFK', country: 'USA', primary: true },
  { city: 'New York', name: 'New York Newark', code: 'EWR', country: 'USA' },
  { city: 'Los Angeles', name: 'Los Angeles', code: 'LAX', country: 'USA', primary: true },
  { city: 'Miami', name: 'Miami', code: 'MIA', country: 'USA', primary: true },
  { city: 'Montreal', name: 'Montréal-Trudeau', code: 'YUL', country: 'Canada', primary: true },
  { city: 'Toronto', name: 'Toronto Pearson', code: 'YYZ', country: 'Canada', primary: true },
  { city: 'Tokyo', name: 'Tokyo Narita', code: 'NRT', country: 'Japan', primary: true },
  { city: 'Bangkok', name: 'Bangkok Suvarnabhumi', code: 'BKK', country: 'Thailand', primary: true },
  { city: 'Singapore', name: 'Singapore Changi', code: 'SIN', country: 'Singapore', primary: true },
];

// Helper function to get primary airport for a city
export function getPrimaryAirport(cityName) {
  const airports = AIRPORTS.filter(a => a.city.toLowerCase() === cityName.toLowerCase());
  const primary = airports.find(a => a.primary);
  return primary || airports[0] || null;
}

// Helper function to search airports (for autocomplete)
export function searchAirports(query) {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();

  return AIRPORTS
    .filter(airport =>
      airport.city.toLowerCase().includes(lowerQuery) ||
      airport.name.toLowerCase().includes(lowerQuery) ||
      airport.code.toLowerCase().includes(lowerQuery) ||
      airport.country.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 10); // Limit to 10 results
}

// Get display name for autocomplete
export function getAirportDisplayName(airport) {
  if (airport.city === airport.name) {
    return `${airport.city} (${airport.code})`;
  }
  return `${airport.city} - ${airport.name} (${airport.code})`;
}
