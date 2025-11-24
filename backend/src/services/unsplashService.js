// backend/src/services/unsplashService.js
import { createApi } from 'unsplash-js';
import nodeFetch from 'node-fetch';

// NOTE: dotenv est déjà chargé dans server.js via env.js
// Les variables d'environnement sont disponibles via process.env

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

let unsplash;

if (UNSPLASH_ACCESS_KEY) {
  unsplash = createApi({
    accessKey: UNSPLASH_ACCESS_KEY,
    fetch: nodeFetch,
  });
  console.log('✅ Unsplash client initialized successfully');
} else {
  console.warn('⚠️  UNSPLASH_ACCESS_KEY not set, using fallback images');
}

/**
 * Recherche une photo pour une destination
 * @param {string} cityName - Nom de la ville
 * @param {string} countryName - Nom du pays
 * @returns {Promise<string>} URL de la photo
 */
export async function getDestinationPhoto(cityName, countryName) {
  // Fallback images si pas de clé Unsplash
  if (!unsplash) {
    return getFallbackImage(cityName);
  }

  try {
    const query = `${cityName} ${countryName} landmark travel`;

    const result = await unsplash.search.getPhotos({
      query,
      page: 1,
      perPage: 1,
      orientation: 'landscape',
    });

    if (result.errors) {
      console.error('Unsplash API error:', result.errors);
      return getFallbackImage(cityName);
    }

    const photo = result.response.results[0];

    if (!photo) {
      console.warn(`No photo found for ${cityName}, ${countryName}`);
      return getFallbackImage(cityName);
    }

    // Retourne l'URL de la photo en qualité moyenne (pour économiser la bande passante)
    return {
      url: photo.urls.regular,
      small: photo.urls.small,
      thumb: photo.urls.thumb,
      alt: photo.alt_description || `${cityName}, ${countryName}`,
      photographer: {
        name: photo.user.name,
        username: photo.user.username,
        link: photo.user.links.html,
      },
      downloadLocation: photo.links.download_location, // Pour respecter les guidelines Unsplash
    };
  } catch (error) {
    console.error(`Error fetching photo for ${cityName}:`, error.message);
    return getFallbackImage(cityName);
  }
}

/**
 * Récupère des photos pour plusieurs destinations en parallèle
 * @param {Array} destinations - Tableau de destinations {city, country}
 * @returns {Promise<Map>} Map de cityName -> photo
 */
export async function getDestinationPhotos(destinations) {
  const photoPromises = destinations.map(async (dest) => {
    const photo = await getDestinationPhoto(dest.city, dest.country);
    return [dest.city, photo];
  });

  const results = await Promise.all(photoPromises);
  return new Map(results);
}

/**
 * Envoie un événement de téléchargement à Unsplash (requis par leurs guidelines)
 * @param {string} downloadLocation - URL de téléchargement depuis l'objet photo
 */
export async function trackDownload(downloadLocation) {
  if (!unsplash || !downloadLocation) return;

  try {
    await unsplash.photos.trackDownload({ downloadLocation });
  } catch (error) {
    console.error('Error tracking download:', error.message);
  }
}

/**
 * Images de fallback basées sur Unsplash (URLs publiques qui ne comptent pas dans le quota)
 * Ces URLs sont des exemples statiques - en production, vous pourriez utiliser une autre source gratuite
 *
 * Photo IDs curated for travel inspiration - Updated 2025
 */
function getFallbackImage(cityName) {
  // Expanded map: 60+ European and popular destinations
  const fallbackPhotos = {
    // Western Europe
    'Paris': 'Q0-fOL2nqZc',
    'London': '9RgU1v8FVwY',
    'Amsterdam': '2BXl2NKl7SM',
    'Brussels': 'hPKTYwJ0Vew',
    'Luxembourg': 'xKhtkhc9HbQ',

    // Southern Europe
    'Barcelona': 'oWlEcK2G6ik',
    'Madrid': 'hgO1wFPXl3I',
    'Seville': 'qiR_C0uT1ac',
    'Valencia': 'eH7kZhx8M_o',
    'Lisbon': 'tCgHwbzhRvA',
    'Porto': 'IPhh-hHLQJA',
    'Rome': 'w-SxLLzQn5w',
    'Florence': 'TnzeGlvP-bE',
    'Venice': 'q_D_ufkwJ6M',
    'Milan': 'LYFV7EjpIZs',
    'Naples': 'PXM3v5b8YbE',
    'Athens': 'Cf3zQ6gGbhU',
    'Santorini': 'vA5RrM0m-xY',
    'Crete': 'rDLBArZU9r0',

    // Eastern Europe
    'Budapest': 'TrhLCn1abMU',
    'Prague': 'k-jJMHDy5pE',
    'Vienna': '_Kh3FY-jzfo',
    'Krakow': 'a8QX1LF8QU0',
    'Warsaw': 'YQ9jd3m6_vA',
    'Bucharest': 'DUmFLtMeAbQ',
    'Sofia': 'QLqNalPe0RA',
    'Belgrade': 'NtBAOt4zBSs',
    'Sarajevo': 'qP_vBpAXyqk',

    // Balkans & Adriatic
    'Ljubljana': '7O8X5dP6ybo',
    'Zagreb': 'jvjsME6_YU0',
    'Split': 'KyIf_Z4rKVo',
    'Dubrovnik': 'EuKAE_VHWH8',
    'Kotor': 'S-cdwrx-YuQ',
    'Tirana': 'wYQeY5YxTSo',

    // Baltic States
    'Tallinn': 'TQSY9sP-1gw',
    'Riga': 'VpIYR8DnCrs',
    'Vilnius': '8zPqCmY5Hpc',

    // Scandinavia
    'Copenhagen': 'o4UhdLv5jbQ',
    'Stockholm': 'pFyKRmDiWEA',
    'Oslo': 'FPt10LXK0cg',
    'Helsinki': 'EMHS2xh93cE',
    'Reykjavik': 'k7HnE2jKZDw',

    // Central Europe
    'Berlin': 'BXs8SjVelKs',
    'Munich': 'vNqWqjETDpg',
    'Hamburg': 'OeofBE_o5lk',
    'Zurich': 'abDTflZn3zQ',
    'Geneva': '44dtzuUWG5k',

    // Caucasus & Eastern Mediterranean
    'Tbilisi': 'H5WeVdxBqek',
    'Yerevan': 'hzx-QdF1p_g',
    'Istanbul': 'iWv_x37gS2Y',
    'Ankara': 'K8imLimiY5M',
    'Cyprus': 'iL12-yq6FJA',

    // Islands & Special Destinations
    'Malta': '4EqSsZvmSPQ',
    'Valletta': 'Rw3LFBWm4z4',
    'Corsica': 'JqVNzKCBb2w',
    'Sardinia': 'nvC9eVfqahU',
    'Sicily': 'fTCRwLkuIPA',
    'Palermo': 'BvfJKtxK7BI',
    'Madeira': 'L4iKccAjPAI',
    'Azores': '0vY082Un2pk',
    'Canary Islands': 'c7rexKZiRhE',

    // Other Global Cities (for reference)
    'Tokyo': 'WUehAgqO5hE',
    'New York': 'HN-5Z6AmxrM',
    'Dubai': 'sJfX6W5RvdI',
    'Bangkok': 'UfZwHRzGNas',
    'Singapore': 'fyeOxvYvIyY',
    'Sydney': 'yKSKoqx1lxk',
    'Bali': 'uVSQP_Iz-qo',
  };

  const photoId = fallbackPhotos[cityName];

  if (photoId) {
    return {
      url: `https://images.unsplash.com/photo-${photoId}?w=800&q=80`,
      small: `https://images.unsplash.com/photo-${photoId}?w=400&q=80`,
      thumb: `https://images.unsplash.com/photo-${photoId}?w=200&q=80`,
      alt: cityName,
      photographer: {
        name: 'Unsplash',
        username: 'unsplash',
        link: 'https://unsplash.com',
      },
    };
  }

  // Try fuzzy matching for common variations
  const normalized = cityName.toLowerCase();
  for (const [city, photoId] of Object.entries(fallbackPhotos)) {
    if (city.toLowerCase().includes(normalized) || normalized.includes(city.toLowerCase())) {
      return {
        url: `https://images.unsplash.com/photo-${photoId}?w=800&q=80`,
        small: `https://images.unsplash.com/photo-${photoId}?w=400&q=80`,
        thumb: `https://images.unsplash.com/photo-${photoId}?w=200&q=80`,
        alt: cityName,
        photographer: {
          name: 'Unsplash Community',
          username: 'unsplash',
          link: 'https://unsplash.com',
        },
      };
    }
  }

  // Generic travel-inspiring fallback (mountain landscape instead of globe)
  // More inspiring than a globe - suggests adventure and discovery
  return {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // Beautiful mountain landscape
    small: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
    thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80',
    alt: `${cityName} - Discover this destination`,
    photographer: {
      name: 'Unsplash',
      username: 'unsplash',
      link: 'https://unsplash.com',
    },
  };
}
