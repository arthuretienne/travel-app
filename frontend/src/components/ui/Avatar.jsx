function initialsFor(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function Avatar({ name = '?', src, size = 32, ring = false, ringColor = 'var(--ember-600)', className = '' }) {
  const initials = initialsFor(name);
  const hue = (String(name).charCodeAt(0) * 17) % 360;

  return (
    <div
      className={[
        'grid shrink-0 place-items-center rounded-full bg-cover bg-center font-semibold text-white',
        className,
      ].join(' ')}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.38),
        backgroundColor: src ? undefined : `hsl(${hue} 30% 58%)`,
        backgroundImage: src ? `url(${src})` : undefined,
        boxShadow: ring
          ? `0 0 0 2px #fff, 0 0 0 4px ${ringColor}`
          : '0 0 0 2px #fff',
      }}
      title={name}
    >
      {!src && initials}
    </div>
  );
}
