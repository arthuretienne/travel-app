# 🔧 Fix: Railway arrête le conteneur avec SIGTERM

## ❌ Problème

Railway arrête le conteneur avec SIGTERM après quelques secondes, même si :
- ✅ Le serveur démarre correctement
- ✅ Le healthcheck répond (`🏥 Simple health check called`)
- ✅ Le serveur est fonctionnel

## 🔍 Diagnostic

Le healthcheck fonctionne, donc le problème vient probablement de la **configuration Railway dans l'interface web**.

## ✅ Solutions à vérifier dans Railway

### 1. **Désactiver le Healthcheck (temporairement)**

Dans Railway Dashboard :
1. Allez dans votre service
2. **Settings → Deploy**
3. **Healthcheck Path** : Laissez **vide** ou supprimez la valeur
4. Sauvegardez

Cela désactivera le healthcheck automatique et Railway ne devrait plus arrêter le conteneur.

### 2. **Vérifier les Resource Limits**

Dans Railway Dashboard :
1. **Settings → Resource Limits**
2. Vérifiez que vous avez :
   - **CPU** : Au moins 0.5 vCPU
   - **Memory** : Au moins 512 MB
3. Si vous êtes sur le plan gratuit, augmentez si possible

### 3. **Vérifier le Restart Policy**

Dans Railway Dashboard :
1. **Settings → Deploy**
2. **Restart Policy** : Devrait être `ON_FAILURE` (pas `ALWAYS`)
3. **Max Restart Retries** : Au moins 10

### 4. **Vérifier Serverless Mode**

Dans Railway Dashboard :
1. **Settings → Deploy**
2. **Serverless** : Devrait être **désactivé** (OFF)
   - Si activé, Railway arrêtera le conteneur après inactivité
   - Pour un serveur API, vous voulez qu'il reste toujours actif

### 5. **Vérifier le Timeout de Démarrage**

Le fichier `railway.json` définit `healthcheckTimeout: 5000`, mais vérifiez dans l'interface :
1. **Settings → Deploy**
2. S'il y a un champ "Start Timeout" ou "Deploy Timeout", augmentez-le à au moins 30 secondes

## 🧪 Test

Après avoir fait ces changements :

1. **Redéployez** le service
2. **Surveillez les logs** - vous devriez voir :
   - `🚀 Server running`
   - `💓 Server heartbeat - still running` (toutes les 30 secondes)
   - Pas de `SIGTERM` prématuré

## 📝 Note importante

Si le problème persiste après avoir désactivé le healthcheck, cela pourrait être :
- Un problème de plan Railway (limites du plan gratuit)
- Un problème avec la région de déploiement
- Un timeout global Railway

Dans ce cas, contactez le support Railway ou envisagez de passer à un autre service (Heroku, Render, Fly.io).

