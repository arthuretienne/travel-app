// frontend/src/pages/TripProposal.jsx
// Proposal acceptance page — shows AI recommendation + traveler count, then launches search
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  CalendarDays,
  Clock,
  TrendingUp,
  Info,
  Users,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  MapPin,
  Loader2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TRAVELER_OPTIONS = [
  { value: 1, label: 'Solo', description: 'Juste moi', tripType: 'solo' },
  { value: 2, label: 'Duo', description: 'À deux', tripType: 'couple' },
  { value: 3, label: '3 personnes', description: 'Petit groupe', tripType: 'friends' },
  { value: 4, label: '4 personnes', description: 'Groupe', tripType: 'friends' },
  { value: 6, label: '5-6 personnes', description: 'Grand groupe', tripType: 'friends' },
];

export default function TripProposal() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const proposal = location.state?.proposal;
  const [travelers, setTravelers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!proposal) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const startDate = new Date(proposal.startDate);
  const endDate = new Date(proposal.endDate);

  const formattedStart = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const formattedEnd = endDate.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const selectedOption = TRAVELER_OPTIONS.find(o => o.value === travelers) || TRAVELER_OPTIONS[1];

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      const payload = {
        basic: {
          destination: proposal.destination || '',
          budget: 1500,
          style: 'relaxation',
          tripType: selectedOption.tripType,
          activities: ['cultural', 'nature'],
          maxFlightHours: 12,
          destinationPreference: 'specific',
          travelers,
        },
        preferences: {
          climate: 'any',
          accommodation: 'hotel',
          pace: 'moderate',
          gastronomy: 'important',
          natureVsCity: 50,
          nightlife: 'optional',
          activitiesBudget: 20,
        },
        constraints: {
          budget: 1500,
          maxFlightHours: 12,
          avoidCountries: [],
        },
        availability: {
          startDate: proposal.startDate,
          endDate: proposal.endDate,
          duration: proposal.duration,
          timeHorizon: '6-mois',
          idealDuration: `${proposal.duration}-jours`,
          flexibleDates: false,
          preferredMonths: [],
          departureFlexibility: 'fixed',
        },
        chatbotPreferences: { tone: 'friendly' },
      };

      const response = await fetch(`${API_URL}/api/travel/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.recommendations) {
        navigate('/results', { state: { recommendations: data.recommendations } });
      } else {
        throw new Error(data.error || 'La recherche a échoué');
      }
    } catch (err) {
      console.error('TripProposal search error:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-5">
        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
          <Loader2 size={28} className="text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Recherche en cours…</p>
          <p className="text-sm text-gray-500 mt-1">
            On trouve les meilleurs vols et hébergements vers {proposal.destination || 'votre destination'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Back nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
          >
            <ChevronLeft size={18} />
            Retour au tableau de bord
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-2xl space-y-5">

          {/* Header */}
          <div className="text-center pb-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary bg-primary/8 px-3 py-1.5 rounded-full mb-4">
              <Sparkles size={12} />
              Suggestion personnalisée
            </div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              {proposal.title}
            </h1>
            {proposal.destination && (
              <div className="flex items-center justify-center gap-1.5 mt-2 text-gray-500">
                <MapPin size={15} />
                <span className="text-base">{proposal.destination}</span>
              </div>
            )}
          </div>

          {/* Proposal card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Key stats */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
              <div className="p-5 text-center">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Dates</div>
                <div className="font-semibold text-gray-900 text-sm leading-snug">
                  {startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  <span className="text-gray-400 mx-1">→</span>
                  {endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div className="p-5 text-center">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Durée</div>
                <div className="flex items-center justify-center gap-1.5 font-semibold text-gray-900">
                  <Clock size={14} className="text-gray-400" />
                  {proposal.duration} {proposal.duration === 1 ? 'jour' : 'jours'}
                </div>
              </div>
              <div className="p-5 text-center">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Économies</div>
                <div className="flex items-center justify-center gap-1 font-bold text-emerald-600 text-lg">
                  {proposal.savings}
                  <TrendingUp size={14} />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="p-6 border-b border-gray-50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                  <Info size={15} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Pourquoi maintenant ?</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{proposal.reason}</p>
                </div>
              </div>
              {proposal.tags && proposal.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
                  {proposal.tags.map((tag, idx) => {
                    const tagText = typeof tag === 'string' ? tag : (tag?.word || tag?.value || '');
                    if (!tagText) return null;
                    return (
                      <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                        #{tagText}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dates summary */}
            <div className="px-6 py-4 bg-gray-50/60 border-b border-gray-100 flex items-center gap-3">
              <CalendarDays size={16} className="text-gray-400 shrink-0" />
              <p className="text-sm text-gray-600 capitalize">
                {formattedStart}
                <span className="text-gray-400"> — </span>
                {formattedEnd}
              </p>
            </div>

            {/* Traveler count */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-gray-500" />
                <p className="text-sm font-semibold text-gray-900">Combien de voyageurs ?</p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {TRAVELER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTravelers(opt.value)}
                    className={`flex flex-col items-center py-3 px-2 rounded-2xl border-2 transition-all text-center ${
                      travelers === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <span className="font-bold text-sm leading-tight">{opt.label}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* CTAs */}
          <div className="space-y-3 pb-8">
            <button
              onClick={handleSearch}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-semibold text-base transition-colors flex items-center justify-center gap-2.5 shadow-lg shadow-gray-200"
            >
              Trouver vols & hébergements
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              Pas pour cette fois
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
