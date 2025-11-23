# 🚀 Roadmap MVP - Travel AI

## 📊 Vue d'ensemble

**Objectif:** Produit fonctionnel, optimisé, avec recommandations précises et UX premium

**Estimation totale:** 8-10 jours de développement intensif
**Avec imprévus:** 12-15 jours calendaires

**Contraintes Claude Code Pro:**
- ~500 messages/jour max
- Usage intelligent requis (parallélisation, tâches groupées)
- Pause stratégiques pour reset des limites

---

## 🎯 Phase 1: Foundation & APIs (3-4 jours)

### **Jour 1-2: APIs RapidAPI + Caching**

**Objectif:** Remplacer/compléter Amadeus avec APIs plus fiables

#### A. Intégration RapidAPI
- [x] **Booking.com API** (hôtels) ✅ SESSION 2025-11-23
  - [x] Service `bookingService.js`
  - [x] Recherche d'hôtels par ville + dates
  - [x] Parsing des prix réels
  - [x] Fallback vers data historique

- [ ] **Kayak API** (vols + comparaison)
  - [ ] Service `kayakService.js`
  - [ ] Recherche de vols (remplacement Amadeus)
  - [ ] Agrégation de prix multi-compagnies
  - [ ] Meilleure couverture destinations

- [ ] **Airbnb API** (locations alternatives)
  - [ ] Service `airbnbService.js`
  - [ ] Recherche appartements/maisons
  - [ ] Filtre par style utilisateur
  - [ ] Option "aventure" ou "authentique"

- [x] **FlixBus API** (transport inter-villes) ✅ SESSION 2025-11-23
  - [x] Service `flixbusService.js`
  - [x] Connexions européennes
  - [x] Alternative économique aux vols
  - [x] Calculer temps de trajet vs budget

#### B. Solution trains (pas d'API)
- [ ] **Base de données historique**
  - [ ] Créer `backend/src/data/trainPrices.js`
  - [ ] Prix moyens par route (Paris-Lyon, etc.)
  - [ ] Fourchettes par saison (haute/basse)
  - [ ] Multiplicateurs par classe (2nde/1ère)

- [ ] **Estimation intelligente**
  - [ ] Distance × prix/km moyen
  - [ ] Ajuster selon pays (France, Allemagne, Italie)
  - [ ] Afficher avec disclaimer "Prix estimé"
  - [ ] Lien vers site officiel (SNCF, DB, Trenitalia)

#### C. Redis Caching
- [x] **Setup Upstash Redis** ✅ SESSION PRÉCÉDENTE
  - [x] Config Upstash complète
  - [x] TTL adaptatifs par type de données

- [x] **Cache stratégique** ✅ SESSION 2025-11-23
  - [x] Vols: 12h (prix changent peu dans la journée)
  - [x] Hôtels: 24h (dispo relativement stable)
  - [x] Trains: 7 jours (prix estimés fixes)
  - [x] FlixBus: 48h (prix dynamiques)

- [ ] **Cache warming**
  - [ ] Pré-charger destinations populaires
  - [ ] Refresh automatique la nuit
  - [ ] Réduire appels API de 80%

**Effort:** 16-20h
**Messages Claude estimés:** 80-100

---

### **Jour 3: Optimisation Recommandations**

**Objectif:** Recommandations ultra-précises basées sur vraies données

#### A. Workflow amélioré
- [x] **Scoring multi-facteurs** ✅ SESSION 2025-11-23
  - [x] Prix réel (poids: 30%)
  - [x] Correspondance préférences (poids: 40%)
  - [x] Disponibilité (poids: 20%)
  - [x] Saison/météo (poids: 10%)

- [ ] **Validation prix**
  - [ ] Vérifier écart < 15% entre estimé et réel
  - [x] Fallback si écart trop grand ✅ (estimation si pas de vol)
  - [x] Logger les écarts pour amélioration ✅

- [x] **Utilisation data onboarding** ✅ SESSION 2025-11-23
  - [x] Intégrer `riskTolerance` dans scoring
  - [x] `transportModes` → prioriser train/bus si préféré
  - [x] `crowdTolerance` → éviter destinations surpeuplées
  - [x] `ecoSensitivity` → bonus trains, malus vols courts

#### B. Prompt Claude optimisé
- [x] Origine dynamique (pas uniquement Paris) ✅ SESSION 2025-11-23
- [x] Contraintes transport accessibilité ✅ SESSION 2025-11-23
- [x] Instructions précises sur dates (AI-generated) ✅ SESSION PRÉCÉDENTE
- [x] Format JSON strict avec validation ✅ SESSION PRÉCÉDENTE

**Effort:** 6-8h
**Messages Claude estimés:** 40-50

---

## 🎨 Phase 2: UI/UX & Branding (2-3 jours)

### **Jour 4-5: Nouvelle identité visuelle**

**Objectif:** Brand identity unique, chaleureuse, différenciante

#### A. Naming & domaine
- [ ] **Brainstorm noms** (ex: Voya, Wandr, Tripsly, Wander)
  - Court, mémorable
  - .com ou .co disponible
  - Évoque voyage + IA

- [ ] **Achat domaine**
  - Vérifier dispo sur Namecheap
  - Budget: ~15€/an

#### B. Design system (inspiration Jow)
- [ ] **Couleurs chaleureuses**
  - Primaire: Orange/Corail (énergie, voyage)
  - Secondaire: Bleu doux (confiance)
  - Accents: Vert (nature) + Jaune (soleil)
  - Neutrals: Beige/Crème (chaleur)

- [ ] **Typographie friendly**
  - Headings: Ronde, accessible (ex: Poppins, Outfit)
  - Body: Lisible (ex: Inter, DM Sans)

- [ ] **Components**
  - Cards arrondies (border-radius: 16-24px)
  - Shadows douces (pas de harsh borders)
  - Micro-interactions (hover, transitions)
  - Illustrations/icons personnalisés

- [ ] **Voice & tone**
  - Tutoiement
  - Langage simple, pas corporate
  - Émojis subtils
  - Encourage l'exploration

#### C. Refonte pages clés
- [ ] **Homepage**
  - Hero humanisé ("Où veux-tu partir?")
  - CTA clair
  - Social proof (témoignages)

- [ ] **Results page**
  - Cards destinations plus visuelles
  - Prix en évidence
  - Badges (Meilleur prix, Recommandé, Éco)

- [ ] **Trip Detail unified**
  - Même template solo/groupe
  - Sections conditionnelles (invitations, votes)
  - Timeline visuelle du voyage

**Effort:** 14-18h
**Messages Claude estimés:** 60-80

---

## 💳 Phase 3: Monétisation & Features (2-3 jours)

### **Jour 6-7: Stripe + Abonnements**

**Objectif:** Système de paiement fonctionnel

#### A. Setup Stripe
- [ ] **Compte Stripe**
  - Mode test
  - Webhooks configurés

- [ ] **Plans d'abonnement**
  ```
  Free:
  - 3 recherches/mois
  - Destinations limitées (5)
  - Publicités

  Explorer (9.99€/mois):
  - Recherches illimitées
  - 10 destinations
  - Pas de pub
  - Calendrier sync

  Wanderer (19.99€/mois):
  - Tout Explorer +
  - Voyages groupe illimités
  - Support prioritaire
  - Export PDF itinéraires
  ```

- [ ] **Backend integration**
  - Middleware `checkSubscription`
  - Route `/api/billing/create-checkout`
  - Route `/api/billing/portal`
  - Webhook handler

- [ ] **Frontend**
  - Pricing page
  - Paywall sur features premium
  - Billing dashboard

**Effort:** 10-12h
**Messages Claude estimés:** 50-60

---

### **Jour 8: Features fonctionnelles**

**Objectif:** Tout doit marcher parfaitement

#### A. Voyages (solo + groupe)
- [ ] **Page unifiée TripDetail**
  - Détection automatique solo/groupe
  - Affichage conditionnel
  - Navigation fluide

- [ ] **Invitations email**
  - Fix Resend sandbox
  - Templates HTML améliorés
  - Tracking ouvertures

- [ ] **Système de vote**
  - UI intuitive
  - Résultats en temps réel
  - Finalisation automatique

#### B. Workflow complet testé
- [ ] Onboarding → Recherche → Résultats
- [ ] Save trip → View → Edit
- [ ] Invite → Accept → Vote → Finalize
- [ ] Pas d'erreurs console
- [ ] Pas de 404/500

**Effort:** 8-10h
**Messages Claude estimés:** 40-50

---

## 🔒 Phase 4: Sécurité & Optimisation (1-2 jours)

### **Jour 9-10: Production-ready**

**Objectif:** Code propre, sécurisé, performant

#### A. Sécurité
- [ ] **Validation inputs**
  - Zod schemas partout
  - Sanitize user data

- [ ] **Rate limiting**
  - Par IP: 100 req/min
  - Par user: 1000 req/jour

- [ ] **Environment vars**
  - Vérifier tous les secrets
  - Pas de clés en dur

- [ ] **CORS**
  - Whitelist domaines autorisés
  - Pas de `*`

#### B. Performance
- [ ] **Database queries**
  - Ajouter indexes manquants
  - N+1 queries fixes
  - Prisma query optimization

- [ ] **Bundle size**
  - Lazy loading routes
  - Code splitting
  - Compression images

- [ ] **Caching headers**
  - Static assets: 1 an
  - API responses: selon type

- [ ] **Monitoring**
  - Sentry error tracking
  - Logs structured
  - Alertes critiques

#### C. Cleaning
- [ ] **Code cleanup**
  - Supprimer fichiers unused
  - Remove console.logs
  - Fix eslint warnings

- [ ] **Documentation**
  - README à jour
  - API docs
  - Architecture diagram

- [ ] **Tests basiques**
  - Critical paths
  - API endpoints clés
  - Auth flows

**Effort:** 8-10h
**Messages Claude estimés:** 40-50

---

## 📅 Planning détaillé

### **Semaine 1** (Jours 1-5)
```
Lundi:    APIs RapidAPI (Booking, Kayak)
Mardi:    APIs RapidAPI (Airbnb, FlixBus) + Trains data
Mercredi: Caching Redis + Optimisation recommandations
Jeudi:    Naming + Design system + Nouvelle identité
Vendredi: Refonte UI pages principales
```

### **Semaine 2** (Jours 6-10)
```
Lundi:    Stripe setup + Backend integration
Mardi:    Frontend billing + Pricing page
Mercredi: Features fonctionnelles (trips, invitations)
Jeudi:    Sécurité + Rate limiting
Vendredi: Performance + Cleaning + Tests
```

### **Weekend** (Buffer)
```
Samedi:   Tests utilisateurs + Bug fixes
Dimanche: Polish final + Documentation
```

---

## 💰 Coûts estimés

| Poste | Coût |
|-------|------|
| Domaine (.com) | 15€/an |
| RapidAPI (tier payant) | ~30€/mois |
| Upstash Redis (gratuit tier) | 0€ |
| Stripe (pas de frais fixes) | 0€ |
| Hosting (Vercel + Render) | 0€ (tier gratuit) |
| **TOTAL** | ~45€ initial |

---

## 🚨 Risques & Mitigation

### **Risque 1: Limites Claude Code Pro**
- **Mitigation:**
  - Grouper les tâches
  - Pause 12h si limite atteinte
  - Prioriser tâches critiques
  - User peut coder sans Claude pour CSS/styling simple

### **Risque 2: APIs RapidAPI instables**
- **Mitigation:**
  - Toujours avoir fallback (data historique)
  - Caching agressif
  - Retry logic avec exponential backoff

### **Risque 3: Intégration Stripe complexe**
- **Mitigation:**
  - Commencer par mode test simple
  - Webhooks en dernier
  - Doc officielle Stripe très complète

### **Risque 4: Refonte UI trop ambitieuse**
- **Mitigation:**
  - Design system simple d'abord
  - Itération progressive
  - Focus sur 3-4 pages clés seulement

---

## ✅ Définition of Done

Le MVP sera prêt quand:

- [ ] User peut chercher un voyage et voir 10 destinations pertinentes
- [ ] Prix affichés < 15% écart avec réalité
- [ ] Toutes préférences onboarding utilisées dans reco
- [ ] Invitations email fonctionnent (hors sandbox)
- [ ] Voyage solo ET groupe fonctionnent sans bugs
- [ ] Stripe checkout fonctionne (mode test)
- [ ] Nouvelle UI appliquée sur toutes pages
- [ ] 0 erreurs console
- [ ] Performance: LCP < 2.5s, FID < 100ms
- [ ] Code review: pas de secrets exposés
- [ ] Domaine acheté + déployé

---

## 📊 Métriques de succès post-launch

- **Technique:**
  - Uptime > 99%
  - API response time < 500ms (p95)
  - Cache hit rate > 70%
  - Écart prix moyen < 10%

- **Produit:**
  - Onboarding completion > 60%
  - Search-to-save conversion > 25%
  - Free-to-paid conversion > 5%
  - NPS > 40

---

## 🎯 Post-MVP (Nice to have)

Si on a du temps ou après launch:

- [ ] Export PDF itinéraire
- [ ] Partage voyage sur réseaux sociaux
- [ ] Notifications push (voyage bientôt!)
- [ ] Chat collaboratif dans voyages groupe
- [ ] Recommandations activités sur place (Google Places)
- [ ] Météo en temps réel
- [ ] Alerte prix (surveiller baisse)
- [ ] Multi-langue (EN, ES, IT)

---

## 🚀 On commence quand?

**Je suis prêt à démarrer immédiatement!**

**Ordre recommandé d'exécution:**

1. **Jour 1-3:** APIs + Caching (fondation solide)
2. **Jour 4-5:** UI/Branding (visible, motivant)
3. **Jour 6-8:** Stripe + Features (valeur)
4. **Jour 9-10:** Polish (prod-ready)

**Première tâche:** Veux-tu qu'on commence par:
- A) RapidAPI setup (Booking + Kayak)?
- B) Naming + Domaine (quick win)?
- C) Fixer les bugs actuels d'abord?

Dis-moi par où tu veux attaquer et on y va! 💪
