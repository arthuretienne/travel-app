# AUDIT V4 — SCORECARD — Skusku (re-audit post-3-sprints)

> Re-audit réalisé le 2 juillet 2026, même méthode et même barème que le V3 (AUDIT-UX-BUSINESS.md, 10-11 juin) : sessions réelles en navigateur (1440 px + 390 px, 26 screenshots dans `audit-v4-screens/`), les 15 edge cases moteur rejoués sur l'API réelle (harness `backend/scripts/audit-v3-run.mjs`, résultats persistés dans `backend/scripts/audit-v4-results.ndjson`), Lighthouse prod + build local, contrastes recalculés (WCAG exact, pas les commentaires du code). Baseline V3 : **~52/100**.

## ⚠️ Le fait qui précède tout : la prod n'a rien reçu

**`main` est ahead de 39 commits sur `origin/main`.** Les 3 sprints (12/06, 01/07, 02/07) existent uniquement en local. Lighthouse sur skusku.life mesure l'ancien code (perf 63, a11y 93, LCP 8,9 s — identique au V3, mêmes échecs `color-contrast` et `heading-order`). **Tout ce scorecard décrit le code de `main` local ; tant que le push + déploiement Render/Vercel n'est pas fait, la prod reste à l'état V3 (52/100).** C'est l'action à plus fort levier de toute cette page.

## Verdict en un paragraphe

Le plan « 3 sprints » a tenu ses promesses principales : **les 8 humiliations de la première heure du V3 sont toutes mortes** (CTA muet, menu fantôme, Clerk EN, footer sans légal, PDF cassé, invité jeté sur la landing, quotas faux, bouton d'upgrade mort). La moyenne passe de ~52 à **~72/100**. Mais le re-test en conditions réelles révèle **un P0 nouveau introduit par les sprints** (la page trip confirmée relance le stream d'itinéraire en boucle — 463 requêtes mesurées — jusqu'à épuiser le rate limit de l'IP, et c'est le parcours *invité* qui le déclenche le plus sûrement), **deux P1 nouveaux** (l'étape 4 du wizard est sautée par le clic de l'étape 3 ; le plan de remboursement affiche « Tout est équilibré » sur des soldes non nuls depuis l'inclusion des guests) et **une régression moteur** (E14 : une destination rejetée réapparaît immédiatement). Aucune dimension n'atteint encore la barre 85 — mais quatre sont à ≤ 7 points.

## Scorecard /100 (barème V3 : P0 = −15 à −25 · P1 = −5 à −10 · P2 = −2 · plafonné par le pire parcours · barre Revolut = 85+)

| Dimension | V3 | **V4** | Δ | Ce qui a été vérifié corrigé (re-testé) | Ce qui reste |
|---|---|---|---|---|---|
| Première impression | 58 | **84** | +26 | Recherche hero anonyme → modal **sign-up FR** avec saisie conservée + copy contextuelle (02) · mega menu = 100 % routes réelles, zéro compteur fictif (data/megaMenu.js audité) · footer légal réel 4 liens (01, 04) · témoignages fictifs → réassurance factuelle · heading-order corrigé (Lighthouse a11y **100**) · LCP local 8,9 s → **4,4 s** (preload+srcset) | LCP 4,4 s > barre 2,5 s (images toujours sur unsplash.com, pas de self-host/LQIP) ; Clerk **305 KB** chargés pour un anonyme (pire que V3 : 204 KB) ; chips/footer « Lisbon, Barcelona, Rome » en EN ; badges « 96 % » pour anonyme toujours là ; bundle 419 → **520 KB** |
| Tunnels & friction | 55 | **57** | +2 | PDF **génère et télécharge** (7 pages, Porto-trip-plan.pdf) · itinéraire SavedTripDetail charge (fini « Création… » infini) · paywall : CTA **actif** « Continuer avec un Trip Pass (5,99 €) » dès l'étape 1 (CreateTrip.jsx:615) · invité accepté → **dans le trip** avec bandeau conversion (20, 21) · dashboard vide 1 CTA · Express recommandé | 🔴 **P0 nouveau : boucle SSE itinéraire** (voir findings) · 🔴 **P1 : étape 4 du wizard sautée** (reproduit 2× desktop+mobile) · P1 : contenu du PDF pas montrable (« 0 ACTIVITÉS », « ~0 BUDGET », ISO bruts, trous « Atterrissage à ___ », **DA teal pré-redesign**) · P1 : plan de remboursement cassé avec guests |
| Qualité reco (edge cases /15) | 66 (11/15) | **74 (12,5/15)** | +8 | **E5 « sans avion » : corrigé** — vol 0 €, Lyon/Marseille/Bruxelles/Londres/Amsterdam en 22 s + variant UI train/bus · **E1 : restitution réparée** — budget_warning **en FR** + suggestions backend affichées + **alternatives train chiffrées dans l'UI** (FlixBus 18 €, Thalys 1h22 — screens 23) · E15 IATA (Sofia 1 438 €, Tallinn 1 500 €) · E9 départ demain dates exactes · E13 diversité 8 villes/11 slots · E2 luxe réel (Bora Bora 10 738 €) | 🔴 **E14 RÉGRESSION** : Ljubljana rejetée (signal 200 ✓) **réapparaît** dans la relance · 🔴 E10a toujours sans garde-fou (Montréal 945 € pour **1 jour**) · E11 PMR toujours implicite · E2 intermittent (0 résultat au 1er run — hôtels vides sous charge parallèle, pas de retry) · latence première carte ~68 s médiane (cible < 15 s ratée ×4) · prix flottants bruts dans le contrat API (€2467.1936) |
| UI craft & cohérence | 62 | **80** | +18 | Contrastes recalculés : text-light **4,99:1** ✓, gold-500 **5,25:1** ✓, bloc budget en text-main sur gold-100 ✓ (était 2,17:1) · **0 classe blue/indigo restante** (les 4 composants legacy migrés, vérifié FriendsManager in situ — screen 10) · formats € unifiés fr-FR sur tous les écrans traversés (« 720 € / pers. », « 0,00 € », « 841 € ») · ISO bruts disparus de l'UI · attribution photo réparée (« Photo par Frank Wesneck ») | TripProposal.jsx oublié par la retokenisation (~8 labels porteurs de sens en sand-400 **2,81:1**) · moss-500 texte : 53 usages à 3,27-3,88:1 (sous AA, P2 V3 encore ouvert) · « Saturday, Sep 12 » en-tête de jour d'itinéraire · pays en EN (« Slovenia », « Italy », « Japan ») · PDF sur l'ancienne DA teal · CLS 0 → 0,065 |
| Motion & micro-interactions | 35 | **68** | +33 | Système `.sk-enter`/`--rise-delay` réel (tokens.css), stagger dashboard + results · skeleton cards shimmer pendant le streaming, arrivée progressive (17, 22) · **célébration de vote vérifiée live** (« C'est décidé — direction Barcelone ! », sobre, flip vote→confirmé sans reload — screen 15) · `prefers-reduced-motion` global (index.css:140) | Pas de transitions de page ; états pressed/feedback boutons limités au hover ; une seule célébration (post-upgrade non vérifié) ; la barre « Revolut anime chaque changement d'état » reste loin |
| Copywriting | 52 | **80** | +28 | **Vouvoiement partout vérifié** (landing, wizard, dashboard, pricing — zéro « tu » détecté sur /pricing) · contenu généré **100 % FR live** (cartes Bologna/Bastia, points forts, warnings, packing) · 6 sujets d'email FR (« {Prénom} vous invite : {trip} ✈️ ») · jargon dev purgé (plus de « cockpit »/« mock ») · « Dépenses du groupe » ✓ · nouveaux messages système FR (« Vote terminé — Barcelone l'emporte 🎉 ») | Fallback « Traveler » EN dans la nav (AppLayout.jsx:66) · pays EN sur toutes les cartes · markdown brut dans le feed « Ce qui avance » (« \*\*réservez la Tour de Belém\*\* ») · vieux messages système EN persistés en base (« Marion joined the trip ») · PDF : « Préparé pour Voyageur », phrases à trous |
| Mobile | 68 | **78** | +10 | **La chaîne P0 T9 est morte** : « couple, week-end rando, éco » → **3 résultats** (Bastia 666 €/2 pers., 3 jours) au lieu de zéro ; « week-end » parsé → **3 jours** ; bloc budget FR + alternatives train affichés (23) · tabs trip groupe mesurés **44 px** ✓ + fondu de débordement · skeletons OK à 390 px | Latence identique au desktop (~60-90 s) ; étape 4 sautée aussi sur mobile ; onglets toujours en scroll horizontal (mieux signalé) |
| Confiance & légal | 22 | **60** | +38 | 4 pages légales réelles et riches (mentions/CGV/confidentialité/contact), hébergeurs nommés (Vercel/Render/Neon), liées depuis les 2 footers (04) · liens `href="#"` morts : disparus · témoignages invérifiables supprimés · quotas affichés = quotas appliqués · Clerk localisé FR « pour continuer vers Skusku » | **Les placeholders `[RAISON SOCIALE]`/`[ADRESSE]`/`[EMAIL CONTACT]` sont visibles à l'écran** (16 occurrences) — tant qu'ils ne sont pas remplis, la conformité n'est pas effective et l'effet « cheap » demeure · nom d'app « Travel App » côté dashboard Clerk · rotation BOOKING_API_KEY · **prod = état V3 tant que non déployé** |
| Pricing & conversion | 60 | **78** | +18 | **La page dit vrai** : Free 5 / Starter 40 affichés = backend (stripeService.js re-lu : 5/40, alertes 0/3/∞) · ligne « Notifications push » : ✓ Wanderer uniquement (vérifié DOM) · paywall banner étape 1 + CTA Trip Pass actif · vouvoiement, formats FR, ancre annuelle « 2 mois offerts » | Checkout Stripe **jamais smoke-testé en prod** (runtime) · l'étape 4 sautée court-circuite le récap pré-soumission · célébration post-upgrade non vérifiée en live (nécessite un vrai checkout) |
| Rétention / viralité | 45 | **58** | +13 | **La boucle virale tient** : invitation → belle page FR (19) → accept guest → **« Bienvenue à bord ! » → dans le trip** avec badge « Mode invité · Claire » + CTA « Créer mon compte gratuit » (20, 21) · email FR avec prénom de l'invitant · guests dans le split des dépenses (Marion, soldes fr-FR — 12, 13) · **19 events analytics** : tous les manquants V3 posés (invite_landing_viewed, paywall_viewed, search_no_results, trip_pass_purchased…) | 🔴 **le P0 boucle SSE frappe précisément l'invité** sur trip confirmé (401 en boucle → l'IP se fait rate-limiter → l'app meurt pour lui) · nom du guest perdu dans Participants (« Membre ») et statut réservation (« Invité ») · vote REST guest toujours impossible (migration Prisma en attente — décision Arthur) · toujours rien sur la rétention J+7 (pas de session_return/cohortes, pas d'email J+3) |

**Moyenne V4 : ~72/100** (V3 : ~52). Aucune dimension à 85, mais Première impression (84), UI craft (80), Copywriting (80) sont à portée. Les deux gouffres V3 (Confiance 22, Motion 35) ont été comblés aux deux tiers.

## Findings encore ouverts, triés P0 → P3

### P0 — à corriger avant tout déploiement

1. **La page trip confirmée relance le stream d'itinéraire en boucle infinie — self-DDoS mesuré.** `TripDetail.jsx` (section ItinerarySection, effect deps `[trip.id, getToken]` à la ligne ~2293 et ~2441 ; même pattern `SavedTripDetail.jsx:252/317`) relance `GET /api/trips/:id/itinerary/stream` en continu, sans backoff ni cap : **463 requêtes servies** pour un seul trip pendant quelques minutes de session (backend log « Using cached itinerary » ×463). Trois variantes observées :
   - **Invité (chemin prod certain, testé sans persona dev)** : l'endpoint renvoie **401** aux guests (il n'accepte pas la guestSession) → boucle de retry immédiate (30+ erreurs en 10 s) → la fenêtre `apiLimiter` (500 req/15 min/IP) s'épuise → **toute l'app passe en 429 pour cet invité pendant 15 min**. C'est le moment décisif du canal viral qui s'auto-détruit — le V3 jetait l'invité sur la landing, le V4 le laisse entrer puis lui coupe l'app.
   - **Membre** : boucle en 200 (re-stream du cache en continu — reproduit sous persona dev ; à confirmer en session Clerk réelle, mais l'absence de backoff est indépendante de l'auth).
   - Dommage collatéral pendant l'audit : la boucle a mangé la fenêtre du rate limiter et invalidé un batch du harness (E13) — c'est exactement ce qui arrivera en prod aux vrais utilisateurs derrière une IP partagée.
   - Même classe de bug que le V3 #8 (OptimalPeriodsWidget, getToken dans les deps) — la leçon n'a pas été généralisée. Fix : retirer `getToken` des deps (ou le ref-stabiliser), cap de retry + backoff exponentiel, et ouvrir l'endpoint stream à `authenticateUserOrGuest`.

2. **La prod n'est pas déployée** (39 commits d'avance non poussés). Pas un bug, mais tant que ce n'est pas fait, tout ce qui précède est théorique pour un visiteur de skusku.life.

### P1

3. **L'étape 4 du wizard de recherche est inaccessible au clic** : au clic « Continuer » de l'étape 3, la recherche part immédiatement — reproduit 2× (desktop + mobile). Cause probable : dans `CreateTrip.jsx:~1180`, le même `<Button>` passe de `type="button"` (goNextStep) à `type="submit"` quand `currentStep` devient 4 pendant le dispatch du clic ; le navigateur applique alors l'action par défaut (submit) sur le bouton muté. Conséquences : l'utilisateur ne voit jamais dates/durée, le récapitulatif, ni le paywall d'étape 4 ; la recherche part avec les défauts (7 jours flexibles) et consomme un crédit de quota. Régression vs V3 (l'étape 4 s'affichait).
4. **Plan de remboursement cassé dès qu'un guest est dans le split** : soldes corrects (Tom +50,00 €, 5× −10,00 €) mais « Remboursements : 0 » et « Tout est équilibré 🎉 » même après reload (screens 13). Cause lue dans `backend/src/routes/expenses.js:173-199` : l'endpoint `/settlements` requête `userId: { not: null }` (exclut les guests) et recalcule les soldes avec un code distinct de `GET /expenses` (qui, lui, gère les clés `guest:<memberId>`). Régression introduite par le fix guest du Sprint 2 : la feature Tricount ment exactement là où elle doit rassurer.
5. **Le PDF génère mais n'est pas montrable** (critère V3 : « montrable à un ami ? ») : couverture « 0 ACTIVITÉS / ~0 BUDGET », « Préparé pour Voyageur », horaires en ISO brut (« 2026-07-10T08:35:00 »), montants sans € (« VOLS 142 »), phrases à trous (« Atterrissage à ___ depuis ___ »), pages de jour quasi vides — et **toute la charte est restée sur l'ancien teal** pré-redesign. Le P0 « cassé » est réglé ; la crédibilité du document reste à faire.
6. **E14 (apprentissage des rejets) a régressé** : signaux `rejected` acceptés (200) mais Ljubljana réapparaît en 4ᵉ position de la relance immédiate. Hypothèse : le moteur vectoriel (ANN) était down localement (`[Reco] ANN error: fetch failed`) et le fallback `discoverDestinations` n'applique pas l'exclusion des rejets — à vérifier avec le vector engine actif ; en l'état, le chemin de fallback (qui EST le chemin réel dès que Supabase tousse) ignore les signaux.
7. **Fiabilité moteur sous charge parallèle** : E2 (luxe 30 k€) a rendu **0 résultat** au premier run — les 5 recherches d'hôtels long-courrier ont renvoyé « No hotels found » simultanément (pattern 429 Booking connu), sans retry ni distinction d'erreur ; le re-run isolé a réussi (Bora Bora, Dubaï, Santorin). Un utilisateur sur un créneau chargé peut recevoir « 0 résultat » pour une recherche à 30 000 €.
8. **Latence** : première carte ~68 s médiane sur le harness (min 20 s pour le no-fly, max 96 s), ~complet en 90-150 s en UI. La cible < 15 s reste ratée ×4 — les skeletons rendent l'attente honnête, pas courte. (Env local sans Redis Upstash ni ANN — la prod avec cache chaud fera mieux, à re-mesurer déployé.)
9. **Perf landing** : LCP 4,4 s local (barre 2,5), Clerk 305 KB pour un anonyme (a empiré), bundle principal 419 → 520 KB. Le DoD Sprint 3 « Lighthouse perf ≥ 85 mobile » n'est pas atteint (76).

### P2

10. E10a : toujours aucun garde-fou sur « 1 jour » (Montréal 945 €, Tbilissi 697 € pour 24 h — pire que le Tunis du V3).
11. E11 PMR : accessibilité toujours implicite (grandes villes plates + chaînes modernes) — aucun filtre hôtel, aucune mention dans la réponse. Sur une contrainte de santé, l'implicite ne suffit toujours pas.
12. Pays en anglais partout où la donnée vient de Booking (« Italy », « Slovenia », « Japan ») — y compris chips et footer de la landing (« Lisbon, Barcelona »). Le mapping FR frontal reste à faire (connu, assumé Sprint 2).
13. Markdown brut dans le feed « Ce qui avance » (le chat rend le md léger, le feed non — screen 08).
14. « Saturday, Sep 12 » : l'en-tête de jour d'itinéraire affiche la date sans reformatage fr-FR (TripDetail, itinéraire caché).
15. Nom du guest perdu : « Membre / Email non disponible » dans Participants, « Invité » dans le statut réservation — alors que Dépenses affiche bien « Marion ». Avatar guest hors palette (bleu-violet).
16. TripProposal.jsx a échappé à la retokenisation AA (~8 labels en sand-400 2,81:1) ; moss-500 texte (53 usages, 3,27-3,88:1) toujours sous AA ; gold-500 sur gold-100 à 4,46:1 (limite, surtout icônes).
17. Fallback « Traveler » (AppLayout.jsx:66) — devrait être « Voyageur ».
18. Badges « 96 % de match » toujours servis aux anonymes sur la landing (P2 V3 non traité).
19. Rétention J+7 : toujours aucun event de retour (session_return, cohortes), pas d'email J+3. Les 19 events funnel posés couvrent l'acquisition, pas la rétention.
20. Socket chat : n'accepte ni les tokens dev (test impossible sous persona — env) — vérifier en session réelle que le chat @assistant fonctionne toujours post-sprints.

### P3

21. Vieux messages système EN persistés en base (« Marion joined the trip ») — les nouveaux sont FR ; prévoir une passe de migration ou l'affichage traduit.
22. Photo héro façon Maldives pour Lisbonne / Sagrada Família pour « Barcelone Central Hotel » (matching Pexels approximatif).
23. Warning React « key spread » (ChecklistRow) en console dev ; ValidationError IPv6 express-rate-limit au boot backend.
24. « 7 j · vol + hotel » sans accent circonflexe sur la landing ; « 450€ » sans espace dans PriceAlertsPreview ; OnboardingNew.jsx = dead code EN à supprimer.
25. Nombre de résultats instable entre recherches identiques (5/3/3 — déjà noté en V3).

## Ce qui bloque encore la barre 85, par dimension (liste courte)

| Dimension (V4) | Les 2-3 choses qui débloquent 85+ |
|---|---|
| Première impression (84) | Self-host des images hero (AVIF+LQIP, LCP < 2,5 s) · Clerk lazy pour anonymes · chips/footer en FR |
| Tunnels & friction (57) | **Fix boucle SSE (P0 #1)** · fix étape 4 (P1 #3) · PDF contenu + DA (P1 #5) · settlement guests (P1 #4) |
| Qualité reco (74) | E14 (exclusion des rejets dans le fallback) · garde-fou durée ≤ 2 j · retry hôtels sous 429 · première carte < 20 s (Redis prod + précache) |
| UI craft (80) | TripProposal retokenisé · variante moss AA · date de jour d'itinéraire en fr-FR · PDF aux couleurs sand/ember |
| Motion (68) | Transitions de page · états pressed/success sur les boutons cœur (voter, réserver, sauvegarder) · célébration post-upgrade |
| Copywriting (80) | Mapping pays FR · « Voyageur » fallback · markdown du feed · passe sur les données legacy |
| Mobile (78) | Les mêmes fixes tunnels (étape 4, boucle SSE) + latence |
| Confiance & légal (60) | **Remplir les placeholders** (1 h, Arthur) · renommer l'app Clerk · déployer · puis vraie preuve sociale |
| Pricing & conversion (78) | Smoke-test checkout prod (4242…) · récap étape 4 restauré · célébration post-achat vérifiée |
| Rétention/viralité (58) | **Fix boucle SSE côté guest** (ouvre l'endpoint aux guestSessions) · vote REST guest (décision migration) · 1 mécanisme J+3/J+7 mesuré |

## Config runtime connue — à ne pas re-découvrir (inchangé, hors périmètre code)

1. Remplir les placeholders légaux `[RAISON SOCIALE]` / `[ADRESSE]` / `[EMAIL CONTACT]` (16 occurrences, `frontend/src/pages/legal/`).
2. Renommer l'app Clerk « Travel App » → « Skusku » dans le dashboard Clerk (la localisation FR est faite côté code).
3. Smoke-test checkout Stripe **en prod** (4242…) + webhook → plan visible dans /account.
4. Rotation BOOKING_API_KEY (exposée dans l'historique git — dette V2).
5. Vote REST des guests : bloqué par le schéma (`Vote.voterId` FK User) — migration Prisma en attente de décision Arthur.
6. **Nouveau, même famille : push + déploiement des 39 commits** (Render/Vercel), puis re-mesurer Lighthouse prod.

## Annexe — détail du rejeu des 15 edge cases (vs V3)

> 19 appels + 4 re-runs, NDJSON : `backend/scripts/audit-v4-results.ndjson`. Env local : Upstash Redis down (zéro cache) et vector engine down (fallback discoverDestinations) — latences = pire cas.

| # | Cas | V3 | V4 | Observé |
|---|---|---|---|---|
| E1 | Solo 150 € / 5 j | ⚠️ moteur honnête, restitution ratée | **✅** | budget_warning **FR** (« Les vols dépassent votre budget de 150 €… ») + suggestions restituées en UI + alternatives train chiffrées (vérifié via le flux T9) ; gardes actives (vol ≤ 75 % budget, plancher hôtel 30 €/nuit) |
| E2 | Couple 30 000 € / 4 j | ✅ | **✅ fragile** | Run 1 : 0 résultat (hôtels « No hotels found » ×5 sous charge parallèle, sans retry) ; run 2 : Bora Bora 10 738 €, Denpasar 3 408 €, Dubaï 2 874 €, Santorin 1 712 € en 83 s |
| E3 | Famille 5 pax | ✅ | ✅ | Barcelone 2 467 €, Rome, La Valette, Amsterdam — ×5 cohérents, vrais hôtels |
| E4 | 8 amis serré | ✅ | ✅ | Bratislava/Cracovie/Thessalonique/Valence, 278-324 €/pers |
| E5 | « SURTOUT pas d'avion » | 🔴 pire réponse V3 | **✅✅** | vol **0 €** partout, villes terrestres (Lyon 358 €, Londres 212 €…), 22 s, variant UI Train/Bus |
| E6 | Contradictoire plage/ville | ⚠️ | ⚠️ | Palerme/Algarve/Split/Dubrovnik — bons compromis, arbitrage toujours pas expliqué |
| E7 | Anglais | ✅ | ✅ | Dubrovnik, La Valette, Cagliari, Tenerife |
| E8 | Cold start | ✅ | ✅ | Marrakech, Sofia, Sarajevo, Bucarest, Tbilissi |
| E9 | Départ demain | ✅ | ✅ | 5 dest, dates 03→08/07 exactes, 783-959 € |
| E10a | 1 jour | 🔴 | **🔴** | Prague 280 €… et **Montréal 945 €, Tbilissi 697 € pour 24 h** — toujours aucun garde-fou |
| E10b | 30 jours | ✅ | ✅ | Sarajevo 1 524 €, Belgrade 1 563 €… dans le budget 3 000 € |
| E11 | Fauteuil roulant | ⚠️ | ⚠️ | Défauts intelligents (Berlin, Barcelone, Motel One…) mais **rien d'explicite** sur l'accessibilité |
| E12 | Végétarienne gastro | ✅ | ✅ | Palerme, Tel Aviv, Valence |
| E13 | 3 recherches identiques | ✅ | ✅ | 8 villes uniques / 11 slots (nombre instable 5/3/3) |
| E14 | Rejets puis relance | ✅ | **🔴 régression** | Signaux 200 ✓ mais **Ljubljana réapparaît** (fallback sans exclusion ?) |
| E15 | Lyon→Sofia / BRU→Tallinn | ✅ | ✅ | Sofia 1 438 €, Tallinn 1 500 €, 38-39 s |

**Taux V4 : 12,5/15 bien gérés** (V3 : 11/15). Les 2 pires réponses restantes : E10a (Montréal pour 1 jour, sans un mot) et E14 (le produit dit « bien noté » puis re-propose la destination rejetée).

## Les 3 sprints, jugés sur pièces (résumé)

- **Sprint 1 « plus rien ne ment »** : tenu à ~95 %. Menu, légal, quotas, Clerk FR, emails, formats, erreurs honnêtes, hero anonyme — tout vérifié en vrai. Restes : chips EN, badges %, placeholders (assumés).
- **Sprint 2 « le produit tient sa promesse »** : tenu sur le moteur (T9 ✓, E5 ✓, E1 ✓, skeletons ✓, tokens AA ✓, 44 px ✓, guest split ✓) — mais a introduit les 3 régressions les plus chères du V4 (boucle SSE, settlement guests, étape 4) et E14.
- **Sprint 3 « ça respire le premium »** : motion + a11y + legacy tenus et vérifiés (célébration, dialog, reduced-motion, 0 blue/indigo, a11y 100). Perf ≥ 85 : non atteint (76) — la partie images self-hosted/Clerk lazy n'a pas été faite.

**Prochaine séquence recommandée (avant tout re-audit V5)** : ① fix boucle SSE + étape 4 + settlement guests (1-2 j), ② push + déploiement + config runtime Arthur (placeholders, Clerk, Stripe smoke-test), ③ re-mesurer Lighthouse prod et E14 avec le vector engine actif. Ces trois blocs valent ~10 points de moyenne à eux seuls.

---

## ADDENDUM — Sprint correctif du 2 juillet (soir) : état après fixes

Les corrections ci-dessous ont été livrées et **vérifiées en re-test réel** dans la foulée du re-audit (7 commits, `6a594ed` → `98b77c6`) :

| Finding | Statut | Preuve de vérification |
|---|---|---|
| P0 #1 boucle SSE itinéraire | **✅ corrigé** | Cause : `useTripAuthToken` non mémoïsé + carrousel de phrases re-rendant toutes les 2 s → re-stream continu. Fix : `useCallback` + retry borné/backoff (jamais sur 401/403) + endpoints lecture ouverts aux guests. Re-testé en session invitée réelle : **1 requête stream en 25 s** (vs ~200), 0 erreur console, l'invité voit désormais l'itinéraire/météo/packing |
| P1 #3 étape 4 sautée | **✅ corrigé** | `key` distinctes sur les boutons Continuer/Lancer (le nœud DOM mutait de type pendant le clic). Re-testé : « Quand partir ? » s'affiche après l'étape 3 |
| P1 #4 settlement guests | **✅ corrigé** | `/settlements` réutilise `getParticipants()` (l'ancien code indexait par TripMember.id ET excluait les guests). Re-testé : 5 transferts dont « Marion → Tom : 10 € » |
| P1 #5 PDF | **✅ corrigé** | Normaliseurs pour les 2 générations de données, formats fr-FR, palette sand/ember. Re-généré : « 4 JOURS · 11 ACTIVITÉS · 486 € », « ven. 10 juil. · 08h35 », journées complètes |
| P1 #6 E14 rejets | **✅ corrigé côté code / ⚠️ infra** | Fallback lit désormais `rejected_destinations` (prompt + post-filtre) et `captureSignal` ne répond plus 200 quand rien n'est écrit. MAIS : **`wcnmsocuwrjtagibbmwd.supabase.co` ne résout plus en DNS** — le projet Supabase semble mort. Signaux et moteur vectoriel sont down partout où cette URL est utilisée. **→ à vérifier sur Render (nouveau point de config runtime #7)** |
| P2 #10 E10a 1 jour | **✅ corrigé** | Vol borné à 3 h 30 pour ≤ 2 jours. Re-testé : Cracovie/Bologne/Dublin/Copenhague/Séville (fini Montréal pour 24 h) |
| P2 #12 pays/villes EN | **✅ corrigé** | `utils/i18nNames.js` appliqué (Results, dashboard, TripDetail, landing, alternatives train) |
| P2 #13 markdown feed | **✅ corrigé** | Extraits strippés — vérifié, plus de `**` visibles |
| P2 #14 « Saturday, Sep 12 » | **✅ corrigé** | 3 `toLocaleDateString('en-US')` → fr-FR + bloc d'arrivée EN hardcodé traduit (navette 8 € fictive supprimée) |
| P2 #15 nom du guest | **✅ corrigé** | « Marion » affichée dans Participants + « Invité sans compte » |
| P2 #16 contrastes résiduels | **✅ corrigé** | `moss-700` #55703a (5,58:1) pour les 53 usages texte, TripProposal retokenisé |
| P2 #17 « Traveler » | **✅ corrigé** | → « Voyageur » |
| P2 #18 badges 96 % anonymes | **✅ corrigé** | → badges factuels (« Vol direct », « Petit budget », « Week-end idéal ») |
| Non-régression | ✅ | `npm run test:reco --limit 3` : 3/3 PASS · build Vite OK |

**Scores estimés post-fixes** (mêmes barèmes, re-test partiel — un re-audit V5 complet reste à faire) : Tunnels 57→**~78** · Reco 74→**~80** · Rétention/viralité 58→**~74** · UI craft 80→**~84** · Copywriting 80→**~85** · Mobile 78→**~82** · Première impression 84→**~85**. **Moyenne estimée ~77-78/100.**

**Ce qui sépare encore de 90 (par ordre de levier) :**
1. **Actions runtime Arthur** (~+6 pts) : placeholders légaux, app Clerk, smoke-test Stripe prod, **vérifier l'URL Supabase sur Render (projet DNS-mort)**, rotation clé, push + deploy des 46 commits.
2. **Perf** (~+3 pts) : images hero self-hosted (LCP 4,4 s → <2,5 s), Clerk lazy anonymes, bundle.
3. **Fiabilité moteur** (~+2 pts) : retry/backoff sur les recherches hôtels Booking (E2 intermittent), latence première carte.
4. **Motion residuel** (~+2 pts) : transitions de page, états pressed, célébration post-upgrade.
5. **Rétention** (~+2 pts) : mécanisme J+3/J+7 mesuré, events session_return.

### Itération 2 (02/07, nuit) — perf & fiabilité

- **Images hero self-hostées** (`/hero/*-{480,800,1200}.jpg`, srcset local, preload aligné, `sizes` sur les cartes vitrines). Vérifié : plus aucune requête unsplash sur la landing, variantes responsive servies. Mesure locale stabilisée (3 runs) : perf 70, FCP 3,8 s, LCP 5,6 s — **le LCP restant est l'hydratation React, pas les images** (elles chargent en <10 ms). Passer sous 2,5 s exige du prerender/SSR de la landing : décision d'architecture à trancher (Arthur), pas un fix.
- **Fiabilité E2 réglée** : RapidAPI throttle en HTTP 200 + `status:false`, invisible pour le retry HTTP. `bookingGet` accepte un `softFailCheck` (vols A/R + hôtels). Vérifié : E2 rend 5/5 (Mahé 9 598 €, Malé, Dubaï, Ibiza, Santorin) — plus de « 0 résultat » à 30 000 €.
- **Motion** : feedback pressed systémique (`active:scale-[0.97]`) sur les 5 variants de Button. Célébration post-upgrade : existait déjà (messages par plan, Sprint 1) — vérifiée code, smoke-test prod restant.
- TripProposal : la garde d'état vide existait déjà (redirect + null).

**Verdict du loop « objectif 90 » : le périmètre code est épuisé à ~80/100 estimé.** Les ~10 points restants sont : ① les actions runtime restantes (légal, Clerk, Stripe prod, Supabase, rotation clé), ② deux décisions d'architecture (prerender/SSR landing pour le LCP ; migration Prisma vote guest), ③ un re-audit V5 complet post-déploiement pour re-scorer sur la prod réelle.

### Déploiement du 2 juillet (nuit) — la prod rejoint le code

Les **51 commits** ont été poussés (`3ae6a32..6652b98`) : Vercel a déployé en ~1 min (hero self-hosted vérifié en ligne), Render répond 200 (bascule auto du nouveau build). **Lighthouse sur skusku.life POST-déploiement (3 runs, mobile émulé) :**

| Métrique | Prod V3/V4 (avant) | **Prod déployée** |
|---|---|---|
| Accessibilité | 93 | **100** |
| Performance | 63 | **68-71** |
| LCP | 8,9 s | **5,0-5,4 s** (−43 %) |
| FCP | 4,1 s | 3,9-4,3 s |
| CLS | 0 | 0,065-0,069 |

Le LCP restant est l'hydratation React (les images chargent en millisecondes) — même plancher qu'en local. Pour passer sous 2,5 s : prerender/SSR de la landing (décision d'archi). Points de vigilance post-déploiement : si la prod Render pointe le même projet Supabase mort, `/api/travel/signal` répondra désormais **500 honnête** (avant : 200 mensonger) — c'est voulu, mais le bouton « rejeter » affichera une erreur tant que l'URL Supabase n'est pas corrigée ; et les placeholders `[RAISON SOCIALE]` sont visibles publiquement tant qu'ils ne sont pas remplis.
