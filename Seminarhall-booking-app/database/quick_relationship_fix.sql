-- Quick Database Fix for Foreign Key Relationships
-- Run this in your Supabase SQL editor to fix the booking-user relationship errors

-- Step 1: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'faculty' CHECK (role IN ('faculty', 'admin', 'super_admin')),
    department VARCHAR(255),
    employee_id VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create notifications table if it doesn't exist  
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

-- Step 3: Create trigger for auto-creating profiles when users sign up
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

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Enable RLS and create policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Step 5: Add sample admin user and test data
INSERT INTO public.profiles (
    id, email, name, full_name, role, department, employee_id, is_active
)
SELECT 
    gen_random_uuid(),
    'admin@test.com',
    'Test Admin',
    'Test Administrator',
    'admin',
    'Administration',
    'ADMIN001',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = 'admin@test.com'
);

-- Step 6: Add sample halls if none exist
INSERT INTO public.halls (name, description, capacity, location, equipment, amenities, is_active)
SELECT * FROM (VALUES
    ('Conference Room A', 'Small meeting room for team discussions', 20, 'First Floor', '["TV Display", "Whiteboard"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE),
    ('Main Auditorium', 'Large auditorium for events and presentations', 200, 'Ground Floor', '["Projector", "Sound System", "Microphone"]'::jsonb, '["Air Conditioning", "WiFi", "Parking"]'::jsonb, TRUE),
    ('Seminar Hall B', 'Medium-sized hall for seminars', 50, 'Second Floor', '["Projector", "Whiteboard"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE)
) AS v(name, description, capacity, location, equipment, amenities, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.halls LIMIT 1);

-- Success message
SELECT 'Database relationships fixed! The foreign key errors should now be resolved.' AS status;
