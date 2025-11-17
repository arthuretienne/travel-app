// backend/env.js
// This file MUST be imported FIRST before any other modules
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
const envPath = path.resolve(__dirname, '../.env');
console.log('📁 Loading .env from:', envPath);

const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.warn('⚠️  No .env file found (this is normal in production - using environment variables from Railway)');
} else {
  console.log('✅ .env file loaded successfully');
}
console.log('🔑 Environment variables:');
console.log('  - ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('  - AMADEUS_CLIENT_ID:', process.env.AMADEUS_CLIENT_ID ? '✅ SET' : '❌ MISSING');
console.log('  - AMADEUS_CLIENT_SECRET:', process.env.AMADEUS_CLIENT_SECRET ? '✅ SET' : '❌ MISSING');
console.log('');

// Export a function that can be used to verify env vars are loaded
export function checkEnv(varName) {
  return process.env[varName] !== undefined;
}
