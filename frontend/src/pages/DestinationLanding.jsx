import { Link, useNavigate, useParams } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  DollarSign,
  Globe,
  Hotel,
  Plane,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import SEO from '../components/SEO';
import { DESTINATIONS, getDestinationBySlug, getMonthName } from '../data/destinations';
import { getDestinationImage } from '../utils/destinationImages';
import { generateFlightLink, generateHotelLink } from '../utils/bookingLinks';
import { Badge, Button, Logo, PhotoBlock } from '../components/ui';
import { formatEUR } from '../utils/format';

function DestinationLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const dest = getDestinationBySlug(slug);

  if (!dest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold text-text-main">{t('destDetail.notFoundTitle')}</h1>
          <p className="mb-6 text-text-secondary">{t('destDetail.notFoundDesc')}</p>
          <Link to="/" className="font-medium text-ember-700 hover:underline">{t('destDetail.backHome')}</Link>
        </div>
      </div>
    );
  }

  const imageUrl = getDestinationImage({ city: dest.city, country: dest.country });
  const bestMonthNames = dest.bestMonths.map((month) => getMonthName(month, lang));
  const description = lang === 'fr' ? dest.descriptionFr : dest.descriptionEn;
  const cityName = lang === 'fr' && dest.cityFr ? dest.cityFr : dest.city;
  const countryName = lang === 'fr' && dest.countryFr ? dest.countryFr : dest.country;
  const totalEstimate = dest.avgFlightPrice + (dest.avgHotelPrice * 5);
  const related = DESTINATIONS
    .filter((item) => item.slug !== dest.slug && item.continent === dest.continent)
    .slice(0, 4);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: dest.city,
    description: dest.descriptionEn,
    containedInPlace: {
      '@type': 'Country',
      name: dest.country,
    },
    touristType: dest.activities.map((activity) => {
      const map = {
        culture: 'Cultural tourist',
        plage: 'Beach tourist',
        gastro: 'Food tourist',
        nature: 'Nature tourist',
        histoire: 'History tourist',
        sport: 'Sports tourist',
        shopping: 'Shoppers',
        montagne: 'Mountain tourist',
      };
      return map[activity] || activity;
    }),
  };

  const goToCreateTrip = () => navigate('/create-trip', {
    state: {
      prefilledDestination: {
        city: dest.city,
        country: dest.country,
        iata: dest.iata,
      },
    },
  });

  return (
    <div className="min-h-screen bg-surface-subtle font-sans text-text-main">
      <SEO
        title={`${dest.city}, ${dest.country} — Flights & Hotels from ${formatEUR(dest.avgFlightPrice)} | Skusku`}
        description={dest.descriptionEn}
        canonical={`https://skusku.life/destination/${dest.slug}`}
        ogImage={imageUrl}
        schema={schema}
      />

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-sand-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link to="/" aria-label="Skusku home">
            <Logo size={30} />
          </Link>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="sm">{t('nav.getStarted')}</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button size="sm" variant="ink" onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</Button>
            </SignedIn>
          </div>
        </div>
      </nav>

      <section className="relative pt-16">
        <div className="relative h-[460px] overflow-hidden md:h-[520px]">
          <PhotoBlock
            src={imageUrl}
            alt={`${cityName}, ${countryName}`}
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sand-900 via-sand-900/65 to-sand-900/10" />
          <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-10 text-white md:px-8">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-white/72">
              <Link to="/" className="hover:text-white">{t('common.home')}</Link>
              <ChevronRight size={13} />
              <span>{t('common.destinations')}</span>
              <ChevronRight size={13} />
              <span className="text-white">{cityName}</span>
            </div>
            <Badge tone="ink" className="mb-5 w-fit bg-white/15 text-white">
              {countryName} · {dest.continent}
            </Badge>
            <h1 className="max-w-4xl font-display text-6xl font-medium leading-[0.92] md:text-[92px]">
              {cityName}, <span className="italic text-ember-200">{t('destDetail.heroMadeYours')}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">
              {description}
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-sand-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-6 sm:grid-cols-2 md:grid-cols-4 md:px-8">
          <QuickFact icon={<Plane size={18} />} label={t('destDetail.avgFlight')} value={`${formatEUR(dest.avgFlightPrice)}`} />
          <QuickFact icon={<Hotel size={18} />} label={t('destDetail.avgHotel')} value={`${formatEUR(dest.avgHotelPrice)}`} />
          <QuickFact icon={<Sun size={18} />} label={t('destDetail.summerLabel')} value={`${dest.avgTemp.summer}°C`} />
          <QuickFact icon={<Globe size={18} />} label={t('destDetail.language')} value={dest.language} />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">
              {t('destDetail.whyGoEyebrow')}
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium">
              {t('destDetail.whyVisit', { city: cityName })}
            </h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-text-secondary">
              {description}
            </p>
          </div>

          <div className="rounded-[18px] border border-sand-200 bg-white p-6 shadow-1">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-ember-50 text-ember-700">
                <Calendar size={19} />
              </span>
              <h3 className="font-display text-2xl font-medium">{t('destDetail.bestTime')}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {t('destDetail.bestTimeDesc')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {bestMonthNames.map((month) => (
                <span key={month} className="rounded-full border border-ember-200 bg-white px-4 py-2 text-sm font-medium text-ember-800">
                  {month}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">
              {t('destDetail.gemsEyebrow')}
            </p>
            <h3 className="mt-2 font-display text-3xl font-medium">{t('destDetail.topHighlights')}</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {dest.highlights.map((highlight, index) => (
                <div key={highlight} className="flex gap-4 rounded-[16px] border border-sand-200 bg-white p-4 shadow-1">
                  <span className="font-display text-3xl leading-none text-ember-700">{index + 1}</span>
                  <span className="pt-1 font-medium text-text-main">{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">
              {t('destDetail.localTipsEyebrow')}
            </p>
            <h3 className="mt-2 font-display text-3xl font-medium">{t('destDetail.localTips')}</h3>
            <div className="mt-5 grid gap-3">
              {dest.tips.map((tip, index) => (
                <div key={`${tip}-${index}`} className="rounded-[16px] border border-ember-100 bg-ember-50 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles size={17} className="mt-1 text-ember-700" />
                    <p className="text-sm leading-6 text-text-main">{tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[20px] border border-sand-200 bg-white p-6 shadow-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">
              {t('destDetail.estimatedCost')}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{t('destDetail.costSubtitle')}</p>

            <div className="mt-6 space-y-3">
              <EstimateRow label={t('destDetail.returnFlight')} value={`${formatEUR(dest.avgFlightPrice)}`} />
              <EstimateRow label={t('destDetail.hotelNights')} value={`${formatEUR(dest.avgHotelPrice * 5)}`} />
              <div className="flex items-baseline justify-between border-t border-sand-200 pt-4">
                <span className="font-semibold text-text-main">{t('destDetail.totalEstimate')}</span>
                <span className="font-display text-3xl font-medium text-ember-700">{formatEUR(totalEstimate)}</span>
              </div>
            </div>

            <div className="mt-6">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button full size="lg" iconRight={<ArrowRight size={17} />}>
                    {t('destDetail.planTrip', { city: cityName })}
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Button full size="lg" onClick={goToCreateTrip} iconRight={<ArrowRight size={17} />}>
                  {t('destDetail.planTrip', { city: cityName })}
                </Button>
              </SignedIn>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={generateFlightLink({ destinationCity: dest.city, destinationIata: dest.iata, destinationCountry: dest.country })}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[10px] border border-sand-200 px-3 py-2.5 text-center text-sm font-medium transition-colors hover:bg-sand-50"
              >
                {t('destDetail.searchFlights')}
              </a>
              <a
                href={generateHotelLink({ destinationCity: dest.city, destinationCountry: dest.country })}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[10px] border border-sand-200 px-3 py-2.5 text-center text-sm font-medium transition-colors hover:bg-sand-50"
              >
                {t('destDetail.searchHotels')}
              </a>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border border-sand-200 bg-white p-5 shadow-1">
            <h3 className="mb-4 font-semibold text-text-main">{t('destDetail.quickFacts')}</h3>
            <div className="space-y-3 text-sm">
              <EstimateRow label={t('destDetail.currencyLabel')} value={dest.currency} />
              <EstimateRow label={t('destDetail.language')} value={dest.language} />
              <EstimateRow label={t('destDetail.timezone')} value={dest.timezone} />
              <EstimateRow label={t('destDetail.airportCode')} value={dest.iata} mono />
            </div>
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="bg-sand-100 px-5 py-14 md:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">
              {t('destDetail.similarEyebrow')}
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium">{t('destDetail.similar')}</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  to={`/destination/${rel.slug}`}
                  className="overflow-hidden rounded-[16px] border border-sand-200 bg-white shadow-1 transition-all hover:border-ember-200 hover:shadow-2"
                >
                  <PhotoBlock city={rel.city} country={rel.country} className="h-36" alt={`${rel.city}, ${rel.country}`} overlay={false} />
                  <div className="p-4">
                    <h3 className="font-display text-xl font-medium">{rel.city}</h3>
                    <p className="text-sm text-text-secondary">{rel.country}</p>
                    <p className="mt-3 text-sm font-medium text-ember-700">{t('destDetail.fromPrice', { price: rel.avgFlightPrice })}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto max-w-4xl rounded-[22px] bg-sand-900 p-8 text-center text-white shadow-3 md:p-12">
          <h2 className="font-display text-4xl font-medium">
            {t('destDetail.readyExplore', { city: cityName })}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/65">
            {t('destDetail.readyExploreDesc')}
          </p>
          <div className="mt-8">
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg" iconRight={<ArrowRight size={18} />}>{t('destDetail.startFree')}</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button size="lg" onClick={goToCreateTrip} iconRight={<ArrowRight size={18} />}>
                {t('destDetail.planMyTrip', { city: cityName })}
              </Button>
            </SignedIn>
          </div>
        </div>
      </section>

      <footer className="border-t border-sand-200 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <Link to="/" aria-label="Skusku home"><Logo size={26} /></Link>
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            {DESTINATIONS.slice(0, 8).map((item) => (
              <Link key={item.slug} to={`/destination/${item.slug}`} className="transition-colors hover:text-ember-700">
                {item.city}
              </Link>
            ))}
          </div>
          <p className="text-sm text-text-secondary">© 2026 Skusku.</p>
        </div>
      </footer>
    </div>
  );
}

function QuickFact({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-ember-50 text-ember-700">
        {icon}
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-widest text-text-secondary">{label}</span>
        <span className="block font-display text-xl font-medium">{value}</span>
      </span>
    </div>
  );
}

function EstimateRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={mono ? 'font-mono text-sm font-medium text-text-main' : 'font-medium text-text-main'}>{value}</span>
    </div>
  );
}

export default DestinationLanding;
