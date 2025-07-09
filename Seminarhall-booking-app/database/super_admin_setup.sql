-- Super Admin Setup for Seminar Hall Booking App
-- This script sets up the database schema and permissions for super admin functionality

-- Create necessary extensions if not already created
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profile table with role management
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'faculty')),
    department TEXT,
    employee_id TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Create activity log to track changes
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'super_admin' 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Function to check if user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'super_admin') 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Function for promoting/demoting users (change role)
CREATE OR REPLACE FUNCTION public.change_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
BEGIN
  -- Check if the current user is authorized (must be super_admin)
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can change user roles';
    RETURN FALSE;
  END IF;
  
  -- Make sure the new role is valid
  IF new_role NOT IN ('super_admin', 'admin', 'faculty') THEN
    RAISE EXCEPTION 'Invalid role. Must be super_admin, admin, or faculty';
    RETURN FALSE;
  END IF;
  
  -- If promoting to super_admin, only allow if target is currently admin
  SELECT role INTO target_user_role FROM public.profiles WHERE id = user_id;
  
  IF new_role = 'super_admin' AND target_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can be promoted to super_admin';
    RETURN FALSE;
  END IF;
  
  -- Update user role
  UPDATE public.profiles 
  SET 
    role = new_role,
    updated_at = NOW() 
  WHERE id = user_id;
  
  -- Log the activity
  INSERT INTO public.user_activity_log (user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    'change_role', 
    user_id, 
    json_build_object('old_role', target_user_role, 'new_role', new_role)
  );
  
  -- Create notification for the user
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    user_id,
    'Role Updated',
    'Your account role has been changed to ' || new_role,
    'system',
    json_build_object('old_role', target_user_role, 'new_role', new_role)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Function to activate/deactivate user accounts
CREATE OR REPLACE FUNCTION public.toggle_user_active_status(user_id UUID, is_active BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
  current_active_status BOOLEAN;
BEGIN
  -- Check if current user is authorized (must be super_admin or admin)
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only super_admin and admin can activate/deactivate accounts';
    RETURN FALSE;
  END IF;
  
  -- Get target user info
  SELECT role, is_active INTO target_user_role, current_active_status 
  FROM public.profiles 
  WHERE id = user_id;
  
  -- Admin cannot deactivate super_admin
  IF current_user_role = 'admin' AND target_user_role = 'super_admin' THEN
    RAISE EXCEPTION 'Admin cannot modify super_admin accounts';
    RETURN FALSE;
  END IF;
  
  -- Update active status
  UPDATE public.profiles 
  SET 
    is_active = toggle_user_active_status.is_active,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Log the activity
  INSERT INTO public.user_activity_log (user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    CASE WHEN toggle_user_active_status.is_active THEN 'activate_user' ELSE 'deactivate_user' END, 
    user_id, 
    json_build_object('old_status', current_active_status, 'new_status', toggle_user_active_status.is_active)
  );
  
  -- Create notification for the user
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    user_id,
    CASE WHEN toggle_user_active_status.is_active THEN 'Account Activated' ELSE 'Account Deactivated' END,
    CASE WHEN toggle_user_active_status.is_active 
      THEN 'Your account has been activated. You can now use the system.'
      ELSE 'Your account has been deactivated. Please contact administration.'
    END,
    'system',
    json_build_object('is_active', toggle_user_active_status.is_active)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely delete user accounts
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
  target_user_email TEXT;
BEGIN
  -- Check if current user is authorized (must be super_admin)
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can delete user accounts';
    RETURN FALSE;
  END IF;
  
  -- Get target user info
  SELECT role, email INTO target_user_role, target_user_email FROM public.profiles WHERE id = user_id;
  
  -- Log the deletion activity
  INSERT INTO public.user_activity_log (user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    'delete_user', 
    user_id, 
    json_build_object('email', target_user_email, 'role', target_user_role)
  );
  
  -- Delete user from auth.users (will cascade to profiles due to foreign key constraint)
  -- NOTE: For this to work, you need to enable the "service role" in your application code
  -- This is because only Supabase can delete from auth.users
  RETURN TRUE; -- actual deletion happens in the service role function
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analytics
CREATE OR REPLACE FUNCTION public.get_user_analytics()
RETURNS TABLE (
  total_users BIGINT,
  super_admins BIGINT,
  admins BIGINT,
  faculty BIGINT,
  active_users BIGINT,
  inactive_users BIGINT,
  new_users_last_30_days BIGINT
) AS $$
BEGIN
  IF NOT public.is_admin_or_super_admin() THEN
    RAISE EXCEPTION 'Only admins can access user analytics';
  END IF;
  
  RETURN QUERY
    SELECT
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE role = 'super_admin') as super_admins,
      COUNT(*) FILTER (WHERE role = 'admin') as admins,
      COUNT(*) FILTER (WHERE role = 'faculty') as faculty,
      COUNT(*) FILTER (WHERE is_active = TRUE) as active_users,
      COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_users,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_last_30_days
    FROM public.profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to implement a password reset request
-- This only creates a notification - actual password reset happens via auth hooks
CREATE OR REPLACE FUNCTION public.request_password_reset(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Check if current user is authorized
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only admins can request password resets';
    RETURN FALSE;
  END IF;
  
  -- Get target user ID
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
    RETURN FALSE;
  END IF;
  
  -- Log the password reset request
  INSERT INTO public.user_activity_log (user_id, action, target_user_id, details)
  VALUES (
    auth.uid(),
    'password_reset_request',
    target_user_id,
    json_build_object('email', user_email)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up Row Level Security Policies

-- Profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Super admins can read all profiles
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.is_super_admin());

-- Admins can read all non-super-admin profiles
CREATE POLICY "Admins can view non-super-admin profiles" 
ON public.profiles FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
  AND 
  role != 'super_admin'
);


-- Corrected policy for updating own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  -- Remove the OLD.role = NEW.role condition as it's not valid in RLS policies
);

-- To prevent users from changing their own role, we need a different approach
-- Option 1: Create a trigger to prevent role changes by non-super-admins
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed and the user is not a super_admin
  IF OLD.role <> NEW.role AND auth.uid() = OLD.id THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_self_role_change ON public.profiles;
CREATE TRIGGER prevent_self_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_change();

-- Only super admins can change roles, but through the function
CREATE POLICY "Only super admins can change roles" 
ON public.profiles FOR UPDATE 
USING (public.is_super_admin());

-- Super admins can insert new profiles (for user creation)
CREATE POLICY "Super admins can create profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (public.is_super_admin());

-- Super admins can delete profiles
CREATE POLICY "Super admins can delete profiles" 
ON public.profiles FOR DELETE 
USING (public.is_super_admin());

-- Activity log policies
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Super admins can read all activity
CREATE POLICY "Super admins can view all activity" 
ON public.user_activity_log FOR SELECT 
USING (public.is_super_admin());

-- Admins can view non-super-admin activity
CREATE POLICY "Admins can view relevant activity" 
ON public.user_activity_log FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
  AND
  action != 'change_role' -- Admins can't see role changes
);

-- Users can only view activity related to them
CREATE POLICY "Users can view own activity" 
ON public.user_activity_log FOR SELECT 
USING (
  user_id = auth.uid() OR target_user_id = auth.uid()
);

-- Notifications policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = auth.uid());

-- Users can update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (user_id = auth.uid());

-- Super admins and admins can create notifications
CREATE POLICY "Admins can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (public.is_admin_or_super_admin());

-- Super admins can delete notifications
CREATE POLICY "Super admins can delete notifications" 
ON public.notifications FOR DELETE 
USING (public.is_super_admin());

-- Create triggers

-- Auto-update the updated_at field
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create initial super_admin user if the table is empty
-- NOTE: You should replace 'your.email@example.com' with your actual super admin email
DO $$
BEGIN
  -- If no super_admin exists yet
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'super_admin') THEN
    -- Check if the user exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'your.email@example.com') THEN
      -- Create super_admin profile
      INSERT INTO public.profiles (id, email, name, role, is_active)
      SELECT id, email, 'Super Administrator', 'super_admin', TRUE
      FROM auth.users
      WHERE email = 'your.email@example.com'
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;
