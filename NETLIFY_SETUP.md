# Configuration Netlify - Guide pas à pas

## Problème actuel
Le lien du devis affiche une page vierge car les variables d'environnement ne sont pas configurées sur Netlify.

## Solution : Configurer les variables d'environnement

### 1. Accédez aux paramètres de votre site Netlify

1. Connectez-vous à [Netlify](https://app.netlify.com)
2. Sélectionnez votre site `devis-bruneau-protection`
3. Cliquez sur **Site settings** (Paramètres du site)
4. Dans le menu de gauche, cliquez sur **Environment variables** (Variables d'environnement)

### 2. Ajoutez les variables suivantes

Cliquez sur **Add a variable** et ajoutez **EXACTEMENT** ces 3 variables :

#### Variable 1 : VITE_SUPABASE_URL
- **Key** : `VITE_SUPABASE_URL`
- **Value** : `https://zmpbpzyhdzfvipsutbqe.supabase.co`
- **Scopes** : Cochez toutes les options (Production, Deploy previews, Branch deploys)

#### Variable 2 : VITE_SUPABASE_ANON_KEY
- **Key** : `VITE_SUPABASE_ANON_KEY`
- **Value** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGJwenloZHpmdmlwc3V0YnFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDMyNjYsImV4cCI6MjA3MzAxOTI2Nn0.W1m3cnLeIygbc-ulvgLDScI3izU5Gp1Wh1uzs7M3Oxo`
- **Scopes** : Cochez toutes les options

#### Variable 3 : VITE_COMPANY_EMAIL
- **Key** : `VITE_COMPANY_EMAIL`
- **Value** : `quentin@bruneau27.com`
- **Scopes** : Cochez toutes les options

### 3. Re-déployez le site

Après avoir ajouté les variables :

1. Allez dans l'onglet **Deploys** (Déploiements)
2. Cliquez sur **Trigger deploy** > **Clear cache and deploy site**
3. Attendez que le déploiement soit terminé (environ 1-2 minutes)

### 4. Testez

Une fois le déploiement terminé :
1. Ouvrez à nouveau le lien du devis
2. Le devis devrait maintenant s'afficher correctement ! ✅

## Vérification

Pour vérifier que tout fonctionne :
- Le lien devrait afficher le devis avec toutes les informations
- Les images des produits devraient être visibles
- Le bouton "Accepter le devis" devrait fonctionner

## En cas de problème

Si la page est toujours vierge après le re-déploiement :
1. Ouvrez la console développeur du navigateur (F12)
2. Regardez l'onglet **Console** pour les erreurs
3. Vérifiez que les variables d'environnement sont bien définies dans Netlify

## Capture d'écran des variables

Les variables dans Netlify devraient ressembler à ça :

```
VITE_SUPABASE_URL = https://zmpbpzyhdzfvipsutbqe.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGci...
VITE_COMPANY_EMAIL = quentin@bruneau27.com
```

## Note importante

⚠️ **ATTENTION** : Ces variables doivent commencer par `VITE_` pour être accessibles dans l'application Vite en production. Ne supprimez pas ce préfixe !
