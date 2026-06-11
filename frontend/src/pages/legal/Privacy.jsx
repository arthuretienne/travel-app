// frontend/src/pages/legal/Privacy.jsx
import LegalLayout, { Placeholder } from './LegalLayout';

const SUBPROCESSORS = [
  ['Clerk Inc.', 'Authentification et gestion des comptes', 'États-Unis (clauses contractuelles types)'],
  ['Stripe Payments Europe Ltd.', 'Paiements et abonnements', 'Irlande / États-Unis'],
  ['Vercel Inc.', 'Hébergement de l\'interface web', 'États-Unis'],
  ['Render Services, Inc.', 'Hébergement des services applicatifs', 'États-Unis / UE'],
  ['Neon Inc.', 'Base de données', 'UE (région de déploiement)'],
  ['Anthropic PBC', 'Génération des recommandations et itinéraires (IA)', 'États-Unis'],
  ['Booking.com (via RapidAPI)', 'Recherche de vols et d\'hôtels', 'UE / États-Unis'],
  ['Resend Inc.', 'Envoi d\'emails transactionnels', 'États-Unis'],
  ['Upstash Inc.', 'Cache applicatif', 'États-Unis / UE'],
  ['Plausible Insights OÜ', 'Mesure d\'audience sans cookies', 'UE (Estonie)'],
];

function Privacy() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      updated="11 juin 2026"
      seoDescription="Comment Skusku collecte, utilise et protège vos données personnelles (RGPD)."
    >
      <section>
        <p>
          Cette politique décrit comment <Placeholder>RAISON SOCIALE</Placeholder> (« Skusku », « nous »)
          traite vos données personnelles lorsque vous utilisez skusku.life, conformément au Règlement
          général sur la protection des données (RGPD) et à la loi Informatique et Libertés.
        </p>
        <p className="mt-3">
          Responsable de traitement : <Placeholder>RAISON SOCIALE</Placeholder>, <Placeholder>ADRESSE</Placeholder> —{' '}
          <Placeholder>EMAIL CONTACT</Placeholder>.
        </p>
      </section>

      <section>
        <h2>1. Données que nous collectons</h2>
        <ul className="mt-3">
          <li>
            <strong>Données de compte</strong> : nom, prénom, adresse email, photo de profil éventuelle —
            collectées à l'inscription via notre prestataire d'authentification Clerk.
          </li>
          <li>
            <strong>Profil voyageur</strong> : préférences de voyage (budget, styles, activités,
            aéroport de départ, contraintes) que vous renseignez pour personnaliser les recommandations.
          </li>
          <li>
            <strong>Données d'utilisation du service</strong> : recherches effectuées, voyages sauvegardés,
            voyages de groupe (participants, votes, messages, dépenses partagées), alertes de prix.
          </li>
          <li>
            <strong>Données de paiement</strong> : traitées exclusivement par Stripe. Nous ne stockons
            jamais votre numéro de carte ; nous conservons uniquement l'identifiant d'abonnement et son statut.
          </li>
          <li>
            <strong>Mesure d'audience</strong> : statistiques agrégées et anonymes via Plausible,
            solution sans cookies. Aucun profilage publicitaire.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Finalités et bases légales</h2>
        <ul className="mt-3">
          <li>
            <strong>Fournir le service</strong> (recommandations personnalisées, voyages de groupe,
            alertes) — exécution du contrat.
          </li>
          <li>
            <strong>Facturation et gestion de l'abonnement</strong> — exécution du contrat et obligations légales.
          </li>
          <li>
            <strong>Emails transactionnels</strong> (invitations à un voyage, alertes de prix, récapitulatifs)
            — exécution du contrat ; vous pouvez désactiver les emails non essentiels depuis votre compte.
          </li>
          <li>
            <strong>Amélioration du produit</strong> (statistiques anonymes) — intérêt légitime.
          </li>
        </ul>
        <p className="mt-3">
          Vos préférences de voyage sont transmises à notre prestataire d'IA (Anthropic) uniquement pour
          générer vos recommandations et itinéraires. Elles ne sont pas utilisées pour entraîner des modèles.
        </p>
      </section>

      <section>
        <h2>3. Sous-traitants</h2>
        <p className="mt-3">
          Nous partageons vos données avec les prestataires suivants, dans la stricte mesure nécessaire :
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-sand-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50 text-left">
                <th className="px-4 py-2.5 font-semibold text-text-main">Prestataire</th>
                <th className="px-4 py-2.5 font-semibold text-text-main">Finalité</th>
                <th className="px-4 py-2.5 font-semibold text-text-main">Localisation</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map(([name, purpose, location]) => (
                <tr key={name} className="border-b border-sand-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-text-main">{name}</td>
                  <td className="px-4 py-2.5">{purpose}</td>
                  <td className="px-4 py-2.5">{location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          Les transferts hors Union européenne sont encadrés par des clauses contractuelles types ou des
          mécanismes d'adéquation reconnus par la Commission européenne.
        </p>
      </section>

      <section>
        <h2>4. Durées de conservation</h2>
        <ul className="mt-3">
          <li>Données de compte et profil voyageur : tant que votre compte est actif, puis supprimées sous 30 jours après suppression du compte.</li>
          <li>Données de facturation : 10 ans (obligation comptable légale).</li>
          <li>Statistiques d'audience : agrégées et anonymes, sans limite (non rattachables à une personne).</li>
        </ul>
        <p className="mt-3">
          Vous pouvez supprimer votre compte à tout moment depuis la page « Mon compte ». La suppression
          retire vos données personnelles ; vos contributions aux voyages de groupe (votes, dépenses) sont
          anonymisées pour ne pas casser les voyages des autres participants.
        </p>
      </section>

      <section>
        <h2>5. Vos droits</h2>
        <p className="mt-3">
          Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de
          limitation, de portabilité et d'opposition sur vos données. Pour les exercer, écrivez-nous à{' '}
          <Placeholder>EMAIL CONTACT</Placeholder>. Nous répondons sous 30 jours.
        </p>
        <p className="mt-3">
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
          auprès de la CNIL (cnil.fr).
        </p>
      </section>

      <section>
        <h2>6. Cookies</h2>
        <p className="mt-3">
          Skusku n'utilise pas de cookies publicitaires. Les seuls cookies déposés sont strictement
          nécessaires à l'authentification (session Clerk) et au fonctionnement du paiement (Stripe).
          La mesure d'audience (Plausible) fonctionne sans cookies. C'est pourquoi aucun bandeau de
          consentement n'est requis.
        </p>
      </section>

      <section>
        <h2>7. Sécurité</h2>
        <p className="mt-3">
          Les échanges sont chiffrés (TLS), les accès aux données sont restreints et authentifiés, et les
          paiements sont traités par Stripe (certifié PCI-DSS) avec authentification 3D Secure.
        </p>
      </section>

      <section>
        <h2>8. Modifications</h2>
        <p className="mt-3">
          Nous pouvons faire évoluer cette politique. En cas de changement substantiel, vous serez informé
          par email ou via le service. La date de dernière mise à jour figure en haut de page.
        </p>
      </section>
    </LegalLayout>
  );
}

export default Privacy;
