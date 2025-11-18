# Google Calendar OAuth Integration Setup Guide

## 📋 Overview

This guide explains how to set up Google Calendar OAuth2 integration for the Travel AI MVP application. This allows users to connect their Google Calendar to automatically find optimal travel dates based on their availability.

## 🎯 Features

- **OAuth2 Authentication**: Secure authentication with Google Calendar API
- **Auto Date Detection**: Automatically find free periods in user's calendar
- **Smart Suggestions**: Combine calendar availability with off-peak periods for maximum savings
- **Token Management**: Automatic token refresh when expired
- **User Control**: Users can connect/disconnect their calendar anytime

## 🔧 Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create Project**
3. Name: `Travel AI Calendar Integration`
4. Click **Create**

### 2. Enable Google Calendar API

1. In your project dashboard, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - **User Type**: External
   - **App name**: Travel AI
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
   - **Scopes**: Add `https://www.googleapis.com/auth/calendar.readonly`
   - **Test users**: Add your email for testing
4. Create OAuth client ID:
   - **Application type**: Web application
   - **Name**: Travel AI Backend
   - **Authorized redirect URIs**: Add these URLs:
     ```
     https://travel-app-production-9b66.up.railway.app/api/calendar/oauth/callback
     http://localhost:3001/api/calendar/oauth/callback
     ```
5. Click **Create**
6. **Save** the Client ID and Client Secret

### 4. Add Environment Variables to Railway

1. Go to your Railway project: https://railway.app/project/YOUR_PROJECT_ID
2. Click on your backend service
3. Go to **Variables** tab
4. Add these environment variables:

```bash
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://travel-app-production-9b66.up.railway.app/api/calendar/oauth/callback
FRONTEND_URL=https://travel-app-ten-rho.vercel.app
```

### 5. Add Environment Variables Locally (for development)

Create or update `/Users/arthur/Documents/travel-ai-mvp/backend/.env`:

```bash
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/oauth/callback
FRONTEND_URL=http://localhost:5173
```

### 6. Deploy Changes to Railway

```bash
cd /Users/arthur/Documents/travel-ai-mvp/backend
git add .
git commit -m "feat: Add Google Calendar OAuth integration"
git push
```

Railway will automatically redeploy with the new calendar integration.

### 7. Update Frontend Environment Variable (if needed)

Make sure Vercel has the correct API URL:

```bash
VITE_API_URL=https://travel-app-production-9b66.up.railway.app
```

## 🧪 Testing the Integration

### Test Flow:

1. **Go to Account Page**:
   ```
   https://travel-app-ten-rho.vercel.app/account
   ```

2. **Navigate to "Disponibilités" tab**

3. **Click "Connecter Google Calendar"**

4. **Google OAuth Flow**:
   - Redirected to Google sign-in
   - Select your Google account
   - Review permissions (read-only calendar access)
   - Click "Allow"

5. **Redirected back to Account page**:
   - Should see: "✅ Calendrier Google connecté avec succès!"
   - Status should show: "✅ Calendrier Google connecté"

6. **Test Disconnect**:
   - Click "Déconnecter"
   - Confirm the action
   - Should see: "✅ Calendrier déconnecté avec succès"

### Verify in Railway Logs:

```
📅 Starting Google Calendar OAuth for: user@example.com
✅ Got tokens for user: USER_ID
✅ Calendar connected for user: USER_ID
```

### Verify in Database:

```sql
SELECT
  u.email,
  up.calendarConnected,
  up.calendarType,
  up.calendarTokenExpiry
FROM "User" u
LEFT JOIN "UserPreferences" up ON u.id = up."userId"
WHERE up.calendarConnected = true;
```

## 📊 How It Works

### 1. User Connects Calendar

```javascript
// Frontend: User clicks "Connect Google Calendar"
const response = await fetch('/api/calendar/oauth/authorize', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Backend: Generate OAuth URL with state
const authUrl = getAuthUrl();
const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
window.location.href = `${authUrl}&state=${state}`;
```

### 2. Google OAuth Flow

```
User → Google Sign-In → Review Permissions → Allow
  ↓
Google Callback → /api/calendar/oauth/callback?code=XXX&state=YYY
  ↓
Exchange code for tokens → Save to database
  ↓
Redirect to Account page with success message
```

### 3. Travel Recommendations with Calendar

```javascript
// Backend: Generate recommendations
if (userPreferences.calendarConnected) {
  // Fetch calendar events for next 6 months
  const events = await getCalendarEvents(accessToken, refreshToken, today, sixMonthsFromNow);

  // Find free periods (gaps between events)
  const freePeriods = findFreePeriods(events, tripDuration);

  // Cross-reference with off-peak periods
  const scoredPeriods = freePeriods.map(period => {
    const offPeakCheck = isDateInOffPeakPeriod(period.startDate);
    return {
      ...period,
      isOffPeak: offPeakCheck.isOffPeak,
      priceMultiplier: offPeakCheck.discount || 1.0,
      score: calculatePeriodScore(period, offPeakCheck)
    };
  });

  // Return top 5 suggestions
  return scoredPeriods.sort((a, b) => b.score - a.score).slice(0, 5);
}
```

### 4. API Response

```json
{
  "success": true,
  "recommendations": [...],
  "temporalOptimization": {
    "source": "google_calendar",
    "suggestedDates": [
      {
        "startDate": "2025-03-15",
        "endDate": "2025-03-22",
        "duration": 7,
        "source": "calendar_gap",
        "isOffPeak": true,
        "offPeakReason": "Early spring shoulder",
        "priceMultiplier": 0.85,
        "score": 85
      }
    ],
    "leaveDaysInfo": {
      "total": 25,
      "taken": 10,
      "remaining": 15
    },
    "message": "📅 Nous avons analysé votre calendrier et trouvé 3 périodes idéales pour voyager !"
  }
}
```

## 🔒 Security Considerations

### OAuth Tokens Storage

**Current Implementation** (MVP):
- Tokens stored in plain text in PostgreSQL
- Acceptable for MVP phase

**Production Recommendations**:
- Encrypt tokens before storing (use `crypto` module)
- Use environment variable for encryption key
- Rotate encryption keys regularly

```javascript
// Example encryption
import crypto from 'crypto';

function encrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}
```

### Token Refresh

- Access tokens expire after ~1 hour
- Refresh tokens are long-lived
- Auto-refresh implemented in `googleCalendarService.js`

## 🐛 Troubleshooting

### Error: "Missing Google OAuth credentials"

**Cause**: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in Railway

**Fix**:
1. Go to Railway → Variables
2. Add the missing environment variables
3. Redeploy

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in Google Cloud Console doesn't match the one being used

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Add exact redirect URI:
   ```
   https://travel-app-production-9b66.up.railway.app/api/calendar/oauth/callback
   ```

### Error: "access_denied"

**Cause**: User denied permission or app not verified

**Fix**:
1. If testing: Make sure user email is added to "Test users" in OAuth consent screen
2. For production: Submit app for verification (not needed for MVP)

### Calendar Not Connecting

**Check Railway logs**:
```bash
railway logs
```

Look for:
- `📅 Starting Google Calendar OAuth for: user@example.com`
- `✅ Got tokens for user: USER_ID`
- `✅ Calendar connected for user: USER_ID`

**Check database**:
```sql
SELECT
  u.email,
  up.calendarConnected,
  up.calendarAccessToken IS NOT NULL as hasAccessToken,
  up.calendarRefreshToken IS NOT NULL as hasRefreshToken
FROM "User" u
LEFT JOIN "UserPreferences" up ON u.id = up."userId"
WHERE u.email = 'user@example.com';
```

## 📈 Next Steps

### Future Enhancements:

1. **Outlook/Microsoft Calendar Integration**:
   - Similar OAuth2 flow
   - Use Microsoft Graph API

2. **Multiple Calendar Support**:
   - Allow connecting multiple calendars (work + personal)
   - Combine availability from all sources

3. **Calendar Event Creation**:
   - After booking, create calendar event automatically
   - Include flight details, hotel info, itinerary

4. **Smart Notifications**:
   - Email user when optimal travel period is detected
   - Alert when prices drop for suggested dates

5. **Calendar Sync**:
   - Two-way sync
   - Update calendar when trip is modified

## 🔗 API Endpoints Reference

### GET /api/calendar/oauth/authorize
**Purpose**: Start OAuth flow
**Auth**: Required (Clerk token)
**Response**:
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### GET /api/calendar/oauth/callback
**Purpose**: Handle OAuth callback from Google
**Auth**: Public (called by Google)
**Query params**: `code`, `state`, `error`
**Response**: Redirect to frontend with success/error

### GET /api/calendar/status
**Purpose**: Check if calendar is connected
**Auth**: Required (Clerk token)
**Response**:
```json
{
  "success": true,
  "connected": true,
  "type": "google",
  "needsRefresh": false
}
```

### POST /api/calendar/disconnect
**Purpose**: Disconnect calendar
**Auth**: Required (Clerk token)
**Response**:
```json
{
  "success": true,
  "message": "Calendar disconnected successfully"
}
```

### GET /api/calendar/suggestions
**Purpose**: Get calendar-based travel date suggestions
**Auth**: Required (Clerk token)
**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "startDate": "2025-03-15",
      "endDate": "2025-03-22",
      "duration": 7,
      "source": "calendar_gap",
      "isOffPeak": true,
      "score": 85
    }
  ],
  "message": "Found 3 optimal travel periods in your calendar"
}
```

## ✅ Checklist

Before deploying to production:

- [ ] Google Cloud project created
- [ ] Google Calendar API enabled
- [ ] OAuth 2.0 credentials created
- [ ] Redirect URIs added to Google Cloud Console
- [ ] Environment variables added to Railway
- [ ] Backend deployed with calendar routes
- [ ] Frontend updated with calendar UI
- [ ] Test OAuth flow (connect/disconnect)
- [ ] Verify calendar suggestions in recommendations
- [ ] Test token refresh mechanism
- [ ] Check error handling
- [ ] Review security (token encryption for production)
- [ ] Add monitoring/logging
- [ ] Document user-facing features

## 📚 Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)

---

**Questions or Issues?** Check Railway logs or contact the development team.
