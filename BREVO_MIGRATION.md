# Migration vers Brevo pour l'envoi d'emails

## Pourquoi migrer vers Brevo ?

Exchange Server a des problèmes de compatibilité avec denomailer (la bibliothèque SMTP de Deno) :
- Erreurs "BadResource" lors de la connexion TLS
- Erreurs "invalid cmd" avec les réponses SMTP
- Incompatibilité avec l'implémentation TLS de Deno

**Brevo est déjà intégré et testé dans votre application.** C'est la solution la plus fiable.

## Configuration de Brevo

### 1. Créer un compte Brevo

1. Allez sur https://www.brevo.com/
2. Créez un compte gratuit (300 emails/jour gratuits)
3. Vérifiez votre email

### 2. Obtenir votre clé API

1. Connectez-vous à votre compte Brevo
2. Allez dans "SMTP & API" > "API Keys"
3. Cliquez sur "Generate a new API key"
4. Donnez-lui un nom (ex: "Devis Bruneau")
5. Copiez la clé (format: `xkeysib-...`)

### 3. Configurer les variables d'environnement dans Supabase

1. Allez dans votre projet Supabase
2. Settings > Edge Functions > Environment Variables
3. Ajoutez/modifiez ces variables :

```
EMAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-votre-clé-ici
SMTP_FROM=quentin@bruneau27.com
```

4. Redéployez vos Edge Functions ou attendez le prochain déploiement

### 4. Vérifier l'expéditeur dans Brevo

1. Dans Brevo, allez dans "Senders & IP"
2. Ajoutez `quentin@bruneau27.com` comme expéditeur
3. Vérifiez votre email (Brevo va envoyer un email de confirmation)
4. Cliquez sur le lien de confirmation

## Tester l'envoi

Une fois configuré, testez l'envoi d'un devis depuis votre application.

## Avantages de Brevo

✅ **300 emails/jour gratuits** (largement suffisant pour les devis)
✅ **API HTTP fiable** (pas de problèmes SMTP)
✅ **Interface de suivi** pour voir tous les emails envoyés
✅ **Statistiques** d'ouverture et de clic
✅ **Délivrabilité optimisée** (meilleure chance d'arriver en boîte de réception)
✅ **Support technique** en cas de problème

## Limites du plan gratuit

- 300 emails/jour maximum
- Logo Brevo dans les emails (peut être retiré avec un plan payant)

## Si vous dépassez 300 emails/jour

Vous pouvez upgrader vers un plan payant :
- **Starter** : 20€/mois pour 20 000 emails/mois
- Ou rester sur le gratuit et espacer les envois

## Alternative : SMTP2GO

Si vous préférez une alternative à Brevo, SMTP2GO fonctionne également bien avec Deno :
- 1000 emails/mois gratuits
- API HTTP fiable
- Pas de problèmes de compatibilité

Pour utiliser SMTP2GO, modifiez simplement :
```
EMAIL_PROVIDER=smtp2go
SMTP2GO_API_KEY=votre-clé-api
```

Note: Le code pour SMTP2GO n'est pas encore implémenté, mais peut être ajouté facilement si besoin.

## Retour vers Exchange ?

Exchange Server ne fonctionne pas avec denomailer (la bibliothèque SMTP de Deno). Si vous souhaitez absolument utiliser Exchange, il faudrait :
1. Créer un service backend Node.js séparé avec nodemailer
2. L'héberger sur un serveur
3. Appeler ce service depuis vos Edge Functions

Cette solution est beaucoup plus complexe et coûteuse que d'utiliser Brevo.
