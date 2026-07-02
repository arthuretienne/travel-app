const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-2',
  ink: 'bg-sand-900 text-white hover:bg-sand-800 shadow-2',
  secondary: 'bg-sand-100 text-text-main hover:bg-sand-200',
  outline: 'bg-white text-text-main border border-sand-200 hover:border-sand-300 hover:bg-sand-50',
  ghost: 'bg-transparent text-text-secondary hover:bg-sand-100 hover:text-text-main',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[10px]',
  lg: 'h-12 px-5 text-base gap-2.5 rounded-[12px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  full = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={[
        // active:scale = feedback pressed systémique (audit V4 motion) —
        // neutralisé par le kill-switch prefers-reduced-motion d'index.css.
        'inline-flex items-center justify-center font-medium transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        full ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {iconRight}
    </button>
  );
}
