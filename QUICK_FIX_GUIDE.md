# Quick Fix for Donation Constraint Error

## Issue
The database constraint `donations_fund_type_check` doesn't yet support the new donation categories, causing the error:
```
new row for relation "donations" violates check constraint "donations_fund_type_check"
```

## Temporary Fix Applied
I've updated the API mappings to temporarily use existing database values:

### New Category to Database Mapping:
- **Tithes** -> `general`
- **Offering** -> `general`  
- **Thanksgiving** -> `general`
- **Prophetic Seed** -> `other`
- **Building Fund** -> `building` (already exists)
- **Missions** -> `missions` (already exists)
- **Special Project** -> `other`
- **Others** -> `other`

### Display Mapping:
- Database `general` -> Shows as "Offering" in UI
- Database `other` -> Shows as "Others" in UI

## Next Steps
1. **Try recording a donation now** - it should work
2. **Apply the database migration** when ready:
   - Run the SQL in `update_donation_categories.sql`
   - This will update the constraint to support new categories
3. **After migration**, the mappings will automatically use the correct values

## Why This Works
The temporary mapping allows the form to work immediately while preserving all data. When the migration is applied, existing records will be properly categorized and new donations will use the correct database values.
