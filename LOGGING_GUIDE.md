# 📊 Guide de Logging & Debugging - Travel AI

## ✅ Ce qui a été ajouté

J'ai mis en place un système de logging complet pour vous permettre de suivre tous les workflows et identifier les problèmes en développement.

### 1. **Service de Logging Central** (`backend/src/services/logger.js`)

Un service unique qui track:
- 🤖 **Appels API Claude** - Requêtes, réponses, tokens utilisés, durée
- ✈️  **Appels API Amadeus** - Recherches de vols/hôtels, résultats, erreurs
- 📧 **Envois d'emails** - Succès/échecs Resend avec détails
- 👤 **Actions utilisateurs** - Toutes les actions des utilisateurs
- 🎯 **Génération de recommandations** - Process AI complet avec préférences
- 🔄 **Changements de workflow** - Transitions d'état des voyages

### 2. **Logging Email Amélioré** (`backend/src/services/emailService.js`)

Chaque envoi d'email affiche maintenant:
```
📧 ========== EMAIL SERVICE: SEND INVITATION ==========
📧 Timestamp: 2025-11-22T22:33:46.255Z
📧 Recipient: user@example.com
📧 Trip Name: Weekend à Paris
📧 Inviter Name: Arthur
📧 Accept URL: http://localhost:5173/accept-invitation/abc123...
📧 Has Custom Message: true
✅ RESEND_API_KEY is configured
📧 From Address: Travel AI <noreply@resend.dev>
📧 Email Payload: {...}
📧 Calling Resend API...
✅ Resend API call successful!
✅ Response Data: {"id": "re_123..."}
✅ Email ID: re_123...
📧 =================================================
```

**Détails affichés:**
- Configuration de l'API key
- Adresse d'expéditeur utilisée
- Payload complet de l'email
- Réponse exacte de Resend API
- Email ID pour tracking

### 3. **Logging Claude API** (`backend/src/services/claudeService.js`)

Pour chaque génération de destinations:
```
👤 ========== USER ACTION ==========
👤 User: Arthur
👤 Action: Generate AI Destinations
👤 Details: {
  "budget": 2000,
  "style": "aventure",
  "activities": ["randonnée", "culture"],
  "timeHorizon": "6-mois",
  "hasOnboardingPrefs": true
}
👤 ===================================

🤖 ========== CLAUDE API CALL ==========
🤖 Operation: Generate Destinations - Request
🤖 Call Count: 1
🤖 Input: You are a travel recommendation AI...
🤖 =======================================

🤖 ========== CLAUDE API CALL ==========
🤖 Operation: Generate Destinations - Response
🤖 Tokens Used: { input: 1234, output: 567, total: 1801 }
🤖 Duration: 2345ms
🤖 Claude Response: {"destinations": [...]}
🤖 =======================================

🎯 ========== AI RECOMMENDATION GENERATION ==========
🎯 Step: Destinations Generated
🎯 Trip ID: abc123
🎯 Group Preferences Summary:
   - Member Count: 3
   - Budget Range: 1500 - 2500 EUR
   - Climate Preferences: tempéré, chaud
   - Activities: randonnée, culture, gastronomie
   - Duration: 7 days
🎯 Destinations Generated: 10
   1. Lisbonne (Portugal) - Score: 95
   2. Marrakech (Maroc) - Score: 92
   ...
🎯 ==================================================
```

### 4. **Logging Amadeus API** (`backend/src/services/amadeusService.js`)

Pour les recherches de vols:
```
✈️  ========== AMADEUS API CALL ==========
✈️  Operation: Flight Offers Search
✈️  Call Count: 5
✈️  Parameters: {
  "origin": "CDG",
  "destination": "LIS",
  "destinationCity": "Lisbonne",
  "departureDate": "2025-06-15",
  "returnDate": "2025-06-22",
  "adults": 1,
  "max": 3
}
✈️  Duration: 1234ms
✅ Results: {
  "price": 156.50,
  "currency": "EUR",
  "segments": 2,
  "airline": "TP",
  "cabinClass": "ECONOMY"
}
✈️  =======================================
```

Pour les recherches d'hôtels:
```
✈️  ========== AMADEUS API CALL ==========
✈️  Operation: Hotel Search - Success
✈️  Parameters: {
  "city": "Lisbonne",
  "checkIn": "2025-06-15",
  "checkOut": "2025-06-22",
  "nights": 7
}
✅ Results: {
  "hotelCount": 5,
  "averagePrice": 420,
  "priceRange": { "min": 280, "max": 650 }
}
✈️  Duration: 1567ms
✈️  =======================================
```

### 5. **Logging Workflow & Actions Utilisateurs** (`backend/src/routes/invitations.js`)

Pour les invitations:
```
👤 ========== USER ACTION ==========
👤 User: Arthur Dupont
👤 Action: Send Trip Invitations
👤 Details: {
  "tripId": "trip_123",
  "emailCount": 3,
  "hasCustomMessage": true
}
👤 ===================================

📧 ========== EMAIL LOG ==========
📧 Type: Trip Invitation
📧 Recipient: friend@example.com
📧 Status: success
📧 Total Sent: 1
📧 Total Failed: 0
✅ Email ID: re_abc123...
📧 ================================
```

Pour l'acceptation d'invitation:
```
🔄 ========== WORKFLOW STATE CHANGE ==========
🔄 Trip ID: trip_123
🔄 Trip Name: Weekend à Paris
🔄 State Transition: invited → member
🔄 Triggered By: friend@example.com
🔄 Member Count: 4
🔄 ===========================================
```

## 📊 Statistiques de Session

Vous pouvez obtenir un résumé à tout moment en ajoutant cet endpoint à votre serveur:

```javascript
// Dans server.js
import { logger } from './services/logger.js';

app.get('/api/debug/stats', (req, res) => {
  logger.printStats();
  res.json(logger.getStats());
});
```

Exemple de sortie:
```
📊 ========== SESSION STATISTICS ==========
📊 Claude API Calls: 12
📊 Amadeus API Calls: 45
📊 Emails Sent: 8
📊 Emails Failed: 1
📊 User Actions: 23
📊 API Errors: 2

📊 Recent Errors:
   1. [Amadeus] Flight Offers - Error: No flights available
   2. [Resend] Email sending failed: Invalid API key
📊 =========================================
```

## 🐛 Debug Email - Checklist

Si les emails ne passent pas, suivez ces logs:

### 1. Vérifier la configuration
Recherchez dans les logs:
```
✅ RESEND_API_KEY is configured
📧 From Address: Travel AI <noreply@resend.dev>
```

Si vous voyez:
```
❌ RESEND_API_KEY not set in environment
```
→ Votre clé n'est pas dans le `.env` ou le backend n'a pas redémarré

### 2. Vérifier l'appel API Resend
Recherchez:
```
📧 Calling Resend API...
✅ Resend API call successful!
✅ Email ID: re_...
```

Si vous voyez:
```
❌ Resend API returned an error:
❌ Error Object: {...}
```
→ Le problème vient de Resend (clé invalide, domaine non vérifié, etc.)

### 3. Vérifier le payload
Regardez le log du payload:
```
📧 Email Payload: {
  "from": "Travel AI <noreply@resend.dev>",
  "to": ["user@example.com"],
  "subject": "...",
  "htmlLength": 5432
}
```

**Vérifications importantes:**
- ✅ `from` doit correspondre à votre domaine sandbox Resend
- ✅ `to` doit être une adresse vérifiée (en mode sandbox)
- ✅ `htmlLength` doit être > 0

### 4. Sandbox Mode Resend

**IMPORTANT:** En mode sandbox, Resend n'envoie les emails QU'AUX adresses vérifiées!

**Pour vérifier une adresse en sandbox:**
1. Allez sur https://resend.com/emails
2. Cliquez sur "Verify Email" dans le menu
3. Ajoutez l'adresse email du destinataire
4. Le destinataire reçoit un email de vérification
5. Une fois vérifié, les invitations fonctionneront

**Ou utilisez votre propre domaine:**
- Configurez votre domaine dans Resend
- Attendez la vérification DNS
- Changez `EMAIL_FROM` dans le `.env`

## 🔍 Comment Utiliser les Logs

### Pour débugger une recherche de voyage:

1. **Lancez une recherche** depuis le frontend
2. **Regardez les logs backend** dans cet ordre:
   - 👤 Action utilisateur (vérifier les préférences envoyées)
   - 🤖 Appel Claude API (vérifier le prompt et la réponse)
   - 🎯 Recommandations générées (voir les destinations)
   - ✈️  Pré-screening Amadeus (voir quelles destinations ont des vols)
   - ✈️  Recherche de vols détaillée (voir les prix)
   - ✈️  Recherche d'hôtels (voir les disponibilités)

3. **Identifiez le problème:**
   - Si aucune destination → Problème Claude API
   - Si destinations mais pas de vols → Problème Amadeus ou budget trop bas
   - Si erreur API → Regardez le message d'erreur détaillé

### Pour débugger les invitations:

1. **Envoyez une invitation**
2. **Vérifiez les logs:**
   ```
   👤 USER ACTION: Send Trip Invitations
   📧 EMAIL SERVICE: SEND INVITATION
   ✅ RESEND_API_KEY is configured
   📧 Calling Resend API...
   ✅ Email ID: re_...
   📧 EMAIL LOG: status: success
   ```

3. **Si échec, regardez:**
   - Configuration de la clé API
   - Adresse d'expéditeur (doit matcher votre domaine)
   - Réponse d'erreur de Resend
   - Vérification sandbox

## 💡 Tips de Debugging

### 1. Filtrer les logs par type

Dans votre terminal, utilisez `grep`:
```bash
# Voir uniquement les emails
npm start | grep "📧"

# Voir uniquement Claude API
npm start | grep "🤖"

# Voir uniquement Amadeus API
npm start | grep "✈️"

# Voir les erreurs uniquement
npm start | grep "❌"
```

### 2. Suivre un workflow complet

Exemple pour suivre une invitation:
```bash
npm start | grep -E "(👤|📧|🔄)"
```

### 3. Compter les appels API

Les logs affichent "Call Count" pour chaque service:
- 🤖 Claude Call Count
- ✈️  Amadeus Call Count

### 4. Mesurer les performances

Chaque log API affiche la durée:
- `Duration: 1234ms` pour savoir quel appel est lent

## 🚀 Prochaines Étapes

Une fois les emails qui fonctionnent:

1. **Testez une recherche complète** et vérifiez que tous les logs s'affichent
2. **Analysez les tokens Claude** utilisés (pour optimiser les coûts)
3. **Vérifiez le nombre d'appels Amadeus** (pour rester dans les quotas)
4. **Identifiez les API lentes** (pour améliorer les perfs)

---

**Status:** ✅ Système de logging complet installé et fonctionnel

**Pour obtenir de l'aide:** Envoyez-moi les logs complets de votre terminal quand vous reproduisez le problème!
