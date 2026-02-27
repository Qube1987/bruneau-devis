# Configuration des Providers Email

L'application supporte deux providers email que vous pouvez facilement interchanger :
- **Brevo** (par défaut) - API REST
- **Exchange** - Serveur SMTP Exchange

## Basculer entre les providers

La sélection du provider se fait via une seule variable d'environnement : `EMAIL_PROVIDER`

### Variables d'environnement nécessaires

#### Configuration commune (les deux providers)
```bash
SMTP_FROM=quentin@bruneau27.com
```

#### Provider Brevo (par défaut)
```bash
EMAIL_PROVIDER=brevo
BREVO_API_KEY=votre_clé_api_brevo
```

#### Provider Exchange
```bash
EMAIL_PROVIDER=exchange
SMTP_HOST=mail.bruneau27.com
SMTP_PORT=587
SMTP_USER=quentin@bruneau27.com
SMTP_PASSWORD=votre_mot_de_passe
```

## Configuration dans Netlify

### Variables à configurer dans : Site settings > Environment variables

#### Pour utiliser Brevo :
1. `EMAIL_PROVIDER` = `brevo`
2. `BREVO_API_KEY` = votre clé API Brevo
3. `SMTP_FROM` = `quentin@bruneau27.com`

#### Pour utiliser Exchange :
1. `EMAIL_PROVIDER` = `exchange`
2. `SMTP_HOST` = `mail.bruneau27.com`
3. `SMTP_PORT` = `587`
4. `SMTP_USER` = `quentin@bruneau27.com`
5. `SMTP_PASSWORD` = votre mot de passe Exchange
6. `SMTP_FROM` = `quentin@bruneau27.com`

## Comment basculer rapidement entre les deux ?

### Méthode 1 : Modifier EMAIL_PROVIDER (RECOMMANDÉ)
Dans Netlify, changez simplement `EMAIL_PROVIDER` de `brevo` à `exchange` (ou vice versa).
Les deux configurations peuvent rester présentes en même temps.

### Méthode 2 : Garder les deux configurations
Vous pouvez laisser toutes les variables configurées en permanence :
```bash
# Configuration commune
EMAIL_PROVIDER=exchange  # Changez juste cette ligne
SMTP_FROM=quentin@bruneau27.com

# Configuration Brevo (toujours présente)
BREVO_API_KEY=votre_clé_brevo

# Configuration Exchange (toujours présente)
SMTP_HOST=mail.bruneau27.com
SMTP_PORT=587
SMTP_USER=quentin@bruneau27.com
SMTP_PASSWORD=votre_mot_de_passe_exchange
```

Ainsi, pour basculer, vous modifiez uniquement `EMAIL_PROVIDER` !

## Test et vérification

### Vérifier les logs Supabase
Après l'envoi d'un email, consultez les logs de la fonction edge :
- Dans votre projet Supabase : Edge Functions > Logs
- Recherchez `[send-devis-email]` ou `[send-acceptance-email]`
- Vous verrez : `Email Provider: brevo` ou `Email Provider: exchange`

### Tester l'envoi
1. Créez un devis de test
2. Envoyez-le par email
3. Consultez les logs pour vérifier quel provider a été utilisé
4. Vérifiez la réception de l'email

## Résolution de problèmes

### Exchange : Erreur de certificat SSL
- Vérifiez que votre certificat SSL est valide et non expiré
- Le port 587 doit supporter STARTTLS
- Vérifiez avec : `openssl s_client -starttls smtp -connect mail.bruneau27.com:587`

### Exchange : Erreur d'authentification
- Vérifiez que `SMTP_USER` et `SMTP_PASSWORD` sont corrects
- Assurez-vous que le compte n'est pas bloqué
- Vérifiez que l'authentification SMTP est activée sur Exchange

### Brevo : Erreur API
- Vérifiez que `BREVO_API_KEY` est valide
- Consultez votre quota Brevo (limite quotidienne)
- Vérifiez que l'expéditeur `SMTP_FROM` est bien autorisé dans Brevo

### Message d'erreur : "Configuration incomplete"
- **Exchange** : Assurez-vous d'avoir `SMTP_HOST`, `SMTP_USER`, et `SMTP_PASSWORD`
- **Brevo** : Assurez-vous d'avoir `BREVO_API_KEY`

## Avantages de chaque provider

### Brevo
✅ Configuration simple (juste une clé API)
✅ Fiable et rapide
✅ Interface web pour suivre les envois
✅ Gestion automatique des bounces
❌ Limite quotidienne (plan gratuit)
❌ Dépendance à un service tiers

### Exchange
✅ Contrôle total (votre serveur)
✅ Pas de limite d'envoi (hors quota Exchange)
✅ Intégration avec votre infrastructure existante
❌ Dépend de votre certificat SSL
❌ Configuration plus complexe
❌ Nécessite maintenance du serveur SMTP

## Support technique

Si vous rencontrez des problèmes :
1. Consultez les logs Supabase Edge Functions
2. Vérifiez que toutes les variables d'environnement sont bien configurées
3. Testez la connectivité SMTP si vous utilisez Exchange
4. Essayez de basculer sur l'autre provider pour isoler le problème
