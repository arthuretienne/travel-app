# 🔧 Correction erreur CORS

## ❌ Problème actuel

L'erreur indique que le frontend Vercel (`https://travel-app-ten-rho.vercel.app`) n'est pas autorisé à accéder au backend Railway.

```
Access to fetch at 'https://travel-app-production-9b66.up.railway.app/api/travel/recommendations' 
from origin 'https://travel-app-ten-rho.vercel.app' 
has been blocked by CORS policy
```

## ✅ Solution

### Dans Railway (Backend) :

1. **Allez dans votre projet Railway**
2. **Ouvrez les Variables d'environnement**
3. **Trouvez ou créez la variable `ALLOWED_ORIGINS`**
4. **Ajoutez l'URL Vercel** :

```
https://travel-app-ten-rho.vercel.app
```

**OU si vous avez plusieurs URLs (production + preview), séparez par des virgules :**

```
https://travel-app-ten-rho.vercel.app,https://travel-app-*.vercel.app
```

**OU pour autoriser tous les sous-domaines Vercel :**

```
https://travel-app-ten-rho.vercel.app,https://*.vercel.app
```

### Vérification

Après avoir mis à jour la variable :

1. **Railway redéploiera automatiquement** (ou redéployez manuellement)
2. **Vérifiez les logs Railway** - vous devriez voir :
   ```
   🌐 CORS Configuration:
      Allowed origins: [ 'https://travel-app-ten-rho.vercel.app' ]
   ```
3. **Testez depuis votre frontend Vercel**

## 📝 Note importante

Si vous utilisez des **preview deployments Vercel** (branches, PRs), chaque preview a une URL différente. Vous pouvez :

- **Option 1** : Utiliser un pattern wildcard dans `ALLOWED_ORIGINS` :
  ```
  https://travel-app-ten-rho.vercel.app,https://*.vercel.app
  ```

- **Option 2** : Ajouter chaque URL manuellement (moins pratique)

- **Option 3** : Utiliser `*` pour autoriser toutes les origines (⚠️ **déconseillé en production**)

## 🧪 Test rapide

Pour tester si CORS fonctionne, ouvrez la console du navigateur sur votre site Vercel et vérifiez qu'il n'y a plus d'erreur CORS.

