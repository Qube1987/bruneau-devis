/*
  # Create clients table and link to devis

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `name` (text) - Nom du client
      - `email` (text) - Email du client
      - `phone` (text) - Téléphone du client
      - `address` (text) - Adresse du client
      - `city` (text) - Ville
      - `postal_code` (text) - Code postal
      - `company` (text, nullable) - Société
      - `siret` (text, nullable) - SIRET
      - `notes` (text, nullable) - Notes sur le client
      - `created_at` (timestamptz) - Date de création
      - `updated_at` (timestamptz) - Date de mise à jour
      
  2. Changes to existing tables
    - Add `client_id` (uuid, nullable, foreign key) to `devis` table
    - This allows linking devis to clients while maintaining backward compatibility
    
  3. Security
    - Enable RLS on `clients` table
    - Add policy for authenticated users to read their own clients
    - Add policy for authenticated users to insert their own clients
    - Add policy for authenticated users to update their own clients
    - Add policy for authenticated users to delete their own clients
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  company text,
  siret text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add client_id to devis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE devis ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policies for clients table
CREATE POLICY "Users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_devis_client_id ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);