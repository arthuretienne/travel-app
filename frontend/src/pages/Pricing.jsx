// frontend/src/pages/Pricing.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Check, X, Loader2, ArrowLeft, Sparkles, Zap, Crown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PLAN_ICONS = {
  FREE: Sparkles,
  EXPLORER: Zap,
  WANDERER: Crown,
};

const PLAN_COLORS = {
  FREE: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    button: 'bg-stone-600 hover:bg-stone-700',
    iconBg: 'bg-stone-100',
    iconColor: 'text-stone-600',
  },
  EXPLORER: {
    bg: 'bg-primary-light',
    border: 'border-primary/30',
    button: 'bg-primary hover:bg-primary-hover',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  WANDERER: {
    bg: 'bg-teal-50',
    border: 'border-teal-300',
    button: 'bg-teal-700 hover:bg-teal-800',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
  },
};

export default function Pricing() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/billing/plans`);
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
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
        setCurrentPlan(data.subscription.plan);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
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
      alert('Failed to start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  };

  const formatFeatureValue = (value) => {
    if (value === -1) return 'Unlimited';
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-main mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Retour au dashboard</span>
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-text-main mb-3">Choisissez votre formule</h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Commencez gratuitement ou passez à la version premium pour un accès illimité.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.id];
            const colors = PLAN_COLORS[plan.id];
            const isCurrentPlan = currentPlan === plan.id;
            const isPopular = plan.id === 'EXPLORER';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-card border-2 ${colors.border} overflow-hidden transition-transform hover:scale-105`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAIRE
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                    FORMULE ACTUELLE
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

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-text-main mb-4">Besoin d'aide pour choisir ?</h2>
          <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
            Commencez avec la formule gratuite pour tester nos recommandations IA.
            Passez en premium à tout moment pour des recherches illimitées et la planification en groupe.
          </p>
          <button
            onClick={() => navigate('/account')}
            className="text-primary font-semibold hover:underline"
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
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        )
      ) : (
        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      )}
      <span className={`text-sm ${isBoolean && !isAvailable ? 'text-gray-400 line-through' : 'text-text-secondary'}`}>
        {isBoolean ? label : `${value} ${label}`}
      </span>
    </li>
  );
}
