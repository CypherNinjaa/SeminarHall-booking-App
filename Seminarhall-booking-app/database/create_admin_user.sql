-- Create Admin User Script
-- This script creates an admin user for your Seminar Hall Booking App
-- Run this in your Supabase SQL editor AFTER running the admin_panel_schema.sql

-- =====================================================
-- 1. ADMIN USER CREATION FUNCTION
-- =====================================================

-- Function to create admin users (can be called by super_admin or during initial setup)
CREATE OR REPLACE FUNCTION create_admin_user(
    admin_email TEXT,
    admin_name TEXT,
    admin_department TEXT DEFAULT 'Administration',
    admin_employee_id TEXT DEFAULT NULL,
    admin_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    admin_user_id UUID;
    result JSONB;
BEGIN
    -- Generate a UUID for the admin user
    admin_user_id := gen_random_uuid();
    
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE email = admin_email) THEN
        RAISE EXCEPTION 'User with email % already exists', admin_email;
    END IF;
    
    -- Insert admin profile
    INSERT INTO public.profiles (
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
        admin_user_id,
        admin_email,
        admin_name,
        'admin',
        admin_department,
        admin_employee_id,
        admin_phone,
        TRUE,
        NOW(),
        NOW()
    );
    
    -- Log the admin creation
    INSERT INTO public.admin_activity_logs (
        admin_id,
        action,
        target_type,
        target_id,
        new_values,
        notes
    )
    VALUES (
        COALESCE(auth.uid(), admin_user_id), -- Use current user or the new admin if no auth context
        'admin_user_created',
        'user',
        admin_user_id,
        jsonb_build_object(
            'email', admin_email,
            'name', admin_name,
            'role', 'admin',
            'department', admin_department
        ),
        'Admin user created via SQL script'
    );
    
    -- Create welcome notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data
    )
    VALUES (
        admin_user_id,
        'Welcome to Admin Panel',
        'Your admin account has been created. You now have access to the Admin Panel for managing halls, bookings, and generating reports.',
        'welcome',
        jsonb_build_object('role', 'admin', 'created_at', NOW())
    );
    
    result := jsonb_build_object(
        'success', TRUE,
        'admin_id', admin_user_id,
        'email', admin_email,
        'name', admin_name,
        'role', 'admin',
        'message', 'Admin user created successfully. User must sign up with this email: ' || admin_email,
        'next_steps', jsonb_build_array(
            'User should sign up using the email: ' || admin_email,
            'User will automatically get admin privileges',
            'User can access Admin Panel from Profile menu',
            'User can manage halls, bookings, and generate reports'
        )
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create admin user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. BULK ADMIN CREATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_multiple_admins(
    admin_users JSONB
)
RETURNS JSONB AS $$
DECLARE
    admin_user JSONB;
    result JSONB;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    results JSONB := '[]'::JSONB;
    individual_result JSONB;
BEGIN
    -- Loop through each admin user in the input array
    FOR admin_user IN SELECT * FROM jsonb_array_elements(admin_users)
    LOOP
        BEGIN
            -- Create individual admin
            SELECT create_admin_user(
                admin_user->>'email',
                admin_user->>'name',
                COALESCE(admin_user->>'department', 'Administration'),
                admin_user->>'employee_id',
                admin_user->>'phone'
            ) INTO individual_result;
            
            success_count := success_count + 1;
            results := results || individual_result;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                individual_result := jsonb_build_object(
                    'success', FALSE,
                    'email', admin_user->>'email',
                    'error', SQLERRM
                );
                results := results || individual_result;
        END;
    END LOOP;
    
    result := jsonb_build_object(
        'total_processed', success_count + error_count,
        'successful_creations', success_count,
        'failed_creations', error_count,
        'results', results
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CREATE SAMPLE ADMIN USERS
-- =====================================================

-- Create a default admin user (modify the details as needed)
SELECT create_admin_user(
    'vk6938663@gmail.com',          -- Email (user must sign up with this)
    'Admin User',                    -- Full name
    'IT Administration',             -- Department
    'ADMIN001',                      -- Employee ID
    '+1-555-0123'                   -- Phone number
);


-- Create multiple admins at once (example)
/*
SELECT create_multiple_admins(
    '[
        {
            "email": "admin1@university.edu",
            "name": "John Admin",
            "department": "Computer Science",
            "employee_id": "CS_ADMIN01",
            "phone": "+1-555-1001"
        },
        {
            "email": "admin2@university.edu", 
            "name": "Jane Administrator",
            "department": "Mathematics",
            "employee_id": "MATH_ADMIN01",
            "phone": "+1-555-1002"
        }
    ]'::JSONB
);
*/

-- =====================================================
-- 4. ADMIN ROLE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to promote user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(
    user_email TEXT,
    promoted_by_admin UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    result JSONB;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id 
    FROM public.profiles 
    WHERE email = user_email AND is_active = TRUE;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found or inactive', user_email;
    END IF;
    
    -- Check if user is already admin or super_admin
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = target_user_id 
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'User % is already an admin', user_email;
    END IF;
    
    -- Update user role to admin
    UPDATE public.profiles 
    SET 
        role = 'admin',
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the promotion
    INSERT INTO public.admin_activity_logs (
        admin_id,
        action,
        target_type,
        target_id,
        old_values,
        new_values,
        notes
    )
    VALUES (
        COALESCE(promoted_by_admin, auth.uid(), target_user_id),
        'user_promoted_to_admin',
        'user',
        target_user_id,
        jsonb_build_object('role', 'faculty'),
        jsonb_build_object('role', 'admin'),
        'User promoted to admin role'
    );
    
    -- Create notification for the promoted user
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data
    )
    VALUES (
        target_user_id,
        'Promoted to Admin',
        'Congratulations! You have been promoted to Admin. You now have access to the Admin Panel.',
        'role_change',
        jsonb_build_object('new_role', 'admin', 'promoted_at', NOW())
    );
    
    result := jsonb_build_object(
        'success', TRUE,
        'user_id', target_user_id,
        'email', user_email,
        'new_role', 'admin',
        'message', 'User successfully promoted to admin'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to promote user to admin: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote admin to faculty
CREATE OR REPLACE FUNCTION demote_admin_to_faculty(
    user_email TEXT,
    demoted_by_admin UUID DEFAULT NULL,
    reason TEXT DEFAULT 'Administrative decision'
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    result JSONB;
BEGIN
    -- Find admin user by email
    SELECT id INTO target_user_id 
    FROM public.profiles 
    WHERE email = user_email 
    AND role = 'admin' 
    AND is_active = TRUE;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Admin user with email % not found or inactive', user_email;
    END IF;
    
    -- Prevent demoting super_admin
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = target_user_id 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Cannot demote super_admin users';
    END IF;
    
    -- Update user role to faculty
    UPDATE public.profiles 
    SET 
        role = 'faculty',
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the demotion
    INSERT INTO public.admin_activity_logs (
        admin_id,
        action,
        target_type,
        target_id,
        old_values,
        new_values,
        notes
    )
    VALUES (
        COALESCE(demoted_by_admin, auth.uid()),
        'admin_demoted_to_faculty',
        'user',
        target_user_id,
        jsonb_build_object('role', 'admin'),
        jsonb_build_object('role', 'faculty'),
        reason
    );
    
    -- Create notification for the demoted user
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data
    )
    VALUES (
        target_user_id,
        'Role Changed',
        'Your role has been changed to Faculty. You no longer have access to Admin Panel features.',
        'role_change',
        jsonb_build_object('new_role', 'faculty', 'reason', reason, 'changed_at', NOW())
    );
    
    result := jsonb_build_object(
        'success', TRUE,
        'user_id', target_user_id,
        'email', user_email,
        'new_role', 'faculty',
        'reason', reason,
        'message', 'Admin successfully demoted to faculty'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to demote admin: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ADMIN USER MANAGEMENT VIEWS
-- =====================================================

-- View to see all admin users
CREATE OR REPLACE VIEW admin_users_list AS
SELECT 
    id,
    email,
    name,
    role,
    department,
    employee_id,
    phone,
    is_active,
    created_at,
    updated_at,
    last_login_at
FROM public.profiles
WHERE role IN ('admin', 'super_admin')
ORDER BY role DESC, name ASC;

-- View to see recent admin activities
CREATE OR REPLACE VIEW recent_admin_activities AS
SELECT 
    aal.id,
    aal.action,
    aal.target_type,
    aal.target_id,
    aal.notes,
    aal.created_at,
    p.name as admin_name,
    p.email as admin_email
FROM public.admin_activity_logs aal
LEFT JOIN public.profiles p ON aal.admin_id = p.id
ORDER BY aal.created_at DESC
LIMIT 100;

-- =====================================================
-- 6. HELPFUL QUERIES FOR VERIFICATION
-- =====================================================

-- Check if admin users were created successfully
SELECT 
    'Admin Users Created:' as info,
    COUNT(*) as count
FROM public.profiles 
WHERE role = 'admin';

-- List all created admin users
SELECT 
    email,
    name,
    department,
    employee_id,
    created_at
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Check admin activity logs
SELECT 
    action,
    target_type,
    notes,
    created_at
FROM public.admin_activity_logs 
WHERE action LIKE '%admin%'
ORDER BY created_at DESC
LIMIT 10;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'ADMIN USER CREATION COMPLETED!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- create_admin_user()';
    RAISE NOTICE '- create_multiple_admins()'; 
    RAISE NOTICE '- promote_to_admin()';
    RAISE NOTICE '- demote_admin_to_faculty()';
    RAISE NOTICE '';
    RAISE NOTICE 'Default admin users created:';
    RAISE NOTICE '- admin@university.edu';
    RAISE NOTICE '- hallmanager@university.edu';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Users must sign up in your app using the admin emails';
    RAISE NOTICE '2. They will automatically get admin privileges';
    RAISE NOTICE '3. They can access Admin Panel from Profile menu';
    RAISE NOTICE '4. Modify admin emails above as needed for your organization';
    RAISE NOTICE '===========================================';
END $$;
