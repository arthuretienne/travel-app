// frontend/src/components/OpportunitiesWidget.jsx
// Sprint 4 — Proactive deal opportunities matched to user DNA
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Zap, X, ArrowRight, TrendingDown, Calendar, Plane } from 'lucide-react';

export function OpportunitiesWidget() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    const fetch = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const token = await getToken();
        if (!token) return;
        const res = await window.fetch(`${API_URL}/api/opportunities`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOpportunities(data.data || []);
        }
      } catch {
        // silently fail — non-critical widget
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = async (id) => {
    setDismissed(prev => new Set([...prev, id]));
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();
      await window.fetch(`${API_URL}/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'dismissed' }),
      });
    } catch {}
  };

  const handleBook = async (opportunity) => {
    const dest = opportunity.destinations;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = await getToken();
      await window.fetch(`${API_URL}/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'clicked' }),
      });
    } catch {}
    navigate('/create-trip', {
      state: {
        prefilledDestination: dest?.city,
        prefilledDates: {
          startDate: opportunity.departure_date,
          endDate: opportunity.return_date,
        },
      },
    });
  };

  const visible = opportunities.filter(o => !dismissed.has(o.id));

  if (loading || visible.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-amber-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-amber-50 flex items-center gap-2">
        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
          <Zap size={14} className="text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Deals détectés pour vous</h3>
          <p className="text-xs text-gray-400">Basés sur votre profil · Mise à jour quotidienne</p>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {visible.map(opportunity => {
          const dest = opportunity.destinations;
          const savingsVsAvg = dest?.avg_flight_price_eur
            ? Math.round((1 - opportunity.flight_price_eur / dest.avg_flight_price_eur) * 100)
            : null;
          const depDate = new Date(opportunity.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
          const retDate = new Date(opportunity.return_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

          return (
            <div key={opportunity.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group">
              {/* Destination info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-sm">{dest?.city}</span>
                  <span className="text-xs text-gray-400">{dest?.country}</span>
                  {savingsVsAvg > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      <TrendingDown size={10} />
                      -{savingsVsAvg}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Plane size={10} />
                    {opportunity.flight_price_eur}€ A/R
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {depDate} – {retDate}
                  </span>
                </div>
                {opportunity.match_reasons?.[0] && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{opportunity.match_reasons[0]}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleBook(opportunity)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Voir
                  <ArrowRight size={12} />
                </button>
                <button
                  onClick={() => handleDismiss(opportunity.id)}
                  className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Ignorer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
