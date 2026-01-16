// frontend/src/components/OptimalPeriodsWidget.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Rocket,
  Target,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Info,
  ArrowRight
} from 'lucide-react';

const MOCK_PERIODS = {
  short: [{
    id: 'mock-short',
    title: 'Weekend in Rome',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    savings: '€120',
    duration: 3,
    confidence: 92,
    reason: 'Perfect weather and low flight prices detected for this weekend.',
    tags: ['City Break', 'Culture'],
    canAfford: true
  }],
  long: [{
    id: 'mock-long',
    title: 'Summer in Bali',
    startDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 104 * 24 * 60 * 60 * 1000).toISOString(),
    savings: '€450',
    duration: 14,
    confidence: 88,
    reason: 'Best time to visit Bali for dry season and cultural festivals.',
    tags: ['Tropical', 'Beach'],
    canAfford: true
  }],
  leaveDaysInfo: {
    remaining: 12,
    total: 25
  }
};

export function OptimalPeriodsWidget() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [periods, setPeriods] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('short'); // 'short' | 'long'

  useEffect(() => {
    const fetchOptimalPeriods = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        let token;
        try {
          token = await getToken();
        } catch {
          console.warn('Could not get auth token, using mock data');
        }

        if (!token) {
          setPeriods(MOCK_PERIODS);
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/dates/intelligent`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (!data.data || (!data.data.short && !data.data.long)) {
            setPeriods(MOCK_PERIODS);
          } else {
            const mergedData = { ...data.data };
            if (!mergedData.short || mergedData.short.length === 0) mergedData.short = MOCK_PERIODS.short;
            if (!mergedData.long || mergedData.long.length === 0) mergedData.long = MOCK_PERIODS.long;
            if (!mergedData.leaveDaysInfo) mergedData.leaveDaysInfo = MOCK_PERIODS.leaveDaysInfo;
            setPeriods(mergedData);
          }
        } else {
          setPeriods(MOCK_PERIODS);
        }
      } catch (err) {
        console.error('Error fetching optimal periods:', err);
        setPeriods(MOCK_PERIODS);
      } finally {
        setLoading(false);
      }
    };

    fetchOptimalPeriods();
  }, [getToken]);

  const currentPeriod = periods?.[view]?.[0];

  const handlePlanTrip = () => {
    if (!currentPeriod) return;

    // Navigate to create-trip page with pre-filled dates
    navigate('/create-trip', {
      state: {
        prefilledDates: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
        }
      }
    });
  };

  // Helper to generate calendar days
  const generateCalendarDays = (startDateStr) => {
    if (!startDateStr) return [];

    const date = new Date(startDateStr);
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];

    // Add empty slots for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateInPeriod = (date, period) => {
    if (!period || !date) return false;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const start = new Date(period.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(period.endDate);
    end.setHours(0, 0, 0, 0);
    return checkDate >= start && checkDate <= end;
  };

  const isStartOrEnd = (date, period) => {
    if (!period || !date) return false;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const start = new Date(period.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(period.endDate);
    end.setHours(0, 0, 0, 0);
    return checkDate.getTime() === start.getTime() || checkDate.getTime() === end.getTime();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100 animate-pulse h-[400px]"></div>
    );
  }

  const calendarDays = currentPeriod ? generateCalendarDays(currentPeriod.startDate) : [];
  const monthName = currentPeriod ? new Date(currentPeriod.startDate).toLocaleString('default', { month: 'long', year: 'numeric' }) : '';
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            Best Time to Travel
          </h3>
          <p className="text-gray-500 text-sm mt-1">AI-powered optimal dates for your next trip</p>
        </div>

        <div className="flex bg-gray-100/80 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setView('short')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${view === 'short'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Rocket size={14} className={view === 'short' ? 'text-emerald-500' : ''} />
            Short Term
          </button>
          <button
            onClick={() => setView('long')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${view === 'long'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Target size={14} className={view === 'long' ? 'text-primary' : ''} />
            Long Term
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-0">
        {/* Calendar Section - Custom Static Grid */}
        <div className="lg:col-span-7 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-gray-50 flex flex-col justify-center items-center">
          {currentPeriod ? (
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-gray-900 uppercase tracking-wide">{monthName}</h4>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="aspect-square"></div>;

                  const isSelected = isDateInPeriod(date, currentPeriod);
                  const isEdge = isStartOrEnd(date, currentPeriod);
                  const isPast = date < new Date().setHours(0, 0, 0, 0);

                  let cellClass = "aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ";

                  if (isEdge) {
                    cellClass += view === 'short'
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110 font-bold z-10"
                      : "bg-primary text-white shadow-lg shadow-primary/30 scale-110 font-bold z-10";
                  } else if (isSelected) {
                    cellClass += view === 'short'
                      ? "bg-emerald-100 text-emerald-700 font-semibold"
                      : "bg-primary/10 text-primary font-semibold";
                  } else if (isPast) {
                    cellClass += "text-gray-300 cursor-not-allowed";
                  } else {
                    cellClass += "text-gray-600 hover:bg-gray-50";
                  }

                  return (
                    <div key={date.toISOString()} className={cellClass}>
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">No dates available</div>
          )}
        </div>

        {/* Details Section - Side Panel */}
        <div className="lg:col-span-5 bg-gray-50/50 p-6 md:p-8 flex flex-col justify-center">
          {currentPeriod ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                  <CalendarIcon size={16} />
                  Recommended Period
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-1">{currentPeriod.title}</h4>
                <p className="text-lg text-gray-600">
                  {new Date(currentPeriod.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {new Date(currentPeriod.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Savings</div>
                  <div className="text-2xl font-bold text-emerald-600 flex items-center gap-1">
                    {currentPeriod.savings}
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Confidence</div>
                  <div className="text-2xl font-bold text-primary flex items-center gap-1">
                    {currentPeriod.confidence}%
                    <CheckCircle2 size={16} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-gray-900 text-sm mb-1">Why this time?</h5>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {currentPeriod.reason}
                    </p>
                  </div>
                </div>

                {currentPeriod.tags && Array.isArray(currentPeriod.tags) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
                    {currentPeriod.tags.map((tag, idx) => {
                      // Handle both string tags and object tags {word, count, value}
                      const tagText = typeof tag === 'string' ? tag : (tag?.word || tag?.value || '');
                      if (!tagText) return null;
                      return (
                        <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                          #{tagText}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handlePlanTrip}
                className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
              >
                Plan Trip for These Dates
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <p>Select a view to see recommendations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
