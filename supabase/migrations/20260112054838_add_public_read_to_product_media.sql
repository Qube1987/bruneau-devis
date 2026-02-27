/*
  # Autoriser la lecture publique des médias produits
  
  1. Changements
    - Ajoute une policy SELECT publique sur product_media
    - Permet aux utilisateurs non authentifiés de lire les médias des produits
    - Nécessaire pour afficher le carrousel dans les devis publics
  
  2. Sécurité
    - Lecture seule (SELECT uniquement)
    - Les modifications restent réservées aux utilisateurs authentifiés
*/

-- Ajouter une policy de lecture publique pour product_media
CREATE POLICY "Anyone can view product media"
  ON product_media
  FOR SELECT
  TO anon, authenticated
  USING (true);
