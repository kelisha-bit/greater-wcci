-- Fix settings table issues
-- Run this in Supabase SQL Editor if settings table doesn't exist or has no rows

-- First, clean up any duplicate settings rows (keep only the oldest one)
DELETE FROM settings
WHERE id NOT IN (
  SELECT id FROM settings ORDER BY created_at ASC LIMIT 1
);

-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Church Information
  church_name TEXT NOT NULL DEFAULT 'ChurchApp',
  church_email TEXT,
  church_phone TEXT,
  church_address TEXT,
  church_city TEXT,
  church_state TEXT,
  church_zip_code TEXT,
  church_website TEXT,

  -- Regional Settings
  time_zone TEXT NOT NULL DEFAULT 'America/New_York',
  currency TEXT NOT NULL DEFAULT 'USD',
  language TEXT NOT NULL DEFAULT 'en',

  -- Feature Flags
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,

  -- Church-specific settings
  default_service_time TIME DEFAULT '10:00',
  membership_fee DECIMAL(10,2) DEFAULT 0,
  donation_tax_deductible BOOLEAN DEFAULT TRUE,

  -- System settings
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT,

  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Settings are viewable by authenticated users'
      AND tablename = 'settings'
  ) THEN
    CREATE POLICY "Settings are viewable by authenticated users" ON settings
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Settings can be modified by admins only'
      AND tablename = 'settings'
  ) THEN
    CREATE POLICY "Settings can be modified by admins only" ON settings
      FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role = 'admin'
      )
    );
  END IF;
END $$;

-- Insert default settings if no row exists
INSERT INTO settings (church_name, time_zone, currency, language)
SELECT 'ChurchApp', 'America/New_York', 'USD', 'en'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
