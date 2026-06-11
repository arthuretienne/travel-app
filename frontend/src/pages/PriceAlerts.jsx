// frontend/src/pages/PriceAlerts.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Bell, BellOff, Trash2, RefreshCw, TrendingDown, TrendingUp,
  Plane, Calendar, DollarSign, Target, ChevronRight, Plus,
  AlertCircle, CheckCircle, Clock, Zap
} from 'lucide-react';

function PriceAlerts() {
  const { getToken } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState(null);
  const [error, setError] = useState(null);
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const [pushNotice, setPushNotice] = useState(null);

  const handlePushToggle = async () => {
    setPushNotice(null);
    if (pushSubscribed) {
      await pushUnsubscribe();
      return;
    }
    const result = await pushSubscribe();
    if (!result.success && result.message) {
      setPushNotice({ message: result.message, upgradeUrl: result.upgradeUrl });
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/price-alerts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Impossible de charger les alertes prix.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/price-alerts/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const checkPrice = async (alertId) => {
    setCheckingId(alertId);
    setError(null);
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/price-alerts/${alertId}/check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success !== false) {
        // Refresh alerts to get updated prices
        await fetchAlerts();
      } else {
        setError(data.message || data.error || 'Impossible de vérifier le prix pour le moment. Réessayez plus tard.');
      }
    } catch (err) {
      console.error('Error checking price:', err);
      setError('Impossible de vérifier le prix pour le moment. Réessayez plus tard.');
    } finally {
      setCheckingId(null);
    }
  };

  const toggleAlert = async (alertId, isActive) => {
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      await fetch(`${API_URL}/api/price-alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      await fetchAlerts();
    } catch (err) {
      console.error('Error toggling alert:', err);
    }
  };

  const deleteAlert = async (alertId) => {
    if (!confirm('Supprimer cette alerte prix ?')) return;

    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      await fetch(`${API_URL}/api/price-alerts/${alertId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      await fetchAlerts();
      await fetchStats();
    } catch (err) {
      console.error('Error deleting alert:', err);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPriceChange = (alert) => {
    if (!alert.currentPrice || !alert.initialPrice) return null;
    const change = alert.initialPrice - alert.currentPrice;
    const percent = Math.round((change / alert.initialPrice) * 100);
    return { change, percent, isDown: change > 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sand-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Chargement des alertes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Header */}
      <div className="bg-white border-b border-sand-100">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-medium text-text-main mb-2">
                Alertes prix
              </h1>
              <p className="text-text-secondary">
                Suivez les prix des vols et soyez notifié quand ils baissent
              </p>
            </div>
            <Link
              to="/create-trip"
              className="flex items-center gap-2 px-5 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              <Plus size={18} />
              Nouvelle alerte
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-sand-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-light text-primary rounded-lg flex items-center justify-center">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-text-main">{stats.activeAlerts}</div>
                  <div className="text-xs text-text-secondary">Actives</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-sand-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-moss-100 text-moss-500 rounded-lg flex items-center justify-center">
                  <TrendingDown size={18} />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-text-main">{stats.triggeredAlerts}</div>
                  <div className="text-xs text-text-secondary">Déclenchées</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-sand-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-100 text-gold-500 rounded-lg flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-text-main">
                    {stats.totalSavings > 0 ? `€${stats.totalSavings}` : '—'}
                  </div>
                  <div className="text-xs text-text-secondary">Économies</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-sand-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sand-100 text-sand-600 rounded-lg flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-text-main">{stats.totalAlerts}</div>
                  <div className="text-xs text-text-secondary">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Push Notification Toggle */}
        {pushSupported && (
          <div className="bg-white rounded-xl border border-sand-100 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pushSubscribed ? 'bg-primary-light text-primary' : 'bg-sand-100 text-sand-500'}`}>
                {pushSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
              </div>
              <div>
                <p className="font-medium text-text-main text-sm">Notifications push</p>
                <p className="text-xs text-text-secondary">
                  {pushSubscribed ? 'Vous recevrez des alertes instantanées sur cet appareil' : 'Soyez notifié instantanément quand les prix baissent'}
                </p>
              </div>
            </div>
            <button
              onClick={handlePushToggle}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pushSubscribed
                  ? 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              {pushSubscribed ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        )}

        {/* Push notice (plan gate, permission refusée…) */}
        {pushNotice && (
          <div className="bg-gold-100 border border-gold-100 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-text-main">{pushNotice.message}</p>
            {pushNotice.upgradeUrl && (
              <Link
                to={pushNotice.upgradeUrl}
                className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover"
              >
                Voir les offres
              </Link>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-clay-100 border border-clay-100 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-clay-500" size={20} />
            <p className="text-clay-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-sand-100">
            <div className="inline-flex p-4 bg-primary-light text-primary rounded-2xl mb-6">
              <Bell size={36} />
            </div>
            <h3 className="font-display text-xl font-medium text-text-main mb-2">
              Aucune alerte prix
            </h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Créez une alerte pour suivre les prix des vols de vos voyages.
              Vous serez notifié quand les prix passent sous votre objectif.
            </p>
            <Link
              to="/create-trip"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              <Plus size={18} />
              Créer ma première alerte
            </Link>
          </div>
        ) : (
          /* Alerts List */
          <div className="space-y-4">
            {alerts.map((alert) => {
              const priceChange = getPriceChange(alert);
              const isHighlighted = alert.id === highlightId;
              const isTriggered = alert.status === 'triggered';

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl border p-5 transition-all ${
                    isHighlighted
                      ? 'border-primary ring-2 ring-primary/20'
                      : isTriggered
                      ? 'border-moss-100 bg-moss-100/50'
                      : 'border-sand-100 hover:border-sand-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Route Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Plane size={18} className="text-primary" />
                        <h3 className="font-semibold text-text-main text-lg">
                          {alert.destination}
                          {alert.country && <span className="text-text-secondary font-normal">, {alert.country}</span>}
                        </h3>
                        {isTriggered && (
                          <span className="px-2 py-0.5 bg-moss-100 text-moss-500 text-xs font-medium rounded-full">
                            Objectif atteint
                          </span>
                        )}
                        {!alert.isActive && (
                          <span className="px-2 py-0.5 bg-sand-100 text-sand-600 text-xs font-medium rounded-full">
                            En pause
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{alert.origin}</span>
                          <ChevronRight size={14} />
                          <span className="font-medium">{alert.destination}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(alert.departureDate)} - {formatDate(alert.returnDate)}
                        </span>
                      </div>

                      {/* Price Info */}
                      <div className="flex items-center gap-6">
                        <div>
                          <div className="text-xs text-text-secondary mb-1">Prix actuel</div>
                          <div className="text-xl font-bold text-text-main">
                            €{Math.round(alert.currentPrice || alert.initialPrice)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-text-secondary mb-1">Objectif</div>
                          <div className="text-xl font-semibold text-primary flex items-center gap-1">
                            <Target size={16} />
                            €{Math.round(alert.targetPrice)}
                          </div>
                        </div>
                        {priceChange && (
                          <div>
                            <div className="text-xs text-text-secondary mb-1">Variation</div>
                            <div className={`text-lg font-semibold flex items-center gap-1 ${
                              priceChange.isDown ? 'text-moss-500' : 'text-clay-500'
                            }`}>
                              {priceChange.isDown ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                              {priceChange.isDown ? '-' : '+'}€{Math.abs(Math.round(priceChange.change))}
                              <span className="text-sm">({priceChange.percent}%)</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Last checked */}
                      {alert.lastCheckedAt && (
                        <div className="mt-3 text-xs text-text-secondary">
                          Dernière vérification : {new Date(alert.lastCheckedAt).toLocaleString('fr-FR')}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => checkPrice(alert.id)}
                        disabled={checkingId === alert.id}
                        className="p-2 text-primary hover:bg-primary-light rounded-lg transition-colors disabled:opacity-50"
                        title="Vérifier le prix maintenant"
                      >
                        <RefreshCw size={18} className={checkingId === alert.id ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => toggleAlert(alert.id, alert.isActive)}
                        className={`p-2 rounded-lg transition-colors ${
                          alert.isActive
                            ? 'text-gold-500 hover:bg-gold-100'
                            : 'text-moss-500 hover:bg-moss-100'
                        }`}
                        title={alert.isActive ? 'Mettre en pause' : 'Reprendre'}
                      >
                        {alert.isActive ? <BellOff size={18} /> : <Bell size={18} />}
                      </button>
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="p-2 text-clay-500 hover:bg-clay-100 rounded-lg transition-colors"
                        title="Supprimer l'alerte"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-primary-light border border-primary/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Zap className="text-primary mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h4 className="font-medium text-text-main mb-1">Comment fonctionnent les alertes prix</h4>
              <p className="text-sm text-text-secondary">
                Nous vérifions les prix des vols chaque jour et vous envoyons un email quand ils passent sous votre objectif.
                Vous pouvez aussi vérifier manuellement à tout moment avec le bouton de rafraîchissement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PriceAlerts;
