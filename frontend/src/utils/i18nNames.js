// frontend/src/utils/i18nNames.js
// Noms de pays/villes en français pour les données Booking/IA qui arrivent
// en anglais (« Italy », « Brussels ») — audit V3/V4 : le mix FR/EN sur les
// cartes était l'écart premium le plus visible. Mapping best-effort :
// passthrough si inconnu (jamais de trou).

const COUNTRIES_FR = {
  'albania': 'Albanie', 'algeria': 'Algérie', 'austria': 'Autriche',
  'belgium': 'Belgique', 'bosnia and herzegovina': 'Bosnie-Herzégovine',
  'bosnia': 'Bosnie', 'brazil': 'Brésil', 'bulgaria': 'Bulgarie',
  'cambodia': 'Cambodge', 'canada': 'Canada', 'cape verde': 'Cap-Vert',
  'china': 'Chine', 'colombia': 'Colombie', 'croatia': 'Croatie',
  'cyprus': 'Chypre', 'czech republic': 'République tchèque', 'czechia': 'Tchéquie',
  'denmark': 'Danemark', 'egypt': 'Égypte', 'estonia': 'Estonie',
  'finland': 'Finlande', 'france': 'France', 'georgia': 'Géorgie',
  'germany': 'Allemagne', 'greece': 'Grèce', 'hungary': 'Hongrie',
  'iceland': 'Islande', 'india': 'Inde', 'indonesia': 'Indonésie',
  'ireland': 'Irlande', 'israel': 'Israël', 'italy': 'Italie',
  'japan': 'Japon', 'jordan': 'Jordanie', 'kenya': 'Kenya',
  'latvia': 'Lettonie', 'lithuania': 'Lituanie', 'luxembourg': 'Luxembourg',
  'malaysia': 'Malaisie', 'maldives': 'Maldives', 'malta': 'Malte',
  'mauritius': 'Maurice', 'mexico': 'Mexique', 'montenegro': 'Monténégro',
  'morocco': 'Maroc', 'netherlands': 'Pays-Bas', 'north macedonia': 'Macédoine du Nord',
  'norway': 'Norvège', 'oman': 'Oman', 'peru': 'Pérou',
  'philippines': 'Philippines', 'poland': 'Pologne', 'portugal': 'Portugal',
  'qatar': 'Qatar', 'romania': 'Roumanie', 'senegal': 'Sénégal',
  'serbia': 'Serbie', 'seychelles': 'Seychelles', 'singapore': 'Singapour',
  'slovakia': 'Slovaquie', 'slovenia': 'Slovénie', 'south africa': 'Afrique du Sud',
  'south korea': 'Corée du Sud', 'spain': 'Espagne', 'sri lanka': 'Sri Lanka',
  'sweden': 'Suède', 'switzerland': 'Suisse', 'thailand': 'Thaïlande',
  'tunisia': 'Tunisie', 'turkey': 'Turquie', 'türkiye': 'Turquie',
  'united arab emirates': 'Émirats arabes unis', 'united kingdom': 'Royaume-Uni',
  'united states': 'États-Unis', 'usa': 'États-Unis', 'vietnam': 'Vietnam',
  'new zealand': 'Nouvelle-Zélande', 'australia': 'Australie',
  'french polynesia': 'Polynésie française', 'dominican republic': 'République dominicaine',
};

const CITIES_FR = {
  'athens': 'Athènes', 'barcelona': 'Barcelone', 'brussels': 'Bruxelles',
  'bucharest': 'Bucarest', 'copenhagen': 'Copenhague', 'cracow': 'Cracovie',
  'krakow': 'Cracovie', 'dubrovnik': 'Dubrovnik', 'edinburgh': 'Édimbourg',
  'geneva': 'Genève', 'lisbon': 'Lisbonne', 'london': 'Londres',
  'marrakesh': 'Marrakech', 'milan': 'Milan', 'moscow': 'Moscou',
  'munich': 'Munich', 'naples': 'Naples', 'prague': 'Prague',
  'seville': 'Séville', 'thessaloniki': 'Thessalonique', 'valletta': 'La Valette',
  'venice': 'Venise', 'vienna': 'Vienne', 'warsaw': 'Varsovie',
  'cairo': 'Le Caire', 'havana': 'La Havane', 'singapore': 'Singapour',
  'tokyo': 'Tokyo', 'dubai': 'Dubaï', 'malé': 'Malé', 'male': 'Malé',
  'cologne': 'Cologne', 'frankfurt': 'Francfort', 'hamburg': 'Hambourg',
  'saint petersburg': 'Saint-Pétersbourg', 'antwerp': 'Anvers',
};

export function countryFr(name) {
  if (!name || typeof name !== 'string') return name || '';
  return COUNTRIES_FR[name.trim().toLowerCase()] || name;
}

export function cityFr(name) {
  if (!name || typeof name !== 'string') return name || '';
  return CITIES_FR[name.trim().toLowerCase()] || name;
}
