export default function StatCard({ icon, value, label, delta, progress, className = '' }) {
  return (
    <div className={['rounded-[20px] border border-sand-200 bg-white p-5 shadow-1', className].join(' ')}>
      <div className="flex items-start gap-4">
        {icon && (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-ember-50 text-ember-700">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-display text-3xl leading-none text-text-main">{value}</div>
          <div className="mt-1 text-sm text-text-secondary">{label}</div>
          {delta && <div className="mt-2 text-xs font-medium text-moss-500">{delta}</div>}
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand-100">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </div>
  );
}
