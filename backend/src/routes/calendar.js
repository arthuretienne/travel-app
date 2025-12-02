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

export default router;
