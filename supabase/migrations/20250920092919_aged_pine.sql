/*
  # Create devis storage bucket

  1. New Storage Bucket
    - `devis` bucket for storing PDF files temporarily
    - Public access disabled for security
    - File size limit set to 10MB
    - Allowed MIME types: application/pdf

  2. Security
    - RLS policies for authenticated users only
    - Users can upload and read their own files
*/

-- Create the devis bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'devis',
  'devis',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
CREATE POLICY "Authenticated users can upload devis files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'devis');

CREATE POLICY "Authenticated users can read devis files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'devis');

CREATE POLICY "Authenticated users can delete devis files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'devis');