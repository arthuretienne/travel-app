import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import useDashboardData from '../hooks/useDashboardData';
import { useFormat } from '../i18n/format';
import { EmptyState } from '../components/ui';
import HeroGreeting from '../components/dashboard/HeroGreeting';
import ActionCenter from '../components/dashboard/ActionCenter';
import NextTripSpotlight from '../components/dashboard/NextTripSpotlight';
import TripsSection from '../components/dashboard/TripsSection';
import InsightsRow from '../components/dashboard/InsightsRow';
import PriceAlertsPreview from '../components/dashboard/PriceAlertsPreview';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { fmtDate, fmtCurrency } = useFormat();

  const {
    loading,
    error,
    needsOnboarding,
    savedTrips,
    collaborativeTrips,
    priceAlerts,
    nextTrip,
    actionItems,
    heroContext,
    insights,
    refetch,
    helpers,
  } = useDashboardData();

  useEffect(() => {
    if (needsOnboarding) navigate('/onboarding');
  }, [needsOnboarding, navigate]);

  const handleCreateTrip = () => navigate('/create-trip');
  const formatDate = (dateStr) => (dateStr ? fmtDate(dateStr) : 'Date à définir');

  // Hero CTAs
  const handleHeroPrimary = () => {
    const { variant, next, priceDrop } = heroContext;
    if (variant === 'decisions') {
      window.scrollTo({ top: 200, behavior: 'smooth' });
    } else if (variant === 'countdown' && next) {
      if (next.kind === 'group') navigate(`/trips/${next.id}`);
      else navigate(`/saved-trips/${next.id}`);
    } else if (variant === 'priceDrop' && priceDrop) {
      navigate(priceDrop.deeplink || '/price-alerts');
    } else {
      handleCreateTrip();
    }
  };

  const handleHeroSecondary = () => {
    const { next } = heroContext;
    if (next?.kind === 'group') navigate(`/trips/${next.id}`);
    else if (next) navigate(`/saved-trips/${next.id}`);
  };

  const handleAction = (item) => {
    if (item.deeplink) navigate(item.deeplink);
  };

  const handleOpenNextTrip = () => {
    if (!nextTrip) return;
    if (nextTrip.kind === 'group') navigate(`/trips/${nextTrip.id}`);
    else navigate(`/saved-trips/${nextTrip.id}`);
  };

  const hasAnyTrip = (savedTrips?.length || 0) + (collaborativeTrips?.length || 0) > 0;

  // Global hard error
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-surface-subtle">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <EmptyState
            icon={<AlertTriangle size={28} />}
            title="Chargement impossible"
            sub={`Erreur : ${error}`}
            action={{ label: 'Réessayer', onClick: refetch, variant: 'primary' }}
          />
        </div>
      </div>
    );
  }

  // Initial blocking loader (only when we have nothing to show yet)
  if (loading && !hasAnyTrip && !heroContext) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface-subtle">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-ember-700" />
          <p className="text-sm text-text-secondary">Préparation de ton cockpit…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <HeroGreeting
          firstName={user?.firstName}
          context={heroContext}
          onPrimary={handleHeroPrimary}
          onSecondary={handleHeroSecondary}
          onCompose={handleCreateTrip}
        />

        <ActionCenter
          items={actionItems}
          loading={loading}
          onAct={handleAction}
          onPlan={handleCreateTrip}
          hasAnyTrip={hasAnyTrip}
        />

        <NextTripSpotlight
          trip={nextTrip}
          daysUntil={nextTrip ? helpers.daysUntil(nextTrip.startDate) : null}
          helpers={helpers}
          onOpen={handleOpenNextTrip}
          onPrimary={handleOpenNextTrip}
          onPdf={handleOpenNextTrip}
          onShare={handleOpenNextTrip}
          onPlan={handleCreateTrip}
        />

        <TripsSection
          savedTrips={savedTrips}
          collaborativeTrips={collaborativeTrips}
          loading={loading}
          error={null}
          formatDate={formatDate}
          fmtCurrency={fmtCurrency}
          onOpenSolo={(t) => navigate(`/saved-trips/${t.id}`)}
          onOpenGroup={(t) => navigate(`/trips/${t.id}`)}
          onAlert={() => navigate('/price-alerts')}
          onPdf={(t) => navigate(`/saved-trips/${t.id}`)}
          onShare={(t) => navigate(`/saved-trips/${t.id}`)}
          onDuplicate={() => navigate('/create-trip')}
          onRetry={refetch}
          onPlan={handleCreateTrip}
        />

        <InsightsRow insights={insights} />

        <PriceAlertsPreview
          alerts={priceAlerts}
          onCreate={() => navigate('/dashboard')}
        />
      </div>
    </div>
  );
}

export default Dashboard;
