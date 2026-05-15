import Avatar from './Avatar';

export default function AvatarStack({ people = [], size = 28, max = 4 }) {
  const shown = people.slice(0, max);
  const extra = Math.max(0, people.length - max);

  return (
    <div className="flex items-center">
      {shown.map((person, index) => (
        <div key={person.id || person.name || index} style={{ marginLeft: index === 0 ? 0 : -size * 0.32 }}>
          <Avatar name={person.name} src={person.src || person.imageUrl} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div
          className="grid shrink-0 place-items-center rounded-full bg-sand-200 font-semibold text-sand-700"
          style={{
            width: size,
            height: size,
            marginLeft: -size * 0.32,
            fontSize: Math.max(10, size * 0.34),
            boxShadow: '0 0 0 2px #fff',
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
