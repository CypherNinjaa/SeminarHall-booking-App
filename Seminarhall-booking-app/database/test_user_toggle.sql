-- Test the current toggle_user_active_status function
-- Run this after applying the main fix to verify it works

-- First, check if the function exists
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'toggle_user_active_status';

-- Test query to see current user roles and status
-- (This helps verify which users can be safely tested)
SELECT 
    id,
    name,
    email,
    role,
    is_active,
    created_at
FROM public.profiles
ORDER BY 
    role DESC,
    created_at DESC
LIMIT 10;

-- Example test call (replace USER_ID_HERE with actual user ID)
-- SELECT public.toggle_user_active_status('USER_ID_HERE'::UUID, false);

-- Check activity log to see if logging works
SELECT 
    created_at,
    action,
    details,
    user_id,
    target_user_id
FROM public.user_activity_log
WHERE action IN ('activate_user', 'deactivate_user')
ORDER BY created_at DESC
LIMIT 5;
