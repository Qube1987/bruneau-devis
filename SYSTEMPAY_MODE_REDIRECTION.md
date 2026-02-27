# Configuration SystemPay - Mode Redirection

## ✅ Implémentation terminée

L'intégration SystemPay en mode redirection est maintenant configurée avec :

### 📁 Fichiers créés/modifiés

1. **Edge Function : `generate-systempay-form`**
   - Génère le formulaire de paiement avec signature HMAC-SHA-256
   - Crée un enregistrement de paiement en base
   - Calcule automatiquement l'acompte de 40%

2. **Edge Function : `systempay-ipn`**
   - Reçoit les notifications de SystemPay après paiement
   - Vérifie la signature pour sécuriser les échanges
   - Met à jour le statut du paiement et du devis
   - Crée une notification pour l'administrateur

3. **Composant : `PaymentPage`**
   - Affiche les détails du devis
   - Soumet le formulaire vers SystemPay
   - Redirige vers la plateforme de paiement sécurisée

4. **Composant : `PaymentResult`**
   - Affiche le résultat du paiement après retour
   - Gère tous les statuts (succès, refus, annulation)

---

## 🔧 Configuration requise

### 1. Variables d'environnement Netlify

Ajoutez ces variables dans **Netlify > Site settings > Environment variables** :

```bash
# SystemPay Configuration
SYSTEMPAY_SITE_ID=12345678                          # Votre identifiant boutique (8 chiffres)
SYSTEMPAY_CERTIFICATE=votre_cle_de_test            # Clé de TEST ou PRODUCTION
SYSTEMPAY_CTX_MODE=TEST                            # TEST ou PRODUCTION
SYSTEMPAY_FORM_ACTION=https://paiement.systempay.fr/vads-payment/
SYSTEMPAY_RETURN_URL=https://votre-site.netlify.app/payment-result
```

### 2. Configuration dans le Back Office SystemPay

#### A. Récupérer vos identifiants

1. Connectez-vous au Back Office : https://paiement.systempay.fr/vads-merchant/
2. Allez dans **Paramétrage > Boutique > Clés**
3. Récupérez :
   - **Identifiant boutique** → `SYSTEMPAY_SITE_ID`
   - **Clé de test** → `SYSTEMPAY_CERTIFICATE` (pour les tests)

#### B. Configurer l'URL de notification (IPN)

1. Allez dans **Paramétrage > Règles de notification**
2. Cliquez droit sur **"URL de notification à la fin du paiement"**
3. Sélectionnez **"Gérer la règle"**
4. Configurez :

```
URL à appeler en mode TEST:
https://votre-site.netlify.app/.netlify/functions/systempay-ipn

URL à appeler en mode PRODUCTION:
https://votre-site.netlify.app/.netlify/functions/systempay-ipn

Format: API Formulaire V1, V2
```

5. Cochez **"Rejeu automatique en cas d'échec"**
6. Renseignez votre email pour les alertes
7. **Sauvegardez**

#### C. Configurer l'URL de retour

1. Allez dans **Paramétrage > Boutique > Configuration**
2. Section **"URL de retour"** :

```
URL de retour en mode TEST:
https://votre-site.netlify.app/payment-result

URL de retour en mode PRODUCTION:
https://votre-site.netlify.app/payment-result
```

3. **Sauvegardez**

#### D. Algorithme de signature

1. Dans **Paramétrage > Boutique > Clés**
2. Vérifiez que **"Algorithme de signature"** est : **HMAC-SHA-256**
3. Si ce n'est pas le cas, changez-le

---

## 🧪 Phase de test

### 1. Effectuer des paiements de test

SystemPay fournit des numéros de carte de test. Utilisez-les pour tester :

**Carte CB de test :**
```
Numéro : 4970100000000003
Date expiration : N'importe quelle date future (ex: 12/25)
CVV : N'importe quel (ex: 123)
```

### 2. Tests à effectuer

1. ✅ **Paiement accepté** : Utilisez une carte de test valide
2. ✅ **Paiement refusé** : Utilisez une carte de test refusée
3. ✅ **Vérification IPN** :
   - Après paiement, vérifiez dans le Back Office SystemPay
   - Allez dans **Gestion > Transactions de TEST**
   - Cliquez sur la transaction
   - Vérifiez que le statut IPN est **"Envoyé"**

4. ✅ **Vérification base de données** :
   - Le paiement doit apparaître dans la table `payments`
   - Le devis doit avoir `payment_status = 'deposit_paid'`
   - Une notification doit être créée

### 3. Liste des tests requis pour la production

Dans le Back Office SystemPay (**Paramétrage > Boutique > Clés**), vous devez :
1. Effectuer 2 paiements acceptés
2. Effectuer 2 paiements refusés
3. Avec différents types de cartes (CB, VISA, MASTERCARD, etc.)

Une fois ces tests validés, le bouton **"Générer la clé de production"** devient accessible.

---

## 🚀 Passage en production

### 1. Générer la clé de production

1. Effectuez tous les tests requis (voir ci-dessus)
2. Dans le Back Office : **Paramétrage > Boutique > Clés**
3. Cliquez sur **"Générer la clé de production"**
4. **IMPORTANT** : Copiez et sauvegardez cette clé immédiatement
   (elle sera masquée après le premier paiement réel)

### 2. Mettre à jour les variables d'environnement

Dans Netlify, modifiez :

```bash
SYSTEMPAY_CERTIFICATE=votre_cle_de_production   # Remplacez par la clé de PRODUCTION
SYSTEMPAY_CTX_MODE=PRODUCTION                   # Changez TEST en PRODUCTION
```

### 3. Vérifier les URLs de production

Assurez-vous que toutes les URLs pointent vers votre domaine de production :
- URL de retour
- URL IPN
- SYSTEMPAY_RETURN_URL

### 4. Premier paiement de production

⚠️ **Recommandation** :
1. Effectuez un paiement réel de test (minimum 2€)
2. Vérifiez que tout fonctionne de bout en bout
3. Vous pouvez annuler cette transaction depuis le Back Office
4. Ou laissez-la passer et effectuez un remboursement ensuite

---

## 📊 Flux de paiement

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Client reçoit email avec lien de paiement                    │
│    /payment?token=xxxxx                                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PaymentPage charge le formulaire                             │
│    → Appel à generate-systempay-form edge function             │
│    → Récupère devis + génère signature                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Redirection vers SystemPay                                    │
│    POST → https://paiement.systempay.fr/vads-payment/           │
│    avec tous les paramètres + signature                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Client saisit ses informations bancaires sur SystemPay       │
│    (page sécurisée PCI-DSS)                                     │
└─────────────────────────────────────────────────────────────────┘
                             │
                     ┌───────┴────────┐
                     │                │
                     ↓                ↓
        ┌─────────────────┐  ┌──────────────────┐
        │ 5a. IPN         │  │ 5b. Retour client│
        │ (serveur)       │  │ (navigateur)     │
        │                 │  │                  │
        │ systempay-ipn   │  │ payment-result   │
        │ → vérifie       │  │ → affiche        │
        │ → MAJ BDD       │  │   résultat       │
        │ → notif admin   │  │                  │
        └─────────────────┘  └──────────────────┘
```

---

## 🔐 Sécurité

### Signature HMAC-SHA-256

Chaque échange avec SystemPay est signé avec HMAC-SHA-256 :
1. **Envoi du formulaire** : signature calculée avec vos paramètres + clé
2. **Réception IPN** : signature vérifiée pour garantir l'authenticité

### Vérifications effectuées

L'IPN vérifie automatiquement :
- ✅ Présence du champ `vads_hash` (preuve que c'est une IPN)
- ✅ Validité de la signature
- ✅ Cohérence des données
- ✅ Idempotence (évite les doubles traitements)

---

## 🐛 Troubleshooting

### Problème : "SystemPay not configured"

**Solution** : Vérifiez que les variables d'environnement sont bien configurées dans Netlify :
- `SYSTEMPAY_SITE_ID`
- `SYSTEMPAY_CERTIFICATE`

### Problème : "Invalid signature"

**Causes possibles** :
1. Clé incorrecte dans les variables d'environnement
2. Algorithme de signature mal configuré (doit être HMAC-SHA-256)
3. Encodage UTF-8 non respecté

**Solution** :
- Vérifiez la clé dans le Back Office SystemPay
- Vérifiez l'algorithme de signature

### Problème : IPN non reçu

**Vérification** :
1. Dans le Back Office SystemPay : **Gestion > Transactions**
2. Cliquez sur une transaction
3. Onglet **Historique** → cherchez "Appel URL de notification"
4. Statut doit être **"Envoyé"**

**Si statut = "Erreur"** :
- Vérifiez que l'URL IPN est accessible publiquement
- Vérifiez les logs de l'edge function dans Netlify
- Vérifiez que le certificat SSL est valide

### Problème : Paiement accepté mais devis non mis à jour

**Causes** :
- L'IPN n'a pas été reçu ou a échoué
- Erreur dans le traitement de l'IPN

**Solution** :
1. Rejouez manuellement l'IPN depuis le Back Office :
   - Allez dans la transaction
   - Clic droit > **"Exécuter l'URL de notification"**
2. Vérifiez les logs de l'edge function `systempay-ipn`

---

## 📚 Ressources

- **Documentation SystemPay** : Disponible dans le fichier PDF fourni
- **Back Office Marchand** : https://paiement.systempay.fr/vads-merchant/
- **Support SystemPay** : Contactez votre compte gestionnaire

---

## ✨ Prochaines étapes possibles

1. **Email de confirmation** : Envoyer un email au client après paiement réussi
2. **Webhooks** : Notifier d'autres systèmes après paiement
3. **Mode embarqué** : Implémenter le formulaire JavaScript (future amélioration)
4. **Paiement en plusieurs fois** : Configurer des échéances multiples
5. **Remboursements** : Ajouter une interface admin pour rembourser

---

**✅ L'implémentation du mode redirection SystemPay est maintenant complète !**
