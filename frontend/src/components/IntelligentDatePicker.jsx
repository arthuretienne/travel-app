// frontend/src/components/IntelligentDatePicker.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './IntelligentDatePicker.css';

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

    const classes = ['optimal-period'];

    if (period.confidence >= 95) {
      classes.push('confidence-high');
    } else if (period.confidence >= 85) {
      classes.push('confidence-medium');
    }

    if (selectedPeriod && isDateInPeriod(date, selectedPeriod)) {
      classes.push('selected');
    }

    return classes.join(' ');
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
      <div className="period-badge">
        <span className="savings">-{period.savings}</span>
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
      <div className="intelligent-date-picker">
        <div className="skeleton-loader">
          <div className="skeleton-header"></div>
          <div className="skeleton-calendar"></div>
          <div className="skeleton-cards"></div>
        </div>
      </div>
    );
  }

  if (!smartDates) {
    return (
      <div className="intelligent-date-picker">
        <div className="error-state">
          <p>❌ Impossible de charger les suggestions de dates</p>
          <button onClick={fetchSmartDates} className="retry-button">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const currentPeriods = smartDates[view];

  return (
    <div className="intelligent-date-picker">
      <div className="picker-header">
        <h2>📅 Quand partir ?</h2>
        <p className="subtitle">
          Nos suggestions personnalisées pour maximiser vos économies
        </p>
      </div>

      <div className="view-toggle">
        <button
          className={`toggle-btn ${view === 'short' ? 'active' : ''}`}
          onClick={() => setView('short')}
        >
          <span className="icon">🚀</span>
          <span className="text">Court terme</span>
          <span className="hint">(30 jours)</span>
        </button>
        <button
          className={`toggle-btn ${view === 'long' ? 'active' : ''}`}
          onClick={() => setView('long')}
        >
          <span className="icon">🎯</span>
          <span className="text">Long terme</span>
          <span className="hint">(6 mois)</span>
        </button>
      </div>

      {smartDates.leaveDaysInfo && (
        <div className="leave-days-banner">
          <span className="icon">📊</span>
          <span className="text">
            Il vous reste <strong>{smartDates.leaveDaysInfo.remaining} jours</strong> de congés sur {smartDates.leaveDaysInfo.total}
          </span>
        </div>
      )}

      <div className="calendar-section">
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

      <div className="recommendations">
        <h3>
          {view === 'short' ? '🚀 Opportunités immédiates' : '🎯 Périodes optimales'}
        </h3>

        <div className="recommendation-cards">
          {currentPeriods && currentPeriods.length > 0 ? (
            currentPeriods.map((period, idx) => (
              <div
                key={period.id}
                className={`recommendation-card ${selectedPeriod?.id === period.id ? 'selected' : ''} ${!period.canAfford ? 'disabled' : ''}`}
                onClick={() => period.canAfford && handlePeriodSelect(period)}
              >
                <div className="card-header">
                  <div className="rank">#{idx + 1}</div>
                  <div className="title-section">
                    <h4>{period.title}</h4>
                    <p className="date-range">{formatDateRange(period.startDate, period.endDate)}</p>
                  </div>
                </div>

                <p className="reason">{period.reason}</p>

                <div className="metrics">
                  <div className="metric">
                    <span className="icon">💰</span>
                    <span className="value">{period.savings}</span>
                    <span className="label">économies</span>
                  </div>
                  <div className="metric">
                    <span className="icon">📅</span>
                    <span className="value">{period.leaveDaysRequired}</span>
                    <span className="label">j. congés</span>
                  </div>
                  <div className="metric">
                    <span className="icon">✨</span>
                    <span className="value">{period.confidence}%</span>
                    <span className="label">confiance</span>
                  </div>
                </div>

                {period.events && period.events.length > 0 && (
                  <div className="events">
                    <span className="icon">🎉</span>
                    <span className="text">{period.events.join(', ')}</span>
                  </div>
                )}

                <div className="tags">
                  {period.tags.map(tag => (
                    <span key={tag} className={`tag tag-${tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>

                {!period.canAfford && (
                  <div className="warning">
                    ⚠️ Congés insuffisants ({period.leaveDaysRequired} jours requis)
                  </div>
                )}

                {selectedPeriod?.id === period.id && (
                  <div className="selected-badge">
                    ✓ Période sélectionnée
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-suggestions">
              <p>Aucune suggestion disponible pour cette période</p>
            </div>
          )}
        </div>
      </div>

      {selectedPeriod && (
        <div className="action-footer">
          <button
            className="use-period-button"
            onClick={() => onSelectPeriod && onSelectPeriod(selectedPeriod)}
          >
            Utiliser ces dates pour ma recherche
          </button>
        </div>
      )}
    </div>
  );
}
