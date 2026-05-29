import { Bell, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../ui';

const monthShort = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short' });
};

function computeTrend(alert) {
  if (!alert.currentPrice || !alert.initialPrice) return { kind: 'flat', label: 'Stable', delta: 0 };
  const delta = Math.round(((alert.currentPrice - alert.initialPrice) / alert.initialPrice) * 100);
  if (delta <= -5) return { kind: 'down', label: `${delta}%`, delta };
  if (delta >= 5) return { kind: 'up', label: `+${delta}%`, delta };
  return { kind: 'flat', label: 'Stable', delta };
}

function AlertRow({ alert }) {
  const trend = computeTrend(alert);
  const triggered = alert.currentPrice && alert.currentPrice <= alert.targetPrice;

  const trendClass = trend.kind === 'down'
    ? 'bg-moss-100 text-[#3d5a24]'
    : trend.kind === 'up'
    ? 'bg-clay-100 text-[#7a3a25]'
    : 'bg-sand-100 text-text-secondary';

  return (
    <Link
      to={`/price-alerts`}
      className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 rounded-[14px] border border-sand-200 bg-white px-4 py-3 shadow-1 transition-all hover:border-ember-200 hover:shadow-2"
    >
      <div className={['grid h-8 w-8 place-items-center rounded-full', triggered ? 'bg-moss-100 text-[#3d5a24]' : 'bg-ember-50 text-ember-700'].join(' ')}>
        <Bell size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-main truncate">{alert.destination}</div>
        <div className="text-xs font-mono text-text-secondary truncate">
          {alert.origin} → {alert.destination?.slice(0, 3).toUpperCase()} · {monthShort(alert.departureDate)}
        </div>
      </div>
      <div className="hidden sm:block">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-light">Seuil</div>
        <div className="text-sm font-mono text-text-secondary">≤ {alert.targetPrice}€</div>
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-light">Actuel</div>
        <div className={['text-sm font-mono font-semibold', triggered ? 'text-moss-500' : 'text-text-main'].join(' ')}>
          {alert.currentPrice ? `${Math.round(alert.currentPrice)}€` : '—'}
        </div>
      </div>
      <div className={['inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-mono font-semibold', trendClass].join(' ')}>
        {trend.kind === 'down' && <TrendingDown size={11} />}
        {trend.kind === 'up' && <TrendingUp size={11} />}
        {trend.label}
      </div>
      <ChevronRight size={16} className="text-text-secondary" />
    </Link>
  );
}

export default function PriceAlertsPreview({ alerts, onCreate }) {
  // Sort: triggered first, then closest to target
  const sorted = (alerts || [])
    .slice()
    .sort((a, b) => {
      const aTrig = a.currentPrice && a.currentPrice <= a.targetPrice ? 0 : 1;
      const bTrig = b.currentPrice && b.currentPrice <= b.targetPrice ? 0 : 1;
      if (aTrig !== bTrig) return aTrig - bTrig;
      const aDist = Math.abs((a.currentPrice || Infinity) - a.targetPrice);
      const bDist = Math.abs((b.currentPrice || Infinity) - b.targetPrice);
      return aDist - bDist;
    })
    .slice(0, 3);

  if (sorted.length === 0) {
    return (
      <section className="mb-10 rounded-[22px] bg-surface-muted p-6">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-medium text-text-main">
            Alertes <em className="font-display italic text-ember-700 not-italic">de prix</em>
          </h2>
        </div>
        <EmptyState
          icon={<Bell size={26} />}
          title="Aucune alerte active"
          sub="Crée-en une depuis n'importe quel trip sauvegardé pour suivre les baisses."
          action={{ label: 'Voir mes trips', onClick: onCreate, variant: 'outline' }}
        />
      </section>
    );
  }

  return (
    <section className="mb-10 rounded-[22px] bg-surface-muted p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium text-text-main">
            Alertes <em className="font-display italic text-ember-700 not-italic">de prix</em>
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {sorted.length} active{sorted.length > 1 ? 's' : ''} · suit l'évolution des prix
          </p>
        </div>
        <Link to="/price-alerts" className="text-xs font-mono font-semibold text-ember-700 uppercase tracking-widest hover:text-ember-800">
          Tout voir →
        </Link>
      </div>
      <div className="space-y-2">
        {sorted.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
    </section>
  );
}
