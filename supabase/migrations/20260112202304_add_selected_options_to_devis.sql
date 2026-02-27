/*
  # Ajouter le champ selected_options à la table devis

  1. Modifications
    - Ajoute la colonne `selected_options` (jsonb) à la table `devis`
    - Stocke les options de produits sélectionnées par le client lors de l'acceptation
    - Format: [{ product_id: string, quantity: number }]
  
  2. Notes importantes
    - Ce champ permet de conserver la trace des options ajoutées par le client
    - Utile pour la génération de PDF et la facturation
*/

-- Ajouter la colonne selected_options au devis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devis' AND column_name = 'selected_options'
  ) THEN
    ALTER TABLE devis ADD COLUMN selected_options jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;