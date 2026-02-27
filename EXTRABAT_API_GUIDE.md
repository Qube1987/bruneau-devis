# Guide API Extrabat - Création de Devis

## Vue d'ensemble

Ce guide explique comment créer un devis dans Extrabat avec une liste d'articles en utilisant l'API Extrabat via notre proxy Supabase Edge Function.

## Prérequis

- Avoir accès à l'environnement Supabase configuré
- Disposer des credentials Extrabat (API Key, Company ID, etc.)
- Avoir un client Extrabat existant (avec son ID)

## Architecture

```
Application → Supabase Edge Function (extrabat-proxy) → API Extrabat
```

L'Edge Function `extrabat-proxy` sert de proxy sécurisé pour toutes les requêtes vers l'API Extrabat.

## Endpoint

```
POST https://[VOTRE_PROJET].supabase.co/functions/v1/extrabat-proxy
```

## Authentification

Inclure le header suivant dans toutes les requêtes :

```typescript
headers: {
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
}
```

## Structure de la requête

### Créer un devis avec articles

```typescript
const requestBody = {
  endpoint: '/estimates',
  method: 'POST',
  body: {
    // Informations du devis
    client_id: 12345,              // ID du client Extrabat (obligatoire)
    name: "Devis travaux toiture", // Nom du devis
    reference: "DEV-2024-001",     // Référence unique (optionnel)
    status: "draft",               // Statut: "draft", "sent", "accepted", "refused"

    // Dates
    date: "2024-01-15",            // Date du devis (format: YYYY-MM-DD)
    validity_date: "2024-02-15",   // Date de validité (optionnel)

    // Description
    description: "Travaux de rénovation de toiture avec pose d'isolant",

    // Options commerciales
    discount_percentage: 0,         // Remise globale en % (optionnel)
    discount_amount: 0,            // Remise globale en € (optionnel)

    // Articles du devis
    lines: [
      {
        product_id: 789,           // ID du produit Extrabat (obligatoire)
        designation: "Tuile mécanique",  // Description de l'article
        quantity: 50,              // Quantité
        unit_price: 12.50,         // Prix unitaire HT
        discount_percentage: 0,    // Remise sur la ligne en %
        vat_rate: 20,             // Taux de TVA en %
        unit: "m²",               // Unité (optionnel)
        order_index: 1            // Ordre d'affichage
      },
      {
        product_id: 790,
        designation: "Laine de roche 200mm",
        quantity: 45,
        unit_price: 18.00,
        discount_percentage: 0,
        vat_rate: 20,
        unit: "m²",
        order_index: 2
      },
      {
        product_id: 791,
        designation: "Main d'œuvre pose toiture",
        quantity: 8,
        unit_price: 45.00,
        discount_percentage: 0,
        vat_rate: 20,
        unit: "h",
        order_index: 3
      }
    ]
  }
};
```

## Exemple de code complet

### TypeScript / JavaScript

```typescript
async function createExtrabatDevis(devisData: {
  clientId: number;
  name: string;
  reference?: string;
  description?: string;
  articles: Array<{
    productId: number;
    designation: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
    unit?: string;
  }>;
}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const apiUrl = `${supabaseUrl}/functions/v1/extrabat-proxy`;

  // Préparer les lignes d'articles
  const lines = devisData.articles.map((article, index) => ({
    product_id: article.productId,
    designation: article.designation,
    quantity: article.quantity,
    unit_price: article.unitPrice,
    discount_percentage: 0,
    vat_rate: article.vatRate || 20,
    unit: article.unit || "u",
    order_index: index + 1
  }));

  // Créer le corps de la requête
  const requestBody = {
    endpoint: '/estimates',
    method: 'POST',
    body: {
      client_id: devisData.clientId,
      name: devisData.name,
      reference: devisData.reference || `DEV-${Date.now()}`,
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      description: devisData.description || '',
      discount_percentage: 0,
      discount_amount: 0,
      lines: lines
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erreur Extrabat: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('Devis créé avec succès:', result);

    return {
      success: true,
      devisId: result.id,
      data: result
    };

  } catch (error) {
    console.error('Erreur lors de la création du devis:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Exemple d'utilisation
const result = await createExtrabatDevis({
  clientId: 12345,
  name: "Devis travaux toiture",
  reference: "DEV-2024-001",
  description: "Rénovation complète de la toiture",
  articles: [
    {
      productId: 789,
      designation: "Tuile mécanique",
      quantity: 50,
      unitPrice: 12.50,
      vatRate: 20,
      unit: "m²"
    },
    {
      productId: 790,
      designation: "Laine de roche 200mm",
      quantity: 45,
      unitPrice: 18.00,
      vatRate: 20,
      unit: "m²"
    }
  ]
});

if (result.success) {
  console.log(`Devis créé avec l'ID: ${result.devisId}`);
} else {
  console.error(`Erreur: ${result.error}`);
}
```

## Réponse de l'API

### Succès (201 Created)

```json
{
  "id": 67890,
  "client_id": 12345,
  "name": "Devis travaux toiture",
  "reference": "DEV-2024-001",
  "status": "draft",
  "date": "2024-01-15",
  "validity_date": "2024-02-15",
  "description": "Travaux de rénovation de toiture avec pose d'isolant",
  "total_ht": 1935.00,
  "total_ttc": 2322.00,
  "total_vat": 387.00,
  "lines": [
    {
      "id": 111,
      "product_id": 789,
      "designation": "Tuile mécanique",
      "quantity": 50,
      "unit_price": 12.50,
      "total_ht": 625.00,
      "vat_rate": 20,
      "unit": "m²",
      "order_index": 1
    },
    {
      "id": 112,
      "product_id": 790,
      "designation": "Laine de roche 200mm",
      "quantity": 45,
      "unit_price": 18.00,
      "total_ht": 810.00,
      "vat_rate": 20,
      "unit": "m²",
      "order_index": 2
    },
    {
      "id": 113,
      "product_id": 791,
      "designation": "Main d'œuvre pose toiture",
      "quantity": 8,
      "unit_price": 45.00,
      "total_ht": 360.00,
      "vat_rate": 20,
      "unit": "h",
      "order_index": 3
    }
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Erreur (4xx ou 5xx)

```json
{
  "error": "Client not found",
  "code": "CLIENT_NOT_FOUND",
  "details": "Le client avec l'ID 12345 n'existe pas"
}
```

## Gestion des erreurs courantes

### 1. Client introuvable

```
Erreur: Client not found
Solution: Vérifier que le client_id existe dans Extrabat
```

### 2. Produit introuvable

```
Erreur: Product not found
Solution: Vérifier que tous les product_id existent dans le catalogue Extrabat
```

### 3. Données invalides

```
Erreur: Invalid data
Solution: Vérifier le format des champs (dates, nombres, etc.)
```

### 4. Authentification échouée

```
Erreur: Unauthorized
Solution: Vérifier les credentials Extrabat dans les variables d'environnement
```

## Autres opérations disponibles

### Récupérer un devis

```typescript
{
  endpoint: '/estimates/{id}',
  method: 'GET'
}
```

### Mettre à jour un devis

```typescript
{
  endpoint: '/estimates/{id}',
  method: 'PUT',
  body: {
    status: 'sent',
    // autres champs à mettre à jour
  }
}
```

### Supprimer un devis

```typescript
{
  endpoint: '/estimates/{id}',
  method: 'DELETE'
}
```

### Lister les devis

```typescript
{
  endpoint: '/estimates',
  method: 'GET',
  params: {
    page: 1,
    per_page: 50,
    status: 'draft' // optionnel
  }
}
```

## Récupérer l'ID d'un produit Extrabat

Pour trouver le `product_id` d'un article :

```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/extrabat-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    endpoint: '/products',
    method: 'GET',
    params: {
      search: 'tuile',  // Recherche par nom
      page: 1,
      per_page: 20
    }
  })
});

const products = await response.json();
console.log(products); // Liste des produits avec leurs IDs
```

## Récupérer l'ID d'un client Extrabat

Pour trouver le `client_id` :

```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/extrabat-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    endpoint: '/clients',
    method: 'GET',
    params: {
      search: 'Dupont',  // Recherche par nom
      page: 1,
      per_page: 20
    }
  })
});

const clients = await response.json();
console.log(clients); // Liste des clients avec leurs IDs
```

## Variables d'environnement requises

Assurez-vous que ces variables sont configurées dans Supabase :

```env
EXTRABAT_API_KEY=votre_cle_api
EXTRABAT_COMPANY_ID=votre_company_id
EXTRABAT_API_URL=https://api.extrabat.com/v1
```

## Notes importantes

1. **IDs Extrabat** : Les `product_id` et `client_id` doivent exister dans votre base Extrabat
2. **Références uniques** : La référence du devis doit être unique
3. **Calculs automatiques** : Les totaux (HT, TTC, TVA) sont calculés automatiquement par Extrabat
4. **Statuts** : Les statuts disponibles sont : `draft`, `sent`, `accepted`, `refused`, `archived`
5. **TVA** : Le taux de TVA standard est 20%, mais peut être 5.5%, 10%, ou 0% selon les cas
6. **Unités** : Les unités courantes sont : `u` (unité), `m²` (mètre carré), `ml` (mètre linéaire), `h` (heure), `kg`, `l`, etc.

## Support

Pour toute question sur l'API Extrabat, consultez :
- Documentation officielle Extrabat
- Notre fichier `EXTRABAT_SETUP.md` pour la configuration initiale
- Les logs de l'Edge Function `extrabat-proxy` pour le débogage
