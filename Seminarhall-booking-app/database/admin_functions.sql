-- Admin Functions for Secure User Management
-- These functions should be run in your Supabase SQL editor

-- Function to create a new user (admin only)
CREATE OR REPLACE FUNCTION admin_create_user(
  user_email text,
  user_password text,
  user_name text,
  user_role text DEFAULT 'faculty',
  user_department text DEFAULT null,
  user_employee_id text DEFAULT null,
  user_phone text DEFAULT null
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  result json;
BEGIN
  -- Check if the current user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'User with email % already exists', user_email;
  END IF;

  -- Create the auth user (this requires service role, but we'll handle it differently)
  -- For now, we'll create a profile and let the user sign up normally
  -- Generate a UUID for the new user
  new_user_id := gen_random_uuid();
  
  -- Insert into profiles table
  INSERT INTO profiles (
    id,
    email,
    name,
    role,
    department,
    employee_id,
    phone,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    user_email,
    user_name,
    user_role::user_role,
    user_department,
    user_employee_id,
    user_phone,
    true,
    now(),
    now()
  );

  -- Log the activity
  INSERT INTO user_activity_log (
    user_id,
    action,
    details,
    target_user_id
  )
  VALUES (
    auth.uid(),
    'user_created',
    json_build_object(
      'created_user_email', user_email,
      'created_user_name', user_name,
      'created_user_role', user_role
    ),
    new_user_id
  );

  -- Return success with temporary password instructions
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'User profile created. User must sign up with email: ' || user_email,
    'temp_password', user_password
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
END;
$$;

-- Function to update a user (admin only)
CREATE OR REPLACE FUNCTION admin_update_user(
  user_id uuid,
  user_name text DEFAULT null,
  user_department text DEFAULT null,
  user_employee_id text DEFAULT null,
  user_phone text DEFAULT null,
  user_role text DEFAULT null
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_data json;
  result json;
BEGIN
  -- Check if the current user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  -- Get old data for logging
  SELECT to_json(profiles.*) INTO old_data 
  FROM profiles 
  WHERE id = user_id;

  IF old_data IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update the user
  UPDATE profiles
  SET
    name = COALESCE(user_name, name),
    department = COALESCE(user_department, department),
    employee_id = COALESCE(user_employee_id, employee_id),
    phone = COALESCE(user_phone, phone),
    role = COALESCE(user_role::user_role, role),
    updated_at = now()
  WHERE id = user_id;

  -- Log the activity
  INSERT INTO user_activity_log (
    user_id,
    action,
    details,
    target_user_id
  )
  VALUES (
    auth.uid(),
    'user_updated',
    json_build_object(
      'old_data', old_data,
      'updated_fields', json_build_object(
        'name', user_name,
        'department', user_department,
        'employee_id', user_employee_id,
        'phone', user_phone,
        'role', user_role
      )
    ),
    user_id
  );

  result := json_build_object(
    'success', true,
    'message', 'User updated successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update user: %', SQLERRM;
END;
$$;

-- Function to delete a user (admin only)
-- This function only handles profile and related data deletion
-- Auth user deletion is handled by the Edge Function
CREATE OR REPLACE FUNCTION admin_delete_user(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_data json;
  result json;
BEGIN
  -- Check if the current user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  -- Get user data for logging
  SELECT to_json(profiles.*) INTO user_data 
  FROM profiles 
  WHERE id = user_id;

  IF user_data IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Prevent self-deletion
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Log the activity before deletion
  INSERT INTO user_activity_log (
    user_id,
    action,
    details,
    target_user_id
  )
  VALUES (
    auth.uid(),
    'user_deleted',
    json_build_object(
      'deleted_user_data', user_data
    ),
    user_id
  );

  -- Delete related data first (cascade should handle this, but being explicit)
  -- Use the function parameter directly to avoid ambiguous column references
  DELETE FROM user_activity_log WHERE target_user_id = user_id;
  DELETE FROM bookings WHERE user_id = admin_delete_user.user_id;
  DELETE FROM notifications WHERE user_id = admin_delete_user.user_id;
  
  -- Delete the profile
  DELETE FROM profiles WHERE id = user_id;

  result := json_build_object(
    'success', true,
    'message', 'User profile and related data deleted successfully.'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
END;
$$;

-- Grant execute permissions to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION admin_create_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;
