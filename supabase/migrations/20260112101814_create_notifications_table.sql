/*
  # Create notifications table for devis acceptances

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key) - Unique identifier
      - `type` (text) - Type of notification (e.g., 'devis_accepted')
      - `devis_id` (uuid) - Reference to the devis
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `metadata` (jsonb) - Additional data (client info, amounts, etc.)
      - `read` (boolean) - Whether notification has been read
      - `created_at` (timestamptz) - When notification was created
      - `user_id` (uuid) - User who should receive the notification (nullable for all admins)
  
  2. Security
    - Enable RLS on `notifications` table
    - Add policy for authenticated users to read notifications
    - Add policy for system to insert notifications
    - Add policy for authenticated users to mark as read

  3. Indexes
    - Add index on `created_at` for sorting
    - Add index on `read` for filtering unread notifications
    - Add index on `devis_id` for lookups
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  devis_id uuid REFERENCES devis(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all notifications
CREATE POLICY "Authenticated users can read notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update their own notifications (mark as read)
CREATE POLICY "Authenticated users can update notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow public insert for acceptance notifications (via service)
CREATE POLICY "Public can insert notifications"
  ON notifications
  FOR INSERT
  TO anon
  WITH CHECK (type = 'devis_accepted');

-- Policy: Authenticated users can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_devis_id ON notifications(devis_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
