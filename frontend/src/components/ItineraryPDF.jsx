// frontend/src/components/ItineraryPDF.jsx
// PDF export for trip itineraries using @react-pdf/renderer
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a clean sans-serif font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ],
});

const TEAL = '#0d9488';
const TEAL_LIGHT = '#ccfbf1';
const GRAY = '#6b7280';
const DARK = '#1f2937';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  // Cover page
  coverPage: {
    fontFamily: 'Inter',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  coverBadge: {
    backgroundColor: TEAL,
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 30,
  },
  coverCity: {
    fontSize: 42,
    fontWeight: 700,
    color: DARK,
    textAlign: 'center',
    marginBottom: 6,
  },
  coverCountry: {
    fontSize: 18,
    color: GRAY,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverDates: {
    fontSize: 14,
    color: DARK,
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 8,
  },
  coverTraveler: {
    fontSize: 12,
    color: GRAY,
    textAlign: 'center',
    marginBottom: 50,
  },
  coverStats: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 60,
  },
  coverStat: {
    alignItems: 'center',
  },
  coverStatValue: {
    fontSize: 22,
    fontWeight: 700,
    color: TEAL,
  },
  coverStatLabel: {
    fontSize: 9,
    color: GRAY,
    marginTop: 2,
  },
  coverFooter: {
    fontSize: 9,
    color: GRAY,
    textAlign: 'center',
  },

  // Section headers
  sectionHeader: {
    backgroundColor: TEAL,
    color: 'white',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 14,
    marginTop: 6,
  },

  // Flight/Hotel info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 9,
    color: GRAY,
    fontWeight: 600,
    textTransform: 'uppercase',
    width: 90,
  },
  infoValue: {
    fontSize: 10,
    color: DARK,
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoCardHeader: {
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoCardTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: TEAL,
  },

  // Day sections
  dayHeader: {
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 10,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: TEAL,
  },
  dayDate: {
    fontSize: 9,
    color: GRAY,
  },
  dayTheme: {
    fontSize: 10,
    color: GRAY,
    fontWeight: 600,
    marginTop: 2,
  },

  // Activity rows
  activity: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityTime: {
    width: 65,
    paddingRight: 8,
  },
  activityTimeText: {
    fontSize: 9,
    fontWeight: 700,
    color: TEAL,
  },
  activityDuration: {
    fontSize: 8,
    color: GRAY,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 10,
    fontWeight: 600,
    color: DARK,
    marginBottom: 2,
  },
  activityLocation: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 2,
  },
  activityTips: {
    fontSize: 8,
    color: TEAL,
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 3,
    marginBottom: 2,
  },
  activityTransport: {
    fontSize: 8,
    color: GRAY,
    fontStyle: 'italic',
    marginTop: 2,
  },
  activityMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 3,
  },
  activityCost: {
    fontSize: 9,
    fontWeight: 600,
    color: DARK,
  },
  activityType: {
    fontSize: 8,
    color: GRAY,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },

  // Day summary
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginTop: 8,
  },
  daySummaryText: {
    fontSize: 9,
    color: GRAY,
  },
  daySummaryBold: {
    fontWeight: 700,
    color: DARK,
  },

  // Packing list
  packingCategory: {
    marginBottom: 10,
  },
  packingCategoryTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: DARK,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  packingItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  packingItem: {
    fontSize: 9,
    color: GRAY,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },

  // Footer
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: GRAY,
  },
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function PageFooter({ city }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>Skusku.life — Your AI Travel Planner</Text>
      <Text render={({ pageNumber, totalPages }) => `${city} — Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// Cover page
function CoverPage({ trip, itinerary, userName }) {
  const city = trip.city || 'Destination';
  const country = trip.country || '';
  const numDays = itinerary?.length || 0;
  const totalBudget = itinerary?.reduce((sum, d) => sum + (d.totalCost || 0), 0) || 0;
  const totalActivities = itinerary?.reduce((sum, d) => sum + (d.schedule?.length || 0), 0) || 0;

  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverBadge}>
        <Text>SKUSKU TRAVEL PLAN</Text>
      </View>
      <Text style={styles.coverCity}>{city}</Text>
      <Text style={styles.coverCountry}>{country}</Text>
      <Text style={styles.coverDates}>
        {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
      </Text>
      {userName && (
        <Text style={styles.coverTraveler}>Planned for {userName}</Text>
      )}
      <View style={styles.coverStats}>
        <View style={styles.coverStat}>
          <Text style={styles.coverStatValue}>{numDays}</Text>
          <Text style={styles.coverStatLabel}>DAYS</Text>
        </View>
        <View style={styles.coverStat}>
          <Text style={styles.coverStatValue}>{totalActivities}</Text>
          <Text style={styles.coverStatLabel}>ACTIVITIES</Text>
        </View>
        <View style={styles.coverStat}>
          <Text style={styles.coverStatValue}>~{totalBudget}</Text>
          <Text style={styles.coverStatLabel}>BUDGET</Text>
        </View>
      </View>
      <Text style={styles.coverFooter}>Generated by Skusku — AI-powered travel planning</Text>
      <Text style={styles.coverFooter}>skusku.life</Text>
    </Page>
  );
}

// Flight & Hotel summary page
function TravelDetailsPage({ trip, city }) {
  const flightDetails = trip.tripData?.flightDetails || trip.finalDestination?.flightDetails;
  const hotels = trip.tripData?.hotelOptions?.hotels || trip.finalDestination?.hotelOptions?.hotels;
  const pricing = trip.tripData?.pricing || trip.finalDestination?.pricing;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Travel Details</Text>

      {/* Flights */}
      {flightDetails && (
        <>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardTitle}>Outbound Flight</Text>
            </View>
            {flightDetails.outbound?.carrier && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Airline</Text>
                <Text style={styles.infoValue}>{flightDetails.outbound.carrier}</Text>
              </View>
            )}
            {flightDetails.outbound?.origin && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Route</Text>
                <Text style={styles.infoValue}>{flightDetails.outbound.origin} → {flightDetails.outbound.destination}</Text>
              </View>
            )}
            {flightDetails.outbound?.departureTime && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Departure</Text>
                <Text style={styles.infoValue}>{flightDetails.outbound.departureTime}</Text>
              </View>
            )}
            {flightDetails.outbound?.arrivalTime && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Arrival</Text>
                <Text style={styles.infoValue}>{flightDetails.outbound.arrivalTime}</Text>
              </View>
            )}
            {flightDetails.outbound?.duration && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{flightDetails.outbound.duration}</Text>
              </View>
            )}
          </View>

          {flightDetails.return && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Text style={styles.infoCardTitle}>Return Flight</Text>
              </View>
              {flightDetails.return.carrier && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Airline</Text>
                  <Text style={styles.infoValue}>{flightDetails.return.carrier}</Text>
                </View>
              )}
              {flightDetails.return.origin && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Route</Text>
                  <Text style={styles.infoValue}>{flightDetails.return.origin} → {flightDetails.return.destination}</Text>
                </View>
              )}
              {flightDetails.return.departureTime && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Departure</Text>
                  <Text style={styles.infoValue}>{flightDetails.return.departureTime}</Text>
                </View>
              )}
              {flightDetails.return.duration && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>{flightDetails.return.duration}</Text>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Hotels */}
      {hotels && hotels.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Accommodation</Text>
          {hotels.slice(0, 3).map((hotel, idx) => (
            <View key={idx} style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Text style={styles.infoCardTitle}>{hotel.name || `Hotel Option ${idx + 1}`}</Text>
              </View>
              {hotel.neighborhood && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Area</Text>
                  <Text style={styles.infoValue}>{hotel.neighborhood}</Text>
                </View>
              )}
              {hotel.price && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Price</Text>
                  <Text style={styles.infoValue}>{hotel.price}</Text>
                </View>
              )}
              {hotel.rating && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rating</Text>
                  <Text style={styles.infoValue}>{hotel.rating}/10</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}

      {/* Budget Summary */}
      {pricing && (
        <>
          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Budget Summary</Text>
          <View style={styles.infoCard}>
            {pricing.flight && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Flights</Text>
                <Text style={styles.infoValue}>{pricing.flight}</Text>
              </View>
            )}
            {pricing.hotel && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hotel</Text>
                <Text style={styles.infoValue}>{pricing.hotel}</Text>
              </View>
            )}
            {pricing.total && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { fontWeight: 700, color: DARK }]}>TOTAL</Text>
                <Text style={[styles.infoValue, { fontWeight: 700, color: TEAL }]}>{pricing.total}</Text>
              </View>
            )}
          </View>
        </>
      )}

      <PageFooter city={city} />
    </Page>
  );
}

// Day itinerary pages
function DayPage({ day, dayIndex, totalDays, flightDetails, city }) {
  const isFirstDay = dayIndex === 0;
  const isLastDay = dayIndex === totalDays - 1;

  return (
    <Page size="A4" style={styles.page} wrap>
      {/* Day header */}
      <View style={styles.dayHeader}>
        <View>
          <Text style={styles.dayTitle}>
            {isFirstDay ? 'Day 1 — Arrival' : isLastDay ? `Day ${day.day} — Departure` : `Day ${day.day}`}
            {day.theme ? ` — ${day.theme}` : ''}
          </Text>
          <Text style={styles.dayDate}>{formatDayDate(day.date)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {day.totalCost !== undefined && (
            <Text style={{ fontSize: 10, fontWeight: 700, color: TEAL }}>~{day.totalCost} budget</Text>
          )}
          {day.walkingDistance && (
            <Text style={{ fontSize: 8, color: GRAY }}>{day.walkingDistance} walking</Text>
          )}
        </View>
      </View>

      {/* Flight arrival info */}
      {isFirstDay && flightDetails?.outbound && (
        <View style={[styles.activity, { backgroundColor: TEAL_LIGHT, borderRadius: 6, marginBottom: 6 }]}>
          <View style={styles.activityTime}>
            <Text style={styles.activityTimeText}>{flightDetails.outbound.arrivalTime || 'TBD'}</Text>
            <Text style={styles.activityDuration}>Arrival</Text>
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityName}>Land at {flightDetails.outbound.destination}</Text>
            <Text style={styles.activityLocation}>{flightDetails.outbound.carrier} from {flightDetails.outbound.origin}</Text>
          </View>
        </View>
      )}

      {/* Activities */}
      {day.schedule?.map((item, idx) => (
        <View key={idx} style={styles.activity} wrap={false}>
          <View style={styles.activityTime}>
            <Text style={styles.activityTimeText}>{item.time}</Text>
            <Text style={styles.activityDuration}>{item.duration}</Text>
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityName}>{item.activity}</Text>
            {item.location && (
              <Text style={styles.activityLocation}>{item.location}</Text>
            )}
            {item.tips && (
              <Text style={styles.activityTips}>{item.tips}</Text>
            )}
            {item.transport && (
              <Text style={styles.activityTransport}>{item.transport}</Text>
            )}
            <View style={styles.activityMeta}>
              <Text style={styles.activityCost}>
                {item.cost === 0 ? 'FREE' : `${item.cost}`}
              </Text>
              {item.type && <Text style={styles.activityType}>{item.type}</Text>}
            </View>
          </View>
        </View>
      ))}

      {/* Flight departure info */}
      {isLastDay && flightDetails?.return && (
        <View style={[styles.activity, { backgroundColor: '#fef3c7', borderRadius: 6, marginTop: 6 }]}>
          <View style={styles.activityTime}>
            <Text style={[styles.activityTimeText, { color: '#d97706' }]}>{flightDetails.return.departureTime || 'TBD'}</Text>
            <Text style={styles.activityDuration}>Departure</Text>
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityName}>Flight back to {flightDetails.return.destination}</Text>
            <Text style={styles.activityLocation}>{flightDetails.return.carrier} — {flightDetails.return.duration}</Text>
          </View>
        </View>
      )}

      {/* Day summary */}
      {day.highlights && day.highlights.length > 0 && (
        <View style={styles.daySummary}>
          <Text style={styles.daySummaryText}>
            <Text style={styles.daySummaryBold}>Highlights: </Text>
            {day.highlights.map(h => typeof h === 'string' ? h : (h?.word || h?.text || '')).filter(Boolean).join(' — ')}
          </Text>
        </View>
      )}

      <PageFooter city={city} />
    </Page>
  );
}

// Packing list page
function PackingPage({ packing, city }) {
  if (!packing) return null;

  const categories = [
    { key: 'essentials', title: 'Essentials' },
    { key: 'clothing', title: 'Clothing' },
    { key: 'activityItems', title: 'Activity Items' },
    { key: 'optional', title: 'Nice to Have' },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Packing List</Text>
      {categories.map(({ key, title }) => {
        const items = packing[key];
        if (!items || items.length === 0) return null;
        return (
          <View key={key} style={styles.packingCategory}>
            <Text style={styles.packingCategoryTitle}>{title}</Text>
            <View style={styles.packingItems}>
              {items.map((item, idx) => (
                <Text key={idx} style={styles.packingItem}>
                  {typeof item === 'string' ? item : item?.name || item?.item || ''}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
      <PageFooter city={city} />
    </Page>
  );
}

// Main PDF Document
export default function ItineraryPDF({ trip, itinerary, packing, userName }) {
  const city = trip.city || 'Trip';
  const flightDetails = trip.tripData?.flightDetails || trip.finalDestination?.flightDetails;

  return (
    <Document
      title={`${city} Travel Plan — Skusku`}
      author="Skusku.life"
      subject={`AI-generated travel itinerary for ${city}`}
    >
      {/* Cover */}
      <CoverPage trip={trip} itinerary={itinerary} userName={userName} />

      {/* Travel details (flights, hotels, budget) */}
      <TravelDetailsPage trip={trip} city={city} />

      {/* Day-by-day itinerary */}
      {itinerary?.map((day, idx) => (
        <DayPage
          key={idx}
          day={day}
          dayIndex={idx}
          totalDays={itinerary.length}
          flightDetails={flightDetails}
          city={city}
        />
      ))}

      {/* Packing list */}
      {packing && <PackingPage packing={packing} city={city} />}
    </Document>
  );
}
