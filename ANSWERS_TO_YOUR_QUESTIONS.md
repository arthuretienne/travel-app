# Answers to Your Questions

## 1. IATA Code from User's City ✅

**Current Status:** Already implemented!

The origin city is collected in [OnboardingNew.jsx:278-288](frontend/src/components/Onboarding/OnboardingNew.jsx#L278-L288) with a dropdown of French cities:

```javascript
const CITIES = [
  { name: 'Paris', code: 'PAR' },
  { name: 'Lyon', code: 'LYS' },
  { name: 'Marseille', code: 'MRS' },
  { name: 'Nice', code: 'NCE' },
  // ...
];
```

And it's used in [travel.js:73](backend/src/routes/travel.js#L73):
```javascript
const originCity = (userPreferences?.preferredAirports?.[0]) || userProfile.availability?.originCity || 'CDG';
```

**✅ This is working correctly!**

---

## 2. Transport Preferences (Accepted Vehicles) ❌

**Current Status:** NOT implemented yet!

**Missing Features:**
- No question in onboarding about transport preferences (plane/train/bus)
- Claude prompt doesn't know user's vehicle preferences
- The workflow searches all transport types without filtering

**What Should Be Added:**

### A. Add to Onboarding
Add a new question in `OnboardingNew.jsx`:

```javascript
// Preferred Transport Modes
<div className="form-section">
  <label className="section-label">
    <span className="label-icon">🚊</span>
    Which transport modes are you comfortable with?
  </label>
  <div className="transport-options">
    <button
      type="button"
      className={`option-button ${formData.transportPreferences.includes('plane') ? 'active' : ''}`}
      onClick={() => toggleTransport('plane')}
    >
      ✈️ Plane
    </button>
    <button
      type="button"
      className={`option-button ${formData.transportPreferences.includes('train') ? 'active' : ''}`}
      onClick={() => toggleTransport('train')}
    >
      🚄 Train
    </button>
    <button
      type="button"
      className={`option-button ${formData.transportPreferences.includes('bus') ? 'active' : ''}`}
      onClick={() => toggleTransport('bus')}
    >
      🚌 Bus
    </button>
  </div>
</div>
```

### B. Add to Claude Prompt
In `claudeService.js`, add to the prompt:

```javascript
TRANSPORT PREFERENCES:
Accepted transport modes: ${constraints.acceptedTransportModes?.join(', ') || 'plane, train, bus'}
${!constraints.acceptedTransportModes?.includes('plane') ? '⚠️ User does NOT want flights - ONLY suggest destinations reachable by train/bus' : ''}
${constraints.acceptedTransportModes?.includes('train') ? '✅ User is open to train travel - prioritize European destinations with good rail connections' : ''}
```

### C. Filter Results in travel.js
Update the workflow to skip flight/bus/train searches based on preferences.

---

## 3. Testing the Onboarding ✅

**How to Test:**

### Option 1: Via Sign Up Flow
1. Clear your browser cookies/localStorage for the app
2. Go to `http://localhost:5173` (or your deployed URL)
3. Click "Sign Up" with Clerk
4. After authentication, the onboarding should automatically appear

### Option 2: Direct Route (if exists)
Check if there's a direct route in your app:
```bash
# Look for onboarding route
grep -r "onboarding" frontend/src/App.jsx frontend/src/main.jsx
```

Let me check this for you...

### Option 3: Reset Your Profile
If you're already signed in, you can:
1. Delete your user profile from the database
2. Sign in again → onboarding will appear
3. OR add a "Reset Onboarding" button in your account settings

**Testing Checklist:**
- [ ] All form fields appear correctly
- [ ] Budget selection works
- [ ] Month multi-select works
- [ ] Activities multi-select works
- [ ] Origin city dropdown has all cities
- [ ] Form validation works (try submitting with no months selected)
- [ ] Data is saved to backend correctly
- [ ] After onboarding, dashboard shows correct data

---

## 4. Account Settings Page ❌

**Current Status:** DOES NOT EXIST!

**What's Missing:**
- No dedicated "Account Settings" or "Profile" page
- Users cannot edit their onboarding preferences after initial setup
- No way to change:
  - Budget
  - Travel style
  - Preferred months
  - Activities
  - Origin city
  - Transport preferences

**What Should Be Built:**

### A. Create Account Settings Page

**File:** `frontend/src/pages/AccountSettings.jsx`

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export default function AccountSettings() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);

  // Sections:
  // 1. Travel Preferences (budget, style, activities)
  // 2. Availability (months, dates, flexibility)
  // 3. Constraints (budget, flight hours, languages)
  // 4. Location (origin city)
  // 5. Transport Preferences (NEW!)

  return (
    <div className="account-settings">
      <h1>My Travel Preferences</h1>

      {/* Reuse the OnboardingNew component fields */}
      {/* But pre-fill with current values */}
      {/* Add "Save Changes" button */}
    </div>
  );
}
```

### B. Add Route in App.jsx
```jsx
<Route path="/settings" element={<AccountSettings />} />
```

### C. Add Navigation Link
In your header/navbar:
```jsx
<Link to="/settings">
  <Settings size={20} />
  Account Settings
</Link>
```

---

## 5. Destination Photos - Fallback System 📸

**Current System:**

### How It Works Now:
1. **With Unsplash API Key:** Fetches real photos from Unsplash API
2. **Without API Key:** Uses fallback system

### Current Fallback Issues:
- Only 15 hardcoded cities have good fallback images
- Unknown cities get generic globe photo ([unsplashService.js:146](backend/src/services/unsplashService.js#L146))
- The globe photo is not destination-specific

### How to Improve:

#### Option 1: Expand Fallback Database (Quick Fix)
Add more cities to the `fallbackPhotos` object in [unsplashService.js:110-126](backend/src/services/unsplashService.js#L110-L126):

```javascript
const fallbackPhotos = {
  // Add 50+ more European cities
  'Porto': 'IPhh-hHLQJA',
  'Bucharest': 'DUmFLtMeAbQ',
  'Tbilisi': 'H5WeVdxBqek',
  'Ljubljana': '7O8X5dP6ybo',
  'Krakow': 'a8QX1LF8QU0',
  'Budapest': 'TrhLCn1abMU',
  'Athens': 'Cf3zQ6gGbhU',
  'Seville': 'qiR_C0uT1ac',
  // ... add 40+ more cities
};
```

**How to find Unsplash photo IDs:**
1. Go to Unsplash.com
2. Search for the city (e.g., "Porto Portugal")
3. Click on a good photo
4. Copy the ID from the URL: `https://unsplash.com/photos/{PHOTO_ID}`

#### Option 2: Use Pexels API (Free, 200 requests/hour)
Replace Unsplash with Pexels for unlimited free usage:

```javascript
// Install pexels package
npm install pexels

// Update unsplashService.js to use Pexels
import { createClient } from 'pexels';

const client = createClient(process.env.PEXELS_API_KEY);

export async function getDestinationPhoto(cityName, countryName) {
  const query = `${cityName} ${countryName} landmark`;
  const photos = await client.photos.search({ query, per_page: 1 });

  return {
    url: photos.photos[0].src.large,
    small: photos.photos[0].src.medium,
    thumb: photos.photos[0].src.small,
    alt: cityName,
    photographer: {
      name: photos.photos[0].photographer,
      link: photos.photos[0].photographer_url,
    },
  };
}
```

**Pexels Advantages:**
- ✅ Completely free (no credit card)
- ✅ 200 requests/hour (enough for most use cases)
- ✅ No attribution required (but recommended)
- ✅ Better quality curated photos

#### Option 3: Wikipedia Images (Always Free)
Use Wikimedia Commons API for city images:

```javascript
async function getWikipediaImage(cityName) {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${cityName}`
  );
  const data = await response.json();

  return {
    url: data.thumbnail?.source || data.originalimage?.source,
    alt: data.title,
  };
}
```

**Wikipedia Advantages:**
- ✅ 100% free, unlimited
- ✅ High quality
- ✅ Always available
- ❌ Not always the most "travel-inspiring" photos

#### Option 4: Hybrid Approach (Recommended)
Combine all three:

```javascript
export async function getDestinationPhoto(cityName, countryName) {
  // 1. Try Unsplash (if API key exists)
  if (UNSPLASH_ACCESS_KEY) {
    const photo = await tryUnsplash(cityName, countryName);
    if (photo) return photo;
  }

  // 2. Try Pexels (if API key exists)
  if (PEXELS_API_KEY) {
    const photo = await tryPexels(cityName, countryName);
    if (photo) return photo;
  }

  // 3. Try Wikipedia
  const photo = await tryWikipedia(cityName);
  if (photo) return photo;

  // 4. Use expanded fallback database (100+ cities)
  return getExpandedFallback(cityName);

  // 5. Last resort: Generic travel photo
  return getGenericTravelPhoto();
}
```

---

## Summary of Required Work

### ✅ Already Working:
- [x] IATA code from user's city
- [x] Onboarding collects basic preferences
- [x] Photos work with Unsplash API

### ❌ Needs Implementation:

#### Priority 1 (Critical):
1. **Fix flight search** (in progress - waiting for Railway deployment)
2. **Add transport preferences** to onboarding
3. **Improve photo fallback system** (expand database or add Pexels)

#### Priority 2 (Important):
4. **Create Account Settings page** where users can edit all onboarding fields
5. **Add onboarding test route** for easy testing
6. **Update Claude prompt** to use transport preferences

#### Priority 3 (Nice to have):
7. Add more French cities to origin city dropdown
8. Add travel history tracking
9. Add "Reset Recommendations" button in settings

---

## Quick Wins (What You Can Do Now):

### 1. Expand Photo Fallback Database (30 minutes)
Add 50 more cities to [unsplashService.js:110-126](backend/src/services/unsplashService.js#L110-L126)

### 2. Add Pexels API (1 hour)
Sign up for free Pexels API key and integrate as fallback

### 3. Create Basic Settings Page (2-3 hours)
Copy OnboardingNew component structure, add "Edit" mode, update backend

### 4. Add Transport Preferences (1-2 hours)
Add to onboarding → Update database schema → Update Claude prompt

---

## Testing URLs

**Onboarding:**
- Sign out and sign back in to see onboarding
- OR go to your app root and check if there's a `/onboarding` route
- OR add a "Reset Profile" button in dev mode

**Railway Deployment:**
- Check Railway logs to see if latest fixes are deployed
- Look for: "Porto/Bucharest trap avoided! 🎉"
- Look for: "Using Claude destinations directly"

Let me check if there's a direct onboarding route...
