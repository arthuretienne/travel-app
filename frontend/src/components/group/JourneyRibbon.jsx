import { Sparkles, Vote, Check } from 'lucide-react';

const STEPS = [
  { key: 'planning', label: 'Planifier', caption: 'Cadrer les envies', Icon: Sparkles },
  { key: 'voting', label: 'Voter', caption: 'Choisir ensemble', Icon: Vote },
  { key: 'confirmed', label: 'Confirmé', caption: 'Réserver & partir', Icon: Check },
];

/* The spine that makes the three lifecycle states feel like one journey.
   The connecting rail fills with progress; the active stop blooms. */
export default function JourneyRibbon({ state = 'planning' }) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === state));
  const fill = idx === 0 ? 0 : idx === 1 ? 50 : 100;

  return (
    <div className="relative rounded-[18px] border border-sand-200 bg-white p-5 shadow-1 sm:px-6">
      <span className="mb-4 block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        Parcours du voyage
      </span>

      <div className="relative grid grid-cols-3">
        {/* rail */}
        <div className="absolute left-[16.66%] right-[16.66%] top-[22px] h-[3px] rounded-full bg-sand-200">
          <div
            className="h-full rounded-full bg-ember-500 transition-[width] duration-500 ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>

        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          const StepIcon = done ? Check : s.Icon;
          const circle = active
            ? 'bg-ember-600 text-white border-ember-600 shadow-2 sk-halo'
            : done
              ? 'bg-white text-ember-600 border-ember-500'
              : 'bg-white text-sand-400 border-sand-200';
          const label = active ? 'text-text-main' : done ? 'text-text-secondary' : 'text-text-muted';
          return (
            <div key={s.key} className="relative z-[1] flex flex-col items-center gap-2.5">
              <span
                className={[
                  'grid h-[46px] w-[46px] place-items-center rounded-full border-2 transition-all duration-200 ease-out',
                  circle,
                ].join(' ')}
              >
                <StepIcon size={20} strokeWidth={2.2} />
              </span>
              <span className="text-center">
                <span className={['block text-sm font-semibold', label].join(' ')}>{s.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-text-muted">{s.caption}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
