// frontend/src/components/OptimalPeriodsWidget.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Calendar as CalendarIcon, Rocket, Target, PartyPopper, Clock, ArrowRight, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

export function OptimalPeriodsWidget() {
  const { getToken } = useAuth();
  const [periods, setPeriods] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const MOCK_PERIODS = {
    short: [{
      id: 'mock-short',
      title: 'Weekend in Rome',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      savings: '€120',
      duration: 3,
      confidence: 92,
      leaveDaysRequired: 1,
      reason: 'Perfect weather and low flight prices detected for this weekend.',
      tags: ['City Break', 'Culture', 'Food'],
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
      leaveDaysRequired: 10,
      reason: 'Best time to visit Bali for dry season and cultural festivals.',
      tags: ['Tropical', 'Beach', 'Nature'],
      events: ['Arts Festival', 'Kite Festival'],
      canAfford: true
    }],
    leaveDaysInfo: {
      remaining: 12,
      total: 25
    }
  };

  useEffect(() => {
    fetchOptimalPeriods();
  }, []);

  const fetchOptimalPeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      let token;
      try {
        token = await getToken();
      } catch (e) {
        console.warn('Could not get auth token, using mock data');
      }

      if (!token) {
        setPeriods(MOCK_PERIODS);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/dates/intelligent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
    return `In ${Math.floor(diffDays / 30)} months`;
  };

  // Helper to check if a date is in a period
  const isDateInPeriod = (date, period) => {
    if (!period) return false;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const start = new Date(period.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(period.endDate);
    end.setHours(0, 0, 0, 0);
    return checkDate >= start && checkDate <= end;
  };

  const getTileClassName = ({ date, period }) => {
    if (!period) return '';
    if (isDateInPeriod(date, period)) {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate.getTime() === start.getTime() && checkDate.getTime() === end.getTime()) {
        return 'bg-primary text-white rounded-full font-bold shadow-md scale-105 relative z-10';
      } else if (checkDate.getTime() === start.getTime()) {
        return 'bg-primary text-white rounded-l-full font-bold shadow-sm relative z-10';
      } else if (checkDate.getTime() === end.getTime()) {
        return 'bg-primary text-white rounded-r-full font-bold shadow-sm relative z-10';
      } else {
        return 'bg-primary/15 text-primary font-bold';
      }
    }
    return 'text-gray-300 font-normal hover:bg-gray-50 hover:text-gray-500 rounded-full transition-colors';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-card p-8 border border-gray-100 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-80 bg-gray-100 rounded-2xl"></div>
          <div className="h-80 bg-gray-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const shortTermPeriod = periods?.short?.[0];
  const longTermPeriod = periods?.long?.[0];

  return (
    <div className="bg-white rounded-3xl shadow-card p-6 md:p-8 border border-gray-100 mb-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <CalendarIcon size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-main">Best Times to Travel</h3>
            <p className="text-sm text-text-secondary">AI-optimized recommendations</p>
          </div>
        </div>
        {periods?.leaveDaysInfo && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-text-secondary">
              <strong className="text-text-main">{periods.leaveDaysInfo.remaining}</strong> days off remaining
            </span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Short Term Card */}
        {shortTermPeriod && (
          <div className="group relative bg-surface-subtle rounded-2xl p-1 border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-5 right-5 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-sm border border-gray-100 text-xs font-bold text-amber-600 uppercase tracking-wider">
                <Rocket size={12} /> Short Term
              </span>
            </div>

            <div className="bg-white rounded-xl p-6 h-full flex flex-col">
              <div className="mb-6">
                <div className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Clock size={16} />
                  {getDaysUntil(shortTermPeriod.startDate)}
                </div>
                <h4 className="text-2xl font-bold text-text-main mb-2">{shortTermPeriod.title}</h4>
                <p className="text-lg text-text-secondary font-medium">
                  {formatDateRange(shortTermPeriod.startDate, shortTermPeriod.endDate)}
                </p>
              </div>

              <div className="flex-1 grid md:grid-cols-2 gap-6 mb-6">
                {/* Minimal Calendar */}
                <div className="calendar-minimal">
                  <style>{`
                    .calendar-minimal .react-calendar { 
                      width: 100%; 
                      border: none; 
                      background: transparent; 
                      font-family: inherit;
                    }
                    .calendar-minimal .react-calendar__navigation { display: none; }
                    .calendar-minimal .react-calendar__month-view__weekdays { 
                      text-transform: uppercase; 
                      font-size: 0.65rem; 
                      font-weight: 700; 
                      color: #D1D5DB; /* Gray-300 for lighter headers */
                      text-decoration: none;
                      margin-bottom: 0.5rem;
                    }
                    .calendar-minimal abbr { text-decoration: none; }
                    .calendar-minimal .react-calendar__tile {
                      padding: 0.6rem 0;
                      font-size: 0.9rem;
                      font-weight: 500;
                    }
                    .calendar-minimal .react-calendar__month-view__days__day--neighboringMonth {
                      color: #F3F4F6 !important; /* Gray-100 for almost invisible neighboring days */
                    }
                  `}</style>
                  <Calendar
                    value={new Date(shortTermPeriod.startDate)}
                    tileClassName={({ date }) => getTileClassName({ date, period: shortTermPeriod })}
                    locale="en-US"
                    view="month"
                    showNavigation={false}
                    showFixedNumberOfWeeks={false}
                    tileDisabled={() => true}
                  />
                </div>

                {/* Stats & Reason */}
                <div className="flex flex-col justify-center space-y-4">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-green-700 uppercase">Savings</span>
                      <TrendingUp size={16} className="text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-700">{shortTermPeriod.savings}</div>
                    <div className="text-xs text-green-600 mt-1">vs avg. price</div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-700 uppercase">Match</span>
                      <CheckCircle2 size={16} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-700">{shortTermPeriod.confidence}%</div>
                    <div className="text-xs text-blue-600 mt-1">confidence score</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <p className="text-text-main font-medium mb-3 flex items-start gap-2">
                  <Sparkles size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  {shortTermPeriod.reason}
                </p>
                <div className="flex flex-wrap gap-2">
                  {shortTermPeriod.tags?.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Long Term Card */}
        {longTermPeriod && (
          <div className="group relative bg-surface-subtle rounded-2xl p-1 border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-5 right-5 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-sm border border-gray-100 text-xs font-bold text-primary uppercase tracking-wider">
                <Target size={12} /> Long Term
              </span>
            </div>

            <div className="bg-white rounded-xl p-6 h-full flex flex-col">
              <div className="mb-6">
                <div className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Clock size={16} />
                  {getDaysUntil(longTermPeriod.startDate)}
                </div>
                <h4 className="text-2xl font-bold text-text-main mb-2">{longTermPeriod.title}</h4>
                <p className="text-lg text-text-secondary font-medium">
                  {formatDateRange(longTermPeriod.startDate, longTermPeriod.endDate)}
                </p>
              </div>

              <div className="flex-1 grid md:grid-cols-2 gap-6 mb-6">
                {/* Minimal Calendar */}
                <div className="calendar-minimal">
                  <Calendar
                    value={new Date(longTermPeriod.startDate)}
                    tileClassName={({ date }) => getTileClassName({ date, period: longTermPeriod })}
                    locale="en-US"
                    view="month"
                    showNavigation={false}
                    showFixedNumberOfWeeks={false}
                    tileDisabled={() => true}
                  />
                </div>

                {/* Stats & Reason */}
                <div className="flex flex-col justify-center space-y-4">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-green-700 uppercase">Savings</span>
                      <TrendingUp size={16} className="text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-700">{longTermPeriod.savings}</div>
                    <div className="text-xs text-green-600 mt-1">vs avg. price</div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-700 uppercase">Match</span>
                      <CheckCircle2 size={16} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-700">{longTermPeriod.confidence}%</div>
                    <div className="text-xs text-blue-600 mt-1">confidence score</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <p className="text-text-main font-medium mb-3 flex items-start gap-2">
                  <Sparkles size={18} className="text-purple-500 shrink-0 mt-0.5" />
                  {longTermPeriod.reason}
                </p>
                {longTermPeriod.events?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 font-medium mb-3">
                    <PartyPopper size={16} />
                    {longTermPeriod.events.join(', ')}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {longTermPeriod.tags?.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
