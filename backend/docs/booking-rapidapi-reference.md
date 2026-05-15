# Booking.com RapidAPI (booking-com15) — Reference for Skusku

Compiled 2026-05-14 from live exploration of <https://rapidapi.com/DataCrawler/api/booking-com15> + hands-on `curl` probing.

This is the **operational reference** for the API Skusku uses. It maps every endpoint to a concrete use case, lists the params each one actually expects (validated by request, not guessed), and flags which endpoints we should be using instead of the one we have today.

## Quick context

- **Provider**: DataCrawler on RapidAPI
- **Base URL**: `https://booking-com15.p.rapidapi.com`
- **Headers required on every call**:
  ```
  x-rapidapi-host: booking-com15.p.rapidapi.com
  x-rapidapi-key:  <RAPIDAPI_KEY>
  ```
- **Plans**: Basic free (50 req/mo, 1 req/sec), Pro $8.99/mo (35 000 req/mo), Ultra $50/mo, Mega $100/mo. Skusku is on **Pro** as of 2026-05-14.
- **Total endpoints**: **51 endpoints** across 6 categories (Meta, Hotels, Flights, Car Rental, Taxi, Attraction).
- **One important quirk**: per-second rate limit on cheaper plans means `Promise.all([...])` bursts get throttled even when the monthly quota is plentiful. Sequence or chunk to ≤2 concurrent requests in production code.

---

## Category map

| Category | # endpoints | Skusku usage today | Skusku usage planned |
|---|---|---|---|
| **Meta** | 7 | none | Currency/Languages/Lat-Long for i18n + map widgets |
| **Hotels** | 18 | `flights/searchDestination` (wrong endpoint) | **All hotel flow** — `searchDestination` → `searchHotels` → `getHotelDetails` |
| **Flights** | 6 | `flights/searchDestination`, `flights/searchFlights` | Same + `getMinPrice` for date flexibility |
| **Car Rental** | 8 | none | Optional add-on for road-trip product |
| **Taxi** | 2 | none | Airport transfer suggestion (post-launch) |
| **Attraction** | 6 | none | **High value** — populate day-by-day itinerary with real bookable activities + reviews |

---

## 1. Meta endpoints (7)

| Endpoint | Path | Required | Optional | Use case |
|---|---|---|---|---|
| Get Languages | `GET /api/v1/meta/getLanguages` | — | — | Confirm supported `languagecode` values for other calls |
| Get Currency | `GET /api/v1/meta/getCurrency` | — | — | List supported `currency_code` |
| Get Exchange Rates | `GET /api/v1/meta/getExchangeRates` | — | — | Display prices in user's local currency without billing in it |
| Location to Lat Long | `GET /api/v1/meta/getLocationToLatLong` | `query` | — | "Lisbon" → 38.7223,-9.1393. Useful for map widgets. |
| Get Location | `GET /api/v1/meta/getLocation` | `query` | — | Generic location resolution |
| Test API | `GET /api/v1/meta/getLocations` | — | — | Sanity ping — returns array of country codes. **Use this for our health-check probe instead of any real query** |

### Notes
- Test API is what we used to verify our key works without consuming flight/hotel quota — keep using it.
- Supported `languagecode` values (regex-validated by the server): `en-gb, en-us, de, nl, fr, es, es-ar, es-mx, ca, it, pt-pt, pt-br, no, fi, sv, da, cs, hu, ro, ja, zh-cn, zh-tw, pl, el, ru, tr, bg, ar, ko, he, lv, uk, hi, id, ms, th, et, hr, lt, sk, sr, sl, vi, tl, is`. **Plain `en` is REJECTED**, must be `en-gb` or `en-us`. ⚠️ This is a real footgun.

---

## 2. Hotels (18 endpoints) — ⭐ critical for Skusku

### 2.a `GET /api/v1/hotels/searchDestination`

Looks up a city/region and returns its **Booking-specific `dest_id`** + counts of available hotels. **This is what we should be using for hotel destination lookup**, not `flights/searchDestination` which gives airport-shaped IDs.

```bash
curl -sS 'https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination?query=Lisbon' \
  -H "x-rapidapi-host: booking-com15.p.rapidapi.com" \
  -H "x-rapidapi-key: $K"
```

**Required**: `query` (city/region name)

**Sample response (truncated)**:
```json
{
  "status": true,
  "data": [
    {
      "dest_id": "-2167973",
      "search_type": "city",
      "country": "Portugal",
      "hotels": 8043,
      "nr_hotels": 8043,
      "name": "Lisbon",
      "city_name": "Lisbon",
      "region": "Lisbon Region",
      "label": "Lisbon, Lisbon Region, Portugal",
      "latitude": 38.713833,
      "longitude": -9.139315,
      "image_url": "https://cf.bstatic.com/xdata/images/city/150x150/999857.jpg"
    }
  ]
}
```

**Skusku migration note**: `dest_id` here is a **negative integer string** (`"-2167973"`), totally different from the `LIS.CITY` flight code. The hotel `searchHotels` call requires this hotel-shaped `dest_id`. We are currently using the flight-shaped ID for hotel searches, which silently degrades hotel match quality.

### 2.b `GET /api/v1/hotels/searchHotels`

Returns a paginated list of hotels with prices, photos, ratings, and `hotel_id` for follow-up detail calls.

**Required**: `dest_id`, `search_type` (one of `city|region|hotel|country`), `arrival_date` (YYYY-MM-DD), `departure_date`

**Recommended optional**:
- `adults` (default 1)
- `room_qty` (default 1)
- `children_age` (comma-separated ages)
- `currency_code` (EUR/USD/GBP/…)
- `languagecode` (`en-gb` etc — see Meta footgun above)
- `sort_by` (Popularity, Price-low, Price-high, ReviewScore-high, Distance, Class-high, Class-low)
- `price_min`, `price_max`
- `categories_filter_ids` (e.g. `class::3,class::4` for 3+ star)

```bash
curl -sS 'https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels?dest_id=-2167973&search_type=city&arrival_date=2026-06-15&departure_date=2026-06-22&adults=1&currency_code=EUR&languagecode=en-gb' \
  -H "x-rapidapi-host: booking-com15.p.rapidapi.com" \
  -H "x-rapidapi-key: $K"
```

**Sample response (essentials)**:
```jsonc
{
  "status": true,
  "data": {
    "hotels": [{
      "hotel_id": 15438568,
      "property": {
        "name": "Large Central Duplex Penthouse",
        "priceBreakdown": {
          "grossPrice": { "currency": "EUR", "value": 3833.49 },
          "strikethroughPrice": { "currency": "EUR", "value": 6871.80 },
          "benefitBadges": [{ "text": "Limited-time Deal" }]
        },
        "reviewScore": 9.5,
        "reviewScoreWord": "Exceptional",
        "reviewCount": 4,
        "propertyClass": 4,      // stars (0 = unclassified)
        "qualityClass": 4,        // Booking's secondary rating
        "accuratePropertyClass": 0,
        "checkinDate": "2026-06-15",
        "checkoutDate": "2026-06-22",
        "checkin":  { "fromTime": "16:00", "untilTime": "00:00" },
        "checkout": { "fromTime": "00:00", "untilTime": "11:00" },
        "latitude": 38.725071,
        "longitude": -9.1444053,
        "photoUrls": ["https://cf.bstatic.com/xdata/images/hotel/square500/…"],
        "isPreferred": true,
        "currency": "EUR"
      }
    }, ...],
    "pagination": { ... }
  }
}
```

### 2.c `GET /api/v1/hotels/searchHotelsByCoordinates`

Same idea as `searchHotels` but accepts `latitude` + `longitude` instead of `dest_id`. Useful when we want "hotels near this specific landmark" rather than "hotels in this city".

### 2.d `GET /api/v1/hotels/getHotelDetails`

Full detail for a specific `hotel_id` — description, address, facilities, policies, rooms with availability, taxes breakdown. Use **only on the user-selected hotel** (it's heavier).

**Required**: `hotel_id`, `arrival_date`, `departure_date`

### 2.e Other hotel endpoints (16 more)

| Endpoint | What it adds |
|---|---|
| `getHotelPhotos` | Bigger photo array, multiple sizes |
| `getHotelFacilities` | Wi-Fi, parking, breakfast, etc. structured |
| `getHotelPolicies` | Cancellation, deposits, check-in age |
| `getHotelReviewScores` | Score breakdown (cleanliness, staff, location…) |
| `getHotelReviews(Tips)` | User review text |
| `getHotelReviewsFilterMetadata` | Filter options for reviews |
| `getHotelReviews(Tips)SortOption` | Sort options for reviews |
| `getRoomList` | Available room types |
| `getRoomListWithAvailability` | Same + live availability + prices per room type |
| `getRoomAvailability` | Specific room avail |
| `getDescriptionAndInfo` | Long-form description |
| `getNearbyCities` | Suggest day-trips |
| `getQuestionAndAnswer` | Q&A from past guests |
| `getFilter` | List of filters available for a destination |
| `getSortBy` | Available sort orders |
| `paymentFeaturesOfTheHotel` | Free-cancellation, no-prepayment etc |
| `propertyChildrenPolicies` | Family-trip friendly |

→ Skusku doesn't need most of these in v1. They'd add value to the **Trip Detail** page (deep hotel info on the chosen card).

---

## 3. Flights (6 endpoints)

### 3.a `GET /api/v1/flights/searchDestination` — what Skusku uses today

Resolves "Paris" → `PAR.CITY` (an airport hub code). **Returns a hybrid of CITY and AIRPORT entries.** Skusku currently picks the first CITY type with diversity fallback.

**Required**: `query`

**Sample response**: see the working call we made — list of `{id, type, name, code, country, countryName, photoUri}` where `type ∈ {CITY, AIRPORT}`.

### 3.b `GET /api/v1/flights/searchFlightLocation`

Alternative location resolver. Looks more curated (returns IATA codes directly). Worth A/B testing against `searchDestination` if we hit the "Albania, Albania" bug again.

### 3.c `GET /api/v1/flights/searchFlights` — flight pricing

Returns aggregated flight options between two locations.

**Required**: `fromId`, `toId`, `departDate`

**Recommended**:
- `returnDate` (for round trip — omit for one-way)
- `adults` (default 1)
- `children` (comma-separated ages: `0,5,17`)
- `cabinClass` (`ECONOMY|PREMIUM_ECONOMY|BUSINESS|FIRST`)
- `currency_code` ⚠️ this is `currency_code` (snake_case), NOT `currencyCode` — we got USD-prices when we tried camelCase
- `sort` (`BEST|CHEAPEST|FASTEST`)

```bash
curl -sS 'https://booking-com15.p.rapidapi.com/api/v1/flights/searchFlights?fromId=PAR.CITY&toId=LIS.CITY&departDate=2026-06-15&returnDate=2026-06-22&adults=1&currency_code=EUR' \
  -H "x-rapidapi-host: booking-com15.p.rapidapi.com" \
  -H "x-rapidapi-key: $K"
```

**Sample response — key shape**:
```jsonc
{
  "status": true,
  "data": {
    "aggregation": {
      "totalCount": 1263,
      "filteredTotalCount": 1263,
      "stops": [
        { "numberOfStops": 0, "count": 253, "minPrice": { "currencyCode": "USD", "units": 216 }, "cheapestAirline": { "name": "Ryanair", "code": "FR", "logo": "..." } },
        { "numberOfStops": 1, "count": 1245, "minPrice": ... }
      ],
      "airlines": [
        { "name": "Transavia France", "iataCode": "TO", "count": 213, "minPrice": ... },
        { "name": "TAP Portugal", "iataCode": "TP", "count": 392, "minPrice": ... }
      ]
    },
    "flightOffers": [ /* the actual list of bookable offers */ ]
  }
}
```

**Skusku migration note**: the **aggregation** structure is GOLD for the Recommendation card — we already display "Direct from €X" / "1 stop from €Y" which maps exactly to `aggregation.stops[i].minPrice`. No need to walk the giant `flightOffers` array unless we want to show specific departure times.

### 3.d `GET /api/v1/flights/getMinPrice` — date flexibility ⭐

Returns the **cheapest price found across nearby dates**. Perfect for Skusku's "flexible dates" UX. Today Skusku makes 3-7 separate `searchFlights` calls to sample dates; this endpoint does it in one call.

**Required**: `fromId`, `toId`, `departDate`

**Recommended**:
- `returnDate` for round-trip min-price grid
- `currency_code`

→ **Adopt this**: replaces 3-7 calls per destination in `destinationService.js` with 1 call. Direct savings of ~6 calls × 8 destinations = ~48 RapidAPI calls per recommendation.

### 3.e `GET /api/v1/flights/getMinPriceMultiStops`

Multi-leg version of getMinPrice (Paris → Rome → Lisbon → Paris). Could power a "city-hopper" product variant later.

### 3.f `GET /api/v1/flights/getFlightDetails`

Detail call on a single offer (full segment list, baggage rules, layover details). Use only when the user commits to a specific flight on the Trip Detail page.

### 3.g `GET /api/v1/flights/getSeatMap`

Seat selection UI. Out of scope for Skusku v1 (we don't do the booking ourselves, we deeplink to Booking.com).

### 3.h `GET /api/v1/flights/searchFlightsMultiStops`

Full multi-city itinerary builder. Out of scope for v1.

---

## 4. Attractions (6 endpoints) — ⭐ high value for itineraries

Currently Skusku generates itinerary activities via Sonnet (free-text, no real bookings). Wiring these endpoints into `itineraryService.js` would replace "Visit the old town" with "Visit Belém Tower — €8, book at https://booking.com/…".

### 4.a `GET /api/v1/attraction/searchLocation`

**Required**: `query` (city or POI name)

Returns matching destinations (e.g. "Lisbon" → list of attraction-hubs in Lisbon).

### 4.b `GET /api/v1/attraction/searchAttractions`

**Required**: `id` (from searchLocation response)

Lists bookable attractions/tours/experiences for that location.

### 4.c `GET /api/v1/attraction/getAttractionDetails`

**Required**: `id` (attraction id)

Full info: description, price, availability, photos, what's included.

### 4.d `GET /api/v1/attraction/getAvailability`

**Required**: `id`, `date`

Bookable time slots on a specific date.

### 4.e `GET /api/v1/attraction/getAvailabilityCalendar`

**Required**: `id`

Returns a calendar of available days (for showing "available on these dates" in UI).

### 4.f `GET /api/v1/attraction/getAttractionReviews`

**Required**: `id`

User reviews — useful for our trip detail page.

→ **Skusku V2 candidate**: after launch, wire `attraction/searchAttractions` into `itineraryService.js` so day-by-day items become real bookable experiences. Expected lift on conversion to Trip Detail.

---

## 5. Car Rental (8 endpoints) — not used today

Endpoints: `searchCarLocation`, `searchCarRentals`, `getPackages`, `vehicleDetails`, `bookingSummary`, `vehicleSupplierDetails`, `vehicleSupplierRatings`, `vehicleSupplierReview`.

→ **Not relevant** until Skusku has a road-trip product (CLAUDE.md mentions `roadtripService.js` exists but is a separate code path). When we revive that, this is the surface to use.

---

## 6. Taxi (2 endpoints) — post-launch nice-to-have

Endpoints: `taxiSearchLocation`, `searchTaxi`.

Use case: airport-to-hotel transfer recommendation on Trip Detail page. Conversion lift if we attach the transfer cost to the budget breakdown.

---

## 🚨 Skusku-specific findings and recommendations

### Bug #1: We're using the flight endpoint for hotel destination lookup
`bookingService.getDestinationId()` always calls `flights/searchDestination`. For hotel queries we should be calling `hotels/searchDestination` instead — different ID shape (`-2167973` vs `LIS.CITY`), different metadata (hotel counts, city UFIs).

**Effort**: 1-2h to introduce a second resolver function, update `searchHotels` to pass the hotel-shape ID.

### Bug #2: We're sampling 3-7 dates instead of using getMinPrice
`destinationService.optimizeDestination()` does `Promise.all` over `dateCandidates` to find the cheapest. **`flights/getMinPrice` does that in a single call.**

**Effort**: half a day. Direct quota savings.

### Bug #3: `currency_code` vs `currencyCode`
Snake_case is the right one. We use snake_case correctly today, but worth a regression test — easy to break in a refactor.

### Bug #4: `languagecode` must be locale-specific
`en` alone errors out. Always send `en-gb` (or whatever matches the user's locale). Skusku currently doesn't send `languagecode` at all → responses may default to whatever Booking decides, which can include translated city names with diacritics that don't match our IATA cache keys.

### Bug #5: Per-second rate limit on the Pro plan
We have 35 000 calls/month but a per-second cap (anecdotally ~5 req/sec). `discoverDestinations` does `Promise.all([8 destinations × 2 flight searches])` = 16 concurrent calls → bursts trigger 429.

**Fix**: chunk to `Promise.all` of 2-3 at a time, or sequential with 200ms inter-call sleep. Already true on the precache script.

---

## 🧪 How to test any endpoint locally

```bash
# Find the endpoint in the sidebar at https://rapidapi.com/DataCrawler/api/booking-com15
# Click it, open the "Shell / cURL" code snippet, copy. The required + optional params are
# pre-populated in the sample URL.

# Or empirically probe an endpoint by hitting it with no params — the error response
# lists the missing required fields:
curl -sS 'https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels' \
  -H 'x-rapidapi-host: booking-com15.p.rapidapi.com' \
  -H "x-rapidapi-key: $RAPIDAPI_KEY"
# → {"status":false,"message":[{"dest_id":"Invalid value"},{"search_type":"Invalid value"},...]}
```

When the test harness (`npm run test:reco`) fails on a profile, the first place to look is the **Pipeline summary** log line emitted by `discoverDestinations` — it tells you which step in the funnel filtered the result to zero, and from there this doc tells you which endpoint to test in isolation.

---

## 📊 What Skusku consumes today vs. could consume

| Per recommendation (8 candidates) | Today | After optimisations |
|---|---|---|
| Origin destination lookup | 1 (flights) | 1 (hotels) ← swap |
| Destination ID lookups | 8 (flights) | 8 (hotels) ← swap |
| Flight searches | 8-16 (multi-date sampling) | 8 × **getMinPrice** = 8 ← big win |
| Hotel search (per chosen) | 1-3 | 1 ← unchanged |
| Attraction calls (V2) | 0 | 2-3 per chosen destination ← new feature |
| **Total** | **~25-30 calls** | **~17-20 calls** |

At 35 000 calls/month (Pro), we go from ~1 400 recos/month to ~1 800 recos/month for the same plan — and the experience is qualitatively better (real hotel IDs, true min-price, optional attractions).

---

## Maintenance

This doc was hand-compiled from a Playwright crawl + targeted curls. To regenerate when the API changes:

1. Open <https://rapidapi.com/DataCrawler/api/booking-com15> in Playwright.
2. Click every category (Hotels / Flights / Car Rental / Taxi / Attraction / Meta) to expand the sidebar.
3. Extract `a[href*="/playground/apiendpoint_"]` to get the new endpoint list.
4. For any endpoint you want params on: navigate to its playground URL, grab the curl sample from the right panel (the URL query string IS the param list).
5. Or empirically: `curl <endpoint-url>` with no params, the response error lists `{ field: "Invalid value" }` for every required field.

Time budget for a full re-audit: ~30 minutes if no major restructuring.
