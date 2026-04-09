-- Migration: Update donation categories
-- Run this SQL in Supabase SQL Editor to update the fund_type constraint

-- Step 1: Drop the existing constraint
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_fund_type_check;

-- Step 2: Update existing records to use new categories (MUST be done before adding new constraint)
UPDATE donations SET fund_type = 'offering' WHERE fund_type IN ('general', 'youth', 'children', 'benevolence', 'music');
UPDATE donations SET fund_type = 'other' WHERE fund_type NOT IN ('tithes', 'offering', 'thanksgiving', 'prophetic_seed', 'building', 'missions', 'special_project', 'other');

-- Step 3: Add the new constraint with updated categories
ALTER TABLE donations ADD CONSTRAINT donations_fund_type_check 
  CHECK (fund_type IN ('tithes', 'offering', 'thanksgiving', 'prophetic_seed', 'building', 'missions', 'special_project', 'other'));

-- Step 4: Update the default value
ALTER TABLE donations ALTER COLUMN fund_type SET DEFAULT 'offering';
