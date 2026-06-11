# AUDIT UX · PRODUIT · BUSINESS (V3) — Skusku

> Audit réalisé les 10-11 juin 2026, en sessions réelles dans le navigateur (desktop 1440 px + mobile 390 px), comptes de test seedés, 15 edge cases moteur rejoués sur l'API réelle, Lighthouse sur skusku.life en production. 91+ screenshots dans `audit-v3-screens/`. Ne couvre pas l'audit technique (fait en V2).

## 1. Verdict en une page : Skusku est-il premium aujourd'hui ?

**Non — et c'est rattrapable en 3 sprints, parce que le problème n'est presque jamais le fond.**

Skusku a ce que la plupart des SaaS early-stage n'ont pas : une vraie direction artistique (la landing, SavedTripDetail et Pricing sont au niveau d'un bon produit design-led), un moteur de reco qui tient la route sur les cas standards ET extrêmes (budget 30 k€ → vrais palaces ; budget 150 € → refus honnête plutôt que résultats inventés ; départ demain → dates respectées), et un différenciateur réel qui fonctionne de bout en bout (vote de groupe, dépenses, chat IA).

Mais l'utilisateur exigeant qui paie 9 €/mois pour Revolut rencontre, dans sa **première heure**, une accumulation qui code « prototype » :

1. Le CTA principal de la landing **ne fait rien** s'il n'est pas connecté (rebond silencieux).
2. La modal d'inscription dit « Sign in to **Travel App** » **en anglais**.
3. Le mega menu promet un magazine, des outils, « 32 itinéraires » — **80 % des liens retombent sur la home**.
4. Sa première recherche met **34-60 s** à afficher quoi que ce soit, et les résultats sont **à moitié en anglais** avec 4 formats de prix différents.
5. L'export PDF — feature payante — est **cassé à 100 %**.
6. L'ami qu'il invite (canal viral n°1) reçoit un email **en anglais**, accepte, et se fait **jeter sur la page marketing**.
7. S'il veut payer : la page pricing affiche des **quotas faux** (5 ≠ 10, 40 ≠ 50), et au moment du blocage quota, le bouton d'upgrade est **disabled**.
8. S'il cherche les CGV avant de sortir sa CB : les liens légaux **ne mènent nulle part** (`href="#"`), aucune mention légale, aucun contact, aucune entité société. *(Au-delà du « cheap » : c'est une non-conformité légale FR/UE pour un service qui encaisse.)*

**Le diagnostic en une phrase : un bon produit, une bonne DA et un bon moteur, livrés sans la discipline d'exécution (langue, formats, liens, états d'erreur) qui fait la différence entre « impressionnant pour un MVP » et « je sors ma carte ».**

### Les 5 chantiers qui changent tout

1. **Plus rien ne ment** — chiffres pricing exacts, menu sans routes fantômes, liens légaux réels, claims vérifiables. (Sprint 1)
2. **Le tunnel viral tient sa promesse** — email FR, invité accepté = invité dans le trip, expérience guest complète avec CTA de conversion. C'est le canal d'acquisition gratuit n°1 et il est cassé au moment décisif. (Sprint 1-2)
3. **FR partout, formats partout** — un seul formateur devise/date, zéro contenu généré en EN, Clerk localisé. L'écart premium le plus visible et le moins cher à combler. (Sprint 1-2)
4. **Les 34 secondes deviennent un moment de produit** — skeleton + arrivée progressive (le SSE existe déjà côté back), honnêteté panne vs critères, et correction des 4 bugs moteur de la chaîne T9. (Sprint 2)
5. **Un système de motion + tokens lisibles** — 170+ usages de texte sous le seuil AA à retokeniser, 4 composants d'une autre ère à migrer, et le motion qui transforme « propre » en « vivant ». (Sprint 3)

## 2. Scorecard /100 par dimension (barre Revolut = 85+)

> Barème : 90+ = indiscernable d'un leader · 70-89 = solide avec écarts identifiés · 50-69 = fonctionnel mais code « early » · <50 = en-dessous du minimum attendu pour encaisser. Chaque score = moyenne pondérée des findings (P0 = −15 à −25, P1 = −5 à −10, P2 = −2) sur la base 100, plafonnée par le pire parcours.

| Dimension | Score | Justification (les findings qui coûtent) |
|---|---|---|
| Première impression | **58** | Hero 5-secondes PASS et craft visuel fort (+) ; CTA anonyme muet (P0), menu vitrine vide (P0), modal « Travel App » EN (P0), LCP 8,8 s |
| Tunnels & friction | **55** | Wizard recherche propre, vote groupe fluide (+) ; PDF cassé (P0), itinéraire sans fin (P1), blocage quota étape 4 + bouton mort (P1), flux invité cassé (P0) |
| Qualité reco (edge cases /15) | **66** | 11/15 cas bien gérés — diversité corrigée, apprentissage des rejets actif, luxe différencié, honnêteté budget, gap IATA comblé (+) ; contrainte « sans avion » violée, 1 jour sans garde-fou, PMR non explicitement adressée, warnings EN jamais montrés à l'utilisateur, première carte médiane 71 s |
| UI craft & cohérence | **62** | Design system réel et 3 pages de référence (+) ; 170+ textes sous AA, 4 composants legacy, 4 formats de devise, ISO bruts |
| Motion & micro-interactions | **35** | 4 keyframes sobres et purposeful, c'est tout ; zéro transition d'état, zéro célébration, pas de prefers-reduced-motion |
| Copywriting | **52** | Ton FR juste et hero mémorable (+) ; tu/vous mélangés, FR/EN mélangés jusque dans les emails, jargon dev qui fuit, erreurs accusatoires |
| Mobile | **68** | Layouts tiennent à 390 px, tab bar correcte (+) ; tabs 40 px, onglet caché, mêmes 34 s d'attente |
| Confiance & légal | **22** | Stripe/3DS affiché et suppression de compte propre (+) ; AUCUNE page légale (non-conformité FR/UE), liens morts `href="#"`, aucun contact, aucune entité, témoignages invérifiables |
| Pricing & conversion | **60** | Structure 3 plans + Trip Pass excellente, ancre annuelle bonne (+) ; chiffres faux (P0), paywall qui bloque trop tard avec CTA disabled, checkout non smoke-testé en prod |
| Rétention / viralité | **45** | Les briques existent (alertes, digest, insights) (+) ; boucle virale cassée au moment décisif, digest opt-in enterré, aucun event de rétention mesuré |

**Moyenne brute : ~52 / 100.** Aucune dimension n'atteint la barre Revolut (85). Les deux gouffres — Confiance & légal (22) et Motion (35) — sont aussi les moins chers à combler : c'est l'asymétrie la plus exploitable de ce produit.

## 3. Findings détaillés par phase

## Phase 1 — Première impression & landing

### Test des 5 secondes : PASS

Hero : « Le voyage qui vous ressemble, déjà pensé. » + sous-titre qui explique le quoi (composition vols/hôtels/itinéraire), badge « sans carte bancaire », « 3 minutes · gratuit ». Proposition de valeur comprise en < 5 s — au-dessus de la moyenne SaaS early-stage. Le craft visuel de la landing (hiérarchie Fraunces/DM Sans, collage photos, bande Porto pleine largeur) est **le point fort visuel du produit** (01, 02).

### Findings

| Sév | Constat (preuve) | Pourquoi ça compte | Recommandation |
|---|---|---|---|
| **P0** | **Le CTA le plus visible ne fait rien** : un anonyme tape « Tokyo » dans le hero search, clique « Chercher » → `navigate('/create-trip')` protégé → rebond silencieux sur `/`. Aucune modal, aucune explication (08, 09 + Landing.jsx:188-200) | C'est la fuite n°1 du funnel d'acquisition : l'intention la plus chaude du site meurt en silence | Conserver la saisie + ouvrir le sign-up contextualisé |
| **P0** | **Mega menu vitrine vide** : ~80 % des liens pointent vers des routes inexistantes (/destinations/europe-du-sud, /ou-partir/janvier, /outils/*, /itineraires/*, /magazine/*) → clic = retour home silencieux. Le menu revendique du contenu fictif (« Tous les itinéraires (32) », « mis à jour il y a 3 jours », « 8 min de lecture ») (03-06) | Pour qui explore avant de payer, le produit « ment » dès la nav — toxique pour la confiance, et SEO nul sur ces requêtes | Réduire le menu à ce qui existe ; supprimer les compteurs fictifs |
| **P0** | **Footer sans existence légale** : logo + 8 liens destinations. Aucun lien légal réel — et `/privacy`/`/terms` redirigent vers `/` (07) | Produit qui encaisse via Stripe sans CGV/RGPD accessibles = illégal en FR/UE + tueur de conversion | Pages légales réelles (cf. Phase 7) |
| **P0** | **Modal Clerk : « Sign in to Travel App »** — anglais + nom générique + « Secured by Clerk » (10) | Rupture de marque au premier pas de conversion ; « Travel App » ≠ Skusku | Config Clerk : localization frFR + application name |
| P1 | Les CTA « Composer mon voyage » ouvrent le **sign-in** (pas le sign-up) — un nouveau doit trouver « Sign up » dans une modal EN (Landing.jsx:224) | Friction au moment exact de la conversion | SignUpButton |
| P1 | Mix FR/EN sur la page FR : « Lisbon », « Morocco », « 7 j · vol + hotel », « Propositions recentes » (accents manquants) (01, 07) | Détail qui code « prototype » | Passe i18n complète |
| P1 | Preuve sociale : 3 témoignages aux initiales invérifiables (02) | Sous la barre Revolut (notes app store, presse, chiffres) | Vraies métriques ou rien |
| P2 | Badges « 96 % de match » pour un visiteur anonyme = claim de personnalisation sans données | Crédibilité du claim IA | Réserver le % aux users connectés |
| P2 | Mega menu : hover ouvre, le clic suivant referme (double toggle déroutant, MegaMenu.jsx:491-492) | Pattern non standard | Clic = naviguer |
| P3 | 3 placeholders différents pour la même recherche selon l'écran (13) | Cohérence | Un seul placeholder |
| OK | Console 0 erreur · Plausible actif · nav backdrop-blur propre · drawer mobile accordéon + scroll lock (13, 14) | — | — |

### Vs revolut.com

L'écart n'est **pas le style** (la landing Skusku est plus chaleureuse et aussi bien construite) — c'est la **substance** : Revolut a un menu où chaque lien mène à un produit réel et un footer de 5 colonnes avec licences par pays ; Skusku a des panneaux séduisants devant des routes vides et un footer sans entité légale.

## Phase 2 — Tunnels bout-en-bout (sessions réelles, desktop 1440 + mobile 390)

### T1 Découverte → inscription (15-25) — friction 11 clics + 4 champs + OTP, ~3 min 30

| Sév | Constat |
|---|---|
| P0 | Modal Clerk 100 % EN, « Sign in to Travel App », ~5 s à charger (15) |
| P1 | Onboarding : « Complet ~30 q / 10 min » marqué **Recommandé** face à « Express 9 q / 3 min » — on recommande un interrogatoire de 10 minutes à quelqu'un qui n'a encore rien reçu (19). CTAs incohérents (« Commencer » vs « Meilleurs résultats ») |
| P1 | **Dashboard vide = 6 CTA quasi identiques** (« Planifier un trip », « Planifier un nouveau trip », « Explorer », « Lancer une recherche », « Planifier », « Voir mes trips ») — PAS d'action unique évidente (24, 25). Copy leak dev : « pas un mock », « activer ton cockpit » |
| P2 | Express : soumission possible à 8/9 questions sans erreur visible (validation laxiste) (20) |
| OK | Durées annoncées, skip possible, aéroport pré-rempli repris ensuite dans create-trip ✓ |

**Verdict abandon : non, mais.** Un early-adopter passe ; un utilisateur Revolut-grade tique sur la modal EN et le dashboard sans direction.

### T2 Première recherche — LE chrono qui fait mal

| Sév | Constat |
|---|---|
| **P0** | **Honnêteté en panne** : clé Booking absente/429 → statut « 3 destinations trouvées » PUIS « Aucun résultat trouvé — ajustez vos critères ». Le message **accuse l'utilisateur pour une panne infra** (32 v1) |
| **P1** | Chrono réel (3e tentative, env complet) : sélection IA ~20 s, premières cartes **34 s**, complet ~60 s. Cible CLAUDE.md < 15 s : ratée ×2-4. Mobile identique (34 s, le coût fixe est l'IA, pas Booking) |
| P1 | Timeout frontend à ~220 s : « le serveur démarre peut-être » (fuite infra) pendant que le backend continue de travailler — pas de retry auto, résultat perdu |
| P1 | Pendant l'attente : spinner + 2 phrases statiques. Pas de skeleton, pas d'arrivée progressive — 34 s de vide pour le moment le plus critique du produit |
| P1 | Cartes résultats : la décision est possible (coût total + delta budget, vol direct, hôtel, dates ✓) MAIS descriptions/activités 100 % EN, « Slovenia/Bosnia », prix « €1,136 » format EN, « Photo par detait » (attribution cassée) (35) |
| OK | Wizard 4 étapes propre, budget/personne explicité, compteur d'usage visible. Reco pertinente (Ljubljana/Sarajevo/Krakow/Palerme/Séville pour city-break culturel gastronomie) |

### T3 Save → détail → PDF

| Sév | Constat |
|---|---|
| **P0** | **Export PDF cassé 100 % répro** : « Impossible de générer le PDF » — police « Inter italic » non enregistrée dans @react-pdf (41). Le toast d'erreur ne se dismiss jamais |
| P1 | Itinéraire généré côté serveur mais l'UI reste sur « Création de votre itinéraire… » **sans fin** — il faut recharger la page (pas de polling/SSE sur cette page) |
| P1 | Contradiction de contenu : transfert vers « Hotel Cubo » alors que l'hôtel vendu est le DoubleTree (contexte vol/hôtel non transmis au prompt itinéraire — logs `Flight/Hotel details available: false`) ; thèmes EN, horaires « 10:00 AM » |
| OK | SavedTripDetail = la plus belle page du produit (hero éditorial, billet façon Kayak, « Pourquoi ce plan ? », sticky bar). Et ici le prix est au bon format FR (« 1 136 € ») — incohérent avec Results |

### T4 Tunnel groupe (42-61) — le différenciateur fonctionne, les détails le trahissent

| Sév | Constat |
|---|---|
| OK ✓ | Le cœur est **magique quand il marche** : invitation multi-emails, bascule vote en ~4 s, vote 1 clic + % temps réel + « En tête », clôture créateur, page confirmée riche, checklist, dépenses avec plan de remboursement instantané, chat avec @assistant qui répond utile et en FR (42-61) |
| P1 | Page confirmée : timestamps ISO bruts (« 2026-07-14T17:50:00 »), feed d'activité EN (« Voting complete! », « Camille voted »), « 877 €7 nuits » (espace manquant) (54) |
| P1 | Chat : réponses @assistant en **markdown brut** (« ** » visibles) ; messages système EN (59-60) |
| P2 | Modal sans `role="dialog"` ; « TRICOUNT DU GROUPE » (marque concurrente) ; format €60.00 ; l'invitée guest est exclue du split des dépenses (56-58) |
| P2 | Sécurité/logique : l'invitation nominative de Léa consommée par un guest anonyme « Marion » — token non lié à l'email (cf. Phase 7 viral) |

### T5 Invité sans compte (45-48)

| Sév | Constat |
|---|---|
| **P0** | **Le flux invité est cassé au moment décisif** : l'accept marche côté API (200, session créée) puis l'app navigue vers `/trips/:id` **protégé par Clerk** → l'invité rebondit sur la **landing marketing** sans aucune indication. Cause : AcceptInvitation.jsx:98 + ProtectedRoute Clerk-only (guestSession ignorée). Le V2 le soupçonnait — c'est confirmé en le vivant |
| P2 | Erreur API brute EN dans l'UI FR (« Guest name is required ») |
| OK | La page d'invitation déconnecté elle-même est excellente (value props, expiration) (45) |

### T6 Monétisation (62-68, 73)

| Sév | Constat |
|---|---|
| **P0** | Pricing affiche Free = 5 recherches/mois, Starter = 40 ; le backend applique 10 et 50. Comparatif : « Notifications push » cochée pour aucun plan (65) |
| P1 | Blocage quota visible seulement à l'étape 4/4 + CTA « Passer à Premium » **disabled** au pic d'intention (63, 64) |
| P1 | Post-upgrade : « €6.99/month » brut, zéro célébration (73) |
| ⚠️ | Checkout intestable en local (clés Stripe placeholder, vérifié à nouveau ce jour) → **smoke-test prod obligatoire avant launch** |
| OK | Pricing : toggle annuel par défaut, « 2 mois offerts », FAQ, réassurance Stripe/3DS (65) |

### T7 Alertes prix (69-70) — bon écran

Création 1 clic depuis un trip ✓, page lisible sans réfléchir (prix actuel/objectif −10 %/variation + explication + push toggle). Seul défaut : formats €EN.

### T8 Compte & sortie (71-72)

Préférences éditables ✓, digest opt-in/out clair ✓, suppression de compte présente avec copy claire (transfert des trips groupe). Sortie au niveau de l'entrée. *(Test destructif non exécuté — compte d'audit conservé pour reproductibilité.)*

### T9 Mobile 390 (74-83)

| Sév | Constat |
|---|---|
| **P0** | Recherche « couple, week-end rando, éco » → « Aucun résultat trouvé » via une **chaîne de bugs moteur** : durée « week-end » ignorée (7 j), couple → hôtel « Romantic/Luxury » à 85 % du budget, vol 752 € retenu sur budget éco, reliquat 30 €/nuit → 0 hôtel partout → 0 résultat, message qui accuse les critères (78 + logs backend) |
| P1 | Tabs groupe 40 px de haut (cible 44 px limite) ; onglet Participants caché derrière un scroll horizontal non évident (81) |
| OK | Layouts tiennent à 390 px, tab bar mobile en bas, cartes lisibles (74-83) |

## Phase 3 — Stress test des recommandations (15 edge cases, API réelle)

> Méthode : harness `backend/scripts/audit-v3-run.mjs` sur les endpoints réels (`/api/travel/recommendations[/stream]`), 19 appels, résultats bruts persistés dans `backend/scripts/audit-v3-results.ndjson`. Deux observations de contrat API au passage : le payload SSE n'inclut pas le champ `insights` (impossible de juger les explications côté API), et les prix sortent en flottants bruts (« €7004.41962198133 ») — l'UI formate, mais le contrat est sale. Latence : première destination médiane **71 s** (min 54, max 123) sur le harness à froid ; ~34 s constatés en sessions UI avec cache — la cible CLAUDE.md < 15 s est ratée ×2-5 partout.

| # | Cas | Résultat observé | Pertinence /5 | UX du cas /5 | Verdict |
|---|---|---|---|---|---|
| E1 | Solo, 150 € total, 5 j | 0 résultat en 62 s. `budget_warning` honnête (« Flight cost (€210) leaves no hotel budget from total budget (€150) ») + suggestions sensées (train, ±3 j, anticiper) | 4 — refuse d'inventer | 1 — vérifié en UI (93, 94) : après ~75 s, l'écran final n'affiche AUCUNE des suggestions du backend — juste « Aucun résultat trouvé… Essayez d'ajuster vos préférences ou votre budget ». Impasse qui accuse l'utilisateur. (Garde-fou UI noté : le slider budget a un plancher à 200 €) | ⚠️ moteur honnête, restitution ratée |
| E2 | Couple, 30 000 €, 4 j | Mahé 9 612 €, Queenstown 7 004 €, Dubaï 2 804 €, Mykonos 1 902 €, Marrakech 1 383 € | 4 — différencie vraiment le luxe (pas la même réponse qu'à 1 500 €) | 3 | ✅ (Marrakech à 1 383 € dilue la demande « luxe exceptionnel ») |
| E3 | Famille 5 pax (enfants 4/7/10) | Marrakech 2 682 €, Lisbonne 2 996 €, Athènes 1 966 €, La Valette 3 185 € — prix ×5 cohérents | 4 | 3 | ✅ |
| E4 | 8 amis, budget serré | Belgrade, Prague, Barcelone, Amsterdam — 275-355 €/pers tout compris | 4 | 3 | ✅ |
| E5 | « Je ne veux SURTOUT pas d'avion » | Lyon, Genève, Turin, Luxembourg (villes train-friendly) MAIS **chaque package contient un vol** : « Lyon, vol €143 » | 2 — contrainte dure à moitié violée | 1 — aucune explication, aucune alternative train | 🔴 **pire réponse de la série** : on vend un billet d'avion à qui a dit non à l'avion |
| E6 | « Plage déserte mais grande ville animée » | Naxos, Zadar, Essaouira, Tanger — vrais compromis mer+ville | 4 | 2 — l'arbitrage n'est pas expliqué ; « Studio apartment Goga » comme hôtel principal | ⚠️ |
| E7 | Texte libre en anglais | Essaouira, Palerme, Porto, Tromsø, Split (sunny/seafood/hiking — Tromsø pour « sunny » : discutable) | 4 | 3 | ✅ robuste à la langue |
| E8 | Cold start (profil minimal) | Porto, Lisbonne, Marrakech, Istanbul, Le Caire | 3 — défauts raisonnables | 3 | ✅ |
| E9 | Départ demain, dates fixes | 5 destinations, **dates exactes respectées** (12→17 juin), vols 147-267 € réels | 4 | 3 | ✅ |
| E10a | Durée 1 jour | Tunis (vol 302 € + 1 nuit 170 €), Édimbourg, Cracovie, Marrakech, Lisbonne — exécution mécanique fidèle | 2 — personne ne vole Paris→Tunis pour 24 h ; aucun garde-fou (« vouliez-vous dire un week-end ? ») | 2 | 🔴 |
| E10b | Durée 30 jours | 5 destinations, 30 nuits exactes, totaux 1 775-2 252 € dans le budget 3 000 €, hôtels longue-durée cohérents (ibis, guesthouses) | 4 | 3 | ✅ |
| E11 | Fauteuil roulant (PMR) | Berlin, Vienne, Barcelone, Prague, Amsterdam — grandes villes plates + chaînes modernes (Indigo, Motel One) plausiblement accessibles | 3 — défauts intelligents | 2 — **rien n'indique que l'accessibilité a été vérifiée** : pas de filtre hôtel PMR, pas de mention dans la réponse. Sur une contrainte de santé, l'implicite ne suffit pas | ⚠️ |
| E12 | Végétarienne stricte + gastronomie | Bologne, Palerme, Thessalonique — top villes food, toutes veg-compatibles | 4 | 3 | ✅ personnalisation food réelle |
| E13 | 3 recherches identiques | a: Porto/Ljubljana/Marrakech · b: Marrakech/Krakow/Tunis/Lisbonne/Séville · c: Porto/Bologne/Essaouira/Valence — 10 villes uniques sur 12 slots | 4 — le bug historique « toujours pareil » est corrigé | 3 — nombre de résultats instable (3/5/4) | ✅ |
| E14 | Rejeter Ljubljana + Palerme, relancer | Signaux 200 ✓ → Penang, Hanoï, Valence, Bologne, Marrakech : **les 2 rejetées ne réapparaissent pas** | 4 — l'apprentissage est réel et immédiat | 3 — mais dérive : Penang/Hanoï (vol 866-875 €, 70 % du budget) pour un « city-break détendu » | ✅ |
| E15 | Lyon→Sofia / Bruxelles→Tallinn (gap IATA historique) | Sofia 1 331 € et Tallinn 1 500 € retournés avec **vrai inventaire** (16 hôtels Tallinn, Mövenpick 5★ 121 €/nuit) en 35-38 s | 4 — le gap connu (CLAUDE.md) est comblé | 3 | ✅ |

> Note E14 : le endpoint `/api/travel/signal` exige `signalType: 'rejected'` — l'ancien script d'audit envoyait `'reject'` (→ 400 silencieux), donc **le test E14 de la session précédente était invalide**. Corrigé ici.

### Synthèse Phase 3

- **Taux de cas bien gérés : 9 pleinement + 4 à moitié + 2 ratés → 11/15.** Le moteur est nettement meilleur que sa réputation interne (diversité corrigée, apprentissage actif, honnêteté budget, luxe différencié, IATA comblé).
- **Le vrai problème n'est plus la pertinence, c'est la restitution** : warnings EN, aucune explication d'arbitrage transmise, latence 54-164 s, et aucun garde-fou conversationnel sur les demandes absurdes ou sensibles (1 jour, PMR).
- **Les 3 pires réponses, telles quelles** :
  1. E5 — l'utilisateur écrit « Je ne veux SURTOUT pas prendre l'avion, uniquement train ou bus » ; le produit répond : « Lyon — vol €143 ».
  2. E10a — « Tunis, 2026-07-02 → 2026-07-03, vol €302 + hôtel €170 » pour une demande d'1 jour.
  3. E1 — après 62 s : « Flight prices exceed your €150 budget. Here are your best options: » (en anglais, sur un produit français), puis écran « Aucun résultat trouvé ».

## Phase 4 — Audit UX/UI systématique par écran

### Synthèse transversale

Le produit a un **squelette UI au-dessus de la moyenne** (hiérarchie typographique Fraunces/DM Sans maîtrisée, cartes propres, CLS = 0) mais souffre de trois dettes systémiques : des **tokens de texte illisibles utilisés partout**, une **absence totale de motion système**, et **4 composants restés sur l'ancienne palette**.

### Contrastes (mesurés sur les tokens `tailwind.config.js` + Lighthouse prod)

| Sév | Constat | Mesure | Impact |
|---|---|---|---|
| **P1** | `text-light` (#a89880) sur blanc — utilisé **78×** (hints, métadonnées, sous-titres) | **2.81:1** (AA exige 4.5) | Toutes les métadonnées du produit sont sous le seuil légal d'accessibilité |
| **P1** | Bloc « Budget insuffisant » de Results : texte gold-500 sur fond gold-100 | **2.17:1** | Le message d'explication le plus important du tunnel cœur est quasi illisible — au moment exact où l'utilisateur doute |
| P2 | `text-muted` (#d4c8b3) sur blanc — 54× | 1.65:1 | Décoratif uniquement, mais utilisé pour du texte porteur de sens par endroits |
| P2 | `text-gold-500` sur blanc — 36× | 2.56:1 | Warnings et badges difficilement lisibles |
| P2 | moss-500 sur moss-100 (badges statut) | 3.27:1 | Passe seulement en « large text » |
| OK | text-main (17.99), text-secondary (5.11), CTA ember-600/blanc (5.7) | — | Le cœur du système est sain : c'est la périphérie qui fuit |

### Performance perçue (Lighthouse prod skusku.life, mobile émulé)

| Sév | Constat | Mesure |
|---|---|---|
| **P1** | **LCP landing = 8,8 s** (barre premium < 2,5 s). Hero = collage d'images Unsplash w=1200 (271 + 189 + 83 KB) chargées côté client après hydratation React, sans `preload`, sans `srcset`, sans LQIP | Perf 66/100, FCP 3,9 s |
| P2 | Clerk JS = 204 KB téléchargés sur la landing pour un visiteur anonyme qui ne se connectera peut-être jamais | — |
| OK | CLS = 0 (aucun layout shift) et TBT = 80 ms : l'app est stable et réactive une fois chargée | — |
| P2 | `heading-order` invalide (h3 sans h2) sur la landing — pénalise SEO et lecteurs d'écran | Lighthouse a11y 93 |

### Motion & micro-interactions

| Sév | Constat |
|---|---|
| **P1** | **Inventaire complet du motion : 4 keyframes CSS** (`sk-rise` 320 ms, `sk-pulse`, `sk-halo`, `sk-skel`) + classes `hover:`/`transition-colors` Tailwind. Aucune lib de motion, aucune transition de page, aucun stagger de liste, aucune micro-interaction de feedback (boutons sans état pressed travaillé, pas de spring sur les toggles). Ce qui existe est sobre et purposeful — il n'y en a simplement presque pas. Revolut anime l'arrivée de chaque carte, chaque changement d'état, chaque succès. |
| P2 | **`prefers-reduced-motion` absent du codebase entier** (grep vide) — les 4 animations en boucle (pulse, halo, skeleton) ne se désactivent jamais |
| P2 | Le streaming des résultats (l'instant le plus chargé en attente du produit) n'a ni skeleton cards ni arrivée progressive animée : spinner + 2 phrases statiques, puis tout apparaît d'un bloc (~34 s) |

### Cohérence du design system

| Sév | Constat |
|---|---|
| P1 | **4 composants « ancienne époque »** encore sur la palette blue/indigo pré-redesign : `StickyBookingProgress`, `FriendsManager` (visible dans l'onglet Participants de chaque trip groupe), `IntelligentDatePicker`, `OptimalPeriodsWidget`. L'utilisateur du tunnel groupe voit les deux ères du produit dans la même session |
| P1 | Formats monétaires incohérents entre écrans : Results « €1,136 » (EN) vs SavedTripDetail « 1 136 € » (FR) vs Expenses « €60.00 » vs Account « €6.99/month ». 4 formats différents pour la même devise (screenshots 35, 38, 58, 73) |
| P2 | Timestamps ISO bruts (« 2026-07-14T17:50:00 ») affichés sur la page trip confirmé (54-T4-confirmed.png) |

### Les 5 états (provoqués réellement, screenshots 87-91)

| Écran | Vide | Chargement | Erreur | Verdict |
|---|---|---|---|---|
| Dashboard | 6 CTA quasi identiques empilés (25) | Loader bloquant « Préparation de ton cockpit… » | EmptyState + Réessayer, propre (87) | Vide = P1 (aucune action UNIQUE évidente), erreur = OK |
| Price alerts | Empty state propre avec CTA (70) | Spinner | Backend coupé : message générique, pas de retry auto (88) | OK |
| Results | « Aucun résultat trouvé » + bloc budget détaillé SI budget < estimation (bon réflexe) | Spinner + phrases | Timeout : « le serveur démarre peut-être » = fuite infra | Bloc budget = bonne idée rendue illisible (2.17:1) et qui accuse les critères quand la vraie cause est une panne API |
| TripProposal | Page « bare » sans données : rendu brut sans garde (89) | — | — | P2 |
| Formulaires | Validation step 1 onboarding présente (90) ; soumission possible à 8/9 questions sans erreur visible | — | Erreur API brute EN (« Guest name is required ») dans l'UI FR | P2 |

### Navigation clavier (test réel, screenshot 86)

- Focus visible sur les éléments interactifs principaux (86-P4-keyboard-focus.png) — au-dessus de la moyenne.
- MAIS : modal d'invitation sans `role="dialog"` ni focus trap (notes T4), drawer mobile non testé au clavier, et le pattern hover-open/click-toggle du mega menu est inutilisable au clavier seul.

### Par page (les 14 de PAGES.md — verdict en une ligne)

| Page | Verdict | Sév max |
|---|---|---|
| 1. Landing | Craft visuel = point fort du produit ; mais CTA hero muet pour anonyme, mega menu vitrine vide, LCP 8,8 s | P0 (nav) |
| 2. Destinations index | Propre, SEO OK (84) | P3 |
| 3. Destination landing | Éditorial solide, CTA vers app OK (85) | P3 |
| 4. Accept invitation | Belle page… qui jette l'invité accepté vers la landing (T5) | P0 |
| 5. Onboarding | Choix Express/Complet intelligent, mais « Complet ~10 min » recommandé à un nouvel inscrit + validation laxiste | P1 |
| 6. Dashboard | Vide = 6 CTA redondants, « cockpit » jargon dev ; rempli = correct (37) | P1 |
| 7. Create-trip | Wizard 4 étapes propre, vouvoiement cohérent, budget/pers explicité — la meilleure UX de formulaire du produit | P2 |
| 8. Results | Cartes décisionnelles OK mais contenu 100 % EN, prix format EN, attribution photo cassée (« Photo par detait ») | P1 |
| 9. SavedTripDetail | La plus belle page du produit — billet façon Kayak, « Pourquoi ce plan ? » ; mais itinéraire bloqué sur « Création… » sans fin (reload manuel) + PDF cassé | P0 (PDF) |
| 10. TripDetail (groupe) | Riche et fonctionnel ; ISO bruts, feed EN, FriendsManager ancienne palette, tabs 40 px | P1 |
| 11. Price alerts | Compréhensible en un coup d'œil — bon écran | P2 (formats €EN) |
| 12. Account | Fonctionnel, 4 onglets clairs ; « €6.99/month » brut, zéro célébration post-upgrade | P2 |
| 13. Pricing | Le mieux exécuté du produit avec SavedTripDetail (65) ; mais chiffres FAUX vs backend | P0 (incohérence) |
| 14. TripProposal | Rendu sans garde si état vide | P2 |

## Phase 5 — Copywriting & voix de marque

### Inventaire de la voix actuelle

| Sév | Constat | Preuve |
|---|---|---|
| **P1** | **Tutoiement/vouvoiement structurellement mélangé** : landing = vous (« Décrivez vos envies »), wizard create-trip = vous, dashboard = tu (« Ton prochain départ », « Tes habitudes »), pricing = tu (« Découvre ta prochaine destination »), paywall widget = vous (« Pensez à passer premium »). L'utilisateur change de relation avec le produit 3 fois dans une même session | Landing.jsx COPY, Pricing.jsx PLANS, HeroGreeting, SearchUsageWidget |
| **P1** | **FR/EN mélangé au cœur du produit** : descriptions et activités des cartes résultats 100 % EN, thèmes d'itinéraire EN (« Arrival & Old Town Discovery »), feed d'activité groupe EN (« Camille voted »), messages système chat EN (« Marion joined the trip »), erreurs API brutes EN dans l'UI (« Guest name is required »), warning budget EN (« Flight prices exceed your €150 budget ») | screenshots 35, 39, 54, 59 + NDJSON E1 |
| **P1** | **Emails transactionnels** : l'email d'invitation — premier contact du canal viral n°1 — part avec le sujet EN « 🌍 You're invited to join "X"! ». Les autres sujets mélangent FR/EN et formats (« Prix en baisse: Lisbonne à €450 ») | emailService.js:39,288,376,553,760 |
| P2 | Ton globalement juste quand il est FR : chaleureux sans être copain, bonnes idées (« Et après ? », « Rien d'urgent — bon moment pour explorer »). Le problème n'est pas le ton, c'est la **discipline** (langue, personne, formats) | Dashboard |
| P2 | Jargon dev qui fuit : « activer ton cockpit », « pas un mock », « Préparation de ton cockpit… » | ActionCenter.jsx:156, Dashboard.jsx:97 |
| P2 | « TRICOUNT DU GROUPE » — nom d'une marque concurrente utilisé comme label de feature | TripExpenses (58) |

### Les 15 réécritures avant/après → voir Annexe A (prêtes à copier-coller)

### Benchmark de standing (Skusku vs références)

| Moment | Skusku (actuel) | Référence | Écart |
|---|---|---|---|
| Erreur de recherche | « La recherche prend trop de temps. Réessayez dans un instant (le serveur démarre peut-être). » | Linear : « Something went wrong. We've been notified and are looking into it. » | La référence prend la responsabilité ; Skusku fuit ses détails d'infra et laisse l'utilisateur seul |
| Limite atteinte | « Bientôt à court de recherches. Pensez à passer premium. » | Revolut : « You've reached your plan limit. Upgrade to keep going — or wait until 1 July. » | La référence donne les 2 issues + la date ; Skusku donne un conseil vague |
| Email d'invitation | « 🌍 You're invited to join "Lisbonne entre amis"! » | Airbnb (FR) : « Léa vous invite à organiser un voyage ensemble » | La référence est dans la langue du destinataire et nomme l'invitant — c'est lui le vrai argument |
| Baisse de prix | « 🔔 Prix en baisse: Lisbonne à €450 (-12%) » | Hopper : « Prices just dropped for your trip to Lisbon. Book in the next 2 days to lock it in. » | La référence crée une fenêtre d'action ; Skusku constate |

### Naming « Skusku » (constat, pas de décision)

- **Forces** : court, mémorable, disponible, sonorité douce et non corporate, se prête au branding (mascotte, répétition « sku-sku »). Aucune connotation négative en FR.
- **Faiblesses** : n'évoque NI le voyage ni l'IA (zéro indice métier — le tagline doit tout porter), prononciation ambiguë à l'écrit (« skousskou » ? « skuskü » ?), risque de confusion avec « SKU » (jargon e-commerce) pour une audience B2B/tech, et difficile à googler en oral pur.
- **Constat net** : c'est un nom de marque « à la Klarna/Zalando » — viable, mais il exige une exécution visuelle et copy irréprochable pour installer le sens. Aujourd'hui le niveau d'exécution (mix FR/EN, Clerk « Travel App ») ne porte pas encore le nom.

## Phase 6 — Direction artistique : garder, faire évoluer ou changer

### 1. Diagnostic : une bonne DA exécutée à 60 %

La DA « warm minimalism » (sand/ember/moss, Fraunces display + DM Sans, JetBrains Mono pour la data) est **une vraie direction**, pas un thème Tailwind par défaut — et c'est rare à ce stade. Là où elle est poussée (landing, SavedTripDetail, Pricing), le produit a un standing qu'aucun Booking/Expedia n'a : éditorial, calme, chaleureux. Le hero pricing avec ses italiques Fraunces et son bloc final sombre dégradé est du niveau d'un bon SaaS design-led.

Mais l'exécution s'arrête à mi-chemin :
- **Périphérie illisible** : les tokens `text-light`/`text-muted`/`gold-500` (170+ usages cumulés) sont sous le seuil AA — la chaleur de la palette a été obtenue en sacrifiant le contraste.
- **4 composants d'une autre ère** (blue/indigo) dont un au cœur du tunnel groupe (FriendsManager).
- **Pas de système de motion** : 4 keyframes, zéro transition d'état, zéro célébration — or la DA « éditoriale chaleureuse » repose précisément sur les micro-moments pour ne pas paraître statique.
- **Formats data indisciplinés** (4 formats de devise, ISO bruts) — la promesse « JetBrains Mono pour la data » suppose une data irréprochable ; aujourd'hui le mono met en valeur des données mal formatées.

**Verdict : ce n'est pas la DA qui est en cause, c'est sa couverture.** Une bonne DA appliquée à 60 % paraît plus cheap qu'une DA moyenne appliquée à 100 %, parce que les ruptures se voient.

### 2. Adéquation marché

Pour un SaaS voyage premium FR, la chaleur éditoriale est un **différenciateur réel** : tout le marché est froid (bleu Booking/Expedia/Kayak) ou candy (Hopper). Le risque « pas assez fintech-grade » est faible tant que les zones de **transaction** (pricing, checkout, account) restent rigoureuses — et ce sont justement les pages déjà les mieux exécutées. Le voyage se vend par le désir, pas par la conformité : Airbnb l'a prouvé contre les OTA corporate.

### 3. Trois options

| Option | Description | Références | Coût | Risque |
|---|---|---|---|---|
| **(a) Garder et pousser à fond** ✅ | Même palette/typo, corriger les tokens AA, migrer les 4 composants legacy, ajouter un système de motion sobre (entrées staggerées, transitions d'état, 1 célébration), discipline data (1 formateur devise/date) | Airbnb (chaleur + rigueur), Cron/Notion Calendar (calme + motion précis), Arc browser (éditorial + craft) | **S/M — 2-3 semaines** | Quasi nul : on capitalise sur l'existant |
| (b) Évoluer « editorial-fintech » | Garder chaleur, ajouter une couche de rigueur visuelle : grille 8pt stricte, data-viz (prix, votes, dépenses), motion système complet, dark mode | Mercury.com (la référence du genre), Linear (système), Amie (chaleur+motion) | M/L — 4-8 semaines | Moyen : peut diluer la personnalité si mal dosé |
| (c) Pivot Revolut (dark, métal, 3D) | Refonte complète vers le langage fintech premium | Revolut, Robinhood | L — 2-3 mois | Élevé : à contre-emploi pour du voyage (froid là où il faut du désir), jette le seul actif différenciant déjà construit |

**Recommandation ferme : (a).** Le problème de Skusku n'a jamais été sa direction artistique — c'est la **discipline d'exécution** (contraste, langue, formats, motion). L'option (c) coûterait 10× plus pour résoudre un problème que le produit n'a pas. Réévaluer (b) post-launch si la cible s'avère plus « power user » que prévu.

## Phase 7 — Audit business

### Pricing : structure saine, chiffres faux

| Sév | Constat | Impact |
|---|---|---|
| **P0** | **La page pricing ment** : « 5 recherches/mois » (Free) et « 40/mois » (Starter) affichés ; le backend applique 10 et 50 (`stripeService.js`). La FAQ répète le faux chiffre. Ligne « Notifications push » cochée pour aucun plan. | Un utilisateur qui compare son usage réel à la promesse voit un produit qui ne sait pas compter — fatal pour vendre un abonnement |
| P1 | Le blocage quota arrive à l'étape 4/4 du wizard : l'utilisateur limité remplit 3 écrans pour rien, et le CTA « Passer à Premium » au moment du blocage est **disabled** | Le pic d'intention d'achat du produit tombe sur un bouton mort |
| P2 | Nom interne EXPLORER ≠ nom public Starter — risque d'incohérence à chaque évolution | Dette |

**Lecture en 5 s : OUI** — 3 cartes + Trip Pass clairement séparé, ancre annuelle par défaut avec « 2 mois offerts », réassurance Stripe/3DS visible. La structure est au niveau ; seuls les contenus trahissent.

**L'ancre est bonne** : 29 €/an (2,42 €/mois) est un prix d'impulsion ; Wanderer 49 €/an porte le différenciateur groupe. Positionnement vs marché : TripIt Pro ≈ 49 $/an (organisation, pas de reco), Hopper = gratuit + fees par transaction (prédiction prix), Kayak/Google = gratuits (méta-recherche), Mindtrip/Layla = gratuits en acquisition (planners IA, monétisation affiliation). **Skusku est seul à faire payer la composition de voyage en SaaS** — défendable UNIQUEMENT si le groupe (vote, dépenses, chat) est la valeur payante, car la reco IA seule est attaquée par des gratuits. La structure actuelle (groupe dans Wanderer) est donc la bonne.

**Trip Pass 5,99 € : génial, pas cannibale** — il capture exactement le voyageur 1×/an qui ne s'abonnera jamais (LTV 0 sinon), à condition d'être poussé au paywall (aujourd'hui il n'y apparaît pas — le blocage ne propose que l'upgrade). Risque de cannibalisation de Starter faible : 2 Trip Pass = 1 an de Starter, l'arbitrage se fait tout seul.

### Funnel : les fuites probables vs les events posés

Funnel instrumenté (`lib/analytics.js`, 8 events, Plausible chargé sur skusku.life) : signup · search_started · results_viewed · trip_saved · checkout_started · checkout_completed · invitation_sent · invitation_accepted.

| Fuite probable | Couverte ? | Event manquant |
|---|---|---|
| Landing → signup (CTA hero muet pour anonyme = fuite n°1 mesurable) | ⚠️ partielle | `hero_search_submitted` (anonyme), `signup_modal_opened` |
| Signup → onboarding complété (le « Complet 10 min » recommandé doit faire fuir) | ❌ | `onboarding_started/completed/skipped` + variante express/complet |
| Recherche → résultats vus (34-60 s d'attente + échecs API silencieux) | ⚠️ | `search_failed`, `search_no_results`, `search_timeout` — sans eux, impossible de distinguer fuite UX et panne |
| Résultats → save | ✅ trip_saved | — |
| Save → retour J+7 | ❌ | rien ne mesure la rétention (pas de `session_return`, pas de cohortes) |
| Free → paid | ⚠️ | `paywall_viewed`, `pricing_viewed`, `trip_pass_purchased` (distinct de checkout) |
| Boucle virale | ⚠️ | `invite_landing_viewed` (l'invité qui VOIT la page sans accepter = la vraie base du taux viral) |

### Confiance : ce qui manque pour sortir la CB

**État : rédhibitoire.** Pour un produit qui encaisse via Stripe :
- `/privacy` et `/terms` → redirect home (landing) ; dans l'app, les liens du footer sont des `href="#"` avec `preventDefault()` — **ils ne font rien au clic** (`AppLayout.jsx:131-133`).
- **Aucune mention légale, CGV, politique de remboursement, RGPD** (obligation légale FR/UE pour un service payant — exposition juridique réelle, pas juste UX).
- **Aucun email/page de contact ou support** nulle part dans le frontend (grep vide) — le lien « Support » est mort aussi.
- Aucune identité société (qui encaisse ? quelle entité ?), aucun « À propos ».
- Preuve sociale : 3 témoignages aux initiales invérifiables.
- Côté positif : badge « Paiement sécurisé Stripe/3DS » sur pricing, modal Clerk (mais brandée « Travel App » EN…).

### Rétention J+7 (sans nouveau voyage prévu)

Les briques existent — alertes prix (+push), digest hebdo (opt-in, `digestService.js` câblé), ActionCenter avec `ai-window-suggestion`, InsightsRow « Tes habitudes, en pistes » — mais **rien ne ramène activement** : le digest est opt-in enterré dans Account, les alertes supposent un trip déjà sauvé, et aucune notification de « fenêtre de prix idéale » proactive n'est envoyée sans alerte créée. La rétention repose aujourd'hui sur la mémoire de l'utilisateur. Quick win : digest opt-OUT par défaut à l'inscription (avec désinscription 1 clic) + 1 email J+3 « vos 3 destinations vous attendent ».

### Boucle virale (chaque écran du tunnel invitation jugé comme une page de vente)

1. **Email d'invitation** : sujet EN « You're invited to join… » — première impression du canal gratuit n°1 en anglais. P0 du canal.
2. **Page d'invitation déconnecté** (45) : belle, value props, expiration — la meilleure « page de vente » du tunnel. ✅
3. **Accept invité** : l'invité accepte → rebond **landing marketing** sans explication (ProtectedRoute ignore la guestSession). L'instant de plus forte intention du funnel viral jette l'utilisateur. **P0 absolu.**
4. **Dans le trip** : l'invité guest voit le produit au complet (vote, chat) — bon vecteur de conversion… mais aucun CTA « Créer mon compte pour garder tout ça » dans l'expérience guest, et l'invitée guest est exclue du split des dépenses.
5. **Sécurité** : l'invitation nominative peut être consommée par n'importe qui (token non lié à l'email) — un inconnu peut entrer dans le voyage d'un groupe.

### Positionnement en une phrase

**« Skusku est le seul planificateur IA français qui transforme “on devrait partir ensemble” en voyage réservé — destinations votées, budget partagé, billets trouvés — là où Google Flights compare des prix et ChatGPT écrit des listes. »**

La phrase s'écrit — le différenciateur groupe est réel et démontré (T4 fonctionne). Le finding business n°1 n'est donc pas le positionnement, c'est que **le produit ne le dit nulle part** : la landing vend « le voyage qui vous ressemble » (promesse solo, attaquée par 10 gratuits) et garde son arme (groupe + vote + dépenses) en feature secondaire, pendant que le tunnel viral qui devrait la démontrer jette les invités sur la page marketing.

## Top 20 quick wins (impact fort / effort ≤ 1 jour, triés par impact)

| # | Quick win | Impact | Effort |
|---|---|---|---|
| 1 | **Corriger les chiffres du pricing** (5→10, 40→50, ligne push, FAQ) — ou décider que la vérité est 5/40 et changer le backend | Confiance paiement | 1 h |
| 2 | **Config Clerk : localisation frFR + nom « Skusku »** (fini « Sign in to Travel App ») | 1er pas de conversion | 1 h |
| 3 | **Pages /privacy + /terms réelles** (template CGV/RGPD SaaS FR) + liens footer app réparés (`href="#"` → routes) | Légal + confiance | 1 j |
| 4 | **Fix PDF** : enregistrer la police Inter italic dans @react-pdf (ou retirer l'italique) | Feature payante cassée | 2 h |
| 5 | **Fix flux invité** : ProtectedRoute accepte la guestSession (ou route guest dédiée) — l'invité accepté ne doit plus jamais voir la landing | Canal viral n°1 | 0,5-1 j |
| 6 | **Hero search anonyme** : conserver la saisie + ouvrir le sign-up contextualisé au lieu du rebond silencieux | Fuite acquisition n°1 | 0,5 j |
| 7 | **Email d'invitation en FR** avec le prénom de l'invitant en sujet | Canal viral | 1 h |
| 8 | **Un seul formateur devise/date** (`Intl.NumberFormat('fr-FR')`) appliqué à Results, Expenses, Account, page confirmée (ISO bruts), emails | Standing | 0,5 j |
| 9 | **Élaguer le mega menu** aux routes qui existent + retirer les compteurs fictifs (« 32 itinéraires », « il y a 3 jours ») | Confiance | 2 h |
| 10 | **Dashboard vide : 1 seul CTA** (supprimer les 5 redondants) + retirer « cockpit »/« pas un mock » | Activation | 2 h |
| 11 | **CTA paywall actif** : à la limite, « Continuer avec un Trip Pass (5,99 €) » cliquable au lieu du bouton premium disabled — et bloquer à l'étape 1 du wizard, pas à la 4 | Revenu direct | 2 h |
| 12 | **Préload de l'image hero LCP** (`<link rel="preload">` + srcset + w=800 mobile) — LCP 8,8 s → ~3 s | Perf perçue | 2 h |
| 13 | **Messages d'erreur sans fuite infra** : « le serveur démarre », « ajustez vos critères » sur panne API → messages honnêtes (cf. réécritures 6-7) | Confiance | 2 h |
| 14 | **SignUpButton au lieu de SignInButton** sur les 2 CTA landing | Conversion | 15 min |
| 15 | **Bloc budget lisible** : texte du « Budget insuffisant » en text-main (2.17:1 → 12+:1) | Tunnel cœur | 30 min |
| 16 | **Rendre le markdown du chat @assistant** (lib md déjà dispo ou regex simple) + messages système FR | Différenciateur groupe | 2 h |
| 17 | **Itinéraire SavedTripDetail : polling** (ou SSE comme TripDetail) pour sortir du « Création… » infini | Tunnel cœur | 0,5 j |
| 18 | **Page de contact/support** (même un mailto: + FAQ) liée depuis les 2 footers | Confiance | 1 h |
| 19 | **Events analytics manquants** : onboarding_started/completed, search_failed/no_results, paywall_viewed, invite_landing_viewed, trip_pass_purchased | Pilotage funnel | 0,5 j |
| 20 | **« TRICOUNT DU GROUPE » → « Dépenses du groupe »** + email digest opt-out par défaut à l'inscription | Marque + rétention | 1 h |

## Plan « premium en 3 sprints »

> Effort : S = ≤ 1 j · M = 2-4 j · L = ≥ 1 sem. Hypothèse : 1 dev + Claude Code.

### Sprint 1 — Confiance, légal & quick wins (1 semaine) : « plus rien ne ment »

| Item | Effort |
|---|---|
| Quick wins 1-20 ci-dessus (la majorité tiennent dans le sprint) | S×20 |
| Smoke-test checkout Stripe **en prod** (4242…) + webhook → plan visible dans /account | S |
| Légal complet : mentions légales, CGV, politique de confidentialité RGPD, identité société, remboursements | M |
| Rotation BOOKING_API_KEY (toujours exposée dans l'historique git — dette V2) | S |

**Definition of done** : un inconnu peut aller de la landing au paiement sans rencontrer un lien mort, un texte EN non voulu, un chiffre faux ou un bouton disabled.

### Sprint 2 — Polish des 3 tunnels cœur (2 semaines) : « le produit tient sa promesse »

| Item | Effort |
|---|---|
| **T2 Recherche** : skeleton cards + arrivée progressive par destination (le SSE existe déjà — c'est un travail frontend), retry auto sur timeout, distinction panne/critères | M |
| **Moteur** : les 4 bugs de la chaîne T9 (durée « week-end » ignorée, ratio hôtel couple 85 %, vol hors budget retenu, message accusateur) + budget_warning en FR + E5 « sans avion » : proposer du train réel (ou assumer « vol quand même » explicitement) | L |
| **T3 Détail** : itinéraire polling/SSE + contexte vol/hôtel transmis au prompt (fini « Hotel Cubo » fantôme) + PDF robuste | M |
| **T4/T5 Groupe** : expérience guest complète (split dépenses, CTA « créer mon compte », token lié à l'email) | M |
| i18n : tout le contenu généré (descriptions, itinéraires, feed, chat système) en FR | M |
| Tokens contraste : remplacer text-light/text-muted/gold-500 par des variantes AA (≥ 4.5:1) — 1 commit de tokens, pas 170 retouches | S/M |
| Mobile : tabs 44 px + indicateur de scroll des onglets | S |

**Definition of done** : T2 < 20 s perçues (premier contenu), T4+T5 sans rupture pour un invité, zéro texte EN dans un parcours FR.

### Sprint 3 — DA & motion (2 semaines) : « ça respire le premium »

| Item | Effort |
|---|---|
| Système de motion : transitions d'entrée staggerées (résultats, dashboard), transitions d'état (vote → confirmé), 1 célébration sobre (trip confirmé, upgrade), `prefers-reduced-motion` global | M |
| Migration des 4 composants legacy (StickyBookingProgress, FriendsManager, IntelligentDatePicker, OptimalPeriodsWidget) vers les tokens sand/ember | M |
| LCP < 2,5 s : images hero self-hosted optimisées (AVIF + srcset + LQIP), Clerk en lazy pour les anonymes | M |
| Preuve sociale réelle (compteur de voyages composés, avis vérifiables) ou suppression des témoignages à initiales | S |
| Onboarding : inverser la recommandation (Express par défaut), montrer la valeur avant le questionnaire long | S |
| A11y : role="dialog" + focus trap sur les modals, heading-order, navigation clavier mega menu | M |

**Definition of done** : Lighthouse perf ≥ 85 mobile, un screen-recording du tunnel T2/T4 est montrable en démo investisseur sans gêne.

## Annexe A — Les 15 réécritures copy (avant / après, prêtes à copier-coller)

> Convention retenue pour les réécritures : **vouvoiement partout** (c'est le choix de la landing, la voix la plus travaillée du produit, et le standard SaaS premium FR — Revolut FR vouvoie). Si Arthur tranche pour le tutoiement, inverser mécaniquement.

**1. Hero landing** — `Landing.jsx:36`
- Avant : « Le voyage qui vous ressemble, déjà pensé. »
- Après : *(garder — c'est la meilleure ligne du produit)*. Variante à A/B tester : « Votre prochain voyage, déjà composé. »

**2. Sous-titre hero** — `Landing.jsx:37`
- Avant : « Décrivez vos envies. On compose vols, hôtels et itinéraire, vous n'avez plus qu'à dire oui. »
- Après : « Décrivez vos envies. Skusku compose vols, hôtels et itinéraire — vous n'avez plus qu'à dire oui. » *(le « On » anonyme → la marque ; le tiret rythme la chute)*

**3. CTA principal landing** — `Landing.jsx:38`
- Avant : « Composer mon voyage » (ouvre une modal **sign-in** en anglais)
- Après : « Composer mon voyage — gratuit » + ouvrir le **sign-up** Clerk localisé FR avec le nom « Skusku » (config Clerk : `localization: frFR`, application name)

**4. CTA hero search (anonyme)** — Landing.jsx:188-200
- Avant : « Chercher » → rebond silencieux vers `/`
- Après : « Voir mes destinations » → conserver la saisie, ouvrir le sign-up avec message contextuel : « Créez votre compte pour découvrir vos 3 destinations — 30 secondes, gratuit. »

**5. Dashboard vide (action unique)** — Dashboard/ActionCenter
- Avant : 6 CTA (« Planifier un trip », « Planifier un nouveau trip », « Explorer », « Lancer une recherche », « Planifier », « Voir mes trips ») + « Lance une première recherche pour activer ton cockpit »
- Après : UN seul bloc : « **Où partez-vous en premier ?** Décrivez votre envie — Skusku compose la destination, les dates, le vol et l'hôtel. » CTA unique : « Composer mon premier voyage ». *(Supprimer les 5 autres CTA de l'état vide.)*

**6. Timeout de recherche** — `Results.jsx:66`
- Avant : « La recherche prend trop de temps. Réessayez dans un instant (le serveur démarre peut-être). »
- Après : « La recherche prend plus de temps que prévu. Vos résultats sont en route — réessayez dans une minute, votre quota n'est pas décompté. » *(et techniquement : retry auto + ne pas décompter)*

**7. Aucun résultat (panne API vs vrais critères)** — Results.jsx:534
- Avant : « Aucun résultat trouvé — ajustez vos critères » (affiché même quand la cause est un 429 Booking)
- Après (cas panne) : « Nos partenaires vols/hôtels ne répondent pas. Réessayez dans quelques minutes — vos critères sont bons, c'est nous. »
- Après (cas budget réel) : garder le bloc de détail budget existant, mais le passer en texte `text-main` sur fond `gold-100` (le rendu actuel gold-sur-gold est à 2.17:1).

**8. Warning budget (backend)** — destinationService
- Avant : « Flight prices exceed your €150 budget. Here are your best options: … » (EN sur app FR)
- Après : « Les vols dépassent votre budget de 150 €. Pour rester dedans : partez en train (souvent moins cher à proximité), élargissez vos dates de ±3 jours, ou visez 2-3 mois à l'avance. »

**9. Email d'invitation (canal viral n°1)** — `emailService.js:39`
- Avant : « 🌍 You're invited to join "Lisbonne entre amis"! »
- Après : « {Prénom} vous invite : Lisbonne entre amis ✈️ » — corps 100 % FR, le prénom de l'invitant en premier mot (c'est lui l'argument de conversion, pas le produit).

**10. Email baisse de prix** — `emailService.js:760`
- Avant : « 🔔 Prix en baisse: {destination} à €450 (-12%) »
- Après : « {Destination} vient de baisser : 450 € (−12 %) — votre alerte a fonctionné » + CTA « Voir le prix » avec mention de la fenêtre (« les prix last-minute remontent vite »).

**11. Page pricing (header)** — Pricing.jsx
- Avant : « Trouve, planifie et réserve ton prochain voyage — sans prise de tête » (tu, alors que la landing vouvoie)
- Après : « Tous vos voyages, composés pour vous — sans prise de tête. » + sous-ligne : « Commencez gratuitement. Passez au premium quand vous voulez aller plus loin. »

**12. FAQ pricing (limite)** — Pricing.jsx FAQ
- Avant : « Tu peux attendre le mois suivant, prendre un Trip Pass, ou passer à une offre supérieure. »
- Après : « Trois options : attendre le 1er du mois (votre quota se recharge), prendre un Trip Pass 7 jours (5,99 €), ou passer à Starter. » *(+ corriger « 5 recherches/mois » → la vraie valeur backend)*

**13. Paywall (à la limite)** — SearchUsageWidget + CreateTrip step 4
- Avant : « Bientôt à court de recherches. Pensez à passer premium. » + CTA principal **disabled** « Passer à Premium »
- Après : « Plus que {n} recherches ce mois-ci. » À zéro : « Vous avez utilisé vos {limit} recherches de juin. Reprenez le 1er juillet — ou continuez maintenant : » CTA **actif** « Continuer avec un Trip Pass (5,99 €) » + lien secondaire « Voir les offres ». *(Et bloquer à l'étape 1, pas à l'étape 4.)*

**14. Chat système groupe** — socket/messages
- Avant : « Marion joined the trip », « Voting complete! », « Camille voted »
- Après : « Marion a rejoint le voyage », « Vote terminé — {destination} l'emporte 🎉 », « Camille a voté »

**15. Post-achat (/account)** — Account.jsx Subscription
- Avant : « €6.99/month », aucun accueil après upgrade
- Après : « Bienvenue dans Wanderer 🎉 Recherches illimitées, groupes illimités, alertes illimitées — c'est parti. » + « 6,99 €/mois · prochaine échéance le {date} ».

### Bonus — corrections mécaniques à passer partout
- Un seul formateur de devise : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` → « 1 136 € » partout (Results, Expenses, Account, emails).
- Dates : `Intl.DateTimeFormat('fr-FR')` → plus aucun ISO brut ni « 10:00 AM ».
- « TRICOUNT DU GROUPE » → « Dépenses du groupe ».
- « Lisbon/Barcelona/Rome/Morocco » → « Lisbonne/Barcelone/Rome/Maroc » (cartes landing, footer, résultats).
