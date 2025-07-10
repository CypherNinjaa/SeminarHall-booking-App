# Fixing Supabase Service Role Client Error

This document explains how to fix the "Service role client not initialized" error in the Super Admin user management functionality.

## Problem

The error occurs because the React Native app was trying to use Supabase service role client directly in the frontend, which is a security risk and not supported in client-side applications.

## Solution

We've refactored the user management service to use secure RPC functions instead of direct service role client access.

## Required Database Setup

You need to run the SQL functions in your Supabase SQL editor. These functions handle user management operations securely on the server side.

### 1. Run the Admin Functions

Execute the SQL code in `database/admin_functions.sql` in your Supabase SQL editor. This will create:

- `admin_create_user()` - For creating new users
- `admin_update_user()` - For updating user profiles
- `admin_delete_user()` - For deleting users

### 2. Ensure Required Database Schema

Make sure your database has the following tables and columns:

#### profiles table

```sql
-- Should already exist, but verify these columns:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
```

#### user_activity_log table

```sql
-- Create if it doesn't exist
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
```

## Changes Made

### 1. Updated userManagementService.ts

- Removed service role client initialization
- Updated `deleteUser()` to use `admin_delete_user()` RPC
- Updated `createUser()` to use `admin_create_user()` RPC
- Added new `updateUser()` method using `admin_update_user()` RPC

### 2. Updated SuperAdminScreen.tsx

- Modified `handleSaveUser()` to use the new `updateUser()` service method
- Simplified user update logic

### 3. Updated supabaseSetup.ts

- Removed service role client setup

## Testing

After running the SQL functions, test the following in the Super Admin screen:

1. **Delete User**: Should work without the service role error
2. **Edit User**: Should update user information properly
3. **Toggle Active Status**: Should continue to work as before
4. **Role Changes**: Should work through the RPC functions

## Security Notes

- All admin operations now go through secure RPC functions
- Functions check for super_admin role before allowing operations
- Activity logging is handled server-side
- No sensitive keys are exposed in the client

## Limitations

The current implementation has one limitation:

- **Auth User Deletion**: The `admin_delete_user()` function only deletes the profile, not the actual auth user. Complete user deletion requires additional server-side setup.

To fully delete auth users, you would need:

1. A server-side API endpoint with service role access
2. Or a Supabase Edge Function with service role permissions

For now, the profile deletion is sufficient for most use cases, and inactive users can be disabled instead of deleted.
