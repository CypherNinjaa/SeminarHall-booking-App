# Authentication System Testing Guide

This guide will help you test the Seminar Hall Booking app's authentication system to ensure everything is working correctly.

## Prerequisites

1. **Supabase Setup**: Make sure you have run all the SQL scripts in the `/database` folder:

   - `super_admin_setup.sql` - Initial schema and RLS setup
   - `final_rls_fix.sql` - Fixed RLS policies without recursion
   - `create_super_admin.sql` - Promote a user to super_admin (optional)

2. **Environment Configuration**: Ensure your `.env` file is properly configured:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Testing Steps

### 1. Database Verification

Run the `test_setup.sql` script in your Supabase SQL Editor to verify:

- Tables exist (profiles, user_activity_log)
- RLS policies are properly configured
- Helper functions are created
- Triggers are active

### 2. App Startup Testing

1. **Start the app**: Run `npm start` or use the VS Code task
2. **Check console logs**: Look for these messages:
   - "Environment variables validated successfully"
   - "Database connection test successful"
   - No critical errors during initialization

### 3. Authentication Flow Testing

#### Test Case 1: New User Registration

1. Navigate to the signup screen
2. Fill in user details:
   - Email: `test@example.com`
   - Password: `testpass123`
   - Name: `Test User`
   - Role: `faculty` (default)
3. Submit the form
4. **Expected**: User should be created and automatically logged in
5. **Verify**: Check Supabase dashboard for new user in both Auth and profiles table

#### Test Case 2: Existing User Login

1. Navigate to the login screen
2. Enter credentials of an existing user
3. Submit the form
4. **Expected**: User should be logged in and navigated to appropriate screen based on role
5. **Verify**:
   - `last_login_at` field should be updated in profiles table
   - Navigation should match user role (SuperAdminScreen for super_admin, etc.)

#### Test Case 3: Inactive User Login

1. In Supabase dashboard, set a user's `is_active` field to `false`
2. Try to login with that user
3. **Expected**: Login should fail with "account deactivated" message
4. **Verify**: User should be signed out and redirected to login screen

#### Test Case 4: Role-Based Navigation

1. Create users with different roles (`faculty`, `admin`, `super_admin`)
2. Login with each user type
3. **Expected**: Each should navigate to the appropriate screen:
   - `faculty` → HomeScreen
   - `admin` → HomeScreen (with admin features)
   - `super_admin` → SuperAdminScreen

### 4. Profile Management Testing

#### Test Case 5: Profile Updates

1. Login as any user
2. Navigate to ProfileScreen
3. Update profile information (name, phone, department)
4. **Expected**: Changes should be saved and reflected immediately
5. **Verify**: Check Supabase profiles table for updated data

#### Test Case 6: Session Persistence

1. Login to the app
2. Close the app completely
3. Reopen the app
4. **Expected**: User should remain logged in (if session is still valid)
5. **Verify**: No additional login required

### 5. Error Handling Testing

#### Test Case 7: Network Issues

1. Disconnect internet/network
2. Try to login
3. **Expected**: Appropriate error message should be shown
4. Reconnect network and retry
5. **Expected**: Login should work normally

#### Test Case 8: Invalid Credentials

1. Try to login with incorrect email/password
2. **Expected**: Clear error message about invalid credentials
3. **Verify**: User remains on login screen

### 6. Super Admin Features (if applicable)

#### Test Case 9: Super Admin Access

1. Login as a super_admin user
2. Navigate to SuperAdminScreen
3. **Expected**: Should have access to admin features
4. **Verify**: Regular users should not be able to access this screen

## Debugging Common Issues

### Issue: "Missing environment variables"

- **Solution**: Check your `.env` file exists and has correct variables
- Restart the development server after adding `.env`

### Issue: "Database connection test failed"

- **Solution**: Verify Supabase URL and anon key are correct
- Check Supabase project is not paused/sleeping

### Issue: "Failed to fetch user profile"

- **Solution**: Run the `final_rls_fix.sql` script to fix RLS policies
- Check user exists in both Auth and profiles tables

### Issue: "Profile creation failed during registration"

- **Solution**: Verify RLS policies allow INSERT on profiles table
- Check for any database constraints violations

### Issue: Navigation not working correctly

- **Solution**: Clear app storage and try again:
  ```typescript
  import { clearAuthStorage } from "./src/utils/debugUtils";
  await clearAuthStorage();
  ```

## Success Criteria

✅ All database tables and functions are created  
✅ Users can register and login successfully  
✅ Role-based navigation works correctly  
✅ Inactive users are properly blocked  
✅ Profile updates work and persist  
✅ Session persistence works across app restarts  
✅ Error handling provides clear feedback  
✅ Super admin features are restricted to appropriate users

## Next Steps

Once all tests pass, you can:

1. Add more sophisticated UI/UX improvements
2. Implement additional features (hall booking, notifications, etc.)
3. Add more robust error tracking and analytics
4. Implement password reset functionality
5. Add two-factor authentication

## Support

If you encounter issues during testing:

1. Check the console logs for detailed error messages
2. Verify your Supabase configuration and RLS policies
3. Ensure all SQL scripts have been run successfully
4. Check the network connection and Supabase project status
