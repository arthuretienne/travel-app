// frontend/src/components/IntelligentDatePicker.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import Calendar from 'react-calendar';
import {
  Calendar as CalendarIcon, Rocket, Target, BarChart,
  PiggyBank, Sparkles, PartyPopper, AlertTriangle,
  XCircle, Check, Clock, ArrowRight
} from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

export function IntelligentDatePicker({ onSelectPeriod }) {
  const { getToken } = useAuth();
  const [smartDates, setSmartDates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('short'); // 'short' or 'long'
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    fetchSmartDates();
  }, []);

  const fetchSmartDates = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/dates/intelligent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSmartDates(data.data);
        console.log('✅ Smart dates loaded:', data.data);
      } else {
        throw new Error('Failed to fetch smart dates');
      }
    } catch (error) {
      console.error('Error fetching smart dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
    if (onSelectPeriod) {
      onSelectPeriod(period);
    }
  };

  const isDateInPeriod = (date, period) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const start = new Date(period.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(period.endDate);
    end.setHours(0, 0, 0, 0);

    return checkDate >= start && checkDate <= end;
  };

  const getTileClassName = ({ date }) => {
    if (!smartDates) return '';

    const periods = smartDates[view];
    const period = periods?.find(p => isDateInPeriod(date, p));

    if (!period) return '';

    let classes = 'relative'; // Base class

    // We'll handle styling via custom CSS injection or inline styles for now as react-calendar classes are specific
    // But we can add utility-like class names that we define in global css or just rely on the fact that we can't easily use tailwind INSIDE react-calendar tileClassName for complex things without a wrapper
    // Actually, we can return string of classes.

    if (period.confidence >= 95) {
      classes += ' bg-moss-100 text-moss-700 font-bold rounded-full';
    } else if (period.confidence >= 85) {
      classes += ' bg-ember-100 text-ember-800 font-medium rounded-full';
    }

    if (selectedPeriod && isDateInPeriod(date, selectedPeriod)) {
      classes += ' bg-primary text-white hover:bg-primary-hover';
    }

    return classes;
  };

  const getTileContent = ({ date }) => {
    if (!smartDates) return null;

    const periods = smartDates[view];
    const period = periods?.find(p => {
      const start = new Date(p.startDate);
      start.setHours(0, 0, 0, 0);
      return date.getTime() === start.getTime();
    });

    if (!period) return null;

    return (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-moss-500 text-white text-[8px] flex items-center justify-center rounded-full shadow-sm">
        €
      </div>
    );
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const options = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('fr-FR', options)} - ${end.toLocaleDateString('fr-FR', options)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-sand-100 animate-pulse">
        <div className="h-8 bg-sand-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-sand-100 rounded-xl mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-sand-100 rounded-xl"></div>
          <div className="h-20 bg-sand-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!smartDates) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-sand-100">
        <div className="inline-flex p-3 bg-clay-100/60 text-clay-500 rounded-full mb-4">
          <XCircle size={32} />
        </div>
        <p className="text-text-main font-medium mb-4">Impossible de charger les suggestions de dates</p>
        <button
          onClick={fetchSmartDates}
          className="px-4 py-2 bg-white border border-sand-200 text-text-main rounded-lg hover:bg-sand-50 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const currentPeriods = smartDates[view];

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-card border border-sand-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <CalendarIcon className="text-primary" size={24} />
            Quand partir ?
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Nos suggestions personnalisées pour maximiser vos économies
          </p>
        </div>

        <div className="flex p-1 bg-sand-100 rounded-xl">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'short'
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-main'
              }`}
            onClick={() => setView('short')}
          >
            <Rocket size={16} />
            Court terme
            <span className="text-xs opacity-60 hidden sm:inline">(30j)</span>
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'long'
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-main'
              }`}
            onClick={() => setView('long')}
          >
            <Target size={16} />
            Long terme
            <span className="text-xs opacity-60 hidden sm:inline">(6 mois)</span>
          </button>
        </div>
      </div>

      {smartDates.leaveDaysInfo && (
        <div className="bg-ember-50 text-ember-800 p-4 rounded-xl border border-ember-100 flex items-center gap-3 mb-8">
          <BarChart size={20} className="shrink-0" />
          <span className="text-sm">
            Il vous reste <strong>{smartDates.leaveDaysInfo.remaining} jours</strong> de congés sur {smartDates.leaveDaysInfo.total}
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Calendar Section */}
        <div className="calendar-wrapper bg-sand-50 p-4 rounded-2xl border border-sand-100">
          <style>{`
            .react-calendar { 
              width: 100%; 
              border: none; 
              background: transparent; 
              font-family: inherit;
            }
            .react-calendar__tile {
              padding: 10px 6px;
              border-radius: 8px;
              font-size: 0.9rem;
            }
            .react-calendar__tile:enabled:hover,
            .react-calendar__tile:enabled:focus {
              background-color: #f3f4f6;
            }
            .react-calendar__tile--now {
              background: transparent;
              color: #3b82f6;
              font-weight: bold;
            }
            .react-calendar__navigation button {
              font-size: 1.1rem;
              font-weight: 600;
            }
          `}</style>
          <Calendar
            tileClassName={getTileClassName}
            tileContent={getTileContent}
            minDate={new Date()}
            maxDate={view === 'short'
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
            }
            locale="fr-FR"
          />
        </div>

        {/* Recommendations Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2 mb-4">
            {view === 'short' ? <Rocket size={20} className="text-gold-500" /> : <Target size={20} className="text-ember-500" />}
            {view === 'short' ? 'Opportunités immédiates' : 'Périodes optimales'}
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {currentPeriods && currentPeriods.length > 0 ? (
              currentPeriods.map((period, idx) => (
                <div
                  key={period.id}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${selectedPeriod?.id === period.id
                      ? 'bg-primary/5 border-primary ring-1 ring-primary'
                      : !period.canAfford
                        ? 'bg-sand-50 border-sand-200 opacity-70'
                        : 'bg-white border-sand-200 hover:border-primary/50 hover:shadow-md'
                    }`}
                  onClick={() => period.canAfford && handlePeriodSelect(period)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-gold-100 text-gold-500' : 'bg-sand-100 text-text-secondary'
                        }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-text-main">{period.title}</h4>
                        <p className="text-xs text-text-secondary font-medium flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateRange(period.startDate, period.endDate)}
                        </p>
                      </div>
                    </div>
                    {selectedPeriod?.id === period.id && (
                      <div className="bg-primary text-white p-1 rounded-full">
                        <Check size={14} />
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-text-secondary mb-3 pl-9">{period.reason}</p>

                  <div className="flex gap-2 pl-9 mb-3">
                    <div className="px-2 py-1 bg-moss-100/60 text-moss-700 rounded-lg text-xs font-medium flex items-center gap-1">
                      <PiggyBank size={12} />
                      -{period.savings}
                    </div>
                    <div className="px-2 py-1 bg-ember-50 text-ember-700 rounded-lg text-xs font-medium flex items-center gap-1">
                      <BarChart size={12} />
                      {period.leaveDaysRequired}j congés
                    </div>
                    <div className="px-2 py-1 bg-ember-50 text-ember-700 rounded-lg text-xs font-medium flex items-center gap-1">
                      <Sparkles size={12} />
                      {period.confidence}%
                    </div>
                  </div>

                  {period.events && period.events.length > 0 && (
                    <div className="pl-9 text-xs text-gold-500 flex items-center gap-1 mb-2">
                      <PartyPopper size={12} />
                      {period.events.join(', ')}
                    </div>
                  )}

                  <div className="pl-9 flex flex-wrap gap-1">
                    {period.tags && Array.isArray(period.tags) && period.tags.map((tag, idx) => {
                      const tagText = typeof tag === 'string' ? tag : (tag?.word || tag?.value || '');
                      if (!tagText) return null;
                      return (
                        <span key={idx} className="px-2 py-0.5 bg-sand-100 text-text-secondary text-[10px] rounded-full uppercase tracking-wider">
                          {tagText}
                        </span>
                      );
                    })}
                  </div>

                  {!period.canAfford && (
                    <div className="mt-3 pl-9 text-xs text-clay-500 flex items-center gap-1 font-medium">
                      <AlertTriangle size={12} />
                      Congés insuffisants ({period.leaveDaysRequired} jours requis)
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center p-8 bg-sand-50 rounded-xl border border-sand-200 border-dashed">
                <p className="text-text-secondary">Aucune suggestion disponible pour cette période</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPeriod && (
        <div className="mt-8 pt-6 border-t border-sand-100 flex justify-end">
          <button
            className="px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center gap-2"
            onClick={() => onSelectPeriod && onSelectPeriod(selectedPeriod)}
          >
            Utiliser ces dates
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
