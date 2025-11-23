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
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    button: 'bg-gray-600 hover:bg-gray-700',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
  EXPLORER: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    button: 'bg-blue-600 hover:bg-blue-700',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  WANDERER: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    button: 'bg-purple-600 hover:bg-purple-700',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
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
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-text-main mb-3">Choose Your Plan</h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Start planning amazing trips for free, or upgrade for unlimited access and advanced features.
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
                    POPULAR
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                    CURRENT PLAN
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
                        Loading...
                      </span>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : plan.id === 'FREE' ? (
                      'Free Forever'
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-text-main mb-4">Features:</h4>
                  <ul className="space-y-3">
                    <FeatureItem
                      value={formatFeatureValue(plan.features.maxSearchesPerMonth)}
                      label="AI searches per month"
                    />
                    <FeatureItem
                      value={formatFeatureValue(plan.features.maxGroupTrips)}
                      label="group trips"
                    />
                    <FeatureItem
                      value={formatFeatureValue(plan.features.maxMembersPerTrip)}
                      label="members per trip"
                    />
                    <FeatureItem
                      value={plan.features.aiRecommendations}
                      label="AI recommendations"
                    />
                    <FeatureItem
                      value={plan.features.flightSearch}
                      label="Flight search"
                    />
                    <FeatureItem
                      value={plan.features.hotelSearch}
                      label="Hotel search"
                    />
                    <FeatureItem
                      value={plan.features.collaborativeVoting}
                      label="Collaborative voting"
                    />
                    <FeatureItem
                      value={plan.features.prioritySupport}
                      label="Priority support"
                    />
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-text-main mb-4">Need help choosing?</h2>
          <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
            Start with the Free plan to try out our AI-powered travel recommendations.
            Upgrade anytime to unlock unlimited searches and group trip planning features.
          </p>
          <button
            onClick={() => navigate('/account')}
            className="text-primary font-semibold hover:underline"
          >
            Manage your subscription →
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
