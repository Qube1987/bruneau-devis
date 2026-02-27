/*
  # Create product_media table for managing multiple media files per product

  1. New Tables
    - `product_media`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `media_type` (text) - Type: 'image' or 'video'
      - `file_path` (text) - Path in Supabase Storage
      - `display_order` (integer) - Order for displaying media
      - `title` (text, optional) - Title/caption for the media
      - `is_primary` (boolean) - Mark one as the primary/featured media
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `product_media` table
    - Add policy for authenticated users to read all media
    - Add policy for authenticated users to manage media
  
  3. Indexes
    - Add index on product_id for fast lookups
    - Add index on display_order for sorting
*/

CREATE TABLE IF NOT EXISTS product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  file_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  title text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_display_order ON product_media(product_id, display_order);

-- Enable RLS
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all product media
CREATE POLICY "Authenticated users can view product media"
  ON product_media
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert product media
CREATE POLICY "Authenticated users can add product media"
  ON product_media
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update product media
CREATE POLICY "Authenticated users can update product media"
  ON product_media
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete product media
CREATE POLICY "Authenticated users can delete product media"
  ON product_media
  FOR DELETE
  TO authenticated
  USING (true);
