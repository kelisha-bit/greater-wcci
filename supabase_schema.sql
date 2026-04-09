-- =========================================
-- CHURCHAPP DATABASE SCHEMA
-- Complete Supabase PostgreSQL schema for ChurchApp
-- =========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- CORE TABLES
-- =========================================

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Basic Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,

  -- Personal Details
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  occupation TEXT,

  -- Church Information
  membership_status TEXT CHECK (membership_status IN ('active', 'inactive', 'visitor', 'new', 'pending')) DEFAULT 'visitor',
  join_date DATE NOT NULL,
  baptism_date DATE,
  role TEXT NOT NULL DEFAULT 'member',
  primary_ministry TEXT,
  education TEXT,
  hometown TEXT,

  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,

  -- Additional Info
  profile_image_url TEXT,
  departments TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Ministries/Groups table
CREATE TABLE IF NOT EXISTS ministries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES members(id),
  category TEXT CHECK (category IN ('worship', 'outreach', 'fellowship', 'education', 'children', 'youth', 'senior', 'other')) DEFAULT 'other',
  is_active BOOLEAN DEFAULT TRUE,

  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Member-Ministry relationships
CREATE TABLE IF NOT EXISTS member_ministries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('leader', 'member', 'volunteer')) DEFAULT 'member',
  joined_date DATE DEFAULT CURRENT_DATE,

  UNIQUE(member_id, ministry_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,

  location TEXT,
  event_type TEXT CHECK (event_type IN ('service', 'meeting', 'outreach', 'fellowship', 'conference', 'workshop', 'other')) DEFAULT 'service',
  max_attendees INTEGER,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- JSON string for complex recurrence rules

  organizer_id UUID REFERENCES auth.users(id),
  ministry_id UUID REFERENCES ministries(id),

  status TEXT CHECK (status IN ('draft', 'published', 'cancelled', 'completed')) DEFAULT 'draft',
  is_public BOOLEAN DEFAULT TRUE,

  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Event registrations/attendees
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT CHECK (status IN ('registered', 'confirmed', 'cancelled', 'attended')) DEFAULT 'registered',
  notes TEXT,

  UNIQUE(event_id, member_id)
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE,
  attendance_status TEXT CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  notes TEXT,

  recorded_by UUID REFERENCES auth.users(id),

  -- Unique constraint: one attendance record per member per event
  UNIQUE(member_id, event_id)
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  donor_id UUID REFERENCES members(id) ON DELETE SET NULL,
  donor_name TEXT, -- For anonymous or non-member donors
  donor_email TEXT,

  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  donation_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'card', 'online', 'bank_transfer', 'other')) DEFAULT 'cash',
  payment_reference TEXT, -- Check number, transaction ID, etc.

  fund_type TEXT CHECK (fund_type IN ('tithes', 'offering', 'thanksgiving', 'prophetic_seed', 'building', 'missions', 'special_project', 'other')) DEFAULT 'offering',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),

  notes TEXT,
  receipt_number TEXT UNIQUE,
  is_tax_deductible BOOLEAN DEFAULT TRUE,

  recorded_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Sermons table
CREATE TABLE IF NOT EXISTS sermons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  title TEXT NOT NULL,
  speaker TEXT NOT NULL,
  speaker_id UUID REFERENCES members(id) ON DELETE SET NULL,

  sermon_date DATE NOT NULL,
  service_time TIME,
  duration_minutes INTEGER,

  ministry_id UUID REFERENCES ministries(id),
  series_title TEXT,
  scripture_reference TEXT,

  description TEXT,
  key_verse TEXT,

  -- Media files
  video_url TEXT,
  audio_url TEXT,
  transcript_url TEXT,
  notes_url TEXT,

  -- Metadata
  tags TEXT[], -- Array of tags for searching
  is_featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  title TEXT NOT NULL,
  content TEXT NOT NULL,

  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  category TEXT CHECK (category IN ('general', 'event', 'ministry', 'urgent', 'spiritual', 'other')) DEFAULT 'general',

  -- Visibility and timing
  is_active BOOLEAN DEFAULT TRUE,
  published_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE,

  -- Target audience
  target_ministries UUID[] DEFAULT '{}', -- Array of ministry IDs
  target_audience TEXT CHECK (target_audience IN ('all', 'members_only', 'staff_only', 'ministry_specific')) DEFAULT 'all',

  -- Contact info
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  author_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Reports table (stores generated report metadata and results)
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('attendance', 'donations', 'membership', 'ministry', 'financial', 'custom')) NOT NULL,
  description TEXT,

  -- Report parameters
  parameters JSONB DEFAULT '{}', -- Store filter criteria, date ranges, etc.
  generated_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Date range
  start_date DATE,
  end_date DATE,
  period TEXT, -- 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'

  -- Results
  data JSONB, -- Store the actual report data
  summary JSONB, -- Store summary statistics

  -- Metadata
  generated_by UUID REFERENCES auth.users(id),
  file_url TEXT, -- If report is exported to file
  is_scheduled BOOLEAN DEFAULT FALSE
);

-- Settings table (global application settings)
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

-- File attachments table (for storing file metadata)
CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size INTEGER,
  mime_type TEXT,
  bucket_name TEXT NOT NULL,

  -- Associated records
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,

  -- Metadata
  category TEXT CHECK (category IN ('profile', 'event', 'sermon', 'announcement', 'document', 'other')) DEFAULT 'other',
  description TEXT,

  uploaded_by UUID REFERENCES auth.users(id)
);

-- =========================================
-- AUDIT AND LOGGING TABLES
-- =========================================

-- Audit log for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,

  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],

  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT
);

-- User roles and permissions
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'staff', 'member', 'guest')) DEFAULT 'member',
  permissions JSONB DEFAULT '{}', -- Store specific permissions

  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  UNIQUE(user_id)
);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_join_date ON members(join_date);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(first_name, last_name);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_ministry ON events(ministry_id);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(attendance_status);

-- Donations indexes
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_fund_type ON donations(fund_type);
CREATE INDEX IF NOT EXISTS idx_donations_amount ON donations(amount);

-- Sermons indexes
CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons(sermon_date);
CREATE INDEX IF NOT EXISTS idx_sermons_speaker ON sermons(speaker);
CREATE INDEX IF NOT EXISTS idx_sermons_series ON sermons(series_title);
CREATE INDEX IF NOT EXISTS idx_sermons_tags ON sermons USING GIN(tags);

-- Announcements indexes
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_expiry ON announcements(expiry_date);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);

-- File attachments indexes
CREATE INDEX IF NOT EXISTS idx_file_attachments_member ON file_attachments(member_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_event ON file_attachments(event_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_sermon ON file_attachments(sermon_id);

-- =========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Admin check for RLS: must be plpgsql (not SQL) so Postgres does not inline this into
-- policy expressions — inlined SQL would ignore SET row_security and cause 42P17 recursion on user_roles.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO service_role;

-- Staff/admin check for members (and other) write policies — matches policy names ("staff and admins").
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO service_role;

-- Members policies (drop + create so policy text updates when you re-run this file)
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON public.members;
CREATE POLICY "Members are viewable by authenticated users" ON public.members
  FOR SELECT USING (
    public.is_staff_or_admin()
    OR email = (auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Members can be inserted by staff and admins" ON public.members;
CREATE POLICY "Members can be inserted by staff and admins" ON public.members
  FOR INSERT WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS "Members can be updated by staff and admins" ON public.members;
CREATE POLICY "Members can be updated by staff and admins" ON public.members
  FOR UPDATE
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- Events policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Events are viewable by authenticated users'
      AND tablename = 'events'
  ) THEN
    CREATE POLICY "Events are viewable by authenticated users" ON events
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Events can be managed by staff and admins'
      AND tablename = 'events'
  ) THEN
    CREATE POLICY "Events can be managed by staff and admins" ON events
      FOR ALL USING (is_admin_user());
  END IF;
END $$;

-- Attendance policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Attendance is viewable by authenticated users'
      AND tablename = 'attendance'
  ) THEN
    CREATE POLICY "Attendance is viewable by authenticated users" ON attendance
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Attendance can be managed by staff and admins'
      AND tablename = 'attendance'
  ) THEN
    CREATE POLICY "Attendance can be managed by staff and admins" ON attendance
      FOR ALL USING (is_admin_user());
  END IF;
END $$;

-- Donations policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Donations are viewable by authenticated users'
      AND tablename = 'donations'
  ) THEN
    CREATE POLICY "Donations are viewable by authenticated users" ON donations
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Donations can be inserted by authenticated users'
      AND tablename = 'donations'
  ) THEN
    CREATE POLICY "Donations can be inserted by authenticated users" ON donations
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Donations can be updated by staff and admins'
      AND tablename = 'donations'
  ) THEN
    CREATE POLICY "Donations can be updated by staff and admins" ON donations
      FOR UPDATE USING (is_admin_user());
  END IF;
END $$;

-- Sermons policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Sermons are viewable by everyone'
      AND tablename = 'sermons'
  ) THEN
    CREATE POLICY "Sermons are viewable by everyone" ON sermons
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Sermons can be managed by staff and admins'
      AND tablename = 'sermons'
  ) THEN
    CREATE POLICY "Sermons can be managed by staff and admins" ON sermons
      FOR ALL USING (is_admin_user());
  END IF;
END $$;

-- Announcements policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Announcements are viewable by authenticated users'
      AND tablename = 'announcements'
  ) THEN
    CREATE POLICY "Announcements are viewable by authenticated users" ON announcements
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Announcements can be managed by staff and admins'
      AND tablename = 'announcements'
  ) THEN
    CREATE POLICY "Announcements can be managed by staff and admins" ON announcements
      FOR ALL USING (is_admin_user());
  END IF;
END $$;

-- Settings policies (only admins can modify)
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
      FOR ALL USING (is_admin_user());
  END IF;
END $$;

-- User roles: drop every policy on this table first (extra dashboard policies cause 42P17).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
  END LOOP;
END $$;

-- Split SELECT so the common path does not call is_admin_user(). Admins use FOR ALL (includes SELECT).
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
-- =========================================
-- FUNCTIONS AND TRIGGERS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_donations_updated_at ON donations;
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sermons_updated_at ON sermons;
CREATE TRIGGER update_sermons_updated_at BEFORE UPDATE ON sermons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate receipt numbers for donations
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_seq INTEGER;
  new_receipt_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_seq
  FROM donations
  WHERE receipt_number LIKE current_year || '-%';

  new_receipt_number := current_year || '-' || LPAD(next_seq::TEXT, 6, '0');
  RETURN new_receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate receipt numbers
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_donation_receipt_number ON donations;
CREATE TRIGGER set_donation_receipt_number BEFORE INSERT ON donations
  FOR EACH ROW EXECUTE FUNCTION set_receipt_number();

-- Function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  old_row JSONB;
  new_row JSONB;
  changed_fields TEXT[];
BEGIN
  -- Convert rows to JSONB
  old_row := CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  new_row := CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;

  -- Get changed fields for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key)
    INTO changed_fields
    FROM jsonb_object_keys(old_row) AS key
    WHERE old_row->key != new_row->key;
  END IF;

  -- Insert audit record
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_fields,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    TG_OP,
    old_row,
    new_row,
    changed_fields,
    auth.uid()
  );

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to key tables (optional - uncomment if needed)
-- CREATE TRIGGER audit_members AFTER INSERT OR UPDATE OR DELETE ON members
--   FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =========================================
-- INITIAL DATA
-- =========================================

-- Insert default settings
INSERT INTO settings (
  church_name,
  time_zone,
  currency,
  language
) VALUES (
  'ChurchApp',
  'America/New_York',
  'USD',
  'en'
) ON CONFLICT DO NOTHING;

-- Insert default admin role for the first user (you may need to adjust this)
-- This will be set up through the application after initial user creation

-- =========================================
-- VIEWS FOR COMMON QUERIES
-- =========================================

-- Active members view
CREATE OR REPLACE VIEW active_members AS
SELECT * FROM members
WHERE membership_status = 'active'
ORDER BY join_date DESC;

-- Upcoming events view
CREATE OR REPLACE VIEW upcoming_events AS
SELECT * FROM events
WHERE event_date >= CURRENT_DATE
  AND status = 'published'
ORDER BY event_date, start_time;

-- Recent donations view
CREATE OR REPLACE VIEW recent_donations AS
SELECT
  d.id,
  d.created_at,
  d.updated_at,
  d.donor_id,
  d.donor_name,
  d.donor_email,
  d.amount,
  d.donation_date,
  d.payment_method,
  d.payment_reference,
  d.fund_type,
  d.is_recurring,
  d.recurring_frequency,
  d.notes,
  d.receipt_number,
  d.is_tax_deductible,
  d.recorded_by,
  d.updated_by,
  m.first_name,
  m.last_name,
  m.email as member_email
FROM donations d
LEFT JOIN members m ON d.donor_id = m.id
ORDER BY d.donation_date DESC, d.created_at DESC
LIMIT 100;

-- Monthly attendance summary view
CREATE OR REPLACE VIEW monthly_attendance_summary AS
SELECT
  DATE_TRUNC('month', check_in_time) as month,
  COUNT(*) as total_attendance,
  COUNT(DISTINCT member_id) as unique_members,
  AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600) as avg_duration_hours
FROM attendance
WHERE attendance_status = 'present'
GROUP BY DATE_TRUNC('month', check_in_time)
ORDER BY month DESC;

-- =========================================
-- USEFUL QUERIES FOR REPORTING
-- =========================================

-- Membership growth over time
-- SELECT
--   DATE_TRUNC('month', join_date) as month,
--   COUNT(*) as new_members
-- FROM members
-- GROUP BY DATE_TRUNC('month', join_date)
-- ORDER BY month;

-- Donation totals by fund type
-- SELECT
--   fund_type,
--   SUM(amount) as total_amount,
--   COUNT(*) as donation_count
-- FROM donations
-- WHERE donation_date >= '2024-01-01'
-- GROUP BY fund_type
-- ORDER BY total_amount DESC;

-- Event attendance rates
-- SELECT
--   e.title,
--   e.event_date,
--   COUNT(er.id) as registered,
--   COUNT(a.id) as attended,
--   ROUND(COUNT(a.id)::decimal / NULLIF(COUNT(er.id), 0) * 100, 2) as attendance_rate
-- FROM events e
-- LEFT JOIN event_registrations er ON e.id = er.event_id
-- LEFT JOIN attendance a ON e.id = a.event_id AND a.attendance_status = 'present'
-- GROUP BY e.id, e.title, e.event_date
-- ORDER BY e.event_date DESC;
