-- Fix donation categories constraint to match frontend
-- Run this SQL in Supabase SQL Editor to fix the constraint violation

-- Step 1: Drop the existing constraint
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_fund_type_check;

-- Step 2: Update existing records to use proper case matching frontend
UPDATE donations SET fund_type = 'Tithes' WHERE fund_type = 'tithes';
UPDATE donations SET fund_type = 'Offering' WHERE fund_type = 'offering';
UPDATE donations SET fund_type = 'Thanksgiving' WHERE fund_type = 'thanksgiving';
UPDATE donations SET fund_type = 'Prophetic Seed' WHERE fund_type = 'prophetic_seed';
UPDATE donations SET fund_type = 'Building Fund' WHERE fund_type = 'building';
UPDATE donations SET fund_type = 'Missions' WHERE fund_type = 'missions';
UPDATE donations SET fund_type = 'Special Project' WHERE fund_type = 'special_project';
UPDATE donations SET fund_type = 'Others' WHERE fund_type = 'other';
UPDATE donations SET fund_type = 'Wednesday Service' WHERE fund_type = 'wednesday service';
UPDATE donations SET fund_type = 'Conference' WHERE fund_type = 'conference';

-- Step 3: Add the new constraint with proper case categories matching frontend
ALTER TABLE donations ADD CONSTRAINT donations_fund_type_check 
  CHECK (fund_type IN (
    'Tithes', 
    'Offering', 
    'Thanksgiving', 
    'Prophetic Seed', 
    'Building Fund', 
    'Missions', 
    'Special Project', 
    'Wednesday Service', 
    'Conference', 
    'Others'
  ));

-- Step 4: Update the default value
ALTER TABLE donations ALTER COLUMN fund_type SET DEFAULT 'Offering';

-- Step 5: Verify the constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as check_clause
FROM pg_constraint 
WHERE conname = 'donations_fund_type_check';
