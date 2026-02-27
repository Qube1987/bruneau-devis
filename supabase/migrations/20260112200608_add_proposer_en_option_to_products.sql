/*
  # Ajouter le champ proposer_en_option aux produits

  1. Modifications
    - Ajoute la colonne `proposer_en_option` (boolean) à la table `products`
    - Valeur par défaut: false
    - Les produits marqués comme "proposer_en_option" seront disponibles comme options supplémentaires sur les devis en ligne
  
  2. Notes importantes
    - Cette fonctionnalité permet de proposer des équipements en options sur les devis clients
    - Les options sont regroupées par catégorie dans le devis en ligne
    - Seuls les produits cochés apparaîtront dans le menu d'options
*/

-- Ajouter la colonne proposer_en_option aux produits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'proposer_en_option'
  ) THEN
    ALTER TABLE products ADD COLUMN proposer_en_option boolean DEFAULT false;
  END IF;
END $$;