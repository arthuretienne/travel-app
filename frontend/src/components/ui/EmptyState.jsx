import Button from './Button';

export default function EmptyState({ icon, title, sub, action, className = '' }) {
  return (
    <div className={['rounded-[20px] border border-sand-200 bg-white p-8 text-center shadow-1', className].join(' ')}>
      {icon && (
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-[18px] bg-ember-50 text-ember-700">
          {icon}
        </div>
      )}
      <h3 className="font-display text-2xl font-medium text-text-main">{title}</h3>
      {sub && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">{sub}</p>}
      {action && (
        <Button
          type="button"
          variant={action.variant || 'outline'}
          size="md"
          onClick={action.onClick}
          className="mt-6"
          iconRight={action.iconRight}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
