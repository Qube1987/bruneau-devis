/*
  # Create devis table for Ajax Devis Live

  1. New Tables
    - `devis`
      - `id` (uuid, primary key)
      - `client` (jsonb) - Client information
      - `titre_affaire` (text) - Quote title/subject
      - `lignes` (jsonb) - Quote lines array
      - `totaux` (jsonb) - Totals object (ht, tva, ttc, acompte)
      - `observations` (text) - Additional observations
      - `options` (jsonb) - Options object (telesurveillance, leasing)
      - `signatures` (jsonb) - Signatures object (client, commercial)
      - `croquis_path` (text, nullable) - Path to sketch file
      - `status` (text) - Quote status (draft, sent, signed)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `devis` table
    - Add policy for authenticated users to manage their quotes
*/

CREATE TABLE IF NOT EXISTS devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client jsonb NOT NULL,
  titre_affaire text NOT NULL,
  lignes jsonb DEFAULT '[]'::jsonb,
  totaux jsonb DEFAULT '{"ht": 0, "tva": {}, "ttc": 0, "acompte": 0}'::jsonb,
  observations text DEFAULT '',
  options jsonb DEFAULT '{"telesurveillance": false, "leasing": false}'::jsonb,
  signatures jsonb DEFAULT '{}'::jsonb,
  croquis_path text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to manage their quotes
CREATE POLICY "Authenticated users can manage devis"
  ON devis
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_devis_updated_at 
    BEFORE UPDATE ON devis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();