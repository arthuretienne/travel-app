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
  ArrowRight,
  Link as LinkIcon
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

const PERIODS_CACHE_KEY = 'optimal_periods_v3';
const PERIODS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadFromLocalCache() {
  try {
    const raw = localStorage.getItem(PERIODS_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > PERIODS_CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function saveToLocalCache(data) {
  try {
    localStorage.setItem(PERIODS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore storage errors */ }
}

export function OptimalPeriodsWidget() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [periods, setPeriods] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('short'); // 'short' | 'long'
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  useEffect(() => {
    // Check localStorage first — no API call if cache is < 7 days old
    const localData = loadFromLocalCache();
    if (localData) {
      setPeriods(localData);
      setCalendarConnected(localData.metadata?.hasCalendar || false);
      setLoading(false);
      return;
    }

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
            setCalendarConnected(data.data.metadata?.hasCalendar || false);
            saveToLocalCache(mergedData);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPeriod = periods?.[view]?.[0];

  const connectCalendar = async () => {
    try {
      setConnectingCalendar(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/calendar/oauth/authorize`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authUrl) window.location.href = data.authUrl;
    } catch (err) {
      console.error('Calendar connect error:', err);
    } finally {
      setConnectingCalendar(false);
    }
  };

  const handlePlanTrip = () => {
    if (!currentPeriod) return;
    navigate('/create-trip', {
      state: {
        prefilledDates: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
        }
      }
    });
  };

  const handleAcceptProposal = () => {
    if (!currentPeriod) return;
    navigate('/trip-proposal', { state: { proposal: currentPeriod } });
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
      <div className="bg-white rounded-3xl shadow-sm p-8 border border-sand-100 animate-pulse h-[400px]"></div>
    );
  }

  const calendarDays = currentPeriod ? generateCalendarDays(currentPeriod.startDate) : [];
  const monthName = currentPeriod ? new Date(currentPeriod.startDate).toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : '';
  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-sand-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-sand-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Sparkles className="text-gold-500" size={20} />
            Vos prochaines escapades
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-text-secondary text-sm">Les meilleurs moments pour partir, selon vos envies</p>
            {calendarConnected ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-moss-700 bg-moss-100/60 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} />
                Calendrier synchronisé
              </span>
            ) : (
              <button
                onClick={connectCalendar}
                disabled={connectingCalendar}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                <LinkIcon size={11} />
                {connectingCalendar ? 'Connexion...' : 'Connecter le calendrier'}
              </button>
            )}
          </div>
        </div>

        <div className="flex bg-sand-100/80 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setView('short')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${view === 'short'
                ? 'bg-white text-text-main shadow-sm'
                : 'text-text-secondary hover:text-text-main'
              }`}
          >
            <Rocket size={14} className={view === 'short' ? 'text-moss-700' : ''} />
            Bientôt
          </button>
          <button
            onClick={() => setView('long')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${view === 'long'
                ? 'bg-white text-text-main shadow-sm'
                : 'text-text-secondary hover:text-text-main'
              }`}
          >
            <Target size={14} className={view === 'long' ? 'text-primary' : ''} />
            Dans quelques mois
          </button>
        </div>
      </div>

      {!calendarConnected && (
        <div className="mx-6 md:mx-8 mb-0 -mt-px">
          <div className="flex items-center justify-between gap-4 bg-ember-50 border border-ember-100 rounded-2xl px-5 py-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-ember-100 rounded-xl flex items-center justify-center shrink-0">
                <CalendarIcon size={17} className="text-ember-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-main">Connecter Google Agenda</p>
                <p className="text-xs text-text-secondary mt-0.5">Suggestions basées sur vos vraies dates libres</p>
              </div>
            </div>
            <button
              onClick={connectCalendar}
              disabled={connectingCalendar}
              className="shrink-0 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              {connectingCalendar ? 'Connexion...' : 'Connecter'}
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-0">
        {/* Calendar Section - Custom Static Grid */}
        <div className="lg:col-span-7 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-sand-100 flex flex-col justify-center items-center">
          {currentPeriod ? (
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-text-main uppercase tracking-wide">{monthName}</h4>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-bold text-text-light uppercase">
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
                      ? "bg-moss-500 text-white shadow-lg shadow-emerald-200 scale-110 font-bold z-10"
                      : "bg-primary text-white shadow-lg shadow-primary/30 scale-110 font-bold z-10";
                  } else if (isSelected) {
                    cellClass += view === 'short'
                      ? "bg-moss-100 text-moss-700 font-semibold"
                      : "bg-primary/10 text-primary font-semibold";
                  } else if (isPast) {
                    cellClass += "text-text-muted cursor-not-allowed";
                  } else {
                    cellClass += "text-text-secondary hover:bg-sand-50";
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
            <div className="text-center text-text-light">No dates available</div>
          )}
        </div>

        {/* Details Section - Side Panel */}
        <div className="lg:col-span-5 bg-sand-50/50 p-6 md:p-8 flex flex-col justify-center">
          {currentPeriod ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                  <CalendarIcon size={16} />
                  Période recommandée
                </div>
                <h4 className="text-2xl font-bold text-text-main mb-1">{currentPeriod.title}</h4>
                <p className="text-lg text-text-secondary">
                  {new Date(currentPeriod.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {new Date(currentPeriod.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-sand-100">
                  <div className="text-xs font-bold text-text-light uppercase tracking-wider mb-1">Économies</div>
                  <div className="text-2xl font-bold text-moss-700 flex items-center gap-1">
                    {currentPeriod.savings}
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-sand-100">
                  <div className="text-xs font-bold text-text-light uppercase tracking-wider mb-1">Fiabilité</div>
                  <div className="text-2xl font-bold text-primary flex items-center gap-1">
                    {currentPeriod.confidence}%
                    <CheckCircle2 size={16} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-sand-100">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-gold-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-text-main text-sm mb-1">Pourquoi cette période ?</h5>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {currentPeriod.reason}
                    </p>
                  </div>
                </div>

                {currentPeriod.tags && Array.isArray(currentPeriod.tags) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-sand-100">
                    {currentPeriod.tags.map((tag, idx) => {
                      // Handle both string tags and object tags {word, count, value}
                      const tagText = typeof tag === 'string' ? tag : (tag?.word || tag?.value || '');
                      if (!tagText) return null;
                      return (
                        <span key={idx} className="px-2.5 py-1 bg-sand-100 text-text-secondary text-xs font-medium rounded-md">
                          #{tagText}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  onClick={handleAcceptProposal}
                  className="w-full py-3.5 bg-sand-900 hover:bg-sand-800 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                >
                  J'accepte cette proposition
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={handlePlanTrip}
                  className="w-full py-3 text-text-secondary hover:text-text-main text-sm font-medium transition-colors"
                >
                  Choisir mes propres dates
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-text-light py-12">
              <p>Sélectionnez une période pour voir les suggestions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
