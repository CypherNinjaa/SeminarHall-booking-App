-- Fix User Relationships and Add Missing Profiles Table
-- This script fixes the foreign key relationship issues between bookings and users
-- Run this in your Supabase SQL editor AFTER admin_panel_schema.sql

-- =====================================================
-- 1. CREATE PROFILES TABLE (if it doesn't exist)
-- =====================================================

-- Profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255), -- For compatibility
    role VARCHAR(20) DEFAULT 'faculty' CHECK (role IN ('faculty', 'admin', 'super_admin')),
    department VARCHAR(255),
    employee_id VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE NOTIFICATIONS TABLE (referenced in services)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'welcome', 'role_change')),
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE TRIGGER FOR PROFILES AUTO-CREATION
-- =====================================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, full_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hall_id ON public.bookings(hall_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_halls_is_active ON public.halls(is_active);
CREATE INDEX IF NOT EXISTS idx_halls_name ON public.halls(name);

-- =====================================================
-- 5. UPDATE ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin') 
            AND is_active = TRUE
        )
    );

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin' 
            AND is_active = TRUE
        )
    );

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (TRUE);

-- =====================================================
-- 6. CREATE SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample admin user (if not exists)
INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    full_name, 
    role, 
    department, 
    employee_id, 
    is_active
)
SELECT 
    gen_random_uuid(),
    'admin@seminar-app.com',
    'System Administrator',
    'System Administrator',
    'admin',
    'IT Administration',
    'ADMIN001',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = 'admin@seminar-app.com'
);

-- Insert sample halls for testing (if none exist)
INSERT INTO public.halls (name, description, capacity, location, equipment, amenities, is_active)
SELECT 
    'Main Conference Hall',
    'Large conference hall suitable for seminars and meetings',
    100,
    'Ground Floor, Main Building',
    '["Projector", "Sound System", "Microphone", "Whiteboard"]'::jsonb,
    '["Air Conditioning", "WiFi", "Parking"]'::jsonb,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.halls LIMIT 1)

UNION ALL

SELECT 
    'Meeting Room A',
    'Small meeting room for team discussions',
    20,
    'First Floor, Main Building',
    '["TV Display", "Whiteboard"]'::jsonb,
    '["Air Conditioning", "WiFi"]'::jsonb,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.halls LIMIT 1)

UNION ALL

SELECT 
    'Auditorium',
    'Large auditorium for events and presentations',
    200,
    'Ground Floor, Academic Block',
    '["Projector", "Sound System", "Stage Lighting", "Microphone"]'::jsonb,
    '["Air Conditioning", "WiFi", "Parking", "Accessibility"]'::jsonb,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.halls LIMIT 1);

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Check if everything was created successfully
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'DATABASE RELATIONSHIP FIX COMPLETED!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Tables created/verified:';
    RAISE NOTICE '- profiles: %', (SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN 'EXISTS' ELSE 'MISSING' END);
    RAISE NOTICE '- notifications: %', (SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN 'EXISTS' ELSE 'MISSING' END);
    RAISE NOTICE '- bookings: %', (SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN 'EXISTS' ELSE 'MISSING' END);
    RAISE NOTICE '- halls: %', (SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'halls') THEN 'EXISTS' ELSE 'MISSING' END);
    RAISE NOTICE '';
    RAISE NOTICE 'Sample data:';
    RAISE NOTICE '- Halls: % created', (SELECT COUNT(*) FROM public.halls);
    RAISE NOTICE '- Admin profiles: % created', (SELECT COUNT(*) FROM public.profiles WHERE role IN ('admin', 'super_admin'));
    RAISE NOTICE '';
    RAISE NOTICE 'The foreign key relationship issues should now be fixed!';
    RAISE NOTICE 'Try refreshing your app to see if the errors are resolved.';
    RAISE NOTICE '===========================================';
END $$;
