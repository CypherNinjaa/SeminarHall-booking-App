# Complete Fix for Ambiguous Column References

## Summary

This script resolves all ambiguous `user_id` and `target_user_id` column reference errors in user management functions.

## Issues Fixed

1. **toggle_user_active_status function**: Ambiguous `is_active` parameter vs column name
2. **delete_user function**: Ambiguous `target_user_id` parameter vs column name
3. **Missing admin_delete_user function**: Service expected this function but it didn't exist

## Key Improvements

- **Table Aliases**: Used `p` for profiles table and `ual` for user_activity_log table
- **Parameter Naming**: Changed `user_id` to `target_user_id` and `is_active` to `new_active_status`
- **Security**: Only super_admin can delete users, super_admin and admin can toggle status
- **Data Integrity**: Proper cleanup order - related data first, then main record
- **Error Handling**: Comprehensive validation and meaningful error messages

## Functions Created/Updated

1. `public.toggle_user_active_status(target_user_id UUID, new_active_status BOOLEAN)`
2. `public.delete_user(target_user_id UUID)`
3. `public.admin_delete_user(user_id UUID)` - wrapper for service compatibility

## How to Apply

1. Copy the complete SQL script from `database/fix_ambiguous_references.sql`
2. Run it in your Supabase SQL Editor
3. Verify functions are created without errors
4. Test user deletion and status toggle functionality

## Expected Result

- ✅ No more "column reference is ambiguous" errors
- ✅ User deletion works properly with full cleanup
- ✅ User status toggle works for authorized roles
- ✅ Activity logging works without conflicts
- ✅ SuperAdmin authentication modal prevents unauthorized access
