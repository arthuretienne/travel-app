// backend/src/utils/temporalOptimization.js
// Temporal optimization: Find best dates to travel based on calendar and budget

/**
 * Detect off-peak periods (cheaper flights & hotels)
 * Avoid school holidays and peak tourist seasons
 */
export const OFF_PEAK_PERIODS = {
  europe: [
    // Current/upcoming periods (Nov 2025 - Dec 2026)
    { start: '2025-11-19', end: '2025-12-18', reason: 'Pre-Christmas low season', discount: 0.75 }, // 25% cheaper
    { start: '2026-01-07', end: '2026-02-14', reason: 'Post-holidays winter', discount: 0.7 }, // 30% cheaper
    { start: '2026-03-01', end: '2026-03-31', reason: 'Early spring shoulder', discount: 0.85 }, // 15% cheaper
    { start: '2026-05-01', end: '2026-05-31', reason: 'Late spring before summer', discount: 0.9 }, // 10% cheaper
    { start: '2026-09-15', end: '2026-10-31', reason: 'Autumn shoulder season', discount: 0.85 }, // 15% cheaper
  ]
};

/**
 * Peak periods to AVOID (expensive & crowded)
 */
export const PEAK_PERIODS = {
  europe: [
    // Current/upcoming peak periods
    { start: '2025-12-19', end: '2026-01-06', reason: 'Christmas & New Year', premium: 1.5 }, // 50% more expensive
    { start: '2026-02-15', end: '2026-03-02', reason: 'Winter school holidays', premium: 1.3 },
    { start: '2026-04-12', end: '2026-04-28', reason: 'Easter holidays', premium: 1.4 },
    { start: '2026-07-01', end: '2026-08-31', reason: 'Summer peak season', premium: 1.4 },
    { start: '2026-12-20', end: '2027-01-06', reason: 'Christmas & New Year', premium: 1.5 },
  ]
};

/**
 * French school holiday dates 2025 (Zone C - Paris)
 * These are expensive travel periods in France
 */
export const FRENCH_SCHOOL_HOLIDAYS = {
  '2025-2026': [
    { name: 'Noël 2025', start: '2025-12-20', end: '2026-01-05', zone: 'all' },
    { name: 'Hiver', start: '2026-02-21', end: '2026-03-09', zone: 'C' },
    { name: 'Printemps', start: '2026-04-18', end: '2026-05-04', zone: 'C' },
    { name: 'Été', start: '2026-07-04', end: '2026-09-01', zone: 'all' },
    { name: 'Toussaint', start: '2026-10-17', end: '2026-11-02', zone: 'all' },
  ]
};

/**
 * Check if a date falls in a peak period
 */
export function isDateInPeakPeriod(dateStr, region = 'europe') {
  const date = new Date(dateStr);
  const peaks = PEAK_PERIODS[region] || [];

  for (const period of peaks) {
    const start = new Date(period.start);
    const end = new Date(period.end);

    if (date >= start && date <= end) {
      return {
        isPeak: true,
        reason: period.reason,
        premium: period.premium
      };
    }
  }

  return { isPeak: false };
}

/**
 * Check if a date falls in an off-peak period (good for budget travelers)
 */
export function isDateInOffPeakPeriod(dateStr, region = 'europe') {
  const date = new Date(dateStr);
  const offPeaks = OFF_PEAK_PERIODS[region] || [];

  for (const period of offPeaks) {
    const start = new Date(period.start);
    const end = new Date(period.end);

    if (date >= start && date <= end) {
      return {
        isOffPeak: true,
        reason: period.reason,
        discount: period.discount
      };
    }
  }

  return { isOffPeak: false };
}

/**
 * Calculate available leave days for a user
 */
export function calculateAvailableLeaveDays(userPreferences) {
  const annualLeaveDays = userPreferences.annualLeaveDays || 25; // France default: 25 RTT
  const takenLeaveDays = userPreferences.takenLeaveDays || 0;

  return {
    total: annualLeaveDays,
    taken: takenLeaveDays,
    remaining: annualLeaveDays - takenLeaveDays,
    percentageUsed: Math.round((takenLeaveDays / annualLeaveDays) * 100)
  };
}

/**
 * Suggest optimal travel dates based on:
 * - User's available leave days
 * - Off-peak periods (cheaper)
 * - Avoiding peak periods (expensive)
 * - Professional status (salaried can take any day, freelance prefers weekends)
 */
export function suggestOptimalTravelDates(userPreferences, tripDuration) {
  const suggestions = [];
  const offPeaks = OFF_PEAK_PERIODS.europe;
  const leaveDays = calculateAvailableLeaveDays(userPreferences);

  // Check if user has enough leave days
  if (leaveDays.remaining < tripDuration) {
    console.warn(`⚠️  User only has ${leaveDays.remaining} leave days remaining, but trip requires ${tripDuration} days`);
  }

  // Suggest off-peak periods that fit the trip duration
  for (const period of offPeaks) {
    const start = new Date(period.start);
    const end = new Date(period.end);
    const periodDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (periodDuration >= tripDuration) {
      // Suggest dates within this off-peak period
      const tripEnd = new Date(start);
      tripEnd.setDate(tripEnd.getDate() + tripDuration);

      suggestions.push({
        startDate: start.toISOString().split('T')[0],
        endDate: tripEnd.toISOString().split('T')[0],
        duration: tripDuration,
        period: 'off-peak',
        reason: period.reason,
        priceMultiplier: period.discount,
        savings: Math.round((1 - period.discount) * 100) + '%',
        leaveDaysRequired: calculateWorkdaysInPeriod(start, tripEnd)
      });
    }
  }

  return suggestions;
}

/**
 * Calculate number of workdays in a period (excluding weekends)
 */
function calculateWorkdaysInPeriod(startDate, endDate) {
  let workdays = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Count Monday-Friday as workdays
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workdays;
}

/**
 * Optimize trip dates to minimize leave days usage
 * Strategy: Start on Friday evening, return Sunday evening = 5 day trip with only 3 leave days
 */
export function optimizeWeekendTravel(tripDuration) {
  const today = new Date();
  const suggestions = [];

  // Find next 4 Fridays
  for (let i = 0; i < 4; i++) {
    const nextFriday = getNextDayOfWeek(today, 5, i); // 5 = Friday
    const returnDate = new Date(nextFriday);
    returnDate.setDate(returnDate.getDate() + tripDuration);

    const leaveDaysRequired = calculateWorkdaysInPeriod(nextFriday, returnDate);

    suggestions.push({
      startDate: nextFriday.toISOString().split('T')[0],
      endDate: returnDate.toISOString().split('T')[0],
      duration: tripDuration,
      leaveDaysRequired: leaveDaysRequired,
      strategy: 'weekend-optimized',
      savings: `${tripDuration - leaveDaysRequired} days saved`
    });
  }

  return suggestions;
}

/**
 * Get the next occurrence of a specific day of week
 * @param {Date} from - Starting date
 * @param {number} dayOfWeek - 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
 * @param {number} occurrence - 0=next, 1=week after, etc.
 */
function getNextDayOfWeek(from, dayOfWeek, occurrence = 0) {
  const result = new Date(from);
  const currentDay = result.getDay();
  const daysUntilTarget = (dayOfWeek + 7 - currentDay) % 7 || 7;

  result.setDate(result.getDate() + daysUntilTarget + (occurrence * 7));
  return result;
}

/**
 * Apply temporal discount/premium to a price based on travel dates
 */
export function applyTemporalPricing(basePrice, startDate) {
  const peakCheck = isDateInPeakPeriod(startDate);
  const offPeakCheck = isDateInOffPeakPeriod(startDate);

  if (peakCheck.isPeak) {
    const adjustedPrice = Math.round(basePrice * peakCheck.premium);
    return {
      originalPrice: basePrice,
      adjustedPrice: adjustedPrice,
      difference: adjustedPrice - basePrice,
      reason: peakCheck.reason,
      type: 'peak',
      premium: peakCheck.premium
    };
  }

  if (offPeakCheck.isOffPeak) {
    const adjustedPrice = Math.round(basePrice * offPeakCheck.discount);
    return {
      originalPrice: basePrice,
      adjustedPrice: adjustedPrice,
      difference: adjustedPrice - basePrice,
      reason: offPeakCheck.reason,
      type: 'off-peak',
      discount: offPeakCheck.discount
    };
  }

  // Regular period
  return {
    originalPrice: basePrice,
    adjustedPrice: basePrice,
    difference: 0,
    reason: 'Regular period',
    type: 'regular'
  };
}

/**
 * Check if user is in a professional status that allows flexible departure
 */
export function canDepartMidWeek(professionalStatus) {
  const flexibleStatuses = ['freelance', 'student', 'retired', 'unemployed', 'entrepreneur'];
  return flexibleStatuses.includes(professionalStatus?.toLowerCase());
}

/**
 * Generate smart date suggestions based on all factors
 */
export function generateSmartDateSuggestions(userProfile) {
  const { availability, onboardingPreferences } = userProfile;
  const tripDuration = availability?.duration || availability?.idealDuration || 7;

  const suggestions = [];

  // Strategy 1: Off-peak periods (cheapest)
  if (availability?.flexibleDates) {
    const offPeakSuggestions = suggestOptimalTravelDates(onboardingPreferences || {}, tripDuration);
    suggestions.push(...offPeakSuggestions.slice(0, 2)); // Top 2 off-peak options
  }

  // Strategy 2: Weekend-optimized (best leave days usage)
  if (onboardingPreferences?.professionalStatus === 'salaried') {
    const weekendSuggestions = optimizeWeekendTravel(tripDuration);
    suggestions.push(...weekendSuggestions.slice(0, 2)); // Top 2 weekend options
  }

  // Sort by best value (cheapest + least leave days)
  suggestions.sort((a, b) => {
    const aScore = (a.priceMultiplier || 1) + (a.leaveDaysRequired / 10);
    const bScore = (b.priceMultiplier || 1) + (b.leaveDaysRequired / 10);
    return aScore - bScore;
  });

  return suggestions.slice(0, 3); // Return top 3 suggestions
}
