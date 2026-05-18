// frontend/src/data/destinations.js
// SEO destination data for landing pages
// Each destination gets a public, indexable page at /destination/:slug

export const DESTINATIONS = [
  {
    slug: 'lisbon',
    city: 'Lisbon',
    cityFr: 'Lisbonne',
    country: 'Portugal',
    countryFr: 'Portugal',
    iata: 'LIS',
    continent: 'Europe',
    avgFlightPrice: 120,
    avgHotelPrice: 85,
    bestMonths: [3, 4, 5, 9, 10],
    avgTemp: { summer: 28, winter: 15 },
    currency: 'EUR',
    language: 'Portuguese',
    timezone: 'WET',
    highlights: ['Pastel de nata', 'Tram 28', 'Alfama district', 'Belem Tower', 'Time Out Market'],
    activities: ['culture', 'gastro', 'plage', 'histoire'],
    descriptionFr: "Lisbonne séduit par ses collines colorées, sa gastronomie et ses prix doux. Idéale pour un city break de 3 à 5 jours, la capitale portugaise offre un mélange unique de patrimoine historique, vie nocturne animée et plages accessibles.",
    descriptionEn: "Lisbon charms with its colorful hills, world-class food scene, and affordable prices. Perfect for a 3-5 day city break, the Portuguese capital offers a unique blend of historic heritage, vibrant nightlife, and accessible beaches.",
    tips: ['Best value in spring and fall', 'Vinho Verde costs under €3', 'Day trip to Sintra is a must'],
  },
  {
    slug: 'barcelona',
    city: 'Barcelona',
    cityFr: 'Barcelone',
    country: 'Spain',
    countryFr: 'Espagne',
    iata: 'BCN',
    continent: 'Europe',
    avgFlightPrice: 95,
    avgHotelPrice: 110,
    bestMonths: [4, 5, 6, 9, 10],
    avgTemp: { summer: 30, winter: 12 },
    currency: 'EUR',
    language: 'Spanish / Catalan',
    timezone: 'CET',
    highlights: ['Sagrada Familia', 'La Rambla', 'Park Güell', 'Barceloneta beach', 'Gothic Quarter'],
    activities: ['culture', 'plage', 'gastro', 'sport'],
    descriptionFr: "Barcelone combine plage, architecture époustouflante et cuisine méditerranéenne. De Gaudí aux tapas bars du Born, chaque quartier a sa personnalité. Budget raisonnable pour une grande ville européenne.",
    descriptionEn: "Barcelona combines beach life, stunning architecture, and Mediterranean cuisine. From Gaudí to the tapas bars of El Born, every neighborhood has its own personality. Reasonably priced for a major European city.",
    tips: ['Book Sagrada Familia tickets in advance', 'Avoid Las Ramblas tourist traps', 'Bunkers del Carmel for best sunset views'],
  },
  {
    slug: 'rome',
    city: 'Rome',
    cityFr: 'Rome',
    country: 'Italy',
    countryFr: 'Italie',
    iata: 'FCO',
    continent: 'Europe',
    avgFlightPrice: 110,
    avgHotelPrice: 100,
    bestMonths: [3, 4, 5, 9, 10, 11],
    avgTemp: { summer: 32, winter: 10 },
    currency: 'EUR',
    language: 'Italian',
    timezone: 'CET',
    highlights: ['Colosseum', 'Vatican', 'Trastevere', 'Pantheon', 'Roman Forum'],
    activities: ['culture', 'histoire', 'gastro'],
    descriptionFr: "Rome est un musée à ciel ouvert où chaque coin de rue raconte 2 000 ans d'histoire. La cuisine romaine (carbonara, cacio e pepe) vaut le voyage à elle seule. Privilégiez le printemps et l'automne pour éviter la foule.",
    descriptionEn: "Rome is an open-air museum where every street corner tells 2,000 years of history. Roman cuisine alone (carbonara, cacio e pepe) is worth the trip. Visit in spring or fall to avoid the crowds.",
    tips: ['Free entry to Vatican on last Sunday of the month', 'Trastevere for authentic dining', 'Roma Pass saves money on transport + museums'],
  },
  {
    slug: 'porto',
    city: 'Porto',
    cityFr: 'Porto',
    country: 'Portugal',
    countryFr: 'Portugal',
    iata: 'OPO',
    continent: 'Europe',
    avgFlightPrice: 100,
    avgHotelPrice: 70,
    bestMonths: [5, 6, 7, 9],
    avgTemp: { summer: 25, winter: 12 },
    currency: 'EUR',
    language: 'Portuguese',
    timezone: 'WET',
    highlights: ['Ribeira district', 'Port wine cellars', 'Livraria Lello', 'Dom Luís Bridge', 'Douro Valley'],
    activities: ['culture', 'gastro', 'nature'],
    descriptionFr: "Porto est le secret le mieux gardé du Portugal. Plus authentique et moins touristique que Lisbonne, la ville enchante par ses caves à vin, son architecture azulejo et ses prix imbattables. La vallée du Douro est à 1h.",
    descriptionEn: "Porto is Portugal's best-kept secret. More authentic and less touristy than Lisbon, the city enchants with its wine cellars, azulejo architecture, and unbeatable prices. The Douro Valley is just 1 hour away.",
    tips: ['Port wine tasting from €5', 'Francesinha is the local specialty', 'Walk across Dom Luís Bridge at sunset'],
  },
  {
    slug: 'amsterdam',
    city: 'Amsterdam',
    cityFr: 'Amsterdam',
    country: 'Netherlands',
    countryFr: 'Pays-Bas',
    iata: 'AMS',
    continent: 'Europe',
    avgFlightPrice: 90,
    avgHotelPrice: 140,
    bestMonths: [4, 5, 6, 7, 8, 9],
    avgTemp: { summer: 22, winter: 5 },
    currency: 'EUR',
    language: 'Dutch',
    timezone: 'CET',
    highlights: ['Canals', 'Van Gogh Museum', 'Anne Frank House', 'Vondelpark', 'Jordaan'],
    activities: ['culture', 'histoire', 'shopping'],
    descriptionFr: "Amsterdam mêle culture de classe mondiale et ambiance décontractée. Explorez les canaux à vélo, visitez le Rijksmuseum et perdez-vous dans le Jordaan. Les hôtels sont chers mais l'expérience vaut chaque euro.",
    descriptionEn: "Amsterdam blends world-class culture with a laid-back atmosphere. Explore the canals by bike, visit the Rijksmuseum, and get lost in the Jordaan. Hotels are pricey but the experience is worth every euro.",
    tips: ['Rent a bike — it is the best way to explore', 'Book Anne Frank House weeks in advance', 'Foodhallen for diverse dining'],
  },
  {
    slug: 'prague',
    city: 'Prague',
    cityFr: 'Prague',
    country: 'Czech Republic',
    countryFr: 'République tchèque',
    iata: 'PRG',
    continent: 'Europe',
    avgFlightPrice: 80,
    avgHotelPrice: 65,
    bestMonths: [4, 5, 6, 9, 10],
    avgTemp: { summer: 25, winter: 1 },
    currency: 'CZK',
    language: 'Czech',
    timezone: 'CET',
    highlights: ['Charles Bridge', 'Old Town Square', 'Prague Castle', 'Astronomical Clock', 'Petřín Hill'],
    activities: ['culture', 'histoire', 'gastro'],
    descriptionFr: "Prague offre une architecture féerique et des prix parmi les plus bas d'Europe. Bières à 2€, restaurants gastronomiques abordables et une beauté architecturale qui rivalise avec Paris. Excellent rapport qualité-prix.",
    descriptionEn: "Prague offers fairy-tale architecture and some of the lowest prices in Europe. €2 beers, affordable gourmet restaurants, and architectural beauty that rivals Paris. Exceptional value for money.",
    tips: ['Beer cheaper than water', 'Cross Charles Bridge early morning', 'Avoid exchange offices on the street'],
  },
  {
    slug: 'marrakech',
    city: 'Marrakech',
    cityFr: 'Marrakech',
    country: 'Morocco',
    countryFr: 'Maroc',
    iata: 'RAK',
    continent: 'Africa',
    avgFlightPrice: 85,
    avgHotelPrice: 50,
    bestMonths: [3, 4, 5, 10, 11],
    avgTemp: { summer: 38, winter: 18 },
    currency: 'MAD',
    language: 'Arabic / French',
    timezone: 'WET',
    highlights: ['Jemaa el-Fnaa', 'Majorelle Garden', 'Medina souks', 'Atlas Mountains', 'Bahia Palace'],
    activities: ['culture', 'gastro', 'nature', 'shopping'],
    descriptionFr: "Marrakech est un choc sensoriel : couleurs, saveurs, parfums. La médina est un labyrinthe fascinant. Riads magnifiques à partir de 40€/nuit. Évitez l'été (40°C+). Les excursions dans l'Atlas sont inoubliables.",
    descriptionEn: "Marrakech is a sensory overload: colors, flavors, scents. The medina is a fascinating labyrinth. Beautiful riads from €40/night. Avoid summer (40°C+). Atlas Mountain excursions are unforgettable.",
    tips: ['Always negotiate in souks', 'Riads offer best value', 'Day trip to Ourika Valley'],
  },
  {
    slug: 'dubrovnik',
    city: 'Dubrovnik',
    cityFr: 'Dubrovnik',
    country: 'Croatia',
    countryFr: 'Croatie',
    iata: 'DBV',
    continent: 'Europe',
    avgFlightPrice: 130,
    avgHotelPrice: 95,
    bestMonths: [5, 6, 9, 10],
    avgTemp: { summer: 30, winter: 12 },
    currency: 'EUR',
    language: 'Croatian',
    timezone: 'CET',
    highlights: ['City walls walk', 'Old Town', 'Lokrum Island', 'Cable car', 'Stradun'],
    activities: ['culture', 'plage', 'histoire', 'nature'],
    descriptionFr: "Dubrovnik, la perle de l'Adriatique, offre des remparts spectaculaires et une mer cristalline. Rendue célèbre par Game of Thrones, la ville est plus chère que le reste de la Croatie mais reste abordable.",
    descriptionEn: "Dubrovnik, the pearl of the Adriatic, offers spectacular city walls and crystal-clear sea. Made famous by Game of Thrones, the city is pricier than the rest of Croatia but remains affordable.",
    tips: ['Walk the walls early morning', 'Swim at Banje Beach', 'Ferry to Lokrum Island for a quiet day'],
  },
  {
    slug: 'bali',
    city: 'Bali',
    cityFr: 'Bali',
    country: 'Indonesia',
    countryFr: 'Indonésie',
    iata: 'DPS',
    continent: 'Asia',
    avgFlightPrice: 450,
    avgHotelPrice: 45,
    bestMonths: [4, 5, 6, 7, 8, 9],
    avgTemp: { summer: 30, winter: 28 },
    currency: 'IDR',
    language: 'Indonesian',
    timezone: 'WITA',
    highlights: ['Rice terraces', 'Uluwatu Temple', 'Ubud', 'Seminyak', 'Mount Batur sunrise'],
    activities: ['nature', 'plage', 'culture', 'sport'],
    descriptionFr: "Bali est le paradis des voyageurs : temples mystiques, rizières en terrasses, plages de surf et vie à petit prix. Le vol est long mais une fois sur place, tout est incroyablement abordable. Séjour recommandé : 10-14 jours.",
    descriptionEn: "Bali is a traveler's paradise: mystical temples, terraced rice fields, surf beaches, and low-cost living. The flight is long but once there, everything is incredibly affordable. Recommended stay: 10-14 days.",
    tips: ['Dry season Apr-Oct is best', 'Rent a scooter for freedom', 'Ubud for culture, Canggu for surf'],
  },
  {
    slug: 'tokyo',
    city: 'Tokyo',
    cityFr: 'Tokyo',
    country: 'Japan',
    countryFr: 'Japon',
    iata: 'NRT',
    continent: 'Asia',
    avgFlightPrice: 500,
    avgHotelPrice: 90,
    bestMonths: [3, 4, 10, 11],
    avgTemp: { summer: 31, winter: 6 },
    currency: 'JPY',
    language: 'Japanese',
    timezone: 'JST',
    highlights: ['Shibuya Crossing', 'Senso-ji', 'Shinjuku', 'Tsukiji Market', 'Meiji Shrine'],
    activities: ['culture', 'gastro', 'shopping', 'histoire'],
    descriptionFr: "Tokyo est la ville la plus fascinante du monde : tradition millénaire et ultra-modernité cohabitent à chaque coin de rue. La street food est sublime et abordable. Sakura (mars-avril) ou automne sont les meilleures saisons.",
    descriptionEn: "Tokyo is the world's most fascinating city: ancient tradition and ultra-modernity coexist on every corner. Street food is sublime and affordable. Cherry blossom (March-April) or autumn are the best seasons.",
    tips: ['Get a 7-day rail pass', 'Convenience store food is excellent', 'Visit Tsukiji outer market for sushi breakfast'],
  },
  {
    slug: 'new-york',
    city: 'New York',
    cityFr: 'New York',
    country: 'United States',
    countryFr: 'États-Unis',
    iata: 'JFK',
    continent: 'North America',
    avgFlightPrice: 350,
    avgHotelPrice: 180,
    bestMonths: [4, 5, 9, 10],
    avgTemp: { summer: 30, winter: 2 },
    currency: 'USD',
    language: 'English',
    timezone: 'EST',
    highlights: ['Central Park', 'Times Square', 'Brooklyn Bridge', 'Statue of Liberty', 'MET Museum'],
    activities: ['culture', 'shopping', 'gastro', 'histoire'],
    descriptionFr: "New York ne dort jamais et ne déçoit jamais. Chaque quartier est un monde : Manhattan pour l'énergie, Brooklyn pour le cool, Queens pour la food. Budget élevé mais des astuces existent (TKTS, pizza à $1).",
    descriptionEn: "New York never sleeps and never disappoints. Every neighborhood is its own world: Manhattan for energy, Brooklyn for cool, Queens for food. High budget but hacks exist (TKTS, $1 pizza slices).",
    tips: ['CityPass saves on major attractions', 'Walk the High Line', 'Best pizza in Brooklyn'],
  },
  {
    slug: 'bangkok',
    city: 'Bangkok',
    cityFr: 'Bangkok',
    country: 'Thailand',
    countryFr: 'Thaïlande',
    iata: 'BKK',
    continent: 'Asia',
    avgFlightPrice: 400,
    avgHotelPrice: 35,
    bestMonths: [11, 12, 1, 2, 3],
    avgTemp: { summer: 35, winter: 28 },
    currency: 'THB',
    language: 'Thai',
    timezone: 'ICT',
    highlights: ['Grand Palace', 'Wat Pho', 'Chatuchak Market', 'Khao San Road', 'Chinatown'],
    activities: ['culture', 'gastro', 'shopping', 'histoire'],
    descriptionFr: "Bangkok est le hub ultime de l'Asie du Sud-Est : temples dorés, street food à 1€ et marchés nocturnes. La ville est chaotique mais addictive. Base idéale pour explorer la Thaïlande.",
    descriptionEn: "Bangkok is the ultimate Southeast Asia hub: golden temples, €1 street food, and night markets. The city is chaotic but addictive. An ideal base for exploring Thailand.",
    tips: ['Street food is safe and amazing', 'BTS Skytrain avoids traffic', 'Nov-Feb is the best weather'],
  },
  {
    slug: 'london',
    city: 'London',
    cityFr: 'Londres',
    country: 'United Kingdom',
    countryFr: 'Royaume-Uni',
    iata: 'LHR',
    continent: 'Europe',
    avgFlightPrice: 100,
    avgHotelPrice: 150,
    bestMonths: [5, 6, 7, 8, 9],
    avgTemp: { summer: 23, winter: 7 },
    currency: 'GBP',
    language: 'English',
    timezone: 'GMT',
    highlights: ['British Museum', 'Tower Bridge', 'Camden Market', 'Hyde Park', 'West End shows'],
    activities: ['culture', 'histoire', 'shopping', 'gastro'],
    descriptionFr: "Londres est une ville monde : musées gratuits de classe mondiale, diversité culinaire incroyable et vie culturelle bouillonnante. Cher pour se loger mais les attractions principales sont gratuites.",
    descriptionEn: "London is a world city: free world-class museums, incredible food diversity, and buzzing cultural life. Expensive for accommodation but major attractions are free.",
    tips: ['Most major museums are free', 'Oyster card for cheaper transport', 'Borough Market for foodies'],
  },
  {
    slug: 'paris',
    city: 'Paris',
    cityFr: 'Paris',
    country: 'France',
    countryFr: 'France',
    iata: 'CDG',
    continent: 'Europe',
    avgFlightPrice: 70,
    avgHotelPrice: 130,
    bestMonths: [4, 5, 6, 9, 10],
    avgTemp: { summer: 25, winter: 5 },
    currency: 'EUR',
    language: 'French',
    timezone: 'CET',
    highlights: ['Eiffel Tower', 'Louvre', 'Montmartre', 'Seine River', 'Le Marais'],
    activities: ['culture', 'gastro', 'histoire', 'shopping'],
    descriptionFr: "Paris reste la ville la plus visitée au monde pour une bonne raison. Chaque arrondissement a son charme. La gastronomie va du bistro à 15€ au 3 étoiles. Printemps et automne sont magiques.",
    descriptionEn: "Paris remains the world's most visited city for good reason. Every arrondissement has its charm. Dining ranges from €15 bistros to 3-star restaurants. Spring and autumn are magical.",
    tips: ['Museum Pass saves time and money', 'Picnic along the Seine', 'Avoid major sites on weekends'],
  },
  {
    slug: 'istanbul',
    city: 'Istanbul',
    cityFr: 'Istanbul',
    country: 'Turkey',
    countryFr: 'Turquie',
    iata: 'IST',
    continent: 'Europe',
    avgFlightPrice: 130,
    avgHotelPrice: 60,
    bestMonths: [4, 5, 9, 10],
    avgTemp: { summer: 29, winter: 8 },
    currency: 'TRY',
    language: 'Turkish',
    timezone: 'TRT',
    highlights: ['Hagia Sophia', 'Grand Bazaar', 'Blue Mosque', 'Bosphorus cruise', 'Topkapi Palace'],
    activities: ['culture', 'histoire', 'gastro', 'shopping'],
    descriptionFr: "Istanbul est la seule ville au monde à cheval entre deux continents. Le Grand Bazar, Sainte-Sophie et le Bosphore sont magiques. Rapport qualité-prix exceptionnel grâce au taux de change favorable.",
    descriptionEn: "Istanbul is the only city in the world straddling two continents. The Grand Bazaar, Hagia Sophia, and the Bosphorus are magical. Exceptional value thanks to favorable exchange rates.",
    tips: ['Turkish breakfast is an experience', 'Take a Bosphorus ferry', 'Kadikoy for local food scene'],
  },
  {
    slug: 'athens',
    city: 'Athens',
    cityFr: 'Athènes',
    country: 'Greece',
    countryFr: 'Grèce',
    iata: 'ATH',
    continent: 'Europe',
    avgFlightPrice: 110,
    avgHotelPrice: 75,
    bestMonths: [4, 5, 6, 9, 10],
    avgTemp: { summer: 34, winter: 12 },
    currency: 'EUR',
    language: 'Greek',
    timezone: 'EET',
    highlights: ['Acropolis', 'Plaka district', 'National Archaeological Museum', 'Monastiraki', 'Temple of Zeus'],
    activities: ['culture', 'histoire', 'gastro'],
    descriptionFr: "Athènes est le berceau de la civilisation occidentale avec des prix doux. L'Acropole au coucher du soleil est inoubliable. Base idéale pour les îles grecques (ferries fréquents). Street food excellente.",
    descriptionEn: "Athens is the cradle of Western civilization with gentle prices. The Acropolis at sunset is unforgettable. An ideal base for Greek islands (frequent ferries). Excellent street food.",
    tips: ['Free entry to Acropolis on certain days', 'Souvlaki for under €3', 'Ferry to Aegina for a quick island trip'],
  },
  {
    slug: 'budapest',
    city: 'Budapest',
    cityFr: 'Budapest',
    country: 'Hungary',
    countryFr: 'Hongrie',
    iata: 'BUD',
    continent: 'Europe',
    avgFlightPrice: 75,
    avgHotelPrice: 60,
    bestMonths: [4, 5, 6, 9, 10],
    avgTemp: { summer: 27, winter: 2 },
    currency: 'HUF',
    language: 'Hungarian',
    timezone: 'CET',
    highlights: ['Thermal baths', 'Parliament Building', 'Fisherman\'s Bastion', 'Ruin bars', 'Danube promenade'],
    activities: ['culture', 'histoire', 'gastro'],
    descriptionFr: "Budapest est la destination européenne au meilleur rapport qualité-prix. Thermes, bars en ruines et architecture grandiose à des prix défiants toute concurrence. Les bains Széchenyi sont incontournables.",
    descriptionEn: "Budapest is Europe's best value destination. Thermal baths, ruin bars, and grand architecture at unbeatable prices. The Széchenyi Baths are unmissable.",
    tips: ['Széchenyi Baths — go on weekday mornings', 'Ruin bars in District VII', 'Walk from Buda Castle to Parliament along the river'],
  },
  {
    slug: 'copenhagen',
    city: 'Copenhagen',
    cityFr: 'Copenhague',
    country: 'Denmark',
    countryFr: 'Danemark',
    iata: 'CPH',
    continent: 'Europe',
    avgFlightPrice: 110,
    avgHotelPrice: 150,
    bestMonths: [5, 6, 7, 8],
    avgTemp: { summer: 21, winter: 2 },
    currency: 'DKK',
    language: 'Danish',
    timezone: 'CET',
    highlights: ['Nyhavn', 'Tivoli Gardens', 'Christiania', 'Little Mermaid', 'Strøget'],
    activities: ['culture', 'gastro', 'nature'],
    descriptionFr: "Copenhague est la capitale du design et du hygge. Ville cyclable par excellence, restaurants innovants et qualité de vie visible partout. Budget élevé mais l'expérience nordique est unique.",
    descriptionEn: "Copenhagen is the capital of design and hygge. The ultimate cycling city with innovative restaurants and visible quality of life. High budget but the Nordic experience is unique.",
    tips: ['Everything is bike-friendly', 'Copenhagen Card includes transport + museums', 'Street food at Reffen market'],
  },
  {
    slug: 'dubai',
    city: 'Dubai',
    cityFr: 'Dubaï',
    country: 'UAE',
    countryFr: 'Émirats arabes unis',
    iata: 'DXB',
    continent: 'Asia',
    avgFlightPrice: 300,
    avgHotelPrice: 120,
    bestMonths: [11, 12, 1, 2, 3],
    avgTemp: { summer: 42, winter: 24 },
    currency: 'AED',
    language: 'Arabic / English',
    timezone: 'GST',
    highlights: ['Burj Khalifa', 'Dubai Mall', 'Desert safari', 'Palm Jumeirah', 'Gold Souk'],
    activities: ['shopping', 'plage', 'culture'],
    descriptionFr: "Dubaï est la ville de la démesure : gratte-ciels vertigineux, centres commerciaux géants et plages parfaites. Plus abordable qu'on le pense hors saison. Évitez l'été (45°C+).",
    descriptionEn: "Dubai is the city of excess: dizzying skyscrapers, giant malls, and perfect beaches. More affordable than you think off-season. Avoid summer (45°C+).",
    tips: ['Nov-Mar for pleasant weather', 'Dubai Frame for panoramic views', 'Old Dubai (Deira) for authentic experience'],
  },
  {
    slug: 'malaga',
    city: 'Malaga',
    cityFr: 'Malaga',
    country: 'Spain',
    countryFr: 'Espagne',
    iata: 'AGP',
    continent: 'Europe',
    avgFlightPrice: 70,
    avgHotelPrice: 75,
    bestMonths: [4, 5, 6, 9, 10],
    avgTemp: { summer: 30, winter: 15 },
    currency: 'EUR',
    language: 'Spanish',
    timezone: 'CET',
    highlights: ['Alcazaba', 'Picasso Museum', 'Malagueta beach', 'Calle Larios', 'Atarazanas Market'],
    activities: ['plage', 'culture', 'gastro'],
    descriptionFr: "Malaga est la porte de la Costa del Sol : soleil quasi-garanti, tapas gratuites avec chaque boisson et vols ultra low-cost depuis toute l'Europe. Excellente base pour explorer l'Andalousie.",
    descriptionEn: "Malaga is the gateway to the Costa del Sol: near-guaranteed sunshine, free tapas with every drink, and ultra-cheap flights from across Europe. An excellent base for exploring Andalusia.",
    tips: ['Free tapas with drinks is the norm', 'Day trip to Nerja or Ronda', 'Atarazanas Market for fresh seafood'],
  },
];

export function getDestinationBySlug(slug) {
  return DESTINATIONS.find(d => d.slug === slug) || null;
}

export function getMonthName(monthNum, lang = 'en') {
  const date = new Date(2025, monthNum - 1);
  return date.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
}

// Last content review date for destination pages (drives <dateModified> and
// sitemap <lastmod>). Bump when destination data is meaningfully revised.
export const DESTINATIONS_LAST_UPDATED = '2026-05-18';

function monthRangeFr(months) {
  if (!months?.length) return '';
  const names = months.map((m) => getMonthName(m, 'fr'));
  if (names.length === 1) return `en ${names[0]}`;
  return `de ${names[0]} à ${names[names.length - 1]}`;
}

const TRIP_DURATION = { Europe: '3 à 5 jours', default: '7 à 10 jours' };

function tripDurationFr(dest) {
  return dest.continent === 'Europe' ? TRIP_DURATION.Europe : TRIP_DURATION.default;
}

// Qualitative budget order-of-magnitude — derived from the existing avg
// prices, never a fabricated precise figure (5 nights + return flight).
export function getBudgetFr(dest) {
  const low = dest.avgFlightPrice + dest.avgHotelPrice * 5;
  const tier =
    low < 600 ? 'abordable' : low < 1100 ? 'intermédiaire' : 'plus élevé';
  return {
    tier,
    estimate: low,
    label: `à partir d'environ €${low} pour ~5 jours (vol aller-retour indicatif + hôtel), budget ${tier}`,
  };
}

// 2–3 self-contained, citable sentences (GEO "direct answer" block).
export function getDirectAnswerFr(dest) {
  const city = dest.cityFr || dest.city;
  const when = monthRangeFr(dest.bestMonths);
  const dur = tripDurationFr(dest);
  const budget = getBudgetFr(dest);
  return (
    `${city} (${dest.countryFr || dest.country}) se visite idéalement ${when}, ` +
    `quand le climat et les prix sont les plus favorables. ` +
    `Comptez ${dur} sur place pour en profiter sans courir. ` +
    `Budget ${budget.tier} : ${budget.label}.`
  );
}

// 3–4 neighbouring destinations on the same continent for internal meshing.
export function getInternalLinks(dest) {
  return DESTINATIONS.filter(
    (d) => d.slug !== dest.slug && d.continent === dest.continent
  )
    .slice(0, 4)
    .map((d) => ({ slug: d.slug, city: d.cityFr || d.city, country: d.countryFr || d.country }));
}

// Real, per-destination FAQ built from the page's own factual attributes
// (best period, budget, duration, language, access). Each answer
// interpolates this destination's actual data, so pages are differentiated
// and accurate — no invented figures. A destination may override or extend
// via its own `faq: [{ qFr, aFr }]` array.
export function getFaqFr(dest) {
  if (dest.faq?.length) return dest.faq;
  const city = dest.cityFr || dest.city;
  const country = dest.countryFr || dest.country;
  const when = monthRangeFr(dest.bestMonths);
  const dur = tripDurationFr(dest);
  const budget = getBudgetFr(dest);
  const longHaul = dest.continent !== 'Europe';
  return [
    {
      qFr: `Quelle est la meilleure période pour visiter ${city} ?`,
      aFr: `La meilleure période pour ${city} se situe ${when} : températures agréables (autour de ${dest.avgTemp.summer}°C en haute saison, ${dest.avgTemp.winter}°C en hiver) et tarifs plus doux qu'en pleine saison touristique.`,
    },
    {
      qFr: `Quel budget prévoir pour un voyage à ${city} ?`,
      aFr: `Pour environ 5 jours, prévoyez ${budget.label}. Le vol aller-retour démarre autour de €${dest.avgFlightPrice} et la nuit d'hôtel autour de €${dest.avgHotelPrice}. Ce sont des ordres de grandeur, pas des tarifs en temps réel.`,
    },
    {
      qFr: `Combien de jours rester à ${city} ?`,
      aFr: `${dur} suffisent pour voir l'essentiel de ${city} (${dest.highlights.slice(0, 3).join(', ')}) sans se presser. Allongez le séjour si vous voulez explorer les environs.`,
    },
    {
      qFr: `Comment se rendre à ${city} depuis la France ?`,
      aFr: `${city} est desservie par l'aéroport ${dest.iata}. ${longHaul ? "Comptez un vol long-courrier, souvent avec une escale selon la compagnie." : "De nombreuses liaisons directes court-courrier existent au départ des principales villes françaises."}`,
    },
    {
      qFr: `Quelle langue et quelle monnaie à ${city} ?`,
      aFr: `À ${city}, on parle ${dest.language} et la monnaie est ${dest.currency}. ${country} reste une destination accessible pour un voyageur francophone bien préparé.`,
    },
  ];
}
