// Minimal scaffold for "serious business" pages (legal, about, contact).
// Legal/CGU/privacy copy MUST be provided by the site owner — we never
// invent it. Empty pages are noindex so thin content isn't crawled; flip
// `noindex` off (and add the route to scripts/routes.mjs) once filled in.
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';
import SEO from '../components/SEO';
import Footer from '../components/Layout/Footer';

export default function StaticPage({ title, slug, intro, filled = false }) {
  return (
    <div
      className="min-h-screen bg-surface-subtle font-sans text-text-main"
      data-prerender-ready="true"
    >
      <SEO
        title={`${title} | Skusku`}
        description={intro}
        canonical={`https://skusku.life/${slug}`}
        noindex={!filled}
      />
      <nav className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link to="/" aria-label="Skusku — accueil">
            <Logo size={28} />
          </Link>
          <Link to="/" className="text-sm font-medium text-ember-700 hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <h1 className="font-display text-4xl font-medium">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-text-secondary">{intro}</p>
        {!filled && (
          <div className="mt-8 rounded-[14px] border border-sand-200 bg-white p-6 text-sm leading-7 text-text-secondary">
            [Contenu à fournir] — le texte de cette page sera ajouté par
            l'équipe Skusku. Cette page n'est pas indexée tant qu'elle est
            vide.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
