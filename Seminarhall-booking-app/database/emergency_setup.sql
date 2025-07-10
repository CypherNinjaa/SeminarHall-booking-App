-- Emergency Database Setup - Run this in Supabase SQL Editor
-- This creates minimal required tables and data to test the app immediately

-- Create profiles table (simplified)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'faculty',
    department VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add sample admin user
INSERT INTO public.profiles (id, email, name, role, department, is_active)
VALUES (
    gen_random_uuid(),
    'admin@test.com',
    'Test Administrator',
    'admin',
    'Administration',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Add sample regular user
INSERT INTO public.profiles (id, email, name, role, department, is_active)
VALUES (
    gen_random_uuid(),
    'user@test.com',
    'Test User',
    'faculty',
    'Computer Science',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Ensure halls table exists with sample data
INSERT INTO public.halls (name, description, capacity, location, equipment, amenities, is_active)
SELECT * FROM (VALUES
    ('Conference Room A', 'Small meeting room for team discussions', 20, 'First Floor', '["TV Display", "Whiteboard"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE),
    ('Main Auditorium', 'Large auditorium for events and presentations', 200, 'Ground Floor', '["Projector", "Sound System", "Microphone"]'::jsonb, '["Air Conditioning", "WiFi", "Parking"]'::jsonb, TRUE),
    ('Seminar Hall B', 'Medium-sized hall for seminars', 50, 'Second Floor', '["Projector", "Whiteboard"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE),
    ('Meeting Room C', 'Small meeting room', 15, 'Third Floor', '["Whiteboard"]'::jsonb, '["Air Conditioning"]'::jsonb, TRUE),
    ('Lab Room 101', 'Computer lab with projector', 30, 'First Floor', '["Computers", "Projector"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE)
) AS v(name, description, capacity, location, equipment, amenities, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.halls LIMIT 1);

-- Add sample bookings for testing (using actual hall and user IDs)
DO $$
DECLARE
    sample_hall_id UUID;
    sample_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get sample IDs
    SELECT id INTO sample_hall_id FROM public.halls LIMIT 1;
    SELECT id INTO sample_user_id FROM public.profiles WHERE role = 'faculty' LIMIT 1;
    SELECT id INTO admin_user_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    -- Add sample bookings if we have the required data
    IF sample_hall_id IS NOT NULL AND sample_user_id IS NOT NULL THEN
        INSERT INTO public.bookings (
            hall_id, user_id, purpose, description, date, start_time, end_time, 
            status, priority, attendees_count, equipment_needed
        ) VALUES
        (sample_hall_id, sample_user_id, 'Department Meeting', 'Monthly department sync meeting', CURRENT_DATE + INTERVAL '1 day', '09:00', '11:00', 'pending', 'medium', 15, '["Projector", "Whiteboard"]'::jsonb),
        (sample_hall_id, sample_user_id, 'Training Session', 'New employee orientation', CURRENT_DATE + INTERVAL '2 days', '14:00', '16:00', 'approved', 'high', 25, '["Projector", "Sound System"]'::jsonb),
        (sample_hall_id, sample_user_id, 'Workshop', 'Technical skills workshop', CURRENT_DATE + INTERVAL '3 days', '10:00', '12:00', 'pending', 'low', 20, '["Projector"]'::jsonb);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
CREATE POLICY "Enable read access for all users" ON public.profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users only" ON public.profiles FOR INSERT WITH CHECK (TRUE);

-- Verify setup
SELECT 
    'Setup Complete!' as status,
    (SELECT COUNT(*) FROM public.profiles) as profile_count,
    (SELECT COUNT(*) FROM public.halls) as hall_count,
    (SELECT COUNT(*) FROM public.bookings) as booking_count;
