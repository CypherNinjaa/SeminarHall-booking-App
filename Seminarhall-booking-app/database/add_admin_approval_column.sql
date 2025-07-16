-- Add Admin Approval Column to Profiles Table
-- This script adds the approved_by_admin column to support admin approval workflow
-- Run this in your Supabase SQL Editor

-- Add the approved_by_admin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_by_admin BOOLEAN DEFAULT FALSE;

-- Auto-approve existing admin and super_admin users
UPDATE public.profiles 
SET approved_by_admin = TRUE 
WHERE role IN ('admin', 'super_admin');

-- Auto-approve existing faculty users (for backward compatibility)
-- Remove this line if you want existing faculty to require approval
UPDATE public.profiles 
SET approved_by_admin = TRUE 
WHERE role = 'faculty';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_approved_by_admin 
ON public.profiles(approved_by_admin);

-- Add index for role and approval status queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_approved 
ON public.profiles(role, approved_by_admin);

-- Create a function for admins to approve users
CREATE OR REPLACE FUNCTION approve_user(
    user_email TEXT,
    approved_by_admin_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    result JSONB;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id
    FROM public.profiles
    WHERE email = user_email 
    AND role = 'faculty'
    AND is_active = TRUE;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Faculty user with email % not found or inactive', user_email;
    END IF;
    
    -- Check if user is already approved
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = target_user_id
        AND approved_by_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'User % is already approved', user_email;
    END IF;
    
    -- Update user approval status
    UPDATE public.profiles
    SET
        approved_by_admin = TRUE,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the approval (if admin_activity_logs table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs') THEN
        INSERT INTO public.admin_activity_logs (
            admin_id,
            action,
            target_type,
            target_id,
            old_values,
            new_values,
            notes
        ) VALUES (
            approved_by_admin_id,
            'approve_user',
            'user',
            target_user_id,
            json_build_object('approved_by_admin', false),
            json_build_object('approved_by_admin', true),
            'User approved for app access'
        );
    END IF;
    
    -- Return success result
    result := json_build_object(
        'success', TRUE,
        'message', 'User approved successfully',
        'user_id', target_user_id,
        'email', user_email
    );
    
    return result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for admins to revoke approval
CREATE OR REPLACE FUNCTION revoke_user_approval(
    user_email TEXT,
    revoked_by_admin_id UUID DEFAULT NULL,
    reason TEXT DEFAULT 'Administrative decision'
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    result JSONB;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id
    FROM public.profiles
    WHERE email = user_email 
    AND role = 'faculty'
    AND is_active = TRUE;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Faculty user with email % not found or inactive', user_email;
    END IF;
    
    -- Check if user is currently approved
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = target_user_id
        AND approved_by_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'User % is not currently approved', user_email;
    END IF;
    
    -- Update user approval status
    UPDATE public.profiles
    SET
        approved_by_admin = FALSE,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the revocation (if admin_activity_logs table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs') THEN
        INSERT INTO public.admin_activity_logs (
            admin_id,
            action,
            target_type,
            target_id,
            old_values,
            new_values,
            notes
        ) VALUES (
            revoked_by_admin_id,
            'revoke_user_approval',
            'user',
            target_user_id,
            json_build_object('approved_by_admin', true),
            json_build_object('approved_by_admin', false),
            reason
        );
    END IF;
    
    -- Return success result
    result := json_build_object(
        'success', TRUE,
        'message', 'User approval revoked successfully',
        'user_id', target_user_id,
        'email', user_email
    );
    
    return result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for pending approvals
CREATE OR REPLACE VIEW pending_user_approvals AS
SELECT 
    id,
    email,
    name,
    department,
    employee_id,
    phone,
    created_at,
    updated_at
FROM public.profiles
WHERE role = 'faculty' 
AND approved_by_admin = FALSE 
AND is_active = TRUE
ORDER BY created_at DESC;

-- Grant necessary permissions
GRANT SELECT ON pending_user_approvals TO authenticated;
GRANT EXECUTE ON FUNCTION approve_user(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_user_approval(TEXT, UUID, TEXT) TO authenticated;

-- Success message
SELECT 'Admin approval system has been successfully set up!' AS status;

-- Show current approval status
SELECT 
    role,
    approved_by_admin,
    COUNT(*) as user_count
FROM public.profiles 
GROUP BY role, approved_by_admin
ORDER BY role, approved_by_admin;
