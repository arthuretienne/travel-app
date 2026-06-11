// frontend/src/pages/legal/LegalLayout.jsx
// Layout partagé des pages légales & contact (publiques).
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/ui';
import SEO from '../../components/SEO';

/**
 * Placeholder volontairement très visible : Arthur remplace [RAISON SOCIALE],
 * [ADRESSE], [EMAIL CONTACT] avant le launch. Ne pas inventer d'entité.
 */
export function Placeholder({ children }) {
  return (
    <mark className="rounded bg-gold-100 px-1.5 py-0.5 font-mono text-[0.95em] font-semibold text-text-main">
      [{children}]
    </mark>
  );
}

export const LEGAL_LINKS = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/terms', label: 'Conditions générales' },
  { to: '/privacy', label: 'Confidentialité' },
  { to: '/contact', label: 'Contact' },
];

function LegalLayout({ title, updated, seoDescription, children }) {
  return (
    <div className="min-h-screen bg-surface-subtle font-sans text-text-main">
      <SEO title={`${title} — Skusku`} description={seoDescription} />

      <header className="border-b border-sand-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/" aria-label="Skusku — accueil">
            <Logo size={28} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-ember-700"
          >
            <ArrowLeft size={15} />
            Retour à l'accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <h1 className="font-display text-3xl font-medium leading-tight md:text-4xl">{title}</h1>
        {updated && (
          <p className="mt-3 text-sm text-text-secondary">Dernière mise à jour : {updated}</p>
        )}
        <div className="legal-prose mt-8 space-y-8 text-[15px] leading-7 text-text-secondary [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-text-main [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-main [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-ember-700 [&_a]:underline-offset-2 hover:[&_a]:underline">
          {children}
        </div>
      </main>

      <footer className="border-t border-sand-200 bg-white px-5 py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-sm text-text-secondary md:flex-row md:justify-between">
          <span>Skusku © 2026</span>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="transition-colors hover:text-ember-700">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default LegalLayout;
