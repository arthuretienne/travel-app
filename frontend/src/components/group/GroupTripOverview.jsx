import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  Clock,
  Hotel,
  MessageCircle,
  Plane,
  Send,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import { Avatar, Badge, Button, Card, PhotoBlock } from '../ui';
import { getDestinationImage } from '../../utils/destinationImages';

function getDestinationInfo(finalDestination) {
  if (!finalDestination) return { city: null, country: null };
  return {
    city: finalDestination.city || finalDestination.destination?.city || null,
    country: finalDestination.country || finalDestination.destination?.country || null,
  };
}

function getMemberName(member) {
  const first = member.user?.firstName || '';
  const last = member.user?.lastName || '';
  return `${first} ${last}`.trim() || member.user?.email || member.email || 'Invité';
}

function getMemberAvatar(member) {
  return member.user?.imageUrl || null;
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return 'Dates à confirmer';
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const startLabel = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  if (!end) return startLabel;
  const endLabel = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `${startLabel} – ${endLabel}`;
}

function getDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

function formatCurrency(value, suffix = '') {
  if (!Number.isFinite(Number(value))) return 'À confirmer';
  return `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value))}${suffix}`;
}

function getMemberStatus(member, isConfirmed) {
  if (isConfirmed) {
    if (member.bookingConfirmed || (member.hasBookedFlight && member.hasBookedHotel)) return 'decided';
    if (member.hasBookedFlight || member.hasBookedHotel) return 'voted';
    return 'pending';
  }
  if (member.vote || member.votedDestinationId || member.hasVoted) return 'voted';
  if (member.role === 'creator') return 'decided';
  return 'pending';
}

const STATUS_META = {
  decided: { label: 'Prêt', tone: 'moss', icon: Check },
  voted: { label: 'En cours', tone: 'ember', icon: ArrowRight },
  pending: { label: 'À relancer', tone: 'gold', icon: Clock },
};

function MemberRow({ member, status, currentUserId }) {
  const name = getMemberName(member);
  const firstName = name.split(' ')[0];
  const meta = STATUS_META[status] || STATUS_META.pending;
  const StatusIcon = meta.icon;
  const isCurrentUser = member.user?.id === currentUserId;

  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} src={getMemberAvatar(member)} size={34} ring={status === 'pending'} ringColor="var(--gold-500)" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-main">
          {firstName}
          {isCurrentUser && <span className="ml-1.5 font-normal text-text-secondary">· vous</span>}
        </div>
        <div className="text-xs text-text-secondary">{member.role === 'creator' ? 'Créateur' : 'Membre'}</div>
      </div>
      <Badge tone={meta.tone} className="gap-1.5">
        <StatusIcon size={12} />
        {meta.label}
      </Badge>
    </div>
  );
}

function ConsensusDial({ members, statuses }) {
  const total = Math.max(1, members.length);
  const completed = statuses.filter((status) => status === 'decided').length;
  const pct = completed / total;
  const radius = 78;
  const center = 100;
  const end = pct * 360 - 90;
  const endX = center + radius * Math.cos((end * Math.PI) / 180);
  const endY = center + radius * Math.sin((end * Math.PI) / 180);
  const largeArc = pct > 0.5 ? 1 : 0;

  return (
    <div className="relative h-[200px] w-[200px]">
      <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--sand-200)" strokeWidth="10" />
        {completed > 0 && (
          <path
            d={`M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
            fill="none"
            stroke="var(--ember-600)"
            strokeLinecap="round"
            strokeWidth="10"
          />
        )}
      </svg>

      {members.map((member, index) => {
        const angle = (index / total) * 360 - 90;
        const left = center + radius * Math.cos((angle * Math.PI) / 180) - 18;
        const top = center + radius * Math.sin((angle * Math.PI) / 180) - 18;
        const status = statuses[index];

        return (
          <div key={member.id || index} className="absolute" style={{ left, top }}>
            <Avatar
              name={getMemberName(member)}
              src={getMemberAvatar(member)}
              size={36}
              ring={status === 'pending'}
              ringColor="var(--gold-500)"
            />
            {status === 'pending' && (
              <span
                className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gold-500 shadow-[0_0_0_2px_white]"
                style={{ animation: 'sk-pulse 1.6s var(--ease-out) infinite' }}
              />
            )}
          </div>
        );
      })}

      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-full border border-sand-300 bg-white/88 px-5 py-4 text-center shadow-1">
          <div className="font-display text-4xl leading-none text-text-main">
            {completed}<span className="text-text-secondary">/{total}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">prêts</div>
        </div>
      </div>
    </div>
  );
}

function ConsensusCard({ trip, currentUserId, isConfirmed }) {
  const members = trip.members || [];
  const statuses = members.map((member) => getMemberStatus(member, isConfirmed));
  const pendingMember = members.find((member, index) => statuses[index] === 'pending');
  const completed = statuses.filter((status) => status === 'decided').length;

  return (
    <Card raised className="relative rounded-[20px] p-6 md:p-7">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-ember-100/50 blur-3xl" />
      <div className="relative">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">État du groupe</div>
        <h2 className="mt-2 font-display text-3xl leading-tight text-text-main">
          Vous y êtes <span className="italic text-moss-500">presque</span>.
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          {completed} sur {Math.max(1, members.length)} ont finalisé leurs réservations.
          {pendingMember ? ` ${getMemberName(pendingMember).split(' ')[0]} attend un rappel clair.` : ' Le groupe est aligné.'}
        </p>
      </div>

      <div className="relative mt-6 grid gap-6 lg:grid-cols-[200px_1fr] lg:items-center">
        <ConsensusDial members={members} statuses={statuses} />
        <div className="space-y-3">
          {members.map((member, index) => (
            <MemberRow key={member.id || index} member={member} status={statuses[index]} currentUserId={currentUserId} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function NextDecisionCard({ pendingMember, destinationImage, onRemind, sendingReminder }) {
  const name = pendingMember ? getMemberName(pendingMember).split(' ')[0] : 'le groupe';
  const templates = pendingMember
    ? [
        `Hey ${name}, on est presque tous calés. Tu veux qu'on bloque le voyage ?`,
        'Le prix bouge un peu cette semaine. On valide ensemble ?',
      ]
    : [
        'Tout le monde est calé. On peut passer à la réservation finale.',
        'Dernier contrôle du budget, puis on verrouille.',
      ];

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-sand-900 p-6 text-white shadow-3 md:p-7">
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${destinationImage})` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-sand-900/75 to-sand-900" />

      <div className="relative flex min-h-[320px] flex-col">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Prochaine décision</div>
        <h2 className="mt-2 font-display text-3xl leading-tight">
          {pendingMember ? (
            <>Relancer {name} <span className="italic text-ember-200">gentiment</span>.</>
          ) : (
            <>Finaliser <span className="italic text-ember-200">ensemble</span>.</>
          )}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
          {pendingMember
            ? "Un message court suffit. L'objectif est de réduire la friction, pas de mettre la pression."
            : 'Le groupe est prêt. Gardez une seule action claire pour la suite.'}
        </p>

        <div className="mt-5 space-y-2">
          {templates.map((template) => (
            <button
              key={template}
              type="button"
              className="w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-[13px] leading-5 text-white transition-colors hover:bg-white/[0.1]"
            >
              {template}
            </button>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-3 pt-6">
          {pendingMember && <Avatar name={getMemberName(pendingMember)} src={getMemberAvatar(pendingMember)} size={30} />}
          <span className="text-[13px] text-white/65">
            {pendingMember ? `${name} n'a pas encore tout réservé` : 'Tout le monde est synchronisé'}
          </span>
          <div className="flex-1" />
          <Button
            variant="secondary"
            size="sm"
            onClick={onRemind}
            disabled={sendingReminder || !pendingMember}
            iconRight={<Send size={14} />}
          >
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecapCard({ icon, eyebrow, title, sub, right, rightSub }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-ember-50 text-ember-700">{icon}</div>
        <div className="text-right">
          <div className="font-display text-2xl leading-none text-text-main">{right}</div>
          {rightSub && <div className="mt-1 text-xs text-text-secondary">{rightSub}</div>}
        </div>
      </div>
      <div className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{eyebrow}</div>
      <div className="mt-1 font-medium text-text-main">{title}</div>
      <div className="mt-1 text-sm leading-5 text-text-secondary">{sub}</div>
    </Card>
  );
}

function ItineraryStrip({ city, startDate }) {
  const baseDate = startDate ? new Date(startDate) : null;
  const days = [
    { title: `Arrivée à ${city}`, items: ['Installation', 'Premier quartier', 'Dîner simple'], color: 'bg-clay-500' },
    { title: 'Journée signature', items: ['Activité choisie', 'Pause locale', 'Soirée libre'], color: 'bg-ember-600' },
    { title: 'Derniers choix', items: ['Matinée lente', 'Derniers achats', 'Retour'], color: 'bg-moss-500' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {days.map((day, index) => {
        const date = baseDate ? new Date(baseDate) : null;
        if (date) date.setDate(baseDate.getDate() + index);
        const dateLabel = date ? date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : `Jour ${index + 1}`;

        return (
          <Card key={day.title} className="relative p-5">
            <div className={`absolute bottom-5 left-0 top-5 w-1 rounded-r ${day.color}`} />
            <div className="pl-3">
              <div className="flex items-baseline gap-3">
                <div className="font-display text-2xl text-text-main">Jour {index + 1}</div>
                <div className="text-xs text-text-secondary">{dateLabel}</div>
              </div>
              <div className="mt-1 font-medium text-text-main">{day.title}</div>
              <ul className="mt-3 space-y-2">
                {day.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-text-secondary">
                    <span className="mt-2 h-1 w-1 rounded-full bg-text-light" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function BudgetCard({ pricing, membersCount }) {
  const total = Number(pricing?.total || pricing?.realisticTotal || 0);
  const perPerson = total && membersCount ? total / membersCount : Number(pricing?.perPerson || 0);
  const rows = [
    { label: 'Vol', value: pricing?.flight || pricing?.flights || 0, color: 'bg-ember-600' },
    { label: 'Hôtel', value: pricing?.hotel || pricing?.accommodation || 0, color: 'bg-clay-500' },
    { label: 'Activités', value: pricing?.activities || 0, color: 'bg-moss-500' },
    { label: 'Marge repas', value: pricing?.food || 0, color: 'bg-gold-500' },
  ].filter((row) => Number(row.value) > 0);
  const max = Math.max(...rows.map((row) => Number(row.value)), 1);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Budget</div>
          <div className="mt-2 font-display text-4xl leading-none text-text-main">
            {perPerson ? formatCurrency(perPerson) : 'À confirmer'}
          </div>
          <div className="mt-1 text-sm text-text-secondary">par personne</div>
        </div>
        <Badge tone="moss" dot>Suivi clair</Badge>
      </div>

      <div className="mt-6 space-y-4">
        {(rows.length ? rows : [{ label: 'Budget prévisionnel', value: perPerson || 0, color: 'bg-ember-600' }]).map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-text-secondary">{row.label}</span>
              <span className="font-mono text-text-main">{Number(row.value) ? formatCurrency(row.value) : 'À compléter'}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sand-100">
              <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max(18, (Number(row.value) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LiveFeedCard({ members }) {
  const firstMembers = (members || []).slice(0, 3);
  const events = firstMembers.length
    ? firstMembers.map((member, index) => ({
        member,
        text: index === 0 ? 'a confirmé ses disponibilités' : index === 1 ? 'a ajouté une préférence hôtel' : 'a consulté le budget',
        when: index === 0 ? "aujourd'hui" : index === 1 ? 'hier' : 'cette semaine',
      }))
    : [];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Activité</div>
          <h3 className="mt-2 font-display text-2xl text-text-main">Ce qui avance</h3>
        </div>
        <MessageCircle size={18} className="text-text-secondary" />
      </div>

      <div className="mt-5 space-y-4">
        {events.map((event) => (
          <div key={`${getMemberName(event.member)}-${event.text}`} className="flex gap-3">
            <Avatar name={getMemberName(event.member)} src={getMemberAvatar(event.member)} size={32} />
            <div>
              <div className="text-sm leading-5">
                <strong className="font-semibold text-text-main">{getMemberName(event.member).split(' ')[0]}</strong>
                <span className="text-text-secondary"> {event.text}</span>
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">{event.when}</div>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-sm leading-6 text-text-secondary">Les prochaines actions du groupe apparaîtront ici.</p>}
      </div>
    </Card>
  );
}

export default function GroupTripOverview({
  trip,
  currentUserId,
  userRole,
  onInvite,
  onRemind,
  sendingReminder = false,
}) {
  const { city, country } = getDestinationInfo(trip.finalDestination);
  const isConfirmed = Boolean(trip.finalDestination);
  const members = trip.members || [];
  const statuses = members.map((member) => getMemberStatus(member, isConfirmed));
  const pendingMember = members.find((member, index) => statuses[index] === 'pending');
  const destinationName = city || trip.name;
  const dateRange = formatDateRange(trip.finalStartDate, trip.finalEndDate);
  const duration = getDuration(trip.finalStartDate, trip.finalEndDate);
  const pricing = trip.finalDestination?.pricing || {};
  const total = pricing.total || pricing.realisticTotal || pricing.perPerson * Math.max(1, members.length);
  const perPerson = total && members.length ? total / members.length : pricing.perPerson;
  const destinationImage = getDestinationImage({ city, country, tripData: trip.finalDestination });
  const flight = trip.finalDestination?.flightDetails;
  const hotel = trip.finalDestination?.hotelOptions?.hotels?.[0];

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[28px] border border-sand-200 bg-white shadow-2">
        <PhotoBlock
          city={city}
          country={country}
          tripData={trip.finalDestination}
          className="h-[280px] md:h-[360px]"
          imgClassName="transition-transform duration-500 hover:scale-[1.02]"
        >
          <div className="absolute inset-0 flex items-end">
            <div className="w-full p-6 md:p-10">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge tone={isConfirmed ? 'moss' : 'gold'} dot>
                  {isConfirmed ? `${statuses.filter((status) => status === 'decided').length} sur ${Math.max(1, members.length)} prêts` : 'Décision en cours'}
                </Badge>
                <Badge tone="neutral">Voyage de groupe</Badge>
              </div>
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="max-w-3xl font-display text-5xl leading-[0.95] text-white md:text-7xl">
                    {destinationName}
                    {isConfirmed && <span className="italic text-ember-200"> ensemble</span>}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                    <span className="inline-flex items-center gap-2"><Calendar size={16} />{dateRange}</span>
                    <span className="inline-flex items-center gap-2"><Users size={16} />{members.length || 1} voyageurs</span>
                    {duration && <span className="inline-flex items-center gap-2"><Clock size={16} />{duration} jours</span>}
                    {perPerson && <span className="font-mono">{formatCurrency(perPerson, ' / pers.')}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="md" onClick={onInvite} icon={<Share2 size={16} />}>
                    Partager
                  </Button>
                  <Button variant="primary" size="md" iconRight={<ArrowRight size={16} />}>
                    Réserver ensemble
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PhotoBlock>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ConsensusCard trip={trip} currentUserId={currentUserId} isConfirmed={isConfirmed} />
        <NextDecisionCard
          pendingMember={pendingMember}
          destinationImage={destinationImage}
          onRemind={onRemind}
          sendingReminder={sendingReminder}
        />
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">Récap du voyage</div>
            <h2 className="mt-1 font-display text-3xl text-text-main">{isConfirmed ? `${destinationName}, ${dateRange}` : trip.name}</h2>
          </div>
          {userRole === 'creator' && (
            <Button variant="ghost" size="sm" onClick={onInvite} icon={<Users size={15} />}>
              Inviter
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <RecapCard
            icon={<Plane size={20} />}
            eyebrow="Vol"
            title={flight?.outbound?.departureAirport && city ? `${flight.outbound.departureAirport} → ${city}` : 'Vol à confirmer'}
            sub={flight?.outbound?.duration ? `Durée ${flight.outbound.duration}${flight.outbound.stops ? `, ${flight.outbound.stops} escale` : ', direct'}` : 'Les meilleurs horaires restent visibles dans le détail.'}
            right={formatCurrency(pricing.flight || pricing.flights)}
            rightSub="par pers."
          />
          <RecapCard
            icon={<Hotel size={20} />}
            eyebrow="Hôtel"
            title={hotel?.name || 'Hébergement à choisir'}
            sub={hotel?.pricePerNight ? `${formatCurrency(hotel.pricePerNight)} par nuit` : 'Choix commun avant réservation.'}
            right={formatCurrency(pricing.hotel || pricing.accommodation)}
            rightSub="total"
          />
          <RecapCard
            icon={<Sparkles size={20} />}
            eyebrow="Activités"
            title="Moments à valider"
            sub="Gardez les décisions sociales au même endroit."
            right={formatCurrency(pricing.activities || 0)}
            rightSub="optionnel"
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">Itinéraire</div>
            <h2 className="mt-1 font-display text-3xl text-text-main">Un rythme lisible pour tout le monde</h2>
          </div>
          <Badge tone="neutral">Aperçu</Badge>
        </div>
        <ItineraryStrip city={destinationName} startDate={trip.finalStartDate} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetCard pricing={pricing} membersCount={Math.max(1, members.length)} />
        <LiveFeedCard members={members} />
      </div>

      {!isConfirmed && (
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">Décision</div>
              <h2 className="mt-1 font-display text-2xl text-text-main">Le voyage n'est pas encore confirmé</h2>
              <p className="mt-1 text-sm text-text-secondary">Les propositions et le vote restent disponibles juste en dessous.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Bell size={16} className="text-gold-500" />
              Gardez une seule prochaine action.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
