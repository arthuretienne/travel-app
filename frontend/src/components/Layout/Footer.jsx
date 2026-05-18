// Public footer — primary internal-meshing surface for SEO.
// RULE: every link here must resolve to a route that exists in App.jsx.
import { Link } from 'react-router-dom';
import { Logo } from '../ui';
import { DESTINATIONS } from '../../data/destinations';

const CONTINENT_ORDER = ['Europe', 'Asia', 'North America', 'South America', 'Africa'];
const CONTINENT_FR = {
  Europe: 'Europe',
  Asia: 'Asie',
  'North America': 'Amérique du Nord',
  'South America': 'Amérique du Sud',
  Africa: 'Afrique & océan Indien',
};

function firstSlugForContinent(continent) {
  return DESTINATIONS.find((d) => d.continent === continent)?.slug;
}

export default function Footer() {
  const popular = DESTINATIONS.slice(0, 8);

  return (
    <footer className="border-t border-sand-200 bg-white px-5 py-12 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-text-main">
            Destinations populaires
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            {popular.map((d) => (
              <li key={d.slug}>
                <Link
                  to={`/destination/${d.slug}`}
                  className="transition-colors hover:text-ember-700"
                >
                  {d.cityFr || d.city}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/destinations" className="font-medium text-ember-700 hover:underline">
                Voir toutes les destinations →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-text-main">Par continent</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            {CONTINENT_ORDER.map((c) => {
              const slug = firstSlugForContinent(c);
              if (!slug) return null;
              return (
                <li key={c}>
                  <Link
                    to={`/destination/${slug}`}
                    className="transition-colors hover:text-ember-700"
                  >
                    {CONTINENT_FR[c]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-text-main">Skusku</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>
              <Link to="/#comment-ca-marche" className="transition-colors hover:text-ember-700">
                Comment ça marche
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="transition-colors hover:text-ember-700">
                Tarifs
              </Link>
            </li>
            <li>
              <Link to="/a-propos" className="transition-colors hover:text-ember-700">
                À propos
              </Link>
            </li>
            <li>
              <Link to="/contact" className="transition-colors hover:text-ember-700">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-text-main">Légal</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>
              <Link to="/mentions-legales" className="transition-colors hover:text-ember-700">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link to="/confidentialite" className="transition-colors hover:text-ember-700">
                Confidentialité
              </Link>
            </li>
            <li>
              <Link to="/cgu" className="transition-colors hover:text-ember-700">
                CGU
              </Link>
            </li>
            <li>
              <Link to="/cookies" className="transition-colors hover:text-ember-700">
                Cookies
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-sand-200 pt-6 md:flex-row">
        <Link to="/" aria-label="Skusku — accueil">
          <Logo size={24} />
        </Link>
        <p className="text-sm text-text-secondary">
          © {new Date().getFullYear()} Skusku · Planification de voyage par IA · FR
        </p>
      </div>
    </footer>
  );
}
