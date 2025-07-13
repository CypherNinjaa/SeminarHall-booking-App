# Delete User Function Fix

## Problem

The user deletion functionality was failing with the error:

```
"Failed to delete user: column reference "user_id" is ambiguous"
```

## Root Causes

1. **Missing Function**: The service was calling `admin_delete_user()` but only `delete_user()` existed in the database
2. **Ambiguous Column Reference**: The function had ambiguous `user_id` references when inserting into `user_activity_log` table

## Solution Applied

### 1. Fixed Ambiguous References

- Changed function parameter from `user_id` to `target_user_id` to avoid naming conflicts
- Used table aliases (`p.role`, `p.email`) in SELECT statements
- Qualified column names in DELETE operations where needed

### 2. Created Missing Function

- Added `admin_delete_user()` function that wraps the main `delete_user()` function
- This maintains compatibility with the existing service code

### 3. Improved Delete Order

- Delete related records first (bookings, activity logs)
- Log the deletion activity after cleanup to avoid conflicts
- Delete the profile last to maintain referential integrity

## Files Changed

- `database/fix_delete_user_function.sql` - New SQL script with fixes

## How to Apply

1. Copy the contents of `database/fix_delete_user_function.sql`
2. Run it in your Supabase SQL Editor
3. Test the user deletion functionality

## Functions Created/Updated

- `public.delete_user(target_user_id UUID)` - Main deletion function (fixed)
- `public.admin_delete_user(user_id UUID)` - Wrapper function for service compatibility (new)

Both functions include proper authorization checks and can only be executed by super_admin users.
