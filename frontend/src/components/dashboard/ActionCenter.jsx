import { AlertTriangle, Sparkles, TrendingDown, Users, Vote } from 'lucide-react';
import { EmptyState } from '../ui';

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

function ActionItem({ item, onAct }) {
  const Icon = ICONS[item.type] || AlertTriangle;
  const toneClass = TONE_CLASSES[item.tone] || TONE_CLASSES.sand;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-[18px] border border-sand-200 bg-white p-4 shadow-1 transition-all hover:shadow-2 hover:border-sand-300">
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
              <span className="text-moss-500 font-semibold">{item.extra.after}€</span>
              <span className="ml-2 text-xs font-mono font-semibold text-moss-500">−{item.extra.drop}%</span>
            </>
          ) : (
            item.title
          )}
        </div>
        <div className="mt-0.5 text-sm text-text-secondary truncate">{item.sub}</div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onAct?.(item)}
          className="h-9 rounded-[10px] bg-sand-900 px-3.5 text-[13px] font-medium text-white transition-all hover:bg-sand-800"
        >
          {item.ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default function ActionCenter({ items, loading, error, onAct, onPlan, hasAnyTrip }) {
  if (loading) {
    return (
      <section className="mb-10 rounded-[22px] bg-surface-muted p-6">
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
  if (!items?.length && hasAnyTrip) return null;

  // Empty state only for new users
  if (!items?.length && !hasAnyTrip) {
    return (
      <section className="mb-10">
        <EmptyState
          icon={<Sparkles size={28} />}
          title="Rien d'urgent — bon moment pour explorer une nouvelle destination."
          sub="Tu n'as pas encore de trip. Lance une première recherche pour activer ton cockpit."
          action={{ label: 'Explorer', onClick: onPlan, variant: 'primary' }}
        />
      </section>
    );
  }

  return (
    <section className="mb-10 rounded-[22px] bg-surface-muted p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium text-text-main">
            À faire <em className="font-display italic text-ember-700 not-italic">maintenant</em>
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {items.length} élément{items.length > 1 ? 's' : ''} demande{items.length > 1 ? 'nt' : ''} ta décision · trié par urgence
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <ActionItem key={item.id} item={item} onAct={onAct} />
        ))}
      </div>
    </section>
  );
}
