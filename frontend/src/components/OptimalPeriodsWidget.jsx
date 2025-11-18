// frontend/src/components/OptimalPeriodsWidget.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import './OptimalPeriodsWidget.css';

export function OptimalPeriodsWidget() {
  const { getToken } = useAuth();
  const [periods, setPeriods] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOptimalPeriods();
  }, []);

  const fetchOptimalPeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/dates/intelligent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPeriods(data.data);
      } else {
        throw new Error('Failed to fetch optimal periods');
      }
    } catch (err) {
      console.error('Error fetching optimal periods:', err);
      setError(err.message);
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

  if (loading) {
    return (
      <div className="optimal-periods-widget">
        <div className="widget-header">
          <h3>📅 Best Times to Travel</h3>
          <p>Analyzing optimal periods...</p>
        </div>
        <div className="periods-grid">
          <div className="period-skeleton"></div>
          <div className="period-skeleton"></div>
        </div>
      </div>
    );
  }

  if (error || !periods) {
    return (
      <div className="optimal-periods-widget">
        <div className="widget-header">
          <h3>📅 Best Times to Travel</h3>
          <p className="error-message">Unable to load travel suggestions</p>
        </div>
      </div>
    );
  }

  const shortTermPeriod = periods.short && periods.short.length > 0 ? periods.short[0] : null;
  const longTermPeriod = periods.long && periods.long.length > 0 ? periods.long[0] : null;

  return (
    <div className="optimal-periods-widget">
      <div className="widget-header">
        <h3>📅 Best Times to Travel</h3>
        <p>Personalized recommendations based on your preferences</p>
      </div>

      <div className="periods-grid">
        {/* Short-term period */}
        {shortTermPeriod && (
          <div className="period-block short-term">
            <div className="period-badge">
              <span className="badge-icon">🚀</span>
              <span className="badge-text">Short Term</span>
            </div>

            <div className="period-content">
              <div className="period-header">
                <h4>{shortTermPeriod.title}</h4>
                <div className="countdown">{getDaysUntil(shortTermPeriod.startDate)}</div>
              </div>

              <div className="period-dates">
                {formatDateRange(shortTermPeriod.startDate, shortTermPeriod.endDate)}
              </div>

              <div className="period-metrics">
                <div className="metric">
                  <span className="metric-icon">💰</span>
                  <div className="metric-content">
                    <div className="metric-value">{shortTermPeriod.savings}</div>
                    <div className="metric-label">savings</div>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-icon">📅</span>
                  <div className="metric-content">
                    <div className="metric-value">{shortTermPeriod.duration}d</div>
                    <div className="metric-label">trip</div>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-icon">✨</span>
                  <div className="metric-content">
                    <div className="metric-value">{shortTermPeriod.confidence}%</div>
                    <div className="metric-label">match</div>
                  </div>
                </div>
              </div>

              {shortTermPeriod.leaveDaysRequired > 0 && (
                <div className="leave-info">
                  💼 {shortTermPeriod.leaveDaysRequired} leave day{shortTermPeriod.leaveDaysRequired > 1 ? 's' : ''} needed
                </div>
              )}

              <p className="period-reason">{shortTermPeriod.reason}</p>

              {shortTermPeriod.tags && shortTermPeriod.tags.length > 0 && (
                <div className="period-tags">
                  {shortTermPeriod.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Long-term period */}
        {longTermPeriod && (
          <div className="period-block long-term">
            <div className="period-badge">
              <span className="badge-icon">🎯</span>
              <span className="badge-text">Long Term</span>
            </div>

            <div className="period-content">
              <div className="period-header">
                <h4>{longTermPeriod.title}</h4>
                <div className="countdown">{getDaysUntil(longTermPeriod.startDate)}</div>
              </div>

              <div className="period-dates">
                {formatDateRange(longTermPeriod.startDate, longTermPeriod.endDate)}
              </div>

              <div className="period-metrics">
                <div className="metric">
                  <span className="metric-icon">💰</span>
                  <div className="metric-content">
                    <div className="metric-value">{longTermPeriod.savings}</div>
                    <div className="metric-label">savings</div>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-icon">📅</span>
                  <div className="metric-content">
                    <div className="metric-value">{longTermPeriod.duration}d</div>
                    <div className="metric-label">trip</div>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-icon">✨</span>
                  <div className="metric-content">
                    <div className="metric-value">{longTermPeriod.confidence}%</div>
                    <div className="metric-label">match</div>
                  </div>
                </div>
              </div>

              {longTermPeriod.leaveDaysRequired > 0 && (
                <div className="leave-info">
                  💼 {longTermPeriod.leaveDaysRequired} leave day{longTermPeriod.leaveDaysRequired > 1 ? 's' : ''} needed
                </div>
              )}

              <p className="period-reason">{longTermPeriod.reason}</p>

              {longTermPeriod.events && longTermPeriod.events.length > 0 && (
                <div className="events-info">
                  🎉 {longTermPeriod.events.slice(0, 2).join(', ')}
                </div>
              )}

              {longTermPeriod.tags && longTermPeriod.tags.length > 0 && (
                <div className="period-tags">
                  {longTermPeriod.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {periods.leaveDaysInfo && (
        <div className="widget-footer">
          📊 You have <strong>{periods.leaveDaysInfo.remaining} leave days</strong> remaining out of {periods.leaveDaysInfo.total}
        </div>
      )}
    </div>
  );
}
