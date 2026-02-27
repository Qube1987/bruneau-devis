# Dépannage des emails d'acceptation

## Problème actuel
Les emails aux clients partent correctement, mais les emails à l'entreprise (`quentin@bruneau27.com`) échouent.

## Causes possibles et solutions

### 1. Email de l'entreprise non validé dans Brevo

**Le problème le plus probable** : Brevo exige que toutes les adresses email destinataires soient validées pour éviter le spam.

#### Solution : Valider l'email dans Brevo

1. Connectez-vous à votre compte Brevo : https://app.brevo.com/
2. Allez dans **Settings** (Paramètres) → **Senders & IP**
3. Vérifiez que `quentin@bruneau27.com` apparaît dans la liste des expéditeurs validés
4. Si l'email n'est pas validé :
   - Cliquez sur **Add a Sender**
   - Entrez `quentin@bruneau27.com`
   - Brevo enverra un email de vérification à cette adresse
   - Cliquez sur le lien dans l'email pour valider l'adresse

**Important** : Sans cette validation, Brevo refuse d'envoyer des emails à cette adresse pour des raisons de sécurité.

### 2. Limite de débit SMTP

Brevo limite le nombre d'emails envoyés par seconde pour éviter le spam.

#### Solution déjà appliquée :
- Ajout d'un délai de 2 secondes entre l'envoi au client et l'envoi à l'entreprise
- Cela devrait résoudre les problèmes de limite de débit

### 3. Domaine non validé

Si vous utilisez un domaine personnalisé (`@bruneau27.com`), il doit être validé dans Brevo.

#### Solution :

1. Dans Brevo, allez dans **Settings** → **Senders & IP** → **Domains**
2. Vérifiez que `bruneau27.com` est validé
3. Si non, ajoutez-le et suivez les instructions pour valider le domaine (configuration DNS)

### 4. Vérifier les logs détaillés

Avec la nouvelle version déployée, les logs sont beaucoup plus détaillés. Pour voir l'erreur exacte :

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Allez dans **Edge Functions** → **send-acceptance-email** → **Logs**
4. Testez un envoi et regardez les logs en temps réel
5. Cherchez la ligne `[send-acceptance-email] Company email error details:`

L'erreur exacte vous dira pourquoi l'envoi échoue.

## Test de diagnostic

### Test rapide avec la fonction de test

Une fonction de test dédiée a été créée pour diagnostiquer rapidement les problèmes d'email :

```bash
# Depuis votre terminal ou Postman
curl -X POST \
  https://zmpbpzyhdzfvipsutbqe.supabase.co/functions/v1/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGJwenloZHpmdmlwc3V0YnFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDMyNjYsImV4cCI6MjA3MzAxOTI2Nn0.W1m3cnLeIygbc-ulvgLDScI3izU5Gp1Wh1uzs7M3Oxo" \
  -d '{"to": "quentin@bruneau27.com"}'
```

Cette fonction :
- Envoie un email de test simple à l'adresse spécifiée
- Affiche des logs détaillés de chaque étape SMTP
- Indique exactement où l'erreur se produit

**Interprétation des résultats** :

- ✅ **Success** : L'email a été envoyé, la configuration est correcte
- ❌ **Auth failed** : Problème avec le mot de passe SMTP
- ❌ **RCPT TO failed** : L'adresse email n'est pas validée dans Brevo
- ❌ **Connection timeout** : Problème de configuration réseau

### Test complet avec acceptation de devis

Pour tester le système complet :

1. Acceptez un devis test
2. Vérifiez les logs dans Supabase
3. Vérifiez votre boîte email `quentin@bruneau27.com`
4. Vérifiez la section Notifications de l'application (la notification sera toujours créée même si l'email échoue)

## Modifications apportées

### Améliorations de la fonction `send-acceptance-email`

1. **Délai entre les envois** : 2 secondes entre l'email client et l'email entreprise
2. **Logs détaillés** : Chaque erreur est maintenant loggée avec sa stack trace complète
3. **Gestion d'erreurs robuste** : L'échec d'un email n'empêche pas l'envoi de l'autre

### Système de notifications

Un système de notifications a été ajouté pour garantir que vous ne manquez jamais une acceptation :

1. Chaque acceptation est enregistrée dans la base de données
2. Badge rouge sur l'icône Notifications avec le nombre de notifications non lues
3. Panneau Notifications avec tous les détails (client, montant, téléphone, etc.)
4. Mises à jour en temps réel

**Avantage** : Même si l'email échoue, vous aurez toujours la notification dans l'application.

## Checklist de vérification

- [ ] Email `quentin@bruneau27.com` validé dans Brevo
- [ ] Domaine `bruneau27.com` validé dans Brevo (si applicable)
- [ ] Variables d'environnement configurées dans Netlify (voir NETLIFY_ENV_SETUP.md)
- [ ] Test d'acceptation de devis effectué
- [ ] Logs vérifiés dans Supabase
- [ ] Notification reçue dans l'application

## Support

Si le problème persiste après avoir validé l'email dans Brevo :

1. Vérifiez les logs dans Supabase Edge Functions
2. Contactez le support Brevo : https://help.brevo.com/
3. Vérifiez que votre compte Brevo n'a pas atteint ses limites (plan gratuit : 300 emails/jour)
