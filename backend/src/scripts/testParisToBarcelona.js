// backend/src/scripts/testParisToBarcelona.js
// Test complet du workflow: searchDestination → searchFlights

import axios from 'axios';

const BOOKING_API_KEY = 'b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea';
const BASE_URL = 'https://booking-com15.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': BOOKING_API_KEY,
  'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

console.log('🧪 TEST WORKFLOW COMPLET: Paris → Barcelona\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Step 1: Search Paris
async function searchDestination(query) {
  console.log(`📍 Step 1: Search destination "${query}"`);

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchDestination`, {
      params: {
        query: query
      },
      headers
    });

    if (response.data?.status && response.data?.data?.length > 0) {
      const results = response.data.data;
      console.log(`✅ Found ${results.length} results for "${query}"`);

      // Show all results
      results.forEach((loc, idx) => {
        console.log(`  ${idx + 1}. ${loc.name} (${loc.id}) - Type: ${loc.type}`);
      });

      // Return first CITY or AIRPORT
      const city = results.find(r => r.type === 'CITY') || results[0];
      const airport = results.find(r => r.type === 'AIRPORT') || results[0];

      console.log(`\n🎯 Selected for "${query}":`);
      console.log(`   City: ${city.name} (${city.id})`);
      console.log(`   Airport: ${airport.name} (${airport.id})\n`);

      return { city, airport, allResults: results };
    } else {
      console.error(`❌ No results for "${query}"`);
      return null;
    }
  } catch (error) {
    console.error(`❌ searchDestination failed for "${query}":`, error.message);
    return null;
  }
}

// Step 2: Search Flights
async function searchFlights(fromId, toId, departDate, returnDate) {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✈️  Step 2: Search Flights`);
  console.log(`   From: ${fromId}`);
  console.log(`   To: ${toId}`);
  console.log(`   Depart: ${departDate}`);
  console.log(`   Return: ${returnDate}\n`);

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
      params: {
        fromId: fromId,
        toId: toId,
        departDate: departDate,
        returnDate: returnDate,
        stops: 'none',
        pageNo: 1,
        adults: 1,
        sort: 'BEST',
        cabinClass: 'ECONOMY',
        currency_code: 'EUR'
      },
      headers,
      timeout: 30000
    });

    if (response.data?.status && response.data?.data?.flightOffers) {
      const flights = response.data.data.flightOffers;
      console.log(`🎉 SUCCESS! Found ${flights.length} flights\n`);

      if (flights.length > 0) {
        const firstFlight = flights[0];

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 FIRST FLIGHT DETAILS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Price
        const price = firstFlight.priceBreakdown?.total;
        console.log(`💰 Price: €${price?.units || 'N/A'}.${String(price?.nanos || 0).substring(0, 2)}`);

        // Outbound segment
        const outbound = firstFlight.segments?.[0];
        if (outbound) {
          console.log(`\n✈️  OUTBOUND:`);
          console.log(`   ${outbound.departureAirport?.code} → ${outbound.arrivalAirport?.code}`);
          console.log(`   Departure: ${outbound.departureTime}`);
          console.log(`   Arrival: ${outbound.arrivalTime}`);
          console.log(`   Duration: ${Math.floor(outbound.totalTime / 3600)}h${Math.floor((outbound.totalTime % 3600) / 60)}min`);

          const outboundLeg = outbound.legs?.[0];
          if (outboundLeg) {
            const carrier = outboundLeg.carriersData?.[0];
            console.log(`   Airline: ${carrier?.name || 'N/A'} (${carrier?.code || 'N/A'})`);
          }
        }

        // Return segment
        const returnSeg = firstFlight.segments?.[1];
        if (returnSeg) {
          console.log(`\n🔄 RETURN:`);
          console.log(`   ${returnSeg.departureAirport?.code} → ${returnSeg.arrivalAirport?.code}`);
          console.log(`   Departure: ${returnSeg.departureTime}`);
          console.log(`   Arrival: ${returnSeg.arrivalTime}`);
          console.log(`   Duration: ${Math.floor(returnSeg.totalTime / 3600)}h${Math.floor((returnSeg.totalTime % 3600) / 60)}min`);

          const returnLeg = returnSeg.legs?.[0];
          if (returnLeg) {
            const carrier = returnLeg.carriersData?.[0];
            console.log(`   Airline: ${carrier?.name || 'N/A'} (${carrier?.code || 'N/A'})`);
          }
        }

        // Show top 3 flights
        if (flights.length > 1) {
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log('📊 TOP 3 FLIGHTS BY PRICE:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          flights.slice(0, 3).forEach((flight, idx) => {
            const p = flight.priceBreakdown?.total;
            const seg = flight.segments?.[0];
            const carrier = seg?.legs?.[0]?.carriersData?.[0];
            const duration = Math.floor(seg?.totalTime / 3600) + 'h' + Math.floor((seg?.totalTime % 3600) / 60) + 'min';

            console.log(`${idx + 1}. €${p?.units}.${String(p?.nanos || 0).substring(0, 2)} - ${carrier?.name || 'N/A'} - ${duration}`);
          });
        }

        return flights;
      } else {
        console.log('⚠️  API returned status:true but 0 flights');
        return [];
      }
    } else {
      console.log('❌ No flights found');
      console.log('Status:', response.data?.status);
      console.log('Message:', response.data?.message);
      return [];
    }
  } catch (error) {
    console.error('❌ searchFlights failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    return [];
  }
}

// Main workflow
async function testCompleteWorkflow() {
  console.log('🚀 DÉBUT DU TEST COMPLET\n');

  // Step 1: Search Paris
  const parisResults = await searchDestination('Paris');
  if (!parisResults) {
    console.error('❌ Cannot continue without Paris results');
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

  // Step 2: Search Barcelona
  const barcelonaResults = await searchDestination('Barcelona');
  if (!barcelonaResults) {
    console.error('❌ Cannot continue without Barcelona results');
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

  // Step 3: Search Flights (using CITY IDs)
  const flights = await searchFlights(
    parisResults.city.id,        // PAR.CITY
    barcelonaResults.city.id,    // Should be BCN.CITY or similar
    '2025-12-20',
    '2025-12-27'
  );

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Origin: ${parisResults.city.name} (${parisResults.city.id})`);
  console.log(`Destination: ${barcelonaResults.city.name} (${barcelonaResults.city.id})`);
  console.log(`Flights found: ${flights.length}`);

  if (flights.length > 0) {
    const cheapest = flights[0];
    const price = cheapest.priceBreakdown?.total;
    console.log(`Cheapest: €${price?.units}.${String(price?.nanos || 0).substring(0, 2)}`);
    console.log('\n✅ TEST RÉUSSI! L\'API Booking.com fonctionne parfaitement pour PAR → BCN');
  } else {
    console.log('\n⚠️  Aucun vol trouvé - Vérifier les paramètres ou la disponibilité');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 NEXT STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. Créer une database pour stocker les destinations (city.id)');
  console.log('2. Pré-remplir avec destinations européennes populaires');
  console.log('3. Éviter les appels répétés à searchDestination');
  console.log('4. Créer bookingService.js pour remplacer airScraperService.js');
  console.log('5. Mettre à jour destinationService.js pour utiliser booking API');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testCompleteWorkflow().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
