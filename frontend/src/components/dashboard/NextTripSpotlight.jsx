import { Check, ChevronRight, Cloud, FileText, MapPin, Plane, Plus, Route, Share2, Sparkles } from 'lucide-react';
import { Button, PhotoBlock } from '../ui';

const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const CHECKLIST_ICONS = {
  ok: Check,
  missing: Plus,
  pending: Route,
};

function ChecklistRow({ status, label, meta, onClick }) {
  const Icon = CHECKLIST_ICONS[status] || Plus;
  const iconBg = status === 'ok' ? 'bg-moss-100 text-[#3d5a24]' : status === 'missing' ? 'bg-ember-50 text-ember-700' : 'bg-sand-100 text-text-secondary';
  const metaColor = status === 'missing' ? 'text-ember-700 font-medium' : 'text-text-secondary';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[12px] border border-sand-200 bg-white px-3 py-2.5 text-left transition-all hover:border-sand-300 hover:bg-sand-50"
    >
      <div className={['grid h-7 w-7 shrink-0 place-items-center rounded-full', iconBg].join(' ')}>
        <Icon size={13} />
      </div>
      <span className="flex-1 text-sm font-medium text-text-main">{label}</span>
      <span className={['text-xs font-mono', metaColor].join(' ')}>{meta}</span>
    </button>
  );
}

function CountdownLabel({ days }) {
  if (days === null || days === undefined) return null;
  if (days === 0) return <>Aujourd'hui</>;
  if (days < 0) return <>En cours</>;
  return (
    <>
      <div className="text-[10px] font-mono uppercase tracking-widest opacity-90">Départ dans</div>
      <div className="font-display text-3xl font-medium leading-none">
        {days}
        <span className="text-base font-mono ml-1">j</span>
      </div>
    </>
  );
}

export default function NextTripSpotlight({ trip, daysUntil, helpers, onOpen, onPrimary, onPdf, onShare, onPlan, suggestion }) {
  // Variant B — no upcoming trip
  if (!trip) {
    return (
      <section className="mb-10">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-medium text-text-main">
            Ton <em className="font-display italic text-ember-700 not-italic">prochain</em> départ
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Aucun trip à venir — voici une fenêtre qui matche ton profil.
          </p>
        </div>
        <div className="rounded-[22px] border border-sand-200 bg-white p-7 shadow-1">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-ember-50 text-ember-700">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-text-secondary">
                  Suggestion personnalisée
                </p>
                <h3 className="font-display text-2xl font-medium text-text-main">
                  Précise tes envies, on cale une fenêtre.
                </h3>
                <p className="mt-1 text-sm text-text-secondary max-w-md">
                  Lance une recherche : on combine ta préférence de durée, ton budget et la saison pour
                  proposer une destination réelle, pas un mock.
                </p>
              </div>
            </div>
            <Button onClick={onPlan} icon={<Plus size={16} />}>
              Lancer une recherche
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const city = trip.city || 'Destination';
  const country = trip.country;
  const days = daysUntil;
  const flightOk = helpers.hasFlight(trip);
  const hotelOk = helpers.hasHotel(trip);
  const itineraryOk = helpers.hasItinerary(trip);
  const packingOk = helpers.hasPacking(trip);

  const checklist = [
    { key: 'flight', label: 'Vol aller-retour', status: flightOk ? 'ok' : 'missing', meta: flightOk ? 'Confirmé' : 'À réserver' },
    { key: 'hotel', label: 'Hôtel', status: hotelOk ? 'ok' : 'missing', meta: hotelOk ? 'Choisi' : 'À choisir' },
    { key: 'itinerary', label: 'Itinéraire jour par jour', status: itineraryOk ? 'ok' : 'pending', meta: itineraryOk ? 'Prêt' : 'À générer' },
    { key: 'packing', label: 'Packing', status: packingOk ? 'ok' : 'pending', meta: packingOk ? 'Liste prête' : 'À générer' },
  ];

  // Pick primary CTA based on first missing step
  const firstMissing = checklist.find((c) => c.status !== 'ok');
  let primaryLabel = "Ouvrir l'itinéraire";
  let primaryIcon = <Route size={16} />;
  if (firstMissing) {
    if (firstMissing.key === 'hotel') {
      primaryLabel = "Choisir l'hôtel";
      primaryIcon = <MapPin size={16} />;
    } else if (firstMissing.key === 'flight') {
      primaryLabel = 'Choisir le vol';
      primaryIcon = <Plane size={16} />;
    } else if (firstMissing.key === 'itinerary') {
      primaryLabel = "Générer l'itinéraire";
      primaryIcon = <Route size={16} />;
    }
  }

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-medium text-text-main">
            Ton <em className="font-display italic text-ember-700 not-italic">prochain</em> départ
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {city}{country ? ` · ${country}` : ''} · {formatDateShort(trip.startDate)} → {formatDateShort(trip.endDate)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[18px] sm:rounded-[22px] border border-sand-200 bg-white shadow-2 grid lg:grid-cols-[1fr_1fr]">
        <div className="relative">
          <PhotoBlock city={city} country={country} tripData={trip.tripData} className="h-64 lg:h-full min-h-[280px]" alt={`${city}, ${country}`}>
            <div className="absolute right-4 top-4 grid place-items-center min-w-[80px] rounded-[14px] bg-white/95 px-3 py-2 text-text-main text-center">
              <CountdownLabel days={days} />
            </div>
            <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-text-main">
              <Cloud size={12} />
              {trip.tripData?.weather ? `${trip.tripData.weather.tempMin}–${trip.tripData.weather.tempMax}°C` : 'Météo bientôt'}
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="font-display text-3xl font-medium leading-none">{city}</h3>
              {trip.tripData?.flightDetails?.outbound?.departure?.airport && trip.tripData?.flightDetails?.outbound?.arrival?.airport && (
                <p className="mt-1.5 text-xs font-mono text-white/85">
                  {trip.tripData.flightDetails.outbound.departure.airport} → {trip.tripData.flightDetails.outbound.arrival.airport}
                </p>
              )}
            </div>
          </PhotoBlock>
        </div>

        <div className="p-6 lg:p-7">
          <p className="text-[11px] font-mono uppercase tracking-widest text-text-secondary">
            {formatDateShort(trip.startDate)} → {formatDateShort(trip.endDate)}
          </p>
          <h3 className="mt-2 font-display text-2xl font-medium text-text-main">
            {firstMissing
              ? `Vol ${flightOk ? 'confirmé' : 'à réserver'}. ${firstMissing.label} ${firstMissing.status === 'missing' ? 'manquant' : 'à compléter'}.`
              : 'Tout est prêt — ouvre ton itinéraire.'}
          </h3>

          <div className="mt-5 space-y-2">
            {checklist.map((row) => (
              <ChecklistRow key={row.key} {...row} onClick={onOpen} />
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-2">
            <Button onClick={onPrimary} icon={primaryIcon} className="w-full sm:w-auto">
              {primaryLabel}
            </Button>
            <Button variant="outline" onClick={onOpen} iconRight={<ChevronRight size={14} />} className="w-full sm:w-auto">
              Voir le trip
            </Button>
            <div className="flex gap-2 sm:contents">
              <Button variant="ghost" size="sm" onClick={onPdf} icon={<FileText size={14} />} className="flex-1 sm:flex-initial">
                PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={onShare} icon={<Share2 size={14} />} className="flex-1 sm:flex-initial">
                Partager
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
