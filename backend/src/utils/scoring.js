// backend/src/utils/scoring.js

// Track how often destinations are recommended (in-memory for MVP)
const destinationCounts = new Map();

export function calculateFinalScore(destination, flightPrice, hotelPrice, userBudget) {
  const totalPrice = flightPrice + hotelPrice;
  
  // 1. AI Match Score (40%) - from Claude's recommendation
  const aiScore = 100; // Claude already filtered for good matches
  
  // 2. Price Score (30%) - better score if within budget and good value
  const priceScore = calculatePriceScore(totalPrice, userBudget);
  
  // 3. Originality Score (20%) - boost lesser-known destinations
  const originalityScore = calculateOriginalityScore(destination);
  
  // 4. Availability Score (10%) - all destinations have availability if we got here
  const availabilityScore = 100;

  const finalScore = (
    (aiScore * 0.40) +
    (priceScore * 0.30) +
    (originalityScore * 0.20) +
    (availabilityScore * 0.10)
  );

  return {
    total: Math.round(finalScore),
    breakdown: {
      aiMatch: Math.round(aiScore * 0.40),
      price: Math.round(priceScore * 0.30),
      originality: Math.round(originalityScore * 0.20),
      availability: Math.round(availabilityScore * 0.10)
    }
  };
}

function calculatePriceScore(totalPrice, userBudget) {
  const ratio = totalPrice / userBudget;
  
  if (ratio <= 0.7) return 100; // Great value
  if (ratio <= 0.85) return 90;
  if (ratio <= 0.95) return 80;
  if (ratio <= 1.0) return 70;
  return 50; // Over budget but close
}

function calculateOriginalityScore(destination) {
  const key = `${destination.city}-${destination.country}`;
  const count = destinationCounts.get(key) || 0;
  
  // Increment count
  destinationCounts.set(key, count + 1);
  
  // Calculate score based on popularity
  const totalRecommendations = Array.from(destinationCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const percentage = (count / totalRecommendations) * 100;
  
  // Apply boost to less recommended destinations
  if (percentage < 1) return 100; // +25% boost
  if (percentage < 3) return 90;  // +20% boost
  if (percentage < 5) return 80;  // +15% boost
  if (percentage < 10) return 70; // +10% boost
  return 50; // Popular destinations

}

export function getDestinationStats() {
  const stats = Array.from(destinationCounts.entries())
    .map(([dest, count]) => ({ destination: dest, count }))
    .sort((a, b) => b.count - a.count);
  
  return stats;
}