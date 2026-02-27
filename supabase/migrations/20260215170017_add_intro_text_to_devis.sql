/*
  # Ajout de l'introduction générée par IA aux devis

  1. Modifications
    - Ajoute `intro_text` (text) : texte d'introduction généré par l'IA
    - Ajoute `intro_generated_at` (timestamptz) : date de génération de l'intro
    - Ajoute `intro_manual_edit` (boolean) : indique si l'intro a été modifiée manuellement
    
  2. Notes
    - Les champs sont optionnels (NULL autorisé)
    - `intro_manual_edit` permet de savoir si on peut régénérer automatiquement
    - Utilise IF NOT EXISTS pour éviter les erreurs si les colonnes existent déjà
*/

-- Ajouter la colonne intro_text si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'intro_text'
  ) THEN
    ALTER TABLE devis ADD COLUMN intro_text text;
  END IF;
END $$;

-- Ajouter la colonne intro_generated_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'intro_generated_at'
  ) THEN
    ALTER TABLE devis ADD COLUMN intro_generated_at timestamptz;
  END IF;
END $$;

-- Ajouter la colonne intro_manual_edit si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'intro_manual_edit'
  ) THEN
    ALTER TABLE devis ADD COLUMN intro_manual_edit boolean DEFAULT false;
  END IF;
END $$;