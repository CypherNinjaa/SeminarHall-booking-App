# Forgot Password Setup

## Overview

The forgot password functionality is now implemented using Supabase's built-in password reset system that redirects to your website for the actual password reset process.

## Flow

1. **Mobile App**: User enters email in `ForgotPasswordScreen`
2. **Supabase**: Sends password reset email with link to your website
3. **Website**: User resets password on `https://seminarhall-ivory.vercel.app/forgot-password`
4. **Mobile App**: User returns and logs in with new password

## Components

### ForgotPasswordScreen.tsx

- ✅ Professional email input interface
- ✅ Real-time email validation
- ✅ Success confirmation with clear instructions
- ✅ Resend email functionality
- ✅ Amity University branding

### Auth Store (authStore.ts)

- ✅ `requestPasswordReset()` function using Supabase auth
- ✅ Redirects to website: `https://seminarhall-ivory.vercel.app/forgot-password`
- ✅ Returns success/error messages
- ✅ Proper error handling

## Supabase Configuration

The password reset emails are sent by Supabase with the redirect URL pointing to your website. Make sure your Supabase project has:

1. **Email templates configured** (Supabase handles this automatically)
2. **Redirect URLs allowed** in Supabase dashboard:
   - Add `https://seminarhall-ivory.vercel.app/forgot-password` to allowed redirect URLs

## Website Requirements

Your website at `https://seminarhall-ivory.vercel.app/forgot-password` should:

1. **Handle the password reset token** from URL parameters
2. **Provide password reset form** for users to enter new password
3. **Call Supabase API** to update the password
4. **Redirect back to app** or show success message

## Testing

1. Enter valid email in ForgotPasswordScreen
2. Check email for reset link
3. Click link → should open website password reset page
4. Reset password on website
5. Return to app and login with new password

## Benefits

- ✅ Uses Supabase's secure, built-in password reset system
- ✅ Leverages your existing website infrastructure
- ✅ No deep linking complexity in mobile app
- ✅ Professional email templates from Supabase
- ✅ Secure token-based password reset flow
