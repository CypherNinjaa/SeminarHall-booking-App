-- Fix all ambiguous column reference errors in user management functions

-- First, drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.toggle_user_active_status(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.delete_user(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);

-- Fix toggle_user_active_status function
CREATE OR REPLACE FUNCTION public.toggle_user_active_status(target_user_id UUID, new_active_status BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
  current_active_status BOOLEAN;
BEGIN
  -- Check if current user is authorized (must be super_admin or admin)
  SELECT p.role INTO current_user_role 
  FROM public.profiles p 
  WHERE p.id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only super_admin and admin can activate/deactivate accounts';
    RETURN FALSE;
  END IF;
  
  -- Get target user info
  SELECT p.role, p.is_active INTO target_user_role, current_active_status 
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  IF target_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
    RETURN FALSE;
  END IF;
  
  -- Admin cannot deactivate super_admin
  IF current_user_role = 'admin' AND target_user_role = 'super_admin' THEN
    RAISE EXCEPTION 'Admin cannot modify super_admin accounts';
    RETURN FALSE;
  END IF;
  
  -- Update active status
  UPDATE public.profiles 
  SET 
    is_active = new_active_status,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the activity
  INSERT INTO public.user_activity_log (user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    CASE WHEN new_active_status THEN 'activate_user' ELSE 'deactivate_user' END, 
    target_user_id, 
    json_build_object('old_status', current_active_status, 'new_status', new_active_status)
  );
  
  -- Create notification for the user (if notifications table exists)
  -- Use a simple insert without ON CONFLICT to avoid constraint issues
  BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
      target_user_id,
      CASE WHEN new_active_status THEN 'Account Activated' ELSE 'Account Deactivated' END,
      CASE WHEN new_active_status 
        THEN 'Your account has been activated. You can now use the system.'
        ELSE 'Your account has been deactivated. Please contact administration.'
      END,
      'system',
      json_build_object('action', 'status_change', 'new_status', new_active_status)
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- If notification insertion fails, log it but don't fail the whole operation
      RAISE LOG 'Failed to create notification for user status change: %', SQLERRM;
  END;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix delete_user function (simplified and robust version)
CREATE OR REPLACE FUNCTION public.delete_user(delete_target_user_id UUID)
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
  END IF;
  
  -- Get target user info
  SELECT p.role, p.email INTO target_user_role, target_user_email 
  FROM public.profiles p
  WHERE p.id = delete_target_user_id;
  
  IF target_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Cannot delete other super_admins (safety check)
  IF target_user_role = 'super_admin' AND delete_target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete other super_admin accounts';
  END IF;
  
  -- Delete related data first to avoid foreign key constraints
  BEGIN
    -- Delete user's bookings
    DELETE FROM public.smart_bookings WHERE user_id = delete_target_user_id;
    
    -- Delete user's notifications  
    DELETE FROM public.notifications WHERE user_id = delete_target_user_id;
    
    -- Delete user's activity logs - avoid any ambiguity
    DELETE FROM public.user_activity_log 
    WHERE user_id = delete_target_user_id 
       OR target_user_id = delete_target_user_id;
    
    -- Delete the profile (this will handle the cascade)
    DELETE FROM public.profiles WHERE id = delete_target_user_id;
    
    -- Log the deletion activity AFTER successful deletion
    INSERT INTO public.user_activity_log (user_id, action, details)
    VALUES (
      auth.uid(), 
      'delete_user', 
      json_build_object(
        'deleted_user_id', delete_target_user_id::text, 
        'email', target_user_email, 
        'role', target_user_role
      )
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the specific error for debugging
      RAISE LOG 'Error in delete_user function: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      -- Re-raise the exception with a user-friendly message
      RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
  END;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the admin_delete_user function that the service expects
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Call the main delete_user function with renamed parameter
  RETURN public.delete_user(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.toggle_user_active_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
