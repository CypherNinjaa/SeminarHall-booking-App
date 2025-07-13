-- Fix the get_user_analytics function to return proper JSON object
-- The current function returns a table, but the app expects a single JSON object

DROP FUNCTION IF EXISTS public.get_user_analytics();

CREATE OR REPLACE FUNCTION public.get_user_analytics()
RETURNS JSON AS $$
DECLARE
  analytics_data JSON;
BEGIN
  -- Check if current user is authorized (must be super_admin or admin)
  IF NOT (
    SELECT role IN ('super_admin', 'admin') 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only super_admin and admin can access user analytics';
  END IF;
  
  -- Build analytics data as JSON object
  SELECT json_build_object(
    'total_users', COUNT(*),
    'super_admins', COUNT(*) FILTER (WHERE role = 'super_admin'),
    'admins', COUNT(*) FILTER (WHERE role = 'admin'),
    'faculty', COUNT(*) FILTER (WHERE role = 'faculty'),
    'active_users', COUNT(*) FILTER (WHERE is_active = TRUE),
    'inactive_users', COUNT(*) FILTER (WHERE is_active = FALSE),
    'new_users_last_month', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
    'new_users_last_30_days', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')
  ) INTO analytics_data
  FROM public.profiles;
  
  RETURN analytics_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_analytics() TO authenticated;

-- Test the function works correctly
-- SELECT public.get_user_analytics();
