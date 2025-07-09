-- Add Missing Function for Analytics
-- This adds the is_admin_or_super_admin function that the app is looking for

-- Create the missing is_admin_or_super_admin function
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_role() IN ('admin', 'super_admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Verify the function was created
SELECT 
  routine_name, 
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_or_super_admin';

-- Test the function (optional)
SELECT 'Function created successfully!' as status,
       'Analytics should now work without errors.' as note;
