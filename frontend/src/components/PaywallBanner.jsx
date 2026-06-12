// frontend/src/components/PaywallBanner.jsx
// Paywall au moment du blocage quota (Annexe A #13 audit V3) : les deux issues
// sont données (attendre le 1er du mois OU continuer tout de suite) et le CTA
// est ACTIF — le pic d'intention d'achat ne tombe plus sur un bouton mort.
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Loader2, Zap } from 'lucide-react';
import { track } from '../lib/analytics';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useTripPassCheckout() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startTripPass = async () => {
    try {
      setLoading(true);
      setError(null);
      track('checkout_started', { plan: 'TRIP_PASS', billing: 'one_time' });
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName: 'TRIP_PASS' }),
      });
      if (!res.ok) throw new Error('checkout failed');
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      console.error('[PaywallBanner] Trip Pass checkout error:', err);
      setError('Impossible de démarrer le paiement. Réessayez, ou passez par la page Tarifs.');
      setLoading(false);
    }
  };

  return { startTripPass, loading, error };
}

export default function PaywallBanner({ usage, context = 'paywall' }) {
  const { startTripPass, loading, error } = useTripPassCheckout();

  useEffect(() => {
    if (usage?.needsUpgrade) track('paywall_viewed', { context });
  }, [usage?.needsUpgrade, context]);

  if (!usage?.needsUpgrade) return null;

  const limit = usage.searches?.limit ?? 0;
  const now = new Date();
  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(now);
  const nextReset = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
    .format(new Date(now.getFullYear(), now.getMonth() + 1, 1))
    .replace(/^1 /, '1er ');

  return (
    <div className="rounded-2xl border border-gold-500/30 bg-gold-100 p-4 sm:p-5">
      <p className="text-sm font-medium leading-6 text-text-main">
        Vous avez utilisé vos {limit} recherches de {monthName}. Reprenez le {nextReset} — ou
        continuez maintenant :
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={startTripPass}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          Continuer avec un Trip Pass (5,99 €)
        </button>
        <Link to="/pricing" className="text-sm font-medium text-text-secondary underline-offset-2 hover:text-primary hover:underline">
          Voir les offres
        </Link>
      </div>
      {error && <p className="mt-2 text-sm text-clay-500">{error}</p>}
    </div>
  );
}
