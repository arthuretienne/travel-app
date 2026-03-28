// backend/src/services/opportunityService.js
// Sprint 4 — Proactive Travel Opportunities
// Matches user DNA vectors against live Booking.com prices
// Stores deals in travel_opportunities, triggers push notifications

import { createClient } from '@supabase/supabase-js';
import { getDestinationId, getMinPrice } from './bookingService.js';
import { sendPushToUser } from './pushService.js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Default departure airport (CDG) — overridden by user's preferredAirports
const DEFAULT_ORIGIN = 'Paris';

// Price drop threshold: must be this % cheaper than avg to qualify
const DEAL_THRESHOLD = 0.78; // 22% below average = deal

// Next Friday → Monday
function getNextWeekend() {
  const today = new Date();
  const d = new Date(today);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1); // advance to Friday
  const monday = new Date(d);
  monday.setDate(monday.getDate() + 3);
  return {
    depart: d.toISOString().split('T')[0],
    return: monday.toISOString().split('T')[0],
  };
}

// 15th of next month
function getNextMonthDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 15);
  return d.toISOString().split('T')[0];
}

/**
 * Scan all users with embeddings for proactive opportunities
 * Called by cron job (daily)
 */
export async function scanAllUsers() {
  const supabase = getSupabase();
  console.log('[Opportunities] Starting scan for all users...');

  // Get all users who have a DNA vector
  const { data: users, error } = await supabase
    .from('user_travel_profiles')
    .select('user_id, embedding, onboarding_data, clicked_destinations, saved_destinations, rejected_destinations')
    .not('embedding', 'is', null)
    .limit(200); // safety cap

  if (error || !users?.length) {
    console.warn('[Opportunities] No users with embeddings found:', error?.message);
    return { scanned: 0, opportunities: 0 };
  }

  console.log(`[Opportunities] Scanning ${users.length} users...`);

  let totalOpportunities = 0;
  const weekend = getNextWeekend();
  const monthDate = getNextMonthDate();

  // Get origin airport ID once (shared for all users)
  const originId = await getDestinationId(DEFAULT_ORIGIN).catch(() => null);
  if (!originId?.id) {
    console.error('[Opportunities] Cannot get origin airport ID, aborting');
    return { scanned: 0, opportunities: 0 };
  }

  // Process users in batches of 5 to respect rate limits
  for (let i = 0; i < users.length; i += 5) {
    const batch = users.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(user => scanUser(supabase, user, originId, weekend, monthDate))
    );
    totalOpportunities += results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r) => sum + (r.value || 0), 0);

    // Brief pause between batches to respect Booking.com rate limits
    if (i + 5 < users.length) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`[Opportunities] Scan complete. ${totalOpportunities} opportunities created.`);
  return { scanned: users.length, opportunities: totalOpportunities };
}

async function scanUser(supabase, user, originId, weekend, monthDate) {
  const { user_id, embedding, onboarding_data, rejected_destinations = [] } = user;
  if (!embedding) return 0;

  // ANN search: top 5 destinations matching this user
  const { data: candidates } = await supabase.rpc('match_destinations', {
    query_embedding: embedding,
    match_count: 5,
    filter_region: null,
    filter_trip_type: null,
    min_safety: 6,
  });

  if (!candidates?.length) return 0;

  // Skip rejected destinations
  const filtered = candidates.filter(
    d => !rejected_destinations.map(r => r.toLowerCase()).includes(d.city.toLowerCase())
  );

  let opportunitiesCreated = 0;

  for (const dest of filtered.slice(0, 3)) {
    // Check if we already have a pending opportunity for this user+destination
    const { data: existing } = await supabase
      .from('travel_opportunities')
      .select('id')
      .eq('user_id', user_id)
      .eq('destination_id', dest.id)
      .in('status', ['pending', 'sent'])
      .gte('expires_at', new Date().toISOString())
      .single();

    if (existing) continue;

    // Get destination airport ID
    const destId = await getDestinationId(dest.city).catch(() => null);
    if (!destId?.id) continue;

    // Check weekend price
    const weekendPrice = await getMinPrice(originId.id, destId.id, weekend.depart, weekend.return);

    const avgPrice = dest.avg_flight_price_eur;
    if (!weekendPrice || !avgPrice) continue;

    const discount = weekendPrice / avgPrice;
    if (discount > DEAL_THRESHOLD) continue; // Not cheap enough

    const savings = Math.round((1 - discount) * 100);
    const expiresAt = new Date(weekend.depart);

    // Store opportunity
    await supabase.from('travel_opportunities').insert({
      user_id,
      destination_id: dest.id,
      flight_price_eur: weekendPrice,
      hotel_price_eur: dest.avg_hotel_price_eur * 3, // 3 nights estimate
      total_price_eur: weekendPrice + (dest.avg_hotel_price_eur * 3),
      departure_date: weekend.depart,
      return_date: weekend.return,
      match_score: dest.similarity,
      match_reasons: [
        `${savings}% moins cher que la normale`,
        `Vol à ${weekendPrice}€ A/R`,
        ...dest.vibe_tags?.slice(0, 2) || [],
      ],
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    });

    // Send push notification
    await sendPushToUser(user_id, {
      title: `✈️ Deal détecté : ${dest.city}`,
      body: `Vol à ${weekendPrice}€ A/R ce weekend — ${savings}% moins cher que d'habitude`,
      icon: '/logo-192.png',
      badge: '/logo-192.png',
      tag: `opportunity-${dest.city}`,
      data: {
        url: `/dashboard`,
        type: 'opportunity',
        destination: dest.city,
      },
    }).catch(() => {}); // non-blocking

    opportunitiesCreated++;
    console.log(`[Opportunities] Deal: ${dest.city} at ${weekendPrice}€ (${savings}% off) for user ${user_id.slice(0, 8)}...`);
  }

  return opportunitiesCreated;
}

/**
 * Get opportunities for a specific user (for dashboard display)
 */
export async function getUserOpportunities(userId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('travel_opportunities')
    .select(`
      id, flight_price_eur, hotel_price_eur, total_price_eur,
      departure_date, return_date, match_score, match_reasons,
      status, created_at, expires_at,
      destinations (city, country, iata_code, vibe_tags, avg_flight_price_eur)
    `)
    .eq('user_id', userId)
    .in('status', ['pending', 'sent'])
    .gte('expires_at', new Date().toISOString())
    .order('match_score', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[Opportunities] Fetch error:', error.message);
    return [];
  }

  // Mark as 'sent' (user has seen them)
  const ids = (data || []).map(o => o.id);
  if (ids.length > 0) {
    await supabase
      .from('travel_opportunities')
      .update({ status: 'sent' })
      .in('id', ids)
      .eq('status', 'pending');
  }

  return data || [];
}

/**
 * Update opportunity status (clicked, dismissed)
 */
export async function updateOpportunityStatus(userId, opportunityId, status) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('travel_opportunities')
    .update({ status })
    .eq('id', opportunityId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}
