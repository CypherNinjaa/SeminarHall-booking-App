# Smart Bookings Foreign Key Relationship Fix

## Issue

The admin reports service was failing with the error:

```
ERROR Error fetching detailed bookings: {"code": "PGRST200", "details": "Searched for a foreign key relationship between 'smart_bookings' and 'user_id' in the schema 'public', but no matches were found.", "hint": null, "message": "Could not find a relationship between 'smart_bookings' and 'user_id' in the schema cache"}
```

## Root Cause

Supabase's automatic relationship detection couldn't find the foreign key relationships between:

- `smart_bookings.user_id` → `profiles.id`
- `smart_bookings.hall_id` → `halls.id`
- `smart_bookings.approved_by` → `profiles.id`

This was happening because we were using Supabase's automatic join syntax like:

```typescript
profiles: user_id(name, email, phone, department, role);
halls: hall_id(name, capacity, location, type);
```

## Solution

Replaced automatic relationship detection with manual data fetching and joining:

### 1. **getDetailedBookings() Method**

- First fetch `smart_bookings` data without relationships
- Extract unique hall IDs, user IDs, and approver IDs
- Fetch related data separately from `halls` and `profiles` tables
- Create lookup maps for efficient joining
- Transform and combine data manually

### 2. **getPopularHalls() Method**

- Fetch `smart_bookings` data with only `hall_id` and `duration_minutes`
- Separately fetch hall names from `halls` table
- Manual join and statistics calculation

### 3. **getUserActivity() Method**

- Fetch `smart_bookings` data with only `user_id` and `duration_minutes`
- Separately fetch user profiles from `profiles` table
- Manual join and activity statistics

## Benefits of This Approach

1. **Reliability**: No dependency on automatic relationship detection
2. **Performance**: More control over which fields are fetched
3. **Error Handling**: Better error isolation for each query
4. **Flexibility**: Can handle missing relationships gracefully
5. **Debugging**: Clearer error messages for each step

## Implementation Details

### Before (Automatic Relationships)

```typescript
const { data: bookings, error } = await supabase.from("smart_bookings").select(`
    id, hall_id, user_id,
    halls:hall_id (name, capacity, location, type),
    profiles:user_id (name, email, phone, department, role)
  `);
```

### After (Manual Joins)

```typescript
// Step 1: Get bookings
const { data: bookings } = await supabase
	.from("smart_bookings")
	.select("id, hall_id, user_id, ...");

// Step 2: Get related data
const hallIds = [...new Set(bookings.map((b) => b.hall_id))];
const { data: halls } = await supabase
	.from("halls")
	.select("id, name, capacity, location, type")
	.in("id", hallIds);

// Step 3: Create lookup maps and join
const hallsMap = new Map(halls?.map((h) => [h.id, h]) || []);
// ... transform and join data
```

## Result

- ✅ No more foreign key relationship errors
- ✅ All smart_bookings data properly fetched and joined
- ✅ Complete analytics with user details, hall information, and booking data
- ✅ Robust error handling for each data source
- ✅ Improved performance with targeted queries

The admin reports system now works reliably with the smart_bookings table structure.
