// frontend/src/pages/DestinationLanding.jsx
// Public, SEO-indexable destination landing page
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import {
  Plane, ArrowRight, MapPin, Calendar, DollarSign, Thermometer,
  Globe, Clock, Star, ChevronRight, Sparkles, TrendingDown,
  Sun, Snowflake, Hotel
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import { getDestinationBySlug, getMonthName, DESTINATIONS } from '../data/destinations';
import { getDestinationImage } from '../utils/destinationImages';
import { generateFlightLink, generateHotelLink } from '../utils/bookingLinks';

function DestinationLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const dest = getDestinationBySlug(slug);

  if (!dest) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text-main mb-2">Destination not found</h1>
          <p className="text-text-secondary mb-6">This destination page doesn't exist yet.</p>
          <Link to="/" className="text-primary font-medium hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const imageUrl = getDestinationImage({ city: dest.city, country: dest.country });
  const bestMonthNames = dest.bestMonths.map(m => getMonthName(m, lang));
  const description = lang === 'fr' ? dest.descriptionFr : dest.descriptionEn;
  const cityName = lang === 'fr' && dest.cityFr ? dest.cityFr : dest.city;
  const countryName = lang === 'fr' && dest.countryFr ? dest.countryFr : dest.country;
  const totalEstimate = dest.avgFlightPrice + (dest.avgHotelPrice * 5); // 5-night estimate

  // SEO structured data
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: dest.city,
    description: dest.descriptionEn,
    containedInPlace: {
      '@type': 'Country',
      name: dest.country,
    },
    touristType: dest.activities.map(a => {
      const map = { culture: 'Cultural tourist', plage: 'Beach tourist', gastro: 'Food tourist', nature: 'Nature tourist', histoire: 'History tourist', sport: 'Sports tourist', shopping: 'Shoppers', montagne: 'Mountain tourist' };
      return map[a] || a;
    }),
  };

  // Get related destinations (same continent, exclude current)
  const related = DESTINATIONS
    .filter(d => d.slug !== dest.slug && d.continent === dest.continent)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-white font-sans text-text-main">
      <SEO
        title={`${dest.city}, ${dest.country} — Flights & Hotels from €${dest.avgFlightPrice} | Skusku`}
        description={dest.descriptionEn}
        canonical={`https://skusku.life/destination/${dest.slug}`}
        ogImage={imageUrl}
        schema={schema}
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plane size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-text-main">Skusku</span>
          </Link>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
                  Get started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Dashboard
              </button>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16">
        <div className="h-72 md:h-96 relative overflow-hidden">
          <img
            src={imageUrl}
            alt={`${dest.city}, ${dest.country}`}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=800'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <Link to="/" className="hover:text-white">Home</Link>
                <ChevronRight size={14} />
                <span>Destinations</span>
                <ChevronRight size={14} />
                <span className="text-white">{dest.city}</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium text-white mb-3">
                {dest.city}
              </h1>
              <p className="text-xl text-white/90 flex items-center gap-2">
                <MapPin size={18} />
                {dest.country} · {dest.continent}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-light text-primary rounded-lg flex items-center justify-center">
                <Plane size={18} />
              </div>
              <div>
                <div className="text-xs text-text-secondary">Avg. flight</div>
                <div className="text-lg font-semibold">€{dest.avgFlightPrice}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <Hotel size={18} />
              </div>
              <div>
                <div className="text-xs text-text-secondary">Avg. hotel/night</div>
                <div className="text-lg font-semibold">€{dest.avgHotelPrice}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Sun size={18} />
              </div>
              <div>
                <div className="text-xs text-text-secondary">Summer temp</div>
                <div className="text-lg font-semibold">{dest.avgTemp.summer}°C</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Globe size={18} />
              </div>
              <div>
                <div className="text-xs text-text-secondary">Language</div>
                <div className="text-lg font-semibold">{dest.language}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left: Description + Details */}
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            <div>
              <h2 className="font-display text-2xl font-medium text-text-main mb-4">
                {t('destDetail.whyVisit', { city: cityName })}
              </h2>
              <p className="text-text-secondary text-lg leading-relaxed">
                {description}
              </p>
            </div>

            {/* Best Time to Visit */}
            <div>
              <h3 className="font-display text-xl font-medium text-text-main mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                {t('destDetail.bestTime')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {bestMonthNames.map((month, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-primary-light text-primary text-sm font-medium rounded-lg"
                  >
                    {month}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm text-text-secondary">
                <span className="flex items-center gap-1">
                  <Sun size={14} className="text-amber-500" />
                  Summer: {dest.avgTemp.summer}°C
                </span>
                <span className="flex items-center gap-1">
                  <Snowflake size={14} className="text-blue-400" />
                  Winter: {dest.avgTemp.winter}°C
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign size={14} className="text-emerald-500" />
                  Currency: {dest.currency}
                </span>
              </div>
            </div>

            {/* Highlights */}
            <div>
              <h3 className="font-display text-xl font-medium text-text-main mb-4 flex items-center gap-2">
                <Star size={20} className="text-amber-500" />
                {t('destDetail.topHighlights')}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {dest.highlights.map((highlight, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100"
                  >
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary font-semibold text-sm border border-stone-100">
                      {i + 1}
                    </div>
                    <span className="font-medium text-text-main">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Travel Tips */}
            <div>
              <h3 className="font-display text-xl font-medium text-text-main mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                {t('destDetail.localTips')}
              </h3>
              <div className="space-y-3">
                {dest.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-primary-light rounded-xl">
                    <TrendingDown size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-text-main text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Price Estimate Card */}
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100 sticky top-24">
              <h3 className="font-semibold text-text-main mb-1">{t('destDetail.estimatedCost')}</h3>
              <p className="text-xs text-text-secondary mb-4">5 nights, based on average prices</p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Return flight</span>
                  <span className="font-medium">€{dest.avgFlightPrice}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Hotel (5 nights)</span>
                  <span className="font-medium">€{dest.avgHotelPrice * 5}</span>
                </div>
                <div className="border-t border-stone-200 pt-3 flex justify-between items-center">
                  <span className="font-semibold text-text-main">Total estimate</span>
                  <span className="text-xl font-bold text-primary">€{totalEstimate}</span>
                </div>
              </div>

              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors flex items-center justify-center gap-2">
                    {t('destDetail.planTrip', { city: cityName })}
                    <ArrowRight size={18} />
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <button
                  onClick={() => navigate('/create-trip', { state: { prefilledDestination: dest.city } })}
                  className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                >
                  {t('destDetail.planTrip', { city: cityName })}
                  <ArrowRight size={18} />
                </button>
              </SignedIn>

              <div className="flex gap-2 mt-3">
                <a
                  href={generateFlightLink({ destinationCity: dest.city, destinationIata: dest.iata, destinationCountry: dest.country })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 text-center text-sm font-medium border border-stone-200 rounded-lg hover:bg-white transition-colors"
                >
                  {t('destDetail.searchFlights')}
                </a>
                <a
                  href={generateHotelLink({ destinationCity: dest.city, destinationCountry: dest.country })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 text-center text-sm font-medium border border-stone-200 rounded-lg hover:bg-white transition-colors"
                >
                  {t('destDetail.searchHotels')}
                </a>
              </div>
            </div>

            {/* Quick Facts */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100">
              <h3 className="font-semibold text-text-main mb-4">{t('destDetail.quickFacts')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Currency</span>
                  <span className="font-medium">{dest.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Language</span>
                  <span className="font-medium">{dest.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Timezone</span>
                  <span className="font-medium">{dest.timezone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Airport code</span>
                  <span className="font-mono font-medium">{dest.iata}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Destinations */}
      {related.length > 0 && (
        <section className="bg-stone-50 py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl font-medium text-text-main mb-8">
              {t('destDetail.similar')}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  to={`/destination/${rel.slug}`}
                  className="bg-white rounded-xl overflow-hidden border border-stone-100 hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className="h-32 overflow-hidden">
                    <img
                      src={getDestinationImage({ city: rel.city, country: rel.country })}
                      alt={`${rel.city}, ${rel.country}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => { e.target.src = 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=800'; }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-text-main">{rel.city}</h3>
                    <p className="text-sm text-text-secondary">{rel.country}</p>
                    <p className="text-sm font-medium text-primary mt-2">
                      From €{rel.avgFlightPrice}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl font-medium text-text-main mb-4">
            {t('destDetail.readyExplore', { city: cityName })}
          </h2>
          <p className="text-lg text-text-secondary mb-8">
            {t('destDetail.readyExploreDesc')}
          </p>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-hover transition-colors">
                {t('destDetail.startFree')}
                <ArrowRight size={20} />
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <button
              onClick={() => navigate('/create-trip', { state: { prefilledDestination: dest.city } })}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              {t('destDetail.planMyTrip', { city: cityName })}
              <ArrowRight size={20} />
            </button>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Plane size={12} className="text-white" />
            </div>
            <span className="font-semibold text-text-main">Skusku</span>
          </Link>
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            {DESTINATIONS.slice(0, 8).map(d => (
              <Link key={d.slug} to={`/destination/${d.slug}`} className="hover:text-primary transition-colors">
                {d.city}
              </Link>
            ))}
          </div>
          <p className="text-sm text-text-secondary">
            © 2025 Skusku. AI-powered travel planning.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default DestinationLanding;
