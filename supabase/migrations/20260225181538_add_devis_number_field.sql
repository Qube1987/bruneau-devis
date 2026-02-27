/*
  # Ajout du champ devis_number à la table devis

  1. Modifications
    - Ajout de la colonne `devis_number` (text, nullable) à la table `devis`
    - Ce champ stockera le numéro de devis retourné par l'API Extrabat (champ "code")
  
  2. Notes
    - Le champ est nullable car les devis existants n'ont pas encore de numéro
    - Ce numéro sera automatiquement assigné lors de la synchronisation avec Extrabat
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'devis_number'
  ) THEN
    ALTER TABLE devis ADD COLUMN devis_number text;
  END IF;
END $$;