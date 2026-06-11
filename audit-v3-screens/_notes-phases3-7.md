# Notes brutes — Audit V3, Phases 3 à 7 (session de reprise 2026-06-11)

> Complète `_notes.md` (Phases 1-2). Écrit au fil de l'eau, anti-crash.

## Phase 3 — Edge cases (re-run, résultats persistés)

- Harness : `backend/scripts/audit-v3-run.mjs` → `backend/scripts/audit-v3-results.ndjson` (1 ligne JSON par cas, écrite dès la fin du cas).
- Orchestration en 3 lots de ≤8 appels avec restart backend entre lots (strictLimiter = 10 req/15min/IP, store en mémoire). BETA_MODE=true pour bypasser les quotas plan. C'est ce limiteur qui a fait dérailler la session d'audit précédente.
- E1 (solo 150€ total, 5j) : 0 destination en 62s — voir NDJSON pour le message exact.
- **Run complet terminé : 19/19 appels OK** (E1-E13c + E14 + E15a/b). Résultats et verdicts par cas : section Phase 3 de AUDIT-UX-BUSINESS.md. Synthèse : 11/15 bien gérés ; pires cas = E5 (vend un vol à qui refuse l'avion), E10a (Tunis 1 nuit sans garde-fou), E1 (suggestions backend jamais affichées dans l'UI — vérifié en live, screens 93-94).
- ⚠️ Gotcha pour les prochains audits : `/api/travel/signal` exige `signalType: 'rejected'` (pas 'reject' → 400) — le E14 de la session précédente était un faux test.
- Latence : 1re destination médiane 71s sur harness à froid (min 54, max 123).

## Phase 4 — Compléments systématiques

### Contrastes mesurés (WCAG, calcul sur tokens tailwind.config.js)
| Paire | Ratio | Verdict |
|---|---|---|
| text-main #1a1612 / blanc | 17.99 | PASS |
| text-secondary #7a6c56 / blanc | 5.11 | PASS AA |
| text-secondary / sand-50 | 4.78 | PASS AA |
| **text-light #a89880 / blanc** | **2.81** | **FAIL — utilisé 78× dans les JSX** |
| text-light / sand-50 | 2.63 | FAIL |
| **text-muted #d4c8b3 / blanc** | **1.65** | **FAIL — 54×** |
| **gold-500 #c89b3c / gold-100 (bloc « Budget insuffisant » de Results)** | **2.17** | **FAIL — le message d'explication budget le plus important du produit est quasi illisible** |
| gold-500 / blanc | 2.56 | FAIL (36 usages text-gold-500) |
| ember-600 / blanc (CTA) | 5.7 | PASS |
| moss-500 / moss-100 (badges statut) | 3.27 | AA large seulement |

### Motion
- **Zéro framer-motion** dans tout le frontend. Motion = CSS keyframes : `sk-rise` (320ms entrée), `sk-pulse`, `sk-halo` (ping alerte), `sk-skel` (shimmer skeleton) dans tokens.css + tripDetail.css.
- **Aucun `prefers-reduced-motion` nulle part** (grep vide) — a11y manquante.
- Système d'easing : `--ease-out` custom dans tokens.css. Les animations existantes sont sobres et purposeful, mais il n'y a PAS de système de transition entre états/pages (pas de transitions de route, pas de stagger sur les listes, pas de micro-interactions hover au-delà des classes Tailwind hover:).

### Dérive design system (écrans « ancienne époque »)
- 4 composants encore sur la palette legacy blue/indigo (pré-redesign) : `StickyBookingProgress.jsx`, `FriendsManager.jsx` (onglet Participants du groupe), `IntelligentDatePicker.jsx`, `OptimalPeriodsWidget.jsx`.

### Performance (Lighthouse, mobile émulé)
- **PROD skusku.life** : Perf 66/100 · FCP 3,9s · **LCP 8,8s** (cible premium <2,5s) · TBT 80ms · CLS 0 (excellent) · TTI 8,8s. Poids total 1,2 MB.
- Cause LCP : hero = images Unsplash w=1200 (271+189+83 KB) chargées APRÈS hydratation React (client-side render), aucune balise preload, pas de srcset responsive, pas de LQIP. Clerk JS = 204 KB sur la landing anonyme.
- CLS 0 + TBT 80ms = très bons ; le problème est uniquement la chaîne de chargement de l'image hero.
- A11y Lighthouse 93/100 : échecs `color-contrast` (avatars témoignages, mineur — les vrais échecs de contraste sont sur les pages authentifiées, cf. tokens) et `heading-order` (h3 sans h2 parent sur la landing).
- (Dev local Vite : Perf 47, LCP 26s — non représentatif, mesure prod retenue.)

## Phase 5 — Copywriting (matière brute extraite du code)

### Voix
- Landing (`Landing.jsx` COPY) : VOUVOIEMENT (« Décrivez vos envies… vous n'avez plus qu'à dire oui »).
- Pricing (`Pricing.jsx`) : TUTOIEMENT (« Découvre ta prochaine destination », « Tu peux attendre le mois suivant… », FAQ entière en tu).
- Dashboard : tutoiement (« Ton prochain départ », « Tes habitudes, en pistes »).
- Wizard create-trip : vouvoiement (notes phase 2).
- → Mélange vous/tu structurel entre marketing et app, et même entre pages de l'app.

### Pricing copy (état réel du code)
- Plans : Free 0€ / Starter 3,99€/mois ou 29€/an (2,42€/mois) / Wanderer 6,99€/mois ou 49€/an (4,08€/mois) / Trip Pass 5,99€ · 7j.
- Tagline plans : « Découvre ta prochaine destination » / « Planifie tous tes voyages de l'année » / « Le voyage sans limites, à plusieurs ». Badge « Le plus choisi » sur Starter.
- **P0 confirmé encore présent** : pricing affiche Free = « 5 / mois » et Starter = « 40 / mois » (FEATURE_GROUPS Pricing.jsx) ; backend `stripeService.js` applique FREE=10, EXPLORER=50. FAQ répète « 5 recherches/mois ».
- Nom interne EXPLORER ≠ nom public Starter (stripeService.js name: 'Starter', plan: 'EXPLORER').

### Emails (emailService.js, sujets)
- `🌍 You're invited to join "${tripName}"!` — **EN** pour le 1er contact viral d'un produit FR.
- `🔔 Update for "${tripName}"` — EN.
- `⏰ Rappel: Réserve ton ${missingText} pour ${destination}!` — FR tutoiement.
- `🎉 C'est décidé! Direction ${winningDestination}!` — FR.
- `🔔 Prix en baisse: ${destination} à €${Math.round(currentPrice)} (-${percentDrop}%)` — FR mais format €123 (EN).
- → Mix FR/EN dans les sujets d'emails transactionnels ; l'email d'INVITATION (canal viral n°1) est en anglais.

### Messages d'erreur clés (code)
- Results timeout : « La recherche prend trop de temps. Réessayez dans un instant (le serveur démarre peut-être). » → fuite infra.
- Results vide : « Aucun résultat trouvé » + bloc budget détaillé SI budget < minEstimate (bon réflexe copy, mais rendu gold-on-gold 2.17:1 illisible + accuse les critères quand la cause est une panne API).
- Paywall widget : « Bientôt à court de recherches. Pensez à passer premium. » (vouvoiement) vs CTA « Passer premium » (jargon).

## Phase 7 — Business (matière extraite)

### Funnel analytics (lib/analytics.js — shim no-op tant que Plausible pas chargé)
- Events posés (8) : signup · search_started · results_viewed · trip_saved · checkout_started · checkout_completed · invitation_sent · invitation_accepted.
- **Manquants vs fuites du prompt** : onboarding_started/completed (fuite signup→onboarding), guest_invite_viewed (boucle virale, vu AVANT signup), price_alert_created, pdf_exported, vote_cast/finalized, search_failed/no_results (fuite cœur), upgrade_viewed (pricing vu), trip_pass_purchased distinct.
- Le shim est no-op si `window.plausible` absent — vérifier si le script Plausible est dans index.html (notes phase 1 disent « Plausible actif »).

### Plans backend vs affichage (cf P0 pricing ci-dessus)
- FREE: 10 recherches/mois, 2 group trips, 5 membres/trip. EXPLORER: 50/5/10. WANDERER/TRIP_PASS: illimité. Trip Pass durationDays: 7.
