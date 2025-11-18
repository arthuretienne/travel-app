# Fix Google OAuth Error 403: access_denied

## Problème
```
Accès bloqué : travel-app-production-9b66.up.railway.app n'a pas terminé
la procédure de validation de Google

Erreur 403 : access_denied
```

## ✅ Solution Rapide (2 minutes)

### Étape 1 : Ajouter des testeurs

1. **Allez sur** : https://console.cloud.google.com/apis/credentials/consent
2. **Sélectionnez** votre projet (Travel AI Calendar Integration)
3. **Section "OAuth consent screen"** → Cliquez sur **EDIT APP**
4. **Scrollez** jusqu'à "Test users"
5. **Cliquez** sur **+ ADD USERS**
6. **Ajoutez** votre email : `aetiennea@gmail.com`
7. **Cliquez** sur **SAVE**
8. **Scrollez** en bas et cliquez sur **SAVE AND CONTINUE**

### Étape 2 : Réessayer

1. **Retournez sur** : https://travel-app-ten-rho.vercel.app/account
2. **Cliquez** sur "Disponibilités"
3. **Cliquez** sur "📅 Connecter Google Calendar"
4. **Cette fois** ça devrait fonctionner ! ✅

## 📝 Pour ajouter d'autres utilisateurs test

Vous pouvez ajouter jusqu'à **100 utilisateurs test** gratuitement.

Pour chaque nouveau testeur :
1. Allez sur : https://console.cloud.google.com/apis/credentials/consent
2. Section "Test users" → ADD USERS
3. Ajoutez l'email du testeur
4. SAVE

## 🚀 Pour la Production (plus tard)

Quand vous aurez des vrais utilisateurs, vous devrez :

### Option 1 : Rester en mode Test (gratuit, mais limité à 100 users)
- Parfait pour MVP/beta
- Pas de validation Google nécessaire
- Ajoutez manuellement chaque testeur

### Option 2 : Publier l'app (pour plus de 100 users)
1. **Complétez** l'OAuth consent screen :
   - Logo de l'app
   - Politique de confidentialité URL
   - Conditions d'utilisation URL
   - Description complète

2. **Soumettez** pour validation Google :
   - Prend 1-2 semaines
   - Google vérifie votre app
   - Gratuit

3. **Une fois approuvé** :
   - N'importe qui peut se connecter
   - Pas de limite d'utilisateurs

## 💡 Recommandation

**Pour l'instant** : Restez en mode Test
- Ajoutez votre email + quelques beta testers
- Pas besoin de validation Google
- **100% gratuit**

**Plus tard** (quand vous avez des vrais clients) : Publiez l'app

---

## ✅ Checklist

- [ ] Aller sur https://console.cloud.google.com/apis/credentials/consent
- [ ] Sélectionner le bon projet
- [ ] EDIT APP
- [ ] Test users → ADD USERS
- [ ] Ajouter aetiennea@gmail.com
- [ ] SAVE
- [ ] SAVE AND CONTINUE
- [ ] Réessayer de connecter le calendrier

Ça devrait marcher maintenant ! 🎉
