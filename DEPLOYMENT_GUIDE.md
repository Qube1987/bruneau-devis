# Guide de déploiement

## Problème : Écran "You're almost there"

Lorsque vos clients cliquent sur le lien du devis dans l'email, ils voient un écran "You're almost there!" au lieu de voir directement le devis. **C'est normal** - cela se produit parce que l'application fonctionne actuellement en mode développement local.

## Solution : Déployer l'application en production

Pour que vos clients puissent accéder directement au devis, vous devez déployer l'application sur un serveur de production. Voici les options recommandées :

### Option 1 : Netlify (Recommandé - Gratuit)

1. Créez un compte sur [Netlify](https://netlify.com)
2. Connectez votre repository Git ou uploadez le dossier `dist`
3. Configurez les variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_COMPANY_EMAIL`
4. Déployez !

**Avantages :**
- Gratuit pour les petits projets
- Déploiement automatique à chaque modification
- HTTPS inclus
- CDN mondial pour des performances optimales

### Option 2 : Vercel (Gratuit)

1. Créez un compte sur [Vercel](https://vercel.com)
2. Importez votre projet
3. Configurez les variables d'environnement
4. Déployez !

**Avantages similaires à Netlify**

### Option 3 : Hébergement traditionnel (OVH, etc.)

1. Compilez l'application : `npm run build`
2. Uploadez le contenu du dossier `dist` sur votre serveur
3. Configurez votre serveur web (Apache/Nginx)
4. Configurez les variables d'environnement

## Variables d'environnement à configurer

Assurez-vous de configurer ces variables sur votre plateforme de déploiement :

```env
VITE_SUPABASE_URL=https://zmpbpzyhdzfvipsutbqe.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon
VITE_COMPANY_EMAIL=quentin@bruneau27.com
```

## Configuration du fichier _redirects

Le fichier `public/_redirects` est déjà configuré pour Netlify/Vercel. Il permet de gérer correctement les URLs du type `/devis/:token`.

## Après le déploiement

Une fois déployé, vos clients recevront des liens comme :
- `https://votre-domaine.netlify.app/devis/abc123` (au lieu de l'URL locale)

Ces liens fonctionneront directement sans écran intermédiaire !

## Fonctionnalités de notification par email

Quand un client accepte un devis :
- ✅ Le client reçoit un email de confirmation avec le récapitulatif
- ✅ Vous recevez un email de notification à `quentin@bruneau27.com`

Ces emails sont envoyés automatiquement via l'Edge Function `send-acceptance-email`.
