-- Database Verification Script
-- Run this AFTER executing quick_relationship_fix.sql to verify everything was created correctly

-- Check if profiles table exists and has data
SELECT 
    'profiles' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
FROM public.profiles;

-- Check if notifications table exists
SELECT 
    'notifications' as table_name,
    COUNT(*) as record_count
FROM public.notifications;

-- Check if halls table has data
SELECT 
    'halls' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_halls
FROM public.halls;

-- Check if bookings table exists (should be empty initially)
SELECT 
    'bookings' as table_name,
    COUNT(*) as record_count
FROM public.bookings;

-- Check foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('profiles', 'bookings', 'notifications')
ORDER BY tc.table_name;

-- Final status check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')
        AND EXISTS (SELECT 1 FROM public.halls)
        THEN '✅ DATABASE SETUP COMPLETE - All tables exist and have data'
        ELSE '❌ DATABASE SETUP INCOMPLETE - Please run quick_relationship_fix.sql first'
    END as status;
