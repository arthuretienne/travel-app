// frontend/src/components/StickyBookingProgress.jsx
// Sticky booking progress bar with checklist and CTAs
import { useState, useEffect } from 'react';
import {
  Plane,
  Hotel,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowLeft,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { generateAllBookingLinks, getIataCode } from '../utils/bookingLinks';

/**
 * Sticky Booking Progress Bar
 * Shows booking completion status and CTAs for flights, hotels, activities
 */
export default function StickyBookingProgress({
  city,
  country,
  startDate,
  endDate,
  originCity = null,
  originIata = null,
  adults = 1,
  onBack,
  initialBookingStatus = {}
}) {
  // Booking status state (persisted in localStorage)
  const [bookingStatus, setBookingStatus] = useState(() => {
    const storageKey = `booking_${city}_${startDate}`;
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : initialBookingStatus;
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(null);

  // Generate optimized booking links
  const links = generateAllBookingLinks({
    originCity,
    originIata,
    destinationCity: city,
    destinationIata: getIataCode(city, country),
    destinationCountry: country,
    startDate,
    endDate,
    adults
  });

  // Persist booking status
  useEffect(() => {
    const storageKey = `booking_${city}_${startDate}`;
    localStorage.setItem(storageKey, JSON.stringify(bookingStatus));
  }, [bookingStatus, city, startDate]);

  // Calculate progress
  const items = [
    { key: 'flight', label: 'Vol', shortLabel: 'Vol', icon: Plane, color: 'blue', link: links.flight },
    { key: 'hotel', label: 'Hébergement', shortLabel: 'Hotel', icon: Hotel, color: 'green', link: links.hotel },
    { key: 'activities', label: 'Activités', shortLabel: 'Activités', icon: Sparkles, color: 'purple', link: links.activities }
  ];

  const bookedCount = items.filter(i => bookingStatus[i.key]).length;
  const progress = Math.round((bookedCount / items.length) * 100);
  const isComplete = bookedCount === items.length;

  // Toggle booking status
  const toggleBooked = (key) => {
    if (!bookingStatus[key]) {
      // Opening booking link - show confirmation after a delay
      setShowConfirmation(key);
    } else {
      // Unchecking - just toggle
      setBookingStatus(prev => ({ ...prev, [key]: false }));
    }
  };

  const confirmBooking = (key) => {
    setBookingStatus(prev => ({ ...prev, [key]: true }));
    setShowConfirmation(null);
  };

  // Format dates for display
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      {/* Sticky Bar - positioned below main nav (top-16 = 64px) */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Bar */}
          <div className="flex items-center justify-between h-14">
            {/* Left - Back + Destination */}
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-text-secondary" />
                </button>
              )}
              <div className="hidden sm:flex flex-col">
                <span className="font-semibold text-text-main">{city}</span>
                <span className="text-xs text-text-secondary">
                  {formatDate(startDate)} - {formatDate(endDate)}
                </span>
              </div>
            </div>

            {/* Center - Progress Bar (Desktop) */}
            <div className="hidden md:flex items-center gap-4 flex-1 justify-center max-w-md mx-4">
              <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={`text-sm font-medium ${isComplete ? 'text-green-600' : 'text-text-secondary'}`}>
                {bookedCount}/{items.length}
              </span>
            </div>

            {/* Right - CTAs */}
            <div className="flex items-center gap-2">
              {items.map((item) => {
                const Icon = item.icon;
                const isBooked = bookingStatus[item.key];

                return (
                  <div key={item.key} className="relative group">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => !isBooked && setShowConfirmation(item.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        isBooked
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : item.key === 'activities'
                            ? 'bg-primary text-white hover:bg-primary-hover'
                            : 'bg-stone-100 text-text-main hover:bg-stone-200'
                      }`}
                    >
                      {isBooked ? (
                        <CheckCircle2 size={16} className="text-green-600" />
                      ) : (
                        <Icon size={16} />
                      )}
                      <span className="hidden sm:inline">{item.shortLabel}</span>
                    </a>
                  </div>
                );
              })}

              {/* Expand button on mobile */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="md:hidden p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>

          {/* Expanded Mobile View */}
          {isExpanded && (
            <div className="md:hidden py-3 border-t border-stone-100 animate-slide-down">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-text-secondary">
                  {bookedCount}/{items.length} réservé{bookedCount > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isBooked = bookingStatus[item.key];

                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        isBooked ? 'bg-green-50' : 'bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleBooked(item.key)}
                          className="flex-shrink-0"
                        >
                          {isBooked ? (
                            <CheckCircle2 size={22} className="text-green-600" />
                          ) : (
                            <Circle size={22} className="text-stone-300" />
                          )}
                        </button>
                        <div>
                          <span className={`font-medium ${isBooked ? 'text-green-700 line-through' : 'text-text-main'}`}>
                            {item.label}
                          </span>
                          {isBooked && (
                            <span className="block text-xs text-green-600">Réservé ✓</span>
                          )}
                        </div>
                      </div>

                      {!isBooked && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShowConfirmation(item.key)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg ${
                            item.color === 'blue'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : item.color === 'green'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          Réserver
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-main">
                Réservation effectuée ?
              </h3>
              <button
                onClick={() => setShowConfirmation(null)}
                className="p-1 hover:bg-stone-100 rounded-full"
              >
                <X size={20} className="text-text-secondary" />
              </button>
            </div>

            <p className="text-text-secondary mb-6">
              Avez-vous réservé votre{' '}
              {showConfirmation === 'flight' ? 'vol' : showConfirmation === 'hotel' ? 'hébergement' : 'activité'}{' '}
              ?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(null)}
                className="flex-1 px-4 py-3 text-text-secondary font-medium bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
              >
                Pas encore
              </button>
              <button
                onClick={() => confirmBooking(showConfirmation)}
                className="flex-1 px-4 py-3 text-white font-medium bg-green-600 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Oui, réservé
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Inline Booking Checklist Card (non-sticky version)
 */
export function BookingChecklistCard({
  city,
  country,
  startDate,
  endDate,
  originCity = null,
  adults = 1,
  members = []
}) {
  const [bookingStatus, setBookingStatus] = useState(() => {
    const storageKey = `booking_${city}_${startDate}`;
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Generate optimized booking links
  const links = generateAllBookingLinks({
    originCity,
    destinationCity: city,
    destinationIata: getIataCode(city, country),
    destinationCountry: country,
    startDate,
    endDate,
    adults: members.length || adults
  });

  // Persist booking status
  useEffect(() => {
    const storageKey = `booking_${city}_${startDate}`;
    localStorage.setItem(storageKey, JSON.stringify(bookingStatus));
  }, [bookingStatus, city, startDate]);

  const items = [
    {
      key: 'flight',
      label: 'Vols',
      icon: Plane,
      color: 'blue',
      link: links.flight,
      description: 'Trouvez les meilleurs tarifs'
    },
    {
      key: 'hotel',
      label: 'Hébergement',
      icon: Hotel,
      color: 'green',
      link: links.hotel,
      description: 'Hôtels, appartements, maisons'
    },
    {
      key: 'activities',
      label: 'Activités',
      icon: Sparkles,
      color: 'purple',
      link: links.activities,
      description: 'Visites, tours, expériences'
    }
  ];

  const bookedCount = items.filter(i => bookingStatus[i.key]).length;
  const progress = Math.round((bookedCount / items.length) * 100);

  const toggleBooked = (key) => {
    setBookingStatus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const colorClasses = {
    blue: {
      bg: 'bg-blue-600 hover:bg-blue-700',
      light: 'bg-blue-50',
      text: 'text-blue-600',
      check: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-600 hover:bg-green-700',
      light: 'bg-green-50',
      text: 'text-green-600',
      check: 'text-green-600'
    },
    purple: {
      bg: 'bg-purple-600 hover:bg-purple-700',
      light: 'bg-purple-50',
      text: 'text-purple-600',
      check: 'text-purple-600'
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-main">Réservations</h2>
            <p className="text-sm text-text-secondary">Complétez votre voyage</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-semibold ${
            progress === 100
              ? 'bg-green-100 text-green-700'
              : 'bg-primary-light text-primary'
          }`}>
            {bookedCount}/{items.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              progress === 100 ? 'bg-green-500' : 'bg-primary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const Icon = item.icon;
          const isBooked = bookingStatus[item.key];
          const colors = colorClasses[item.color];

          return (
            <div
              key={item.key}
              className={`p-4 flex items-center gap-4 transition-colors ${
                isBooked ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleBooked(item.key)}
                className="flex-shrink-0"
              >
                {isBooked ? (
                  <CheckCircle2 size={24} className="text-green-600" />
                ) : (
                  <Circle size={24} className="text-stone-300 hover:text-stone-400" />
                )}
              </button>

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.light}`}>
                <Icon size={20} className={colors.text} />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${isBooked ? 'text-gray-400 line-through' : 'text-text-main'}`}>
                  {item.label}
                </p>
                <p className="text-sm text-text-secondary truncate">{item.description}</p>
              </div>

              {/* CTA */}
              {!isBooked ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${colors.bg}`}
                >
                  Réserver
                  <ExternalLink size={14} />
                </a>
              ) : (
                <span className="px-4 py-2 text-green-600 text-sm font-medium">
                  ✓ Réservé
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Group Members Status (if applicable) */}
      {members.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
            Statut du groupe
          </p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200"
              >
                <img
                  src={member.user?.imageUrl || `https://ui-avatars.com/api/?name=${member.user?.firstName}`}
                  alt={member.user?.firstName}
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-sm text-text-main">{member.user?.firstName}</span>
                {member.bookingConfirmed && (
                  <CheckCircle2 size={14} className="text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
