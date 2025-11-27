// frontend/src/components/TripEnhancementComponents.jsx
// Personalized Itinerary and Local Events Components
import {
  MapPin,
  Sun,
  Navigation,
  Utensils,
  Sparkles,
  TrendingUp,
  Calendar,
  Music,
  PartyPopper,
  CalendarDays,
  Plane,
} from 'lucide-react';

// Complete Trip Plan Card - AI-Generated Personalized Plan
export function CompleteTripPlanCard({ trip, enhancements, userName }) {
  const { weather, itinerary } = enhancements;
  const flightDetails = trip.tripData?.flightDetails || trip.finalDestination?.flightDetails;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden">
      {/* Header - Simple et Épuré */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">✨ Your Personalized Travel Plan</h2>
        <p className="text-indigo-100">
          Everything planned for you, {userName} - flights, transfers, activities, and rest time
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Day-by-Day Itinerary with Timing & Transfers */}
        {itinerary && itinerary.length > 0 && (
          <div className="space-y-4">
            {itinerary.map((day, idx) => {
              const dayWeather = weather?.forecast?.[idx];
              const isFirstDay = idx === 0;
              const isLastDay = idx === itinerary.length - 1;

              return (
                <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  {/* Day Header */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {isFirstDay ? '🛬 Arrival Day' : isLastDay ? '🛫 Departure Day' : `Day ${day.day}`}: {day.theme}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      {/* Weather inline */}
                      {dayWeather && (
                        <div className="flex items-center gap-2 text-sm">
                          <img src={dayWeather.day.icon} alt={dayWeather.day.condition} className="w-8 h-8" />
                          <span className="font-semibold text-gray-700">
                            {Math.round(dayWeather.day.maxtemp_c)}°C
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline Schedule */}
                  <div className="p-5">
                    <div className="space-y-4">
                      {/* Flight arrival on first day */}
                      {isFirstDay && flightDetails?.outbound && (
                        <div className="flex gap-4 border-l-4 border-blue-500 pl-4 pb-4">
                          <div className="flex-shrink-0 w-20">
                            <div className="text-sm font-bold text-blue-700">
                              {flightDetails.outbound.arrivalTime || '10:30 AM'}
                            </div>
                            <div className="text-xs text-gray-500">Arrival</div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Plane className="w-5 h-5 text-blue-600" />
                              <h4 className="font-bold text-gray-900">Land at {flightDetails.outbound.destination}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {flightDetails.outbound.carrier} flight from {flightDetails.outbound.origin}
                            </p>
                            <div className="bg-blue-50 rounded-lg p-3 text-sm">
                              <p className="text-gray-700">
                                <strong>Transfer to city center:</strong> Take the airport shuttle (€8, 25min) or taxi (€25-30, 15min).
                                Head to your hotel to drop off luggage.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Regular activities */}
                      {day.schedule.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex gap-4 border-l-4 border-green-500 pl-4 pb-4">
                          <div className="flex-shrink-0 w-20">
                            <div className="text-sm font-bold text-green-700">{item.time}</div>
                            <div className="text-xs text-gray-500">{item.duration}</div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{item.activity}</h4>
                            {item.location && (
                              <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {item.location}
                              </p>
                            )}
                            {item.tips && (
                              <div className="bg-green-50 rounded-lg p-3 text-sm text-gray-700 mb-2">
                                💡 {item.tips}
                              </div>
                            )}
                            {item.transport && (
                              <p className="text-xs text-blue-600 mb-1">
                                🚶 {item.transport}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              {item.cost > 0 && (
                                <span className="text-sm font-semibold text-gray-700">€{item.cost}</span>
                              )}
                              {item.cost === 0 && (
                                <span className="text-sm font-semibold text-green-600">FREE</span>
                              )}
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{item.type}</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Flight departure on last day */}
                      {isLastDay && flightDetails?.return && (
                        <div className="flex gap-4 border-l-4 border-orange-500 pl-4">
                          <div className="flex-shrink-0 w-20">
                            <div className="text-sm font-bold text-orange-700">
                              {flightDetails.return.departureTime || '6:00 PM'}
                            </div>
                            <div className="text-xs text-gray-500">Departure</div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Plane className="w-5 h-5 text-orange-600" />
                              <h4 className="font-bold text-gray-900">Flight back to {flightDetails.return.destination}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {flightDetails.return.carrier} • {flightDetails.return.duration || '2h 30min'}
                            </p>
                            <div className="bg-orange-50 rounded-lg p-3 text-sm">
                              <p className="text-gray-700">
                                <strong>Tip:</strong> Leave hotel 3 hours before departure. Allow 1h for airport transfer and 2h for check-in/security.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Day summary */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-gray-600">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {day.walkingDistance}
                        </span>
                        <span>€{day.totalCost} budget</span>
                      </div>
                      {day.highlights && day.highlights.length > 0 && (
                        <div className="flex gap-2">
                          {day.highlights.slice(0, 2).map((highlight, hIdx) => (
                            <span key={hIdx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              ✨ {highlight}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mock data placeholder if no itinerary */}
        {(!itinerary || itinerary.length === 0) && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
            <Sparkles className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Generating Your Custom Plan...</h3>
            <p className="text-gray-600">
              We're creating a personalized itinerary with flights, transfers, activities, and timing just for you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Personalized Itinerary Card Component
export function PersonalizedItineraryCard({ itinerary, userName, activeDay, setActiveDay, destination }) {
  if (!itinerary || itinerary.length === 0) return null;

  const currentDay = itinerary[activeDay];

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-card border border-green-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-green-600" />
            Your Personalized Itinerary
          </h2>
          <span className="text-sm text-gray-600">{destination.city}</span>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {itinerary.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDay(idx)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                activeDay === idx
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-green-100'
              }`}
            >
              Day {day.day}
            </button>
          ))}
        </div>

        {/* Day Details */}
        {currentDay && (
          <div className="space-y-4">
            {/* Day Header */}
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900">{currentDay.theme}</h3>
                <span className="text-sm text-gray-600">
                  {new Date(currentDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {currentDay.walkingDistance}
                </span>
                <span className="flex items-center gap-1">
                  €{currentDay.totalCost} budget
                </span>
              </div>
              {currentDay.highlights && currentDay.highlights.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentDay.highlights.map((highlight, idx) => (
                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✨ {highlight}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              {currentDay.schedule.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Time */}
                    <div className="flex-shrink-0 w-20">
                      <div className="text-sm font-bold text-green-700">{item.time}</div>
                      <div className="text-xs text-gray-500">{item.duration}</div>
                    </div>

                    {/* Activity Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {item.type === 'Food' && <Utensils className="w-5 h-5 text-orange-500" />}
                      {item.type === 'Culture' && <MapPin className="w-5 h-5 text-purple-500" />}
                      {item.type === 'Nature' && <Sun className="w-5 h-5 text-green-500" />}
                      {item.type === 'Transport' && <Navigation className="w-5 h-5 text-blue-500" />}
                      {!['Food', 'Culture', 'Nature', 'Transport'].includes(item.type) && (
                        <Sparkles className="w-5 h-5 text-pink-500" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{item.activity}</h4>
                      {item.location && (
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </p>
                      )}
                      {item.transport && (
                        <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {item.transport}
                        </p>
                      )}
                      {item.tips && (
                        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-2 mt-2">
                          💡 {item.tips}
                        </p>
                      )}
                      {item.forWho && (
                        <p className="text-xs text-purple-600 mt-2 italic">
                          {item.forWho}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs font-semibold ${item.cost === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                          {item.cost === 0 ? 'FREE' : `€${item.cost}`}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Local Events Card Component
export function LocalEventsCard({ events, destination }) {
  const { upcoming, regular } = events;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-card border border-orange-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PartyPopper className="w-6 h-6 text-orange-600" />
            Local Events
          </h2>
          <span className="text-sm text-gray-600">{destination.city}</span>
        </div>

        {/* Upcoming Events During Trip */}
        {upcoming.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              Happening During Your Trip
            </h3>
            <div className="space-y-3">
              {upcoming.map((event, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 border-l-4 border-orange-500">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{event.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {typeof event.month === 'number'
                            ? new Date(2025, event.month - 1, event.day || 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                            : event.month}
                        </span>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                          {event.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {event.type === 'Music' && <Music className="w-6 h-6 text-orange-500" />}
                      {event.type === 'Festival' && <PartyPopper className="w-6 h-6 text-orange-500" />}
                      {event.type === 'Cultural' && <MapPin className="w-6 h-6 text-orange-500" />}
                      {!['Music', 'Festival', 'Cultural'].includes(event.type) && (
                        <CalendarDays className="w-6 h-6 text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Annual Events */}
        {regular.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Regular Events in {destination.city}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {regular.map((event, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0">
                      {event.type === 'Music' && <Music className="w-5 h-5 text-orange-500" />}
                      {event.type === 'Festival' && <PartyPopper className="w-5 h-5 text-orange-500" />}
                      {!['Music', 'Festival'].includes(event.type) && (
                        <CalendarDays className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 mb-1 truncate">{event.name}</h4>
                      <p className="text-xs text-gray-600 mb-1 line-clamp-2">{event.description}</p>
                      <span className="text-xs text-gray-500">
                        {typeof event.month === 'number'
                          ? new Date(2025, event.month - 1, 1).toLocaleDateString('en-US', { month: 'long' })
                          : event.month}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcoming.length === 0 && regular.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <PartyPopper size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events data available for this destination yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
