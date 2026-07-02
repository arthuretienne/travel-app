import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { AlertTriangle, Loader2, Plus, Sparkles } from 'lucide-react';
import useDashboardData from '../hooks/useDashboardData';
import { useFormat } from '../i18n/format';
import { Button, EmptyState } from '../components/ui';
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
          <p className="text-sm text-text-secondary">Préparation de votre espace…</p>
        </div>
      </div>
    );
  }

  // Dashboard vide = UNE action évidente, pas six CTA concurrents
  // (Annexe A #5 audit V3).
  if (!loading && !hasAnyTrip) {
    return (
      <div className="min-h-screen bg-surface-subtle">
        <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:py-28">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-ember-50 text-ember-700">
            <Sparkles size={26} />
          </span>
          <h1 className="mt-6 font-display text-4xl font-medium leading-tight text-text-main md:text-5xl">
            Où partez-vous en premier ?
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-text-secondary">
            Décrivez votre envie — Skusku compose la destination, les dates, le vol et l'hôtel.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={handleCreateTrip} icon={<Plus size={18} />}>
              Composer mon premier voyage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10 md:px-8 md:py-14">
        {/* Motion système (audit V3) : les sections montent en cascade douce */}
        <div className="sk-enter">
        <HeroGreeting
          firstName={user?.firstName}
          context={heroContext}
          onPrimary={handleHeroPrimary}
          onSecondary={handleHeroSecondary}
          onCompose={handleCreateTrip}
        />

        </div>
        <div className="sk-enter" style={{ '--rise-delay': '60ms' }}>
        <ActionCenter
          items={actionItems}
          loading={loading}
          onAct={handleAction}
          onPlan={handleCreateTrip}
          hasAnyTrip={hasAnyTrip}
        />

        </div>
        <div className="sk-enter" style={{ '--rise-delay': '120ms' }}>
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

        </div>
        <div className="sk-enter" style={{ '--rise-delay': '180ms' }}>
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

        </div>
        <div className="sk-enter" style={{ '--rise-delay': '240ms' }}>
        <InsightsRow insights={insights} />
        </div>

        <div className="sk-enter" style={{ '--rise-delay': '300ms' }}>
        <PriceAlertsPreview
          alerts={priceAlerts}
          onCreate={() => navigate('/dashboard')}
        />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
