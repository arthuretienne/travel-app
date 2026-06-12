import { getDestinationImage, createDestinationPlaceholder, buildResponsiveSrcSet } from '../../utils/destinationImages';

export default function PhotoBlock({
  city,
  country,
  tripData,
  src,
  alt,
  className = '',
  imgClassName = '',
  overlay = true,
  // priority : image LCP (hero) — chargée eager + fetchpriority high,
  // à coupler avec le <link rel="preload"> d'index.html.
  priority = false,
  // sizes : active un srcset responsive (Unsplash) — w=480/800/1200.
  sizes,
  children,
}) {
  const image = src || getDestinationImage({ city, country, tripData }) || createDestinationPlaceholder(city || country || 'Destination');
  const srcSet = sizes ? buildResponsiveSrcSet(image) : undefined;

  // Only default to `relative` when the caller hasn't supplied its own
  // positioning. Hardcoding `relative` made Tailwind's source order win over
  // a caller's `absolute` (hero screens), leaving PhotoBlock in flow and
  // pushing sibling overlay content out of the clipped section.
  const hasPosition = /(?:^|\s)(?:absolute|fixed|relative|sticky)(?:\s|$)/.test(className);

  return (
    <div className={[hasPosition ? '' : 'relative', 'overflow-hidden bg-sand-300', className].join(' ')}>
      <img
        src={image}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt || [city, country].filter(Boolean).join(', ') || 'Destination'}
        className={['h-full w-full object-cover', imgClassName].join(' ')}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
      />
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-sand-900/65 via-sand-900/20 to-transparent" />}
      {children}
    </div>
  );
}
