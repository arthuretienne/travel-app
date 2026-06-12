import { ChevronRight, Plus, TrendingDown, Vote } from 'lucide-react';
import { Button } from '../ui';

const greetingByHour = (h) => {
  if (h >= 5 && h < 11) return 'Bonjour';
  if (h >= 11 && h < 18) return 'Bonjour';
  return 'Bonsoir';
};

const formatDateHeader = (date) => {
  const day = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day.charAt(0).toUpperCase() + day.slice(1)} · ${time}`;
};

export default function HeroGreeting({ firstName, context, onPrimary, onSecondary, onCompose }) {
  const now = new Date();
  const greeting = greetingByHour(now.getHours());
  const { variant, countdown, decisions, next, priceDrop } = context || {};
  const name = firstName || 'voyageur';

  let headline;
  let sub;
  let primaryLabel;
  let primaryIcon;
  let secondaryLabel = null;

  switch (variant) {
    case 'countdown': {
      const days = countdown;
      const city = next?.city || 'votre destination';
      headline = (
        <>
          {greeting} <em className="not-italic font-display italic text-ember-700">{name}</em> — il vous reste{' '}
          <em className="not-italic font-display italic text-ember-700">{days} jour{days > 1 ? 's' : ''}</em> avant {city}.
          {decisions > 0 && (
            <>
              {' '}
              <strong className="text-text-main">{decisions} décision{decisions > 1 ? 's' : ''} vous attendent.</strong>
            </>
          )}
        </>
      );
      sub = decisions > 0
        ? 'Réglez ce qui bloque votre départ, ou ouvrez directement votre voyage.'
        : 'Votre prochain départ approche — vérifiez ce qu’il reste à régler.';
      primaryLabel = decisions > 0 ? 'Régler les décisions' : `Voir ${city}`;
      primaryIcon = decisions > 0 ? <Vote size={16} /> : <ChevronRight size={16} />;
      secondaryLabel = decisions > 0 ? `Voir ${city}` : null;
      break;
    }
    case 'decisions': {
      headline = (
        <>
          {greeting} <em className="not-italic font-display italic text-ember-700">{name}</em> —{' '}
          <strong className="text-text-main">{decisions} décision{decisions > 1 ? 's' : ''} vous attendent.</strong>
        </>
      );
      sub = 'Vote, invitations, baisses de prix : ce qui attend votre décision apparaît juste en dessous.';
      primaryLabel = 'Régler les décisions';
      primaryIcon = <Vote size={16} />;
      break;
    }
    case 'priceDrop': {
      const title = priceDrop?.title || 'une de vos alertes';
      headline = (
        <>
          {greeting} <em className="not-italic font-display italic text-ember-700">{name}</em> — une baisse de prix vient de tomber sur{' '}
          <strong className="text-text-main">{title}</strong>.
        </>
      );
      sub = 'Le prix est sous votre seuil cible. Bonne fenêtre pour réserver.';
      primaryLabel = "Voir l'offre";
      primaryIcon = <TrendingDown size={16} />;
      break;
    }
    case 'empty':
    default: {
      headline = (
        <>
          {greeting} <em className="not-italic font-display italic text-ember-700">{name}</em>. Aucun voyage prévu —{' '}
          <strong className="text-text-main">bonne fenêtre pour explorer.</strong>
        </>
      );
      sub = 'Lancez une recherche : Skusku cale les dates, le vol et l’hôtel sur votre profil.';
      primaryLabel = 'Composer un voyage';
      primaryIcon = <Plus size={16} />;
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-3 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-text-secondary">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-ember-500" />
        {formatDateHeader(now)}
      </div>
      <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium leading-tight text-text-secondary max-w-3xl">
        {headline}
      </h1>
      <p className="mt-3 text-sm text-text-secondary max-w-2xl">{sub}</p>
      <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <Button onClick={onPrimary} icon={primaryIcon} className="w-full sm:w-auto">
          {primaryLabel}
        </Button>
        {secondaryLabel && (
          <Button variant="outline" onClick={onSecondary} className="w-full sm:w-auto">
            {secondaryLabel}
          </Button>
        )}
        <Button variant="ghost" onClick={onCompose} iconRight={<Plus size={14} />} className="w-full sm:w-auto">
          Composer un nouveau voyage
        </Button>
      </div>
    </section>
  );
}
