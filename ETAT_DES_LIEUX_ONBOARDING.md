# État des Lieux des Onboardings

## 📊 Vue d'ensemble

Il existe **2 versions d'onboarding** dans le projet :

### 1. Onboarding Long (4 étapes) - `Onboarding.jsx`
**Fichier principal** : `frontend/src/components/Onboarding/Onboarding.jsx`
**Structure** : 4 steps séparés

### 2. Onboarding Court (1 page) - `OnboardingNew.jsx`
**Fichier principal** : `frontend/src/components/Onboarding/OnboardingNew.jsx`
**Structure** : Tout sur 1 seule page

---

## 📋 Onboarding Long (4 Steps)

### Step 1: Basic (`Step1Basic.jsx`)

#### ✅ Ce qui existe :
- **Budget** (300€ - 3000€)
- **Style de voyage** : backpacker, confort, aventure, luxe
- **Activités** (multi-choix) :
  - Culture 🎭
  - Sport ⚽
  - Plage 🏖️
  - Nature 🌲
  - Gastro 🍽️
  - Shopping 🛍️
  - Montagne ⛰️
  - Histoire 📚
- **Durée max de vol** (2h - 12h)
- **Préférence de destination** : populaires / mixte / insolites

#### ❌ Ce qui manque :
- ❌ **Ville de base** (origin city)
- ❌ **Transports refusés** (avion/train/bus)
- ❌ **Personnalité du voyageur**

---

### Step 2: Preferences (`Step2Preferences.jsx`)

#### ✅ Ce qui existe :
- **Climat préféré** : chaud, tempéré, froid, peu importe
- **Type d'hébergement** : hotel, auberge, airbnb, mixte
- **Rythme de voyage** : relax, équilibré, intense, aventure
- **Importance gastronomie** : très important, important, secondaire
- **Nature vs Ville** (slider 0-100%)
- **Budget activités** (0-40% du budget total)
- **Nightlife** : principal, secondaire, peu importe *(dans le state mais pas visible dans le code)*
- **Éviter les foules** (checkbox)

#### ❌ Ce qui manque :
- Rien de critique, step assez complet

---

### Step 3: Constraints (`Step3Constraints.jsx`)

#### ✅ Ce qui existe :
- **Langues** : francophone, anglophone, peu importe
- **Sécurité** : très important, important, peu importe
- **Visa** : éviter, simple ok, peu importe
- **Mobilité** : une base, mixte, multi-villes
- **Type de voyageur** : solo, couple, famille, groupe

#### ❌ Ce qui manque :
- ❌ **Transports refusés**

---

### Step 4: Availability (`Step4Availability.jsx`)

#### ✅ Ce qui existe :
- **Ville d'origine** (code IATA, input texte libre)
- **Statut professionnel** : salarié, freelance, étudiant, retraité, autre
- **Durée idéale** : 3-5 jours, 1 semaine, 2 semaines, flexible
- **Flexibilité de départ** : semaine, weekend, peu importe

#### ❌ Ce qui manque :
- ❌ **Mois préférés** (préféré avril, mai, septembre...)
- ❌ **Horizon temporel** (3 mois, 6 mois, 12 mois)
- ❌ **Option "Pas de ville de base"** pour nomades digitaux
- ❌ **Transports refusés**

---

## 🚀 Onboarding Court (`OnboardingNew.jsx`)

### ✅ Ce qui existe (tout sur 1 page) :
- **Budget** : 4 tranches (< €500, €500-1500, €1500-3000, > €3000)
- **Style** : Adventure, Culture, Relaxation, Urban, Food
- **Mois préférés** (multi-select) : Jan-Dec
- **Durée max vol** : < 3h, 3-6h, 6-12h, any
- **Activités** : Hiking, Museums, Beach, Nightlife, Sports, Wellness, Shopping
- **Région** : Europe, Asia, Americas, Africa, Oceania, Surprise me
- **Ville de départ** : Dropdown (Paris, Lyon, Marseille, Nice, Toulouse, Bordeaux, Nantes, Strasbourg)
- **Nombre de voyageurs** : 1-10

### ❌ Ce qui manque :
- ❌ **Personnalité du voyageur** (routard, luxe, etc.)
- ❌ **Transports refusés**
- ❌ **Disponibilité** (statut pro, flexibilité)
- ❌ **Option "Pas de ville de base"**
- ❌ **Beaucoup de questions du long onboarding** (climat, hébergement, rythme, etc.)

---

## 🔍 Analyse : Où sont les infos de TRANSPORT ?

### ❌ AUCUN onboarding ne demande les transports !

**Situation actuelle :**
- ⚠️ Aucune question sur "Quels transports acceptes-tu ?"
- ⚠️ Aucune question sur "Quels transports refuses-tu ?"
- ⚠️ Le système cherche tous les transports (avion, train, bus) pour tout le monde

**Ce que tu veux :**
- ✅ Question : "Quels transports **refuses-tu** ?"
- ✅ Options : Avion, Train, Bus (multi-choice)
- ✅ Logique inversée : par défaut tout est accepté

**Exemple d'usage :**
- User coche "❌ Avion" → Seuls train et bus seront proposés
- User coche rien → Tous les transports sont OK
- User coche "❌ Train, ❌ Bus" → Seulement l'avion

---

## 🎯 Recommandations pour améliorer l'Onboarding Court

Tu veux que l'onboarding court soit **un peu moins court** et inclue :

### 1. ✅ À garder (déjà présent) :
- Budget
- Style de voyage
- Activités
- Mois préférés

### 2. ➕ À AJOUTER :

#### A. **Ville de base** avec option "Nomade"
```jsx
<div className="form-group">
  <label>D'où pars-tu ?</label>
  <select value={formData.originCity}>
    <option value="PAR">Paris</option>
    <option value="LYS">Lyon</option>
    // ...
    <option value="NOMADE">🌍 Pas de ville fixe (nomade digital)</option>
  </select>
</div>

{formData.originCity === 'NOMADE' && (
  <div className="info-box">
    💡 Parfait ! Pour chaque recherche, on te demandera ta ville de départ.
  </div>
)}
```

#### B. **Transports REFUSÉS** (logique inversée)
```jsx
<div className="form-group">
  <label>Quels transports refuses-tu ?</label>
  <p className="hint">Laisse vide si tous les transports sont OK</p>

  <div className="transport-checkboxes">
    <label className="transport-option">
      <input
        type="checkbox"
        checked={formData.refusedTransports?.includes('plane')}
        onChange={() => toggleRefusedTransport('plane')}
      />
      <span className="transport-icon">✈️</span>
      <span>Refuser l'avion</span>
    </label>

    <label className="transport-option">
      <input
        type="checkbox"
        checked={formData.refusedTransports?.includes('train')}
        onChange={() => toggleRefusedTransport('train')}
      />
      <span className="transport-icon">🚄</span>
      <span>Refuser le train</span>
    </label>

    <label className="transport-option">
      <input
        type="checkbox"
        checked={formData.refusedTransports?.includes('bus')}
        onChange={() => toggleRefusedTransport('bus')}
      />
      <span className="transport-icon">🚌</span>
      <span>Refuser le bus</span>
    </label>
  </div>
</div>
```

#### C. **Personnalité du voyageur**
```jsx
<div className="form-group">
  <label>Quel type de voyageur es-tu ?</label>
  <div className="personality-grid">
    <button className={formData.personality === 'routard' ? 'active' : ''}>
      🎒 Routard
      <span className="personality-desc">Budget serré, authenticité</span>
    </button>
    <button className={formData.personality === 'explorateur' ? 'active' : ''}>
      🧭 Explorateur
      <span className="personality-desc">Aventure, hors sentiers battus</span>
    </button>
    <button className={formData.personality === 'confort' ? 'active' : ''}>
      🏨 Confort
      <span className="personality-desc">Balance qualité-prix</span>
    </button>
    <button className={formData.personality === 'luxe' ? 'active' : ''}>
      💎 Luxe
      <span className="personality-desc">Premium, pas de compromis</span>
    </button>
  </div>
</div>
```

#### D. **Disponibilité rapide**
```jsx
<div className="form-group">
  <label>Ta disponibilité</label>
  <div className="availability-quick">
    <select value={formData.professionalStatus}>
      <option value="salarié">💼 Salarié</option>
      <option value="freelance">💻 Freelance</option>
      <option value="étudiant">🎓 Étudiant</option>
      <option value="retraité">🌴 Retraité</option>
    </select>

    <select value={formData.idealDuration}>
      <option value="weekend">Weekend (2-3j)</option>
      <option value="semaine">1 semaine</option>
      <option value="2-semaines">2 semaines</option>
      <option value="flexible">Flexible</option>
    </select>
  </div>
</div>
```

---

## 📊 Structure proposée pour le nouvel onboarding court "enrichi"

### Section 1: Qui es-tu ?
- Personnalité voyageur (routard/explorateur/confort/luxe)
- Ville de base (avec option "Nomade")
- Statut professionnel
- Nombre de voyageurs

### Section 2: Qu'aimes-tu ?
- Budget
- Activités (multi-choice)
- Style de voyage
- Mois préférés

### Section 3: Contraintes
- Transports **REFUSÉS** (inverse logic)
- Durée idéale
- Durée max de vol

### Section 4: Validation
- Récapitulatif
- Bouton "C'est parti !"

---

## 💾 Mapping Backend

### Données à envoyer au backend :
```javascript
{
  basic: {
    budget: 1500,
    personality: 'explorateur', // NOUVEAU
    originCity: 'PAR', // ou 'NOMADE'
    isNomad: false, // NOUVEAU
    travelers: 2
  },
  preferences: {
    travelStyle: 'adventure',
    activities: ['hiking', 'culture', 'food'],
    preferredMonths: ['April', 'May', 'September']
  },
  constraints: {
    refusedTransports: ['plane'], // NOUVEAU - logique inversée
    maxFlightHours: 6,
    idealDuration: 'semaine'
  },
  availability: {
    professionalStatus: 'freelance',
    flexibility: 'high'
  }
}
```

---

## 🚨 Actions requises

### Priority 1 - CRITIQUE
1. ✅ **Ajouter champ "Transports refusés"** avec logique inversée
   - Frontend : Ajouter checkboxes dans onboarding
   - Backend : Filtrer les résultats selon transports acceptés
   - Claude prompt : Informer des contraintes de transport

2. ✅ **Ajouter option "Nomade" pour ville de base**
   - Frontend : Option "Pas de ville fixe"
   - Backend : Permettre NULL ou "NOMADE" pour originCity
   - CreateTrip form : Demander ville de départ si user est nomade

### Priority 2 - IMPORTANT
3. ✅ **Ajouter personnalité du voyageur**
   - Aide Claude à mieux cibler les recommandations
   - 4 options: Routard, Explorateur, Confort, Luxe

4. ✅ **Enrichir onboarding court avec disponibilités**
   - Statut professionnel
   - Durée idéale
   - Conserve la simplicité mais ajoute l'essentiel

### Priority 3 - NICE TO HAVE
5. ⬜ Créer page /settings pour éditer le profil
6. ⬜ Ajouter preview en temps réel des recommandations
7. ⬜ Onboarding progressif (2 questions, puis débloquer plus tard)

---

## 🎯 Prochaines étapes

Veux-tu que je :
1. **Modifie OnboardingNew.jsx** pour ajouter ces champs ?
2. **Crée un nouvel onboarding hybride** qui mélange le meilleur des 2 ?
3. **Améliore l'onboarding long** (4 steps) avec ces ajouts ?

Dis-moi ta préférence ! 🚀
