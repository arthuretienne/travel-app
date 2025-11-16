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
 */
function getFallbackImage(cityName) {
  // Map de villes populaires vers des IDs de photos Unsplash
  const fallbackPhotos = {
    'Paris': 'Q0-fOL2nqZc',
    'Tokyo': 'WUehAgqO5hE',
    'New York': 'HN-5Z6AmxrM',
    'London': '9RgU1v8FVwY',
    'Barcelona': 'oWlEcK2G6ik',
    'Rome': 'w-SxLLzQn5w',
    'Amsterdam': '2BXl2NKl7SM',
    'Dubai': 'sJfX6W5RvdI',
    'Bangkok': 'UfZwHRzGNas',
    'Istanbul': 'iWv_x37gS2Y',
    'Bali': 'uVSQP_Iz-qo',
    'Lisbon': 'tCgHwbzhRvA',
    'Prague': 'k-jJMHDy5pE',
    'Sydney': 'yKSKoqx1lxk',
    'Singapore': 'fyeOxvYvIyY',
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

  // Image générique par défaut
  return {
    url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80', // Globe terrestre
    small: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80',
    thumb: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&q=80',
    alt: cityName,
    photographer: {
      name: 'Unsplash',
      username: 'unsplash',
      link: 'https://unsplash.com',
    },
  };
}
