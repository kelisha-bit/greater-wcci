# Database Migration: Update Donation Categories

## Overview
This migration updates the donation categories from the old fund types to the new church-specific categories.

## New Categories
- **Tithes** - Green badge
- **Offering** - Blue badge  
- **Thanksgiving** - Amber badge
- **Prophetic Seed** - Purple badge
- **Building Fund** - Rose badge
- **Missions** - Cyan badge
- **Special Project** - Indigo badge
- **Others** - Gray badge

## Migration Steps

### 1. Run SQL Migration
Execute the SQL in `update_donation_categories.sql` in your Supabase SQL Editor:

```sql
-- Step 1: Drop the existing constraint
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_fund_type_check;

-- Step 2: Add the new constraint with updated categories
ALTER TABLE donations ADD CONSTRAINT donations_fund_type_check 
  CHECK (fund_type IN ('tithes', 'offering', 'thanksgiving', 'prophetic_seed', 'building', 'missions', 'special_project', 'other'));

-- Step 3: Update existing records to use new categories
UPDATE donations SET fund_type = 'offering' WHERE fund_type IN ('general', 'youth', 'children', 'benevolence', 'music');
UPDATE donations SET fund_type = 'other' WHERE fund_type NOT IN ('tithes', 'offering', 'thanksgiving', 'prophetic_seed', 'building', 'missions', 'special_project', 'other');

-- Step 4: Update the default value
ALTER TABLE donations ALTER COLUMN fund_type SET DEFAULT 'offering';
```

### 2. Legacy Data Mapping
Existing records will be automatically mapped:
- `general` -> `offering`
- `youth` -> `offering`
- `children` -> `offering`
- `benevolence` -> `offering`
- `music` -> `offering`

### 3. Verification
After migration, verify:
1. All donation records have valid fund_type values
2. The donation form displays new categories correctly
3. Filters and charts work with new categories
4. Existing donations show appropriate category badges

## Rollback Plan
If needed, you can rollback by:
1. Restoring the old constraint
2. Mapping data back to old categories
3. Updating application code back to old categories

## Notes
- The application includes backward compatibility mappings
- New categories use snake_case in database (e.g., `prophetic_seed`)
- UI displays with proper spacing (e.g., "Prophetic Seed")
- Color-coded badges help distinguish categories visually
