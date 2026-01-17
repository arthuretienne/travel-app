// backend/src/routes/calendar.js
import express from 'express';
import prisma from '../db/prisma.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  getAuthUrl,
  getTokensFromCode,
  suggestTravelDatesFromCalendar,
  refreshAccessToken,
} from '../services/googleCalendarService.js';

const router = express.Router();

/**
 * GET /api/calendar/oauth/authorize
 * Start OAuth flow - redirect user to Google consent screen
 * Protected route
 */
router.get('/oauth/authorize', authenticateUser, async (req, res) => {
  try {
    const authUrl = getAuthUrl();

    // Store user ID in session/state to retrieve later
    // For now, we'll use a simple approach with URL state parameter
    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');
    const authUrlWithState = `${authUrl}&state=${state}`;

    console.log('📅 Starting Google Calendar OAuth for:', req.user.email);
    res.json({
      success: true,
      authUrl: authUrlWithState,
      message: 'Redirect user to this URL to authorize calendar access',
    });
  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL',
      message: error.message,
    });
  }
});

/**
 * GET /api/calendar/oauth/callback
 * OAuth callback endpoint - Google redirects here after user grants access
 * Public endpoint (called by Google)
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/account?calendar_error=${error}`);
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code',
      });
    }

    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    console.log('✅ Got tokens for user:', userId);

    // Save tokens to database
    await prisma.userPreferences.update({
      where: { userId },
      data: {
        calendarConnected: true,
        calendarType: 'google',
        // Store tokens securely (in production, encrypt these)
        calendarAccessToken: tokens.access_token,
        calendarRefreshToken: tokens.refresh_token,
        calendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    console.log('✅ Calendar connected for user:', userId);

    // Redirect back to account page with success message
    res.redirect(`${process.env.FRONTEND_URL}/account?calendar_success=true`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/account?calendar_error=callback_failed`);
  }
});

/**
 * GET /api/calendar/status
 * Check if user has calendar connected
 * Protected route
 */
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
      select: {
        calendarConnected: true,
        calendarType: true,
        calendarTokenExpiry: true,
      },
    });

    if (!preferences) {
      return res.json({
        success: true,
        connected: false,
      });
    }

    // Check if token is expired
    const isExpired = preferences.calendarTokenExpiry
      ? new Date(preferences.calendarTokenExpiry) < new Date()
      : false;

    res.json({
      success: true,
      connected: preferences.calendarConnected && !isExpired,
      type: preferences.calendarType,
      needsRefresh: isExpired,
    });
  } catch (error) {
    console.error('Calendar status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check calendar status',
      message: error.message,
    });
  }
});

/**
 * POST /api/calendar/disconnect
 * Disconnect calendar from account
 * Protected route
 */
router.post('/disconnect', authenticateUser, async (req, res) => {
  try {
    await prisma.userPreferences.update({
      where: { userId: req.user.id },
      data: {
        calendarConnected: false,
        calendarType: null,
        calendarAccessToken: null,
        calendarRefreshToken: null,
        calendarTokenExpiry: null,
      },
    });

    console.log('✅ Calendar disconnected for user:', req.user.email);

    res.json({
      success: true,
      message: 'Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('Calendar disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect calendar',
      message: error.message,
    });
  }
});

/**
 * GET /api/calendar/suggestions
 * Get travel date suggestions based on connected calendar
 * Protected route
 */
router.get('/suggestions', authenticateUser, async (req, res) => {
  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
      select: {
        calendarConnected: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        calendarTokenExpiry: true,
        avgTripDuration: true,
      },
    });

    if (!preferences || !preferences.calendarConnected) {
      return res.status(400).json({
        success: false,
        error: 'Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    let accessToken = preferences.calendarAccessToken;

    // Refresh token if expired
    if (preferences.calendarTokenExpiry && new Date(preferences.calendarTokenExpiry) < new Date()) {
      console.log('🔄 Refreshing expired access token...');
      accessToken = await refreshAccessToken(preferences.calendarRefreshToken);

      // If token refresh failed (expired/revoked), return error to prompt re-authorization
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Google Calendar authorization expired. Please reconnect your calendar.',
          needsReauth: true
        });
      }

      // Update token in database
      await prisma.userPreferences.update({
        where: { userId: req.user.id },
        data: {
          calendarAccessToken: accessToken,
          calendarTokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        },
      });
    }

    // Check if we have a valid access token
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'No calendar authorization found. Please connect your calendar first.',
        needsReauth: true
      });
    }

    // Get suggestions
    const tripDuration = preferences.avgTripDuration || 7;
    const suggestions = await suggestTravelDatesFromCalendar(
      accessToken,
      preferences.calendarRefreshToken,
      tripDuration
    );

    console.log(`✅ Generated ${suggestions.length} calendar-based suggestions for:`, req.user.email);

    res.json({
      success: true,
      suggestions,
      message: `Found ${suggestions.length} optimal travel periods in your calendar`,
    });
  } catch (error) {
    console.error('Calendar suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate calendar suggestions',
      message: error.message,
    });
  }
});

/**
 * GET /api/calendar/holidays
 * Get French holidays and long weekends for next 6 months
 * Public endpoint (no calendar connection required)
 */
router.get('/holidays', async (req, res) => {
  try {
    const { getHolidaysInRange, getFrenchSchoolVacations } = await import('../utils/holidays.js');

    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const { holidays, vacations, longWeekends } = getHolidaysInRange(today, sixMonthsFromNow);

    res.json({
      success: true,
      data: {
        holidays,
        vacations,
        longWeekends,
        period: {
          start: today.toISOString().split('T')[0],
          end: sixMonthsFromNow.toISOString().split('T')[0],
        },
      },
      message: `Found ${holidays.length} holidays and ${longWeekends.length} long weekend opportunities`,
    });
  } catch (error) {
    console.error('Holidays fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch holidays',
      message: error.message,
    });
  }
});

/**
 * GET /api/calendar/smart-dates
 * Get smart travel date suggestions (without calendar - uses holidays only)
 * Useful for suggesting trips around long weekends and off-peak periods
 */
router.get('/smart-dates', async (req, res) => {
  try {
    const { getHolidaysInRange, analyzePeriodForTravel } = await import('../utils/holidays.js');
    const { isDateInOffPeakPeriod } = await import('../utils/temporalOptimization.js');

    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const { holidays, vacations, longWeekends } = getHolidaysInRange(today, sixMonthsFromNow);

    // Build smart suggestions combining long weekends and off-peak periods
    const suggestions = [];

    // Add long weekend opportunities
    for (const lw of longWeekends) {
      const offPeakCheck = isDateInOffPeakPeriod(lw.start);
      suggestions.push({
        type: 'long_weekend',
        startDate: lw.start,
        endDate: lw.end,
        duration: lw.days,
        reason: lw.reason,
        holidays: lw.holidays,
        isOffPeak: offPeakCheck.isOffPeak,
        priceImpact: 'medium',
        recommendation: `Pont de ${lw.reason} - idéal pour un week-end prolongé de ${lw.days} jours`,
        score: 80 + lw.days * 5 + (offPeakCheck.isOffPeak ? 20 : 0),
      });
    }

    // Add off-peak month suggestions
    const offPeakMonths = [
      { month: 1, name: 'Janvier', weeks: 2 },
      { month: 2, name: 'Février (hors vacances)', weeks: 1 },
      { month: 3, name: 'Mars', weeks: 2 },
      { month: 9, name: 'Septembre', weeks: 3 },
      { month: 10, name: 'Octobre (hors Toussaint)', weeks: 2 },
      { month: 11, name: 'Novembre', weeks: 3 },
    ];

    const currentMonth = today.getMonth() + 1;

    for (const period of offPeakMonths) {
      // Only suggest future months
      const year = period.month < currentMonth ? today.getFullYear() + 1 : today.getFullYear();
      const startDate = new Date(year, period.month - 1, 10); // Mid-month start
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      // Only add if within our 6-month window
      if (startDate <= sixMonthsFromNow) {
        suggestions.push({
          type: 'off_peak',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          duration: 7,
          reason: `Basse saison - ${period.name}`,
          isOffPeak: true,
          priceImpact: 'low',
          recommendation: `${period.name} - meilleurs tarifs, moins de touristes`,
          score: 70,
        });
      }
    }

    // Sort by score
    suggestions.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 15),
      summary: {
        totalHolidays: holidays.length,
        longWeekends: longWeekends.length,
        offPeakPeriods: offPeakMonths.length,
      },
      message: 'Smart travel date suggestions based on holidays and seasonal pricing',
    });
  } catch (error) {
    console.error('Smart dates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate smart date suggestions',
      message: error.message,
    });
  }
});

/**
 * POST /api/calendar/analyze-period
 * Analyze a specific date range for travel
 */
router.post('/analyze-period', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const { analyzePeriodForTravel } = await import('../utils/holidays.js');
    const { isDateInOffPeakPeriod } = await import('../utils/temporalOptimization.js');

    const analysis = analyzePeriodForTravel(startDate, endDate);
    const offPeakCheck = isDateInOffPeakPeriod(startDate);

    res.json({
      success: true,
      analysis: {
        ...analysis,
        isOffPeak: offPeakCheck.isOffPeak,
        offPeakReason: offPeakCheck.reason,
        estimatedPriceMultiplier: offPeakCheck.discount || (analysis.isPeakSeason ? 1.3 : 1.0),
      },
    });
  } catch (error) {
    console.error('Period analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze period',
      message: error.message,
    });
  }
});

export default router;
