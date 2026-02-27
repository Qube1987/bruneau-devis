# Configuration de l'envoi d'emails

## Problème : L'envoi d'email reste bloqué sur "Envoi en cours"

Si l'envoi d'email reste bloqué, cela peut venir de plusieurs causes. Suivez ce guide de dépannage.

## 1. Vérifier les logs dans la console du navigateur

Ouvrez la console du navigateur (F12) et regardez les messages de log quand vous essayez d'envoyer un email.

Vous devriez voir des messages comme :
- `"Sending email with token: ..."`
- `"Invoking send-devis-email function..."`
- `"Function invocation result: ..."`

Si vous voyez une erreur, notez-la pour le diagnostic.

## 2. Vérifier les variables d'environnement Supabase

La fonction Edge d'envoi d'email nécessite les variables d'environnement suivantes dans Supabase :

### Variables requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SMTP_HOST` | Serveur SMTP | `smtp.exchange-swiss.ch` |
| `SMTP_PORT` | Port SMTP (587 pour STARTTLS) | `587` |
| `SMTP_USER` | Nom d'utilisateur SMTP | `service@bruneau27.com` |
| `SMTP_PASSWORD` | **OBLIGATOIRE** - Mot de passe SMTP | `votre-mot-de-passe` |
| `SMTP_FROM` | Adresse email d'envoi | `service@bruneau27.com` |

### Comment configurer les variables

1. Allez dans votre **Tableau de bord Supabase**
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Edge Functions**
4. Faites défiler jusqu'à **Environment Variables**
5. Ajoutez chaque variable avec sa valeur

**IMPORTANT** : La variable `SMTP_PASSWORD` est **obligatoire**. Sans elle, l'envoi d'email échouera.

## 3. Vérifier les logs de la fonction Edge

1. Allez dans votre **Tableau de bord Supabase**
2. Allez dans **Edge Functions**
3. Cliquez sur **send-devis-email**
4. Regardez les **Logs** en temps réel

Vous devriez voir :
- `"Edge function started"`
- `"Request parsed: ..."`
- `"SMTP config: ..."`
- `"Connecting to SMTP server..."`
- Séquence de commandes SMTP
- `"Email sent successfully!"`

Si vous voyez des erreurs, elles vous indiqueront le problème exact.

## 4. Erreurs courantes

### "SMTP_PASSWORD not configured"
**Cause** : La variable d'environnement `SMTP_PASSWORD` n'est pas définie.
**Solution** : Ajoutez-la dans les variables d'environnement (voir section 2).

### "Missing required fields"
**Cause** : Le devis n'a pas toutes les informations nécessaires.
**Solution** : Vérifiez que le devis a un client avec nom et email.

### Timeout ou "Aucune réponse de la fonction"
**Cause** : La fonction Edge met trop de temps ou ne répond pas.
**Solutions possibles** :
- Vérifiez que le serveur SMTP est accessible
- Vérifiez les identifiants SMTP
- Regardez les logs de la fonction Edge

### "Invalid base64 format"
**Cause** : Le PDF généré n'est pas au bon format.
**Solution** : C'est probablement un bug dans la génération du PDF. Contactez le support.

## 5. Test de la configuration SMTP

Pour tester que vos paramètres SMTP fonctionnent, vous pouvez :

1. Créer un devis de test simple
2. Essayer de l'envoyer à votre propre adresse email
3. Vérifier les logs de la console et de Supabase

## 6. Alternative : Utiliser un service d'email tiers

Si vous continuez à avoir des problèmes avec SMTP direct, vous pouvez utiliser :

- **Resend** (recommandé) - API simple et fiable
- **SendGrid** - Service populaire avec bon tier gratuit
- **Mailgun** - Alternative robuste

Ces services sont plus fiables que SMTP direct et plus faciles à configurer.

## Support

Si après avoir suivi ce guide le problème persiste :

1. **Relevez les informations suivantes** :
   - Messages dans la console du navigateur
   - Logs de la fonction Edge dans Supabase
   - Configuration SMTP (sans le mot de passe !)

2. **Vérifiez** :
   - Que vous pouvez vous connecter au serveur SMTP avec ces identifiants
   - Que le port 587 n'est pas bloqué par votre firewall

3. **Testez en local** :
   - Essayez d'envoyer un email de test avec un client SMTP comme Thunderbird
   - Utilisez les mêmes identifiants pour confirmer qu'ils fonctionnent
