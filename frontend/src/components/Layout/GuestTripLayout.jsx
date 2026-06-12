// frontend/src/components/Layout/GuestTripLayout.jsx
// Layout pour un invité sans compte (guestSession) qui consulte le voyage de
// son invitation. Pas de nav app (dashboard/compte le renverraient vers la
// landing) — à la place, un CTA de conversion vers la création de compte.
import { Link } from 'react-router-dom';
import { SignUpButton } from '@clerk/clerk-react';
import { Logo } from '../ui';

function GuestTripLayout({ guestName, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-subtle font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-sand-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" aria-label="Skusku — accueil">
              <Logo size={32} />
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-sand-700 whitespace-nowrap">
              Mode invité{guestName ? ` · ${guestName}` : ''}
            </span>
          </div>
          <SignUpButton mode="modal">
            <button className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover">
              Créer mon compte — gratuit
            </button>
          </SignUpButton>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-sand-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-text-secondary">
          <span>
            Vous participez en invité. Créez un compte gratuit pour retrouver ce voyage à tout moment.
          </span>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-primary transition-colors">Confidentialité</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default GuestTripLayout;
