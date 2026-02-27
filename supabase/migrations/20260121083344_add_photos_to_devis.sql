/*
  # Ajouter la colonne photos au devis

  1. Modifications
    - Ajoute une colonne `photos` à la table `devis`
    - Type: jsonb (tableau de chaînes de caractères contenant les images en base64)
    - Valeur par défaut: NULL (optionnel)

  2. Description
    - Permet de stocker plusieurs photos en annexe d'un devis
    - Ces photos seront affichées dans le PDF et dans l'email
*/

-- Ajouter la colonne photos à la table devis
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devis' AND column_name = 'photos'
  ) THEN
    ALTER TABLE devis ADD COLUMN photos jsonb DEFAULT NULL;
  END IF;
END $$;
