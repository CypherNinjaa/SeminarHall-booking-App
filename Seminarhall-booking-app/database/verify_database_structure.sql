-- Database Structure Verification Script
-- Run this in your Supabase SQL Editor to check the current state

-- Check the current structure of the halls table
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable,
    udt_name
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'halls'
ORDER BY 
    ordinal_position;

-- Check if profiles table exists and has the expected structure
SELECT 
    column_name, 
    data_type
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('id', 'role', 'is_active')
ORDER BY 
    ordinal_position;

-- Check current RLS policies on halls table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'halls';

-- Check if the update trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'halls'
    AND trigger_schema = 'public';

-- Sample data check
SELECT 
    'Current Data' as info,
    COUNT(*) as total_halls,
    COUNT(*) FILTER (WHERE is_active = true) as active_halls,
    COUNT(*) FILTER (WHERE is_maintenance = true) as maintenance_halls,
    COUNT(*) FILTER (WHERE images IS NOT NULL) as halls_with_images
FROM 
    public.halls;
