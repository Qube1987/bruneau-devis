# Configuration des Variables d'Environnement sur Netlify

La page blanche que vous voyez est causée par des variables d'environnement manquantes sur Netlify.

## Étapes pour configurer Netlify

### 1. Accéder aux Paramètres

1. Allez sur [https://app.netlify.com](https://app.netlify.com)
2. Sélectionnez votre site **devis-bruneau-protection**
3. Cliquez sur **Site configuration** dans le menu de gauche
4. Puis sur **Environment variables**

### 2. Ajouter les Variables

Ajoutez les 3 variables suivantes (bouton **Add a variable**):

#### Variable 1: VITE_SUPABASE_URL
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://zmpbpzyhdzfvipsutbqe.supabase.co`
- **Scopes**: Cochez **Production**, **Deploy previews**, et **Branch deploys**

#### Variable 2: VITE_SUPABASE_ANON_KEY
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGJwenloZHpmdmlwc3V0YnFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDMyNjYsImV4cCI6MjA3MzAxOTI2Nn0.W1m3cnLeIygbc-ulvgLDScI3izU5Gp1Wh1uzs7M3Oxo`
- **Scopes**: Cochez **Production**, **Deploy previews**, et **Branch deploys**

#### Variable 3: VITE_COMPANY_EMAIL
- **Key**: `VITE_COMPANY_EMAIL`
- **Value**: `quentin@bruneau27.com`
- **Scopes**: Cochez **Production**, **Deploy previews**, et **Branch deploys**

### 3. Redéployer le Site

Après avoir ajouté les variables:

1. Allez dans **Deploys** (menu de gauche)
2. Cliquez sur **Trigger deploy** (en haut à droite)
3. Sélectionnez **Deploy site**

Le déploiement prendra 2-3 minutes. Une fois terminé, les liens de devis fonctionneront correctement.

## Vérification

Après le redéploiement, testez:

1. Ouvrez un lien de devis depuis un email
2. La page devrait maintenant afficher le devis correctement
3. Si vous voyez encore une erreur, vérifiez la console du navigateur (F12)

## Support

Si le problème persiste après avoir configuré les variables et redéployé:

1. Vérifiez que les 3 variables sont bien définies dans Netlify
2. Vérifiez que les scopes incluent "Production"
3. Essayez de vider le cache du navigateur (Ctrl+Shift+R)
4. Contactez le support technique
