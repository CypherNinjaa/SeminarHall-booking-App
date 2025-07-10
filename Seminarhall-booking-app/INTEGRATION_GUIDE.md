# Complete User Management Integration Guide

## Overview

This guide documents the complete integration between the Edge Function and database functions for secure user management operations.

## Edge Function URL

Your deployed Edge Function:

```
https://dndrqqoejfctqpcbmxyk.supabase.co/functions/v1/admin-auth-operations
```

## Integration Patterns

### 1. Complete User Deletion Flow

**Order**: Profile deletion → Auth user deletion

```typescript
// Step 1: Delete profile and related data via database function
const { data: profileData, error: profileError } = await supabase.rpc(
	"admin_delete_user",
	{ user_id: userId }
);

// Step 2: Delete auth user via Edge Function
const { data: authData, error: authError } = await supabase.functions.invoke(
	"admin-auth-operations",
	{
		body: {
			operation: "deleteUser",
			userId: userId,
		},
	}
);
```

### 2. Complete User Creation Flow

**Order**: Auth user creation → Profile creation + ID update

```typescript
// Step 1: Create auth user via Edge Function
const { data: authData, error: authError } = await supabase.functions.invoke(
	"admin-auth-operations",
	{
		body: {
			operation: "createUser",
			email,
			password,
			userData: { name, role, department, employee_id, phone },
		},
	}
);

// Step 2: Create profile via database function
const { data: profileData, error: profileError } = await supabase.rpc(
	"admin_create_user",
	{
		user_email: email,
		user_password: password,
		user_name: name,
		user_role: role,
		user_department: department,
		user_employee_id: employeeId,
		user_phone: phone,
	}
);

// Step 3: Update profile with real auth user ID
if (authData?.data?.user?.id) {
	await supabase
		.from("profiles")
		.update({ id: authData.data.user.id })
		.eq("email", email);
}
```

### 3. User Invitation Flow

**Order**: Auth invitation → Profile creation

```typescript
// Step 1: Send invitation via Edge Function
const { data: authData, error: authError } = await supabase.functions.invoke(
	"admin-auth-operations",
	{
		body: {
			operation: "inviteUser",
			email,
			userData: { name, role, department, employee_id, phone },
		},
	}
);

// Step 2: Create profile via database function
const { data: profileData, error: profileError } = await supabase.rpc(
	"admin_create_user",
	{
		user_email: email,
		user_password: "temporary", // Changed via reset link
		user_name: name,
		user_role: role,
		user_department: department,
		user_employee_id: employeeId,
		user_phone: phone,
	}
);
```

## Database Functions

### Required Functions (from admin_functions.sql)

1. **admin_create_user()** - Creates profile and related data
2. **admin_update_user()** - Updates profile information
3. **admin_delete_user()** - Deletes profile and related data

### Key Features

- ✅ Super admin permission validation
- ✅ Activity logging
- ✅ Self-deletion prevention
- ✅ Email uniqueness checking
- ✅ Related data cleanup

## Edge Function Operations

### Supported Operations

1. **createUser** - Creates auth user
2. **inviteUser** - Sends invitation email with reset link
3. **deleteUser** - Deletes auth user
4. **updateUserEmail** - Updates auth user email

### Key Features

- ✅ Service role access for auth operations
- ✅ Permission validation
- ✅ Proper error handling
- ✅ CORS support

## Security Model

### Edge Function Security

- Uses service role key (server-side only)
- Validates super_admin permissions via auth token
- Never exposes service role key to client

### Database Function Security

- Uses SECURITY DEFINER for elevated permissions
- Validates super_admin permissions via auth.uid()
- Comprehensive activity logging

## Error Handling

### Expected Error Flows

1. **Permission Denied**: User is not super_admin or inactive
2. **User Not Found**: Target user doesn't exist
3. **Email Exists**: Duplicate email during creation
4. **Self Deletion**: User trying to delete their own account

### Error Response Format

```json
{
	"success": false,
	"error": "Error message description"
}
```

## Testing Your Setup

### 1. Test User Deletion

In Super Admin screen, try deleting a user. Should work without "service role client not initialized" error.

### 2. Test User Creation

Create a new user via the admin interface. Both auth user and profile should be created.

### 3. Test User Updates

Edit user information. Profile should update correctly.

### 4. Check Activity Logs

Verify that all operations are logged in the `user_activity_log` table.

## Troubleshooting

### Common Issues

1. **Edge Function Not Found**: Ensure function is deployed correctly
2. **Permission Errors**: Verify user has super_admin role and is active
3. **Database Function Errors**: Ensure SQL functions are created in Supabase
4. **TypeScript Warnings**: These are expected for Deno Edge Functions

### Verification Steps

1. Check Edge Function logs in Supabase Dashboard
2. Verify database functions exist in SQL Editor
3. Test with Postman or curl using your function URL
4. Check user_activity_log table for logged operations

## Deployment Checklist

- [ ] Edge Function deployed to Supabase
- [ ] Environment variables set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY)
- [ ] Database functions created from admin_functions.sql
- [ ] Permissions granted to authenticated users
- [ ] Test operations working in Super Admin screen

---

**Status**: ✅ Complete integration ready for production use!
