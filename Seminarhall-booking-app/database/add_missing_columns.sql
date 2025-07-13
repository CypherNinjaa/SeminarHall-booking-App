-- Add missing timestamp columns to smart_bookings table
-- Execute this in Supabase SQL Editor to fix the "cancelled_at column not found" error

-- Step 1: Add missing columns to smart_bookings table
ALTER TABLE public.smart_bookings 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Step 2: Add admin_notes column if it doesn't exist
ALTER TABLE public.smart_bookings 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Step 3: Force schema cache refresh to ensure Supabase recognizes the new columns
SELECT pg_notify('pgrst', 'reload schema');

-- Step 4: Verify the columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'smart_bookings' 
  AND table_schema = 'public'
  AND column_name IN ('approved_at', 'approved_by', 'rejected_reason', 'cancelled_at', 'completed_at', 'admin_notes')
ORDER BY column_name;

-- Success message
SELECT 'Missing columns added to smart_bookings table successfully!' AS status;
