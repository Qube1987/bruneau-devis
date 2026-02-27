# Configuration SystemPay

Ce guide explique comment configurer SystemPay pour accepter les paiements d'acompte en ligne.

## Vue d'ensemble

L'intégration SystemPay permet à vos clients de payer l'acompte de 40% directement depuis l'email de confirmation du devis. Le système utilise:

- **Formulaire hébergé SystemPay** - Paiement sécurisé sur la plateforme SystemPay
- **Signature HMAC-SHA-256** - Authentification des requêtes
- **Webhook IPN** - Notifications automatiques de paiement
- **Base de données** - Suivi des transactions

## Étape 1: Créer un compte SystemPay

1. Rendez-vous sur [https://systempay.fr](https://systempay.fr)
2. Créez un compte marchand
3. Activez votre compte (mode TEST puis PRODUCTION)

## Étape 2: Récupérer vos identifiants

Dans votre back-office SystemPay:

1. Allez dans **Paramétrage > Boutique > Clés d'API**
2. Notez les informations suivantes:
   - **Identifiant boutique** (`vads_site_id`)
   - **Certificat de test** (pour le mode TEST)
   - **Certificat de production** (pour le mode PRODUCTION)

## Étape 3: Configurer les variables d'environnement

### Variables obligatoires

Ajoutez ces variables dans votre fichier `.env` et dans Netlify:

```bash
# Identifiant boutique SystemPay
SYSTEMPAY_SITE_ID=12345678

# Certificat SystemPay (TEST ou PRODUCTION)
SYSTEMPAY_CERTIFICATE=votre_certificat_ici

# Mode de contexte (TEST ou PRODUCTION)
SYSTEMPAY_CTX_MODE=TEST

# URL du formulaire SystemPay
SYSTEMPAY_FORM_ACTION=https://secure.systempay.fr/vads-payment/

# URL de retour après paiement
SYSTEMPAY_RETURN_URL=https://votre-domaine.com/payment-result
```

### Configuration dans Netlify

1. Allez dans **Site settings > Environment variables**
2. Ajoutez chaque variable avec sa valeur
3. Redéployez votre application

## Étape 4: Configurer le webhook IPN dans SystemPay

Le webhook IPN permet à SystemPay de notifier votre application des changements de statut de paiement.

### URL du webhook

```
https://votre-projet.supabase.co/functions/v1/systempay-ipn
```

### Configuration dans SystemPay

1. Dans votre back-office SystemPay, allez dans **Paramétrage > Règles de notification**
2. Activez **Notification instantanée de paiement (IPN)**
3. Entrez l'URL du webhook ci-dessus
4. Sélectionnez **POST**
5. Cochez **Toutes les transactions**
6. Enregistrez

## Étape 5: Tester l'intégration

### Mode TEST

En mode TEST, utilisez ces cartes bancaires de test:

#### Cartes valides
- **Numéro**: `4970100000000000`
- **Date expiration**: Date future (ex: 12/25)
- **CVV**: `123`

#### Cartes refusées
- **Numéro**: `4972000000000003` (refus insuffisance de provision)
- **Date expiration**: Date future
- **CVV**: `123`

### Processus de test

1. Créez un devis dans votre application
2. Envoyez le devis par email
3. Cliquez sur le bouton "Payer l'acompte maintenant" dans l'email
4. Testez le paiement avec une carte de test
5. Vérifiez que:
   - Le paiement est traité correctement
   - Le webhook IPN est appelé
   - Le statut du devis est mis à jour dans la base de données
   - Le client reçoit un email de confirmation

## Étape 6: Passer en PRODUCTION

Une fois les tests validés:

1. Dans SystemPay, activez votre boutique en mode PRODUCTION
2. Récupérez le **certificat de production**
3. Mettez à jour les variables d'environnement:
   ```bash
   SYSTEMPAY_CERTIFICATE=certificat_production
   SYSTEMPAY_CTX_MODE=PRODUCTION
   ```
4. Redéployez votre application

## Architecture technique

### Base de données

**Table `payments`**
- Stocke toutes les transactions
- Contient les informations de paiement SystemPay
- Lien avec la table `devis`

**Colonnes du devis**
- `payment_status`: Statut du paiement (unpaid, deposit_paid, fully_paid)
- `payment_link_token`: Token sécurisé pour le lien de paiement

### Edge Functions

**generate-systempay-form**
- Génère les paramètres du formulaire SystemPay
- Calcule la signature HMAC-SHA-256
- URL: `/functions/v1/generate-systempay-form?token={payment_link_token}`

**systempay-ipn**
- Reçoit les notifications IPN de SystemPay
- Vérifie la signature
- Met à jour le statut du paiement
- URL: `/functions/v1/systempay-ipn`

### Flux de paiement

1. **Client reçoit l'email** avec le lien de paiement
2. **Clic sur le lien** → Redirection vers `/payment/{token}`
3. **Edge function** génère le formulaire SystemPay avec signature
4. **Affichage de la page** de paiement avec les détails
5. **Soumission du formulaire** → Redirection vers SystemPay
6. **Saisie des informations** bancaires sur SystemPay
7. **Traitement du paiement** par SystemPay
8. **Notification IPN** envoyée au webhook
9. **Mise à jour du statut** dans la base de données
10. **Redirection client** vers `/payment-result` avec résultat

## Sécurité

- Les certificats SystemPay ne sont jamais exposés côté client
- Toutes les opérations sensibles passent par les Edge Functions
- La signature HMAC-SHA-256 garantit l'authenticité des requêtes
- Le token de paiement est unique et sécurisé (32 octets hexadécimal)

## Statuts de paiement

### Statuts SystemPay
- `AUTHORISED`: Paiement autorisé
- `CAPTURED`: Paiement capturé (débité)
- `REFUSED`: Paiement refusé
- `CANCELLED`: Paiement annulé par le client
- `ABANDONED`: Paiement abandonné

### Statuts dans l'application
- `pending`: En attente
- `success`: Paiement réussi
- `failed`: Paiement échoué
- `cancelled`: Annulé
- `abandoned`: Abandonné

## Support

### Logs et débogage

Les Edge Functions loggent toutes les transactions. Pour consulter les logs:

```bash
# Voir les logs de génération de formulaire
supabase functions logs generate-systempay-form

# Voir les logs du webhook IPN
supabase functions logs systempay-ipn
```

### Problèmes courants

**Le lien de paiement ne fonctionne pas**
- Vérifiez que `SYSTEMPAY_SITE_ID` et `SYSTEMPAY_CERTIFICATE` sont configurés
- Vérifiez que le devis a bien un `payment_link_token`

**Le webhook IPN n'est pas appelé**
- Vérifiez l'URL du webhook dans SystemPay
- Vérifiez que l'URL est accessible publiquement
- Consultez les logs dans SystemPay

**Le paiement est refusé**
- En mode TEST, utilisez uniquement les cartes de test SystemPay
- Vérifiez que le montant est supérieur au minimum accepté

## Documentation SystemPay

- [Guide d'intégration](https://docs.lyra.com/fr/)
- [Formulaire de paiement](https://docs.lyra.com/fr/collect/siteshosting/)
- [IPN](https://docs.lyra.com/fr/collect/ipn/)
- [Cartes de test](https://docs.lyra.com/fr/collect/test-cards/)
