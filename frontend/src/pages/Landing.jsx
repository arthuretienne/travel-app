// frontend/src/pages/Landing.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Plane, ArrowRight, Globe, Sparkles, Calendar, CreditCard, Users, ChevronRight, Star, MapPin, Search, ExternalLink, Hotel } from 'lucide-react';
import { getFeaturedDestinations, getDestinationImage } from '../utils/destinationImages';
import { AIRPORTS, searchAirports, getPrimaryAirport } from '../data/airports';
import { generateFlightLink, generateHotelLink, generateActivitiesLink } from '../utils/bookingLinks';

// Popular destinations for quick search
const POPULAR_DESTINATIONS = [
  { city: 'Lisbon', country: 'Portugal', iata: 'LIS' },
  { city: 'Barcelona', country: 'Spain', iata: 'BCN' },
  { city: 'Rome', country: 'Italy', iata: 'FCO' },
  { city: 'Porto', country: 'Portugal', iata: 'OPO' },
  { city: 'Amsterdam', country: 'Netherlands', iata: 'AMS' },
  { city: 'Prague', country: 'Czech Republic', iata: 'PRG' },
  { city: 'Marrakech', country: 'Morocco', iata: 'RAK' },
  { city: 'Dubrovnik', country: 'Croatia', iata: 'DBV' },
];

function Landing() {
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const searchRef = useRef(null);

  // Handle search input
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length >= 2) {
      // Search in airports database
      const airportMatches = searchAirports(query);
      // Also search in popular destinations
      const popularMatches = POPULAR_DESTINATIONS.filter(d =>
        d.city.toLowerCase().includes(query.toLowerCase()) ||
        d.country.toLowerCase().includes(query.toLowerCase())
      );

      // Combine and deduplicate
      const combined = [
        ...popularMatches.map(d => ({ type: 'destination', ...d })),
        ...airportMatches.map(a => ({ type: 'airport', city: a.city, country: a.country, iata: a.code }))
      ];

      // Dedupe by city
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.city.toLowerCase() === item.city.toLowerCase())
      );

      setSuggestions(unique.slice(0, 6));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Select destination
  const handleSelectDestination = (dest) => {
    setSelectedDestination(dest);
    setSearchQuery(dest.city);
    setShowSuggestions(false);
  };

  // Handle search submit
  const handleSearch = () => {
    if (!selectedDestination && searchQuery) {
      // Try to find a matching destination
      const airport = getPrimaryAirport(searchQuery);
      if (airport) {
        setSelectedDestination({ city: airport.city, country: airport.country, iata: airport.code });
      }
    }

    const dest = selectedDestination || { city: searchQuery, country: '' };
    if (!dest.city) return;

    // Generate booking links and open flight search
    const flightUrl = generateFlightLink({
      destinationCity: dest.city,
      destinationIata: dest.iata,
      destinationCountry: dest.country
    });

    window.open(flightUrl, '_blank');
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-text-main">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plane size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-text-main">Skusku</span>
          </div>

          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-main transition-colors">
                  Sign in
                </button>
              </SignInButton>
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
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-light text-primary text-sm font-medium rounded-full mb-6">
              <Sparkles size={14} />
              AI-powered travel planning
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight text-text-main mb-6 leading-[1.1]">
              Plan your perfect trip in minutes
            </h1>

            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              Tell us your preferences. Our AI finds destinations, flights, and hotels that match your style and budget.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-hover transition-colors">
                    Start planning
                    <ArrowRight size={20} />
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-hover transition-colors"
                >
                  Go to dashboard
                  <ArrowRight size={20} />
                </button>
              </SignedIn>
            </div>
          </div>

          {/* Hero Visual - Trip Cards Preview */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-stone-50 rounded-2xl p-6 md:p-8 border border-stone-100">
              {/* Functional Search Bar */}
              <div ref={searchRef} className="relative mb-6">
                <div className="bg-white rounded-xl p-3 border border-stone-200 flex items-center gap-3">
                  {/* Destination Input */}
                  <div className="flex-1 relative">
                    <div className="flex items-center gap-3">
                      <MapPin size={20} className="text-primary flex-shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                        placeholder="Ou voulez-vous aller ?"
                        className="w-full text-text-main placeholder:text-text-secondary bg-transparent outline-none"
                      />
                    </div>
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search size={18} />
                    <span className="hidden sm:inline">Rechercher</span>
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-stone-200 shadow-lg z-20 overflow-hidden">
                    {suggestions.map((dest, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDestination(dest)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                          <Plane size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-text-main">{dest.city}</p>
                          <p className="text-sm text-text-secondary">{dest.country}</p>
                        </div>
                        {dest.iata && (
                          <span className="ml-auto text-xs font-mono bg-stone-100 px-2 py-1 rounded">
                            {dest.iata}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick Access - Popular Destinations */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-text-secondary">Populaire:</span>
                  {POPULAR_DESTINATIONS.slice(0, 4).map((dest, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectDestination(dest)}
                      className="text-xs px-2.5 py-1 bg-white border border-stone-200 rounded-full hover:border-primary hover:text-primary transition-colors"
                    >
                      {dest.city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Result Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { city: 'Lisbon', country: 'Portugal', price: 847, match: 96 },
                  { city: 'Barcelona', country: 'Spain', price: 923, match: 94 },
                  { city: 'Rome', country: 'Italy', price: 1105, match: 91 },
                ].map((dest, i) => (
                  <div key={i} className="bg-white rounded-xl overflow-hidden border border-stone-100 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group">
                    <div className="h-32 overflow-hidden relative">
                      <img
                        src={getDestinationImage({ city: dest.city, country: dest.country })}
                        alt={`${dest.city}, ${dest.country}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-text-main">{dest.city}</h3>
                          <p className="text-sm text-text-secondary">{dest.country}</p>
                        </div>
                        <div className="px-2 py-1 bg-primary-light text-primary text-xs font-medium rounded">
                          {dest.match}% match
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <span className="font-semibold text-text-main">€{dest.price}</span>
                        <span className="text-xs text-text-secondary">7 days • flights + hotel</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-medium text-text-main mb-4">
              How it works
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Three simple steps to your next adventure
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: <Users size={24} />,
                title: 'Tell us about yourself',
                desc: 'Complete a quick profile with your travel style, budget, and preferences.'
              },
              {
                step: '02',
                icon: <Sparkles size={24} />,
                title: 'Get AI recommendations',
                desc: 'Our AI analyzes thousands of options to find destinations that match you perfectly.'
              },
              {
                step: '03',
                icon: <Plane size={24} />,
                title: 'Book and go',
                desc: 'Review real flights and hotels, then book directly with our partners.'
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-2xl p-8 border border-stone-100 h-full">
                  <div className="text-6xl font-display font-medium text-stone-100 absolute top-6 right-6">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 bg-primary-light text-primary rounded-xl flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-text-main mb-3">{item.title}</h3>
                  <p className="text-text-secondary">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-text-main mb-6">
                Everything you need, nothing you don't
              </h2>
              <p className="text-lg text-text-secondary mb-10">
                We focus on what matters: finding you the right destination at the right price.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: <Globe size={20} />,
                    title: 'Personalized destinations',
                    desc: 'AI matches destinations to your unique travel personality'
                  },
                  {
                    icon: <CreditCard size={20} />,
                    title: 'Real prices, real availability',
                    desc: 'Live flight and hotel data from Booking.com'
                  },
                  {
                    icon: <Calendar size={20} />,
                    title: 'Flexible date search',
                    desc: 'Find the cheapest times to travel based on your schedule'
                  },
                  {
                    icon: <Users size={20} />,
                    title: 'Group trip planning',
                    desc: 'Invite friends and vote on destinations together'
                  }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 bg-primary-light text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-main mb-1">{feature.title}</h3>
                      <p className="text-text-secondary text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-100">
              <div className="bg-white rounded-xl p-6 border border-stone-100 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-text-main">AI Assistant</p>
                    <p className="text-xs text-text-secondary">Based on your profile</p>
                  </div>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed">
                  "You love outdoor activities and good food. I found 3 destinations with hiking trails and top-rated restaurants, all within your €1,500 budget."
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['🏔️ Alps', '🏖️ Beach', '🏛️ Culture'].map((tag, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 text-center border border-stone-100">
                    <span className="text-sm">{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6 bg-primary-light">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} className="text-primary fill-primary" />
              ))}
              <span className="ml-2 font-medium text-text-main">4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-8 text-text-secondary">
              <div className="text-center">
                <div className="text-2xl font-semibold text-text-main">10k+</div>
                <div className="text-sm">trips planned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-text-main">150+</div>
                <div className="text-sm">destinations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-text-main">€2.3M</div>
                <div className="text-sm">saved for travelers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-medium text-text-main mb-6">
            Ready to plan your next adventure?
          </h2>
          <p className="text-lg text-text-secondary mb-10">
            Join thousands of travelers who've discovered their perfect trips with Skusku.
          </p>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-hover transition-colors">
                Get started for free
                <ChevronRight size={20} />
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              Go to dashboard
              <ChevronRight size={20} />
            </button>
          </SignedIn>

          <p className="mt-6 text-sm text-text-secondary">
            No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Plane size={12} className="text-white" />
            </div>
            <span className="font-semibold text-text-main">Skusku</span>
          </div>
          <p className="text-sm text-text-secondary">
            © 2025 Skusku. AI-powered travel planning.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
