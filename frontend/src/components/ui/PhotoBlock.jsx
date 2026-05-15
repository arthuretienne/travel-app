import { getDestinationImage, createDestinationPlaceholder } from '../../utils/destinationImages';

export default function PhotoBlock({
  city,
  country,
  tripData,
  src,
  alt,
  className = '',
  imgClassName = '',
  overlay = true,
  children,
}) {
  const image = src || getDestinationImage({ city, country, tripData }) || createDestinationPlaceholder(city || country || 'Destination');

  return (
    <div className={['relative overflow-hidden bg-sand-300', className].join(' ')}>
      <img
        src={image}
        alt={alt || [city, country].filter(Boolean).join(', ') || 'Destination'}
        className={['h-full w-full object-cover', imgClassName].join(' ')}
        loading="lazy"
      />
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-sand-900/65 via-sand-900/20 to-transparent" />}
      {children}
    </div>
  );
}
