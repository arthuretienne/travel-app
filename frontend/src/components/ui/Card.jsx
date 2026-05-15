export default function Card({ children, raised = false, className = '', photo, photoH = '180px', scrim = true }) {
  return (
    <div className={[
      'overflow-hidden rounded-[14px] border border-sand-200 bg-white',
      raised ? 'shadow-2' : 'shadow-1',
      className,
    ].join(' ')}>
      {photo && (
        <div
          className={['sk-photo', scrim ? '' : 'sk-photo--noscrim'].join(' ')}
          style={{ height: photoH, backgroundImage: `url(${photo})` }}
        />
      )}
      {children}
    </div>
  );
}
