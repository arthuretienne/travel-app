# Skusku — Brief de refonte UI/branding (à donner à Claude design)

> Copie-colle ce document entier dans Claude, et joins les 6 screenshots
> listés en bas. Demande-lui une refonte écran par écran avec un design
> system complet.

---

## 1. Le produit en une phrase

**Skusku est un planificateur de voyage par IA** : l'utilisateur décrit ses
envies (budget, style, activités, dates flexibles), l'IA recommande des
destinations personnalisées, puis assemble un package complet — vols réels +
hôtels réels + itinéraire jour-par-jour personnalisé. Stack : React + Vite +
Tailwind CSS. Site live : skusku.life.

## 2. Le job émotionnel du produit

Skusku doit faire **deux choses opposées en même temps** :
1. **Faire rêver** — c'est du voyage, l'utilisateur doit avoir envie de partir
2. **Réduire la charge mentale** — planifier un voyage est stressant ; Skusku
   doit donner un sentiment de clarté, de "tout est géré pour moi"

Aujourd'hui le produit fait surtout (2) mais rate (1). On veut les deux.

## 3. L'audience

- Voyageurs français/européens, 25-45 ans, urbains
- Cherchent du voyage **abordable mais beau** (pas du luxe, pas du backpacker
  crado — le "bon plan stylé")
- Solo, couples, amis, familles, voyages business courts
- Habitués des SaaS modernes (Airbnb, Booking, Linear, Notion) → leurs
  standards visuels sont élevés

## 4. Design system actuel (ce qui doit RESTER)

Le produit a déjà une direction définie qu'on veut **garder et magnifier**,
pas jeter :

- **Couleur signature unique** : teal / vert-bleu (`#0D9488` teal-600,
  hover `#0F766E`, light `#F0FDFA`). UNE couleur signature, neutres dominants.
- **Philosophie** : premium fonctionnel, calme, minimalisme chaleureux, pas
  de bruit visuel, decision-focused (pas inspiration-magazine bordélique)
- **Une action primaire par écran**, secondaires visuellement discrètes
- **Cards** comme élément structurel principal, coins arrondis subtils,
  ombres douces (pas d'outlines lourds)
- **Statuts** : vert doux positif, gris neutre, jamais de rouge agressif
- **Ton microcopy** : chaleureux mais structuré, pas pushy, max 1 emoji
- Police actuelle : DM Sans (body) + Fraunces (display serif)

→ On ne veut PAS un pivot radical de couleur ou de philosophie. On veut la
**même intention, exécutée à un niveau pro**, avec une vraie identité de
marque et l'émotion du voyage en plus.

## 5. Les problèmes identifiés (audit live 2026-05-15)

### 🔴 Bloquants crédibilité
1. **Mix de langues FR/EN partout** : titre landing EN, boutons FR, contenu
   parfois EN ("Weekend in Rome", "Your Personalized Travel Plan", "Perfect
   weather and low flight prices") dans une UI sinon FR. Donne un sentiment
   d'amateurisme immédiat. → cohérence stricte FR (ou EN) selon la locale.
2. **Images destination incohérentes** : la page Lisbonne (ville côtière
   méditerranéenne) affiche un hero de **montagnes enneigées**. Casse toute
   confiance. (Bug technique aussi, mais le design doit prévoir un système
   d'image fiable + fallback élégant.)
3. **États vides / skeleton perpétuels** sur le dashboard (4 stat cards, liste
   de voyages) qui restent gris. Besoin de vrais empty states designés.

### 🟠 Branding générique
4. **Landing = template SaaS IA interchangeable** : sections "How it works"
   avec gros chiffres gris, "Everything you need", testimonials avec avatars
   génériques, trust signals cramped ("150+/rating/Gratuit"). Zéro
   personnalité Skusku, zéro émotion voyage.
5. **Pas d'imagerie voyage forte** : un planificateur de voyage premium sans
   photographie de destination inspirante en grand, c'est un contre-sens.
6. **Pas de système de marque** : pas d'iconographie cohérente, pas de
   moments signature, le logo est un avion générique.

### 🟡 Friction UX
7. **2 CTAs en compétition** sur landing et dashboard (viole le propre design
   system "une action primaire par écran").
8. **CreateTrip = mur de champs** sur une page unique → ressenti "formulaire
   administratif" au lieu de "je planifie mon rêve". Devrait être un flow
   guidé/progressif.
9. **SavedTripDetail header surchargé** : 4 boutons (Inviter amis / Alerte
   prix / Export PDF / Supprimer) sans hiérarchie.
10. **Vols affichés en format technique brut** (`22:15 → 20:55`, codes IATA)
    illisibles pour un voyageur lambda.
11. **Dashboard** : header blanc géant pour 2 lignes de texte ; le meilleur
    asset (widget "Vos prochaines escapades" = calendrier + reco) est noyé
    au lieu d'être mis en scène.

### 🔴 Voyages de groupe (le différenciateur produit, le plus mal servi)

Skusku permet de planifier un voyage **collaboratif** : inviter des amis,
voter sur les destinations, suivre qui a réservé quoi, partager les dépenses
(Tricount-style), chat de groupe. **C'est LA fonctionnalité qui différencie
Skusku** d'un simple comparateur — et c'est l'écran le moins bien designé.

12. **Empilement de ~10 cards verticales de poids visuel identique**, sans
    hiérarchie ni rythme : reco vol, reco hôtel, suivi groupe, réservations,
    météo, bagages, itinéraire… tout a la même importance visuelle, donc
    rien ne ressort. C'est le pattern "tout est une card".
13. **La valeur collaborative est noyée au milieu du scroll** : le "Suivi du
    groupe" (membres + statut "En attente" + "Rappeler les amis") arrive
    après les recos vol/hôtel, alors que c'est le cœur de l'expérience de
    groupe. Devrait être central, pas enterré.
14. **Double système de navigation confus** : un lifecycle stepper en haut
    (Propositions → Vote → Destination → Réservation) ET une sous-nav sticky
    (Vol / Hôtel / Activités + compteur 0/3). Deux barres de progression
    différentes, l'utilisateur ne sait pas laquelle suivre.
15. **Le moment social = quasi invisible** : voter, inviter, relancer un ami
    qui n'a pas réservé — ces actions à fort enjeu émotionnel/social sont
    rendues comme des lignes de liste grises avec un petit badge orange. Zéro
    mise en scène de la dynamique de groupe.
16. **Mix EN/FR encore présent** ("Arrival and Exploration", "Wednesday Feb
    18") dans l'itinéraire du voyage de groupe.

**Ce qu'on veut pour les voyages de groupe** : faire de la coordination de
groupe un moment **plaisant et clair**, pas une todo-list administrative.
Hiérarchiser : (a) où en est le groupe (consensus visible, qui manque), (b)
la décision en cours (voter/valider), (c) le récap voyage. Mettre en scène
les avatars/membres, rendre le "rappeler un ami" engageant et non culpabili-
sant, montrer la progression collective de façon motivante. Le design system
du produit le demande explicitement : "Group Compatibility Summary — make
consensus visible, reduce emotional friction, highlight what works first".

## 6. Ce qu'on attend de la refonte

Pour chacun des écrans (priorité décroissante) :

1. **Landing** — créer une vraie première impression : hero émotionnel avec
   imagerie voyage premium, proposition de valeur claire en une CTA unique,
   preuves de confiance crédibles, sections qui racontent Skusku (pas un
   template). Doit donner envie de partir ET rassurer "tout est géré".
2. **Voyage de groupe (TripDetail collaboratif)** — LE différenciateur, à
   re-architecturer entièrement : hiérarchie claire (état du groupe → décision
   en cours → récap voyage), navigation unique non redondante, mise en scène
   sociale (avatars, consensus, progression collective motivante), "relancer
   un ami" engageant.
3. **Dashboard** — mettre en scène le widget "prochaines escapades" comme
   héros de la page, vrais empty states, densité utile au-dessus de la ligne
   de flottaison, header compact.
4. **SavedTripDetail (itinéraire solo)** — moment "wow" : grande photo
   destination, timeline jour-par-jour élégante et lisible, vols en format
   humain ("Départ 22h15, arrivée 20h55, 1 escale"), une action primaire
   claire (réserver), secondaires en menu.
5. **CreateTrip** — transformer le mur de champs en flow guidé progressif et
   désirable (étapes, respiration, feeling "je compose mon voyage").
6. **DestinationLanding (SEO public)** — page désirable et fiable, système
   d'image robuste, identité de marque visible.

Livrables souhaités de Claude :
- Un **design system complet** (couleurs étendues, échelle typo, spacing,
  composants : cards, boutons, inputs, badges, états)
- Le **redesign écran par écran** (HTML/JSX + Tailwind, fidèle à la stack)
- Une **direction artistique** : traitement photographique, iconographie,
  ton, micro-interactions
- Le tout cohérent, premium, avec une vraie personnalité de marque "voyage
  abordable mais stylé"

## 7. Contraintes techniques

- Stack : **React 18 + Vite + Tailwind CSS** (pas de changement de stack)
- Les écrans existent déjà — c'est une **refonte visuelle**, pas une
  réécriture fonctionnelle. Garder les flux et la logique.
- i18n via react-i18next (FR/EN) — la refonte doit traiter la cohérence de
  langue comme un principe, pas un détail
- Couleur signature teal à conserver et étendre, pas remplacer
- Mobile-first impératif (audience urbaine mobile)

## 8. Anti-objectifs (ce qu'on NE veut PAS)

- Pas un magazine de voyage bordélique (rester decision-focused)
- Pas de dégradés criards, pas d'animations gadget
- Pas de pivot de couleur (teal reste la signature)
- Pas de surcharge : le calme et la clarté restent la base
- Pas de dark patterns / pression marketing agressive

## 9. Screenshots fournis (état actuel à refondre)

| Fichier | Écran | Points clés à corriger |
|---|---|---|
| `ux-01-landing-desktop.png` | Landing desktop | mix langue, 2 CTA, template générique, pas d'émotion |
| `ux-05-landing-mobile.png` | Landing mobile | idem + trust signals cassés |
| `ux-02-dashboard.png` | Dashboard connecté | skeletons vides, widget escapade à magnifier, header géant |
| `ux-03-createtrip.png` | Formulaire de création | mur de champs, pas désirable |
| `ux-04-savedtrip.png` | Itinéraire jour-par-jour (solo) | header surchargé, vols techniques, manque photo héro |
| `ux-06-destination-seo.png` | Page destination publique | image incohérente (montagne pour Lisbonne), sans âme |
| `ux-07-dashboard-groupe.png` | Dashboard filtre Groupe | cards group trips, peu différenciées du solo |
| `ux-08-grouptrip-overview.png` | **Voyage de groupe (full page)** | empilement de 10 cards, valeur collaborative noyée |
| `ux-09-grouptrip-header.png` | Voyage de groupe (header/nav) | double navigation (stepper + sous-nav), suivi groupe gris |

> Tous les fichiers sont à la racine :
> `/Users/arthur/Documents/travel-ai-mvp/.claude/worktrees/flamboyant-wing-c385a2/ux-0*.png`

## 10. Brief en une phrase pour Claude

> "Voici Skusku, un planificateur de voyage par IA (React/Tailwind, signature
> teal, philosophie premium-calme-decision-focused). Le produit fonctionne
> mais son branding fait template SaaS générique sans émotion voyage et avec
> des incohérences de langue. Refais-moi un design system pro complet + le
> redesign écran par écran (landing, dashboard, itinéraire, création,
> destination) qui garde la philosophie calme et la couleur teal, mais ajoute
> une vraie identité de marque et l'émotion du voyage — faire rêver tout en
> rassurant 'tout est géré'. Voici les 6 screenshots de l'état actuel."
