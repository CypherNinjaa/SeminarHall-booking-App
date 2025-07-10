-- Quick Test Script for Admin Panel Database
-- Run this AFTER running admin_panel_schema.sql and create_admin_user.sql
-- This will verify everything is working correctly

-- =====================================================
-- 1. VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY['halls', 'bookings', 'hall_maintenance', 'admin_activity_logs', 'booking_conflicts', 'equipment', 'hall_equipment', 'admin_reports'];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    RAISE NOTICE '=== CHECKING DATABASE TABLES ===';
    
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = table_name;
        
        IF table_count = 0 THEN
            missing_tables := missing_tables || table_name;
            RAISE NOTICE '❌ Table % is MISSING', table_name;
        ELSE
            RAISE NOTICE '✅ Table % exists', table_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) IS NULL THEN
        RAISE NOTICE '🎉 All required tables exist!';
    ELSE
        RAISE NOTICE '⚠️  Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- Check if functions were created
DO $$
DECLARE
    function_count INTEGER;
    expected_functions TEXT[] := ARRAY['is_admin_user', 'log_admin_action', 'get_booking_statistics', 'get_hall_utilization', 'detect_booking_conflicts', 'create_admin_user'];
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    function_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CHECKING DATABASE FUNCTIONS ===';
    
    FOREACH function_name IN ARRAY expected_functions
    LOOP
        SELECT COUNT(*) INTO function_count
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = function_name;
        
        IF function_count = 0 THEN
            missing_functions := missing_functions || function_name;
            RAISE NOTICE '❌ Function % is MISSING', function_name;
        ELSE
            RAISE NOTICE '✅ Function % exists', function_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) IS NULL THEN
        RAISE NOTICE '🎉 All required functions exist!';
    ELSE
        RAISE NOTICE '⚠️  Missing functions: %', array_to_string(missing_functions, ', ');
    END IF;
END $$;

-- Check if admin users were created
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles 
    WHERE role = 'admin';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== CHECKING ADMIN USERS ===';
    RAISE NOTICE 'Admin users created: %', admin_count;
    
    IF admin_count > 0 THEN
        RAISE NOTICE '✅ Admin users exist';
        
        -- List admin users
        FOR admin_record IN 
            SELECT email, name, department 
            FROM public.profiles 
            WHERE role = 'admin'
            ORDER BY created_at
        LOOP
            RAISE NOTICE '  📧 % (%) - %', admin_record.email, admin_record.name, admin_record.department;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ No admin users found';
    END IF;
END $$;

-- =====================================================
-- 2. INSERT TEST DATA
-- =====================================================

-- Insert test halls
INSERT INTO public.halls (name, description, capacity, location, floor_number, building, equipment, amenities, hourly_rate, is_active) VALUES
('Main Auditorium', 'Large auditorium for major events and conferences', 300, 'Main Building - Ground Floor', 0, 'Main Building', 
 '["Projector", "Sound System", "Microphones", "Stage Lighting"]'::jsonb, 
 '["Air Conditioning", "WiFi", "Parking", "Wheelchair Access"]'::jsonb, 1500.00, true),
 
('Conference Room A', 'Medium-sized conference room with modern facilities', 50, 'Admin Building - 2nd Floor', 2, 'Admin Building', 
 '["Smart TV", "Video Conferencing", "Whiteboard", "Laptop Connections"]'::jsonb, 
 '["Air Conditioning", "WiFi", "Coffee Station"]'::jsonb, 800.00, true),
 
('Lecture Hall B', 'Standard lecture hall for academic sessions', 100, 'Academic Block - 1st Floor', 1, 'Academic Block', 
 '["Projector", "Audio System", "Document Camera"]'::jsonb, 
 '["Air Conditioning", "WiFi", "Charging Points"]'::jsonb, 600.00, true),
 
('Seminar Room C', 'Small seminar room for intimate discussions', 25, 'Research Building - 3rd Floor', 3, 'Research Building', 
 '["Interactive Whiteboard", "Video Conferencing"]'::jsonb, 
 '["Air Conditioning", "WiFi"]'::jsonb, 400.00, true)
ON CONFLICT DO NOTHING;

-- Insert test equipment
INSERT INTO public.equipment (name, description, category, status, location) VALUES
('Wireless Presenter Remote', 'Advanced wireless presenter with laser pointer', 'Presentation', 'available', 'Equipment Storage'),
('Flip Chart Stand', 'Mobile flip chart stand with paper', 'Presentation', 'available', 'Equipment Storage'),
('Extension Cables (5m)', 'HDMI and power extension cables', 'Technical', 'available', 'Equipment Storage'),
('Portable Speakers', 'Bluetooth portable speakers for small events', 'Audio Visual', 'available', 'Equipment Storage')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. TEST ADMIN FUNCTIONS
-- =====================================================

-- Test booking statistics function
DO $$
DECLARE
    stats_result JSONB;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TESTING ADMIN FUNCTIONS ===';
    
    -- Test booking statistics
    SELECT get_booking_statistics() INTO stats_result;
    RAISE NOTICE '✅ Booking statistics function works';
    RAISE NOTICE '   Total bookings: %', stats_result->>'total_bookings';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error testing booking statistics: %', SQLERRM;
END $$;

-- Test hall utilization function
DO $$
DECLARE
    utilization_result JSONB;
BEGIN
    SELECT get_hall_utilization() INTO utilization_result;
    RAISE NOTICE '✅ Hall utilization function works';
    RAISE NOTICE '   Halls analyzed: %', jsonb_array_length(utilization_result);
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error testing hall utilization: %', SQLERRM;
END $$;

-- Test conflict detection function
DO $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count FROM detect_booking_conflicts();
    RAISE NOTICE '✅ Conflict detection function works';
    RAISE NOTICE '   Current conflicts: %', conflict_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error testing conflict detection: %', SQLERRM;
END $$;

-- =====================================================
-- 4. PERFORMANCE CHECK
-- =====================================================

-- Check indexes
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN ('halls', 'bookings', 'admin_activity_logs');
    
    RAISE NOTICE '';
    RAISE NOTICE '=== PERFORMANCE CHECK ===';
    RAISE NOTICE 'Database indexes created: %', index_count;
    
    IF index_count >= 5 THEN
        RAISE NOTICE '✅ Adequate indexes for performance';
    ELSE
        RAISE NOTICE '⚠️  Consider adding more indexes for better performance';
    END IF;
END $$;

-- =====================================================
-- 5. SAMPLE QUERIES FOR TESTING
-- =====================================================

-- Display available halls
SELECT 
    name,
    capacity,
    location,
    hourly_rate,
    jsonb_array_length(equipment) as equipment_count,
    is_active
FROM public.halls 
WHERE is_active = true
ORDER BY capacity DESC;

-- Display equipment inventory
SELECT 
    name,
    category,
    status,
    location
FROM public.equipment
ORDER BY category, name;

-- Show admin activity summary
SELECT 
    COUNT(*) as total_activities,
    COUNT(DISTINCT admin_id) as active_admins,
    MAX(created_at) as latest_activity
FROM public.admin_activity_logs;

-- =====================================================
-- 6. SECURITY VERIFICATION
-- =====================================================

DO $$
DECLARE
    rls_enabled_count INTEGER;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SECURITY VERIFICATION ===';
    
    -- Check RLS is enabled
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('halls', 'bookings', 'admin_activity_logs')
    AND rowsecurity = true;
    
    RAISE NOTICE 'Tables with RLS enabled: %', rls_enabled_count;
    
    -- Check policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Security policies created: %', policy_count;
    
    IF rls_enabled_count >= 3 AND policy_count >= 5 THEN
        RAISE NOTICE '✅ Security policies properly configured';
    ELSE
        RAISE NOTICE '⚠️  Security configuration needs attention';
    END IF;
END $$;

-- =====================================================
-- 7. FINAL STATUS REPORT
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ===============================================';
    RAISE NOTICE '🎉 ADMIN PANEL DATABASE SETUP TEST COMPLETED';
    RAISE NOTICE '🎉 ===============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '1. Sign up in your app using: admin@university.edu';
    RAISE NOTICE '2. Navigate to Profile → Admin Panel';
    RAISE NOTICE '3. Test creating/editing halls';
    RAISE NOTICE '4. Test booking approval workflow';
    RAISE NOTICE '5. Test generating reports';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 TO UPDATE ADMIN EMAILS:';
    RAISE NOTICE '   Run: UPDATE profiles SET email = ''youradmin@yourdomain.com'' WHERE email = ''admin@university.edu'';';
    RAISE NOTICE '';
    RAISE NOTICE '📚 Check README_ADMIN_SETUP.md for detailed documentation';
    RAISE NOTICE '';
END $$;
