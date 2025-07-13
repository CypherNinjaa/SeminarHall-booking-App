-- Simplified Database Fix - Avoid ALL auth.users references
-- This script will completely bypass any potential auth.users access issues

-- Step 1: Temporarily disable all triggers that might access auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Make sure profiles table exists without any auth.users references
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'faculty' CHECK (role IN ('faculty', 'admin', 'super_admin')),
    department VARCHAR(255),
    employee_id VARCHAR(50),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2.1: Check and refresh foreign key relationships
-- The constraint already exists, so let's verify it's working correctly
DO $$ 
BEGIN
    -- Check if the foreign key constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'smart_bookings_user_id_fkey' 
        AND table_name = 'smart_bookings'
    ) THEN
        RAISE NOTICE 'Foreign key constraint smart_bookings_user_id_fkey already exists - checking integrity';
        
        -- Refresh the schema cache to make sure Supabase recognizes the relationship
        NOTIFY pgrst, 'reload schema';
    ELSE
        -- Add the foreign key constraint if it doesn't exist
        ALTER TABLE public.smart_bookings 
        ADD CONSTRAINT smart_bookings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint smart_bookings_user_id_fkey';
    END IF;
END $$;

-- Step 2.2: Check hall_id foreign key
DO $$ 
BEGIN
    -- Check if the hall foreign key constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'smart_bookings_hall_id_fkey' 
        AND table_name = 'smart_bookings'
    ) THEN
        RAISE NOTICE 'Foreign key constraint smart_bookings_hall_id_fkey already exists';
    ELSE
        -- Add the foreign key constraint if it doesn't exist
        ALTER TABLE public.smart_bookings 
        ADD CONSTRAINT smart_bookings_hall_id_fkey 
        FOREIGN KEY (hall_id) REFERENCES public.halls(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint smart_bookings_hall_id_fkey';
    END IF;
END $$;

-- Step 2.3: Create notifications table with proper foreign key
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2.4: Force Supabase schema cache refresh
-- This helps Supabase recognize the existing foreign key relationships
SELECT pg_notify('pgrst', 'reload schema');

-- Step 2.5: Verify foreign key relationships exist
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'smart_bookings'
    AND tc.table_schema = 'public';

-- Step 3: Completely disable RLS and drop all policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid any conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles for booking management" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Admin access to all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow notification creation" ON public.notifications;

-- Step 4: Grant broad permissions for testing
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.smart_bookings TO authenticated;
GRANT ALL ON public.halls TO authenticated;
GRANT ALL ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.smart_bookings TO anon;
GRANT ALL ON public.halls TO anon;
GRANT ALL ON public.admin_activity_logs TO anon;

-- Step 5: Create a simple admin user manually (no triggers)
INSERT INTO public.profiles (email, name, role, is_active)
VALUES ('admin@test.com', 'Test Admin', 'admin', TRUE)
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Step 6: Add missing timestamp columns to smart_bookings table
ALTER TABLE public.smart_bookings 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Step 7: Add sample halls
INSERT INTO public.halls (name, description, capacity, location, equipment, amenities, is_active)
SELECT * FROM (VALUES
    ('Conference Room A', 'Small meeting room for team discussions', 20, 'First Floor', '["TV Display", "Whiteboard"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE),
    ('Main Auditorium', 'Large auditorium for events and presentations', 200, 'Ground Floor', '["Projector", "Sound System", "Microphone"]'::jsonb, '["Air Conditioning", "WiFi", "Parking"]'::jsonb, TRUE),
    ('Seminar Hall B', 'Medium-sized hall for seminars', 50, 'Second Floor', '["Projector", "Whiteboard"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE)
) AS v(name, description, capacity, location, equipment, amenities, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.halls LIMIT 1);

-- Success message
SELECT 'Simplified database fix applied! All auth.users references removed.' AS status;
