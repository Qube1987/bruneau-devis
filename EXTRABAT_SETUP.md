# Configuration de l'intégration Extrabat

## Vue d'ensemble

L'application synchronise automatiquement les devis créés avec l'API Extrabat lorsque le client possède un ID Extrabat. Cette synchronisation se fait en arrière-plan et n'empêche pas la création du devis localement si elle échoue.

## Configuration

### 1. Obtenir vos clés API Extrabat

⚠️ **IMPORTANT** : Extrabat utilise **deux clés** pour l'authentification :
- Une **clé API** (`X-EXTRABAT-API-KEY`)
- Une **clé de sécurité** (`X-EXTRABAT-SECURITY`)

1. Connectez-vous à votre compte Extrabat
2. Accédez aux **paramètres de votre compte** ou à la section **API**
3. Récupérez vos deux clés :
   - **Clé API** (X-EXTRABAT-API-KEY)
   - **Clé de sécurité** (X-EXTRABAT-SECURITY)
4. Conservez ces clés précieusement

### 2. Configurer les clés API dans Supabase

Les deux clés Extrabat doivent être configurées comme secrets dans Supabase :

#### En développement local
Ajoutez les deux variables dans votre fichier `.env` :
```bash
EXTRABAT_API_KEY=votre_cle_api_extrabat
EXTRABAT_SECURITY_KEY=votre_cle_securite_extrabat
```

#### En production (Supabase)
1. Allez dans le dashboard Supabase de votre projet
2. Naviguez vers **Settings** > **Edge Functions** > **Secrets**
3. Ajoutez les deux secrets :

   **Première clé** :
   - Nom : `EXTRABAT_API_KEY`
   - Valeur : votre clé API Extrabat

   **Deuxième clé** :
   - Nom : `EXTRABAT_SECURITY_KEY`
   - Valeur : votre clé de sécurité Extrabat

## Fonctionnement

### Synchronisation automatique

Lorsqu'un nouveau devis est créé avec un client ayant un `extrabat_id`, le système :

1. **Sauvegarde le devis localement** dans la base de données
2. **Appelle automatiquement l'API Extrabat** via la fonction Edge `sync-devis-to-extrabat`
3. **Stocke l'ID Extrabat** retourné dans le champ `extrabat_devis_id` du devis

### Données synchronisées

Les informations suivantes sont envoyées à Extrabat :

**Informations du devis :**
- Date de création
- Titre de l'affaire
- Totaux (HT, TTC, TVA)
- Adresses de facturation et livraison
- Commentaires/observations

**Lignes de devis :**
- Référence produit
- Nom de l'article
- Description
- Quantité
- Prix unitaire HT
- Taux de TVA
- Totaux (HT, TVA, TTC)

### Gestion des erreurs

Si la synchronisation échoue :
- Le devis est tout de même sauvegardé localement
- Une erreur est enregistrée dans la console
- L'utilisateur peut continuer à travailler normalement

## Structure des données

### Champ `extrabat_devis_id`

Un nouveau champ `extrabat_devis_id` a été ajouté à la table `devis` pour stocker la référence du devis côté Extrabat. Ce champ permet de :
- Suivre les devis synchronisés
- Éviter les duplications
- Créer des liens bidirectionnels entre les systèmes

## API Extrabat utilisée

**Endpoint :** `POST https://api.extrabat.com/v1/client/{client_id}/devis`

**Authentification :** Headers personnalisés
- `X-EXTRABAT-API-KEY` : Votre clé API
- `X-EXTRABAT-SECURITY` : Votre clé de sécurité

L'intégration utilise l'API REST d'Extrabat pour créer les devis. Consultez la documentation Extrabat pour plus de détails sur les champs disponibles et les formats acceptés.

## Dépannage

### Erreur "Missing Extrabat API keys"
- Vérifiez que les deux variables `EXTRABAT_API_KEY` et `EXTRABAT_SECURITY_KEY` sont bien configurées dans Supabase
- Les deux clés sont obligatoires pour l'authentification
- Redéployez la fonction Edge si nécessaire

### Erreur d'authentification (401)
- **Vérifiez que vous avez bien configuré les deux clés** (API_KEY et SECURITY_KEY)
- Assurez-vous que les clés n'ont pas de retours à la ligne ou d'espaces superflus
- Vérifiez que les clés sont valides dans votre compte Extrabat
- Régénérez de nouvelles clés dans votre compte Extrabat si nécessaire
- Vérifiez les logs de la fonction Edge dans Supabase pour plus de détails

### Erreur "Client does not have an Extrabat ID"
- Le client doit être importé depuis Extrabat ou avoir un ID Extrabat assigné
- Vérifiez que le champ `extrabat_id` est bien renseigné dans la table `clients`

### La synchronisation échoue silencieusement
- Consultez les logs de la fonction Edge dans le dashboard Supabase
- Vérifiez que l'API Extrabat est accessible
- Contrôlez que vos clés API ont les permissions nécessaires

## Développement

### Tester la synchronisation localement

Pour tester la fonction Edge localement :

```bash
# Démarrer Supabase en local
supabase start

# Tester la fonction
curl -i --location --request POST 'http://localhost:54321/functions/v1/sync-devis-to-extrabat' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"devisId":"uuid-du-devis"}'
```

### Modifier la logique de synchronisation

La fonction Edge se trouve dans :
```
supabase/functions/sync-devis-to-extrabat/index.ts
```

Après modification, redéployez avec :
```bash
supabase functions deploy sync-devis-to-extrabat
```
