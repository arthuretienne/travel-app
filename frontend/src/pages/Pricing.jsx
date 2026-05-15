// frontend/src/pages/Pricing.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Check, X, Loader2, ArrowLeft, Sparkles, Zap, Crown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PLAN_ICONS = {
  FREE: Sparkles,
  EXPLORER: Zap,
  WANDERER: Crown,
};

const PLAN_COLORS = {
  FREE: {
    bg: 'bg-sand-50',
    border: 'border-sand-200',
    button: 'bg-sand-600 hover:bg-sand-700',
    iconBg: 'bg-sand-100',
    iconColor: 'text-sand-600',
  },
  EXPLORER: {
    bg: 'bg-primary-light',
    border: 'border-primary/30',
    button: 'bg-primary hover:bg-primary-hover',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  WANDERER: {
    bg: 'bg-ember-50',
    border: 'border-ember-300',
    button: 'bg-ember-700 hover:bg-ember-800',
    iconBg: 'bg-ember-100',
    iconColor: 'text-ember-700',
  },
};

export default function Pricing() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  const [plansError, setPlansError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPlansError(false);
      await Promise.allSettled([fetchPlans(cancelled), fetchCurrentSubscription()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchPlans = async (cancelled) => {
    try {
      const response = await fetch(`${API_URL}/api/billing/plans`);
      if (!response.ok) throw new Error(`plans ${response.status}`);
      const data = await response.json();
      if (cancelled) return;
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      if (!cancelled) setPlansError(true);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.subscription?.plan ?? null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSubscribe = async (planId) => {
    if (planId === 'FREE') {
      return; // Can't checkout for free plan
    }

    try {
      setCheckoutLoading(planId);
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/billing/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planName: planId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      setCheckoutError('Impossible de démarrer le paiement. Veuillez réessayer.');
      setCheckoutLoading(null);
    }
  };

  const formatFeatureValue = (value) => {
    if (value === -1) return 'Illimité';
    if (value === true) return true;
    if (value === false) return false;
    return value;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      {checkoutError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium bg-clay-500 text-white">
          ✕ {checkoutError}
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-sand-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-main mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Retour au tableau de bord</span>
          </button>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-3">Choisissez votre formule</h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-4">
              Commencez gratuitement ou passez à la version premium pour des recherches illimitées.
            </p>
            <p className="text-sm text-text-secondary">
              Paiement sécurisé · Annulation à tout moment · Sans engagement
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {plansError || plans.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[20px] border border-sand-200 bg-white p-10 text-center shadow-1">
            <h3 className="font-display text-2xl font-medium text-text-main">
              Tarifs momentanément indisponibles
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-text-secondary">
              Le service de facturation ne répond pas pour le moment. Réessayez dans un instant.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Réessayer
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.id];
            const colors = PLAN_COLORS[plan.id];
            const isCurrentPlan = currentPlan === plan.id;
            const isPopular = plan.id === 'EXPLORER';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 ${colors.border} overflow-hidden transition-all hover:shadow-lg ${isPopular ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                {isPopular && (
                  <div className="absolute top-0 inset-x-0 flex justify-center">
                    <div className="bg-primary text-white text-xs font-bold px-4 py-1 rounded-b-lg">
                      Le plus populaire
                    </div>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-3 right-3 bg-moss-100 text-moss-500 text-xs font-bold px-2.5 py-1 rounded-full">
                    Formule actuelle
                  </div>
                )}

                <div className={`${colors.bg} p-6 border-b ${colors.border}`}>
                  <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.iconColor}`} />
                  </div>

                  <h3 className="text-2xl font-bold text-text-main mb-2">{plan.name}</h3>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold text-text-main">
                      €{plan.price}
                    </span>
                    {plan.interval && (
                      <span className="text-text-secondary">/{plan.interval}</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentPlan || checkoutLoading === plan.id || plan.id === 'FREE'}
                    className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors.button}`}
                  >
                    {checkoutLoading === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Chargement...
                      </span>
                    ) : isCurrentPlan ? (
                      'Formule actuelle'
                    ) : plan.id === 'FREE' ? (
                      'Gratuit à vie'
                    ) : (
                      'S\'abonner'
                    )}
                  </button>
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-text-main mb-4">Fonctionnalités :</h4>
                  <ul className="space-y-3">
                    <FeatureItem
                      value={formatFeatureValue(plan.features.maxSearchesPerMonth)}
                      label="recherches IA / mois"
                    />
                    <FeatureItem
                      value={formatFeatureValue(plan.features.maxGroupTrips)}
                      label="voyages de groupe"
                    />
                    <FeatureItem
                      value={formatFeatureValue(plan.features.maxMembersPerTrip)}
                      label="membres par voyage"
                    />
                    <FeatureItem
                      value={plan.features.aiRecommendations}
                      label="Recommandations IA"
                    />
                    <FeatureItem
                      value={plan.features.flightSearch}
                      label="Recherche de vols"
                    />
                    <FeatureItem
                      value={plan.features.hotelSearch}
                      label="Recherche d'hôtels"
                    />
                    <FeatureItem
                      value={plan.features.collaborativeVoting}
                      label="Vote collaboratif"
                    />
                    <FeatureItem
                      value={plan.features.prioritySupport}
                      label="Support prioritaire"
                    />
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Trust signals */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { icon: '🔒', title: 'Paiement sécurisé', desc: 'Stripe — norme bancaire SSL' },
            { icon: '↩️', title: 'Annulation facile', desc: 'À tout moment depuis votre compte' },
            { icon: '💬', title: 'Support réactif', desc: 'Réponse en moins de 24h' },
          ].map(item => (
            <div key={item.title} className="text-center p-5 bg-white rounded-xl border border-sand-100">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-medium text-text-main text-sm">{item.title}</div>
              <div className="text-xs text-text-secondary mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center">
          <p className="text-text-secondary mb-3 max-w-2xl mx-auto text-sm">
            Commencez avec la formule gratuite pour tester nos recommandations IA.
            Passez en premium à tout moment pour des recherches illimitées et la planification en groupe.
          </p>
          <button
            onClick={() => navigate('/account')}
            className="text-primary text-sm font-semibold hover:underline"
          >
            Gérer mon abonnement →
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ value, label }) {
  const isBoolean = typeof value === 'boolean';
  const isAvailable = isBoolean ? value : true;

  return (
    <li className="flex items-start gap-3">
      {isBoolean ? (
        isAvailable ? (
          <Check className="w-5 h-5 text-moss-500 flex-shrink-0 mt-0.5" />
        ) : (
          <X className="w-5 h-5 text-clay-500 flex-shrink-0 mt-0.5" />
        )
      ) : (
        <Check className="w-5 h-5 text-moss-500 flex-shrink-0 mt-0.5" />
      )}
      <span className={`text-sm ${isBoolean && !isAvailable ? 'text-sand-400 line-through' : 'text-text-secondary'}`}>
        {isBoolean ? label : `${value} ${label}`}
      </span>
    </li>
  );
}
