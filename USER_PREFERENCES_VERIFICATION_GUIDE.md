# Guide de Vérification des Préférences Utilisateurs

## ✅ Comment vérifier que les préférences sont bien collectées et affichées

### 1. Vérification Backend (Railway Logs)

#### A) Vérifier la sauvegarde des préférences après onboarding

Quand un utilisateur complète l'onboarding, vous devriez voir dans Railway :

```
✅ User preferences updated: user@example.com
```

#### B) Vérifier le chargement des préférences

Quand un utilisateur accède à son compte, vous devriez voir :

```
✅ User preferences fetched: user@example.com
```

### 2. Vérification Base de Données (Neon)

#### Option A: Via Railway CLI
```bash
# Se connecter à Railway
railway login

# Ouvrir un shell Postgres
railway run psql $DATABASE_URL

# Vérifier un utilisateur spécifique
SELECT * FROM "UserPreferences" WHERE "userId" = 'USER_ID_HERE';
```

#### Option B: Via Neon Dashboard
1. Allez sur https://neon.tech
2. Sélectionnez votre projet
3. Onglet "SQL Editor"
4. Exécutez :
```sql
SELECT
  u.email,
  up."onboardingCompleted",
  up."onboardingType",
  up."whyTravel",
  up."mainGoal",
  up."globalStyle",
  up."topActivities",
  up."idealRhythm",
  up."preferredAirports",
  up."tripsPerYear"
FROM "User" u
LEFT JOIN "UserPreferences" up ON u.id = up."userId"
ORDER BY u."createdAt" DESC
LIMIT 10;
```

### 3. Vérification Frontend (Console Chrome)

#### A) Tester l'onboarding complet

1. **Ouvrir navigation privée**
2. **Aller sur** : https://travel-app-ten-rho.vercel.app
3. **Sign up** avec un nouveau compte test
4. **Choisir** "Onboarding Rapide" ou "Onboarding Complet"
5. **Remplir** toutes les questions
6. **Ouvrir Console** (F12)
7. **Vérifier** qu'il n'y a pas d'erreurs 404 ou 500

**Ce que vous devez voir** :
```
✅ User preferences updated: test@example.com
```

**Ce que vous NE DEVEZ PAS voir** :
```
❌ 404 (Not Found)
❌ 500 (Internal Server Error)
❌ Failed to save preferences
```

#### B) Tester l'affichage dans le compte

1. **Aller sur** : https://travel-app-ten-rho.vercel.app/account
2. **Ouvrir Console** (F12) → Onglet Network
3. **Cliquer** sur l'onglet "Préférences"
4. **Vérifier** que la requête GET `/api/users/preferences` retourne 200 OK
5. **Vérifier** que les données sont affichées correctement

**Screenshot de ce que vous devriez voir** :
```
GET /api/users/preferences → 200 OK
Response:
{
  "preferences": {
    "whyTravel": "Découvrir de nouvelles cultures",
    "mainGoal": "Culture et patrimoine",
    "globalStyle": "Équilibré",
    "topActivities": ["Musées", "Gastronomie", "Architecture"],
    "idealRhythm": "balanced",
    ...
  }
}
```

### 4. Test de Modification des Préférences

#### A) Dans Account.jsx

1. **Aller dans** : Compte → Préférences
2. **Modifier** une préférence (ex: changer "Pourquoi voyager ?")
3. **Cliquer** "Sauvegarder"
4. **Vérifier** l'alerte : "Préférences sauvegardées avec succès!"
5. **Rafraîchir** la page (F5)
6. **Vérifier** que le changement est conservé

### 5. Vérifier la Différence Short vs Long

#### Onboarding Short (rapide) enregistre :
- ✅ `onboardingType: 'short'`
- ✅ `onboardingCompleted: true`
- ✅ Champs essentiels :
  - whyTravel
  - mainGoal
  - globalStyle
  - topActivities
  - idealRhythm

#### Onboarding Long (complet) enregistre EN PLUS :
- ✅ Tous les champs du short
- ✅ Plus de détails :
  - accommodationPref
  - stayOrMove
  - transportModes
  - transportComfort
  - maxTransportHours
  - visaPreference
  - avoidCountries
  - mobilityNeeds
  - securityImportance
  - crowdTolerance
  - ecoSensitivity
  - culturalAdaptability
  - climateSensitivity
  - tripsPerYear
  - departureFlexibility
  - preferredAirports
  - annualLeaveDays
  - takenLeaveDays

### 6. Comportement Attendu dans Account.jsx

#### Si onboarding SHORT complété :
- ✅ Onglet "Préférences" : Données de base affichées
- ✅ Onglet "Disponibilités" : Champs vides à compléter
- ⚠️ L'utilisateur PEUT compléter manuellement

#### Si onboarding LONG complété :
- ✅ Onglet "Préférences" : Toutes les données affichées
- ✅ Onglet "Disponibilités" : Toutes les données affichées
- ✅ L'utilisateur PEUT modifier

### 7. Vérification API Endpoint par Endpoint

#### GET /api/users/preferences

**Test avec curl** :
```bash
# Remplacer TOKEN par votre vrai token Clerk
curl -X GET "https://travel-app-production-9b66.up.railway.app/api/users/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Réponse attendue** :
```json
{
  "preferences": {
    "id": "...",
    "userId": "...",
    "onboardingCompleted": true,
    "onboardingType": "short",
    "whyTravel": "Découvrir de nouvelles cultures",
    ...
  }
}
```

#### PUT /api/users/preferences

**Test avec curl** :
```bash
curl -X PUT "https://travel-app-production-9b66.up.railway.app/api/users/preferences" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "whyTravel": "Test",
    "mainGoal": "Test",
    "globalStyle": "balanced"
  }'
```

**Réponse attendue** :
```json
{
  "preferences": {
    "id": "...",
    "userId": "...",
    "whyTravel": "Test",
    ...
  }
}
```

### 8. Checklist Complète de Vérification

- [ ] Nouvel utilisateur peut compléter onboarding short
- [ ] Nouvel utilisateur peut compléter onboarding long
- [ ] Après onboarding, redirection vers dashboard
- [ ] Dans Account → Préférences : données affichées
- [ ] Dans Account → Disponibilités : données affichées
- [ ] Modifications sauvegardées avec succès
- [ ] Après refresh, modifications conservées
- [ ] Railway logs montrent "✅ User preferences updated"
- [ ] Railway logs montrent "✅ User preferences fetched"
- [ ] Base de données Neon contient les données
- [ ] Pas d'erreurs 404 ou 500 dans console

### 9. Problèmes Courants et Solutions

#### Problème : "Failed to fetch preferences" (404)

**Cause possible** :
- CLERK_SECRET_KEY manquante dans Railway
- Utilisateur pas authentifié

**Solution** :
```bash
# Vérifier dans Railway → Variables
CLERK_SECRET_KEY = sk_test_...
```

#### Problème : Préférences vides dans Account.jsx

**Cause possible** :
- Onboarding pas complété
- Données pas sauvegardées

**Solution** :
1. Vérifier Railway logs pour "User preferences updated"
2. Vérifier base de données Neon
3. Refaire l'onboarding

#### Problème : Modifications non sauvegardées

**Cause possible** :
- PUT request échoue
- Token expiré

**Solution** :
1. Ouvrir Console → Network
2. Vérifier le statut de PUT /api/users/preferences
3. Si 401 : Token expiré, re-login
4. Si 500 : Vérifier Railway logs

### 10. Commandes Utiles pour Debugging

#### Voir tous les utilisateurs avec leurs préférences
```sql
SELECT
  u.email,
  up."onboardingType",
  up."onboardingCompleted",
  up."createdAt" as "prefs_created"
FROM "User" u
LEFT JOIN "UserPreferences" up ON u.id = up."userId"
ORDER BY u."createdAt" DESC;
```

#### Compter les utilisateurs avec/sans préférences
```sql
SELECT
  COUNT(CASE WHEN up.id IS NULL THEN 1 END) as "sans_preferences",
  COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) as "avec_preferences",
  COUNT(CASE WHEN up."onboardingType" = 'short' THEN 1 END) as "onboarding_short",
  COUNT(CASE WHEN up."onboardingType" = 'long' THEN 1 END) as "onboarding_long"
FROM "User" u
LEFT JOIN "UserPreferences" up ON u.id = up."userId";
```

#### Voir le dernier utilisateur créé avec toutes ses données
```sql
SELECT
  u.email,
  u."createdAt",
  up.*
FROM "User" u
LEFT JOIN "UserPreferences" up ON u.id = up."userId"
ORDER BY u."createdAt" DESC
LIMIT 1;
```

---

## 🎯 Test Rapide (5 minutes)

1. **Créer compte test** → https://travel-app-ten-rho.vercel.app
2. **Faire onboarding** (short OU long)
3. **Aller dans Account** → Vérifier que données affichées
4. **Modifier une préférence** → Sauvegarder
5. **Refresh (F5)** → Vérifier que changement conservé

**Si ça marche** → ✅ Tout est OK !
**Si ça marche pas** → Suivre les étapes de debugging ci-dessus
