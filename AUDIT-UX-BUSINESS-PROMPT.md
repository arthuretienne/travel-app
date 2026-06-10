# PROMPT — Audit UX/UI · Produit · Business (V3) — Skusku

Rôle & posture
Tu es à la fois **lead product designer** (ex-Revolut/Linear/Airbnb), **brand & copywriting strategist** et **QA lead**. Tu audites Skusku (skusku.life), un AI travel planner dont **toutes les features existent et dont la couche technique vient d'être durcie** (cf. AUDIT-PRE-SHIP-V2.md — ne refais PAS cet audit technique). Ta mission : dire sans complaisance ce qui sépare ce produit d'un SaaS **ultra-professionnel niveau Revolut** — du menu aux animations, du copywriting au footer — et le prouver en utilisant réellement l'interface.

La barre : un utilisateur exigeant qui paie 9 €/mois pour Revolut, Linear ou Notion doit ouvrir Skusku et penser « c'est du même niveau ». Chaque écart à cette barre est un finding.

Règles dures
- **Tu testes en vrai.** Chaque jugement UX doit s'appuyer sur une session réelle dans le navigateur, avec **screenshot à l'appui** (sauve-les dans `audit-v3-screens/`). Pas d'audit de code pur : le code ne te sert qu'à expliquer ce que tu observes.
- **Critique tout ce qui est critiquable.** Le but n'est pas d'être gentil, c'est d'arriver au niveau premium. Un « c'est correct » est un finding raté.
- **Sépare fait / opinion / goût.** Fait = mesurable (contraste, latence, bug). Opinion étayée = heuristique reconnue (Nielsen, lois UX). Goût = à signaler comme tel.
- **Tu ne corriges rien.** Seuls livrables écrits : `AUDIT-UX-BUSINESS.md` + le dossier de screenshots.
- Sévérités : **P0** = tue la conversion ou la confiance (bug bloquant dans un tunnel, incohérence de marque flagrante, prix illisible) · **P1** = fait « cheap » / friction majeure · **P2** = polish manquant · **P3** = détail.

---

## Phase 0 — Setup & environnement de test

1. Lance l'app en local : `cd backend && npm start` (avec `DEV_MODE=true` dans l'env pour activer les personas) + `cd frontend && npm run dev`.
2. Seed les comptes de test : `node backend/scripts/seed_group_test.js` (personas `@skusku-test.dev`). La **DevPersonaBar** (coin de l'écran en dev) permet de basculer d'un profil à l'autre en un clic — utilise-la pour tester les profils. API : `GET /api/dev/personas`.
3. Lis `PAGES.md` (inventaire exhaustif des 14 pages, types d'auth, features par page) — c'est ta carte. La skill `workflow-audit` existe si tu veux dériver des parcours.
4. Stripe est en mode test : tu peux dérouler un checkout complet avec la carte `4242 4242 4242 4242`.
5. Teste **desktop (1440px) ET mobile (390px)** systématiquement. Note la latence perçue de chaque étape (chrono réel, pas estimation).

## Phase 1 — Le test des 5 secondes & la première impression

Avant tout parcours : arrive sur la landing comme un inconnu.
- En 5 secondes : comprends-tu ce que fait le produit, pour qui, et pourquoi lui plutôt que Google Flights + ChatGPT ? Note la proposition de valeur telle que tu la perçois, puis compare à ce que le produit fait vraiment.
- Scroll complet de la landing : hiérarchie, rythme visuel, preuve sociale, CTA. Screenshot annoté de chaque section avec verdict.
- Le **footer** (Revolut-grade = légal complet, sitemap, langues, réassurance) : ⚠️ on sait déjà que `/privacy` et `/terms` n'existent pas (liens morts → redirect home). C'est un P0 confiance pour un produit qui encaisse — confirme et cherche tout ce qui manque (mentions légales, CGV, contact, statut société).
- Le **menu/navigation** : teste le mega menu desktop, le drawer mobile, les états hover/focus/actif, le comportement au scroll. Compare à revolut.com : qu'est-ce qui fait la différence exactement ?

## Phase 2 — Tunnels bout-en-bout (à dérouler RÉELLEMENT, screenshots à chaque étape)

Pour chaque tunnel : friction count (nombre de clics/champs/écrans), temps total, moments de doute (« qu'est-ce que je dois faire là ? »), états vides/chargement/erreur rencontrés, et le verdict « est-ce que j'aurais abandonné ? ».

- **T1 Découverte → inscription** : landing → signup Clerk → onboarding (court ET long) → dashboard vide. L'onboarding vend-il la valeur ou est-ce un interrogatoire ? Le dashboard vide donne-t-il UNE action évidente ?
- **T2 Première recherche (cœur du produit)** : create-trip → formulaire → streaming des résultats → carte résultat. Chronomètre le streaming. Les phases de chargement rassurent-elles ? Les cartes résultats permettent-elles de DÉCIDER (prix/pers vs total, dates, ce qui est inclus) ?
- **T3 Résultat → sauvegarde → détail** : save → dashboard → SavedTripDetail → itinéraire SSE → export PDF. Le PDF est-il montrable à un ami ?
- **T4 Tunnel groupe complet (différenciateur n°1)** : créer un trip groupe → inviter (email réel + lien) → accepter en tant qu'autre persona (DevPersonaBar) → proposer des destinations → voter avec 2-3 personas → finaliser → checklist réservation → dépenses Tricount → chat (+ @assistant). C'est LE parcours qui doit être magique — note chaque rupture de fluidité.
- **T5 Invité sans compte** : ouvrir un lien d'invitation déconnecté → que se passe-t-il ? (l'audit V2 soupçonne un flux invité cassé — tranche la question en le vivant).
- **T6 Monétisation** : atteindre la limite free (ou simuler) → message de blocage → pricing → checkout test → retour /account → le plan est-il visible et célébré ? Tester aussi Trip Pass et le portail de gestion/annulation.
- **T7 Alertes prix** : créer une alerte depuis les résultats → la page alertes → comprendre l'état d'une alerte sans réfléchir.
- **T8 Compte & sortie** : modifier ses préférences → opt-out emails → supprimer son compte. La sortie est-elle aussi propre que l'entrée (standard premium) ?
- **T9 Mobile only** : refais T2 + T4 entièrement à 390px. Tap targets, claviers, swipe, sticky CTAs.

## Phase 3 — Stress test des recommandations (edge cases par profils)

Le moteur est le produit. Déroule ces recherches via l'UI (et l'API si plus rapide pour itérer) et juge **la pertinence ET la manière dont l'UI gère le cas**. Pour chaque cas : screenshot, verdict pertinence (1-5), verdict UX du cas limite (message, fallback, honnêteté).

| # | Profil / requête | Ce qu'on teste |
|---|---|---|
| E1 | Solo, budget 150 € total, 5 jours | plancher budget — résultats honnêtes ou absurdes ? |
| E2 | Couple, budget 30 000 €, 4 jours | plafond — propose-t-on du luxe ou la même chose qu'à 1 500 € ? |
| E3 | Famille 2 adultes + 3 enfants (5 voyageurs) | budget total vs /pers, chambres familiales, activités enfants |
| E4 | Groupe 8 amis, budget serré | hostels pour groupe ? cohérence prix ×8 |
| E5 | « Je ne veux SURTOUT pas d'avion » (texte libre) | respect contrainte dure — train/alternatives |
| E6 | Texte libre contradictoire : « plage déserte mais grande ville animée » | arbitrage + explication |
| E7 | Texte libre en anglais sur l'app FR | robustesse langue |
| E8 | Texte libre vide + onboarding minimal (cold start) | qualité sans signal |
| E9 | Départ demain, dates fixes | faisabilité réelle, prix last-minute |
| E10 | Durée 1 jour / durée 30 jours | extrêmes de durée |
| E11 | Mobilité réduite déclarée dans l'onboarding | la contrainte ressort-elle (hôtels, activités, conseils) ? |
| E12 | Végétarien/halal + gastronomie en top activité | personnalisation food réelle ou cosmétique |
| E13 | 3 recherches identiques d'affilée | diversité vs répétition (bug connu historique) |
| E14 | Rejeter 2 destinations puis relancer | l'apprentissage (signaux) se voit-il ? |
| E15 | Origine non-Paris (Lyon, Bruxelles) + destination mal couverte (Sofia/Tallinn — gap IATA connu) | honnêteté de l'échec : message ou silence ? |

Synthèse Phase 3 : taux de cas « bien gérés » /15, et les 3 pires réponses montrées telles quelles.

## Phase 4 — Audit UX/UI systématique par écran

Pour chacune des 14 pages de PAGES.md, à la loupe :
- **Hiérarchie & densité** : un seul message principal par écran ? Espace blanc Revolut-grade ou interface tassée ?
- **Les 5 états** : vide, chargement (skeleton vs spinner), erreur, partiel, succès. Provoque-les réellement (couper le backend, profil vide, etc.).
- **Motion** : inventaire des animations existantes (entrées, transitions, micro-interactions, hover). Verdict : purposeful (guide l'œil) ou décoratif/absent ? Qu'est-ce que Revolut ferait sur cet écran ?
- **Cohérence du design system** : dérives de couleurs/typo/radius/ombres entre pages (le produit a eu plusieurs vagues de redesign — traque les écrans « ancienne époque »).
- **Formulaires** : labels, validation inline, messages d'erreur en français humain, focus management.
- **Accessibilité minimum viable** : contrastes (mesure-les), navigation clavier sur les 3 tunnels principaux, alt/aria sur les éléments interactifs, prefers-reduced-motion.
- **Performance perçue** : LCP de la landing et du dashboard (Lighthouse), poids des images Pexels, layout shifts.

## Phase 5 — Copywriting & voix de marque

- Inventaire de la voix actuelle : tutoiement/vouvoiement cohérent ? (traque les mélanges), ton (copain ? assistant ? expert ?), emojis (où, combien, pourquoi).
- **Réécris concrètement** — avant/après — les 15 textes les plus importants : hero landing, sous-titre, 3 CTAs principaux, messages d'erreur des tunnels, états vides, emails transactionnels (invitation, baisse de prix, digest), page pricing (noms de plans, descriptions, FAQ), microcopy du paywall.
- Benchmark : mets côte à côte une phrase Skusku et son équivalent Revolut/Hopper/Airbnb pour montrer l'écart de standing.
- Le **naming** : « Skusku » — force/faiblesse pour la cible FR, prononçabilité, ce que le nom évoque. (Constat, pas de décision.)

## Phase 6 — Direction artistique : garder, faire évoluer ou changer

Le design system actuel = « warm minimalism » (sand/ember/moss, Fraunces display + DM Sans). Tranche :
1. **Diagnostic** : cette DA est-elle exécutée à son plein niveau, ou à moitié appliquée ? (Une bonne DA mal exécutée ≠ une mauvaise DA.)
2. **Adéquation marché** : pour un SaaS voyage premium FR, cette chaleur éditoriale est-elle un différenciateur (vs le bleu corporate de Booking/Expedia) ou un manque de crédibilité « fintech-grade » ?
3. **Trois options argumentées** avec références visuelles précises (sites/produits existants) : (a) garder et pousser l'exécution à fond, (b) évoluer (garder la chaleur, ajouter la rigueur — grilles, data-viz, motion système), (c) pivot complet style Revolut (dark, métal, motion 3D). Recommandation ferme + ce que ça coûte.

## Phase 7 — Audit business

- **Pricing** : 0/9/19 € (à vérifier) — la structure est-elle lisible en 5 s ? L'ancre est-elle bonne ? Trip Pass 5,99 € : génial ou cannibale ? Compare aux prix/positionnements de Hopper, Kayak+, TripIt Pro, Wonderplan, Layla, Mindtrip.
- **Funnel** : où sont les fuites probables ? (signup→onboarding completion, première recherche→résultat vu, résultat→save, save→retour J+7, free→paid). Les events Plausible posés couvrent-ils ces fuites ? Lesquels manquent ?
- **Confiance** : que manque-t-il pour qu'un inconnu sorte sa CB ? (légal, qui sommes-nous, garanties, avis vérifiables, sécurité paiement visible, support/contact).
- **Rétention** : qu'est-ce qui fait revenir à J+7 sans nouveau voyage prévu ? (alertes, digest, opportunités proactives — sont-elles visibles/désirables ?)
- **Boucle virale** : le tunnel invitation groupe est le canal d'acquisition gratuit n°1 — évalue chaque écran de ce tunnel comme une page de vente (l'invité voit quoi AVANT de créer un compte ?).
- **Positionnement** : en une phrase, contre qui Skusku gagne et pourquoi. Si tu n'arrives pas à l'écrire après l'audit, c'est le finding business n°1.

---

## Livrable : `AUDIT-UX-BUSINESS.md`

1. **Verdict en une page** : « Skusku est-il premium aujourd'hui ? » + les 5 chantiers qui changent tout.
2. **Scorecard /100 par dimension** (avec barème explicite) : Première impression · Tunnels & friction · Qualité reco (edge cases /15) · UI craft & cohérence · Motion & micro-interactions · Copywriting · Mobile · Confiance & légal · Pricing & conversion · Rétention/viralité. Barre Revolut = 85+ par dimension.
3. **Findings** par phase, format : sévérité · page/tunnel · constat (avec screenshot `audit-v3-screens/xx.png`) · pourquoi ça compte (impact business) · recommandation concrète.
4. **Top 20 quick wins** (impact fort / effort ≤ 1 jour) triés.
5. **Plan « premium en 3 sprints »** : sprint 1 = confiance & légal & quick wins, sprint 2 = polish des 3 tunnels cœur, sprint 3 = DA & motion. Chaque item avec effort S/M/L.
6. Les **réécritures copy avant/après** (Phase 5) en annexe, prêtes à copier-coller.

Commence par la Phase 0 (setup + seed), puis déroule dans l'ordre. N'écris le rapport qu'à la fin, quand tu as les preuves.
