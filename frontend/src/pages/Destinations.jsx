// frontend/src/pages/Destinations.jsx
// Public, SEO-indexable destinations index page
import { Link, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { Plane, ArrowRight, MapPin, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';
import { DESTINATIONS } from '../data/destinations';
import { getDestinationImage } from '../utils/destinationImages';

// Group by continent
function groupByContinent(destinations) {
  const groups = {};
  destinations.forEach(d => {
    if (!groups[d.continent]) groups[d.continent] = [];
    groups[d.continent].push(d);
  });
  return groups;
}

function Destinations() {
  const navigate = useNavigate();
  const grouped = groupByContinent(DESTINATIONS);
  const continentOrder = ['Europe', 'Asia', 'North America', 'Africa'];

  return (
    <div className="min-h-screen bg-white font-sans text-text-main">
      <SEO
        title="All Destinations — Cheap Flights & Hotels | Skusku"
        description="Explore 20+ destinations with AI-powered travel planning. Find the best flights, hotels, and itineraries for Lisbon, Barcelona, Rome, Bali, Tokyo, and more."
        canonical="https://skusku.life/destinations"
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
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-light text-primary text-sm font-medium rounded-full mb-6">
            <Sparkles size={14} />
            {DESTINATIONS.length} destinations
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-medium text-text-main mb-4">
            Explore all destinations
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Find the cheapest flights and best hotels for each destination. Prices updated regularly.
          </p>
        </div>
      </section>

      {/* Destinations Grid by Continent */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {continentOrder.map(continent => {
          const dests = grouped[continent];
          if (!dests) return null;

          return (
            <div key={continent} className="mb-16">
              <h2 className="font-display text-2xl font-medium text-text-main mb-6 flex items-center gap-2">
                <MapPin size={20} className="text-primary" />
                {continent}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dests.map(dest => (
                  <Link
                    key={dest.slug}
                    to={`/destination/${dest.slug}`}
                    className="bg-white rounded-xl overflow-hidden border border-stone-100 hover:border-primary/30 hover:shadow-lg transition-all group"
                  >
                    <div className="h-36 overflow-hidden relative">
                      <img
                        src={getDestinationImage({ city: dest.city, country: dest.country })}
                        alt={`${dest.city}, ${dest.country}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => { e.target.src = 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=800'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className="px-2 py-1 bg-white/90 text-text-main text-xs font-medium rounded-md">
                          {dest.iata}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="font-semibold text-text-main">{dest.city}</h3>
                          <p className="text-sm text-text-secondary">{dest.country}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-stone-50 mt-3">
                        <div>
                          <span className="text-xs text-text-secondary">From </span>
                          <span className="font-semibold text-primary">€{dest.avgFlightPrice}</span>
                        </div>
                        <div className="text-xs text-text-secondary">
                          Hotel ~€{dest.avgHotelPrice}/night
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-stone-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl font-medium text-text-main mb-4">
            Don't see your dream destination?
          </h2>
          <p className="text-lg text-text-secondary mb-8">
            Tell our AI what you're looking for and it will find the perfect match.
          </p>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-hover transition-colors">
                Get AI recommendations
                <ArrowRight size={20} />
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <button
              onClick={() => navigate('/create-trip')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              Get AI recommendations
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
          <p className="text-sm text-text-secondary">
            © 2025 Skusku. AI-powered travel planning.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Destinations;
