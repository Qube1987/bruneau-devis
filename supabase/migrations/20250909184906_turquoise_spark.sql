/*
  # Create storage buckets for Ajax Devis Live

  1. Storage Buckets
    - `products` - For product images
    - `croquis` - For sketch files
    - `signatures` - For signature images

  2. Security
    - Public access for product images
    - Authenticated access for croquis and signatures
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('products', 'products', true),
  ('croquis', 'croquis', false),
  ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for products bucket (public read, authenticated write)
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products');

-- Policies for croquis bucket (authenticated only)
CREATE POLICY "Authenticated users can manage croquis"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'croquis');

-- Policies for signatures bucket (authenticated only)
CREATE POLICY "Authenticated users can manage signatures"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'signatures');