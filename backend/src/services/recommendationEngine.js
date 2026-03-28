// backend/src/services/recommendationEngine.js
// Remplace generateDestinationShortlist — Claude n'est plus dans la boucle de sélection
import { createClient } from '@supabase/supabase-js';
import { generateUserDNA } from './embeddingService.js';

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Score contextuel (météo, budget, affluence, type de voyage)
 */
function computeContextualScore(destination, params) {
  const { departureMonth, budget, tripType, numNights, numTravelers } = params;
  let score = 0;
  const reasons = [];

  // 1. Météo pour le mois de départ (0-25 pts)
  const weatherScore = destination.monthly_weather_score?.[departureMonth - 1] ?? 5;
  score += (weatherScore / 10) * 25;
  if (weatherScore >= 8) reasons.push(`Météo idéale en ${['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'][departureMonth - 1]}`);

  // 2. Budget (0-30 pts)
  // budget = budget total pour tout le groupe
  const rooms = Math.ceil(numTravelers / 2);
  const estimatedTotal = (destination.avg_flight_price_eur * numTravelers) +
    (destination.avg_hotel_price_eur * numNights * rooms);
  const budgetRatio = estimatedTotal > 0 ? budget / estimatedTotal : 1;

  if (budgetRatio >= 1.5) {
    score += 30;
    reasons.push('Dans votre budget avec de la marge');
  } else if (budgetRatio >= 1.0) {
    score += 20;
    reasons.push('Dans votre budget');
  } else if (budgetRatio >= 0.7) {
    score += 10;
    reasons.push('Budget légèrement serré');
  }

  // 3. Affluence (0-20 pts)
  const crowdScore = destination.monthly_crowd_score?.[departureMonth - 1] ?? 5;
  score += (crowdScore / 10) * 20;
  if (crowdScore >= 8) reasons.push('Peu de touristes à cette période');

  // 4. Trip type match (0-15 pts)
  if (destination.trip_types?.includes(tripType)) {
    score += 15;
    const labels = { couple: 'les couples', family: 'les familles', friends: 'les groupes d\'amis', solo: 'les voyageurs solo', business: 'les voyages business', adventure: 'l\'aventure' };
    reasons.push(`Idéale pour ${labels[tripType] || tripType}`);
  }

  // 5. Originalité (0-10 pts) — bonus pour destinations hors des sentiers battus
  // Modulé selon le profil : solo/aventure = forte pénalité pour destinations mainstream
  const veryPopular = ['paris','rome','barcelone','amsterdam','new york','venise','madrid','tokyo','dubai','dubaï','london','londres','bali','prague','budapest','cracovie'];
  const cityLower = destination.city.toLowerCase();
  const isAdventureSolo = ['solo', 'adventure', 'aventure'].includes(tripType);

  if (!veryPopular.includes(cityLower)) {
    score += 10;
    if (!['paris','rome','barcelone','amsterdam','new york'].includes(cityLower)) {
      reasons.push('Destination originale');
    }
  } else if (isAdventureSolo) {
    // Pénalité pour profil aventurier qui tombe sur destination mainstream
    score -= 5;
  }

  return { score: Math.round(score), reasons };
}

/**
 * Filtre les contraintes non-négociables
 */
function passesHardConstraints(destination, params) {
  const { budget, numTravelers, numNights, minSafety = 6, excludedDestinations = [] } = params;

  // Budget : seuil adapté au nombre de voyageurs
  // Les prix seeds sont des estimations — laisser plus de marge pour les groupes
  const rooms = Math.ceil(numTravelers / 2);
  const minCost = (destination.avg_flight_price_eur * numTravelers) +
    (destination.avg_hotel_price_eur * numNights * rooms);
  // Seuil : 150% pour groupes 3+ (les prix Booking réels sont souvent meilleurs)
  //         130% pour solo/couple
  const budgetThreshold = numTravelers >= 3 ? 1.6 : 1.3;
  if (minCost > budget * budgetThreshold) return false;

  if (destination.safety_index < minSafety) return false;

  if (excludedDestinations.map(d => d.toLowerCase()).includes(destination.city.toLowerCase())) return false;

  return true;
}

/**
 * Diversité géographique : au plus 2 destinations par pays dans le top 5
 */
function applyCountryDiversity(scored) {
  const countryCounts = {};
  const result = [];

  // Premier passage : max 1 par pays
  for (const dest of scored) {
    const c = dest.country;
    if (!countryCounts[c]) {
      countryCounts[c] = 0;
      result.push(dest);
      countryCounts[c]++;
    }
    if (result.length >= 5) break;
  }

  // Compléter si besoin avec les suivants (max 2/pays)
  if (result.length < 5) {
    for (const dest of scored) {
      if (result.includes(dest)) continue;
      const c = dest.country;
      if ((countryCounts[c] || 0) < 2) {
        result.push(dest);
        countryCounts[c] = (countryCounts[c] || 0) + 1;
      }
      if (result.length >= 5) break;
    }
  }

  return result;
}

/**
 * MOTEUR PRINCIPAL
 * Remplace generateDestinationShortlist — aucun appel Claude
 */
export async function getRecommendations(userProfile, searchParams) {
  const {
    budget,
    numTravelers = 1,
    numNights = 4,
    tripType = 'solo',
    departureMonth = new Date().getMonth() + 1,
    minSafety = 6,
    region = null,
  } = searchParams;

  const supabase = getSupabase();

  // Étape 1 : vecteur DNA utilisateur
  const userEmbedding = await generateUserDNA(userProfile);

  // Mise à jour asynchrone (non-bloquant)
  updateUserVector(supabase, userProfile.userId, userEmbedding, userProfile).catch(console.error);

  // Étape 2 : recherche ANN — top 30 candidates
  const { data: candidates, error } = await supabase.rpc('match_destinations', {
    query_embedding: userEmbedding,
    match_count: 30,
    filter_region: region,
    filter_trip_type: tripType || null,
    min_safety: minSafety,
  });

  if (error) {
    console.error('[Reco] ANN error:', error.message);
    throw new Error(`Recommendation engine error: ${error.message}`);
  }

  if (!candidates || candidates.length === 0) {
    console.warn('[Reco] No candidates returned from ANN search');
    return [];
  }

  // Étape 3 : filtrage hard + scoring
  const params = {
    budget, numTravelers, numNights, tripType, departureMonth, minSafety,
    // Exclude rejected AND already-booked destinations (been there, done that)
    excludedDestinations: [
      ...(userProfile.rejectedDestinations || []),
      ...(userProfile.bookedDestinations || []),
    ],
  };

  const scored = candidates
    .filter(dest => passesHardConstraints(dest, params))
    .map(dest => {
      const { score, reasons } = computeContextualScore(dest, { ...params });
      return {
        ...dest,
        contextualScore: score,
        vectorSimilarity: dest.similarity,
        // 60% similarité vectorielle + 40% score contextuel
        finalScore: (dest.similarity * 60) + (score * 0.4),
        matchReasons: reasons,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  const diverse = applyCountryDiversity(scored);

  console.log(`[Reco] ${diverse.length} destinations (from ${candidates.length} candidates, ${scored.length} after filter)`);
  return diverse;
}

/**
 * Capture un signal comportemental (click, save, reject)
 */
export async function captureSignal(userId, destinationCity, signalType) {
  const columnMap = {
    clicked: 'clicked_destinations',
    saved: 'saved_destinations',
    booked: 'booked_destinations',
    rejected: 'rejected_destinations',
  };

  const column = columnMap[signalType];
  if (!column || !userId) return;

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('user_travel_profiles')
    .select(column)
    .eq('user_id', userId)
    .single();

  const current = existing?.[column] || [];
  if (!current.includes(destinationCity)) {
    const updated = [...current, destinationCity];
    await supabase
      .from('user_travel_profiles')
      .upsert({ user_id: userId, [column]: updated, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    // Regenerate DNA vector with new signal (async, non-blocking)
    regenerateDNA(supabase, userId).catch(err =>
      console.warn('[Reco] DNA regeneration failed (non-critical):', err.message)
    );
  }
}

async function regenerateDNA(supabase, userId) {
  const { data: profile } = await supabase
    .from('user_travel_profiles')
    .select('onboarding_data, clicked_destinations, saved_destinations, booked_destinations, rejected_destinations')
    .eq('user_id', userId)
    .single();

  if (!profile?.onboarding_data) return;

  const enrichedProfile = {
    ...profile.onboarding_data,
    clickedDestinations: profile.clicked_destinations || [],
    savedDestinations: profile.saved_destinations || [],
    bookedDestinations: profile.booked_destinations || [],
    rejectedDestinations: profile.rejected_destinations || [],
  };

  const embedding = await generateUserDNA(enrichedProfile);
  await supabase
    .from('user_travel_profiles')
    .update({ embedding, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  console.log(`[Reco] DNA vector refreshed for user ${userId}`);
}

async function updateUserVector(supabase, userId, embedding, profile) {
  if (!userId) return;
  await supabase
    .from('user_travel_profiles')
    .upsert({
      user_id: userId,
      onboarding_data: profile,
      embedding,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}
