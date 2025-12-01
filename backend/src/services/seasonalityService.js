// backend/src/services/seasonalityService.js
// Seasonal insights for destinations

/**
 * Get the season for a given date
 */
export function getSeason(date) {
  const month = new Date(date).getMonth(); // 0-11

  // Northern hemisphere seasons (most of Europe)
  if (month >= 2 && month <= 4) return 'spring';      // March-May
  if (month >= 5 && month <= 7) return 'summer';      // June-August
  if (month >= 8 && month <= 10) return 'autumn';     // September-November
  return 'winter';                                     // December-February
}

/**
 * Get month name from date
 */
export function getMonthName(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date(date).getMonth()];
}

/**
 * Determine if it's peak season for a destination
 * Peak seasons: Summer (June-August) + Christmas/New Year (late Dec-early Jan)
 */
export function isPeakSeason(destination, date) {
  const month = new Date(date).getMonth();
  const day = new Date(date).getDate();

  // Summer months are peak for most European destinations
  if (month >= 5 && month <= 7) return true; // June, July, August

  // Christmas and New Year period
  if (month === 11 && day >= 20) return true; // Late December
  if (month === 0 && day <= 7) return true;   // Early January

  // Easter period (approximate - usually March/April)
  if (month === 2 || month === 3) {
    // Simplified: any weekend in March/April could be Easter
    return false; // We'd need a proper Easter calculation
  }

  return false;
}

/**
 * Get crowd level description
 */
export function getCrowdLevel(destination, date) {
  const isPeak = isPeakSeason(destination, date);

  if (isPeak) {
    return {
      level: 'high',
      description: 'High season - popular attractions will be crowded',
      tip: 'Book tickets in advance and arrive early at attractions'
    };
  }

  return {
    level: 'low',
    description: 'Off-season - fewer tourists, more authentic experience',
    tip: 'Enjoy shorter queues and better prices'
  };
}

/**
 * Get weather description for a destination and month
 */
export function getWeatherDescription(destination, date) {
  const month = new Date(date).getMonth();
  const season = getSeason(date);

  // Simplified weather patterns for European destinations
  // In production, you'd use a weather API or comprehensive database

  const weatherPatterns = {
    spring: {
      temp: '12-18°C',
      description: 'Mild and pleasant, occasional rain',
      clothes: 'Light jacket, layers recommended'
    },
    summer: {
      temp: '20-28°C',
      description: 'Warm and sunny, perfect for outdoor activities',
      clothes: 'Light clothing, sunscreen essential'
    },
    autumn: {
      temp: '10-16°C',
      description: 'Cool and crisp, beautiful fall colors',
      clothes: 'Jacket, comfortable walking shoes'
    },
    winter: {
      temp: '2-8°C',
      description: 'Cold, possibility of rain or snow',
      clothes: 'Warm coat, layers, waterproof shoes'
    }
  };

  return weatherPatterns[season];
}

/**
 * Get pricing trend description
 */
export function getPricingTrend(destination, date) {
  const isPeak = isPeakSeason(destination, date);

  if (isPeak) {
    return {
      level: 'high',
      description: 'Peak season pricing - hotels and flights are 30-50% more expensive',
      savings: 'none'
    };
  }

  return {
    level: 'low',
    description: 'Off-season pricing - great deals on accommodation and activities',
    savings: '30-50% cheaper than peak season'
  };
}

/**
 * Get comprehensive seasonal insights
 */
export function getSeasonalInsights(destination, date, userPreferences = {}) {
  const season = getSeason(date);
  const monthName = getMonthName(date);
  const isPeak = isPeakSeason(destination, date);
  const crowds = getCrowdLevel(destination, date);
  const weather = getWeatherDescription(destination, date);
  const pricing = getPricingTrend(destination, date);

  // Match user preferences
  const userMatch = [];

  if (userPreferences.avoidCrowds && !isPeak) {
    userMatch.push(`Perfect timing - you mentioned avoiding crowds, and ${monthName} is off-season with 50% fewer tourists`);
  }

  if (userPreferences.climate) {
    if (userPreferences.climate === 'warm' && (season === 'summer' || season === 'spring')) {
      userMatch.push(`Weather matches your preference - ${weather.temp} is ideal for your warm climate preference`);
    } else if (userPreferences.climate === 'cold' && season === 'winter') {
      userMatch.push(`Perfect for cold weather lovers - ${weather.temp} with cozy winter atmosphere`);
    }
  }

  if (userPreferences.budgetLevel === 'budget' && !isPeak) {
    userMatch.push(`Budget-friendly timing - ${pricing.savings} compared to peak season`);
  }

  return {
    season,
    monthName,
    isPeakSeason: isPeak,
    crowds,
    weather,
    pricing,
    userMatch,

    // Summary for "Why Now" section
    whyNowSummary: {
      timing: !isPeak ? `${monthName} is off-season - fewer crowds, better prices` : `${monthName} is peak season - vibrant atmosphere, all attractions open`,
      weather: `${weather.temp} - ${weather.description}`,
      crowds: crowds.description,
      pricing: pricing.description,
      userBenefits: userMatch.length > 0 ? userMatch : ['Great time to visit based on current conditions']
    }
  };
}

export default {
  getSeason,
  getMonthName,
  isPeakSeason,
  getCrowdLevel,
  getWeatherDescription,
  getPricingTrend,
  getSeasonalInsights,
};
