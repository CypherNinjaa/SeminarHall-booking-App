-- Comprehensive Hall Management Schema
-- Corrected version that works with your existing database structure

-- Create or update the halls table with all necessary columns
CREATE TABLE IF NOT EXISTS public.halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    location VARCHAR(255),
    floor_number INTEGER,
    building VARCHAR(255),
    equipment JSONB DEFAULT '[]'::jsonb,
    amenities JSONB DEFAULT '[]'::jsonb,
    images TEXT[] DEFAULT ARRAY[]::text[],  -- Keep as TEXT[] to match existing structure
    is_active BOOLEAN DEFAULT TRUE,
    is_maintenance BOOLEAN DEFAULT FALSE,
    maintenance_notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns (these will only run if the column doesn't exist)
DO $$ 
BEGIN
    -- Add floor_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'halls' AND column_name = 'floor_number') THEN
        ALTER TABLE public.halls ADD COLUMN floor_number INTEGER;
    END IF;

    -- Add building if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'halls' AND column_name = 'building') THEN
        ALTER TABLE public.halls ADD COLUMN building VARCHAR(255);
    END IF;

    -- Skip adding images column since it already exists with a different type
    -- We don't want to try to change its type which would require data migration

    -- Add is_maintenance if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'halls' AND column_name = 'is_maintenance') THEN
        ALTER TABLE public.halls ADD COLUMN is_maintenance BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add maintenance_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'halls' AND column_name = 'maintenance_notes') THEN
        ALTER TABLE public.halls ADD COLUMN maintenance_notes TEXT;
    END IF;

    -- Add created_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'halls' AND column_name = 'created_by') THEN
        ALTER TABLE public.halls ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add updated_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'halls' AND column_name = 'updated_by') THEN
        ALTER TABLE public.halls ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_halls_updated_at ON public.halls;
CREATE TRIGGER update_halls_updated_at
    BEFORE UPDATE ON public.halls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for halls
DROP POLICY IF EXISTS "Everyone can view active halls" ON public.halls;
CREATE POLICY "Everyone can view active halls" ON public.halls
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all halls" ON public.halls;
CREATE POLICY "Admins can view all halls" ON public.halls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Admins can create halls" ON public.halls;
CREATE POLICY "Admins can create halls" ON public.halls
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Admins can update halls" ON public.halls;
CREATE POLICY "Admins can update halls" ON public.halls
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Admins can delete halls" ON public.halls;
CREATE POLICY "Admins can delete halls" ON public.halls
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

-- Insert some sample halls if the table is empty
INSERT INTO public.halls (name, description, capacity, location, floor_number, building, equipment, amenities, is_active)
SELECT * FROM (VALUES
    ('Conference Room A', 'Small meeting room for team discussions', 20, 'East Wing', 1, 'Main Building', '["TV Display", "Whiteboard"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE),
    ('Main Auditorium', 'Large auditorium for events and presentations', 200, 'Central Hall', 0, 'Main Building', '["Projector", "Sound System", "Microphone"]'::jsonb, '["Air Conditioning", "WiFi", "Parking"]'::jsonb, TRUE),
    ('Seminar Hall B', 'Medium-sized hall for seminars', 50, 'West Wing', 2, 'Main Building', '["Projector", "Whiteboard"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE),
    ('Meeting Room C', 'Small meeting room', 15, 'North Wing', 3, 'Main Building', '["Whiteboard"]'::jsonb, '["Air Conditioning"]'::jsonb, TRUE),
    ('Lab Room 101', 'Computer lab with projector', 30, 'Tech Building', 1, 'Technology Block', '["Computers", "Projector"]'::jsonb, '["Air Conditioning", "WiFi"]'::jsonb, TRUE)
) AS v(name, description, capacity, location, floor_number, building, equipment, amenities, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.halls LIMIT 1);

-- Verify the setup
SELECT 
    'Hall Management Setup Complete!' as status,
    COUNT(*) as total_halls,
    COUNT(*) FILTER (WHERE is_active = true) as active_halls,
    COUNT(*) FILTER (WHERE is_maintenance = true) as maintenance_halls
FROM public.halls;
