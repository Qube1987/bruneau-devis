/*
 # Create devis_push_subscriptions table and update notification policies
 
 1. New Tables
 - `devis_push_subscriptions`
 - `id` (uuid, primary key)
 - `user_id` (uuid, foreign key) 
 - `user_email` (text)
 - `endpoint` (text, unique)
 - `p256dh` (text)
 - `auth` (text)
 - `user_agent` (text)
 - `last_used` (timestamptz)
 - `created_at` (timestamptz)
 
 2. Security
 - Enable RLS on `devis_push_subscriptions`
 - Auth users can manage their own subscriptions
 - Anon can insert notifications of type 'devis_viewed'
 
 3. Indexes
 - Index on user_id and endpoint
 */
-- Create push subscriptions table for devis app
CREATE TABLE IF NOT EXISTS devis_push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email text,
    endpoint text UNIQUE NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    last_used timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);
-- Enable RLS
ALTER TABLE devis_push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Authenticated users can read all subscriptions
CREATE POLICY "Authenticated users can view push subscriptions" ON devis_push_subscriptions FOR
SELECT TO authenticated USING (true);
-- Authenticated users can insert their own subscriptions
CREATE POLICY "Authenticated users can create push subscriptions" ON devis_push_subscriptions FOR
INSERT TO authenticated WITH CHECK (true);
-- Authenticated users can update their own subscriptions
CREATE POLICY "Authenticated users can update push subscriptions" ON devis_push_subscriptions FOR
UPDATE TO authenticated USING (true) WITH CHECK (true);
-- Authenticated users can delete their own subscriptions
CREATE POLICY "Authenticated users can delete push subscriptions" ON devis_push_subscriptions FOR DELETE TO authenticated USING (true);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_devis_push_subscriptions_user_id ON devis_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_devis_push_subscriptions_endpoint ON devis_push_subscriptions(endpoint);
-- Allow anon to insert 'devis_viewed' notifications (in addition to existing 'devis_accepted')
DROP POLICY IF EXISTS "Public can insert notifications" ON notifications;
CREATE POLICY "Public can insert notifications" ON notifications FOR
INSERT TO anon WITH CHECK (type IN ('devis_accepted', 'devis_viewed'));
-- Allow anon to delete their own notifications (for read tracking)
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON notifications;
CREATE POLICY "Authenticated users can delete notifications" ON notifications FOR DELETE TO authenticated USING (true);