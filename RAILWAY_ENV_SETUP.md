# Railway Environment Variables Setup

## Required Environment Variables for Railway Deployment

Add these to your Railway dashboard → Project → Variables:

```bash
# Weather API (for weather forecasts and packing tips)
WEATHER_API_KEY=a4150b49fa4341d5b53203156252511

# Pexels API (for high-quality destination photos)
PEXELS_API_KEY=N6ylet4FEwtQ6cPsult2s6hU8IJuX9sbgl7nbxMdWLsbXSyzX25qXCJh
```

## How to Add Variables in Railway

1. Go to Railway dashboard: https://railway.app
2. Select your project
3. Click on your service (backend)
4. Go to "Variables" tab
5. Click "+ New Variable"
6. Add each variable:
   - Name: `WEATHER_API_KEY`
   - Value: `a4150b49fa4341d5b53203156252511`
7. Repeat for PEXELS_API_KEY
8. Railway will automatically redeploy with new environment variables

## API Services Used

### WeatherAPI.com
- **Purpose:** 7-day weather forecasts + current conditions
- **Features:**
  - Temperature, humidity, wind
  - Rain/snow probability
  - UV index
  - Smart packing recommendations
- **Limits:** 1,000,000 calls/month (free tier)
- **Docs:** https://www.weatherapi.com/docs/

### Pexels
- **Purpose:** High-quality destination photos
- **Features:**
  - Better quality than Unsplash
  - Higher API rate limits
  - Curated travel photography
  - Multiple sizes (large2x, large, medium, small, tiny)
- **Limits:** 200 requests/hour, 20,000 requests/month (free tier)
- **Docs:** https://www.pexels.com/api/documentation/

## Photo Priority System

The app uses a smart fallback system:

1. **Primary:** Pexels API (best quality, highest limits)
2. **Fallback:** Unsplash API (if Pexels fails)
3. **Final Fallback:** Curated static URLs (60+ cities)

This ensures photos always load, even if APIs are down.

## Testing Locally

For local development, add to `backend/.env`:

```bash
WEATHER_API_KEY=a4150b49fa4341d5b53203156252511
PEXELS_API_KEY=N6ylet4FEwtQ6cPsult2s6hU8IJuX9sbgl7nbxMdWLsbXSyzX25qXCJh
```

## Verification

After adding variables, check Railway logs for:

```
✅ Using Pexels as primary photo source (better quality & higher limits)
✅ Pexels client initialized successfully
```

## Features Enabled

With these API keys, users get:

✅ Real-time weather forecasts (7 days)
✅ Smart packing recommendations
✅ Beautiful high-quality destination photos
✅ Weather-based travel tips
✅ UV warnings and rain alerts
✅ Temperature ranges for packing

## Cost: $0/month

Both APIs are free tier with generous limits:
- WeatherAPI: 1M calls/month
- Pexels: 20K requests/month

For a travel app, these limits are more than sufficient.
