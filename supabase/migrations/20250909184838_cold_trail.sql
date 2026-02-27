/*
  # Create products table for Ajax Devis Live

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `reference` (text, unique) - Product reference like "AJAX-XXX"
      - `name` (text) - Product name
      - `category` (text) - Product category for filtering
      - `description_short` (text) - Short description for catalog
      - `description_long` (text) - Detailed description
      - `price_ht` (numeric) - Price excluding tax
      - `default_vat_rate` (numeric) - Default VAT rate (10 or 20)
      - `photo_path` (text, nullable) - Path to product photo
      - `photo_square_path` (text, nullable) - Path to square thumbnail
      - `is_active` (boolean) - Whether product is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access to active products
    - Add policy for authenticated users to manage products

  3. Sample Data
    - Insert some sample Ajax products for testing
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description_short text NOT NULL,
  description_long text NOT NULL,
  price_ht numeric(10,2) NOT NULL,
  default_vat_rate numeric(4,2) DEFAULT 20.00,
  photo_path text,
  photo_square_path text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to active products
CREATE POLICY "Public can read active products"
  ON products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Policy for authenticated users to manage all products
CREATE POLICY "Authenticated users can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample Ajax products
INSERT INTO products (reference, name, category, description_short, description_long, price_ht, default_vat_rate) VALUES
('AJAX-HUB2', 'Hub 2', 'Centrales', 'Centrale d''alarme Ajax Hub 2', 'Centrale d''alarme sans fil Ajax Hub 2 avec communication Ethernet/Wi-Fi et GSM 2G/3G/4G. Gère jusqu''à 150 détecteurs et 50 télécommandes.', 299.00, 20.00),
('AJAX-MOTIONPROTECT', 'MotionProtect', 'Détecteurs', 'Détecteur de mouvement sans fil', 'Détecteur de mouvement PIR sans fil avec immunité aux animaux jusqu''à 20kg. Portée de détection 12m, angle 88.5°.', 79.00, 20.00),
('AJAX-DOORPROTECT', 'DoorProtect', 'Détecteurs', 'Détecteur d''ouverture magnétique', 'Détecteur d''ouverture de porte/fenêtre sans fil avec capteur magnétique. Détection d''ouverture, d''inclinaison et de choc.', 49.00, 20.00),
('AJAX-SPACECONTROL', 'SpaceControl', 'Télécommandes', 'Télécommande 4 boutons', 'Télécommande sans fil 4 boutons avec fonction panique. Portée jusqu''à 1300m en champ libre.', 39.00, 20.00),
('AJAX-STREETPROTECT', 'StreetProtect', 'Détecteurs', 'Détecteur extérieur', 'Détecteur de mouvement PIR extérieur sans fil avec double PIR et immunité aux animaux. Résistant aux intempéries IP54.', 199.00, 20.00),
('AJAX-HOMESIREN', 'HomeSiren', 'Sirènes', 'Sirène intérieure sans fil', 'Sirène d''alarme intérieure sans fil 105dB avec LED et batterie de secours. Autonomie jusqu''à 5 ans.', 89.00, 20.00),
('AJAX-STREETSIREN', 'StreetSiren', 'Sirènes', 'Sirène extérieure sans fil', 'Sirène d''alarme extérieure sans fil 113dB avec LED et protection anti-sabotage. Résistante aux intempéries IP54.', 159.00, 20.00),
('AJAX-KEYPAD', 'KeyPad', 'Claviers', 'Clavier sans fil tactile', 'Clavier de commande sans fil tactile avec écran OLED et lecteur de badges. Rétroéclairage adaptatif.', 119.00, 20.00),
('AJAX-TAG', 'Tag', 'Badges', 'Badge de désarmement', 'Badge RFID pour désarmement rapide du système. Résistant à l''eau et aux chocs.', 9.00, 20.00),
('AJAX-BUTTON', 'Button', 'Télécommandes', 'Bouton panique portable', 'Bouton d''urgence portable étanche avec fonction panique. Autonomie jusqu''à 5 ans.', 29.00, 20.00);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();