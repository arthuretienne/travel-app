-- ============================================================
-- Sprint 2 — Migration Supabase
-- Exécuter dans Supabase SQL Editor (dans l'ordre)
-- ============================================================

-- 0.1 Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 0.2 Tables
CREATE TABLE IF NOT EXISTS destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  iata_code TEXT,
  iata_alternatives TEXT[],
  region TEXT,

  vibe_tags TEXT[],
  trip_types TEXT[],
  activity_types TEXT[],

  safety_index INTEGER,
  visa_required_fr BOOLEAN DEFAULT FALSE,
  currency TEXT,
  language TEXT,
  timezone TEXT,

  monthly_weather_score INTEGER[],
  monthly_crowd_score INTEGER[],
  monthly_price_index NUMERIC[],

  avg_flight_price_eur INTEGER,
  avg_hotel_price_eur INTEGER,
  avg_daily_budget_eur INTEGER,

  description_for_embedding TEXT,
  embedding vector(1536),

  last_enriched_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(city, country)
);

CREATE TABLE IF NOT EXISTS user_travel_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,

  onboarding_data JSONB,

  clicked_destinations TEXT[],
  saved_destinations TEXT[],
  booked_destinations TEXT[],
  rejected_destinations TEXT[],

  embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  destination_id UUID REFERENCES destinations(id),

  flight_price_eur INTEGER,
  hotel_price_eur INTEGER,
  total_price_eur INTEGER,
  departure_date DATE,
  return_date DATE,

  match_score NUMERIC,
  match_reasons TEXT[],

  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 0.2 Index ANN
CREATE INDEX IF NOT EXISTS destinations_embedding_idx ON destinations
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS user_profiles_embedding_idx ON user_travel_profiles
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- 0.3 Fonction de recherche ANN
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
