// backend/src/scripts/seedNewDestinations.js
// Seeds ONLY destinations not yet in Supabase — skips existing ones
// Usage: node src/scripts/seedNewDestinations.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DESTINATIONS_SEED } from '../data/destinations-seed.js';
import { generateEmbedding } from '../services/embeddingService.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedNewDestinations() {
  // Fetch all cities already in Supabase
  const { data: existing, error: fetchErr } = await supabase
    .from('destinations')
    .select('city, country');

  if (fetchErr) {
    console.error('[Seed] Failed to fetch existing destinations:', fetchErr.message);
    process.exit(1);
  }

  const existingKeys = new Set(existing.map(d => `${d.city}|${d.country}`));
  const newDests = DESTINATIONS_SEED.filter(d => !existingKeys.has(`${d.city}|${d.country}`));

  if (newDests.length === 0) {
    console.log('[Seed] No new destinations to add. DB is up to date.');
    return;
  }

  console.log(`[Seed] Found ${newDests.length} new destinations to add (${existing.length} already in DB)`);
  console.log(`[Seed] Rate limit: 3 req/min → ~${Math.ceil(newDests.length * 21000 / 60000)} minutes`);

  let success = 0;
  let failed = 0;
  const errors = [];

  for (const dest of newDests) {
    try {
      const embedding = await generateEmbedding(dest.description_for_embedding);

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
          last_enriched_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'city,country' });

      if (error) throw error;

      success++;
      process.stdout.write(`\r[${success + failed}/${newDests.length}] ✓ ${dest.city.padEnd(25)}`);

    } catch (err) {
      failed++;
      errors.push({ city: dest.city, error: err.message });
      process.stdout.write(`\r[${success + failed}/${newDests.length}] ✗ ${dest.city}: ${err.message.substring(0, 40)}\n`);
    }

    // Rate limit Voyage AI: 3 req/min free tier
    await new Promise(r => setTimeout(r, 21000));
  }

  console.log(`\n\n[Seed] Done. ✓ ${success} new | ✗ ${failed} failed`);
  if (errors.length > 0) {
    console.log('[Seed] Failed:');
    errors.forEach(e => console.log(`  - ${e.city}: ${e.error}`));
  }
}

seedNewDestinations().catch(err => {
  console.error('[Seed] Fatal error:', err.message);
  process.exit(1);
});
