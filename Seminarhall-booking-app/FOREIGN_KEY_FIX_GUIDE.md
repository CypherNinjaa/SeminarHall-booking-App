# Manual Database Fix Application

## Issue

The app is showing this error:

```
Could not find a relationship between 'smart_bookings' and 'user_id' in the schema cache
```

## Root Cause

The `smart_bookings` table is missing a foreign key constraint to the `profiles` table.

## Quick Code Fix (Alternative to Database Fix)

Since we can't directly apply the database fix, let's modify the booking service to avoid the foreign key lookup:

### Option 1: Modify the query to avoid the foreign key relationship

Instead of using Supabase's automatic relationship resolution, we can manually join the tables.

### Option 2: Use separate queries

Fetch the booking data and user data separately, then combine them in the application.

## Immediate Workaround

The error is happening in the `updateBookingStatus` function when it tries to fetch booking details. Let's modify the service to handle this gracefully.

## Apply This Fix Manually in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this command:

```sql
-- Add missing foreign key constraint
ALTER TABLE public.smart_bookings
ADD CONSTRAINT smart_bookings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

## Test the Fix

After applying the database fix, the booking status updates should work properly.
