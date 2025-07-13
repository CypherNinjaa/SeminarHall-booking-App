-- Test script to verify database relationships are working correctly

-- Test 1: Check if profiles table exists and has the right structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Test 2: Check if notifications table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Test 3: Check RLS status (should be disabled for testing)
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'notifications');

-- Test 4: Check if we have any sample data
SELECT 
    'profiles' as table_name,
    COUNT(*) as record_count
FROM public.profiles
UNION ALL
SELECT 
    'notifications' as table_name,
    COUNT(*) as record_count
FROM public.notifications;

-- Test 5: Check admin_activity_logs structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'admin_activity_logs'
ORDER BY ordinal_position;
