-- Admin Panel Dynamic Database Schema
-- This script creates all necessary tables and functions for the Admin Panel
-- Run this in your Supabase SQL editor

-- =====================================================
-- 1. CORE TABLES FOR ADMIN PANEL
-- =====================================================

-- Enhanced Halls table with admin features
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
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    is_maintenance BOOLEAN DEFAULT FALSE,
    maintenance_notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Bookings table with admin oversight features
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    attendees_count INTEGER DEFAULT 1 CHECK (attendees_count > 0),
    equipment_needed JSONB DEFAULT '[]'::jsonb,
    special_requirements TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hall maintenance schedules
CREATE TABLE IF NOT EXISTS public.hall_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    maintenance_type VARCHAR(50) DEFAULT 'general' CHECK (maintenance_type IN ('general', 'cleaning', 'repair', 'upgrade', 'inspection')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    assigned_to VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin activity logs for audit trail
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- 'hall', 'booking', 'user', 'system'
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking conflicts tracking
CREATE TABLE IF NOT EXISTS public.booking_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id_1 UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    booking_id_2 UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('time_overlap', 'equipment_conflict', 'capacity_exceeded')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment tracking
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    purchase_date DATE,
    warranty_expiry DATE,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
    location VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hall equipment assignments
CREATE TABLE IF NOT EXISTS public.hall_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
    is_permanent BOOLEAN DEFAULT TRUE,
    installation_date DATE,
    removal_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(hall_id, equipment_id)
);

-- Reports and analytics cache
CREATE TABLE IF NOT EXISTS public.admin_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    data JSONB NOT NULL,
    generated_by UUID REFERENCES auth.users(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_cached BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_hall_date ON public.bookings(hall_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON public.bookings(user_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date_range ON public.bookings(date, start_time, end_time);

-- Halls indexes
CREATE INDEX IF NOT EXISTS idx_halls_active ON public.halls(is_active);
CREATE INDEX IF NOT EXISTS idx_halls_location ON public.halls(location);
CREATE INDEX IF NOT EXISTS idx_halls_capacity ON public.halls(capacity);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_date ON public.admin_activity_logs(admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON public.admin_activity_logs(target_type, target_id);

-- =====================================================
-- 3. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_halls_updated_at BEFORE UPDATE ON public.halls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hall_maintenance_updated_at BEFORE UPDATE ON public.hall_maintenance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ADMIN HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is admin or super_admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role IN ('admin', 'super_admin') AND is_active = TRUE
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_action VARCHAR(100),
    p_target_type VARCHAR(50),
    p_target_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.admin_activity_logs (
        admin_id,
        action,
        target_type,
        target_id,
        old_values,
        new_values,
        notes
    )
    VALUES (
        auth.uid(),
        p_action,
        p_target_type,
        p_target_id,
        p_old_values,
        p_new_values,
        p_notes
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get booking statistics
CREATE OR REPLACE FUNCTION get_booking_statistics(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
    filter_start DATE;
    filter_end DATE;
BEGIN
    -- Set default date range if not provided
    filter_start := COALESCE(start_date, CURRENT_DATE - INTERVAL '30 days');
    filter_end := COALESCE(end_date, CURRENT_DATE);
    
    SELECT jsonb_build_object(
        'total_bookings', COUNT(*),
        'pending_bookings', COUNT(*) FILTER (WHERE status = 'pending'),
        'approved_bookings', COUNT(*) FILTER (WHERE status = 'approved'),
        'rejected_bookings', COUNT(*) FILTER (WHERE status = 'rejected'),
        'cancelled_bookings', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'completed_bookings', COUNT(*) FILTER (WHERE status = 'completed'),
        'average_attendees', COALESCE(AVG(attendees_count), 0),
        'date_range', jsonb_build_object(
            'start_date', filter_start,
            'end_date', filter_end
        )
    )
    INTO stats
    FROM public.bookings
    WHERE date BETWEEN filter_start AND filter_end;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get hall utilization statistics
CREATE OR REPLACE FUNCTION get_hall_utilization(
    hall_id_param UUID DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    filter_start DATE;
    filter_end DATE;
BEGIN
    filter_start := COALESCE(start_date, CURRENT_DATE - INTERVAL '30 days');
    filter_end := COALESCE(end_date, CURRENT_DATE);
    
    WITH hall_stats AS (
        SELECT 
            h.id,
            h.name,
            h.capacity,
            COUNT(b.id) as total_bookings,
            COUNT(b.id) FILTER (WHERE b.status = 'approved') as approved_bookings,
            COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time))/3600) FILTER (WHERE b.status = 'approved'), 0) as total_hours,
            COALESCE(AVG(b.attendees_count) FILTER (WHERE b.status = 'approved'), 0) as avg_attendees
        FROM public.halls h
        LEFT JOIN public.bookings b ON h.id = b.hall_id 
            AND b.date BETWEEN filter_start AND filter_end
        WHERE h.is_active = TRUE
            AND (hall_id_param IS NULL OR h.id = hall_id_param)
        GROUP BY h.id, h.name, h.capacity
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'hall_id', id,
            'hall_name', name,
            'capacity', capacity,
            'total_bookings', total_bookings,
            'approved_bookings', approved_bookings,
            'total_hours', total_hours,
            'utilization_rate', CASE 
                WHEN total_hours > 0 THEN ROUND((total_hours / (24 * (filter_end - filter_start + 1))) * 100, 2)
                ELSE 0 
            END,
            'average_occupancy', CASE 
                WHEN capacity > 0 AND approved_bookings > 0 THEN ROUND((avg_attendees / capacity) * 100, 2)
                ELSE 0 
            END
        )
    )
    INTO result
    FROM hall_stats;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect booking conflicts
CREATE OR REPLACE FUNCTION detect_booking_conflicts()
RETURNS TABLE(
    conflict_id UUID,
    booking1_id UUID,
    booking2_id UUID,
    conflict_type TEXT,
    severity TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gen_random_uuid() as conflict_id,
        b1.id as booking1_id,
        b2.id as booking2_id,
        'time_overlap'::TEXT as conflict_type,
        CASE 
            WHEN b1.priority = 'high' OR b2.priority = 'high' THEN 'high'::TEXT
            WHEN b1.priority = 'medium' OR b2.priority = 'medium' THEN 'medium'::TEXT
            ELSE 'low'::TEXT
        END as severity
    FROM public.bookings b1
    JOIN public.bookings b2 ON b1.hall_id = b2.hall_id 
        AND b1.date = b2.date
        AND b1.id < b2.id -- Avoid duplicate pairs
        AND (b1.start_time, b1.end_time) OVERLAPS (b2.start_time, b2.end_time)
    WHERE b1.status IN ('pending', 'approved')
        AND b2.status IN ('pending', 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for booking conflicts before insert/update
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlapping bookings
    IF EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE hall_id = NEW.hall_id 
        AND date = NEW.date
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND status IN ('approved', 'pending')
        AND (start_time, end_time) OVERLAPS (NEW.start_time, NEW.end_time)
    ) THEN
        RAISE EXCEPTION 'Booking conflict detected: Hall % is already booked during this time on %', NEW.hall_id, NEW.date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check conflicts on insert/update
CREATE TRIGGER check_booking_conflicts_trigger
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status IN ('approved', 'pending'))
    EXECUTE FUNCTION check_booking_conflicts();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_reports ENABLE ROW LEVEL SECURITY;

-- Halls policies
CREATE POLICY "Admin can manage halls" ON public.halls
    FOR ALL USING (is_admin_user());

CREATE POLICY "Faculty can view active halls" ON public.halls
    FOR SELECT USING (is_active = TRUE);

-- Bookings policies
CREATE POLICY "Admin can manage all bookings" ON public.bookings
    FOR ALL USING (is_admin_user());

CREATE POLICY "Users can manage their own bookings" ON public.bookings
    FOR ALL USING (auth.uid() = user_id);

-- Hall maintenance policies
CREATE POLICY "Admin can manage maintenance" ON public.hall_maintenance
    FOR ALL USING (is_admin_user());

-- Admin activity logs policies
CREATE POLICY "Admin can view activity logs" ON public.admin_activity_logs
    FOR SELECT USING (is_admin_user());

-- Equipment policies
CREATE POLICY "Admin can manage equipment" ON public.equipment
    FOR ALL USING (is_admin_user());

CREATE POLICY "Faculty can view equipment" ON public.equipment
    FOR SELECT USING (status = 'available');

-- Hall equipment policies
CREATE POLICY "Admin can manage hall equipment" ON public.hall_equipment
    FOR ALL USING (is_admin_user());

-- Admin reports policies
CREATE POLICY "Admin can manage reports" ON public.admin_reports
    FOR ALL USING (is_admin_user());

-- =====================================================
-- 6. SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample equipment
INSERT INTO public.equipment (name, description, category, status) VALUES
('Projector - Epson EB-X41', 'High-resolution projector for presentations', 'Audio Visual', 'available'),
('Sound System - Bose', 'Professional sound system with microphones', 'Audio Visual', 'available'),
('Whiteboard - Smart Board', 'Interactive smart whiteboard', 'Interactive', 'available'),
('Laptop - Dell Inspiron', 'Presentation laptop with HDMI output', 'Computing', 'available'),
('Microphone - Wireless Set', 'Set of 4 wireless microphones', 'Audio Visual', 'available'),
('Video Camera - Canon', 'HD video recording camera', 'Recording', 'available'),
('Flipchart Stand', 'Portable flipchart stand with paper', 'Presentation', 'available'),
('Extension Cables', 'Set of power and HDMI extension cables', 'Technical', 'available')
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create helpful views for admin dashboard
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM public.halls WHERE is_active = TRUE) as total_active_halls,
    (SELECT COUNT(*) FROM public.bookings WHERE status = 'pending') as pending_bookings,
    (SELECT COUNT(*) FROM public.bookings WHERE date = CURRENT_DATE AND status = 'approved') as todays_bookings,
    (SELECT COUNT(*) FROM public.booking_conflicts WHERE status = 'open') as open_conflicts,
    (SELECT COUNT(*) FROM public.hall_maintenance WHERE status = 'scheduled' AND start_date <= CURRENT_DATE + INTERVAL '7 days') as upcoming_maintenance;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Admin Panel database schema setup completed successfully!';
    RAISE NOTICE 'Tables created: halls, bookings, hall_maintenance, admin_activity_logs, booking_conflicts, equipment, hall_equipment, admin_reports';
    RAISE NOTICE 'Functions created: is_admin_user(), log_admin_action(), get_booking_statistics(), get_hall_utilization(), detect_booking_conflicts()';
    RAISE NOTICE 'RLS policies applied for security';
    RAISE NOTICE 'Sample equipment data inserted';
END $$;
