// frontend/src/components/Layout/AppLayout.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { LayoutDashboard, PlusCircle, User } from 'lucide-react';
import { Logo } from '../ui';

function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-subtle font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              className="flex items-center text-xl font-bold text-text-main hover:opacity-80 transition-opacity"
              onClick={() => navigate('/dashboard')}
            >
              <Logo size={32} />
            </button>

            <nav className="hidden md:flex items-center gap-1">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isActive('/dashboard')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-text-main'
                  }`}
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard size={18} />
                Accueil
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isActive('/create-trip')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-text-main'
                  }`}
                onClick={() => navigate('/create-trip')}
              >
                <PlusCircle size={18} />
                Nouveau voyage
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isActive('/account')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-text-main'
                  }`}
                onClick={() => navigate('/account')}
              >
                <User size={18} />
                Mon compte
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-text-main">
                {user?.firstName || 'Traveler'}
              </span>
              <span className="text-xs text-text-secondary">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 ring-2 ring-white shadow-sm",
                  userButtonPopoverCard: "shadow-xl border border-gray-100",
                  userButtonTrigger: "focus:shadow-none focus:outline-none",
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/dashboard') ? 'text-primary' : 'text-gray-400'
              }`}
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Accueil</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/create-trip') ? 'text-primary' : 'text-gray-400'
              }`}
            onClick={() => navigate('/create-trip')}
          >
            <PlusCircle size={20} />
            <span className="text-[10px] font-medium">Voyage</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/account') ? 'text-primary' : 'text-gray-400'
              }`}
            onClick={() => navigate('/account')}
          >
            <User size={20} />
            <span className="text-[10px] font-medium">Compte</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <span className="font-semibold text-text-main">Skusku</span>
              <span>&copy; 2026</span>
            </div>
            <div className="flex gap-6 text-sm text-text-secondary">
              <Link to="/privacy" className="hover:text-primary transition-colors">Confidentialité</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Conditions</Link>
              <Link to="/mentions-legales" className="hover:text-primary transition-colors">Mentions légales</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
