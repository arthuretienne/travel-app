import { Plane } from 'lucide-react';

export default function Logo({ size = 32, dark = false, className = '' }) {
  return (
    <div className={['inline-flex items-center gap-2.5', className].join(' ')}>
      <div
        className="grid place-items-center rounded-[10px] bg-primary text-white shadow-2"
        style={{ width: size, height: size }}
      >
        <Plane size={Math.round(size * 0.58)} strokeWidth={1.8} />
      </div>
      <span
        className={['font-display font-medium tracking-tight', dark ? 'text-white' : 'text-text-main'].join(' ')}
        style={{ fontSize: Math.round(size * 0.68) }}
      >
        Skusku
      </span>
    </div>
  );
}
