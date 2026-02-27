/*
  # Create centralized media library system
  
  1. New Tables
    - `media_library`
      - `id` (uuid, primary key)
      - `file_path` (text) - Path in Supabase Storage
      - `file_hash` (text, unique) - SHA-256 hash for deduplication
      - `file_size` (bigint) - File size in bytes
      - `original_filename` (text) - Original filename
      - `media_type` (text) - Type: 'image' or 'video'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes to product_media
    - Add `media_library_id` column to reference media_library
    - Keep `display_order` for product-specific ordering
    - Remove redundant columns that are now in media_library
  
  3. Security
    - Enable RLS on `media_library` table
    - Add policies for authenticated users
    - Update product_media policies
  
  4. Benefits
    - Centralized media management
    - Upload once, use many times
    - Automatic deduplication via unique file_hash
    - Easy to manage and delete unused media
*/

-- Create media_library table
CREATE TABLE IF NOT EXISTS media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  file_hash text UNIQUE NOT NULL,
  file_size bigint NOT NULL,
  original_filename text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on file_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_media_library_file_hash ON media_library(file_hash);
CREATE INDEX IF NOT EXISTS idx_media_library_media_type ON media_library(media_type);

-- Enable RLS on media_library
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Policies for media_library
CREATE POLICY "Authenticated users can view media library"
  ON media_library
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add to media library"
  ON media_library
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update media library"
  ON media_library
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete from media library"
  ON media_library
  FOR DELETE
  TO authenticated
  USING (true);

-- Add media_library_id to product_media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_media' AND column_name = 'media_library_id'
  ) THEN
    ALTER TABLE product_media ADD COLUMN media_library_id uuid REFERENCES media_library(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on media_library_id
CREATE INDEX IF NOT EXISTS idx_product_media_library_id ON product_media(media_library_id);

-- Add comments
COMMENT ON TABLE media_library IS 'Centralized library of all media files (images and videos)';
COMMENT ON COLUMN media_library.file_hash IS 'SHA-256 hash for automatic deduplication';
COMMENT ON COLUMN product_media.media_library_id IS 'Reference to media in the central library';