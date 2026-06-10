// backend/src/services/embeddingService.js
import crypto from 'crypto';
import * as cache from '../utils/cache.js';

// Cache DNA embeddings by a hash of their source text. The same profile (no new
// behavioural signals) produces the same text → same vector, so we avoid a
// Voyage AI round-trip (~300-500ms + cost) on every repeated search.
const DNA_CACHE_TTL_MIN = 24 * 60; // 24h

/**
 * Génère un embedding pour un texte donné
 * Modèle : voyage-large-2 (1536 dimensions, optimisé travel)
 */
export async function generateEmbedding(text) {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_AI_API_KEY}`,
    },
    body: JSON.stringify({ input: [text], model: 'voyage-large-2' }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage AI error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding; // array de 1536 floats
}

/**
 * Génère le texte DNA d'un profil utilisateur pour l'embedding
 */
export function buildUserDNAText(profile) {
  const { basic = {}, onboardingPreferences = {} } = profile;
  const parts = [];

  if (basic.tripType) {
    const map = {
      couple: 'voyage romantique en couple',
      family: 'vacances en famille avec enfants',
      friends: 'voyage entre amis',
      solo: 'voyage solo découverte',
      business: 'voyage professionnel'
    };
    parts.push(map[basic.tripType] || basic.tripType);
  }

  if (basic.travelVibeDescription) {
    parts.push(`Envie de voyage : ${basic.travelVibeDescription}`);
  }

  if (onboardingPreferences.topActivities?.length > 0) {
    parts.push(`Activités préférées : ${onboardingPreferences.topActivities.join(', ')}`);
  }

  if (onboardingPreferences.globalStyle) {
    parts.push(`Style de voyage : ${onboardingPreferences.globalStyle}`);
  }

  if (onboardingPreferences.visitedDestinations?.length > 0) {
    parts.push(`Destinations déjà visitées : ${onboardingPreferences.visitedDestinations.join(', ')}`);
  }

  if (onboardingPreferences.accommodationPref) {
    parts.push(`Hébergement préféré : ${onboardingPreferences.accommodationPref}`);
  }

  if (profile.savedDestinations?.length > 0) {
    parts.push(`Destinations sauvegardées : ${profile.savedDestinations.slice(-10).join(', ')}`);
  }

  if (profile.bookedDestinations?.length > 0) {
    parts.push(`Destinations bookées (fort signal) : ${profile.bookedDestinations.slice(-5).join(', ')}`);
  }

  if (profile.clickedDestinations?.length > 0) {
    parts.push(`Destinations consultées : ${profile.clickedDestinations.slice(-8).join(', ')}`);
  }

  // NOTE: rejectedDestinations are intentionally NOT added here. Embeddings do
  // not encode negation — "ne veut pas Bali" pulls the vector TOWARD Bali-like
  // places. Rejections are enforced as a hard filter in recommendationEngine
  // (excludedDestinations), which is the correct mechanism.

  return parts.join('. ') || 'voyage découverte';
}

/**
 * Génère le vecteur DNA d'un utilisateur (avec cache par hash du texte).
 */
export async function generateUserDNA(profile) {
  const dnaText = buildUserDNAText(profile);
  const key = `dna:${crypto.createHash('sha256').update(dnaText).digest('hex')}`;

  const cached = await cache.get(key);
  if (Array.isArray(cached) && cached.length > 0) {
    console.log('[DNA] Cache HIT for embedding text');
    return cached;
  }

  console.log('[DNA] Embedding text:', dnaText.substring(0, 120) + '...');
  const embedding = await generateEmbedding(dnaText);
  cache.set(key, embedding, DNA_CACHE_TTL_MIN);
  return embedding;
}
