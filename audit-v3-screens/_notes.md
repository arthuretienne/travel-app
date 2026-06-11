# Notes brutes — Audit V3 (preuves au fil de l'eau)

## Phase 1 — Première impression (landing 1440px + 390px)

### Test 5 secondes
- Hero : "Le voyage qui vous ressemble, déjà pensé." + "Décrivez vos envies. On compose vols, hôtels et itinéraire, vous n'avez plus qu'à dire oui." + badge "Voyage par IA · sans carte bancaire" + "3 minutes · gratuit · puis vous comparez."
- VERDICT : proposition de valeur comprise en <5s (quoi : voyage composé par IA ; pour qui : implicite FR abordable-stylé ; pourquoi : "déjà pensé" vs 30 onglets). PASS — au-dessus de la moyenne SaaS early stage.
- Screenshot : 01-landing-hero-1440.png, 02-landing-full-1440.png

### Findings
| Sév | Constat | Preuve |
|---|---|---|
| P0 | Footer = logo + 8 liens destinations. AUCUN lien légal (mentions, CGV, confidentialité, contact, société, support). Pour un produit qui encaisse via Stripe → tueur de confiance. | 07-footer-1440.png |
| P0 | /privacy et /terms → redirect silencieux vers `/` (catch-all). Confirmé en navigation directe. | test live |
| P0 | Mega menu : ~80% des liens pointent vers des routes NON CONSTRUITES (/destinations/europe-du-sud, /ou-partir/janvier…, /outils/*, /itineraires/*, /magazine/*) → clic = retour home silencieux. Pire : le menu revendique du contenu fictif ("Tous les itinéraires (32)", article "mis à jour il y a 3 jours", "8 min de lecture"). | 03→06-nav-*.png + test clic "Où partir en janvier" → URL `/` |
| P0 | Hero search : visiteur anonyme tape "Tokyo" + clique "Chercher" → navigate('/create-trip') protégé → rebond silencieux sur `/`. Aucune modal d'auth, aucune explication. Le CTA le plus visible de la page ne fait RIEN pour un inconnu. | 08, 09 + Landing.jsx:188-200 |
| P0 | Modal Clerk = "Sign in to Travel App" — ANGLAIS + nom générique "Travel App" (pas Skusku), "Secured by Clerk". Rupture de marque au 1er pas de conversion. (Localisation frClFR + nom d'app Clerk non configurés.) | 10-cta-composer-clerk-modal.png |
| P1 | Les CTA "Composer mon voyage" et "Créer mon voyage" ouvrent la modal SIGN-IN (pas sign-up) — Landing.jsx:221-224 utilise SignInButton partout. Un nouvel utilisateur doit cliquer "Sign up" dans la modal EN. | Landing.jsx:224 |
| P1 | Mix FR/EN sur la page FR : cartes "Lisbon", "Morocco", "7 j · vol + hotel" (sans accent), "Propositions recentes" (é manquant). Le footer liste "Lisbon/Barcelona/Rome". | 01, 07 |
| P1 | Preuve sociale : 3 témoignages avec initiales (ML/TR/SM), invérifiables, pas de source. Mieux que rien, mais ne tient pas la barre "Revolut" (vraies notes app store, presse, chiffres). | 02 |
| P2 | Badges "96% / 92% / 88%" de match sur les cartes pour un visiteur ANONYME — % de personnalisation sans aucune donnée user = claim creux. | 01 |
| P2 | Pattern hover-open + onClick-toggle du mega menu : hover ouvre, le clic qui suit referme (double toggle). Déroutant souris. | MegaMenu.jsx:491-492 |
| P2 | Pas de page "À propos / Qui sommes-nous" nulle part. Aucune identité société. | sitewide |
| P3 | 3 placeholders différents pour la même recherche : "Où voulez-vous partir ?" (hero), "Une destination, un mois, une envie..." (drawer). | 13 |
| OK | Console propre (0 erreurs). Plausible actif. Nav fixed + backdrop-blur OK au scroll. Drawer mobile : accordéon propre, CTA sticky, body scroll lock. | 13, 14 |
| OK | Exécution DA landing : hiérarchie typo Fraunces/DM Sans maîtrisée, collage photos, bande pleine largeur Porto, rythme correct. Le craft visuel de la landing est le point fort. | 02 |

### Nav vs revolut.com (comparaison)
- Revolut : mega menu produits réels, footer 5 colonnes (légal par pays, licences, App Store badges, langues), bandeau réassurance réglementaire.
- Skusku : panneaux séduisants mais vitrine vide derrière ; footer quasi inexistant. L'écart n'est pas le style, c'est la SUBSTANCE (légal + contenu réel).

## Phase 2 — Tunnels (sessions réelles, desktop 1440 + mobile 390)

### T1 Découverte → inscription (screenshots 15-25)
- Friction : 11 clics + 4 champs + OTP jusqu'au dashboard. Temps total ~3min30 (modal Clerk ~5s à charger : lente).
- P0 : modal Clerk 100% EN — "Sign in to Travel App" : mauvais NOM DE PRODUIT + mauvaise langue au 1er pas. (15)
- P1 : les 2 CTA landing ouvrent le SIGN-IN ; un nouveau doit cliquer "Sign up" (16).
- Onboarding : choix Express 9q/3min vs Complet ~30q/10min "Recommandé" (19). Bien : skip possible, durées annoncées. Risque : recommander 10 min à un nouvel inscrit = interrogatoire avant toute valeur. CTAs incohérents ("Commencer" vs "Meilleurs résultats").
- Express = 1 page unique 9 questions (20). Soumission possible à 8/9 sans erreur visible (validation laxiste). Pré-rempli sensé (aéroport repris ensuite dans create-trip ✓).
- Dashboard vide (24,25) : 6 CTA quasi identiques ("Planifier un trip", "Planifier un nouveau trip", "Explorer", "Lancer une recherche", "Planifier", "Voir mes trips") → PAS une action évidente. Copy dev leak : "pas un mock" + jargon "activer ton cockpit". TUTOIEMENT app vs VOUVOIEMENT landing/wizard.

### T2 Première recherche (26-35)
- Wizard 4 étapes propre, vouvoiement, budget par personne explicité ✓, compteur usage visible à l'étape 4.
- CHRONO (3e tentative, env complet) : sélection IA affichée à ~20s, 1res cartes à 34s, complet ~60s. Cible CLAUDE.md <15s : ratée x2-4.
- Tentative 1 (clé Booking absente localement / 429) : statut "3 destinations trouvées" PUIS "Aucun résultat trouvé — ajustez vos critères" → le message ACCUSE L'UTILISATEUR pour une panne infra. P0 honnêteté. (32 v1)
- Tentative 2 : timeout frontend après ~220s : "La recherche prend trop de temps… (le serveur démarre peut-être)" → fuite d'détail infra ("serveur démarre"), pendant que le backend continuait de travailler. Pas de retry auto, pas de progressif.
- Pendant le chargement : spinner + 2 phrases statiques. Pas de skeleton cards, pas d'arrivée progressive par destination (tout ou rien à ~34s).
- Cartes résultats (35) : décision OK (coût total + delta budget, vol direct, hôtel, dates) MAIS descriptions/activités 100% ANGLAIS, "Slovenia/Bosnia", format prix "€1,136" (EN), "Photo par detait" (attribution cassée), badge "Meilleur choix" ✓.
- Reco pertinence pour "city-break culturel + gastronomie" : Ljubljana/Sarajevo/Krakow/Palerme/Séville = solide.

### T3 Save → détail → PDF (36-41)
- Save : toast ✓. Dashboard : carte trip ✓.
- SavedTripDetail : LA plus belle page du produit (hero éditorial, billet façon Kayak, "Pourquoi ce plan ?", sticky bar). Format prix FR correct ici ("1 136 €") — incohérent avec Results.
- P1 : itinéraire généré côté serveur mais l'UI reste sur "Création de votre itinéraire…" SANS FIN — il faut RECHARGER la page à la main (pas de polling/SSE ici).
- Itinéraire : thèmes EN ("Arrival & Old Town Discovery"), horaires "10:00 AM", et CONTRADICTION : transfert vers "Hotel Cubo" alors que l'hôtel proposé est le DoubleTree (logs : Flight/Hotel details available: false → contexte non transmis).
- P0 : EXPORT PDF CASSÉ — "Impossible de générer le PDF" 100% répro. Cause console : police "Inter italic" non enregistrée (@react-pdf). (41)
- Toast d'erreur PDF reste affiché indéfiniment (pas d'auto-dismiss).

### T4 Tunnel groupe (42-61)
- "Inviter" depuis trip solo → modal propre "voyage solo converti en groupe" (42). Multi-emails Entrée ✓. Envoi → bascule /trips/:id en mode VOTE immédiat ✓ (~4s).
- Modal sans role="dialog" (a11y).
- Vote : 1 clic = voté, % en temps réel, "En tête", état "Vous avez voté" ✓ (52-53). Multi-propositions (trip seedé) : 3 cartes + % + clôture créateur ✓ (61).
- Finalisation → page confirmée riche (54) MAIS : timestamps ISO BRUTS affichés ("2026-07-14T17:50:00"), feed d'activité EN ("Voting complete!", "Camille voted"), hôtel "Wonderful" EN, "877 €7 nuits" (espace manquant).
- Checklist (55) : Vols/Hébergement/Activités + statut groupe ✓.
- Dépenses (56-58) : ajout 60€ → soldes ±30, plan "Tom→Camille €30.00" instantané ✓. MAIS format €60.00, invitée guest exclue du split, label "TRICOUNT DU GROUPE" = marque concurrente.
- Chat (59-60) : @assistant répond en ~30-50s, contenu UTILE et en FR, MAIS rendu en MARKDOWN BRUT (** visibles). Messages système EN ("Marion joined the trip").
- P2 sécu/logique : l'invitation nominative de Léa a été consommée par un guest anonyme ("Marion") — token non lié à l'email.

### T5 Invité sans compte (45-48)
- Page d'invitation déconnecté : belle, value props, expiration ✓ (45).
- P0 : l'accept invité MARCHE côté API (200, session créée) puis l'app navigate vers /trips/:id PROTÉGÉ → rebond LANDING. L'invité qui a accepté atterrit sur la page marketing sans aucune indication. Cause : AcceptInvitation.jsx:98 + ProtectedRoute Clerk-only (guestSession ignorée par le guard).
- Validation prénom : .fill() programmatique refusé ("Veuillez entrer votre prénom") mais frappe clavier OK → fragile mais pas bloquant utilisateur réel.
- Erreur API brute EN affichée dans l'UI FR : "Guest name is required" (cas signed-in/dev).

### T6 Monétisation (62-68, 73)
- Blocage quota : visible SEULEMENT à l'étape 4/4 — l'utilisateur limité remplit 3 étapes pour rien (P1).
- P1 : à la limite, le CTA principal devient "Passer à Premium" mais il est DISABLED — un bouton mort au pic d'intention. Seul le petit lien "Voir les offres →" marche.
- Pricing : Free 0€ / Starter 29€/an (2,42€/mois) / Wanderer 49€/an / Trip Pass 5,99€·7j. Toggle annuel par défaut, "2 mois offerts", FAQ, réassurance Stripe/3DS ✓.
- P0 INCOHÉRENCE : pricing dit Free = "5 recherches/mois" ; l'app applique et affiche 10 (widget + /account + backend maxSearchesPerMonth: 10). Backend dit Starter=50 recherches, pricing affiche 40. Comparatif : ligne "Notifications push" cochée pour AUCUN plan ; nom interne EXPLORER vs Starter.
- Checkout INTESTABLE en local : STRIPE_SECRET_KEY locale = placeholder, STRIPE_PRICE_ID_* absents → "Impossible de démarrer le paiement". À smoke-tester en prod. L'UI d'échec est correcte mais générique.
- /account Abonnement : plan visible, usage, features. Upgradé : "€6.99/month" EN non formaté, zéro célébration.

### T7 Alertes prix (69-70)
- Création 1 clic depuis trip ✓ ("Alerte créée"). Page : prix actuel/objectif(-10%)/variation + explication + push toggle. Compréhensible sans réfléchir ✓. Formats €EN.

### T8 Compte & sortie (71-72)
- Préférences éditables (miroir onboarding) ✓. Digest opt-in/out toggle clair ✓. Suppression de compte : présente avec copy claire (transfert des trips groupe) — test destructif reporté en fin d'audit.

### T9 Mobile 390 (74-83)
- Dashboard/wizard/résultats/groupe : layouts tiennent, cartes lisibles, tab bar mobile en bas ✓ (78).
- Recherche "couple, week-end rando, éco" → "Aucun résultat trouvé" : CHAÎNE DE BUGS MOTEUR : durée "week-end" ignorée (7j), couple→"Romantic/Luxury 85% hotel budget", vol €752 retenu sur budget éco, reliquat hôtel €30/nuit → 0 hôtel partout → 0 résultat, message qui accuse les critères. (78 + logs)
- 2e recherche identique au T2 desktop → Ljubljana + Palerme reviennent (répétition partielle, voir E13).
- Tabs groupe 40px de haut (cible 44px limite), onglet Participants caché (scroll horizontal non évident).
- Chrono mobile : 1res cartes à 34s (cache chaud compris) → le coût fixe est l'IA, pas Booking.
