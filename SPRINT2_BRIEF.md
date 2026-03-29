# Sprint 2 — Pivot Architectural : Système de Recommandation Niveau Licorne

> **Brief complet pour Claude Code.**  
> Ce document remplace toute discussion préalable. Lis-le entièrement avant de toucher au code.

---

## Contexte & Diagnostic

### Le problème fondamental (ne pas ignorer)

L'architecture actuelle utilise Claude pour **générer les destinations** (`generateDestinationShortlist`). C'est architecturalement faux pour 3 raisons :

1. **Un LLM ne peut pas apprendre** — pas de feedback loop, les poids sont figés
2. **Biais de popularité structurel** — Prague/Lisbonne/Barcelone à 95% car surreprésentées dans le training data
3. **12 appels API Booking bloquants** — 4 destinations × 3 dates en séquentiel, lent + cher

### L'objectif du sprint

Remplacer Claude comme moteur de reco par une **pipeline en 3 layers** :
- **Layer 1** : User DNA Vector (embedding du profil utilisateur)
- **Layer 2** : Destination Knowledge Base pré-calculée + recherche vectorielle ANN
- **Layer 3** : Filtering + scoring contextuel (sans ML pour l'instant, mais avec la structure pour l'ajouter)

Claude reste uniquement comme **post-processeur** (narrative, itinéraire, match explanation).

---

## Stack ajoutée

| Outil | Usage | Pourquoi |
|---|---|---|
| `pgvector` (Supabase extension) | Stockage + recherche vectorielle | Déjà sur Supabase, zéro infra |
| `voyageai` npm package | Embeddings optimisés travel | Meilleur que OpenAI pour ce use case |
| `@xenova/transformers` | Fallback embedding si Voyage AI down | Offline, gratuit |
| `node-cron` | Jobs enrichissement + price monitoring | Simple, pas besoin de BullMQ maintenant |
| `axios` | Appels enrichissement destinations | Déjà probablement installé |

---

## Étape 0 — Setup Supabase

### 0.1 Activer pgvector

Dans le SQL Editor de Supabase :

```sql
-- Activer l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

### 0.2 Créer les tables

```sql
-- Table destinations enrichies (la knowledge base)
CREATE TABLE destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  iata_code TEXT, -- code aéroport principal
  iata_alternatives TEXT[], -- aéroports alternatifs
  region TEXT, -- 'europe', 'north_africa', 'southeast_asia', etc.
  
  -- Vibes sémantiques (pour le matching)
  vibe_tags TEXT[], -- ['romantique', 'gastronomie', 'histoire', 'plage']
  trip_types TEXT[], -- ['couple', 'family', 'friends', 'solo', 'business']
  activity_types TEXT[], -- ['plage', 'randonnee', 'culture', 'ski', 'surf']
  
  -- Contexte pratique
  safety_index INTEGER, -- 1-10
  visa_required_fr BOOLEAN DEFAULT FALSE,
  currency TEXT,
  language TEXT,
  timezone TEXT,
  
  -- Saisonnalité (tableau 12 mois, 1-10)
  monthly_weather_score INTEGER[], -- [6,6,7,8,9,10,10,10,9,8,7,6] (jan→dec)
  monthly_crowd_score INTEGER[], -- score affluence inversé (10 = peu de monde)
  monthly_price_index NUMERIC[], -- indice relatif (1.0 = prix moyen)
  
  -- Prix typiques depuis Paris (estimations offline)
  avg_flight_price_eur INTEGER, -- A/R Paris
  avg_hotel_price_eur INTEGER, -- par nuit, hôtel 3 étoiles
  avg_daily_budget_eur INTEGER, -- total/jour/personne tout compris
  
  -- Description pour l'embedding
  description_for_embedding TEXT, -- texte enrichi pour générer le vecteur
  
  -- Le vecteur (1536 dimensions avec voyage-large-2)
  embedding vector(1536),
  
  -- Méta
  last_enriched_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(city, country)
);

-- Table user vectors (DNA du voyageur)
CREATE TABLE user_travel_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE, -- clerk user ID
  
  -- Snapshot du profil onboarding (JSON brut)
  onboarding_data JSONB,
  
  -- Signaux comportementaux agrégés
  clicked_destinations TEXT[], -- villes cliquées
  saved_destinations TEXT[], -- villes sauvegardées
  booked_destinations TEXT[], -- villes bookées
  rejected_destinations TEXT[], -- "pas pour moi"
  
  -- Le vecteur DNA (mis à jour à chaque interaction)
  embedding vector(1536),
  
  -- Méta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des opportunités proactives (Sprint 4)
CREATE TABLE travel_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  destination_id UUID REFERENCES destinations(id),
  
  flight_price_eur INTEGER,
  hotel_price_eur INTEGER,
  total_price_eur INTEGER,
  departure_date DATE,
  return_date DATE,
  
  match_score NUMERIC, -- 0-1
  match_reasons TEXT[],
  
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'clicked', 'booked', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Index pour la recherche vectorielle ANN
CREATE INDEX destinations_embedding_idx ON destinations 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX user_profiles_embedding_idx ON user_travel_profiles 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

### 0.3 Créer la fonction de recherche ANN

```sql
-- Fonction de recherche : trouve les N destinations les plus proches d'un vecteur user
CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 20,
  filter_region TEXT DEFAULT NULL,
  filter_trip_type TEXT DEFAULT NULL,
  min_safety INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  city TEXT,
  country TEXT,
  iata_code TEXT,
  region TEXT,
  vibe_tags TEXT[],
  trip_types TEXT[],
  activity_types TEXT[],
  safety_index INTEGER,
  avg_flight_price_eur INTEGER,
  avg_hotel_price_eur INTEGER,
  avg_daily_budget_eur INTEGER,
  monthly_weather_score INTEGER[],
  monthly_price_index NUMERIC[],
  similarity NUMERIC
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    d.id,
    d.city,
    d.country,
    d.iata_code,
    d.region,
    d.vibe_tags,
    d.trip_types,
    d.activity_types,
    d.safety_index,
    d.avg_flight_price_eur,
    d.avg_hotel_price_eur,
    d.avg_daily_budget_eur,
    d.monthly_weather_score,
    d.monthly_price_index,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM destinations d
  WHERE 
    d.is_active = TRUE
    AND d.safety_index >= min_safety
    AND (filter_region IS NULL OR d.region = filter_region)
    AND (filter_trip_type IS NULL OR filter_trip_type = ANY(d.trip_types))
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Étape 1 — Seed de la Knowledge Base (200 destinations)

Crée le fichier `backend/src/data/destinations-seed.js` :

```javascript
// backend/src/data/destinations-seed.js
// 200 destinations enrichies — base initiale
// Format : city, country, region, iata_code, vibes, trip_types, activities, safety, prix

export const DESTINATIONS_SEED = [
  // === EUROPE ===
  {
    city: "Lisbonne", country: "Portugal", region: "europe",
    iata_code: "LIS", iata_alternatives: [],
    vibe_tags: ["romantique", "nostalgie", "gastronomie", "histoire", "bord-de-mer", "vie-nocturne"],
    trip_types: ["couple", "friends", "solo"],
    activity_types: ["culture", "gastronomie", "plage", "vie-nocturne"],
    safety_index: 9, visa_required_fr: false, currency: "EUR", language: "Portugais",
    monthly_weather_score: [6,6,7,8,9,10,10,10,9,8,7,6],
    monthly_crowd_score:   [8,8,8,7,6,5,4,4,6,7,8,8],
    monthly_price_index:   [0.8,0.8,0.9,1.0,1.1,1.2,1.4,1.4,1.1,1.0,0.8,0.9],
    avg_flight_price_eur: 120, avg_hotel_price_eur: 90, avg_daily_budget_eur: 80,
    description_for_embedding: "Lisbonne est une ville romantique et mélancolique sur l'Atlantique. Idéale pour les couples et amis qui aiment la gastronomie portugaise, le fado, les trams historiques, les pastéis de nata et les couchers de soleil sur le Tage. Ambiance douce, vie nocturne animée à Bairro Alto, plages accessibles en 30 minutes."
  },
  {
    city: "Porto", country: "Portugal", region: "europe",
    iata_code: "OPO",
    vibe_tags: ["authentique", "gastronomie", "vin", "histoire", "bord-de-mer"],
    trip_types: ["couple", "friends", "solo"],
    activity_types: ["culture", "gastronomie", "vin", "plage"],
    safety_index: 9, visa_required_fr: false, currency: "EUR", language: "Portugais",
    monthly_weather_score: [5,5,6,7,8,9,10,10,9,7,6,5],
    monthly_crowd_score:   [9,9,8,7,6,5,4,4,6,7,8,9],
    monthly_price_index:   [0.7,0.7,0.8,0.9,1.0,1.1,1.3,1.3,1.0,0.9,0.7,0.8],
    avg_flight_price_eur: 100, avg_hotel_price_eur: 75, avg_daily_budget_eur: 65,
    description_for_embedding: "Porto est authentique, moins touristique que Lisbonne. Cave de porto, Ribeira au bord du Douro, street art, librairie Lello. Parfait pour boire du bon vin pas cher, manger des francesinha, se perdre dans les ruelles. Vibe plus locale que Lisbonne."
  },
  {
    city: "Séville", country: "Espagne", region: "europe",
    iata_code: "SVQ",
    vibe_tags: ["romantique", "flamenco", "histoire", "chaud", "tapas", "passion"],
    trip_types: ["couple", "friends", "solo"],
    activity_types: ["culture", "gastronomie", "danse", "histoire"],
    safety_index: 8, visa_required_fr: false, currency: "EUR", language: "Espagnol",
    monthly_weather_score: [6,6,7,8,9,9,7,7,9,9,7,6],
    monthly_crowd_score:   [8,8,7,5,5,6,5,5,6,7,8,8],
    monthly_price_index:   [0.8,0.8,0.9,1.2,1.1,1.0,1.1,1.1,1.0,0.9,0.8,0.8],
    avg_flight_price_eur: 110, avg_hotel_price_eur: 80, avg_daily_budget_eur: 70,
    description_for_embedding: "Séville est la capitale du flamenco, de la passion et des tapas. L'Alcazar, la Giralda, le quartier Santa Cruz. Très chaude en été (40°C+), idéale au printemps et automne. Vibe andalouse incomparable, excellente gastronomie pour pas cher, soirées animées."
  },
  {
    city: "Prague", country: "République tchèque", region: "europe",
    iata_code: "PRG",
    vibe_tags: ["histoire", "architecture", "biere", "budget", "festif", "magie"],
    trip_types: ["friends", "couple", "solo"],
    activity_types: ["culture", "histoire", "vie-nocturne", "gastronomie"],
    safety_index: 8, visa_required_fr: false, currency: "CZK", language: "Tchèque",
    monthly_weather_score: [4,4,6,7,8,9,9,9,8,7,5,4],
    monthly_crowd_score:   [8,8,7,6,5,4,4,4,5,6,7,8],
    monthly_price_index:   [0.7,0.7,0.8,0.9,1.0,1.1,1.2,1.2,1.0,0.9,0.8,0.8],
    avg_flight_price_eur: 90, avg_hotel_price_eur: 65, avg_daily_budget_eur: 55,
    description_for_embedding: "Prague est magique, bon marché et festive. Vieille ville médiévale préservée, pont Charles, château de Prague. Bière la moins chère d'Europe. Excellente pour les weekends entre amis budget. Vie nocturne intense."
  },
  {
    city: "Budapest", country: "Hongrie", region: "europe",
    iata_code: "BUD",
    vibe_tags: ["budget", "bains-thermaux", "histoire", "festif", "authentique"],
    trip_types: ["friends", "couple", "solo"],
    activity_types: ["culture", "spa", "vie-nocturne", "histoire"],
    safety_index: 8, visa_required_fr: false, currency: "HUF", language: "Hongrois",
    monthly_weather_score: [4,4,6,7,9,10,10,10,9,7,5,4],
    monthly_crowd_score:   [9,9,8,7,6,5,4,4,6,7,8,9],
    monthly_price_index:   [0.7,0.7,0.8,0.9,1.0,1.1,1.2,1.2,1.0,0.9,0.8,0.8],
    avg_flight_price_eur: 85, avg_hotel_price_eur: 60, avg_daily_budget_eur: 50,
    description_for_embedding: "Budapest est la surprise d'Europe centrale. Bains thermaux Széchenyi, ruin bars, vue sur le Danube, Parlement gothique. Pas cher, festif, authentique. Idéal pour amis ou couple qui veut sortir des sentiers battus."
  },
  {
    city: "Dubrovnik", country: "Croatie", region: "europe",
    iata_code: "DBV",
    vibe_tags: ["romantique", "medieval", "mer-adriatique", "premium", "Game-of-Thrones"],
    trip_types: ["couple", "friends", "solo"],
    activity_types: ["plage", "culture", "histoire", "kayak"],
    safety_index: 9, visa_required_fr: false, currency: "EUR", language: "Croate",
    monthly_weather_score: [5,5,6,7,9,10,10,10,9,7,6,5],
    monthly_crowd_score:   [9,9,9,7,5,3,2,2,5,7,9,9],
    monthly_price_index:   [0.7,0.7,0.8,1.0,1.2,1.5,1.8,1.8,1.3,0.9,0.7,0.7],
    avg_flight_price_eur: 130, avg_hotel_price_eur: 110, avg_daily_budget_eur: 100,
    description_for_embedding: "Dubrovnik est une cité médiévale extraordinaire sur l'Adriatique. Remparts sur la mer, eau turquoise, îles proches en bateau. Saturé en juillet-août — préférer mai-juin ou septembre. Romantique et premium."
  },
  {
    city: "Ljubljana", country: "Slovénie", region: "europe",
    iata_code: "LJU",
    vibe_tags: ["cache", "ecolo", "romantique", "nature", "authentique", "petit-bijou"],
    trip_types: ["couple", "solo", "friends"],
    activity_types: ["nature", "culture", "randonnee", "velo"],
    safety_index: 10, visa_required_fr: false, currency: "EUR", language: "Slovène",
    monthly_weather_score: [4,5,6,7,8,9,10,10,9,7,5,4],
    monthly_crowd_score:   [10,10,9,8,7,6,5,5,7,8,9,10],
    monthly_price_index:   [0.8,0.8,0.8,0.9,1.0,1.1,1.2,1.2,1.0,0.9,0.8,0.8],
    avg_flight_price_eur: 110, avg_hotel_price_eur: 80, avg_daily_budget_eur: 70,
    description_for_embedding: "Ljubljana est la capitale la plus verte d'Europe, quasi sans voitures en centre-ville. Petit, romantique, facile à visiter. Porte d'entrée vers le lac Bled (30min) et les Alpes slovènes. Idéale pour couples qui cherchent l'original."
  },
  {
    city: "Tallinn", country: "Estonie", region: "europe",
    iata_code: "TLL",
    vibe_tags: ["medieval", "cache", "hiver-magique", "histoire", "original", "nordique"],
    trip_types: ["couple", "friends", "solo"],
    activity_types: ["culture", "histoire", "gastronomie"],
    safety_index: 9, visa_required_fr: false, currency: "EUR", language: "Estonien",
    monthly_weather_score: [3,3,4,5,7,8,9,9,7,5,3,2],
    monthly_crowd_score:   [10,10,9,8,7,6,5,5,7,8,9,10],
    monthly_price_index:   [0.7,0.7,0.7,0.8,0.9,1.0,1.2,1.2,1.0,0.9,0.8,0.8],
    avg_flight_price_eur: 110, avg_hotel_price_eur: 70, avg_daily_budget_eur: 60,
    description_for_embedding: "Tallinn a la vieille ville médiévale la mieux préservée d'Europe. Petite, walkable, surprenante. En hiver avec la neige c'est un conte de fées. Peu connue des français, pas chère, authentique. Parfaite pour casser la routine."
  },
  {
    city: "Valence", country: "Espagne", region: "europe",
    iata_code: "VLC",
    vibe_tags: ["paella", "plage", "soleil", "authentique", "moins-touristique", "architecture-futuriste"],
    trip_types: ["couple", "friends", "family", "solo"],
    activity_types: ["plage", "gastronomie", "culture", "velo"],
    safety_index: 8, visa_required_fr: false, currency: "EUR", language: "Espagnol",
    monthly_weather_score: [6,6,7,8,9,10,10,10,9,8,7,6],
    monthly_crowd_score:   [9,9,8,7,6,5,4,4,6,7,8,9],
    monthly_price_index:   [0.8,0.8,0.8,0.9,1.0,1.1,1.3,1.3,1.0,0.9,0.8,0.8],
    avg_flight_price_eur: 100, avg_hotel_price_eur: 75, avg_daily_budget_eur: 65,
    description_for_embedding: "Valence est la troisième ville d'Espagne mais sans les hordes de touristes. Patrie de la paella originale, plages propres, Cité des Arts et des Sciences futuriste, excellent vélo urbain. Plus authentique que Barcelone pour moins cher."
  },
  {
    city: "Kotor", country: "Monténégro", region: "europe",
    iata_code: "TIV",
    vibe_tags: ["cache", "medieval", "fjord", "mer", "aventure", "original"],
    trip_types: ["couple", "friends", "solo", "adventure"],
    activity_types: ["randonnee", "plage", "histoire", "kayak"],
    safety_index: 8, visa_required_fr: false, currency: "EUR", language: "Monténégrin",
    monthly_weather_score: [5,5,6,7,9,10,10,10,9,7,6,5],
    monthly_crowd_score:   [10,10,9,8,6,4,3,3,5,8,10,10],
    monthly_price_index:   [0.6,0.6,0.7,0.8,0.9,1.1,1.4,1.4,1.1,0.8,0.6,0.6],
    avg_flight_price_eur: 140, avg_hotel_price_eur: 65, avg_daily_budget_eur: 55,
    description_for_embedding: "Kotor est une cité médiévale dans un fjord méditerranéen, entourée de montagnes qui plongent dans la mer. Peu connue, moins chère que la Croatie, magnifique. Idéale pour les couples aventuriers ou amis qui veulent l'extraordinaire."
  },

  // === AFRIQUE DU NORD / MOYEN ORIENT ===
  {
    city: "Marrakech", country: "Maroc", region: "north_africa",
    iata_code: "RAK",
    vibe_tags: ["derient", "souks", "epices", "couleurs", "hammam", "depaysement"],
    trip_types: ["couple", "friends", "solo"],
    activity_types: ["culture", "gastronomie", "spa", "shopping"],
    safety_index: 7, visa_required_fr: false, currency: "MAD", language: "Arabe/Berbère",
    monthly_weather_score: [6,7,8,9,9,8,7,8,9,9,8,7],
    monthly_crowd_score:   [7,7,7,6,6,7,6,6,7,7,7,7],
    monthly_price_index:   [0.8,0.8,0.9,1.0,1.0,0.9,0.9,0.9,0.9,1.0,0.9,1.0],
    avg_flight_price_eur: 90, avg_hotel_price_eur: 70, avg_daily_budget_eur: 50,
    description_for_embedding: "Marrakech est un choc sensoriel total. Médina labyrinthique, souks colorés, épices, riads avec piscine, hammams traditionnels. Dépaysement maximal à 3h30 de Paris pour pas cher. Idéale pour couples ou amis qui veulent sortir complètement de l'Europe."
  },
  {
    city: "Agadir", country: "Maroc", region: "north_africa",
    iata_code: "AGA",
    vibe_tags: ["plage", "soleil", "resort", "famille", "surf", "detente"],
    trip_types: ["family", "couple", "friends"],
    activity_types: ["plage", "surf", "kitesurf", "detente"],
    safety_index: 8, visa_required_fr: false, currency: "MAD", language: "Arabe",
    monthly_weather_score: [7,7,8,9,9,9,8,9,9,9,8,7],
    monthly_crowd_score:   [8,8,8,7,6,6,5,5,7,8,8,8],
    monthly_price_index:   [0.8,0.8,0.8,0.9,0.9,1.0,1.1,1.1,1.0,0.9,0.8,0.9],
    avg_flight_price_eur: 120, avg_hotel_price_eur: 80, avg_daily_budget_eur: 60,
    description_for_embedding: "Agadir est la destination plage idéale pour les familles et les surfers. Grande plage propre, hôtels all-inclusive accessibles, soleil garanti presque toute l'année. Moins d'exotisme que Marrakech mais plus de confort et de sécurité."
  },
  {
    city: "Tbilissi", country: "Géorgie", region: "caucasus",
    iata_code: "TBS",
    vibe_tags: ["original", "vin-georgien", "architecture-unique", "cache", "gastronomie", "montagne"],
    trip_types: ["solo", "couple", "friends"],
    activity_types: ["culture", "gastronomie", "vin", "randonnee"],
    safety_index: 8, visa_required_fr: false, currency: "GEL", language: "Géorgien",
    monthly_weather_score: [4,5,6,7,8,9,9,9,8,7,5,4],
    monthly_crowd_score:   [9,9,9,8,7,6,5,5,7,8,9,9],
    monthly_price_index:   [0.6,0.6,0.7,0.8,0.9,1.0,1.1,1.1,0.9,0.8,0.7,0.7],
    avg_flight_price_eur: 160, avg_hotel_price_eur: 50, avg_daily_budget_eur: 40,
    description_for_embedding: "Tbilissi est une révélation : architecture unique, vin naturel géorgien parmi les meilleurs du monde, gastronomie originale (khinkali, khachapuri), très peu cher. La Géorgie est l'un des pays les plus sous-estimés d'Europe/Caucase. Parfait pour les voyageurs qui veulent l'original."
  },

  // === ASIE ===
  {
    city: "Bangkok", country: "Thaïlande", region: "southeast_asia",
    iata_code: "BKK",
    vibe_tags: ["energie", "street-food", "temples", "shopping", "chaos-organise", "neon"],
    trip_types: ["solo", "friends", "couple"],
    activity_types: ["culture", "gastronomie", "shopping", "temples"],
    safety_index: 7, visa_required_fr: false, currency: "THB", language: "Thaï",
    monthly_weather_score: [7,8,9,8,7,6,6,6,6,7,7,7],
    monthly_crowd_score:   [6,7,7,8,9,8,8,8,8,7,6,5],
    monthly_price_index:   [1.1,1.1,1.0,0.9,0.8,0.8,0.8,0.8,0.8,0.9,1.0,1.1],
    avg_flight_price_eur: 480, avg_hotel_price_eur: 50, avg_daily_budget_eur: 40,
    description_for_embedding: "Bangkok est une métropole qui ne dort jamais. Street food incroyable à 1€, temples dorés, marchés flottants, vie nocturne intense, massages thaïlandais. Très bon marché sur place malgré le vol. Idéale pour l'Asie du Sud-Est en hub."
  },
  {
    city: "Bali", country: "Indonésie", region: "southeast_asia",
    iata_code: "DPS",
    vibe_tags: ["yoga", "spirituel", "plage", "surf", "nature", "romantique", "digital-nomad"],
    trip_types: ["couple", "solo", "friends"],
    activity_types: ["surf", "yoga", "temple", "plage", "randonnee"],
    safety_index: 7, visa_required_fr: false, currency: "IDR", language: "Balinais/Indonésien",
    monthly_weather_score: [6,6,7,8,9,9,9,9,9,9,8,6],
    monthly_crowd_score:   [6,7,8,7,7,6,5,5,7,8,8,6],
    monthly_price_index:   [0.9,0.9,0.9,0.9,0.9,0.9,1.1,1.1,0.9,0.9,0.9,1.0],
    avg_flight_price_eur: 600, avg_hotel_price_eur: 45, avg_daily_budget_eur: 50,
    description_for_embedding: "Bali est l'île des dieux indonésienne. Rizières en terrasses, temples hindouistes, surf à Canggu, yoga à Ubud, fêtes à Seminyak. Budget serré sur place, vol long mais accessible. Romantique et spirituel."
  },

  // === ATLANTIQUE / ÎLES ===
  {
    city: "Madère", country: "Portugal", region: "atlantic_islands",
    iata_code: "FNC",
    vibe_tags: ["nature", "randonnee", "levadas", "fleurs", "calme", "original", "atlantique"],
    trip_types: ["couple", "solo", "friends", "adventure"],
    activity_types: ["randonnee", "nature", "plage", "levadas"],
    safety_index: 10, visa_required_fr: false, currency: "EUR", language: "Portugais",
    monthly_weather_score: [7,7,7,8,8,8,9,9,9,8,8,7],
    monthly_crowd_score:   [8,8,8,7,6,6,5,5,6,7,8,8],
    monthly_price_index:   [0.8,0.8,0.8,0.9,1.0,1.0,1.2,1.2,1.0,0.9,0.8,0.9],
    avg_flight_price_eur: 150, avg_hotel_price_eur: 80, avg_daily_budget_eur: 70,
    description_for_embedding: "Madère est l'île atlantique des randonneurs et des couples qui cherchent la nature. Levadas (sentiers d'eau), falaises dramatiques, fleurs tropicales, vin de Madère, piscines naturelles de basalte. Sûre, verte, jamais trop chaude. Alternative originale aux Canaries."
  },
  {
    city: "Les Açores (Ponta Delgada)", country: "Portugal", region: "atlantic_islands",
    iata_code: "PDL",
    vibe_tags: ["volcan", "nature-sauvage", "baleines", "randonnee", "original", "vert"],
    trip_types: ["couple", "friends", "solo", "adventure"],
    activity_types: ["randonnee", "whale-watching", "plongee", "nature"],
    safety_index: 10, visa_required_fr: false, currency: "EUR", language: "Portugais",
    monthly_weather_score: [6,6,6,7,7,8,8,8,8,7,6,6],
    monthly_crowd_score:   [9,9,9,8,7,6,5,5,7,8,9,9],
    monthly_price_index:   [0.8,0.8,0.8,0.9,1.0,1.1,1.3,1.3,1.1,0.9,0.8,0.8],
    avg_flight_price_eur: 160, avg_hotel_price_eur: 70, avg_daily_budget_eur: 65,
    description_for_embedding: "Les Açores sont parmi les destinations les plus spectaculaires d'Europe. Volcans, lacs de cratère, baleines à voir de près, sources chaudes naturelles, prairies qui ressemblent à l'Irlande. Très peu connues, vertes toute l'année, idéales pour amoureux de la nature."
  },
  {
    city: "Tenerife", country: "Espagne", region: "canary_islands",
    iata_code: "TFS",
    vibe_tags: ["soleil-hiver", "plage", "volcan-teide", "famille", "all-inclusive"],
    trip_types: ["family", "couple", "friends"],
    activity_types: ["plage", "randonnee", "parc-attraction", "nature"],
    safety_index: 9, visa_required_fr: false, currency: "EUR", language: "Espagnol",
    monthly_weather_score: [8,8,8,9,9,10,10,10,9,9,8,8],
    monthly_crowd_score:   [5,6,6,7,7,6,5,5,6,7,6,5],
    monthly_price_index:   [1.0,1.0,1.0,0.9,0.9,1.0,1.2,1.2,1.0,0.9,0.9,1.1],
    avg_flight_price_eur: 170, avg_hotel_price_eur: 90, avg_daily_budget_eur: 75,
    description_for_embedding: "Tenerife est l'île canarienne avec le Teide (volcan 3718m), plages noires et blanches, parcs aquatiques pour enfants. Soleil garanti même en hiver. Parfaite pour familles et couples cherchant le soleil en dehors de l'été européen."
  }

  // Ajouter 180+ destinations supplémentaires selon le même schéma
  // Couvrir : Balkans, Scandinavie, Amérique du Sud, Amérique Centrale, 
  // Océanie, Afrique sub-saharienne, Moyen-Orient, Asie centrale
];
```

---

## Étape 2 — Service d'Embedding

Crée `backend/src/services/embeddingService.js` :

```javascript
// backend/src/services/embeddingService.js
import VoyageAI from 'voyageai';

const voyage = new VoyageAI({ apiKey: process.env.VOYAGE_AI_API_KEY });

/**
 * Génère un embedding pour un texte donné
 * Modèle : voyage-large-2 (1536 dimensions, optimisé travel)
 */
export async function generateEmbedding(text) {
  try {
    const response = await voyage.embed({
      input: text,
      model: 'voyage-large-2',
    });
    return response.data[0].embedding; // array de 1536 floats
  } catch (error) {
    console.error('[Embedding] Voyage AI error:', error.message);
    throw error;
  }
}

/**
 * Génère le texte à embedder pour un profil utilisateur
 * C'est le "DNA text" — plus il est riche, meilleur est le matching
 */
export function buildUserDNAText(profile) {
  const {
    basic = {},
    onboardingPreferences = {}
  } = profile;

  const parts = [];

  // Type de voyageur
  if (basic.tripType) {
    const tripTypeMap = {
      couple: 'voyage romantique en couple',
      family: 'vacances en famille avec enfants',
      friends: 'voyage entre amis',
      solo: 'voyage solo',
      business: 'voyage professionnel'
    };
    parts.push(tripTypeMap[basic.tripType] || basic.tripType);
  }

  // Vibe libre (le plus important — priorité max)
  if (basic.travelVibeDescription) {
    parts.push(`Envie de voyage : ${basic.travelVibeDescription}`);
  }

  // Activités préférées
  if (onboardingPreferences.topActivities?.length > 0) {
    parts.push(`Activités aimées : ${onboardingPreferences.topActivities.join(', ')}`);
  }

  // Style global
  if (onboardingPreferences.globalStyle) {
    parts.push(`Style de voyage : ${onboardingPreferences.globalStyle}`);
  }

  // Destinations déjà visitées (pour éviter répétitions + inférer le goût)
  if (onboardingPreferences.visitedDestinations?.length > 0) {
    parts.push(`Destinations déjà visitées : ${onboardingPreferences.visitedDestinations.join(', ')}`);
  }

  // Type d'hébergement préféré
  if (onboardingPreferences.accommodationPref) {
    parts.push(`Hébergement préféré : ${onboardingPreferences.accommodationPref}`);
  }

  // Comportement (signaux implicites)
  if (profile.savedDestinations?.length > 0) {
    parts.push(`Destinations sauvegardées : ${profile.savedDestinations.join(', ')}`);
  }

  if (profile.rejectedDestinations?.length > 0) {
    parts.push(`Ne veut pas : ${profile.rejectedDestinations.join(', ')}`);
  }

  return parts.join('. ');
}

/**
 * Génère le vecteur DNA d'un utilisateur
 */
export async function generateUserDNA(profile) {
  const dnaText = buildUserDNAText(profile);
  console.log('[DNA] Generating embedding for:', dnaText.substring(0, 100) + '...');
  return generateEmbedding(dnaText);
}
```

---

## Étape 3 — Script d'enrichissement de la Knowledge Base

Crée `backend/src/scripts/enrichDestinations.js` :

```javascript
// backend/src/scripts/enrichDestinations.js
// Script one-shot (puis cron hebdomadaire) pour peupler la table destinations
// Usage : node enrichDestinations.js

import { createClient } from '@supabase/supabase-js';
import { DESTINATIONS_SEED } from '../data/destinations-seed.js';
import { generateEmbedding } from '../services/embeddingService.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function enrichDestinations() {
  console.log(`[Enrich] Starting enrichment of ${DESTINATIONS_SEED.length} destinations...`);
  
  let success = 0;
  let failed = 0;

  for (const dest of DESTINATIONS_SEED) {
    try {
      // Générer l'embedding
      const embedding = await generateEmbedding(dest.description_for_embedding);
      
      // Upsert dans Supabase
      const { error } = await supabase
        .from('destinations')
        .upsert({
          city: dest.city,
          country: dest.country,
          iata_code: dest.iata_code,
          iata_alternatives: dest.iata_alternatives || [],
          region: dest.region,
          vibe_tags: dest.vibe_tags,
          trip_types: dest.trip_types,
          activity_types: dest.activity_types,
          safety_index: dest.safety_index,
          visa_required_fr: dest.visa_required_fr || false,
          currency: dest.currency,
          language: dest.language,
          monthly_weather_score: dest.monthly_weather_score,
          monthly_crowd_score: dest.monthly_crowd_score,
          monthly_price_index: dest.monthly_price_index,
          avg_flight_price_eur: dest.avg_flight_price_eur,
          avg_hotel_price_eur: dest.avg_hotel_price_eur,
          avg_daily_budget_eur: dest.avg_daily_budget_eur,
          description_for_embedding: dest.description_for_embedding,
          embedding,
          last_enriched_at: new Date().toISOString()
        }, { onConflict: 'city,country' });

      if (error) throw error;
      
      success++;
      console.log(`[✓] ${dest.city}, ${dest.country}`);
      
      // Rate limit Voyage AI (100 req/min)
      await new Promise(r => setTimeout(r, 700));
      
    } catch (err) {
      failed++;
      console.error(`[✗] ${dest.city}: ${err.message}`);
    }
  }

  console.log(`\n[Enrich] Done. Success: ${success}, Failed: ${failed}`);
}

enrichDestinations().catch(console.error);
```

---

## Étape 4 — Le nouveau moteur de recommandation

Crée `backend/src/services/recommendationEngine.js` :

```javascript
// backend/src/services/recommendationEngine.js
// REMPLACE l'appel Claude pour la génération de destinations
// Claude est conservé uniquement pour la narrative post-sélection

import { createClient } from '@supabase/supabase-js';
import { generateUserDNA } from './embeddingService.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Calcule le score contextuel d'une destination pour un moment donné
 * Remplace le hardcode 40/30/20/10 par une logique explicite et ajustable
 */
function computeContextualScore(destination, params) {
  const { departureMonth, budget, tripType, numNights, numTravelers } = params;
  
  let score = 0;
  const reasons = [];

  // 1. Score météo pour le mois de départ (0-25 pts)
  const weatherScore = destination.monthly_weather_score?.[departureMonth - 1] || 5;
  score += (weatherScore / 10) * 25;

  // 2. Score budget (0-30 pts) — la destination est-elle accessible ?
  const estimatedTotal = (destination.avg_flight_price_eur * numTravelers) + 
                         (destination.avg_hotel_price_eur * numNights * Math.ceil(numTravelers / 2));
  const budgetRatio = budget / estimatedTotal;
  
  if (budgetRatio >= 1.5) {
    score += 30; // Budget très confortable
    reasons.push('Dans votre budget avec de la marge');
  } else if (budgetRatio >= 1.0) {
    score += 20; // Budget juste suffisant
    reasons.push('Dans votre budget');
  } else if (budgetRatio >= 0.8) {
    score += 10; // Légèrement au-dessus
    reasons.push('Budget un peu serré');
  }
  // < 0.8 = hors budget, 0 pts

  // 3. Score affluence — éviter les foules si possible (0-20 pts)
  const crowdScore = destination.monthly_crowd_score?.[departureMonth - 1] || 5;
  score += (crowdScore / 10) * 20;

  // 4. Score trip_type match (0-15 pts)
  if (destination.trip_types?.includes(tripType)) {
    score += 15;
    reasons.push(`Idéale pour ${tripType === 'couple' ? 'les couples' : tripType}`);
  }

  // 5. Bonus originalité (0-10 pts) — destinations moins connues
  const popularDestinations = ['paris', 'rome', 'barcelone', 'amsterdam', 'new york'];
  if (!popularDestinations.includes(destination.city.toLowerCase())) {
    score += 10;
    reasons.push('Destination peu fréquentée par les français');
  }

  return { score: Math.round(score), reasons };
}

/**
 * Filtre hard les contraintes non-négociables
 */
function passesHardConstraints(destination, params) {
  const { budget, numTravelers, numNights, minSafety = 6, excludedDestinations = [] } = params;
  
  // Budget minimum viable
  const minCost = (destination.avg_flight_price_eur * numTravelers) + 
                  (destination.avg_hotel_price_eur * numNights * Math.ceil(numTravelers / 2));
  if (minCost > budget * 1.3) return false; // Plus de 30% au-dessus du budget = éliminé
  
  // Sécurité
  if (destination.safety_index < minSafety) return false;
  
  // Destinations rejetées par l'user
  if (excludedDestinations.includes(destination.city)) return false;
  
  return true;
}

/**
 * MOTEUR PRINCIPAL
 * Remplace generateDestinationShortlist de claudeService.js
 * 
 * Input : profil user + paramètres de recherche
 * Output : top N destinations scorées, sans aucun appel Claude
 */
export async function getRecommendations(userProfile, searchParams) {
  const {
    budget,
    numTravelers = 1,
    numNights = 4,
    tripType,
    departureMonth = new Date().getMonth() + 1,
    minSafety = 6,
    region = null // null = toutes les régions
  } = searchParams;

  // Étape 1 : Générer le vecteur DNA de l'utilisateur
  const userEmbedding = await generateUserDNA(userProfile);

  // Sauvegarder/mettre à jour le vecteur en base (async, non-bloquant)
  updateUserVector(userProfile.userId, userEmbedding, userProfile).catch(console.error);

  // Étape 2 : Recherche ANN — top 30 destinations proches du vecteur
  const { data: candidates, error } = await supabase.rpc('match_destinations', {
    query_embedding: userEmbedding,
    match_count: 30,
    filter_region: region,
    filter_trip_type: tripType,
    min_safety: minSafety
  });

  if (error) {
    console.error('[Reco] ANN search error:', error);
    throw error;
  }

  // Étape 3 : Filtrage hard + scoring contextuel
  const params = { budget, numTravelers, numNights, tripType, departureMonth,
                   excludedDestinations: userProfile.rejectedDestinations || [] };

  const scored = candidates
    .filter(dest => passesHardConstraints(dest, params))
    .map(dest => {
      const { score, reasons } = computeContextualScore(dest, params);
      return {
        ...dest,
        contextualScore: score,
        vectorSimilarity: dest.similarity, // similarité cosine 0-1
        // Score final : 60% vecteur + 40% contextuel
        finalScore: (dest.similarity * 60) + (score * 0.4),
        matchReasons: reasons
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 5); // Top 5

  console.log(`[Reco] Returned ${scored.length} destinations from ${candidates.length} candidates`);
  
  return scored;
}

/**
 * Met à jour le vecteur utilisateur en base (async)
 */
async function updateUserVector(userId, embedding, profile) {
  if (!userId) return;
  
  await supabase
    .from('user_travel_profiles')
    .upsert({
      user_id: userId,
      onboarding_data: profile,
      embedding,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
}

/**
 * Capture un signal comportemental (click, save, reject)
 * Met à jour le vecteur DNA en temps réel
 */
export async function captureSignal(userId, destinationCity, signalType) {
  // signalType: 'clicked' | 'saved' | 'booked' | 'rejected'
  
  const columnMap = {
    clicked: 'clicked_destinations',
    saved: 'saved_destinations',
    booked: 'booked_destinations',
    rejected: 'rejected_destinations'
  };

  const column = columnMap[signalType];
  if (!column) return;

  // Append à l'array existant (Supabase array operations)
  const { data: existing } = await supabase
    .from('user_travel_profiles')
    .select(column)
    .eq('user_id', userId)
    .single();

  const currentArray = existing?.[column] || [];
  if (!currentArray.includes(destinationCity)) {
    await supabase
      .from('user_travel_profiles')
      .update({ [column]: [...currentArray, destinationCity] })
      .eq('user_id', userId);
  }

  // TODO Sprint 3 : re-générer le vecteur DNA avec les nouveaux signaux
  // (déclencher un job asynchrone pour ne pas bloquer la réponse)
}
```

---

## Étape 5 — Intégration dans travel.js

Dans `backend/src/routes/travel.js`, modifier le workflow WITHOUT_DESTINATION :

```javascript
// Remplacer l'appel à claudeService.generateDestinationShortlist par :
import { getRecommendations } from '../services/recommendationEngine.js';

// Dans le handler WITHOUT_DESTINATION :
const recommendations = await getRecommendations(userProfile, {
  budget: req.body.budget,
  numTravelers: req.body.travelers,
  numNights: req.body.nights,
  tripType: req.body.tripType,
  departureMonth: new Date(req.body.departureDate).getMonth() + 1,
});

// Pour chaque destination recommandée, appeler Booking API pour confirmer le prix réel
// (1 seul appel par destination au lieu de 12)
// Puis Claude pour la narrative uniquement :
const enriched = await Promise.all(
  recommendations.map(async (dest) => {
    const [flight, hotel] = await Promise.all([
      bookingService.searchFlight(dest.iata_code, req.body),
      bookingService.searchHotel(dest.iata_code, req.body)
    ]);
    
    // Claude uniquement pour la narrative
    const insights = await claudeService.generateInsights({
      destination: dest,
      flight,
      hotel,
      userProfile,
      matchReasons: dest.matchReasons
    });
    
    return { ...dest, flight, hotel, insights };
  })
);
```

---

## Étape 6 — Nouveau endpoint : capture de signaux

```javascript
// Dans travel.js, ajouter :
import { captureSignal } from '../services/recommendationEngine.js';

// POST /api/travel/signal
router.post('/signal', auth, async (req, res) => {
  const { destinationCity, signalType } = req.body;
  // signalType: 'clicked' | 'saved' | 'booked' | 'rejected'
  
  await captureSignal(req.user.id, destinationCity, signalType);
  res.json({ ok: true });
});
```

---

## Étape 7 — Variables d'environnement à ajouter

```bash
# .env
VOYAGE_AI_API_KEY=your_voyage_ai_key_here
# Récupérer sur : https://dash.voyageai.com/
# Plan gratuit : 50M tokens/mois (suffisant pour bootstrapper)

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
# Différent de l'anon key — dans Supabase > Settings > API
```

---

## Ordre d'exécution pour Claude Code

Suis cet ordre exactement :

1. **Activer pgvector** — Supabase SQL Editor, exécuter le bloc 0.1
2. **Créer les tables** — exécuter le bloc SQL complet de la section 0.2
3. **Créer la fonction match_destinations** — bloc SQL section 0.3
4. **Installer les dépendances** : `npm install voyageai @supabase/supabase-js` dans `/backend`
5. **Créer `destinations-seed.js`** avec les 200 destinations (compléter les 180 manquantes)
6. **Créer `embeddingService.js`**
7. **Créer `recommendationEngine.js`**
8. **Créer `enrichDestinations.js`**
9. **Lancer le seed** : `node backend/src/scripts/enrichDestinations.js`
10. **Modifier `travel.js`** pour intégrer le nouveau moteur
11. **Ajouter l'endpoint `/signal`**
12. **Tester** avec les 5 cas de la section suivante

---

## Tests de validation

Après implémentation, vérifier ces 5 scénarios :

```
Test A — Couple romantique budget serré
Input: { tripType: 'couple', budget: 800, travelers: 2, nights: 4, 
         travelVibeDescription: 'escapade romantique avec bonne gastronomie' }
Expected: Ljubljana, Porto, Valence ou Kotor (PAS Prague/Barcelone en premier)
Critère: vectorSimilarity > 0.7

Test B — Amis budget étudiant
Input: { tripType: 'friends', budget: 400, travelers: 4, nights: 3,
         travelVibeDescription: 'weekend pas cher entre potes' }
Expected: Budapest, Prague, Cracovie — prix vol < 80€/pers
Critère: aucun hostel, budget viable

Test C — Famille plage
Input: { tripType: 'family', budget: 3000, travelers: 4, nights: 7,
         travelVibeDescription: 'vacances été bord de mer enfants 6 et 10 ans' }
Expected: Tenerife, Agadir, Croatie
Critère: safety_index >= 8, trip_types inclut 'family'

Test D — Solo aventurier original
Input: { tripType: 'solo', budget: 1200, travelers: 1, nights: 7,
         travelVibeDescription: 'destination insolite hors des sentiers battus' }
Expected: Géorgie, Açores, Monténégro, Tallinn (PAS Rome/Paris)
Critère: destinations hors top-10 populaires

Test E — Budget impossible
Input: { budget: 200, travelers: 4, nights: 5 }
Expected: 0 résultats après filtrage, erreur explicite
Critère: passesHardConstraints retourne false pour toutes les destinations
```

---

## Notes importantes

- **Voyage AI vs OpenAI** : Voyage AI `voyage-large-2` est 2x moins cher qu'OpenAI `text-embedding-3-large` et produit de meilleurs résultats sur les données de voyage. Utilise-le en priorité.
- **Dimension 1536** : cohérent avec le modèle voyage-large-2. Si tu changes de modèle, tu devras re-embedder toute la base.
- **IVFFlat index** : avec `lists = 100`, optimal pour 2000 destinations. Re-créer avec `lists = 200` quand tu dépasses 10k destinations.
- **Le seed prend ~25 minutes** pour 200 destinations (rate limit Voyage AI 100 req/min). Lance-le en arrière-plan.
- **Claude n'est pas supprimé** — il reste pour les insights et l'itinéraire, mais n'est plus dans la boucle critique de sélection des destinations.

---

*Sprint 2 Brief — Généré le 28 mars 2026*  
*Basé sur l'analyse de algorithme.md + architecture existante Skusku*
