# Fix pour les erreurs SMTP Exchange

## Problème identifié

L'erreur `InvalidData: received corrupt message of type InvalidContentType` indique que la bibliothèque SMTP (denomailer) a des problèmes de compatibilité avec Exchange sur le port 587 (STARTTLS).

## Solution recommandée : Utiliser le port 465 (TLS immédiat)

Le port 465 avec TLS immédiat est généralement plus fiable et compatible avec Exchange que le port 587 avec STARTTLS.

### Étapes pour configurer :

1. **Modifier les variables d'environnement Supabase** :
   - `SMTP_PORT=465` (au lieu de 587)
   - `SMTP_HOST=smtp.exchange-swiss.ch`
   - `SMTP_USER=quentin@bruneau27.com`
   - `SMTP_PASSWORD=votre_mot_de_passe`
   - `SMTP_FROM=quentin@bruneau27.com`
   - `EMAIL_PROVIDER=exchange`

2. **Vérifier la configuration Exchange** :
   - Assurez-vous que le port 465 est activé sur votre serveur Exchange
   - Vérifiez que TLS/SSL est activé pour ce port

3. **Si le port 465 n'est pas disponible** :
   Il faudra peut-être revenir à Brevo pour un service email plus fiable.

## Tester la connexion SMTP

Vous pouvez tester la connexion SMTP avec OpenSSL :

```bash
# Pour le port 465 (TLS immédiat)
openssl s_client -connect smtp.exchange-swiss.ch:465 -crlf

# Pour le port 587 (STARTTLS)
openssl s_client -starttls smtp -connect smtp.exchange-swiss.ch:587 -crlf
```

## Alternative : Revenir à Brevo

Si Exchange continue de poser problème, vous pouvez revenir à Brevo qui fonctionne de manière plus fiable :

1. Modifier `EMAIL_PROVIDER=brevo`
2. Configurer `BREVO_API_KEY=votre_clé_api`

## Code déjà déployé

Les fonctions Edge ont déjà été mises à jour pour supporter correctement :
- Port 465 avec TLS immédiat (`tls: true`)
- Port 587 avec STARTTLS (`tls: false`)

La configuration devrait fonctionner automatiquement une fois les variables d'environnement mises à jour avec le bon port.
