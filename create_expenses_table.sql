-- =========================================
-- EXPENSES TABLE MIGRATION
-- Add expense tracking to ChurchApp
-- =========================================

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Basic Information
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,

  -- Categorization
  category TEXT CHECK (category IN (
    'utilities',           -- Electricity, water, gas, internet
    'salaries',            -- Staff salaries and wages
    'maintenance',         -- Building maintenance and repairs
    'supplies',            -- Office supplies, cleaning supplies
    'ministry',            -- Ministry-specific expenses
    'outreach',            -- Community outreach programs
    'missions',            -- Mission trips and support
    'events',              -- Event-related expenses
    'equipment',           -- Equipment purchase and maintenance
    'insurance',           -- Insurance premiums
    'professional_services', -- Legal, accounting, consulting
    'rent_mortgage',       -- Rent or mortgage payments
    'marketing',           -- Marketing and advertising
    'benevolence',         -- Benevolence fund disbursements
    'other'                -- Miscellaneous expenses
  )) DEFAULT 'other',

  -- Payment Details
  payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'card', 'bank_transfer', 'online', 'other')) DEFAULT 'cash',
  payment_reference TEXT,  -- Check number, transaction ID, etc.

  -- Vendor/Payee Information
  vendor_name TEXT,        -- Name of vendor or payee
  vendor_contact TEXT,     -- Contact information

  -- Budget and Approval
  budget_category TEXT,    -- Optional budget category for tracking
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Documentation
  receipt_url TEXT,        -- URL to receipt/invoice image in storage
  notes TEXT,

  -- Recurring Expenses
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),

  -- Metadata
  recorded_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor_name);
CREATE INDEX IF NOT EXISTS idx_expenses_approved ON expenses(is_approved);

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
-- Viewable by authenticated users
CREATE POLICY "Expenses are viewable by authenticated users" ON expenses
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insertable by staff and admins
CREATE POLICY "Expenses can be inserted by staff and admins" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'staff')
    )
  );

-- Updatable by staff and admins
CREATE POLICY "Expenses can be updated by staff and admins" ON expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'staff')
    )
  );

-- Deletable by admins only
CREATE POLICY "Expenses can be deleted by admins only" ON expenses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for recent expenses
CREATE OR REPLACE VIEW recent_expenses AS
SELECT
  id,
  created_at,
  description,
  amount,
  expense_date,
  category,
  payment_method,
  payment_reference,
  vendor_name,
  is_approved,
  notes,
  is_recurring,
  receipt_url
FROM expenses
ORDER BY expense_date DESC, created_at DESC
LIMIT 100;

-- Grant permissions
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON expenses TO service_role;
GRANT SELECT ON recent_expenses TO authenticated;
