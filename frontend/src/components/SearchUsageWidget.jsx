// frontend/src/components/SearchUsageWidget.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Search, Zap, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SearchUsageWidget({ compact = false }) {
  const { getToken } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/billing/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-stone-100 animate-pulse">
        <div className="h-12 w-12 bg-stone-100 rounded-xl mb-2" />
        <div className="h-6 w-16 bg-stone-100 rounded mb-1" />
        <div className="h-4 w-24 bg-stone-100 rounded" />
      </div>
    );
  }

  if (!usage) return null;

  const { searches, plan, needsUpgrade } = usage;
  const percentUsed = searches.percentUsed || 0;

  // Compact version for inline display
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Search size={14} className="text-text-secondary" />
        <span className="text-text-secondary">
          {searches.unlimited ? (
            'Recherches illimitées'
          ) : (
            <>
              <span className={needsUpgrade ? 'text-red-600 font-medium' : 'text-text-main'}>
                {searches.remaining}
              </span>
              /{searches.limit} recherches restantes
            </>
          )}
        </span>
        {needsUpgrade && (
          <Link to="/pricing" className="text-primary font-medium hover:underline">
            Passer premium
          </Link>
        )}
      </div>
    );
  }

  // Full widget version
  return (
    <div className="bg-white p-5 rounded-2xl border border-stone-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            needsUpgrade ? 'bg-red-50 text-red-600' : 'bg-primary-light text-primary'
          }`}>
            <Search size={22} />
          </div>
          <div>
            <div className="text-2xl font-semibold text-text-main">
              {searches.unlimited ? '∞' : searches.remaining}
            </div>
            <div className="text-sm text-text-secondary">
              {searches.unlimited ? 'illimitées' : `/ ${searches.limit}`} recherches
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          plan === 'FREE' ? 'bg-stone-100 text-stone-600' :
          plan === 'EXPLORER' ? 'bg-primary-light text-primary' :
          'bg-amber-100 text-amber-700'
        }`}>
          {plan}
        </div>
      </div>

      {/* Progress bar (only for non-unlimited plans) */}
      {!searches.unlimited && (
        <div className="mb-4">
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentUsed >= 100 ? 'bg-red-500' :
                percentUsed >= 80 ? 'bg-amber-500' :
                'bg-primary'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-text-secondary">
            <span>{searches.used} utilisées ce mois</span>
            <span>{percentUsed}%</span>
          </div>
        </div>
      )}

      {/* Upgrade prompt */}
      {needsUpgrade && (
        <Link
          to="/pricing"
          className="flex items-center justify-between p-3 bg-primary-light rounded-xl text-primary hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Zap size={16} />
            <span className="font-medium text-sm">Obtenir plus de recherches</span>
          </div>
          <ChevronRight size={16} />
        </Link>
      )}

      {/* Low usage warning — le chiffre exact, pas un conseil vague (Annexe A #13) */}
      {!needsUpgrade && !searches.unlimited && percentUsed >= 80 && (
        <div className="p-3 bg-amber-50 rounded-xl text-amber-700 text-sm">
          Plus que {searches.remaining} recherche{searches.remaining > 1 ? 's' : ''} ce mois-ci.
        </div>
      )}
    </div>
  );
}

export default SearchUsageWidget;
