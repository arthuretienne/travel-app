import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Bell,
  Calendar,
  ChevronRight,
  Globe,
  Map,
  Plane,
  Plus,
  Target,
  Users,
} from 'lucide-react';
import { AvatarStack, Badge, Button, EmptyState, PhotoBlock, StatCard } from '../components/ui';
import { useFormat } from '../i18n/format';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const { fmtDate, fmtCurrency } = useFormat();
  const [savedTrips, setSavedTrips] = useState([]);
  const [collaborativeTrips, setCollaborativeTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (user) {
      checkOnboardingAndFetchData();
    }
  }, [user]);

  const checkOnboardingAndFetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const prefsResponse = await fetch(`${API_URL}/api/users/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json();
        if (!prefsData.preferences || !prefsData.preferences.onboardingCompleted) {
          navigate('/onboarding');
          return;
        }
      }

      const tripsResponse = await fetch(`${API_URL}/api/searches/trips/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!tripsResponse.ok) {
        const errorData = await tripsResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch saved trips (${tripsResponse.status})`);
      }

      const tripsData = await tripsResponse.json();
      setSavedTrips(tripsData.savedTrips || []);

      const collabResponse = await fetch(`${API_URL}/api/trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (collabResponse.ok) {
        const collabData = await collabResponse.json();
        setCollaborativeTrips([
          ...(collabData.data?.createdTrips || []),
          ...(collabData.data?.memberTrips || []),
        ]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const tripsResponse = await fetch(`${API_URL}/api/searches/trips/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!tripsResponse.ok) {
        const errorData = await tripsResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch saved trips (${tripsResponse.status})`);
      }

      const tripsData = await tripsResponse.json();
      setSavedTrips(tripsData.savedTrips || []);
    } catch (err) {
      console.error('Error fetching saved trips:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = () => navigate('/create-trip');

  const formatDate = (dateStr) => (dateStr ? fmtDate(dateStr) : t('dashboard.dateTBD'));

  const stats = useMemo(() => {
    const countryCount = new Set(savedTrips.map((trip) => trip.country).filter(Boolean)).size;
    const avgScore = savedTrips.length > 0
      ? Math.round(savedTrips.reduce((acc, trip) => acc + (trip.tripData?.score?.total || 0), 0) / savedTrips.length)
      : null;

    return [
      { label: t('dashboard.statSaved'), value: loading ? '...' : savedTrips.length, icon: <Plane size={21} />, delta: savedTrips.length > 0 ? t('dashboard.statActive') : null },
      { label: t('dashboard.statExplored'), value: loading ? '...' : (countryCount || '0'), icon: <Globe size={21} /> },
      { label: t('dashboard.statCompat'), value: loading ? '...' : (avgScore ? `${avgScore}%` : '-'), icon: <Target size={21} />, delta: avgScore ? t('dashboard.statAligned') : null },
      { label: t('dashboard.statGroup'), value: loading ? '...' : collaborativeTrips.length, icon: <Users size={21} />, progress: Math.min(100, collaborativeTrips.length * 25) },
    ];
  }, [collaborativeTrips.length, loading, savedTrips, t]);

  const soloTripsFiltered = activeFilter === 'group' ? [] : savedTrips;
  const groupTripsFiltered = activeFilter === 'solo' ? [] : collaborativeTrips;
  const hasTrips = savedTrips.length > 0 || collaborativeTrips.length > 0;
  const totalTrips = savedTrips.length + collaborativeTrips.length;

  return (
    <div className="min-h-screen bg-surface-subtle">
      <div className="border-b border-sand-200 bg-surface-subtle">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">{t('dashboard.eyebrow')}</p>
            <h1 className="mt-2 font-display text-4xl font-medium leading-tight text-text-main md:text-[40px]">
              {t('dashboard.welcome', { name: user?.firstName || t('dashboard.voyagerFallback') })}
            </h1>
            <p className="mt-2 text-text-secondary">
              {t('dashboard.tripsInSpace', { count: totalTrips })}
            </p>
          </div>
          <Button onClick={handleCreateTrip} icon={<Plus size={18} />}>
            {t('dashboard.newTrip')}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <NextGetawayWidget onCreate={handleCreateTrip} />

        <Link
          to="/price-alerts"
          className="mb-8 mt-6 flex items-center justify-between rounded-[18px] border border-sand-200 bg-white p-5 shadow-1 transition-all hover:border-gold-500/40 hover:shadow-2"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-gold-100 text-gold-500">
              <Bell size={21} />
            </div>
            <div>
              <h3 className="font-semibold text-text-main">{t('dashboard.priceAlerts')}</h3>
              <p className="text-sm text-text-secondary">{t('dashboard.priceAlertsDesc')}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-text-secondary" />
        </Link>

        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-3xl font-medium text-text-main">{t('dashboard.myTrips')}</h2>
            <div className="flex w-fit rounded-full bg-sand-100 p-1">
              {[
                ['all', t('dashboard.filterAll')],
                ['solo', t('dashboard.filterSolo')],
                ['group', t('dashboard.filterGroup')],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-medium transition-all',
                    activeFilter === key ? 'bg-white text-text-main shadow-1' : 'text-text-secondary hover:text-text-main',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingGrid />
          ) : error ? (
            <EmptyState
              icon={<AlertTriangle size={28} />}
              title={t('dashboard.loadErrorTitle')}
              sub={t('dashboard.loadErrorSub', { error })}
              action={{ label: t('dashboard.retry'), onClick: fetchSavedTrips, variant: 'primary' }}
            />
          ) : !hasTrips ? (
            <EmptyState
              icon={<Map size={30} />}
              title={t('dashboard.emptyTitle')}
              sub={t('dashboard.emptySub')}
              action={{ label: t('dashboard.plan'), onClick: handleCreateTrip, iconRight: <ChevronRight size={16} /> }}
            />
          ) : (
            <div className="space-y-8">
              {soloTripsFiltered.length > 0 && (
                <TripSection title={activeFilter === 'all' ? t('dashboard.soloTrips') : null}>
                  {soloTripsFiltered.map((trip, index) => (
                    <SoloTripCard
                      key={`solo-${trip.id || index}`}
                      trip={trip}
                      formatDate={formatDate}
                      fmtCurrency={fmtCurrency}
                      onClick={() => navigate(`/saved-trips/${trip.id}`)}
                    />
                  ))}
                </TripSection>
              )}

              {groupTripsFiltered.length > 0 && (
                <TripSection title={activeFilter === 'all' ? t('dashboard.groupTrips') : null}>
                  {groupTripsFiltered.map((trip) => (
                    <GroupTripCard
                      key={`group-${trip.id}`}
                      trip={trip}
                      formatDate={formatDate}
                      onClick={() => navigate(`/trips/${trip.id}`)}
                    />
                  ))}
                </TripSection>
              )}
            </div>
          )}
        </section>

        {savedTrips.length > 0 && (
          <div className="mt-10 rounded-[22px] bg-sand-900 p-8 text-center text-white shadow-3">
            <h3 className="font-display text-3xl font-medium">{t('dashboard.again')}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/65">{t('dashboard.againDesc')}</p>
            <Button variant="outline" className="mt-6" onClick={handleCreateTrip} iconRight={<ChevronRight size={16} />}>
              {t('dashboard.planAnother')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function NextGetawayWidget({ onCreate }) {
  const { t } = useTranslation();
  return (
    <section className="overflow-hidden rounded-[22px] border border-sand-200 bg-white shadow-2">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-sand-200 p-6 lg:border-b-0 lg:border-r lg:p-7">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge tone="ember" dot>{t('dashboard.nextGetaways')}</Badge>
              <h2 className="mt-4 font-display text-3xl font-medium leading-tight">
                {t('dashboard.beforeSummer')} <span className="italic text-ember-700">{t('dashboard.summerWord')}</span> ?
              </h2>
              <p className="mt-2 text-sm text-text-secondary">{t('dashboard.bestMoments')}</p>
            </div>
            <div className="flex w-fit rounded-full bg-sand-100 p-1 text-xs">
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-1">{t('dashboard.soon')}</span>
              <span className="px-3 py-1.5 font-medium text-text-secondary">{t('dashboard.later')}</span>
            </div>
          </div>
          <MiniCalendar />
        </div>

        <div className="bg-gradient-to-b from-sand-50 to-white p-6 lg:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">{t('dashboard.recommendedPeriod')}</p>
          <h3 className="mt-2 font-display text-4xl font-medium">{t('dashboard.demoTitle')}</h3>
          <p className="mt-1 text-sm text-text-secondary">{t('dashboard.demoDates')}</p>
          <PhotoBlock city="Rome" country="Italy" className="mt-5 h-36 rounded-[16px]" alt="Rome" />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-sand-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">{t('dashboard.savings')}</p>
              <p className="mt-1 font-display text-3xl text-moss-500">€120</p>
            </div>
            <div className="rounded-[14px] border border-sand-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">{t('dashboard.reliability')}</p>
              <p className="mt-1 font-display text-3xl">92%</p>
            </div>
          </div>

          <div className="mt-3 rounded-[14px] border border-sand-200 border-l-gold-500 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">{t('dashboard.whyPeriod')}</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{t('dashboard.whyPeriodDesc')}</p>
          </div>

          <Button variant="ink" full className="mt-5" onClick={onCreate} iconRight={<ChevronRight size={16} />}>
            {t('dashboard.composeProposal')}
          </Button>
        </div>
      </div>
    </section>
  );
}

function MiniCalendar() {
  const { t } = useTranslation();
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const highlight = [21, 22, 23, 24];
  const weekdays = t('dashboard.weekdaysMin', { returnObjects: true });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-lg font-medium">{t('dashboard.demoMonth')}</p>
        <div className="flex gap-2 text-xs text-text-secondary">
          <span className="rounded-full bg-ember-50 px-2.5 py-1 text-ember-800">{t('dashboard.idealWindow')}</span>
        </div>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs text-text-secondary">
        {(Array.isArray(weekdays) ? weekdays : []).map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 3 }).map((_, index) => <div key={`empty-${index}`} />)}
        {days.map((day) => {
          const isMain = day === 21;
          const isHighlighted = highlight.includes(day);
          return (
            <div
              key={day}
              className={[
                'grid aspect-square place-items-center rounded-full text-sm',
                isMain ? 'bg-primary font-bold text-white shadow-[0_0_0_4px_var(--color-ember-100)]' : '',
                !isMain && isHighlighted ? 'bg-ember-50 font-medium text-ember-800' : '',
                !isHighlighted ? 'text-text-secondary' : '',
              ].join(' ')}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TripSection({ title, children }) {
  return (
    <div>
      {title && <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary">{title}</h3>}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function SoloTripCard({ trip, formatDate, fmtCurrency, onClick }) {
  const { t } = useTranslation();
  const score = trip.tripData?.score?.total ? Math.round(trip.tripData.score.total) : null;
  const days = trip.startDate && trip.endDate
    ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-[18px] border border-sand-200 bg-white text-left shadow-1 transition-all hover:border-ember-200 hover:shadow-2"
    >
      <PhotoBlock city={trip.city} country={trip.country} tripData={trip.tripData} className="h-40" alt={`${trip.city}, ${trip.country}`}>
        {score && <Badge tone="ember" className="absolute right-3 top-3 bg-white/90">{score}%</Badge>}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-display text-2xl font-medium leading-none">{trip.city || t('dashboard.destination')}</h3>
          <p className="mt-1 text-sm text-white/75">{trip.country || t('dashboard.toConfirm')}</p>
        </div>
      </PhotoBlock>
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between text-sm text-text-secondary">
          <span className="flex items-center gap-1.5"><Calendar size={14} />{formatDate(trip.startDate)}</span>
          {days && <span>{t('dashboard.daysShort', { count: days })}</span>}
        </div>
        <div className="flex items-end justify-between">
          <p className="font-display text-2xl font-medium text-text-main">
            {trip.tripData?.pricing?.total ? fmtCurrency(trip.tripData.pricing.total) : '-'}
          </p>
          <span className="flex items-center gap-1 text-sm font-medium text-ember-700 opacity-0 transition-opacity group-hover:opacity-100">
            {t('dashboard.view')} <ChevronRight size={15} />
          </span>
        </div>
      </div>
    </button>
  );
}

function GroupTripCard({ trip, formatDate, onClick }) {
  const { t } = useTranslation();
  const destination = trip.finalDestination;
  const people = (trip.members || []).map((member) => ({
    name: [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' ') || member.email || t('dashboard.inviteFallback'),
    src: member.user?.imageUrl,
  }));

  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-[18px] border border-sand-200 bg-white text-left shadow-1 transition-all hover:border-ember-200 hover:shadow-2"
    >
      <PhotoBlock
        city={destination?.city || trip.name}
        country={destination?.country}
        className="h-40"
        alt={trip.name}
      >
        <div className="absolute left-3 top-3">
          <Badge tone={destination ? 'moss' : 'gold'} dot className="bg-white/90">
            {destination ? t('dashboard.confirmed') : trip.status === 'voting' ? t('dashboard.voting') : t('dashboard.planning')}
          </Badge>
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-text-main">
          {t('dashboard.people', { count: trip.members?.length || 0 })}
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-display text-2xl font-medium leading-none">{destination?.city || trip.name}</h3>
          <p className="mt-1 text-sm text-white/75">{destination ? destination.country : t('dashboard.chooseDest')}</p>
        </div>
      </PhotoBlock>
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between text-sm text-text-secondary">
          <span className="flex items-center gap-1.5"><Calendar size={14} />{formatDate(trip.finalStartDate)}</span>
          {people.length > 0 && <AvatarStack people={people} size={26} max={4} />}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            {destination ? t('dashboard.coordinate') : t('dashboard.proposals', { count: trip.proposedTrips?.length || 0 })}
          </p>
          <span className="flex items-center gap-1 text-sm font-medium text-ember-700 opacity-0 transition-opacity group-hover:opacity-100">
            {t('dashboard.view')} <ChevronRight size={15} />
          </span>
        </div>
      </div>
    </button>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="overflow-hidden rounded-[18px] border border-sand-200 bg-white shadow-1">
          <div className="h-40 animate-pulse bg-sand-100" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-sand-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-sand-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
