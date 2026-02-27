# Guide - Gestion des médias produits

## Guide rapide

**Pour ajouter des images/vidéos à vos produits :**

1. Allez dans **Produits**
2. Cliquez sur **"Médias"** pour le produit souhaité
3. Glissez-déposez vos fichiers (ou cliquez pour sélectionner)
4. Réorganisez avec les flèches ↑↓ si besoin
5. C'est fait ! Les médias sont visibles dans tout le catalogue

## Vue d'ensemble

Le système supporte maintenant **plusieurs médias par produit** grâce à la table `product_media`. Vous pouvez ajouter autant d'images et de vidéos que vous voulez pour chaque produit.

**Une interface intuitive est disponible** dans la section "Produits" pour gérer facilement vos médias sans manipuler la base de données.

## Interface de gestion des médias (Recommandé)

### Accès à l'interface

1. Dans l'application, allez dans la section **Produits**
2. Dans le tableau des produits, cliquez sur le bouton **"Médias"** du produit souhaité
3. Une fenêtre modale s'ouvre avec tous les outils de gestion

### Fonctionnalités

**Upload de médias** :
- Zone de glisser-déposer ou clic pour sélectionner
- Support multi-fichiers
- Formats acceptés : Images (JPG, PNG, WebP) et Vidéos (MP4, WebM)
- Upload automatique vers Supabase Storage
- Création automatique des entrées en base de données

**Visualisation** :
- Grille d'aperçu de tous les médias
- Badge "Image principale" sur le premier média
- Type de média clairement identifié (Image/Vidéo)
- Nom du fichier affiché

**Réorganisation** :
- Boutons flèches **↑** et **↓** pour changer l'ordre
- Le premier média devient automatiquement l'image principale
- Mise à jour instantanée dans tout le catalogue

**Suppression** :
- Bouton de suppression avec confirmation
- Suppression automatique du fichier dans Storage
- Suppression de l'entrée en base de données

### Pourquoi utiliser l'interface ?

- **Plus simple** : Pas besoin de manipuler SQL ou Supabase directement
- **Plus sûr** : Gestion automatique des chemins et de l'ordre
- **Plus rapide** : Upload en quelques clics
- **Visuel** : Prévisualisation immédiate

## Structure de la table product_media

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | Identifiant unique du média |
| `product_id` | uuid | ID du produit (lien vers la table products) |
| `media_type` | text | Type de média : `'image'` ou `'video'` |
| `file_path` | text | Chemin du fichier dans Supabase Storage |
| `display_order` | integer | Ordre d'affichage (0, 1, 2, ...) |
| `title` | text | Titre/légende du média (optionnel) |
| `is_primary` | boolean | Si ce média est le principal (optionnel) |
| `created_at` | timestamptz | Date de création |

## Méthodes avancées (alternatives à l'interface)

Ces méthodes sont destinées aux utilisateurs avancés. Pour la plupart des cas, utilisez l'interface de gestion décrite ci-dessus.

### Méthode 1 : Via l'interface Supabase (Table Editor)

1. Connectez-vous à votre projet Supabase
2. Allez dans **Table Editor** > **product_media**
3. Cliquez sur **Insert row**
4. Remplissez les champs :
   - `product_id` : Sélectionnez le produit
   - `media_type` : Choisissez `image` ou `video`
   - `file_path` : Le chemin dans le bucket Storage (ex: `products/mon-produit-1.jpg`)
   - `display_order` : L'ordre d'affichage (0 pour le premier, 1 pour le deuxième, etc.)
   - `title` : Une légende (optionnel)
5. Cliquez sur **Save**

### Méthode 2 : Via SQL

```sql
-- Ajouter une image à un produit
INSERT INTO product_media (product_id, media_type, file_path, display_order)
VALUES (
  'UUID-DU-PRODUIT',
  'image',
  'products/mon-produit-1.jpg',
  0
);

-- Ajouter plusieurs médias d'un coup
INSERT INTO product_media (product_id, media_type, file_path, display_order)
VALUES
  ('UUID-DU-PRODUIT', 'image', 'products/mon-produit-1.jpg', 0),
  ('UUID-DU-PRODUIT', 'image', 'products/mon-produit-2.jpg', 1),
  ('UUID-DU-PRODUIT', 'video', 'products/mon-produit-demo.mp4', 2);
```

### Méthode 3 : Via l'API JavaScript

```javascript
import { supabase } from './lib/supabase';

// Ajouter un média
const { data, error } = await supabase
  .from('product_media')
  .insert({
    product_id: 'UUID-DU-PRODUIT',
    media_type: 'image',
    file_path: 'products/mon-produit-1.jpg',
    display_order: 0
  });
```

## Ordre d'affichage

Le système affiche les médias dans cet ordre :

1. **Si des médias existent dans `product_media`** :
   - Affiche tous les médias de la table triés par `display_order`

2. **Sinon (ancienne méthode)** :
   - Affiche `photo_square_path` en premier
   - Puis `photo_path` en deuxième (si différent)

## Exemples pratiques

### Exemple 1 : Produit avec 3 images

```sql
-- Obtenir l'UUID du produit
SELECT id FROM products WHERE reference = 'ALARME-001';

-- Ajouter 3 images
INSERT INTO product_media (product_id, media_type, file_path, display_order)
VALUES
  ('UUID-DU-PRODUIT', 'image', 'products/alarme-001-front.jpg', 0),
  ('UUID-DU-PRODUIT', 'image', 'products/alarme-001-back.jpg', 1),
  ('UUID-DU-PRODUIT', 'image', 'products/alarme-001-detail.jpg', 2);
```

### Exemple 2 : Produit avec images et vidéo

```sql
INSERT INTO product_media (product_id, media_type, file_path, display_order, title)
VALUES
  ('UUID-DU-PRODUIT', 'image', 'products/camera-front.jpg', 0, 'Vue de face'),
  ('UUID-DU-PRODUIT', 'image', 'products/camera-side.jpg', 1, 'Vue de côté'),
  ('UUID-DU-PRODUIT', 'video', 'products/camera-demo.mp4', 2, 'Démonstration');
```

### Exemple 3 : Réorganiser l'ordre

```sql
-- Changer l'ordre d'affichage
UPDATE product_media
SET display_order = 0
WHERE id = 'UUID-DU-MEDIA-3';

UPDATE product_media
SET display_order = 2
WHERE id = 'UUID-DU-MEDIA-1';
```

## Upload des fichiers dans Supabase Storage

Avant d'ajouter des entrées dans `product_media`, assurez-vous que les fichiers sont uploadés dans Supabase Storage :

1. Allez dans **Storage** > **products**
2. Cliquez sur **Upload file**
3. Sélectionnez vos images/vidéos
4. Notez le chemin complet (ex: `products/mon-fichier.jpg`)
5. Utilisez ce chemin dans la colonne `file_path`

## Migration depuis l'ancien système

Si vous avez des produits avec `photo_path` et `photo_square_path`, pas besoin de les migrer. Le système est **rétrocompatible** :

- Les produits **sans** médias dans `product_media` utilisent automatiquement `photo_path` et `photo_square_path`
- Les produits **avec** médias dans `product_media` utilisent uniquement cette table

Pour migrer un produit vers le nouveau système :

```sql
-- 1. Récupérer les anciennes photos
SELECT id, photo_path, photo_square_path FROM products WHERE id = 'UUID-DU-PRODUIT';

-- 2. Créer les entrées dans product_media
INSERT INTO product_media (product_id, media_type, file_path, display_order)
VALUES
  ('UUID-DU-PRODUIT', 'image', 'LE-PHOTO-SQUARE-PATH', 0),
  ('UUID-DU-PRODUIT', 'image', 'LE-PHOTO-PATH', 1);

-- 3. (Optionnel) Nettoyer les anciennes colonnes
UPDATE products
SET photo_path = NULL, photo_square_path = NULL
WHERE id = 'UUID-DU-PRODUIT';
```

## Support des vidéos

Le système supporte les vidéos avec `media_type = 'video'`. Les formats supportés dépendent du navigateur :

- **Recommandé** : MP4 (H.264)
- **Aussi supporté** : WebM, OGG

Exemple :
```sql
INSERT INTO product_media (product_id, media_type, file_path, display_order)
VALUES ('UUID-DU-PRODUIT', 'video', 'products/demo.mp4', 0);
```

## Affichage dans l'application

Le carrousel de médias est disponible dans deux endroits :

### 1. Page de création de devis (interface commerciale)

Quand vous créez un devis avec vos clients :
- La mosaïque des produits affiche la première image de chaque produit
- Cliquez sur le bouton "i" d'information pour ouvrir le carrousel complet
- Naviguez entre les médias avec les flèches gauche/droite
- Cliquez sur les miniatures en bas pour accéder directement à un média
- Les vidéos ont des contrôles complets (lecture, pause, volume, plein écran)
- Le compteur affiche la position actuelle (ex: "2 / 5")

### 2. Visualisation du devis client (lien public)

Quand un client consulte son devis via le lien public :
- Il voit la première image en miniature sur la carte produit
- En cliquant sur un produit, il ouvre le carrousel avec tous les médias
- Il peut naviguer entre les médias avec les flèches ou les miniatures
- Les vidéos sont lisibles directement dans le navigateur

## Questions fréquentes

**Q : Quelle est la meilleure façon d'ajouter des médias ?**
R : Utilisez l'interface de gestion dans la section "Produits". Cliquez sur "Médias" pour le produit souhaité, puis uploadez vos fichiers. C'est le moyen le plus simple et le plus sûr.

**Q : Combien de médias puis-je ajouter par produit ?**
R : Illimité, mais recommandé : 3-10 médias pour de bonnes performances.

**Q : Quelle taille maximale pour les fichiers ?**
R : Dépend de votre configuration Supabase Storage (généralement 50 MB par défaut).

**Q : Les anciennes photos sont-elles supprimées ?**
R : Non, le système est rétrocompatible. Les colonnes `photo_path` et `photo_square_path` restent fonctionnelles.

**Q : Comment supprimer un média ?**
R : Via l'interface de gestion (bouton "Médias" puis icône poubelle), ou dans Supabase Table Editor, sélectionnez la ligne dans `product_media` et cliquez sur Delete.

**Q : Comment marquer une image comme principale ?**
R : Dans l'interface de gestion, utilisez les flèches pour placer l'image en première position. Ou manuellement : utilisez `display_order = 0`.
