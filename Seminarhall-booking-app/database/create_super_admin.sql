-- Create Super Admin User
-- Run this in your Supabase SQL Editor after creating the user in Authentication

-- Replace 'your.email@example.com' with the email you want to make super admin
INSERT INTO public.profiles (id, email, name, role, is_active)
SELECT id, email, 'Super Administrator', 'super_admin', TRUE
FROM auth.users
WHERE email = 'vikashkelly@gmail.com'  -- Replace with your actual email
ON CONFLICT (id) DO UPDATE SET 
  role = 'super_admin',
  name = 'Super Administrator',
  is_active = TRUE;

-- Verify the super admin was created
SELECT email, name, role, is_active FROM public.profiles WHERE role = 'super_admin';
