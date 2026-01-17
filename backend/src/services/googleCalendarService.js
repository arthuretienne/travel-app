// backend/src/services/googleCalendarService.js
import { google } from 'googleapis';

/**
 * Google Calendar OAuth2 Configuration
 * Set these in Railway environment variables:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI (e.g., https://your-backend.railway.app/api/calendar/oauth/callback)
 */

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate authorization URL for user to grant access
 */
export function getAuthUrl() {
  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    scope: SCOPES,
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get calendar events for a user
 * @param {string} accessToken - User's access token
 * @param {string} refreshToken - User's refresh token (optional, for token refresh)
 * @param {Date} timeMin - Start date
 * @param {Date} timeMax - End date
 */
export async function getCalendarEvents(accessToken, refreshToken, timeMin, timeMax) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Find free periods in calendar (gaps between events)
 * Returns array of { startDate, endDate, duration } for potential travel dates
 */
export function findFreePeriods(events, minDuration = 3) {
  const freePeriods = [];
  const today = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  // Sort events by start time
  const sortedEvents = events
    .filter(event => event.start && event.start.dateTime)
    .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

  // Find gaps between events
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEventEnd = new Date(sortedEvents[i].end.dateTime);
    const nextEventStart = new Date(sortedEvents[i + 1].start.dateTime);

    const gapDays = Math.floor((nextEventStart - currentEventEnd) / (1000 * 60 * 60 * 24));

    if (gapDays >= minDuration) {
      freePeriods.push({
        startDate: currentEventEnd.toISOString().split('T')[0],
        endDate: nextEventStart.toISOString().split('T')[0],
        duration: gapDays,
        source: 'calendar_gap',
      });
    }
  }

  // Also check gap before first event and after last event
  if (sortedEvents.length > 0) {
    const firstEventStart = new Date(sortedEvents[0].start.dateTime);
    const daysBefore = Math.floor((firstEventStart - today) / (1000 * 60 * 60 * 24));

    if (daysBefore >= minDuration) {
      freePeriods.push({
        startDate: today.toISOString().split('T')[0],
        endDate: firstEventStart.toISOString().split('T')[0],
        duration: daysBefore,
        source: 'calendar_gap',
      });
    }

    const lastEventEnd = new Date(sortedEvents[sortedEvents.length - 1].end.dateTime);
    const daysAfter = Math.floor((sixMonthsFromNow - lastEventEnd) / (1000 * 60 * 60 * 24));

    if (daysAfter >= minDuration) {
      freePeriods.push({
        startDate: lastEventEnd.toISOString().split('T')[0],
        endDate: sixMonthsFromNow.toISOString().split('T')[0],
        duration: daysAfter,
        source: 'calendar_gap',
      });
    }
  }

  return freePeriods;
}

/**
 * Analyze calendar to suggest optimal travel dates
 * Combines free periods with holidays, vacations, and off-peak periods
 */
export async function suggestTravelDatesFromCalendar(accessToken, refreshToken, tripDuration = 7) {
  const today = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  // Fetch calendar events
  const events = await getCalendarEvents(accessToken, refreshToken, today, sixMonthsFromNow);
  console.log(`📅 Found ${events.length} calendar events in next 6 months`);

  // Find free periods
  const freePeriods = findFreePeriods(events, tripDuration);
  console.log(`✅ Found ${freePeriods.length} free periods of ${tripDuration}+ days`);

  // Import utilities
  const { isDateInOffPeakPeriod } = await import('../utils/temporalOptimization.js');
  const { analyzePeriodForTravel, getHolidaysInRange } = await import('../utils/holidays.js');

  // Get all holidays and long weekends in range
  const { holidays, vacations, longWeekends } = getHolidaysInRange(today, sixMonthsFromNow);

  // Score each free period
  const scoredPeriods = freePeriods.map(period => {
    const offPeakCheck = isDateInOffPeakPeriod(period.startDate);
    const holidayAnalysis = analyzePeriodForTravel(period.startDate, period.endDate);

    return {
      ...period,
      // Off-peak info
      isOffPeak: offPeakCheck.isOffPeak,
      offPeakReason: offPeakCheck.reason,
      priceMultiplier: offPeakCheck.discount || 1.0,
      // Holiday info
      isSchoolVacation: holidayAnalysis.isSchoolVacation,
      vacationName: holidayAnalysis.vacationName,
      includesHoliday: holidayAnalysis.includesHoliday,
      holidays: holidayAnalysis.holidays,
      isLongWeekend: holidayAnalysis.isLongWeekend,
      isPeakSeason: holidayAnalysis.isPeakSeason,
      priceImpact: holidayAnalysis.priceImpact,
      recommendation: holidayAnalysis.recommendation,
      // Score
      score: calculatePeriodScore(period, offPeakCheck, holidayAnalysis),
    };
  });

  // Also add long weekend opportunities that fit within free periods
  const longWeekendOpportunities = longWeekends
    .filter(lw => {
      // Check if this long weekend falls within any free period
      const lwStart = new Date(lw.start);
      const lwEnd = new Date(lw.end);
      return freePeriods.some(fp => {
        const fpStart = new Date(fp.startDate);
        const fpEnd = new Date(fp.endDate);
        return lwStart >= fpStart && lwEnd <= fpEnd;
      });
    })
    .map(lw => ({
      startDate: lw.start,
      endDate: lw.end,
      duration: lw.days,
      source: 'long_weekend',
      isLongWeekend: true,
      holidays: lw.holidays,
      reason: lw.reason,
      recommendation: `Pont de ${lw.reason} - ${lw.days} jours de détente`,
      priceImpact: 'medium',
      score: 80 + lw.days * 5, // Bonus for long weekends
    }));

  // Combine and sort by score
  const allPeriods = [...scoredPeriods, ...longWeekendOpportunities];
  allPeriods.sort((a, b) => b.score - a.score);

  // Remove duplicates (long weekends that overlap with free periods)
  const uniquePeriods = allPeriods.filter((period, index, self) =>
    index === self.findIndex(p =>
      p.startDate === period.startDate && p.endDate === period.endDate
    )
  );

  return uniquePeriods.slice(0, 10); // Return top 10 suggestions
}

/**
 * Calculate score for a travel period
 * Higher score = better opportunity
 */
function calculatePeriodScore(period, offPeakCheck, holidayAnalysis = {}) {
  let score = 0;

  // Longer periods = more flexibility (but cap it)
  score += Math.min(period.duration * 2, 30);

  // Off-peak periods = cheaper
  if (offPeakCheck.isOffPeak) {
    score += 50;
    // More discount = higher score
    score += (1 - (offPeakCheck.discount || 1)) * 100;
  }

  // Long weekends are valuable (less time off work needed)
  if (holidayAnalysis.isLongWeekend) {
    score += 40;
  }

  // Holiday included = good opportunity
  if (holidayAnalysis.includesHoliday) {
    score += 20;
  }

  // Peak season penalty (prices are high)
  if (holidayAnalysis.isPeakSeason) {
    score -= 30;
  }

  // Price impact modifier
  if (holidayAnalysis.priceImpact === 'low') {
    score += 25;
  } else if (holidayAnalysis.priceImpact === 'high') {
    score -= 15;
  }

  return score;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials.access_token;
  } catch (error) {
    console.error('⚠️  Google Calendar token expired or revoked:', error.message);
    // Return null instead of throwing - allows app to continue without calendar integration
    return null;
  }
}
