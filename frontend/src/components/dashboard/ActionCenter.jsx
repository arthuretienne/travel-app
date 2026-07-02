import { useState } from 'react';
import { AlertTriangle, Check, Sparkles, TrendingDown, Users, Vote, X } from 'lucide-react';
import { EmptyState } from '../ui';
import useSwipe from '../../hooks/useSwipe';

const ICONS = {
  'group-invite': Users,
  'vote-pending': Vote,
  'price-drop': TrendingDown,
  'upcoming-trip-incomplete': AlertTriangle,
  'ai-window-suggestion': Sparkles,
};

const TONE_CLASSES = {
  ember: 'bg-ember-50 text-ember-700',
  moss: 'bg-moss-100 text-[#3d5a24]',
  gold: 'bg-gold-100 text-[#7a5c1a]',
  clay: 'bg-clay-100 text-[#7a3a25]',
  sand: 'bg-sand-100 text-text-secondary',
};

function ActionItem({ item, onAct, onDismiss }) {
  const Icon = ICONS[item.type] || AlertTriangle;
  const toneClass = TONE_CLASSES[item.tone] || TONE_CLASSES.sand;

  const { handlers, offset, isSwiping, complete, threshold } = useSwipe({
    onSwipeLeft: () => onDismiss?.(item),
    onSwipeRight: () => onAct?.(item),
  });

  const intensity = Math.min(1, Math.abs(offset) / threshold);
  const direction = offset > 0 ? 'right' : offset < 0 ? 'left' : null;

  return (
    <div className="relative overflow-hidden rounded-[18px]">
      {/* Swipe hint backgrounds (mobile only) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between rounded-[18px] sm:hidden">
        <div
          className="flex h-full items-center pl-5 text-moss-700"
          style={{ opacity: direction === 'right' ? intensity : 0 }}
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-moss-100">
            <Check size={16} />
          </div>
          <span className="ml-3 text-xs font-mono font-semibold uppercase tracking-widest">
            {complete === 'right' ? 'Action…' : 'Glisse pour valider'}
          </span>
        </div>
        <div
          className="ml-auto flex h-full items-center pr-5 text-clay-500"
          style={{ opacity: direction === 'left' ? intensity : 0 }}
        >
          <span className="mr-3 text-xs font-mono font-semibold uppercase tracking-widest">
            {complete === 'left' ? 'Ignoré' : 'Glisse pour ignorer'}
          </span>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-clay-100">
            <X size={16} />
          </div>
        </div>
      </div>

      <div
        {...handlers}
        className="relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-[18px] border border-sand-200 bg-white p-4 shadow-1 transition-shadow hover:shadow-2 hover:border-sand-300 touch-pan-y select-none"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? 'none' : 'transform 220ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div className={['grid h-11 w-11 shrink-0 place-items-center rounded-[12px]', toneClass].join(' ')}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-widest text-text-secondary">{item.eyebrow}</div>
          <div className="mt-1 font-medium text-text-main">
            {item.type === 'price-drop' && item.extra ? (
              <>
                {item.title.split('·')[0].trim()}
                {' · '}
                <span className="line-through text-text-light text-sm">{item.extra.before}€</span>
                {' '}
                <span className="text-moss-700 font-semibold">{item.extra.after}€</span>
                <span className="ml-2 text-xs font-mono font-semibold text-moss-700">−{item.extra.drop}%</span>
              </>
            ) : (
              item.title
            )}
          </div>
          <div className="mt-0.5 text-sm text-text-secondary truncate">{item.sub}</div>
        </div>
        <div className="flex shrink-0 gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onAct?.(item)}
            className="h-10 sm:h-9 w-full sm:w-auto rounded-[10px] bg-sand-900 px-3.5 text-[13px] font-medium text-white transition-all hover:bg-sand-800"
          >
            {item.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActionCenter({ items, loading, error, onAct, onPlan, hasAnyTrip }) {
  // Client-side dismiss (session only — until /api/action-center/dismiss exists)
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const visibleItems = (items || []).filter((it) => !dismissedIds.has(it.id));

  const handleDismiss = (item) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
  };

  if (loading) {
    return (
      <section className="mb-10 rounded-[18px] sm:rounded-[22px] bg-surface-muted p-4 sm:p-6">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-medium text-text-main">
            À faire <em className="font-display italic text-ember-700 not-italic">maintenant</em>
          </h2>
          <p className="mt-1 text-sm text-text-secondary">Chargement des actions…</p>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[18px] border border-sand-200 bg-white" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-10">
        <div className="rounded-[18px] border border-sand-200 bg-white p-4 text-sm text-text-secondary">
          Impossible de charger les actions. <button onClick={() => window.location.reload()} className="font-medium text-ember-700 underline">Réessayer</button>
        </div>
      </section>
    );
  }

  // Hide if user has trips but no action items (too noisy otherwise)
  if (!visibleItems.length && hasAnyTrip) return null;

  // Empty state only for new users
  if (!visibleItems.length && !hasAnyTrip) {
    return (
      <section className="mb-10">
        <EmptyState
          icon={<Sparkles size={28} />}
          title="Rien d'urgent — bon moment pour explorer une nouvelle destination."
          sub="Vous n'avez pas encore de voyage. Lancez une première recherche pour commencer."
          action={{ label: 'Composer un voyage', onClick: onPlan, variant: 'primary' }}
        />
      </section>
    );
  }

  return (
    <section className="mb-10 rounded-[18px] sm:rounded-[22px] bg-surface-muted p-4 sm:p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium text-text-main">
            À faire <em className="font-display italic text-ember-700 not-italic">maintenant</em>
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {visibleItems.length} élément{visibleItems.length > 1 ? 's' : ''} attend{visibleItems.length > 1 ? 'ent' : ''} votre décision · trié par urgence
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {visibleItems.map((item) => (
          <ActionItem key={item.id} item={item} onAct={onAct} onDismiss={handleDismiss} />
        ))}
      </div>
      <p className="mt-3 hidden text-center text-[11px] font-mono uppercase tracking-widest text-text-light sm:hidden [@media(hover:none)]:block">
        ← glisse pour ignorer · valider →
      </p>
    </section>
  );
}
