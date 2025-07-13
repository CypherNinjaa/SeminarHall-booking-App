-- Simple and robust user status toggle function
-- This version removes the problematic ON CONFLICT notification logic

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.toggle_user_active_status(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.toggle_user_active_status(target_user_id UUID, new_active_status BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
  current_active_status BOOLEAN;
  target_user_name TEXT;
  target_user_email TEXT;
BEGIN
  -- Check if current user is authorized (must be super_admin or admin)
  SELECT p.role INTO current_user_role 
  FROM public.profiles p 
  WHERE p.id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only super_admin and admin can activate/deactivate accounts';
  END IF;
  
  -- Get target user info
  SELECT p.role, p.is_active, p.name, p.email 
  INTO target_user_role, current_active_status, target_user_name, target_user_email
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  IF target_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Admin cannot modify super_admin accounts
  IF current_user_role = 'admin' AND target_user_role = 'super_admin' THEN
    RAISE EXCEPTION 'Admin cannot modify super_admin accounts';
  END IF;
  
  -- Prevent deactivating the last super_admin
  IF target_user_role = 'super_admin' AND new_active_status = FALSE THEN
    DECLARE
      active_super_admin_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO active_super_admin_count
      FROM public.profiles
      WHERE role = 'super_admin' AND is_active = TRUE AND id != target_user_id;
      
      IF active_super_admin_count = 0 THEN
        RAISE EXCEPTION 'Cannot deactivate the last active super_admin';
      END IF;
    END;
  END IF;
  
  -- Update active status
  UPDATE public.profiles 
  SET 
    is_active = new_active_status,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the activity (simplified)
  INSERT INTO public.user_activity_log (user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    CASE WHEN new_active_status THEN 'activate_user' ELSE 'deactivate_user' END, 
    target_user_id, 
    json_build_object(
      'target_name', target_user_name,
      'target_email', target_user_email,
      'old_status', current_active_status, 
      'new_status', new_active_status,
      'action_by', current_user_role
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.toggle_user_active_status(UUID, BOOLEAN) TO authenticated;
