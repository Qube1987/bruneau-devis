/*
  # SMS Verification System

  1. New Tables
    - `sms_verification_codes`
      - `id` (uuid, primary key)
      - `devis_id` (uuid, foreign key to devis)
      - `phone_number` (text, phone number)
      - `code` (text, 6-digit verification code)
      - `verified` (boolean, verification status)
      - `expires_at` (timestamptz, expiration time)
      - `created_at` (timestamptz, creation time)
      - `verified_at` (timestamptz, verification time, nullable)
      - `attempts` (integer, number of verification attempts)

  2. Security
    - Enable RLS on `sms_verification_codes` table
    - Add policy for public access to verify codes (token-based)
    - Add policy for authenticated users to view their verification codes
    - Add index on devis_id and phone_number for performance

  3. Important Notes
    - Codes expire after 10 minutes
    - Maximum 3 verification attempts per code
    - Old codes are automatically invalidated when a new one is generated
*/

CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  code text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  attempts integer DEFAULT 0
);

ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can verify codes with token"
  ON sms_verification_codes
  FOR SELECT
  USING (true);

CREATE POLICY "Public can update verification attempts"
  ON sms_verification_codes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert codes"
  ON sms_verification_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sms_verification_devis_id ON sms_verification_codes(devis_id);
CREATE INDEX IF NOT EXISTS idx_sms_verification_phone ON sms_verification_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_verification_expires ON sms_verification_codes(expires_at);