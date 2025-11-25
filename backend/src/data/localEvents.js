// backend/src/data/localEvents.js
// Curated database of regular annual events by city
// TODO: Upgrade to real-time events API (Eventbrite, Predicthq, etc.)

export const LOCAL_EVENTS = {
  // France
  'Paris': [
    { name: 'Fête de la Musique', month: 6, day: 21, description: 'Free music festival across the entire city', type: 'Music', recurring: 'annual' },
    { name: 'Bastille Day', month: 7, day: 14, description: 'National holiday with fireworks at Eiffel Tower', type: 'National', recurring: 'annual' },
    { name: 'Nuit Blanche', month: 10, day: 'first Saturday', description: 'All-night contemporary art festival', type: 'Art', recurring: 'annual' },
    { name: 'Paris Fashion Week', month: 'Sep/Oct & Feb/Mar', description: 'International fashion shows', type: 'Fashion', recurring: 'biannual' },
    { name: 'Christmas Markets', month: '11-12', description: 'Traditional markets across the city', type: 'Holiday', recurring: 'annual' },
  ],
  'Lyon': [
    { name: 'Fête des Lumières', month: 12, day: '8', description: 'Festival of Lights - stunning light installations citywide', type: 'Art', recurring: 'annual' },
    { name: 'Nuits de Fourvière', month: '6-7', description: 'Summer theater, music, and dance festival', type: 'Culture', recurring: 'annual' },
  ],
  'Nice': [
    { name: 'Nice Carnival', month: 2, description: 'One of the world\'s largest carnivals', type: 'Festival', recurring: 'annual' },
    { name: 'Nice Jazz Festival', month: 7, description: 'Historic jazz festival', type: 'Music', recurring: 'annual' },
  ],
  'Marseille': [
    { name: 'Marseille Jazz des Cinq Continents', month: 7, description: 'International jazz festival', type: 'Music', recurring: 'annual' },
  ],

  // Portugal
  'Lisbon': [
    { name: 'Festas de Lisboa', month: 6, description: 'Month-long celebration of Lisbon\'s patron saints', type: 'Festival', recurring: 'annual' },
    { name: 'Santo António', month: 6, day: 13, description: 'Biggest festival with street parties', type: 'Festival', recurring: 'annual' },
    { name: 'Rock in Rio', month: 'varies', description: 'Massive music festival (every 2 years)', type: 'Music', recurring: 'biannual' },
  ],
  'Porto': [
    { name: 'São João Festival', month: 6, day: 23-24, description: 'Street parties with plastic hammers and grilled sardines', type: 'Festival', recurring: 'annual' },
    { name: 'Queima das Fitas', month: 5, description: 'University student celebration', type: 'Festival', recurring: 'annual' },
  ],

  // Spain
  'Barcelona': [
    { name: 'La Mercè', month: 9, day: 24, description: 'Barcelona\'s biggest festival with fire runs and human towers', type: 'Festival', recurring: 'annual' },
    { name: 'Sant Jordi', month: 4, day: 23, description: 'Day of books and roses', type: 'Cultural', recurring: 'annual' },
    { name: 'Primavera Sound', month: 'May/Jun', description: 'Major international music festival', type: 'Music', recurring: 'annual' },
  ],
  'Madrid': [
    { name: 'San Isidro', month: 5, day: 15, description: 'Madrid\'s patron saint celebration', type: 'Festival', recurring: 'annual' },
    { name: 'Mad Cool Festival', month: 7, description: 'International music festival', type: 'Music', recurring: 'annual' },
  ],
  'Seville': [
    { name: 'Semana Santa', month: 'Mar/Apr', description: 'Holy Week processions', type: 'Religious', recurring: 'annual' },
    { name: 'Feria de Abril', month: 4, description: 'April Fair with flamenco and traditional dress', type: 'Festival', recurring: 'annual' },
  ],
  'Valencia': [
    { name: 'Las Fallas', month: 3, day: '15-19', description: 'Spectacular festival with massive sculptures burned', type: 'Festival', recurring: 'annual' },
  ],

  // Italy
  'Rome': [
    { name: 'Easter at the Vatican', month: 'Mar/Apr', description: 'Papal Mass and celebrations', type: 'Religious', recurring: 'annual' },
    { name: 'Festa della Repubblica', month: 6, day: 2, description: 'Republic Day military parade', type: 'National', recurring: 'annual' },
    { name: 'Estate Romana', month: '6-9', description: 'Summer cultural events', type: 'Culture', recurring: 'annual' },
  ],
  'Venice': [
    { name: 'Carnevale di Venezia', month: 'Feb/Mar', description: 'Famous masked carnival', type: 'Festival', recurring: 'annual' },
    { name: 'Venice Biennale', month: 'May-Nov (odd years)', description: 'International art exhibition', type: 'Art', recurring: 'biannual' },
    { name: 'Festa del Redentore', month: 7, day: 'third weekend', description: 'Fireworks over the lagoon', type: 'Festival', recurring: 'annual' },
  ],
  'Florence': [
    { name: 'Scoppio del Carro', month: 'Easter', description: 'Explosion of the Cart fireworks', type: 'Festival', recurring: 'annual' },
    { name: 'Maggio Musicale Fiorentino', month: '4-6', description: 'International music festival', type: 'Music', recurring: 'annual' },
  ],
  'Milan': [
    { name: 'Milan Fashion Week', month: 'Feb & Sep', description: 'International fashion shows', type: 'Fashion', recurring: 'biannual' },
    { name: 'Salone del Mobile', month: 4, description: 'World\'s largest furniture fair', type: 'Design', recurring: 'annual' },
  ],

  // Germany
  'Berlin': [
    { name: 'Berlinale', month: 2, description: 'International film festival', type: 'Film', recurring: 'annual' },
    { name: 'Karneval der Kulturen', month: 'May/Jun', description: 'Multicultural street carnival', type: 'Festival', recurring: 'annual' },
    { name: 'Christopher Street Day', month: 7, description: 'Huge LGBTQ+ pride celebration', type: 'Pride', recurring: 'annual' },
  ],
  'Munich': [
    { name: 'Oktoberfest', month: '9-10', day: 'mid-Sep to early Oct', description: 'World\'s largest beer festival', type: 'Festival', recurring: 'annual' },
    { name: 'Tollwood Winter Festival', month: '11-12', description: 'Winter market and cultural festival', type: 'Festival', recurring: 'annual' },
  ],

  // Greece
  'Athens': [
    { name: 'Athens Epidaurus Festival', month: '6-8', description: 'Ancient Greek theater and music', type: 'Culture', recurring: 'annual' },
    { name: 'Apokries', month: 'Feb/Mar', description: 'Greek Carnival', type: 'Festival', recurring: 'annual' },
  ],
  'Santorini': [
    { name: 'Ifestia Festival', month: 8, description: 'Volcano commemoration with fireworks', type: 'Festival', recurring: 'annual' },
  ],

  // United Kingdom
  'London': [
    { name: 'Notting Hill Carnival', month: 8, day: 'last weekend', description: 'Europe\'s biggest street festival', type: 'Festival', recurring: 'annual' },
    { name: 'Wimbledon', month: '6-7', description: 'Tennis championships', type: 'Sports', recurring: 'annual' },
    { name: 'Bonfire Night', month: 11, day: 5, description: 'Fireworks across the city', type: 'Festival', recurring: 'annual' },
  ],
  'Edinburgh': [
    { name: 'Edinburgh Fringe', month: 8, description: 'World\'s largest arts festival', type: 'Arts', recurring: 'annual' },
    { name: 'Hogmanay', month: 12, day: 31, description: 'Scottish New Year celebration', type: 'Festival', recurring: 'annual' },
  ],

  // Netherlands
  'Amsterdam': [
    { name: 'King\'s Day', month: 4, day: 27, description: 'National holiday with orange-clad street parties', type: 'National', recurring: 'annual' },
    { name: 'Amsterdam Dance Event', month: 10, description: 'Electronic music festival', type: 'Music', recurring: 'annual' },
    { name: 'Amsterdam Light Festival', month: '11-1', description: 'Light art installations', type: 'Art', recurring: 'annual' },
  ],

  // Eastern Europe
  'Prague': [
    { name: 'Prague Spring', month: '5-6', description: 'International music festival', type: 'Music', recurring: 'annual' },
    { name: 'Christmas Markets', month: '11-12', description: 'Traditional markets at Old Town Square', type: 'Holiday', recurring: 'annual' },
  ],
  'Budapest': [
    { name: 'Sziget Festival', month: 8, description: 'Week-long music festival on island', type: 'Music', recurring: 'annual' },
    { name: 'Budapest Wine Festival', month: 9, description: 'Hungarian wine tasting', type: 'Food', recurring: 'annual' },
  ],
  'Krakow': [
    { name: 'Wianki', month: 6, day: 23, description: 'Midsummer Night with floating wreaths', type: 'Festival', recurring: 'annual' },
  ],
  'Bucharest': [
    { name: 'George Enescu Festival', month: '8-9 (odd years)', description: 'Classical music festival', type: 'Music', recurring: 'biannual' },
  ],

  // Balkans & Caucasus
  'Dubrovnik': [
    { name: 'Dubrovnik Summer Festival', month: '7-8', description: 'Theater, music, and dance', type: 'Culture', recurring: 'annual' },
  ],
  'Tbilisi': [
    { name: 'Tbilisoba', month: 10, description: 'City day celebration', type: 'Festival', recurring: 'annual' },
  ],
};

/**
 * Get upcoming events for a destination
 * @param {string} city - City name
 * @param {Date} startDate - Trip start date
 * @param {Date} endDate - Trip end date
 * @returns {Array} Matching events
 */
export function getLocalEvents(city, startDate, endDate) {
  const cityEvents = LOCAL_EVENTS[city] || [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  return cityEvents.filter(event => {
    // Simple month matching (can be improved with actual date ranges)
    const tripMonths = [];
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      tripMonths.push(d.getMonth() + 1); // 1-12
    }

    if (typeof event.month === 'number') {
      return tripMonths.includes(event.month);
    }

    if (typeof event.month === 'string') {
      // Handle month ranges like "11-12" or "6-9"
      if (event.month.includes('-')) {
        const [m1, m2] = event.month.split('-').map(Number);
        return tripMonths.some(m => m >= m1 && m <= m2);
      }
    }

    return false;
  }).map(event => ({
    ...event,
    city,
  }));
}

/**
 * Get event suggestions even if no exact match
 * @param {string} city - City name
 * @returns {Array} All events for the city
 */
export function getAllCityEvents(city) {
  return (LOCAL_EVENTS[city] || []).map(event => ({
    ...event,
    city,
  }));
}
