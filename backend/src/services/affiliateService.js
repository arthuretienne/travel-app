// backend/src/services/affiliateService.js

export function generateAffiliateLinks(result, originCity) {
  const { destination, slot, flightOffer } = result;
  
  return {
    skyscanner: generateSkyscannerLink(originCity, destination.iataCode, slot),
    booking: generateBookingLink(destination.city, destination.country, slot),
    description: `Book your trip to ${destination.city}`
  };
}

function generateSkyscannerLink(origin, destination, slot) {
  const affiliateId = process.env.SKYSCANNER_AFFILIATE_ID || 'DEMO_ID';
  
  // Format dates as YYMMDD
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  };

  const depDate = formatDate(slot.startDate);
  const retDate = formatDate(slot.endDate);

  return `https://www.skyscanner.net/transport/flights/${origin}/${destination}/${depDate}/${retDate}/?associateid=${affiliateId}`;
}

function generateBookingLink(city, country, slot) {
  const affiliateId = process.env.BOOKING_AFFILIATE_ID || 'DEMO_ID';
  
  const searchString = encodeURIComponent(`${city} ${country}`);
  const checkin = slot.startDate;
  const checkout = slot.endDate;

  return `https://www.booking.com/searchresults.html?ss=${searchString}&checkin=${checkin}&checkout=${checkout}&aid=${affiliateId}`;
}

// Future: Add GetYourGuide, Viator links
export function generateActivityLinks(destination) {
  return {
    getYourGuide: `https://www.getyourguide.com/s/?q=${encodeURIComponent(destination.city)}`,
    viator: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(destination.city)}`
  };
}