-- Smart Booking System Schema
-- Advanced booking system with 24-hour time format, conflict detection, and buffer management

-- Create smart_bookings table with optimized structure
CREATE TABLE IF NOT EXISTS smart_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    
    -- Optimized date storage in DDMMYYYY format for efficient querying
    booking_date VARCHAR(8) NOT NULL, -- Format: DDMMYYYY (e.g., "12072025")
    
    -- 24-hour time format for precision (HH:MM)
    start_time VARCHAR(5) NOT NULL, -- Format: HH:MM (e.g., "09:00")
    end_time VARCHAR(5) NOT NULL,   -- Format: HH:MM (e.g., "13:00")
    duration_minutes INTEGER NOT NULL,
    
    -- Buffer times including 44-minute buffers
    buffer_start VARCHAR(5) NOT NULL, -- Start time with buffer
    buffer_end VARCHAR(5) NOT NULL,   -- End time with buffer
    
    -- Booking details
    purpose TEXT NOT NULL,
    description TEXT,
    attendees_count INTEGER NOT NULL DEFAULT 1,
    equipment_needed TEXT[] DEFAULT '{}', -- Array of equipment IDs/names
    special_requirements TEXT,
    
    -- Status and approval tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    auto_approved BOOLEAN NOT NULL DEFAULT false,
    
    -- Admin tracking
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints for data integrity
    CONSTRAINT valid_time_order CHECK (start_time < end_time),
    CONSTRAINT valid_duration CHECK (duration_minutes > 0),
    CONSTRAINT valid_attendees CHECK (attendees_count > 0),
    CONSTRAINT valid_date_format CHECK (LENGTH(booking_date) = 8 AND booking_date ~ '^[0-9]{8}$'),
    CONSTRAINT valid_time_format CHECK (
        start_time ~ '^[0-2][0-9]:[0-5][0-9]$' AND 
        end_time ~ '^[0-2][0-9]:[0-5][0-9]$' AND
        buffer_start ~ '^[0-2][0-9]:[0-5][0-9]$' AND
        buffer_end ~ '^[0-2][0-9]:[0-5][0-9]$'
    )
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_smart_bookings_hall_date ON smart_bookings(hall_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_smart_bookings_user_status ON smart_bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_smart_bookings_date_time ON smart_bookings(booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_smart_bookings_status ON smart_bookings(status);
CREATE INDEX IF NOT EXISTS idx_smart_bookings_buffer_times ON smart_bookings(hall_id, booking_date, buffer_start, buffer_end);

-- Create function to automatically update updated_at timestamp
DROP FUNCTION IF EXISTS update_smart_bookings_updated_at();
CREATE OR REPLACE FUNCTION update_smart_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_smart_bookings_updated_at ON smart_bookings;
CREATE TRIGGER trigger_update_smart_bookings_updated_at
    BEFORE UPDATE ON smart_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_smart_bookings_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE smart_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bookings" ON smart_bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON smart_bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON smart_bookings;
DROP POLICY IF EXISTS "Users can cancel own bookings" ON smart_bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON smart_bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON smart_bookings;

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON smart_bookings
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own bookings
CREATE POLICY "Users can create own bookings" ON smart_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bookings (with restrictions)
CREATE POLICY "Users can update own bookings" ON smart_bookings
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status NOT IN ('completed', 'cancelled')
    );

-- Policy: Users can delete (cancel) their own bookings
CREATE POLICY "Users can cancel own bookings" ON smart_bookings
    FOR DELETE USING (
        auth.uid() = user_id AND 
        status NOT IN ('completed')
    );

-- Admin policies: Admins can view and manage all bookings
CREATE POLICY "Admins can view all bookings" ON smart_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update all bookings" ON smart_bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Function to check for booking conflicts (with buffer times)
DROP FUNCTION IF EXISTS smart_bookings_check_conflicts(UUID, VARCHAR, VARCHAR, VARCHAR, UUID) CASCADE;
CREATE OR REPLACE FUNCTION smart_bookings_check_conflicts(
    p_hall_id UUID,
    p_booking_date VARCHAR(8),
    p_buffer_start VARCHAR(5),
    p_buffer_end VARCHAR(5),
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE(
    conflicting_booking_id UUID,
    conflicting_start VARCHAR(5),
    conflicting_end VARCHAR(5),
    conflicting_buffer_start VARCHAR(5),
    conflicting_buffer_end VARCHAR(5)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sb.id,
        sb.start_time,
        sb.end_time,
        sb.buffer_start,
        sb.buffer_end
    FROM smart_bookings sb
    WHERE sb.hall_id = p_hall_id
    AND sb.booking_date = p_booking_date
    AND sb.status IN ('approved', 'pending')
    AND (p_exclude_booking_id IS NULL OR sb.id != p_exclude_booking_id)
    AND (
        -- Check if buffer times overlap
        (sb.buffer_start < p_buffer_end AND p_buffer_start < sb.buffer_end)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to auto-approve bookings if no conflicts
CREATE OR REPLACE FUNCTION auto_approve_booking()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Check for conflicts
    SELECT COUNT(*) INTO conflict_count
    FROM smart_bookings_check_conflicts(
        NEW.hall_id,
        NEW.booking_date,
        NEW.buffer_start,
        NEW.buffer_end,
        NEW.id
    );
    
    -- Auto-approve if no conflicts
    IF conflict_count = 0 THEN
        NEW.status := 'approved';
        NEW.auto_approved := true;
        NEW.approved_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-approval
DROP TRIGGER IF EXISTS trigger_auto_approve_booking ON smart_bookings;
CREATE TRIGGER trigger_auto_approve_booking
    BEFORE INSERT ON smart_bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_booking();

-- Function to get available time slots for a hall on a specific date
CREATE OR REPLACE FUNCTION get_available_slots(
    p_hall_id UUID,
    p_booking_date VARCHAR(8)
)
RETURNS TABLE(
    slot_start VARCHAR(5),
    slot_end VARCHAR(5),
    is_available BOOLEAN
) AS $$
DECLARE
    time_slots VARCHAR(5)[][] := ARRAY[
        ARRAY['06:00', '08:00'],
        ARRAY['08:00', '10:00'], 
        ARRAY['10:00', '12:00'],
        ARRAY['12:00', '14:00'],
        ARRAY['14:00', '16:00'],
        ARRAY['16:00', '18:00'],
        ARRAY['18:00', '20:00'],
        ARRAY['20:00', '22:00']
    ];
    slot VARCHAR(5)[];
    has_conflict BOOLEAN;
BEGIN
    FOREACH slot SLICE 1 IN ARRAY time_slots
    LOOP
        -- Check if this slot conflicts with any existing booking
        SELECT EXISTS(
            SELECT 1 FROM smart_bookings_check_conflicts(
                p_hall_id, 
                p_booking_date,
                slot[1], -- buffer_start (same as start for this check)
                slot[2]  -- buffer_end (same as end for this check)
            )
        ) INTO has_conflict;
        
        slot_start := slot[1];
        slot_end := slot[2];
        is_available := NOT has_conflict;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to get booking statistics
DROP FUNCTION IF EXISTS get_booking_statistics(UUID);
CREATE OR REPLACE FUNCTION get_smart_booking_statistics(p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
    today_date VARCHAR(8);
    current_month INTEGER;
    current_year INTEGER;
BEGIN
    -- Get current date in DDMMYYYY format
    today_date := TO_CHAR(CURRENT_DATE, 'DDMMYYYY');
    current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    WITH booking_stats AS (
        SELECT 
            COUNT(*) as total_bookings,
            COUNT(*) FILTER (WHERE booking_date = today_date) as today_bookings,
            COUNT(*) FILTER (WHERE 
                EXTRACT(MONTH FROM TO_DATE(booking_date, 'DDMMYYYY')) = current_month 
                AND EXTRACT(YEAR FROM TO_DATE(booking_date, 'DDMMYYYY')) = current_year
            ) as month_bookings,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
            COUNT(*) FILTER (WHERE status = 'approved') as approved_bookings,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
            COUNT(*) FILTER (WHERE auto_approved = true) as auto_approved_bookings
        FROM smart_bookings
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
    )
    SELECT json_build_object(
        'total', total_bookings,
        'today', today_bookings,
        'thisMonth', month_bookings,
        'pending', pending_bookings,
        'approved', approved_bookings,
        'cancelled', cancelled_bookings,
        'autoApproved', auto_approved_bookings
    ) INTO result
    FROM booking_stats;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_smart_booking_statistics TO authenticated;
-- Create view for booking details with hall and user information
CREATE OR REPLACE VIEW booking_details AS
SELECT 
    sb.*,
    h.name as hall_name,
    h.capacity as hall_capacity,
    h.location as hall_location,
    p.name as user_name,
    p.email as user_email,
    p.phone as user_phone,
    -- Convert DDMMYYYY to readable date
    TO_DATE(sb.booking_date, 'DDMMYYYY') as formatted_date,
    -- Calculate actual booking duration
    (EXTRACT(HOUR FROM (sb.end_time::TIME - sb.start_time::TIME)) * 60 + 
     EXTRACT(MINUTE FROM (sb.end_time::TIME - sb.start_time::TIME))) as calculated_duration
FROM smart_bookings sb
JOIN halls h ON sb.hall_id = h.id
LEFT JOIN profiles p ON sb.user_id = p.id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_bookings TO authenticated;
GRANT SELECT ON booking_details TO authenticated;
GRANT EXECUTE ON FUNCTION smart_bookings_check_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_statistics TO authenticated;

-- Add helpful comments
COMMENT ON TABLE smart_bookings IS 'Advanced booking system with 24-hour time format, conflict detection, and automated buffer management';
COMMENT ON COLUMN smart_bookings.booking_date IS 'Date in DDMMYYYY format for optimized storage and querying';
COMMENT ON COLUMN smart_bookings.start_time IS '24-hour format start time (HH:MM)';
COMMENT ON COLUMN smart_bookings.end_time IS '24-hour format end time (HH:MM)';
COMMENT ON COLUMN smart_bookings.buffer_start IS 'Start time including 44-minute buffer';
COMMENT ON COLUMN smart_bookings.buffer_end IS 'End time including 44-minute buffer';
COMMENT ON COLUMN smart_bookings.auto_approved IS 'Whether booking was automatically approved due to no conflicts';
COMMENT ON FUNCTION smart_bookings_check_conflicts IS 'Checks for booking conflicts including buffer times';
COMMENT ON FUNCTION get_available_slots IS 'Returns available time slots for a hall on a specific date';
COMMENT ON FUNCTION auto_approve_booking IS 'Automatically approves bookings if no conflicts are detected';