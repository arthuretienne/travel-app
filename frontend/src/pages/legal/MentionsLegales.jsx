// frontend/src/pages/legal/MentionsLegales.jsx
import LegalLayout, { Placeholder } from './LegalLayout';

function MentionsLegales() {
  return (
    <LegalLayout
      title="Mentions légales"
      updated="11 juin 2026"
      seoDescription="Mentions légales du service Skusku : éditeur, hébergement, propriété intellectuelle."
    >
      <section>
        <h2>Éditeur du site</h2>
        <p className="mt-3">
          Le site skusku.life (ci-après « Skusku ») est édité par <Placeholder>RAISON SOCIALE</Placeholder>,
          dont le siège social est situé <Placeholder>ADRESSE</Placeholder>.
        </p>
        <ul className="mt-3">
          <li>Forme juridique : <Placeholder>FORME JURIDIQUE (ex. SAS, micro-entreprise)</Placeholder></li>
          <li>Capital social : <Placeholder>CAPITAL SOCIAL</Placeholder></li>
          <li>RCS / SIREN : <Placeholder>NUMÉRO RCS OU SIREN</Placeholder></li>
          <li>N° TVA intracommunautaire : <Placeholder>NUMÉRO TVA</Placeholder></li>
          <li>Directeur de la publication : <Placeholder>NOM DU DIRECTEUR DE PUBLICATION</Placeholder></li>
          <li>Contact : <Placeholder>EMAIL CONTACT</Placeholder></li>
        </ul>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p className="mt-3">Le site et ses services sont hébergés par :</p>
        <ul className="mt-3">
          <li>
            <strong>Vercel Inc.</strong> (interface web) — 440 N Barranca Ave #4133, Covina, CA 91723,
            États-Unis — vercel.com
          </li>
          <li>
            <strong>Render Services, Inc.</strong> (services applicatifs) — 525 Brannan Street, Suite 300,
            San Francisco, CA 94107, États-Unis — render.com
          </li>
          <li>
            <strong>Neon Inc.</strong> (base de données) — 209 Orange Street, Wilmington, DE 19801,
            États-Unis — neon.tech
          </li>
        </ul>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p className="mt-3">
          La marque « Skusku », le logo, la charte graphique ainsi que l'ensemble des contenus originaux du
          site (textes, visuels, code) sont la propriété exclusive de <Placeholder>RAISON SOCIALE</Placeholder>.
          Toute reproduction, représentation ou exploitation, totale ou partielle, sans autorisation écrite
          préalable est interdite.
        </p>
        <p className="mt-3">
          Les photographies de destinations proviennent de banques d'images partenaires (notamment Pexels)
          et restent la propriété de leurs auteurs respectifs.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p className="mt-3">
          Le traitement de vos données personnelles est décrit dans notre{' '}
          <a href="/privacy">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>Nous contacter</h2>
        <p className="mt-3">
          Pour toute question relative au site ou à ses services :{' '}
          <a href="/contact">page contact</a> ou <Placeholder>EMAIL CONTACT</Placeholder>.
        </p>
      </section>
    </LegalLayout>
  );
}

export default MentionsLegales;
