# Système de Miniatures - Documentation

## Vue d'ensemble

Un système automatique de génération de miniatures a été mis en place pour optimiser la taille des images et améliorer les performances de l'application, notamment pour les emails et les PDF.

## Problème résolu

Les images complètes (haute définition) étaient trop volumineuses et causaient des problèmes lors de l'envoi d'emails avec des PDF contenant des images de produits. Le système de miniatures réduit significativement la taille des fichiers.

## Fonctionnement

### Génération automatique

Chaque fois qu'une image est uploadée dans la bibliothèque de médias :

1. L'image originale est stockée dans Supabase Storage
2. Une miniature (400x400px, qualité 80%) est automatiquement générée
3. La miniature est stockée avec le suffixe `_thumb` (ex: `produit_thumb.jpg`)
4. Les deux chemins sont enregistrés dans la base de données

### Tables concernées

#### `media_library`
- `file_path` : chemin de l'image complète
- `thumbnail_path` : chemin de la miniature

#### `product_media`
- `file_path` : chemin de l'image complète
- `thumbnail_path` : chemin de la miniature (copié depuis media_library)

### Edge Function

**Fonction** : `generate-thumbnail`

**Paramètres** :
- `bucket` : nom du bucket Storage
- `filePath` : chemin de l'image originale
- `maxWidth` : largeur maximale (défaut: 400px)
- `maxHeight` : hauteur maximale (défaut: 400px)
- `quality` : qualité JPEG (défaut: 80%)

**Traitement** :
1. Télécharge l'image originale
2. Redimensionne en conservant le ratio
3. Convertit en JPEG avec compression
4. Upload la miniature avec le suffixe `_thumb`
5. Retourne le chemin de la miniature

## Utilisation des miniatures

### Dans le catalogue de produits (ProductCatalog)
- **Grille de produits** : miniatures
- **Modal de détails** : images complètes
- **Vignettes du carousel** : miniatures

### Dans le devis client (DevisViewer)
- **Cartes produits** : miniatures
- **Modal de détails** : images complètes

### Dans le PDF
- **Cartes produits** : miniatures (réduit drastiquement la taille du PDF)

### Dans l'outil de création de devis
- **Catalogue** : miniatures
- **Détails** : images complètes

## Avantages

### Performance
- **Chargement plus rapide** des pages avec de nombreux produits
- **Moins de bande passante** consommée
- **Meilleure expérience mobile**

### Emails
- **Taille réduite des PDF** (crucial pour l'envoi par email)
- **Moins de risque de rejet** par les serveurs mail
- **Envoi plus rapide**

### Expérience utilisateur
- **Images détaillées toujours disponibles** (en un clic)
- **Navigation fluide** dans le catalogue
- **Miniatures de qualité suffisante** pour identifier les produits

## Rétrocompatibilité

Le système est entièrement rétrocompatible :

- Les anciennes images sans miniatures continuent de fonctionner
- Les colonnes `photo_path` et `photo_square_path` restent supportées
- Si aucune miniature n'existe, l'image complète est utilisée

## Migration des images existantes

Pour générer des miniatures pour vos images existantes :

1. Allez dans la bibliothèque de médias
2. Supprimez l'image (elle sera marquée comme utilisée si associée à des produits)
3. Réuploadez la même image
4. La miniature sera automatiquement générée

**Ou via l'API** (pour migration en masse) :

```typescript
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`;

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    bucket: 'products',
    filePath: 'products/media/mon-image.jpg',
    maxWidth: 400,
    maxHeight: 400,
    quality: 80
  }),
});

const result = await response.json();
console.log('Thumbnail path:', result.thumbnailPath);
```

## Paramètres de miniatures

Les paramètres actuels sont optimisés pour un bon équilibre qualité/taille :

- **Dimensions** : 400x400px (ratio conservé)
- **Format** : JPEG
- **Qualité** : 80%

Ces paramètres peuvent être ajustés dans :
- `src/components/MediaLibrary.tsx` (ligne ~160)

## Tailles de fichiers (estimation)

**Image originale** : 2-5 MB
**Miniature** : 30-100 KB
**Gain** : 95-98% de réduction

## Maintenance

### Nettoyage des miniatures

Les miniatures sont automatiquement supprimées lorsque :
- L'image originale est supprimée de la bibliothèque
- Le média est retiré d'un produit (si plus utilisé ailleurs)

### Surveillance

Vérifiez régulièrement que les miniatures sont bien générées en consultant :
- La colonne `thumbnail_path` dans `media_library`
- Le bucket Storage `products` pour les fichiers `*_thumb.*`

## Dépannage

### Les miniatures ne sont pas générées

1. Vérifiez que l'edge function `generate-thumbnail` est déployée
2. Consultez les logs de l'edge function
3. Vérifiez les permissions du bucket Storage

### Les miniatures sont de mauvaise qualité

Augmentez le paramètre `quality` dans `MediaLibrary.tsx` (ligne ~161) :
```typescript
quality: 90  // Au lieu de 80
```

### Les PDF sont toujours trop lourds

Vérifiez que les miniatures sont bien utilisées dans `pdf-generator.ts` :
```typescript
const imagePath = primaryMedia.thumbnail_path || primaryMedia.file_path;
```

## Notes techniques

- **Bibliothèque utilisée** : imagescript (Deno)
- **Conversion automatique** : toutes les miniatures sont converties en JPEG
- **Ratio d'aspect** : toujours préservé
- **Redimensionnement** : proportionnel (fit dans 400x400)

## Support

Pour toute question ou problème, consultez :
- Les logs de l'edge function `generate-thumbnail`
- La console du navigateur pour les erreurs d'upload
- Les tables `media_library` et `product_media` pour vérifier les données
