-- Diagnostic script to check the constraint issue
-- Run this in Supabase SQL Editor

-- 1. Check the current constraint definition
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as check_clause
FROM pg_constraint 
WHERE conname = 'donations_fund_type_check';

-- 2. Check existing fund_type values in the table
SELECT DISTINCT fund_type, COUNT(*) as count
FROM donations 
GROUP BY fund_type 
ORDER BY fund_type;

-- 3. Check recent failed attempts (if any)
SELECT * 
FROM donations 
WHERE fund_type NOT IN (
  'Tithes', 'Offering', 'Thanksgiving', 'Prophetic Seed', 
  'Building Fund', 'Missions', 'Special Project', 
  'Wednesday Service', 'Conference', 'Others'
);

-- 4. Check the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'donations' 
AND table_schema = 'public'
ORDER BY ordinal_position;
