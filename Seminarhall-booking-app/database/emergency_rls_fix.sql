-- Emergency RLS Fix - Handle Dependencies Properly
-- Run this script if the main final_rls_fix.sql encounters dependency issues

-- Step 1: First, let's see what we're dealing with
SELECT 
  'Current policies that might have dependencies:' as info,
  schemaname, 
  tablename, 
  policyname,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (qual LIKE '%is_super_admin%' OR qual LIKE '%is_admin%' OR qual LIKE '%get_user_role%')
ORDER BY tablename, policyname;

-- Step 2: Drop policies with dependencies one by one
-- Profiles table
DO $$
BEGIN
    -- Drop specific policies that we know exist
    BEGIN
        DROP POLICY IF EXISTS "Only super admins can change roles" ON public.profiles;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors if policy doesn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Super admins can create profiles" ON public.profiles;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Super admins can update profiles" ON public.profiles;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- Notifications table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        BEGIN
            DROP POLICY IF EXISTS "Super admins can delete notifications" ON public.notifications;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        
        BEGIN
            DROP POLICY IF EXISTS "Super admins can view all notifications" ON public.notifications;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- Step 3: Now drop all other policies that might reference the old functions
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (qual LIKE '%is_super_admin()%' OR qual LIKE '%is_admin()%' OR qual LIKE '%get_user_role()%')
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
            RAISE NOTICE 'Dropped policy % on table %', policy_record.policyname, policy_record.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop policy % on table %: %', policy_record.policyname, policy_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 4: Now we can safely drop the functions with CASCADE
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_safe() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin_safe() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

-- Step 5: Clean up any remaining function variants
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_admin() CASCADE;

-- Step 6: Create the new safe functions using the corrected syntax
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from JWT claims if available (using corrected syntax)
  user_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  
  -- If no role in JWT, return default
  IF user_role IS NULL OR user_role = '' THEN
    RETURN 'faculty';
  END IF;
  
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'faculty';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_role() = 'super_admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_role() IN ('admin', 'super_admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the missing function that the app is looking for (analytics)
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_role() IN ('admin', 'super_admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Step 7: Create the metadata sync functions
CREATE OR REPLACE FUNCTION public.update_user_role_metadata(user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  -- Update the user's app_metadata with their role
  -- Note: This requires service role privileges and may not work with RLS
  -- We'll handle this in the application layer instead
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = user_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors - we'll handle role sync in the app
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's metadata when their profile role changes
  -- For now, we'll skip this and handle it in the application
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
    -- Try to update metadata, but don't fail if it doesn't work
    BEGIN
      PERFORM public.update_user_role_metadata(NEW.id, NEW.role);
    EXCEPTION WHEN OTHERS THEN
      -- Log the attempt but continue
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create new safe policies with existence checks
-- Profiles table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Enable RLS first
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Check if policy exists before creating
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Authenticated users can read profiles') THEN
            CREATE POLICY "Authenticated users can read profiles" 
            ON public.profiles FOR SELECT 
            USING (auth.role() = 'authenticated');
        END IF;
        
        -- Check if policy exists before creating
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
            CREATE POLICY "Users can insert own profile" 
            ON public.profiles FOR INSERT 
            WITH CHECK (auth.uid() = id);
        END IF;
        
        -- Check if policy exists before creating - THIS WAS THE PROBLEMATIC ONE
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
            CREATE POLICY "Users can update own profile" 
            ON public.profiles FOR UPDATE 
            USING (auth.uid() = id) 
            WITH CHECK (auth.uid() = id);
        END IF;
        
        -- Check if policy exists before creating
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Super admins can manage all profiles') THEN
            CREATE POLICY "Super admins can manage all profiles" 
            ON public.profiles FOR ALL 
            USING (public.current_user_is_super_admin()) 
            WITH CHECK (public.current_user_is_super_admin());
        END IF;
    END IF;
END $$;

-- User activity log with existence checks
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_log') THEN
        ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_activity_log' AND policyname = 'Anyone can read activity logs') THEN
            CREATE POLICY "Anyone can read activity logs" 
            ON public.user_activity_log FOR SELECT 
            USING (true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_activity_log' AND policyname = 'System can insert activity logs') THEN
            CREATE POLICY "System can insert activity logs" 
            ON public.user_activity_log FOR INSERT 
            WITH CHECK (true);
        END IF;
    END IF;
END $$;

-- Notifications table with existence checks
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view own notifications') THEN
            CREATE POLICY "Users can view own notifications" 
            ON public.notifications FOR SELECT 
            USING (auth.uid() = user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Super admins can manage notifications') THEN
            CREATE POLICY "Super admins can manage notifications" 
            ON public.notifications FOR ALL 
            USING (public.current_user_is_super_admin()) 
            WITH CHECK (public.current_user_is_super_admin());
        END IF;
    END IF;
END $$;

-- Step 9: Set up the trigger
DROP TRIGGER IF EXISTS sync_user_role_metadata_trigger ON public.profiles;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE TRIGGER sync_user_role_metadata_trigger
          AFTER INSERT OR UPDATE OF role ON public.profiles
          FOR EACH ROW
          EXECUTE FUNCTION public.sync_user_role_to_metadata();
    END IF;
END $$;

-- Step 10: Update existing users' metadata
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    FOR profile_record IN SELECT id, role FROM public.profiles LOOP
      PERFORM public.update_user_role_metadata(profile_record.id, profile_record.role);
    END LOOP;
  END IF;
END $$;

-- Step 11: Final verification
SELECT 'Emergency RLS fix completed! Checking results...' as status;

-- Show what we have now
SELECT 
  'Functions created:' as info,
  routine_name, 
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name LIKE '%current_user%'
ORDER BY routine_name;

SELECT 
  'Policies created:' as info,
  schemaname, 
  tablename, 
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;