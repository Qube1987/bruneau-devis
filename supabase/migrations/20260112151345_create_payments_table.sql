/*
  # Create payments table for SystemPay transactions

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `devis_id` (uuid, foreign key to devis)
      - `transaction_id` (text, SystemPay trans_id)
      - `transaction_uuid` (text, SystemPay trans_uuid)
      - `amount` (numeric, amount in cents)
      - `currency` (text, default EUR)
      - `status` (text, payment status: pending, success, failed, cancelled)
      - `payment_method` (text, CB, VISA, MASTERCARD, etc.)
      - `card_brand` (text)
      - `card_number` (text, masked)
      - `auth_number` (text, authorization number)
      - `systempay_data` (jsonb, full IPN data)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `payments` table
    - Add policy for authenticated users to read all payments
    - Add policy for service role to insert/update payments (via webhook)

  3. Indexes
    - Add index on devis_id for quick lookups
    - Add index on transaction_id for IPN processing
    - Add unique constraint on transaction_uuid

  4. Devis Table Updates
    - Add payment_status column to track payment state
    - Add payment_link_token for secure payment links
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  transaction_id text,
  transaction_uuid text UNIQUE,
  amount numeric NOT NULL,
  currency text DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'abandoned')),
  payment_method text,
  card_brand text,
  card_number text,
  auth_number text,
  systempay_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS payments_devis_id_idx ON payments(devis_id);
CREATE INDEX IF NOT EXISTS payments_transaction_id_idx ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read payments
CREATE POLICY "Authenticated users can view payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for service role to insert payments (via webhook)
CREATE POLICY "Service role can insert payments"
  ON payments
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy for service role to update payments (via webhook)
CREATE POLICY "Service role can update payments"
  ON payments
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add payment_status to devis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE devis ADD COLUMN payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid'));
  END IF;
END $$;

-- Add payment_link_token to devis table for secure payment links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'payment_link_token'
  ) THEN
    ALTER TABLE devis ADD COLUMN payment_link_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');
  END IF;
END $$;

-- Create updated_at trigger for payments
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();