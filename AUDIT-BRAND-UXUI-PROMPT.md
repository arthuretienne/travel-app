# PROMPT — Audit Branding · UX/UI · Motion · CRO (V5-Brand) — Skusku

## Rôle & posture

Tu es à la fois **brand designer senior** (le profil qui a construit l'identité de Linear, Arc ou Amie), **product designer craft-obsessed**, **motion designer** et **CRO strategist**. Tu audites Skusku (skusku.life), un planificateur de voyage IA français dont la fiabilité vient d'être durcie (audits V3+V4 faits — ne refais NI l'audit technique, NI l'audit bugs/parcours : lis `AUDIT-V4-SCORECARD.md` pour l'état exact, ~80/100, prod déployée et à jour).

**Ta mission est différente des audits précédents : le fond marche, maintenant il faut que la forme soit indiscutablement professionnelle, distinctive et vendeuse.** Trois questions guident tout :

1. **Est-ce que ça ressemble à un produit qu'UNE équipe avec UNE vision a construit** — ou à un assemblage générique « AI slop » qu'on pourrait confondre avec 10 000 autres SaaS Tailwind ?
2. **Est-ce qu'un visiteur comprend, page par page, ce que fait le produit et ce qu'il y gagne** — sans effort, sans relire ?
3. **Est-ce que chaque page fait son travail de conversion** — amener à l'étape suivante avec le moins de friction et le plus de désir possible ?

La barre : Linear (système et rigueur), Arc/Amie (personnalité et motion), Airbnb (désir + confiance), Mercury (editorial-fintech). Un utilisateur qui connaît ces produits doit ouvrir Skusku et penser « même ligue », pas « template propre ».

## Règles dures

- **Tu testes en vrai, tu regardes en vrai.** Chaque jugement s'appuie sur une session navigateur avec screenshot (dossier `audit-brand-screens/`). Le code ne sert qu'à expliquer ce que tu observes et à chiffrer les recommandations.
- **Prod d'abord** : skusku.life est à jour — audite le rendu réel (vraie typo chargée, vraies images, vraie latence). Bascule en local (setup ci-dessous) uniquement pour les tunnels authentifiés (dashboard, wizard, trips, groupe).
- **Sépare générique / distinctif / cassé.** Pour chaque page : qu'est-ce qui pourrait être n'importe quel SaaS (à retravailler), qu'est-ce qui est déjà « signature Skusku » (à amplifier), qu'est-ce qui trahit (à corriger).
- **Sois prescriptif, pas seulement critique.** Chaque finding majeur vient avec une direction concrète : référence visuelle précise (produit + écran), spec courte (spacing/typo/motion/copy), et effort (S/M/L). La session suivante doit pouvoir implémenter sans te redemander.
- **Tu ne corriges rien.** Livrables écrits + screenshots uniquement.
- Sévérités : **P0** = tue la crédibilité ou la conversion · **P1** = fait générique/cheap · **P2** = polish · **P3** = détail.

## Ce qui existe déjà (ne le redécouvre pas, jauge si c'est ASSEZ)

- **DA « warm minimalism »** : palette sand/ember/moss/gold (`frontend/tailwind.config.js`), Fraunces (display) + DM Sans (texte) + JetBrains Mono (data). Validée V3 comme « vraie direction » — la question V5 est : est-elle poussée assez loin pour être SIGNATURE, ou reste-t-elle un joli thème ?
- **Motion système** : `.sk-enter`/stagger (`frontend/src/styles/tokens.css` + `index.css`), skeletons shimmer, célébration de vote, pressed states sur Button, `prefers-reduced-motion` global. La question : est-ce un SYSTÈME avec une intention (courbes, durées, hiérarchie du mouvement) ou une collection de fondus ?
- **Voix** : vouvoiement partout (décision de marque), FR intégral, hero « Le voyage qui vous ressemble, déjà pensé. » La question : y a-t-il une VOIX reconnaissable (lexique, rythme, humour ?) ou juste du français correct ?
- **Contraintes de marque** (CLAUDE.md section Design System) : une seule couleur signature, calme, pas de gradients décoratifs, une action primaire par écran. Challenge-les si tu penses qu'elles brident la distinctivité — mais argumente.
- Points connus à NE PAS re-signaler : placeholders légaux `[RAISON SOCIALE]` (config en cours), app Clerk nommée « Travel App » (dashboard Clerk), LCP ~5 s (plancher hydratation SPA — la reco prerender/SSR est déjà actée), projet Supabase mort (infra), latence moteur ~60-90 s (connue).

## Setup local (pour les pages authentifiées)

1. `cd backend && DEV_MODE=true BETA_MODE=true BOOKING_API_KEY="$RAPIDAPI_KEY" npm start` (la clé est sous `RAPIDAPI_KEY` dans le `.env` racine) + `cd frontend && npm run dev`.
2. Persona : sur localhost:5173, `localStorage.setItem('devUser', JSON.stringify({id:'cmq8egt1b0001vqjyxb7izt4p', firstName:'Tom', lastName:'Bernard'}))` (Tom) ou id `cmq8egszv0000vqjyu7jk1p52` (Léa, créatrice des trips seedés). IDs via `GET /api/dev/personas`.
3. Pièges hérités : `/api/travel/recommendations*` est derrière un rate limiter 10 req/15 min/IP (restart backend = reset) ; le chat socket n'accepte pas les tokens dev (ne pas conclure « chat cassé ») ; les 2 trips seedés (« Lisbonne entre amis », « City-break surprise ») sont déjà CONFIRMÉS ; une dépense test « Tapas du soir » et une invitée « Claire » existent en base. Pour une invitation guest fraîche : `POST /api/trips/:id/invitations` avec `Authorization: Bearer dev:<id>`.
4. Vues : audite **1440 px ET 390 px** pour chaque page.

## Les 9 pages qui comptent (dans l'ordre du funnel)

Pour CHAQUE page, déroule les 6 angles ci-dessous, puis donne un verdict scoré.

1. **Landing** (skusku.life, anonyme) — inclut nav, hero, recherche, sections, footer.
2. **Onboarding** (choix Express/Complet + le flow Express entier).
3. **Dashboard** (état rempli via persona ; l'état vide a été revu en V4, vérifie qu'il tient la nouvelle barre).
4. **Create-trip** (wizard 4 étapes — la meilleure UX de formulaire du produit selon V3 : est-elle à la hauteur de la nouvelle barre ?).
5. **Results** (skeletons, arrivée progressive, cartes — LE moment de vérité produit : 60-90 s d'attente à transformer en anticipation).
6. **SavedTripDetail** (« la plus belle page du produit » en V3 — toujours vrai ?).
7. **TripDetail groupe** (vote + confirmé : le différenciateur n°1, avec la célébration).
8. **Pricing** (+ le paywall in-app : SearchUsageWidget/PaywallBanner).
9. **Accept-invitation** (la « page de vente » du canal viral — un invité doit avoir envie du produit avant même d'entrer).

## Les 6 angles d'analyse (à dérouler page par page)

### A. Test de compréhension (5 s puis 30 s)
Arrive à froid. En 5 s : que fait cette page, que dois-je faire ? En 30 s : qu'est-ce que le produit m'apporte que Google Flights + ChatGPT n'apportent pas ? Note ce que la page DIT vs ce qu'elle devrait dire. Le bénéfice est-il montré (preuve, exemple concret, vrai contenu) ou affirmé (adjectifs) ?

### B. Cohérence de marque
Tokens, typo, radius, ombres, iconographie, photos : tout vient-il du même monde ? Traque les dérives (composants qui n'utilisent pas les tokens, tailles de typo orphelines, 3 styles d'icônes, photos qui jurent entre elles). La hiérarchie Fraunces/DM Sans/Mono est-elle exploitée ou décorative ? Y a-t-il des éléments de marque au-delà de la palette (formes, textures, illustration, mascotte, grille) ?

### C. Motion & vie
Inventaire de ce qui bouge sur la page, et JUGEMENT : chaque mouvement guide-t-il (entrée, hiérarchie, feedback, récompense) ou meuble-t-il ? Qu'est-ce qui devrait bouger et ne bouge pas (transitions d'état, hover riches, nombres qui comptent, progression) ? Les durées/courbes sont-elles cohérentes entre pages ? Propose la « signature motion » Skusku : 2-3 principes + 1 interaction mémorable par moment clé (résultats qui arrivent, vote qui se clôt, prix qui baisse).

### D. CRO
Objectif unique de la page → chemin vers l'objectif : combien de distractions, d'actions concurrentes ? CTA : verbe, valeur, contraste, position. Objections traitées au bon endroit (prix, confiance, effort) ? Preuve au bon moment ? Friction inutile (champs, clics, textes) ? Pour la landing et pricing : propose des variantes A/B concrètes (headline, CTA, ordre des sections). Vérifie que les events analytics existants (`lib/analytics.js`, 19 events) couvrent tes recommandations — signale les manquants.

### E. Détecteur d'AI slop
Chasse le générique : hero centré + 3 cards + grille de features interchangeables ; copy qui pourrait vendre n'importe quoi (« simplifiez », « en toute sérénité ») ; icônes Lucide brutes sans traitement ; photos banque d'images sans direction ; emoji en guise de personnalité ; sections « social proof » vides de preuve. Pour chaque slop détecté : la version « seul Skusku peut dire/montrer ça » (utiliser les VRAIES données du produit : vrais prix, vraies villes, vrai vote de groupe, vrai itinéraire).

### F. Craft du détail
Zoom sur 5 détails de la page (alignements, espacements optiques, états hover/focus, gestion des débordements, tabular figures sur les prix, orphelins typographiques, qualité des coins/ombres). C'est là que « propre » devient « premium ».

## Livrables

### 1. `AUDIT-BRAND-UXUI.md`
- **Verdict en une page** : le produit a-t-il une identité ou un thème ? Les 3 chantiers qui changent la perception.
- **Scorecard par page** : Brand / Motion / CRO / Clarté produit / Craft, chacun /10, avec le pire angle qui plafonne. Barre = 8/10 partout.
- **Findings page par page** (sévérité · constat + screenshot · pourquoi ça coûte · prescription avec référence visuelle + effort S/M/L).
- **Top 15 fixes CRO** triés impact/effort, avec les events à poser pour mesurer.
- **Réécritures copy** : les 10 textes qui vendent le plus (hero, sous-titres de sections, CTA, 3 moments paywall, page invitation) en avant/après.

### 2. `BRAND-DIRECTION.md` — le delta de marque
Ce document doit permettre d'implémenter sans toi :
- **Positionnement visuel** en une phrase + moodboard textuel (5 références précises : produit + écran + ce qu'on leur prend).
- **3 signatures Skusku** : des éléments visuels/interactifs qu'AUCUN template ne donne (ex. : la façon dont un voyage « se compose » à l'écran, un motif graphique récurrent, un traitement photo, une interaction de vote). Spec courte de chacune.
- **Système motion** : durées, courbes, hiérarchie (entrée < transition < célébration), et les 5 moments à animer en priorité avec description précise du mouvement.
- **Guide de voix** : 5 principes + lexique à soi + 3 exemples avant/après.
- **Plan d'exécution en 2 sprints** (S/M/L par item) : sprint « identité » (ce qui rend distinctif) puis sprint « conversion » (ce qui fait signer).

Commence par la prod (landing anonyme, mobile puis desktop), déroule le funnel dans l'ordre, et n'écris les livrables qu'à la fin, preuves en main.
