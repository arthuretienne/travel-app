# Algorithme de Recommandations — Skusku

> Ce document est la référence technique sur le fonctionnement du système de recommandations, ses limitations actuelles, et la roadmap d'améliorations.

---

## 1. Architecture Actuelle (Vue d'ensemble)

```
POST /api/travel/recommendations
    ↓
1. Auth + rate limiting + usage check
    ↓
2. Enrichissement profil (DB onboarding → userProfile)
    ↓
3. Détection de scénario
    ├─ WITH_DESTINATION (user a spécifié une destination)
    └─ WITHOUT_DESTINATION (mode découverte)
    ↓
4. destinationService → Booking.com API (vols + hôtels)
    ↓
5. Claude AI → insights + raison du match
    ↓
6. Pexels → photos
    ↓
7. Response assemblée → frontend
```

**Fichiers clés :**
- `backend/src/routes/travel.js` — Orchestrateur principal
- `backend/src/services/destinationService.js` — Logique vols + hôtels + budget
- `backend/src/services/bookingService.js` — Appels API Booking.com
- `backend/src/services/claudeService.js` — Génération IA (destinations + insights)
- `backend/src/services/claudePromptsOptimized.js` — Templates de prompts

---

## 2. Workflow WITH_DESTINATION

Utilisé quand l'utilisateur saisit une ville cible.

```
Input: { destination: "Prague", budget: 800, travelers: 2, tripType: "couple", dates: ... }
    ↓
1. Résolution IATA : "Prague" → "PRG" (via Booking API)
    ↓
2. Recherche vols : Paris CDG/ORY → PRG pour les dates
   - Dates flexibles: ±1 jour (3 recherches)
   - Dates fixes: exactement la date
    ↓
3. Calcul budget hébergement :
   remainingBudget = totalBudget - flightCost
   hotelBudgetRatio = { couple: 0.85, family: 0.75, default: 0.70, adventure: 0.50 }
   maxNightlyRate = (remaining × ratio) / nights
    ↓
4. Recherche hôtels avec filtres : tripType, accommodationPref, maxPrice
   Tri : contextScore (pertinence) puis rating (qualité)
    ↓
5. Claude génère : tagline, matchReason, activities, budgetTips
```

---

## 3. Workflow WITHOUT_DESTINATION

Utilisé en mode découverte.

```
Input: { destination: "", budget: 1200, travelers: 4, tripType: "friends", ... }
    ↓
1. Claude Sonnet génère une shortlist de 4 destinations adaptées au profil
   (basé sur : activités, style, budget, envie, trip type, personalité)
    ↓
2. Lookup IDs en parallèle pour les 4 destinations
    ↓
3. Recherche vols en parallèle (4 destinations × 3 dates si flexible)
    ↓
4. Filtre budget : max 50% du budget total pour les vols
   Si aucun résultat abordable → propose alternatives train/bus
    ↓
5. Sélection Top 3-5 par prix
    ↓
6. Génération insights + photos pour chaque destination
```

---

## 4. Bugs Critiques Identifiés

### 🔴 Bug 1 : Budget per capita vs budget total non clarifié

**Problème :** Si l'utilisateur saisit "400€ pour 4 amis", le système interprète 400€ comme le budget TOTAL du groupe. Avec 4 personnes :
- 50% vols = 200€ → 50€/personne aller-retour → quasi-impossible
- Hôtel restant : 200€ / 3 nuits / 2 chambres = 33€/chambre/nuit → hostel territory
- Résultat : aucun vol trouvé, ou vol trouvé + hostel proposé

**Localisation :** `travel.js:156`, `destinationService.js:206`

**Fix :** Demander au frontend de clarifier budget/personne vs total. Ou détecter dans le prompt (`basic.budgetType: 'total' | 'per_person'`). Recalculer : `effectiveBudget = budgetType === 'per_person' ? budget × travelers : budget`.

---

### 🔴 Bug 2 : Hostel proposé pour couple/amis

**Problème :** La sélection d'hôtel est basée sur `maxNightlyRate` et `contextScore`. Si le budget est serré, un hostel à 15€/nuit peut avoir un meilleur contextScore qu'un hôtel 2 étoiles à 40€. Pour un voyage en couple ou entre amis, c'est inacceptable.

**Localisation :** `destinationService.js:644-651`

**Fix :** Ajouter un filtre dur sur le type de propriété :
```js
const EXCLUDED_PROPERTY_TYPES = {
  couple: ['hostel', 'dormitory', 'guesthouse'],
  family: ['hostel', 'dormitory'],
  friends: ['hostel'], // sauf si explicitement demandé "budget"
  business: ['hostel', 'dormitory', 'guesthouse'],
};
```
Si aucun hôtel convenable dans le budget → afficher avertissement budget insuffisant plutôt que proposer un hostel inadapté.

---

### 🔴 Bug 3 : Paris Beauvais (BVA) non supporté

**Problème :** BVA (Beauvais-Tillé, utilisé par Ryanair) n'est pas dans la table IATA_TO_CITY de `bookingService.js`. Si un utilisateur part de BVA, la résolution échoue ou retourne des résultats aléatoires. De plus, BVA est à 85km de Paris (navette 1h30 + €17) → coût caché significatif.

**Localisation :** `bookingService.js:19-88`

**Fix :**
1. Ajouter BVA dans IATA_TO_CITY + gérer les 5 aéroports parisiens
2. Stocker le coût et temps de transfert aéroport dans le profil
3. Inclure ce coût dans le budget disponible pour les activités

**Tableau aéroports Paris :**
| Code | Nom | Transfert Paris | Coût |
|------|-----|-----------------|------|
| CDG | Charles de Gaulle | RER B 35min | €11.80 |
| ORY | Orly | OrlyBus 30min | €9.50 |
| BVA | Beauvais | Car direct 1h30 | €17 |

---

### 🔴 Bug 4 : Ratio budget vols hardcodé à 50%

**Problème :** `maxFlightBudget = budget * 0.5` est appliqué uniformément. Pour un vol Paris→Bangkok (600€+), 50% d'un budget de 1000€ = 500€ max → aucun vol trouvé même si l'utilisateur voulait un voyage long-courrier. Pour Paris→Bruxelles (30€), 50% d'un budget 500€ = 250€ → trop laxiste, l'hôtel se retrouve avec 470€.

**Localisation :** `destinationService.js:206`

**Fix :** Ratio dynamique basé sur la distance estimée :
```js
const FLIGHT_BUDGET_RATIO = {
  european: 0.35,      // Paris→Rome, Barcelona, etc.
  medium_haul: 0.50,   // Paris→Marrakech, Istanbul, etc.
  long_haul: 0.65,     // Paris→Bangkok, New York, etc.
};
// Détecter par région ou utiliser le prix réel trouvé
```

---

### 🟡 Bug 5 : Timing de vol non pris en compte

**Problème :** Le système ne sait pas si l'utilisateur peut prendre un vol à 6h du matin (implique se lever à 3h30 si CDG). Les résultats de vols sont triés par prix uniquement, pas par praticité.

**Localisation :** `destinationService.js:523`, `bookingService.js:315-372`

**Fix proposé :**
- Ajouter dans l'onboarding : "Heure de départ la plus tôt acceptable" (par ex. 7h, 9h, 12h)
- Filtrer ou déprioriser les vols avant cette heure
- Prendre en compte le temps de trajet vers l'aéroport depuis la ville de l'utilisateur

---

### 🟡 Bug 6 : Adresse bug retry fallback (adults: 1)

**Problème :** Quand la recherche de vols échoue et retente avec l'aéroport le plus proche, `adults` est hardcodé à 1 au lieu d'utiliser `numAdults`.

**Localisation :** `destinationService.js:493`

**Fix :** Remplacer `adults: 1` par `adults: numAdults`

---

### 🟡 Bug 7 : Destinations répétitives en mode découverte

**Problème :** Claude a tendance à proposer les mêmes 5-10 destinations populaires (Barcelona, Lisbonne, Prague, Amsterda, Rome). `temperature: 1.0` aide mais ne suffit pas.

**Localisation :** `claudeService.js:53`, prompt `generateDestinationShortlist`

**Fix :** Tracker les destinations déjà proposées par utilisateur (Redis) et les injecter dans le prompt comme exclusions.

---

## 5. Profil Utilisateur : Ce qui est utilisé vs ce qui manque

### ✅ Utilisé correctement
| Champ | Usage |
|-------|-------|
| `basic.budget` | Budget total de la recherche |
| `basic.tripType` | Ratio budget hôtel + type de propriété |
| `basic.travelers` | Nombre de passagers + chambres |
| `basic.travelVibeDescription` | Contexte libre, priorité maximale dans les prompts |
| `onboardingPreferences.topActivities` | Passage dans le prompt Claude |
| `onboardingPreferences.accommodationPref` | Filtre hôtel |
| `onboardingPreferences.globalStyle` | Contexte prompt |

### ❌ Ignoré ou sous-utilisé
| Champ | Problème | Impact |
|-------|----------|--------|
| `onboardingPreferences.preferredAirports` | Seulement le premier est utilisé | Perd alternatives |
| `basic.travelers` breakdown | Pas de distinction adultes/enfants/ados | Mauvaise alloc. chambres |
| `onboardingPreferences.mobilityNeeds` | Extrait mais jamais passé à l'API hôtel | Accessibilité ignorée |
| `refusedTransports` | Extrait mais pas enforced | Propose avion si refuse avion |
| `onboardingPreferences.whyTravel` | Utilisé dans prompt, pourrait pondérer hôtels | Faible impact |
| Budget/personne vs total | Jamais clarifié dans le form | Mauvaise interprétation |

---

## 6. Stratégie par Profil de Voyage

### 🎓 Voyage Étudiant / Budget
**Critères :** Budget < 400€/pers, durée 3-5j, solo ou amis
**Priorités :** Vol le moins cher > Localisation centrale > Pas de hostel dortoir (sauf demande)

**Algorithme attendu :**
1. Ratio vols : 45% du budget
2. Hôtels : 3 étoiles minimum, chambres privées
3. Destinations prioritaires : villes avec nombreuses lowcost (Prague, Budapest, Cracovie, Séville)
4. Activités : mise en avant des gratuites (musées gratuits, parcs, marchés)
5. Avertir si budget insuffisant pour le nombre de voyageurs

---

### 👨‍👩‍👧‍👦 Voyage Famille
**Critères :** Adultes + enfants, budget médian-haut
**Priorités :** Hébergement spacieux > Activités kids-friendly > Sécurité destination

**Algorithme attendu :**
1. Chambres : 1 suite familiale ou 2 chambres communicantes (pas 2 chambres standard séparées)
2. Filtrer hôtels avec piscine, kid-club, restaurant
3. Destinations : éviter les villes trop chaotiques, privilégier nature/plage/parcs
4. Ratio vols : 40% (famille préfère confort hébergement)
5. Activités : inclure tarifs enfants, parcs d'attraction, excursions familles

---

### 💼 Voyage Entreprise / Business
**Critères :** Budget moyen-haut, solo ou groupe, durée 2-5j
**Priorités :** Localisation centrale > Wifi/espace travail > 4-5 étoiles

**Algorithme attendu :**
1. Hôtels : 4 étoiles min, centre ville, salle de réunion disponible
2. Vols : timing horaire raisonnable (pas avant 7h), idéalement directs
3. Ratio hôtel : 85% du budget restant
4. Activités : restaurants gastronomiques, rooftops, expériences premium
5. Itinéraire : bloc matin libre pour réunions

---

### 💎 Voyage Luxe
**Critères :** Budget > 2000€/pers, attentes premium
**Priorités :** Hôtel 5 étoiles > Expériences exclusives > Vols directs

**Algorithme attendu :**
1. Ne jamais proposer < 4 étoiles
2. Vol direct prioritaire (avec correspondances en second recours seulement)
3. Ratio hôtel : 90% du budget restant
4. Filtrer propriétés : "Palace", "Boutique Luxury", "Resort"
5. Activités : expériences privées, guides locaux, restaurants étoilés

---

### 🏔️ Voyage Sportif / Activité Centrale
**Critères :** Budget variable, l'activité principale = raison du voyage
**Priorités :** Proximité du lieu sportif > Budget activité > Hébergement fonctionnel

**Exemples :**
- **Ski :** Chamonix, Zermatt, Courchevel → vol vers aéroport + navette, hôtel au pied des pistes
- **Parachute / Escalade :** Proche du centre de parachutisme, hôtel simple
- **Surf :** Biarritz, Ericeira, Fuerteventura → logement avec local séchoir
- **Randonnée :** Accès GR, guide disponible, météo du parcours

**Algorithme attendu :**
1. Ratio activités : 40-50% du budget
2. Ratio hôtel : 35% (fonctionnel, pas luxe)
3. Détection de la destination par l'activité (pas l'inverse)
4. Avertir sur les disponibilités saisonnières (ex: neige garantie, passes ouverts)
5. Inclure équipement spécifique dans les "packing tips"

---

## 7. Métriques de Qualité d'une Recommandation

Une bonne recommandation doit scorer sur 3 axes :

### A. Match Profil (0-100)
- Budget respecté : vol + hôtel + activités ≤ budget total (-30 pts si dépassement)
- Type de logement adapté au tripType (+20 pts hôtel 3-4 étoiles pour couple/amis)
- Activités alignées avec topActivities (+15 pts)
- Destination compatible avec la demande libre travelVibeDescription (+25 pts)
- Timing de vol praticable (+10 pts)

### B. Originalité (0-100)
- Destination peu proposée aux autres utilisateurs (+20 pts)
- Activité non-standard, locale, authentique (+20 pts)
- Pas dans le top 10 des destinations touristiques mondiales (+10 pts si hors top)
- Cohérence saisonnière (bonne période pour la destination) (+15 pts)

### C. Rapport Qualité/Prix (0-100)
- Vol : meilleur prix disponible pour les dates (comparé aux alternatives +2j) (+30 pts)
- Hôtel : rating / prix (meilleur ratio pour le budget) (+30 pts)
- Budget activités réaliste pour la destination (+20 pts)
- Pas de coût caché aéroport (ou clairement mentionné) (+20 pts)

**Score minimum acceptable pour afficher une recommandation : 60/100**

---

## 8. Roadmap d'Améliorations (Priorisé)

### Sprint 1 — Corrections Critiques (maintenant)
- [ ] **Bug 6 Fix** : `adults: numAdults` dans le retry fallback (`destinationService.js:493`)
- [ ] **Bug 2 Fix** : Filtre dur anti-hostel pour tripType couple/business/friends (`destinationService.js:644`)
- [ ] **Bug 3 Fix** : Ajouter BVA + tous aéroports parisiens dans IATA_TO_CITY avec coût transfert
- [ ] **Budget per capita** : Ajouter champ `budgetType: 'total' | 'per_person'` dans le formulaire + recalcul

### Sprint 2 — Amélioration Budget & Logique
- [ ] **Budget ratio dynamique** : Remplacer 50% hardcodé par ratio basé sur région (Europe 35%, long-courrier 65%)
- [ ] **Minimum viability check** : Avant de chercher, calculer si le budget est techniquement possible (min vol connu × voyageurs + min hôtel × nuits × chambres)
- [ ] **Budget warning clair** : Si insuffisant → expliquer pourquoi et proposer soit plus de budget soit des compromis (dates différentes, hôtel moins bien)

### Sprint 3 — Personnalisation Avancée
- [ ] **Timing de vol** : Ajouter "heure de départ minimale acceptable" dans l'onboarding
- [ ] **Diversité destinations** : Tracker les propositions récentes par user, les exclure des prochaines
- [ ] **Profils par type de voyage** : Logique dédiée par profil (étudiant, famille, luxe, sport)
- [ ] **Room type explicit** : Détecter si les amis veulent des chambres séparées vs partagées

### Sprint 4 — Intelligence & Tests
- [ ] **Test suite complet** : 1 test par profil voyageur × 3 budgets = 15 scénarios automatisés
- [ ] **Scoring de recommandation** : Implémenter les 3 axes qualité + logger les scores
- [ ] **A/B testing prompts** : Tester 2 versions de prompt Claude, comparer les résultats
- [ ] **Fallback intelligent** : Si aucun vol trouvé → proposer dates alternatives ou train

---

## 9. Tests de Validation (à exécuter manuellement)

### Test 1 — Budget étudiant
```
Input:
- tripType: friends (4 personnes)
- budget: 400€ PER PERSON (1600€ total)
- duration: 3 jours
- destination: "capitale européenne"
- travelVibeDescription: "weekend pas cher entre potes dans une belle ville"

Expected:
- Vol ≤ 80€/pers aller-retour (ex: Budapest, Cracovie, Prague via EasyJet/Ryanair)
- Hôtel: 2 chambres double, 3 étoiles min, ~40-60€/chambre/nuit
- Total: ~240€/pers (vol + hôtel + marge activités)
- JAMAIS un hostel dortoir
- Destination non-banale (pas que Paris/Rome/Barcelona)
```

### Test 2 — Voyage en couple
```
Input:
- tripType: couple
- budget: 1200€ total
- duration: 5 jours
- travelVibeDescription: "destination romantique, bonne gastronomie"

Expected:
- Vol ≤ 300€ pour 2 (soit ≤150€/pers)
- Hôtel: boutique ou 4 étoiles, chambre double, ~80-100€/nuit
- Budget activités: ~300€ (dîners, visites)
- Destinations: Porto, Ljubljana, Séville, Dubrovnik (romantiques, prix corrects)
```

### Test 3 — Famille
```
Input:
- tripType: family
- travelers: "2 adults, 2 children"
- budget: 3000€ total
- duration: 7 jours
- travelVibeDescription: "vacances été bord de mer avec enfants 6 et 10 ans"

Expected:
- 4 billets avion (2 adultes + 2 enfants)
- Hôtel: suite familiale ou 2 chambres communicantes, piscine
- Destination: mer accessible facilement (Malte, Croatie, Canaries, Grèce)
- Activités kid-friendly mentionnées
```

### Test 4 — Voyage sportif
```
Input:
- tripType: solo
- budget: 800€
- duration: 5 jours
- travelVibeDescription: "je veux faire du ski dans les Alpes, pistes intermédiaires"

Expected:
- Vol vers Genève GVA ou Lyon LYS
- Navette GVA→Chamonix ou LYS→Les Deux Alpes mentionnée
- Hôtel en station, proche des pistes
- Forfait ski inclus dans le budget activities
- Alerte si conditions enneigement insuffisantes pour les dates
```

### Test 5 — Budget impossible (doit avertir)
```
Input:
- travelers: 4
- budget: 200€ total
- duration: 5 jours

Expected:
- Pas de résultats affichés
- Message clair: "Pour 4 personnes, 5 jours, le budget minimum est d'environ €X"
- Proposer : augmenter le budget OU réduire la durée OU moins de voyageurs
```

---

## 10. Architecture Claude Prompts

### Prompt 1 : `generateDestinationShortlist` (discovery mode)
**Modèle :** Claude Haiku (vitesse)
**Objectif :** Générer 4 destinations adaptées au profil complet
**Inputs critiques :** budget, tripType, travelers, topActivities, travelVibeDescription, globalStyle
**Output :** Array de 4 noms de villes

**Améliorations :**
- Injecter les destinations déjà vues par l'user (exclusions)
- Spécifier explicitement le budget par personne
- Mentionner la contrainte de type de logement

### Prompt 2 : `generateDestinationRecommendationWithData` (avec données réelles)
**Modèle :** Claude Sonnet (qualité)
**Objectif :** Générer insights + raison du match une fois les données vol/hôtel connues
**Inputs critiques :** destination, vol réel, hôtel réel, budget restant activities, profil user
**Output :** tagline, matchReason, seasonReason, activities[], budgetTips[]

**Améliorations :**
- Passer le tripType explicitement dans le prompt pour adapter le ton
- Mentionner le timing de vol pour ajuster la narration du premier jour

### Prompt 3 : `generateItineraryStreaming` (itinéraire jour par jour)
**Modèle :** Claude Haiku (streaming rapide)
**Objectif :** Générer 1 jour à la fois, progressivement
**Améliorations :**
- Passer budget activities restant réel (pas estimé)
- Passer tripType pour adapter les activités (famille vs amis vs couple)

---

*Dernière mise à jour : 2026-03-08*
*Maintenu par : l'équipe Skusku + Claude Code*
