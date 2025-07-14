# Supabase Email Templates

This directory contains custom email templates for the Amity Seminar Hall Booking System.

## Available Templates

### 1. Password Reset Template (`password-reset-template.html`)

- **Purpose**: When users request password reset
- **Template Name**: Reset Password
- **Redirect URL**: `https://seminarhall-ivory.vercel.app/forgot-password`

### 2. Email Verification Template (`email-verification-template.html`)

- **Purpose**: When users sign up and need to verify their email
- **Template Name**: Confirm signup
- **Redirect URL**: `https://seminarhall-ivory.vercel.app/verify`

## How to Configure in Supabase:

1. **Go to Supabase Dashboard**
2. **Navigate to**: Authentication → Email Templates
3. **Select the appropriate template** (Reset Password or Confirm signup)
4. **Replace the default template** with the content from the respective HTML file
5. **Set the correct redirect URL** as specified above

## Template Features:

- **University Branding**: Custom Amity University Patna styling with official red theme
- **Security Notices**: Built-in security warnings and helpful information
- **Mobile Responsive**: Works perfectly on all devices and email clients
- **Professional Design**: Modern gradient design with proper spacing and typography
- **Clear Call-to-Action**: Prominent buttons for user actions

## Important Variables:

Both templates use Supabase's built-in variables:

- `{{ .ConfirmationURL }}` - The verification/reset link
- Templates automatically redirect to your configured redirect URLs

## Configuration Steps:

### For Password Reset:

1. Copy HTML from `password-reset-template.html`
2. Paste into **"Reset Password"** template in Supabase
3. Set redirect URL: `https://seminarhall-ivory.vercel.app/forgot-password`
4. Save configuration

### For Email Verification:

1. Copy HTML from `email-verification-template.html`
2. Paste into **"Confirm signup"** template in Supabase
3. Set redirect URL: `https://seminarhall-ivory.vercel.app/verify`
4. Save configuration

## Testing Templates:

### Password Reset:

1. Visit: https://seminarhall-ivory.vercel.app/forgot-password
2. Enter email and request reset
3. Check inbox for branded email

### Email Verification:

1. Create new account through your app
2. Check inbox for verification email
3. Verify the branding matches

## Styling Notes:

- Uses Amity University red branding (#dc2626, #ef4444)
- Includes university contact information
- Mobile-first responsive design
- Professional table-based layout for maximum email client compatibility
- Inline CSS required for email rendering (ignore lint warnings)
