#!/usr/bin/env node
// backend/scripts/check-prices.js
// Standalone script for Render Cron Jobs
// Usage: node scripts/check-prices.js
// Or via HTTP: POST /api/cron/check-prices with x-cron-secret header

import '../env.js';
import { checkAllAlerts } from '../src/services/priceAlertService.js';
import prisma from '../src/db/prisma.js';

async function main() {
  console.log(`[Cron] Starting price check at ${new Date().toISOString()}`);

  try {
    const results = await checkAllAlerts();
    console.log('[Cron] Results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
