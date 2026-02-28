// backend/src/routes/dates.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import prisma from '../db/prisma.js';
import {
  generateSmartDateSuggestions,
  calculateAvailableLeaveDays,
  OFF_PEAK_PERIODS,
  PEAK_PERIODS,
  FRENCH_SCHOOL_HOLIDAYS,
  isDateInOffPeakPeriod,
  optimizeWeekendTravel
} from '../utils/temporalOptimization.js';
import { generateDynamicRecommendations } from '../services/dynamicDateService.js';

const router = express.Router();

/**
 * GET /api/dates/intelligent
 * Generate intelligent date suggestions for user
 * Returns short-term (1 month) and long-term (6 months) recommendations
 */
router.get('/intelligent', authenticateUser, async (req, res) => {
  try {
    console.log('🤖 Generating intelligent date suggestions for:', req.user.email);

    // Fetch user preferences
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
    });

    if (!userPreferences) {
      return res.status(404).json({
        success: false,
        error: 'User preferences not found',
        message: 'Please complete onboarding first'
      });
    }

    const today = new Date();

    // Map idealDuration (onboarding string) to avgTripDuration (int) as fallback
    const idealDurationMap = { '3-5-jours': 4, '1-semaine': 7, '2-semaines': 14, 'flexible': 7 };

    // Check for cached periods that are still valid
    const cachedPeriods = await prisma.optimalPeriod.findMany({
      where: {
        userId: req.user.id,
        expiresAt: { gte: today }
      },
      orderBy: {
        confidence: 'desc'
      }
    });

    const cachedShort = cachedPeriods.filter(p => p.type === 'short');
    const cachedLong = cachedPeriods.filter(p => p.type === 'long');

    // If we have valid cached data, return it
    if (cachedShort.length > 0 && cachedLong.length > 0) {
      console.log('✅ Using cached optimal periods');

      const leaveDaysInfo = userPreferences.annualLeaveDays && userPreferences.takenLeaveDays !== null
        ? calculateAvailableLeaveDays(userPreferences)
        : null;

      return res.json({
        success: true,
        data: {
          short: cachedShort.map(formatCachedPeriod),
          long: cachedLong.map(formatCachedPeriod),
          leaveDaysInfo,
          metadata: {
            tripDuration: userPreferences.avgTripDuration || idealDurationMap[userPreferences.idealDuration] || 7,
            hasCalendar: userPreferences.calendarConnected || false,
            generatedAt: cachedShort[0]?.generatedAt.toISOString(),
            fromCache: true
          }
        }
      });
    }

    // No valid cache, generate new recommendations
    console.log('🔄 Generating fresh optimal periods');

    // Calculate leave days info
    const leaveDaysInfo = userPreferences.annualLeaveDays && userPreferences.takenLeaveDays !== null
      ? calculateAvailableLeaveDays(userPreferences)
      : null;

    const tripDuration = userPreferences.avgTripDuration
      || idealDurationMap[userPreferences.idealDuration]
      || 7;

    let shortTermPeriods, longTermPeriods, isDynamic = false;

    // Try dynamic engine first (real prices + exchange rates + weather + Claude)
    try {
      console.log('🚀 Trying dynamic arbitrage engine...');
      const dynamic = await generateDynamicRecommendations(userPreferences);
      if (dynamic?.short?.length > 0 && dynamic?.long?.length > 0) {
        shortTermPeriods = dynamic.short;
        longTermPeriods = dynamic.long;
        isDynamic = true;
        console.log('✅ Dynamic engine succeeded');
      } else {
        throw new Error('Dynamic engine returned empty results');
      }
    } catch (dynErr) {
      console.warn('⚠️  Dynamic engine failed, falling back to static:', dynErr.message);
      // Fallback: static algorithm based on off-peak periods
      shortTermPeriods = generateShortTermSuggestions(today, tripDuration, userPreferences, leaveDaysInfo);
      longTermPeriods = generateLongTermSuggestions(today, tripDuration, userPreferences, leaveDaysInfo);
    }

    // Cache the new periods (expires in 24 hours)
    const expiresAt = new Date(today);
    expiresAt.setHours(expiresAt.getHours() + 24);

    await cachePeriods(req.user.id, shortTermPeriods, longTermPeriods, expiresAt);

    console.log(`✅ Generated and cached ${shortTermPeriods.length} short-term + ${longTermPeriods.length} long-term suggestions (${isDynamic ? 'dynamic' : 'static'})`);

    res.json({
      success: true,
      data: {
        short: shortTermPeriods,
        long: longTermPeriods,
        leaveDaysInfo,
        metadata: {
          tripDuration,
          hasCalendar: userPreferences.calendarConnected || false,
          generatedAt: new Date().toISOString(),
          fromCache: false,
          isDynamic,
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating intelligent dates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate intelligent dates',
      message: error.message
    });
  }
});

/**
 * Generate short-term suggestions (next 30 days)
 * Focus: Quick getaways, weekend extensions, immediate opportunities
 */
function generateShortTermSuggestions(startDate, tripDuration, userPreferences, leaveDaysInfo) {
  const suggestions = [];
  const maxDate = new Date(startDate);
  maxDate.setDate(maxDate.getDate() + 30);

  // Strategy 1: Weekend-optimized trips (3-4 days)
  if (tripDuration <= 4) {
    const weekendTrips = optimizeWeekendTravel(tripDuration);

    weekendTrips.forEach((trip, idx) => {
      const start = new Date(trip.startDate);
      if (start <= maxDate) {
        const offPeakCheck = isDateInOffPeakPeriod(trip.startDate);

        suggestions.push({
          id: `short-weekend-${idx}`,
          startDate: trip.startDate,
          endDate: trip.endDate,
          duration: trip.duration,
          leaveDaysRequired: trip.leaveDaysRequired,
          type: 'weekend-optimized',
          title: '🚀 Weekend prolongé',
          reason: `Partez du vendredi au ${getDayName(trip.endDate)} en utilisant seulement ${trip.leaveDaysRequired} jour${trip.leaveDaysRequired > 1 ? 's' : ''} de congés`,
          savings: offPeakCheck.isOffPeak ? Math.round((1 - offPeakCheck.discount) * 100) + '%' : '15%',
          confidence: offPeakCheck.isOffPeak ? 90 : 75,
          priceMultiplier: offPeakCheck.discount || 0.85,
          tags: ['court-terme', 'week-end', offPeakCheck.isOffPeak ? 'prix-bas' : 'standard'],
          canAfford: leaveDaysInfo ? trip.leaveDaysRequired <= leaveDaysInfo.remaining : true
        });
      }
    });
  }

  // Strategy 2: Off-peak opportunities in next 30 days
  OFF_PEAK_PERIODS.europe.forEach((period, idx) => {
    const periodStart = new Date(period.start);
    const periodEnd = new Date(period.end);

    if (periodStart >= startDate && periodStart <= maxDate) {
      const tripEnd = new Date(periodStart);
      tripEnd.setDate(tripEnd.getDate() + tripDuration);

      if (tripEnd <= periodEnd) {
        const leaveDaysRequired = calculateWorkdays(periodStart, tripEnd);

        suggestions.push({
          id: `short-offpeak-${idx}`,
          startDate: periodStart.toISOString().split('T')[0],
          endDate: tripEnd.toISOString().split('T')[0],
          duration: tripDuration,
          leaveDaysRequired,
          type: 'off-peak',
          title: '💰 Période creuse',
          reason: period.reason,
          savings: Math.round((1 - period.discount) * 100) + '%',
          confidence: 95,
          priceMultiplier: period.discount,
          tags: ['prix-bas', 'dernière-minute', 'opportunité'],
          canAfford: leaveDaysInfo ? leaveDaysRequired <= leaveDaysInfo.remaining : true
        });
      }
    }
  });

  // Sort by confidence and savings
  return suggestions
    .sort((a, b) => {
      const aScore = a.confidence + parseInt(a.savings);
      const bScore = b.confidence + parseInt(b.savings);
      return bScore - aScore;
    })
    .slice(0, 3); // Top 3
}

/**
 * Generate long-term suggestions (next 6 months)
 * Focus: Optimal periods, best value, cultural events
 */
function generateLongTermSuggestions(startDate, tripDuration, userPreferences, leaveDaysInfo) {
  const suggestions = [];
  const maxDate = new Date(startDate);
  maxDate.setMonth(maxDate.getMonth() + 6);

  // Find all off-peak periods in next 6 months
  OFF_PEAK_PERIODS.europe.forEach((period, idx) => {
    const periodStart = new Date(period.start);
    const periodEnd = new Date(period.end);

    if (periodStart >= startDate && periodStart <= maxDate) {
      const tripEnd = new Date(periodStart);
      tripEnd.setDate(tripEnd.getDate() + tripDuration);

      if (tripEnd <= periodEnd) {
        const leaveDaysRequired = calculateWorkdays(periodStart, tripEnd);
        const season = getSeason(period.start);

        // Add cultural context
        const culturalEvents = getCulturalEvents(periodStart, season, userPreferences);

        suggestions.push({
          id: `long-offpeak-${idx}`,
          startDate: periodStart.toISOString().split('T')[0],
          endDate: tripEnd.toISOString().split('T')[0],
          duration: tripDuration,
          leaveDaysRequired,
          type: 'optimal-period',
          title: getSeasonTitle(season),
          reason: period.reason,
          savings: Math.round((1 - period.discount) * 100) + '%',
          confidence: 98,
          priceMultiplier: period.discount,
          season,
          events: culturalEvents,
          tags: ['prix-optimal', season, 'planifié'],
          canAfford: leaveDaysInfo ? leaveDaysRequired <= leaveDaysInfo.remaining : true,
          weatherScore: getWeatherScore(season, userPreferences)
        });
      }
    }
  });

  // Add optimal spring/fall shoulder seasons
  const shoulderSeasons = findShoulderSeasons(startDate, maxDate, tripDuration, userPreferences);
  suggestions.push(...shoulderSeasons);

  // Sort by overall score (savings + weather + events)
  return suggestions
    .sort((a, b) => {
      const aScore = a.confidence + parseInt(a.savings) + (a.weatherScore || 0) + (a.events?.length * 5 || 0);
      const bScore = b.confidence + parseInt(b.savings) + (b.weatherScore || 0) + (b.events?.length * 5 || 0);
      return bScore - aScore;
    })
    .slice(0, 5); // Top 5
}

/**
 * Find shoulder seasons (spring/fall) - best weather + low prices
 */
function findShoulderSeasons(startDate, endDate, tripDuration, userPreferences) {
  const suggestions = [];

  // Spring shoulder: March-April
  const springStart = new Date(startDate.getFullYear(), 2, 15); // March 15
  if (springStart >= startDate && springStart <= endDate) {
    const springEnd = new Date(springStart);
    springEnd.setDate(springEnd.getDate() + tripDuration);

    suggestions.push({
      id: 'shoulder-spring',
      startDate: springStart.toISOString().split('T')[0],
      endDate: springEnd.toISOString().split('T')[0],
      duration: tripDuration,
      leaveDaysRequired: calculateWorkdays(springStart, springEnd),
      type: 'shoulder-season',
      title: '🌸 Printemps optimal',
      reason: 'Météo idéale, nature en fleurs, prix bas avant la haute saison',
      savings: '25%',
      confidence: 92,
      priceMultiplier: 0.75,
      season: 'spring',
      events: ['Cherry blossoms', 'Spring festivals', 'Easter celebrations'],
      tags: ['météo-idéale', 'nature', 'prix-bas'],
      canAfford: true,
      weatherScore: 90
    });
  }

  // Fall shoulder: September-October
  const fallStart = new Date(startDate.getFullYear(), 8, 15); // September 15
  if (fallStart >= startDate && fallStart <= endDate) {
    const fallEnd = new Date(fallStart);
    fallEnd.setDate(fallEnd.getDate() + tripDuration);

    suggestions.push({
      id: 'shoulder-fall',
      startDate: fallStart.toISOString().split('T')[0],
      endDate: fallEnd.toISOString().split('T')[0],
      duration: tripDuration,
      leaveDaysRequired: calculateWorkdays(fallStart, fallEnd),
      type: 'shoulder-season',
      title: '🍂 Automne optimal',
      reason: 'Arrière-saison: températures douces, couleurs d\'automne, moins de touristes',
      savings: '30%',
      confidence: 95,
      priceMultiplier: 0.70,
      season: 'autumn',
      events: ['Harvest festivals', 'Wine season', 'Fall foliage'],
      tags: ['météo-douce', 'moins-de-touristes', 'prix-bas'],
      canAfford: true,
      weatherScore: 85
    });
  }

  return suggestions;
}

/**
 * Calculate workdays between two dates (excluding weekends)
 */
function calculateWorkdays(startDate, endDate) {
  let workdays = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workdays;
}

/**
 * Get season from date
 */
function getSeason(dateStr) {
  const month = new Date(dateStr).getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Get season display title
 */
function getSeasonTitle(season) {
  const titles = {
    spring: '🌸 Printemps',
    summer: '☀️ Été',
    autumn: '🍂 Automne',
    winter: '❄️ Hiver'
  };
  return titles[season] || '📅 Voyage';
}

/**
 * Get day name in French
 */
function getDayName(dateStr) {
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

/**
 * Get cultural events for a period
 */
function getCulturalEvents(date, season, userPreferences) {
  const events = [];
  const month = date.getMonth();

  // Check if user likes festivals/culture
  const likesCulture = userPreferences.topActivities?.some(activity =>
    ['Festivals', 'Musées', 'Architecture', 'Gastronomie'].includes(activity)
  );

  if (!likesCulture) return events;

  // Season-specific events
  if (season === 'spring') {
    if (month === 2 || month === 3) events.push('Cherry blossoms (Japan, Korea)');
    if (month === 3 || month === 4) events.push('Spring festivals Europe');
  }

  if (season === 'summer') {
    events.push('Music festivals', 'Open-air events', 'Beach culture');
  }

  if (season === 'autumn') {
    events.push('Wine harvest', 'Oktoberfest', 'Fall festivals');
  }

  if (season === 'winter') {
    if (month === 11) events.push('Christmas markets');
    if (month === 0 || month === 1) events.push('Winter sports', 'Carnival season');
  }

  return events;
}

/**
 * Get weather score based on season and user preferences
 */
function getWeatherScore(season, userPreferences) {
  // Check climate sensitivity
  const climateSensitivity = userPreferences.climateSensitivity;

  const scores = {
    spring: 85,
    autumn: 80,
    summer: 70, // Can be too hot
    winter: 60  // Can be too cold
  };

  let score = scores[season] || 70;

  // Adjust based on climate preference
  if (climateSensitivity === 'heat_sensitive' && season === 'summer') {
    score -= 20;
  }
  if (climateSensitivity === 'cold_sensitive' && season === 'winter') {
    score -= 20;
  }

  return score;
}

/**
 * Cache optimal periods in database
 */
async function cachePeriods(userId, shortTermPeriods, longTermPeriods, expiresAt) {
  try {
    // Delete old cached periods for this user
    await prisma.optimalPeriod.deleteMany({
      where: { userId }
    });

    // Cache short-term periods
    if (shortTermPeriods && shortTermPeriods.length > 0) {
      await prisma.optimalPeriod.createMany({
        data: shortTermPeriods.map(period => ({
          userId,
          type: 'short',
          startDate: new Date(period.startDate),
          endDate: new Date(period.endDate),
          duration: period.duration,
          title: period.title,
          reason: period.reason,
          savings: period.savings,
          confidence: period.confidence,
          priceMultiplier: period.priceMultiplier,
          leaveDaysRequired: period.leaveDaysRequired,
          canAfford: period.canAfford,
          season: period.season || null,
          events: period.events || [],
          tags: period.tags || [],
          weatherScore: period.weatherScore || null,
          expiresAt
        }))
      });
    }

    // Cache long-term periods
    if (longTermPeriods && longTermPeriods.length > 0) {
      await prisma.optimalPeriod.createMany({
        data: longTermPeriods.map(period => ({
          userId,
          type: 'long',
          startDate: new Date(period.startDate),
          endDate: new Date(period.endDate),
          duration: period.duration,
          title: period.title,
          reason: period.reason,
          savings: period.savings,
          confidence: period.confidence,
          priceMultiplier: period.priceMultiplier,
          leaveDaysRequired: period.leaveDaysRequired,
          canAfford: period.canAfford,
          season: period.season || null,
          events: period.events || [],
          tags: period.tags || [],
          weatherScore: period.weatherScore || null,
          expiresAt
        }))
      });
    }

    console.log('💾 Cached optimal periods successfully');
  } catch (error) {
    console.error('❌ Error caching optimal periods:', error);
    // Non-fatal error, continue
  }
}

/**
 * Format cached period for API response
 */
function formatCachedPeriod(cached) {
  return {
    id: cached.id,
    startDate: cached.startDate.toISOString().split('T')[0],
    endDate: cached.endDate.toISOString().split('T')[0],
    duration: cached.duration,
    title: cached.title,
    reason: cached.reason,
    savings: cached.savings,
    confidence: cached.confidence,
    priceMultiplier: cached.priceMultiplier,
    leaveDaysRequired: cached.leaveDaysRequired,
    canAfford: cached.canAfford,
    season: cached.season,
    events: cached.events,
    tags: cached.tags,
    weatherScore: cached.weatherScore,
    type: cached.type
  };
}

export default router;
