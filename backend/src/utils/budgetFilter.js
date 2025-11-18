// backend/src/utils/budgetFilter.js
// Strict budget filtering to eliminate unrealistic recommendations

/**
 * Filter recommendations by budget BEFORE presenting to user
 * This is critical to avoid showing 3000€ trips for 1000€ budget
 */
export function filterByBudget(recommendations, userBudget, maxOverage = 0.10) {
  const budgetLimit = userBudget * (1 + maxOverage); // Allow 10% overage max

  const filtered = recommendations.filter(rec => {
    const totalCost = rec.pricing?.total || 0;
    const withinBudget = totalCost <= budgetLimit;

    if (!withinBudget) {
      console.log(`❌ Budget filter: Removed ${rec.destination?.city} - ${totalCost}€ exceeds limit ${budgetLimit}€`);
    }

    return withinBudget;
  });

  console.log(`💰 Budget filter: ${filtered.length}/${recommendations.length} recommendations within budget`);

  return filtered;
}

/**
 * Calculate budget score for ranking
 * Rewards options that use 70-90% of budget (sweet spot)
 */
export function calculateBudgetScore(totalCost, userBudget) {
  if (totalCost > userBudget) {
    return 0; // Over budget = eliminated
  }

  const ratio = totalCost / userBudget;

  // Sweet spot: 70-90% of budget = best value
  if (ratio >= 0.7 && ratio <= 0.9) {
    return 1.0;
  }

  // Too cheap might indicate quality issues
  if (ratio < 0.5) {
    return 0.6;
  }

  // Under sweet spot
  if (ratio < 0.7) {
    return 0.8;
  }

  // Close to limit (90-100%)
  if (ratio <= 1.0) {
    return 0.7;
  }

  return 0; // Should never reach here due to filter
}

/**
 * Pre-filter destinations BEFORE calling expensive APIs
 * Uses rough estimates to avoid wasting API calls
 */
export function preFilterByEstimatedCost(destinations, userBudget, maxFlightHours) {
  return destinations.filter(dest => {
    // Rough flight cost estimation by distance/flight hours
    const estimatedFlightCost = estimateFlightCostQuick(dest.distance || 0, maxFlightHours);

    // Rough hotel estimation (will be refined later)
    const estimatedHotelCost = 80 * 7; // Avg €80/night for 7 days

    // Activities budget (20% of total)
    const estimatedActivities = userBudget * 0.2;

    const estimatedTotal = estimatedFlightCost + estimatedHotelCost + estimatedActivities;

    // Allow 20% margin for pre-filtering (refined filter comes later)
    const passesFilter = estimatedTotal <= userBudget * 1.2;

    if (!passesFilter) {
      console.log(`⚡ Pre-filter: Skipped ${dest.city} - estimated ${estimatedTotal}€ too high`);
    }

    return passesFilter;
  });
}

/**
 * Quick flight cost estimation based on distance
 * Used for pre-filtering to save API calls
 */
function estimateFlightCostQuick(distanceKm, maxFlightHours) {
  // Very rough estimates based on distance
  // Short haul (<1500km / <2h): €50-150
  // Medium haul (1500-3000km / 2-5h): €100-300
  // Long haul (>3000km / >5h): €250-600

  if (distanceKm === 0) {
    // Use flight hours if distance not available
    if (maxFlightHours <= 2) return 100;
    if (maxFlightHours <= 5) return 200;
    return 400;
  }

  if (distanceKm < 1500) return 100; // Short haul average
  if (distanceKm < 3000) return 200; // Medium haul average
  return 400; // Long haul average
}

/**
 * Validate that all cost components are present and reasonable
 */
export function validateCostData(recommendation) {
  const { pricing } = recommendation;

  if (!pricing) {
    console.warn(`⚠️  Missing pricing data for ${recommendation.destination?.city}`);
    return false;
  }

  // Check all components are present
  const hasAllComponents = (
    typeof pricing.flight === 'number' &&
    typeof pricing.hotel === 'number' &&
    typeof pricing.activities === 'number' &&
    typeof pricing.total === 'number'
  );

  if (!hasAllComponents) {
    console.warn(`⚠️  Incomplete pricing for ${recommendation.destination?.city}`);
    return false;
  }

  // Sanity check: flight shouldn't be 0 or > 2000€ for European destinations
  if (pricing.flight <= 0 || pricing.flight > 2000) {
    console.warn(`⚠️  Suspicious flight price for ${recommendation.destination?.city}: ${pricing.flight}€`);
    return false;
  }

  // Sanity check: hotel shouldn't be 0 or ridiculously high
  if (pricing.hotel <= 0 || pricing.hotel > 3000) {
    console.warn(`⚠️  Suspicious hotel price for ${recommendation.destination?.city}: ${pricing.hotel}€`);
    return false;
  }

  return true;
}
