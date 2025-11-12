// For development: uses Vite's environment variable
// For production: uses the Vercel environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Log the API URL in development to help with debugging
if (import.meta.env.DEV) {
  console.log('Using API URL:', API_URL);
}

export { API_URL };