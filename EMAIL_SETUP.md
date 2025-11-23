# 📧 Configuration de l'Envoi d'Emails

J'ai mis en place un système d'envoi d'emails pour les invitations collaboratives en utilisant **Resend**.

## ✅ Ce qui est déjà fait

1. **Service d'email créé** (`backend/src/services/emailService.js`)
   - Templates HTML professionnels pour les invitations
   - Support des messages personnalisés
   - Design responsive et moderne

2. **Intégration backend**
   - Les invitations envoient automatiquement des emails
   - URL d'acceptation incluse dans chaque email

3. **Page d'acceptation frontend** (`frontend/src/pages/AcceptInvitation.jsx`)
   - Interface moderne pour accepter les invitations
   - Support des utilisateurs connectés ET invités
   - Redirection automatique vers le voyage après acceptation

4. **Routes configurées**
   - Frontend: `/accept-invitation/:token`
   - Backend:
     - `GET /api/invitations/:token/details` (public)
     - `POST /api/invitations/:token/accept` (public)
     - `POST /api/trips/:tripId/invitations` (authenticated)

## 🔑 Ce dont vous avez besoin

### 1. Créer un compte Resend (GRATUIT)

1. Allez sur **https://resend.com**
2. Créez un compte (gratuit - 3000 emails/mois)
3. Vérifiez votre email

### 2. Obtenir votre API Key

1. Dans le dashboard Resend, allez dans **API Keys**
2. Cliquez sur "Create API Key"
3. Donnez-lui un nom (ex: "Travel AI Production")
4. Copiez la clé (elle commence par `re_...`)

### 3. Configurer votre domaine d'envoi

**Option A: Utiliser le domaine sandbox (POUR TESTER)**
- Resend fournit un domaine sandbox gratuit
- Vous pouvez envoyer des emails uniquement aux adresses que vous avez vérifiées
- Parfait pour le développement

**Option B: Configurer votre propre domaine (POUR LA PRODUCTION)**
1. Dans Resend, allez dans **Domains**
2. Ajoutez votre domaine (ex: `yourdomain.com`)
3. Configurez les enregistrements DNS (Resend vous donnera les valeurs exactes)
4. Attendez la vérification (~24h max)

### 4. Ajouter les variables d'environnement

Ajoutez ces lignes à votre fichier `.env` :

```bash
# Email Configuration (Resend)
RESEND_API_KEY=re_votre_cle_api_ici
EMAIL_FROM=Travel AI <noreply@yourdomain.com>
FRONTEND_URL=http://localhost:5173
```

**Important:**
- `RESEND_API_KEY`: Votre clé API de Resend
- `EMAIL_FROM`: L'adresse email d'envoi
  - Format: `"Nom Affiché <email@domain.com>"`
  - Si vous utilisez le sandbox: `"Travel AI <onboarding@resend.dev>"`
  - Si vous avez votre domaine: `"Travel AI <noreply@yourdomain.com>"`
- `FRONTEND_URL`: L'URL de votre frontend
  - Dev: `http://localhost:5173`
  - Production: `https://your-app.com`

### 5. Redémarrer le backend

```bash
cd backend
npm start
```

## 🧪 Tester l'envoi d'emails

### Test 1: Invitation depuis l'interface

1. Créez un voyage collaboratif
2. Cliquez sur "Invite Friends"
3. Ajoutez une adresse email (la vôtre pour tester)
4. Envoyez l'invitation
5. Vérifiez votre boîte email

### Test 2: Vérifier les logs

Les logs backend devraient afficher:
```
✅ Invitation email sent to test@example.com
```

Si vous voyez:
```
⚠️  RESEND_API_KEY not set, email not sent
```
C'est que la clé API n'est pas configurée dans le `.env`.

## 📧 Ce que reçoit l'invité

L'email contient:
- **Nom du voyage** en grand titre
- **Message personnel** (si fourni)
- **Nom de la personne qui invite**
- **Fonctionnalités du voyage collaboratif**:
  - Collaboration en temps réel
  - Vote sur les destinations
  - Suggestions AI
- **Bouton CTA** "Accept Invitation & Join Trip"
- **Lien direct** vers la page d'acceptation
- **Date d'expiration** (7 jours)

## 🎨 Template Email

Le template est déjà créé avec:
- Design moderne et responsive
- Couleurs matching votre app (bleu/violet)
- Compatible mobile
- Support des dark modes email
- Footer professionnel

## 🔒 Sécurité

- Tokens uniques générés avec `crypto.randomBytes(32)`
- Expiration automatique après 7 jours
- Validation du statut avant acceptation
- Support des invités sans compte

## 📊 Limites Resend (Tier Gratuit)

- **3000 emails/mois** (largement suffisant pour commencer)
- **100 emails/jour**
- Pas de limite de destinataires par email

Pour augmenter:
- Plan Pro: $20/mois = 50,000 emails
- Plan Business: $80/mois = 250,000 emails

## 🚀 Prochaines étapes (optionnel)

Si vous voulez améliorer le système d'emails:

1. **Notifications de mise à jour**
   - Quelqu'un a proposé une destination
   - Les votes sont terminés
   - La destination finale a été choisie

2. **Rappels automatiques**
   - Invitation qui expire bientôt
   - Rappel de voter

3. **Emails de bienvenue**
   - Après acceptation de l'invitation
   - Guide de démarrage

Tous ces templates sont déjà préparés dans `emailService.js` !

## ❓ Besoin d'aide?

Si vous rencontrez des problèmes:
1. Vérifiez que `RESEND_API_KEY` est bien dans le `.env`
2. Redémarrez le backend après avoir ajouté les variables
3. Vérifiez les logs du backend pour les erreurs
4. Contactez le support Resend (très réactif)

---

**Status actuel:** ✅ Code prêt - Il ne manque que la configuration API
