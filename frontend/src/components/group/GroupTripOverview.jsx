import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Hotel,
  MessageCircle,
  Plane,
  Share2,
  Sparkles,
  Star,
  Users,
  Utensils,
} from 'lucide-react';
import { Avatar, Badge, Button, Card, PhotoBlock } from '../ui';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function messageAuthorName(msg) {
  const first = msg.author?.firstName || '';
  const last = msg.author?.lastName || '';
  return `${first} ${last}`.trim() || msg.guestName || msg.author?.email || 'Invité';
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

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

function getActivities(fd) {
  if (!fd) return [];
  const raw =
    fd.activities ||
    fd.highlights ||
    fd.destination?.highlights ||
    fd.destination?.activities ||
    fd.searchContext?.activities ||
    [];
  return (Array.isArray(raw) ? raw : [])
    .map((a) => (typeof a === 'string' ? a : a?.name || a?.title || a?.label))
    .filter(Boolean)
    .slice(0, 6);
}

const STATUS_META = {
  decided: { label: 'Prêt', tone: 'moss', icon: Check },
  voted: { label: 'En cours', tone: 'ember', icon: ArrowRight },
  pending: { label: 'À relancer', tone: 'gold', icon: Clock },
};

const CHIP_TONES = {
  ember: 'bg-ember-50 text-ember-700',
  sand: 'bg-sand-100 text-sand-800',
  moss: 'bg-moss-100 text-[#3d5a24]',
  gold: 'bg-gold-100 text-[#7a5c1a]',
  clay: 'bg-clay-100 text-[#7a3a25]',
};

function IconChip({ icon, tone = 'ember' }) {
  return (
    <span className={['grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px]', CHIP_TONES[tone] || CHIP_TONES.ember].join(' ')}>
      {icon}
    </span>
  );
}

function ReadyPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

/* Avatars on a ring, readiness arc, X/Y prêts in the center. */
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
            {status === 'decided' && (
              <span className="absolute -bottom-0.5 -right-0.5 grid h-[15px] w-[15px] place-items-center rounded-full bg-moss-500 shadow-[0_0_0_2px_white]">
                <Check size={9} className="text-white" />
              </span>
            )}
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
        <div className="rounded-full border border-sand-300 bg-white/90 px-5 py-4 text-center shadow-1">
          <div className="font-display text-4xl leading-none text-text-main">
            {completed}
            <span className="text-text-secondary">/{total}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">prêts</div>
        </div>
      </div>
    </div>
  );
}

function GroupStateCard({ trip, currentUserId, isConfirmed }) {
  const members = trip.members || [];
  const statuses = members.map((member) => getMemberStatus(member, isConfirmed));

  return (
    <Card className="p-[22px]">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">État du groupe</span>
      <div className="mt-4 flex justify-center">
        <ConsensusDial members={members} statuses={statuses} />
      </div>
      <div className="mt-5 flex flex-col">
        {members.map((member, index) => {
          const name = getMemberName(member);
          const isCurrentUser = member.user?.id === currentUserId;
          return (
            <div
              key={member.id || index}
              className={['flex items-center gap-3 py-2', index ? 'border-t border-sand-200' : ''].join(' ')}
            >
              <Avatar name={name} src={getMemberAvatar(member)} size={30} />
              <div className="min-w-0 flex-1 truncate">
                <span className="text-sm font-medium text-text-main">{name.split(' ')[0]}</span>
                {member.role === 'creator' && <span className="ml-1.5 text-[11px] text-text-secondary">Créateur</span>}
                {isCurrentUser && <span className="ml-1.5 text-[11px] text-text-secondary">· vous</span>}
              </div>
              <ReadyPill status={statuses[index]} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RecapCard({ icon, tone = 'ember', title, sub, price, unit, children }) {
  return (
    <Card className="p-[18px]">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex gap-3">
          <IconChip icon={icon} tone={tone} />
          <div>
            <h3 className="text-[15.5px] font-semibold text-text-main">{title}</h3>
            {sub && <div className="mt-0.5 text-[12.5px] text-text-secondary">{sub}</div>}
          </div>
        </div>
        {price != null && (
          <div className="shrink-0 text-right">
            <div className="font-display text-[21px] font-medium text-text-main">{price}</div>
            {unit && <div className="font-mono text-[10px] text-text-secondary">{unit}</div>}
          </div>
        )}
      </div>
      {children}
    </Card>
  );
}

function FlightLeg({ label, leg }) {
  if (!leg) return null;
  const dep = leg.departureAirport || leg.from || '';
  const arr = leg.arrivalAirport || leg.to || '';
  return (
    <div className="rounded-[12px] bg-sand-50 px-3.5 py-3">
      <div className="mb-1.5 flex justify-between whitespace-nowrap text-[11px] text-text-secondary">
        <span>
          {label}
          {leg.date ? ` · ${leg.date}` : ''}
        </span>
        <span>{leg.duration || ''}</span>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 font-mono text-[12.5px] text-text-main">
        <span>{leg.departureTime || '—'}</span>
        <span className="flex items-center justify-center gap-1.5 text-text-secondary">
          {dep}
          <span className="h-px min-w-[16px] flex-1 bg-sand-200" />
          <Plane size={12} className="text-ember-600" />
          <span className="h-px min-w-[16px] flex-1 bg-sand-200" />
          {arr}
        </span>
        <span>{leg.arrivalTime || '—'}</span>
      </div>
    </div>
  );
}

function FlightRecapCard({ flight, pricing }) {
  const airline = flight?.outbound?.airline || flight?.airline || 'Vol aller-retour';
  return (
    <RecapCard
      icon={<Plane size={19} className="text-ember-700" />}
      tone="ember"
      title="Vol aller-retour"
      sub={airline}
      price={Number(pricing?.flight || pricing?.flights) ? formatCurrency(pricing.flight || pricing.flights) : null}
      unit="/ pers."
    >
      {flight && (flight.outbound || flight.return) ? (
        <div className="mt-4 flex flex-col gap-2.5">
          <FlightLeg label="Aller" leg={flight.outbound} />
          <FlightLeg label="Retour" leg={flight.return} />
        </div>
      ) : (
        <p className="mt-3 text-[13px] leading-5 text-text-secondary">Les meilleurs horaires restent visibles dans le détail.</p>
      )}
    </RecapCard>
  );
}

function HotelRecapCard({ hotel, pricing, nights }) {
  if (!hotel) {
    return (
      <RecapCard
        icon={<Hotel size={19} className="text-[#7a3a25]" />}
        tone="clay"
        title="Hébergement à choisir"
        sub="Choix commun avant réservation."
        price={Number(pricing?.hotel || pricing?.accommodation) ? formatCurrency(pricing.hotel || pricing.accommodation) : null}
        unit="total"
      />
    );
  }

  const stars = Math.round(hotel.stars || 0);
  const tags = [hotel.rating?.word, hotel.boardType, ...(hotel.amenities || [])].filter(Boolean).slice(0, 3);
  const total = pricing?.hotel || pricing?.accommodation || hotel.totalPrice;
  const url = hotel.bookingUrl || hotel.url || hotel.deepLink;
  const bookingBtn = (
    <Button size="sm" variant="outline" iconRight={<ExternalLink size={12} />}>
      Sur Booking
    </Button>
  );

  return (
    <Card className="p-0">
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr]">
        <PhotoBlock src={hotel.mainPhoto} alt={hotel.name} overlay={false} className="h-40 sm:h-full sm:min-h-[150px]" />
        <div className="p-[18px]">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <h3 className="text-[15.5px] font-semibold leading-[1.25] text-text-main">{hotel.name}</h3>
              {hotel.location && <div className="mt-0.5 truncate text-[12.5px] text-text-secondary">{hotel.location}</div>}
            </div>
            {stars > 0 && (
              <div className="inline-flex shrink-0 gap-0.5 text-gold-500">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={12} fill="currentColor" />
                ))}
              </div>
            )}
          </div>
          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-3.5 flex items-baseline justify-between gap-2">
            <div>
              <span className="font-display text-[21px] font-medium text-text-main">{formatCurrency(total)}</span>
              {nights ? <span className="ml-1.5 font-mono text-[11px] text-text-secondary">{nights} nuits</span> : null}
            </div>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer">
                {bookingBtn}
              </a>
            ) : (
              bookingBtn
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ActivitiesRecapCard({ activities, pricing }) {
  const chips = activities.length ? activities : ['À définir ensemble'];
  return (
    <RecapCard
      icon={<Sparkles size={19} className="text-[#7a5c1a]" />}
      tone="gold"
      title="Activités"
      sub="Gardez les décisions sociales au même endroit."
      price={Number(pricing?.activities) > 0 ? formatCurrency(pricing.activities) : null}
      unit="optionnel"
    >
      <div className="mt-3.5 flex flex-wrap gap-2">
        {chips.map((activity) => (
          <span
            key={activity}
            className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-[13px] text-sand-700"
          >
            <Sparkles size={13} className="text-gold-500" />
            {activity}
          </span>
        ))}
      </div>
    </RecapCard>
  );
}

function BudgetCard({ pricing, perPerson }) {
  const rows = [
    { label: 'Vol', value: Number(pricing?.flight || pricing?.flights || 0), color: 'bg-ember-600', icon: <Plane size={14} /> },
    { label: 'Hôtel', value: Number(pricing?.hotel || pricing?.accommodation || 0), color: 'bg-clay-500', icon: <Hotel size={14} /> },
    { label: 'Activités', value: Number(pricing?.activities || 0), color: 'bg-moss-500', icon: <Sparkles size={14} /> },
    { label: 'Repas', value: Number(pricing?.food || 0), color: 'bg-gold-500', icon: <Utensils size={14} /> },
  ].filter((row) => row.value > 0);
  const max = Math.max(...rows.map((row) => row.value), 1);
  const displayRows = rows.length
    ? rows
    : [{ label: 'Budget prévisionnel', value: perPerson || 0, color: 'bg-ember-600', icon: <Plane size={14} /> }];

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Budget par personne</span>
        <div className="font-display text-[32px] font-medium leading-none text-text-main">
          {perPerson ? formatCurrency(perPerson) : 'À confirmer'}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3.5">
        {displayRows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[13.5px] text-text-secondary">
                <span className="text-text-light">{row.icon}</span>
                {row.label}
              </span>
              <span className="font-mono text-[12.5px] text-text-main">{row.value ? formatCurrency(row.value) : 'À compléter'}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sand-100">
              <div className={['h-full rounded-full', row.color].join(' ')} style={{ width: `${Math.max(14, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LiveFeedCard({ messages }) {
  const recent = (messages || []).slice(-5).reverse();

  return (
    <Card className="p-5">
      <span className="mb-3.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">
        <span className="h-1.5 w-1.5 rounded-full bg-moss-500" style={{ animation: 'sk-pulse 1.8s var(--ease-out) infinite' }} />
        Ce qui avance
      </span>

      {recent.length === 0 ? (
        <p className="text-sm leading-6 text-text-secondary">Les prochaines actions du groupe apparaîtront ici.</p>
      ) : (
        <div className="flex flex-col">
          {recent.map((msg, index) => {
            const isSystem = msg.type && msg.type !== 'message';
            const name = messageAuthorName(msg);
            const last = index === recent.length - 1;
            return (
              <div key={msg.id || index} className={['flex gap-3', last ? '' : 'pb-3.5'].join(' ')}>
                <div className="flex flex-col items-center">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ember-50 text-ember-700">
                    {isSystem ? <Sparkles size={14} /> : <MessageCircle size={14} />}
                  </span>
                  {!last && <span className="mt-1 w-px flex-1 bg-sand-200" />}
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="text-[13.5px] leading-5 text-text-secondary">
                    {isSystem ? (
                      truncate(msg.content, 100)
                    ) : (
                      <>
                        <strong className="font-semibold text-text-main">{name.split(' ')[0]}</strong>{' '}
                        {truncate(msg.content, 90)}
                      </>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-text-light">{relativeTime(msg.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default function GroupTripOverview({ trip, currentUserId, onInvite, onBook }) {
  const { city, country } = getDestinationInfo(trip.finalDestination);
  const isConfirmed = Boolean(trip.finalDestination);
  const members = trip.members || [];
  const statuses = members.map((member) => getMemberStatus(member, isConfirmed));
  const readyCount = statuses.filter((status) => status === 'decided').length;
  const total = Math.max(1, members.length);
  const destinationName = city || trip.name;
  const dateRange = formatDateRange(trip.finalStartDate, trip.finalEndDate);
  const duration = getDuration(trip.finalStartDate, trip.finalEndDate);
  const pricing = trip.finalDestination?.pricing || {};
  const grandTotal = pricing.total || pricing.realisticTotal || (pricing.perPerson || 0) * total;
  const perPerson = grandTotal && members.length ? grandTotal / total : pricing.perPerson;
  const flight = trip.finalDestination?.flightDetails;
  const hotel = trip.finalDestination?.hotelOptions?.hotels?.[0];
  const activities = getActivities(trip.finalDestination);

  return (
    <div className="sk-stagger flex flex-col gap-6">
      {/* Hero */}
      <PhotoBlock
        city={city}
        country={country}
        tripData={trip.finalDestination}
        className="relative h-[300px] rounded-[22px] md:h-[340px]"
        imgClassName="transition-transform duration-500 hover:scale-[1.02]"
      >
        <div className="absolute inset-x-5 top-5 z-[2] flex flex-wrap gap-2 md:inset-x-6">
          <Badge tone="moss" dot>
            {readyCount} sur {total} prêts
          </Badge>
          <Badge tone="ink">
            <span className="inline-flex items-center gap-1.5">
              <Users size={12} />
              Voyage de groupe
            </span>
          </Badge>
        </div>
        <div className="absolute inset-x-5 bottom-5 z-[2] text-white md:inset-x-6 md:bottom-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">Destination confirmée</span>
          <h1 className="mt-2 font-display text-[40px] font-medium leading-[1.02] tracking-[-0.015em] md:text-[52px]">
            <span className="italic text-ember-200">{destinationName}</span>
            {country ? <>, {country}</> : null}
          </h1>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {dateRange}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} />
              {members.length || 1} voyageurs
            </span>
            {duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} />
                {duration} jours
              </span>
            )}
            {perPerson && <span className="font-mono">{formatCurrency(perPerson, ' / pers.')}</span>}
          </div>
        </div>
      </PhotoBlock>

      {/* Actions */}
      <div className="flex flex-wrap gap-2.5">
        <Button variant="outline" onClick={onInvite} icon={<Share2 size={16} />}>
          Partager
        </Button>
        <Button onClick={onBook} icon={<ExternalLink size={16} />}>
          Réserver ensemble
        </Button>
      </div>

      {/* Récap + group state */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Récapitulatif</span>
            <h2 className="mt-1.5 font-display text-[26px] font-medium tracking-[-0.015em] text-text-main">Votre voyage</h2>
          </div>

          <FlightRecapCard flight={flight} pricing={pricing} />
          <HotelRecapCard hotel={hotel} pricing={pricing} nights={duration} />
          <ActivitiesRecapCard activities={activities} pricing={pricing} />
          <BudgetCard pricing={pricing} perPerson={perPerson} />
        </div>

        <aside className="flex flex-col gap-4">
          <GroupStateCard trip={trip} currentUserId={currentUserId} isConfirmed={isConfirmed} />
          <LiveFeedCard messages={trip.messages} />
        </aside>
      </div>
    </div>
  );
}
