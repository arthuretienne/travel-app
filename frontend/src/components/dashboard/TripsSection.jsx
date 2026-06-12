import { useEffect, useMemo, useState } from 'react';
import { Bell, Calendar, ChevronDown, ChevronRight, Copy, FileText, Map, MoreHorizontal, Search, Share2, X } from 'lucide-react';
import { AvatarStack, Badge, Button, EmptyState, PhotoBlock } from '../ui';

const TEMPORAL = ['upcoming', 'ongoing', 'past'];
const TYPE = ['all', 'solo', 'group'];

const isUpcoming = (start) => start && new Date(start).getTime() > Date.now();
const isOngoing = (start, end) => {
  if (!start || !end) return false;
  const now = Date.now();
  return new Date(start).getTime() <= now && now <= new Date(end).getTime();
};
const isPast = (end) => end && new Date(end).getTime() < Date.now();

const normalizeGroupDest = (trip) => {
  const fd = trip.finalDestination;
  if (!fd) return { city: trip.name, country: null };
  return {
    city: fd.city || fd.destination?.city || trip.name,
    country: fd.country || fd.destination?.country,
  };
};

function TripCard({ trip, onClick, onAlert, onPdf, onShare, onDuplicate, formatDate, fmtCurrency, onOpenSheet }) {
  const isGroup = trip._kind === 'group';
  const dest = isGroup ? normalizeGroupDest(trip) : { city: trip.city, country: trip.country };
  const start = isGroup ? trip.finalStartDate : trip.startDate;
  const end = isGroup ? trip.finalEndDate : trip.endDate;
  const days = start && end ? Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) : null;
  const daysUntil = start ? Math.ceil((new Date(start).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const pricing = isGroup ? trip.finalDestination?.pricing?.total : trip.tripData?.pricing?.total;
  const score = isGroup ? trip.finalDestination?.score?.total : trip.tripData?.score?.total;

  let badge = null;
  if (daysUntil !== null && daysUntil >= 0 && daysUntil <= 30) {
    badge = <Badge tone="ember" dot>J−{daysUntil}</Badge>;
  } else if (isGroup && trip.status === 'voting') {
    badge = <Badge tone="gold" dot>Action requise</Badge>;
  } else if (end && new Date(end).getTime() < Date.now()) {
    badge = <Badge tone="ink" dot>Passé</Badge>;
  }

  const people = isGroup
    ? (trip.members || []).map((m) => ({
        name: [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') || m.guestName || m.guestEmail || 'Invité',
        src: m.user?.imageUrl,
      }))
    : [];

  return (
    <div className="group relative overflow-hidden rounded-[18px] border border-sand-200 bg-white shadow-1 transition-all hover:border-ember-200 hover:shadow-2">
      <button type="button" onClick={onClick} className="block w-full text-left">
        <PhotoBlock
          city={dest.city}
          country={dest.country}
          tripData={isGroup ? trip.finalDestination : trip.tripData}
          className="h-40"
          alt={`${dest.city}, ${dest.country || ''}`}
        >
          {badge && <div className="absolute left-3 top-3">{badge}</div>}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h3 className="font-display text-2xl font-medium leading-none">{dest.city}</h3>
            <p className="mt-1 text-sm text-white/80">{dest.country || (isGroup ? `${trip.proposedTrips?.length || 0} props · vote en cours` : 'À confirmer')}</p>
          </div>
        </PhotoBlock>
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(start)}
            </span>
            {days && <span className="text-xs font-mono">{days} j</span>}
          </div>
          <div className="flex items-end justify-between">
            <div>
              {isGroup && people.length > 0 ? (
                <AvatarStack people={people} size={26} max={4} />
              ) : (
                <p className="font-display text-xl font-medium text-text-main">
                  {typeof pricing === 'number' ? fmtCurrency(pricing) : '—'}
                </p>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs font-mono font-semibold text-ember-700">
              {isGroup && trip.status === 'voting' ? 'Voter' : 'Voir'}
              <ChevronRight size={14} />
            </span>
          </div>
          {!isGroup && typeof score === 'number' && (
            <div className="mt-2 text-[11px] font-mono uppercase tracking-widest text-text-light">
              Score {Math.round(score)}%
            </div>
          )}
        </div>
      </button>

      {/* Desktop hover tray */}
      <div className="pointer-events-none absolute right-3 top-3 hidden gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 sm:flex">
        <TrayBtn title="Alerte prix" onClick={(e) => { e.stopPropagation(); onAlert?.(trip); }}>
          <Bell size={14} />
        </TrayBtn>
        <TrayBtn title="PDF" onClick={(e) => { e.stopPropagation(); onPdf?.(trip); }}>
          <FileText size={14} />
        </TrayBtn>
        <TrayBtn title="Partager" onClick={(e) => { e.stopPropagation(); onShare?.(trip); }}>
          <Share2 size={14} />
        </TrayBtn>
        <TrayBtn title="Dupliquer" onClick={(e) => { e.stopPropagation(); onDuplicate?.(trip); }}>
          <Copy size={14} />
        </TrayBtn>
      </div>

      {/* Mobile 3-dots — always visible */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenSheet?.(trip); }}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-text-secondary shadow-2 transition-all hover:bg-white hover:text-ember-700 sm:hidden"
        aria-label="Actions"
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}

function MobileActionSheet({ trip, onClose, onAlert, onPdf, onShare, onDuplicate }) {
  useEffect(() => {
    if (!trip) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [trip]);

  if (!trip) return null;

  const dest = trip._kind === 'group' ? (trip.finalDestination?.city || trip.name) : trip.city;
  const fire = (handler) => () => { onClose(); handler?.(trip); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:hidden">
      <div className="absolute inset-0 bg-sand-900/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full rounded-t-[22px] bg-white p-2 shadow-3 animate-fadeIn">
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-text-secondary">Actions</p>
            <p className="font-display text-lg font-medium text-text-main">{dest}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-text-secondary hover:bg-sand-100" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-1 pb-3">
          <SheetItem icon={<Bell size={18} />} label="Définir une alerte prix" onClick={fire(onAlert)} />
          <SheetItem icon={<FileText size={18} />} label="Exporter en PDF" onClick={fire(onPdf)} />
          <SheetItem icon={<Share2 size={18} />} label="Partager" onClick={fire(onShare)} />
          <SheetItem icon={<Copy size={18} />} label="Dupliquer la recherche" onClick={fire(onDuplicate)} />
        </div>
      </div>
    </div>
  );
}

function SheetItem({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-sm font-medium text-text-main transition-all hover:bg-sand-50"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-sand-100 text-ember-700">{icon}</span>
      {label}
    </button>
  );
}

function TrayBtn({ children, ...props }) {
  return (
    <button
      type="button"
      className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-text-secondary shadow-2 transition-all hover:bg-white hover:text-ember-700"
      {...props}
    >
      {children}
    </button>
  );
}

const PAGE_SIZE = 12;

export default function TripsSection({
  savedTrips,
  collaborativeTrips,
  loading,
  error,
  formatDate,
  fmtCurrency,
  onOpenSolo,
  onOpenGroup,
  onAlert,
  onPdf,
  onShare,
  onDuplicate,
  onRetry,
  onPlan,
}) {
  const [temporal, setTemporal] = useState('upcoming');
  const [type, setType] = useState('all');
  const [sortBy, setSortBy] = useState('date-asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sheetTrip, setSheetTrip] = useState(null);

  const totalTrips = (savedTrips?.length || 0) + (collaborativeTrips?.length || 0);
  const showSearch = totalTrips > 6;

  const allTrips = useMemo(() => {
    const solo = (savedTrips || []).map((t) => ({ ...t, _kind: 'solo' }));
    const group = (collaborativeTrips || []).map((t) => ({ ...t, _kind: 'group' }));
    return [...solo, ...group];
  }, [savedTrips, collaborativeTrips]);

  const counts = useMemo(() => {
    let upcoming = 0;
    let ongoing = 0;
    let past = 0;
    allTrips.forEach((t) => {
      const start = t._kind === 'group' ? t.finalStartDate : t.startDate;
      const end = t._kind === 'group' ? t.finalEndDate : t.endDate;
      if (!start || !end) return;
      if (isUpcoming(start)) upcoming++;
      else if (isOngoing(start, end)) ongoing++;
      else if (isPast(end)) past++;
    });
    return { upcoming, ongoing, past };
  }, [allTrips]);

  const filtered = useMemo(() => {
    let list = allTrips;

    // Temporal filter
    list = list.filter((t) => {
      const start = t._kind === 'group' ? t.finalStartDate : t.startDate;
      const end = t._kind === 'group' ? t.finalEndDate : t.endDate;
      if (!start) return false;
      if (temporal === 'upcoming') return isUpcoming(start);
      if (temporal === 'ongoing') return isOngoing(start, end);
      if (temporal === 'past') return isPast(end);
      return true;
    });

    // Type filter
    if (type !== 'all') {
      list = list.filter((t) => t._kind === type);
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => {
        const dest = t._kind === 'group' ? normalizeGroupDest(t) : { city: t.city, country: t.country };
        return (
          dest.city?.toLowerCase().includes(q) ||
          dest.country?.toLowerCase().includes(q) ||
          (t._kind === 'group' && t.name?.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      const aStart = a._kind === 'group' ? a.finalStartDate : a.startDate;
      const bStart = b._kind === 'group' ? b.finalStartDate : b.startDate;
      const aPrice = a._kind === 'group' ? a.finalDestination?.pricing?.total : a.tripData?.pricing?.total;
      const bPrice = b._kind === 'group' ? b.finalDestination?.pricing?.total : b.tripData?.pricing?.total;
      const aScore = a._kind === 'group' ? a.finalDestination?.score?.total : a.tripData?.score?.total;
      const bScore = b._kind === 'group' ? b.finalDestination?.score?.total : b.tripData?.score?.total;

      switch (sortBy) {
        case 'date-asc':
          return new Date(aStart || 0) - new Date(bStart || 0);
        case 'date-desc':
          return new Date(bStart || 0) - new Date(aStart || 0);
        case 'score-desc':
          return (bScore || 0) - (aScore || 0);
        case 'price-asc':
          return (aPrice || Infinity) - (bPrice || Infinity);
        case 'price-desc':
          return (bPrice || 0) - (aPrice || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [allTrips, temporal, type, search, sortBy]);

  // Default sort by past = date-desc
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;

  const handleClick = (trip) => {
    if (trip._kind === 'group') onOpenGroup?.(trip);
    else onOpenSolo?.(trip);
  };

  return (
    <section className="mb-10 rounded-[22px] bg-surface-muted p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-medium text-text-main">
            Mes <em className="font-display italic text-ember-700 not-italic">trips</em>
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {totalTrips} au total · {counts.upcoming} à venir · {counts.ongoing} en cours · {counts.past} passés
          </p>
        </div>
      </div>

      <div className="mb-5 -mx-4 sm:mx-0 flex items-center gap-3 overflow-x-auto px-4 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <div className="inline-flex shrink-0 rounded-full bg-white p-1 shadow-1">
          {TEMPORAL.map((key) => {
            const label = key === 'upcoming' ? 'À venir' : key === 'ongoing' ? 'En cours' : 'Passés';
            const count = counts[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setTemporal(key); setPage(1); setSortBy(key === 'past' ? 'date-desc' : 'date-asc'); }}
                className={[
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5',
                  temporal === key ? 'bg-sand-900 text-white' : 'text-text-secondary hover:text-text-main',
                ].join(' ')}
              >
                {label}
                {count > 0 && (
                  <span className={['rounded-full px-1.5 py-0.5 text-[10px] font-mono', temporal === key ? 'bg-white/20' : 'bg-sand-100 text-text-secondary'].join(' ')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="inline-flex shrink-0 rounded-full bg-white p-1 shadow-1">
          {TYPE.map((key) => {
            const label = key === 'all' ? 'Tous' : key === 'solo' ? 'Solo' : 'Groupe';
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setType(key); setPage(1); }}
                className={[
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                  type === key ? 'bg-sand-900 text-white' : 'text-text-secondary hover:text-text-main',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none rounded-full border border-sand-200 bg-white px-4 py-2 pr-9 text-xs font-medium text-text-main shadow-1 focus:outline-none focus:ring-2 focus:ring-ember-200"
          >
            <option value="date-asc">Tri · Date ↑</option>
            <option value="date-desc">Tri · Date ↓</option>
            <option value="score-desc">Tri · Score</option>
            <option value="price-asc">Tri · Prix ↑</option>
            <option value="price-desc">Tri · Prix ↓</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        </div>

        {showSearch && (
          <div className="relative ml-auto hidden items-center sm:flex">
            <Search size={14} className="absolute left-3 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Chercher par destination…"
              className="h-9 w-64 rounded-full border border-sand-200 bg-white pl-9 pr-3 text-sm text-text-main shadow-1 focus:outline-none focus:ring-2 focus:ring-ember-200"
            />
          </div>
        )}
      </div>

      {showSearch && (
        <div className="mb-5 -mt-2 sm:hidden">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Chercher par destination…"
              className="h-10 w-full rounded-full border border-sand-200 bg-white pl-9 pr-3 text-sm text-text-main shadow-1 focus:outline-none focus:ring-2 focus:ring-ember-200"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-[18px] border border-sand-200 bg-white" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<Map size={28} />}
          title="Impossible de charger vos voyages"
          sub={error}
          action={{ label: 'Réessayer', onClick: onRetry, variant: 'primary' }}
        />
      ) : visible.length === 0 ? (
        totalTrips === 0 ? (
          <EmptyState
            icon={<Map size={30} />}
            title="Et après ?"
            sub="Décrivez votre prochaine envie — Skusku compose la destination, les dates, le vol et l'hôtel."
            action={{ label: 'Planifier', onClick: onPlan, iconRight: <ChevronRight size={14} /> }}
          />
        ) : (
          <EmptyState
            icon={<Map size={28} />}
            title="Aucun trip pour ce filtre"
            sub="Élargissez votre sélection ou lancez une nouvelle recherche."
            action={{ label: 'Tout afficher', onClick: () => { setTemporal('upcoming'); setType('all'); setSearch(''); }, variant: 'outline' }}
          />
        )
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((trip) => (
              <TripCard
                key={`${trip._kind}-${trip.id}`}
                trip={trip}
                onClick={() => handleClick(trip)}
                onAlert={onAlert}
                onPdf={onPdf}
                onShare={onShare}
                onDuplicate={onDuplicate}
                onOpenSheet={setSheetTrip}
                formatDate={formatDate}
                fmtCurrency={fmtCurrency}
              />
            ))}
          </div>
          <MobileActionSheet
            trip={sheetTrip}
            onClose={() => setSheetTrip(null)}
            onAlert={onAlert}
            onPdf={onPdf}
            onShare={onShare}
            onDuplicate={onDuplicate}
          />
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setPage(page + 1)} iconRight={<ChevronDown size={14} />}>
                Afficher {Math.min(PAGE_SIZE, filtered.length - visible.length)} trips de plus
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
