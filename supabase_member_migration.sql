-- ============================================================================
-- CHURCHAPP MEMBER SCHEMA MIGRATION
-- Enhances the existing 'members' table with all required fields from the application.
-- ============================================================================

-- Start a transaction for safety
BEGIN;

-- 1. Add missing columns to 'members' table
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS primary_ministry TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS hometown TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
  ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT '{}';

-- 2. Update membership_status constraint to align with application
-- First, drop the existing constraint if it exists (names may vary, but supabase_schema.sql uses 'members_membership_status_check')
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_membership_status_check;

-- Add updated constraint including 'new' (though 'visitor' is used in backend, 'new' is used in frontend)
ALTER TABLE public.members 
  ADD CONSTRAINT members_membership_status_check 
  CHECK (membership_status IN ('active', 'inactive', 'visitor', 'new', 'pending'));

-- 3. Add column comments for documentation
COMMENT ON COLUMN public.members.id IS 'Unique identifier for the member (UUID)';
COMMENT ON COLUMN public.members.first_name IS 'Member''s legal first name';
COMMENT ON COLUMN public.members.last_name IS 'Member''s legal last name';
COMMENT ON COLUMN public.members.email IS 'Primary email address (must be unique)';
COMMENT ON COLUMN public.members.phone IS 'Primary contact phone number';
COMMENT ON COLUMN public.members.date_of_birth IS 'Date of birth for age-based ministry grouping';
COMMENT ON COLUMN public.members.address IS 'Residential street address';
COMMENT ON COLUMN public.members.city IS 'Residential city';
COMMENT ON COLUMN public.members.state IS 'Residential state/province';
COMMENT ON COLUMN public.members.zip_code IS 'Residential postal code';
COMMENT ON COLUMN public.members.marital_status IS 'Current marital status';
COMMENT ON COLUMN public.members.occupation IS 'Current professional occupation';
COMMENT ON COLUMN public.members.membership_status IS 'Current standing in the church (active, inactive, visitor, new, pending)';
COMMENT ON COLUMN public.members.join_date IS 'Date the member officially joined the church';
COMMENT ON COLUMN public.members.baptism_date IS 'Date of baptism, if applicable';
COMMENT ON COLUMN public.members.role IS 'Assigned role within the church organization (e.g., member, deacon, elder)';
COMMENT ON COLUMN public.members.primary_ministry IS 'The main ministry the member is involved with';
COMMENT ON COLUMN public.members.education IS 'Highest level of education completed';
COMMENT ON COLUMN public.members.hometown IS 'Original place of birth or family home';
COMMENT ON COLUMN public.members.emergency_contact_name IS 'Full name of the emergency contact';
COMMENT ON COLUMN public.members.emergency_contact_phone IS 'Phone number of the emergency contact';
COMMENT ON COLUMN public.members.emergency_contact_relationship IS 'Relationship to the member (e.g., spouse, parent)';
COMMENT ON COLUMN public.members.departments IS 'List of departments the member is active in';
COMMENT ON COLUMN public.members.notes IS 'Internal administrative notes about the member';

-- 4. Ensure optimal indexing for the new fields
CREATE INDEX IF NOT EXISTS idx_members_role ON public.members(role);
CREATE INDEX IF NOT EXISTS idx_members_primary_ministry ON public.members(primary_ministry);
CREATE INDEX IF NOT EXISTS idx_members_departments ON public.members USING GIN(departments);

-- 5. Data integrity: Ensure no NULL first_name/last_name (if existing rows had issues)
UPDATE public.members SET first_name = 'Unknown' WHERE first_name IS NULL;
UPDATE public.members SET last_name = 'Unknown' WHERE last_name IS NULL;
ALTER TABLE public.members ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.members ALTER COLUMN last_name SET NOT NULL;

-- 6. Add updated_at trigger if not exists (to ensure updated_at is always current)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_members_updated_at') THEN
        CREATE TRIGGER set_members_updated_at
        BEFORE UPDATE ON public.members
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION TEST CASES (SQL)
-- ============================================================================

/*
-- Test Case 1: Insert a full member record
INSERT INTO public.members (
    first_name, last_name, email, role, membership_status, join_date, 
    primary_ministry, departments, emergency_contact_relationship
) VALUES (
    'Test', 'User', 'test@example.com', 'member', 'active', CURRENT_DATE,
    'Worship', ARRAY['Worship Team', 'Youth'], 'Spouse'
);

-- Test Case 2: Verify search by department
SELECT * FROM public.members WHERE 'Worship Team' = ANY(departments);

-- Test Case 3: Verify role constraint/default
INSERT INTO public.members (first_name, last_name, email, join_date)
VALUES ('Default', 'Role', 'default@example.com', CURRENT_DATE);
SELECT role FROM public.members WHERE email = 'default@example.com'; -- Should be 'member'
*/
