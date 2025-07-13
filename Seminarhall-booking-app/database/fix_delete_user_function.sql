-- Fix the delete user function to resolve ambiguous user_id references
-- and create the correct admin_delete_user function that the service expects

-- First, drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.delete_user(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);

-- Create the fixed delete_user function with resolved ambiguous column references
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
  target_user_email TEXT;
BEGIN
  -- Check if current user is authorized (must be super_admin)
  SELECT p.role INTO current_user_role 
  FROM public.profiles p 
  WHERE p.id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can delete user accounts';
    RETURN FALSE;
  END IF;
  
  -- Get target user info
  SELECT p.role, p.email INTO target_user_role, target_user_email 
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  IF target_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
    RETURN FALSE;
  END IF;
  
  -- Delete related data first (bookings, activity logs, etc.)
  -- Delete user's bookings
  DELETE FROM public.smart_bookings WHERE user_id = target_user_id;
  
  -- Delete user's activity logs (avoid the ambiguous user_id reference)
  DELETE FROM public.user_activity_log 
  WHERE user_activity_log.user_id = target_user_id 
    OR user_activity_log.target_user_id = target_user_id;
  
  -- Log the deletion activity AFTER cleaning up to avoid conflicts
  INSERT INTO public.user_activity_log (user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    'delete_user', 
    target_user_id, 
    json_build_object('email', target_user_email, 'role', target_user_role)
  );
  
  -- Delete the profile (this will handle the cascade)
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the admin_delete_user function that the service expects
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Call the main delete_user function
  RETURN public.delete_user(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
