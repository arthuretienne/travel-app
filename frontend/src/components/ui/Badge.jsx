const TONES = {
  ember: 'bg-ember-50 text-ember-800',
  moss: 'bg-moss-100 text-[#3d5a24]',
  gold: 'bg-gold-100 text-[#7a5c1a]',
  clay: 'bg-clay-100 text-[#7a3a25]',
  neutral: 'bg-sand-100 text-sand-700',
  ink: 'bg-sand-900 text-white',
};

const DOTS = {
  ember: 'bg-ember-600',
  moss: 'bg-moss-500',
  gold: 'bg-gold-500',
  clay: 'bg-clay-500',
  neutral: 'bg-sand-500',
  ink: 'bg-white',
};

export default function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none',
      TONES[tone] || TONES.neutral,
      className,
    ].join(' ')}>
      {dot && <span className={['h-1.5 w-1.5 rounded-full', DOTS[tone] || DOTS.neutral].join(' ')} />}
      {children}
    </span>
  );
}
