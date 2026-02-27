# Configuration SMTP avec Brevo

Ce guide explique comment configurer votre application pour utiliser Brevo (anciennement Sendinblue) comme serveur SMTP.

## Configuration dans Supabase

Les fonctions Edge ont été mises à jour pour utiliser Brevo par défaut. Vous devez maintenant configurer les variables d'environnement dans votre Dashboard Supabase.

### Étapes de configuration

1. **Connectez-vous à votre Dashboard Supabase**
2. Allez dans **Settings** > **Edge Functions**
3. Faites défiler jusqu'à **Environment Variables**
4. Configurez les variables suivantes :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `SMTP_HOST` | `smtp-relay.brevo.com` | Serveur SMTP de Brevo |
| `SMTP_PORT` | `587` | Port SMTP (STARTTLS) |
| `SMTP_USER` | Votre email Brevo | L'email de connexion de votre compte Brevo |
| `SMTP_PASSWORD` | Votre clé SMTP Brevo | **La clé API SMTP** (pas votre mot de passe de compte) |
| `SMTP_FROM` | `quentin@bruneau27.com` | L'adresse email expéditrice (doit être vérifiée dans Brevo) |

### Comment obtenir votre clé SMTP Brevo

1. Connectez-vous à votre compte Brevo : https://app.brevo.com
2. Allez dans **SMTP & API** > **SMTP**
3. Si vous n'avez pas encore de clé SMTP :
   - Cliquez sur **Créer une clé SMTP**
   - Donnez-lui un nom (par exemple "Bruneau Protection")
   - Copiez la clé générée (elle commence généralement par `xsmtpsib-`)
4. Si vous avez déjà une clé, vous pouvez la réutiliser ou en créer une nouvelle

### Important à savoir

1. **La clé SMTP n'est PAS votre mot de passe de compte Brevo**
   - C'est une clé API spécifique pour SMTP
   - Elle est plus sécurisée car elle peut être révoquée indépendamment

2. **L'adresse expéditrice doit être vérifiée**
   - Dans Brevo, allez dans **Senders & IP** > **Senders**
   - Vérifiez que `quentin@bruneau27.com` est bien configuré et vérifié
   - Sinon, ajoutez-le et suivez le processus de vérification

3. **Port SMTP**
   - Port 587 : STARTTLS (recommandé)
   - Port 465 : SSL/TLS (alternative si 587 ne fonctionne pas)

## Vérification de la configuration

Une fois les variables configurées :

1. Créez un devis de test
2. Essayez de l'envoyer par email
3. Vérifiez les logs de la fonction Edge dans Supabase :
   - Allez dans **Edge Functions**
   - Cliquez sur **send-devis-email**
   - Consultez les **Logs**

Vous devriez voir :
```
Received email request...
Request parsed successfully
SMTP Config: { host: 'smtp-relay.brevo.com', port: 587, user: '...', from: '...', hasPassword: true }
Sending email via SMTP...
Email sent successfully in XXX ms
```

## Résolution de problèmes

### Erreur "Auth failed"
- Vérifiez que la clé SMTP est correcte
- Assurez-vous d'utiliser la clé SMTP et non votre mot de passe Brevo

### Erreur "SMTP password not configured"
- La variable `SMTP_PASSWORD` n'est pas définie dans Supabase
- Ajoutez-la avec votre clé SMTP Brevo

### L'email n'arrive pas
- Vérifiez les logs dans Brevo : **Statistics** > **Email**
- Vérifiez que l'adresse expéditrice est bien vérifiée
- Consultez les bounces et rejets dans Brevo

### Erreur "Send failed"
- Vérifiez que le port 587 n'est pas bloqué
- Essayez le port 465 si nécessaire (modifiez `SMTP_PORT`)

## Limites Brevo

Selon votre plan Brevo :
- **Plan gratuit** : 300 emails/jour
- **Plans payants** : Selon votre abonnement

Si vous dépassez votre quota :
- Les emails seront rejetés par Brevo
- Vous recevrez une notification
- Considérez un upgrade de votre plan si nécessaire

## Support

Si vous rencontrez des problèmes :

1. Consultez la documentation Brevo : https://help.brevo.com/hc/fr
2. Vérifiez les logs de la fonction Edge dans Supabase
3. Testez votre configuration SMTP avec un client email (Thunderbird, etc.)
