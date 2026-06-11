// frontend/src/pages/legal/Terms.jsx
import LegalLayout, { Placeholder } from './LegalLayout';

function Terms() {
  return (
    <LegalLayout
      title="Conditions générales d'utilisation et de vente"
      updated="11 juin 2026"
      seoDescription="Conditions générales d'utilisation et de vente du service Skusku : offres, paiement, rétractation, résiliation."
    >
      <section>
        <h2>1. Objet</h2>
        <p className="mt-3">
          Les présentes conditions régissent l'utilisation du service Skusku (skusku.life), édité par{' '}
          <Placeholder>RAISON SOCIALE</Placeholder> (<Placeholder>ADRESSE</Placeholder>), et la vente des
          abonnements associés. En créant un compte, vous les acceptez sans réserve.
        </p>
      </section>

      <section>
        <h2>2. Description du service</h2>
        <p className="mt-3">
          Skusku est un planificateur de voyage assisté par intelligence artificielle : à partir de votre
          profil et de vos envies, il compose des propositions de voyage (destination, dates, vol, hôtel,
          itinéraire) et propose des outils de voyage en groupe (vote, partage de dépenses, discussion).
        </p>
        <p className="mt-3">
          <strong>Skusku est un service de recommandation, pas une agence de voyages.</strong> Les
          réservations de vols, d'hôtels ou d'activités s'effectuent directement auprès des partenaires ou
          prestataires concernés (compagnies, hôtels, plateformes de réservation), selon leurs propres
          conditions. Les prix affichés dans Skusku sont indicatifs, fournis par nos partenaires de données,
          et peuvent évoluer entre la consultation et la réservation.
        </p>
      </section>

      <section>
        <h2>3. Compte</h2>
        <p className="mt-3">
          La création d'un compte est gratuite et nécessite une adresse email valide. Vous êtes responsable
          de la confidentialité de vos identifiants. L'âge minimum d'utilisation est de 15 ans.
        </p>
      </section>

      <section>
        <h2>4. Offres et tarifs</h2>
        <ul className="mt-3">
          <li><strong>Free</strong> — gratuit : 5 recherches de destinations par mois, 1 voyage sauvegardé.</li>
          <li><strong>Starter</strong> — 3,99 €/mois ou 29 €/an : 40 recherches par mois, itinéraires illimités, export PDF, 3 alertes de prix.</li>
          <li><strong>Wanderer</strong> — 6,99 €/mois ou 49 €/an : recherches et alertes illimitées, voyages de groupe (vote, dépenses partagées, discussion), notifications push.</li>
          <li><strong>Trip Pass</strong> — 5,99 € (paiement unique) : accès illimité pendant 7 jours, sans abonnement.</li>
        </ul>
        <p className="mt-3">
          Les prix sont exprimés en euros, toutes taxes comprises. Le détail à jour des offres figure sur la{' '}
          <a href="/pricing">page tarifs</a>, qui prévaut en cas d'écart. Les quotas mensuels se rechargent
          le 1er de chaque mois.
        </p>
      </section>

      <section>
        <h2>5. Paiement et renouvellement</h2>
        <p className="mt-3">
          Les paiements sont traités par Stripe, avec authentification 3D Secure. Les abonnements sont
          reconduits tacitement (mensuellement ou annuellement selon la formule) jusqu'à résiliation.
          Vous pouvez résilier à tout moment depuis la page « Mon compte » ; l'abonnement reste actif
          jusqu'à la fin de la période déjà payée, qui n'est pas remboursée au prorata.
        </p>
      </section>

      <section>
        <h2>6. Droit de rétractation</h2>
        <p className="mt-3">
          Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation de 14 jours
          ne s'applique pas aux contenus et services numériques pleinement exécutés avant la fin du délai de
          rétractation avec votre accord exprès. En activant immédiatement votre abonnement ou votre Trip
          Pass, vous demandez son exécution immédiate et renoncez à votre droit de rétractation pour le
          service déjà consommé. Si vous n'avez effectué <strong>aucune</strong> recherche premium depuis la
          souscription, vous pouvez demander le remboursement intégral sous 14 jours à{' '}
          <Placeholder>EMAIL CONTACT</Placeholder>.
        </p>
      </section>

      <section>
        <h2>7. Disponibilité et responsabilité</h2>
        <p className="mt-3">
          Nous nous efforçons d'assurer une disponibilité continue du service, sans pouvoir la garantir
          (maintenance, dépendance à des services tiers). Les recommandations sont générées par IA à partir
          des informations que vous fournissez : elles peuvent comporter des imprécisions et ne constituent
          pas un conseil professionnel. Vérifiez toujours les informations essentielles (prix final,
          conditions d'annulation, formalités de voyage, visas, santé) auprès des sources officielles et des
          prestataires avant de réserver.
        </p>
        <p className="mt-3">
          La responsabilité de <Placeholder>RAISON SOCIALE</Placeholder> ne saurait être engagée au titre des
          prestations réservées auprès de tiers, ni des dommages indirects. En tout état de cause, elle est
          limitée aux sommes versées au titre des 12 derniers mois d'abonnement.
        </p>
      </section>

      <section>
        <h2>8. Contenu utilisateur et bonne conduite</h2>
        <p className="mt-3">
          Vous restez responsable des contenus que vous publiez dans les voyages de groupe (messages,
          dépenses). Tout usage abusif (spam, contenu illicite, tentative de contournement des quotas)
          peut entraîner la suspension du compte après notification.
        </p>
      </section>

      <section>
        <h2>9. Résiliation et suppression de compte</h2>
        <p className="mt-3">
          Vous pouvez supprimer votre compte à tout moment depuis « Mon compte ». La suppression entraîne
          l'effacement de vos données dans les conditions décrites par la{' '}
          <a href="/privacy">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>10. Médiation et litiges</h2>
        <p className="mt-3">
          En cas de litige, contactez-nous d'abord à <Placeholder>EMAIL CONTACT</Placeholder> — nous
          chercherons une solution amiable. Conformément aux articles L611-1 et suivants du Code de la
          consommation, vous pouvez recourir gratuitement au médiateur de la consommation suivant :{' '}
          <Placeholder>MÉDIATEUR DE LA CONSOMMATION (à désigner)</Placeholder>. Vous pouvez aussi utiliser la
          plateforme européenne de règlement en ligne des litiges (ec.europa.eu/consumers/odr).
        </p>
        <p className="mt-3">
          Les présentes conditions sont régies par le droit français. À défaut d'accord amiable, les
          tribunaux français sont compétents.
        </p>
      </section>
    </LegalLayout>
  );
}

export default Terms;
