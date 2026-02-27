# Système de Devis HTML Responsive + PDF Officiel

## Vue d'ensemble

Ce système propose une expérience de devis moderne en deux formats synchronisés :

1. **Devis HTML Responsive** - Version optimisée pour lecture sur tous les appareils
2. **PDF Officiel** - Document contractuel téléchargeable

## Fonctionnalités principales

### 1. Création de devis

- Saisie des informations client (manuelle ou via recherche Extrabat)
- Ajout de produits depuis le catalogue
- Calcul automatique des totaux (HT, TVA, TTC, Acompte)
- Ajout de croquis et signatures
- Génération automatique d'un token d'accès sécurisé

### 2. Devis HTML Responsive

#### Caractéristiques
- URL unique et sécurisée : `/devis/{token}`
- Design mobile-first optimisé pour smartphone, tablette et desktop
- Pas d'authentification requise pour consulter
- Interface moderne et professionnelle

#### Sections du devis HTML
- **En-tête** : Logo, informations de base, statut d'acceptation
- **Informations client** : Nom, adresse, coordonnées, date et validité
- **Titre de l'affaire** : Description du projet
- **Détail des prestations** : Cartes produits avec accordéons pour les détails
- **Options** : Crédit/Leasing, Télésurveillance
- **Observations** : Informations complémentaires
- **Récapitulatif** : Totaux et acompte avec mise en avant visuelle
- **Informations légales** : Validité, conditions de paiement, délais

#### Actions disponibles (barre fixe en bas)
- 📄 **Télécharger le PDF** - Génère et télécharge le PDF officiel
- 📞 **Nous contacter** - Lien téléphonique direct
- ✅ **Accepter le devis** - Formulaire de validation avec checkbox de confirmation

### 3. PDF Officiel

#### Caractéristiques
- Format A4 figé (non responsive)
- Design sobre et professionnel
- Valeur contractuelle
- Synchronisé avec les données du devis HTML

#### Contenu identique au HTML
- Toutes les informations du devis
- Même présentation produit (avec images et descriptions)
- Totaux identiques
- Croquis annexé sur une page séparée si disponible

### 4. Envoi par email

Lors de l'envoi d'un devis, l'email contient :

- **Lien vers le devis HTML** - Bouton cliquable pour consulter en ligne
- **PDF en pièce jointe** - Document officiel joint automatiquement
- **Message personnalisé** - Si ajouté par l'utilisateur
- **Récapitulatif** - Montant total et acompte
- **Validité** - Date d'expiration du devis (30 jours)
- **Coordonnées de contact** - Téléphone, email, site web

### 5. Acceptation de devis

#### Processus d'acceptation
1. Le client clique sur "Accepter le devis" dans la vue HTML
2. Une modale s'affiche avec :
   - Récapitulatif du montant total et de l'acompte
   - Checkbox de confirmation obligatoire
   - Boutons "Annuler" et "Confirmer l'acceptation"
3. Après validation :
   - Enregistrement de la date d'acceptation
   - Enregistrement de l'IP (identifiant client web)
   - Changement du statut à "accepted"
   - Affichage d'un bandeau de confirmation
   - Message de suivi : "Nous vous contacterons prochainement"

#### Suivi dans l'interface admin
Dans la liste des devis, vous voyez :
- ✅ **Badge "Accepté"** avec date d'acceptation
- ⏰ **Badge "En attente"** pour les devis non acceptés
- 🔗 **Bouton "Lien"** pour copier l'URL de visualisation

## Sécurité et accès

### Token d'accès
- Généré automatiquement à la création/sauvegarde du devis
- 64 caractères hexadécimaux (256 bits d'entropie)
- Unique par devis
- Permet l'accès public sans authentification

### Politiques RLS (Row Level Security)
- Les utilisateurs anonymes peuvent lire les devis via token valide
- Les utilisateurs anonymes peuvent mettre à jour le statut d'acceptation
- Les utilisateurs authentifiés ont accès à tous leurs devis

## Architecture technique

### Base de données
Nouvelles colonnes dans la table `devis` :
- `access_token` (text, unique) - Token sécurisé
- `accepted_at` (timestamptz) - Date d'acceptation
- `accepted_ip` (text) - IP du client
- `accepted_status` (text) - 'pending', 'accepted', 'rejected'

### Composants
- `DevisViewer.tsx` - Vue publique responsive du devis
- `DevisForm.tsx` - Formulaire de création/édition (mis à jour)
- `DevisList.tsx` - Liste des devis avec statuts (mis à jour)

### Utilitaires
- `token-utils.ts` - Génération de tokens et URLs publiques
- `email-service.ts` - Envoi d'emails avec lien HTML (mis à jour)
- `pdf-generator.ts` - Génération de PDF (inchangé)

### Hooks
- `useDevis.ts` - Gestion des devis avec support des tokens (mis à jour)

## Workflow complet

1. **Création du devis**
   - L'utilisateur crée un nouveau devis
   - Un token d'accès est généré automatiquement
   - Le devis est sauvegardé en base de données

2. **Envoi au client**
   - L'utilisateur clique sur "Envoyer par email"
   - Le système génère le PDF
   - Un email est envoyé avec :
     - Le lien vers le devis HTML responsive
     - Le PDF en pièce jointe

3. **Consultation par le client**
   - Le client reçoit l'email
   - Il peut consulter le devis HTML sur n'importe quel appareil
   - Il peut télécharger le PDF officiel
   - Il peut accepter le devis directement en ligne

4. **Acceptation**
   - Le client lit le devis
   - Il clique sur "Accepter le devis"
   - Il confirme son acceptation via checkbox
   - Le statut est mis à jour en temps réel

5. **Suivi**
   - L'utilisateur voit le statut "Accepté" dans la liste
   - La date d'acceptation est enregistrée
   - Le lien reste accessible pour consultation

## Avantages du système

### Pour le client
- **Confort de lecture** : Design responsive adapté à tous les écrans
- **Accessibilité** : Pas besoin de télécharger un PDF pour consulter
- **Simplicité** : Acceptation en un clic avec confirmation claire
- **Flexibilité** : PDF disponible pour impression et archivage

### Pour l'entreprise
- **Professionnalisme** : Expérience moderne et soignée
- **Traçabilité** : Date et IP d'acceptation enregistrées
- **Efficacité** : Réduction des allers-retours email/téléphone
- **Conversion** : Interface optimisée pour l'acceptation

### Technique
- **Synchronisation parfaite** : Une seule source de données
- **Sécurité** : Accès contrôlé par token unique
- **Performance** : HTML rapide, PDF téléchargeable à la demande
- **Responsive** : Adapté à tous les appareils sans compromis
