// frontend/src/pages/Landing.jsx
import { useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Map, Sparkles, Plane, ArrowRight, Globe, Zap, Shield, CheckCircle } from 'lucide-react';

function Landing() {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface-subtle font-sans text-text-main">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white">
              <Plane size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-text-main">Travel AI</span>
          </div>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 text-sm font-medium text-text-main hover:bg-surface-hover rounded-full transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 text-sm font-medium bg-text-main text-white hover:bg-black rounded-full transition-all shadow-lg shadow-gray-200 hover:shadow-xl">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-light text-primary text-sm font-semibold mb-8">
              <Sparkles size={16} />
              <span>AI-Powered Travel Planning</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8 text-text-main">
              Your next journey, <br />
              <span className="text-primary">intelligently designed.</span>
            </h1>

            <p className="text-xl text-text-secondary leading-relaxed mb-10 max-w-lg">
              Experience travel planning reimagined. Our AI crafts personalized itineraries that match your style, budget, and dreams perfectly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded-full hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group">
                    Start Planning Free
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <button
                  onClick={handleGoToDashboard}
                  className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded-full hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                >
                  Go to Dashboard
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </SignedIn>
            </div>

            <div className="mt-12 flex items-center gap-8 text-sm font-medium text-text-secondary">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                <span>Free to use</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>

          {/* Hero Visuals */}
          <div className="relative hidden lg:block h-[600px]">
            <div className="absolute top-10 left-10 w-72 bg-surface p-6 rounded-3xl shadow-card border border-gray-100 animate-float-slow z-20">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <Globe size={24} />
              </div>
              <h3 className="text-lg font-bold mb-1">Santorini, Greece</h3>
              <p className="text-text-secondary text-sm mb-3">7 days • 1,200€ budget</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-primary rounded-full"></div>
              </div>
            </div>

            <div className="absolute top-40 right-10 w-64 bg-surface p-6 rounded-3xl shadow-card border border-gray-100 animate-float-delayed z-10">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                <Map size={24} />
              </div>
              <h3 className="text-lg font-bold mb-1">Kyoto, Japan</h3>
              <p className="text-text-secondary text-sm">Cultural immersion</p>
            </div>

            <div className="absolute bottom-20 left-20 w-80 bg-surface p-6 rounded-3xl shadow-card border border-gray-100 animate-float z-30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">AI Recommendation</h3>
                  <p className="text-text-secondary text-xs">98% Match</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary">
                "Based on your love for hiking and photography, we recommend the Swiss Alps in September."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">Everything you need to explore the world</h2>
            <p className="text-xl text-text-secondary">Smart tools that make travel planning effortless and enjoyable.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: <Zap size={32} />,
                title: "Instant Itineraries",
                desc: "Generate complete day-by-day plans in seconds, not hours.",
                color: "bg-amber-100 text-amber-600"
              },
              {
                icon: <Shield size={32} />,
                title: "Smart Budgeting",
                desc: "Real-time cost estimation to keep your trip within budget.",
                color: "bg-emerald-100 text-emerald-600"
              },
              {
                icon: <Globe size={32} />,
                title: "Global Discovery",
                desc: "Uncover hidden gems and local favorites in any destination.",
                color: "bg-blue-100 text-blue-600"
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-surface-subtle hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100 group">
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-text-secondary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200 bg-surface-subtle">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center text-white">
              <Plane size={14} strokeWidth={3} />
            </div>
            <span className="font-bold text-text-main">Travel AI</span>
          </div>
          <p className="text-text-secondary text-sm">
            © 2025 Travel AI. Crafted with intelligence.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
