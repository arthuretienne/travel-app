// frontend/src/pages/legal/Contact.jsx
import { Mail, MessageCircleQuestion, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import LegalLayout, { Placeholder } from './LegalLayout';

function Contact() {
  return (
    <LegalLayout
      title="Contact & support"
      seoDescription="Une question sur Skusku ? Contactez notre support — nous répondons sous 48 h ouvrées."
    >
      <section>
        <p>
          Une question, un souci avec une recherche, un avis à partager ? Écrivez-nous — nous lisons tout
          et nous répondons sous 48 h ouvrées.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-sand-200 bg-white p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember-50 text-ember-700">
            <Mail size={20} />
          </span>
          <h2 className="mt-4">Support & questions</h2>
          <p className="mt-2 text-sm">
            Pour toute question sur votre compte, vos recherches, votre abonnement ou une facture.
          </p>
          <p className="mt-3 text-sm">
            <Placeholder>EMAIL CONTACT</Placeholder>
          </p>
        </div>

        <div className="rounded-2xl border border-sand-200 bg-white p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember-50 text-ember-700">
            <ShieldCheck size={20} />
          </span>
          <h2 className="mt-4">Données personnelles</h2>
          <p className="mt-2 text-sm">
            Pour exercer vos droits RGPD (accès, rectification, suppression), précisez « Données
            personnelles » en objet.
          </p>
          <p className="mt-3 text-sm">
            <Placeholder>EMAIL CONTACT</Placeholder>
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-start gap-4 rounded-2xl border border-sand-200 bg-white p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-sand-800">
            <MessageCircleQuestion size={20} />
          </span>
          <div>
            <h2>Avant d'écrire</h2>
            <p className="mt-2 text-sm">
              Les questions les plus fréquentes (offres, quotas, Trip Pass, annulation) ont déjà leur
              réponse dans la <Link to="/pricing">FAQ de la page tarifs</Link>.
            </p>
          </div>
        </div>
      </section>
    </LegalLayout>
  );
}

export default Contact;
