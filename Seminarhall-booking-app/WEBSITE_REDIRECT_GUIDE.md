# Website to Mobile App Redirect Guide

## Overview

This guide explains how to redirect users from your website back to the mobile app after successful email verification or password reset.

## Deep Link URLs

Your website should redirect to these URLs to open the mobile app:

### Email Verification Success
```javascript
window.location.href = "seminarhallbooking://auth/email-verified";
```

### Password Reset Success  
```javascript
window.location.href = "seminarhallbooking://auth/password-reset-success";
```

### Login Required (if user needs to login again)
```javascript
window.location.href = "seminarhallbooking://auth/login";
```

### General App Home (for authenticated users)
```javascript
window.location.href = "seminarhallbooking://main";
```

## Implementation Examples

### 1. Email Verification Page
```javascript
// After successful email verification
if (verificationSuccess) {
    // Show success message
    showSuccessMessage("Email verified successfully!");
    
    // Redirect to app after 3 seconds
    setTimeout(() => {
        window.location.href = "seminarhallbooking://auth/email-verified";
    }, 3000);
}
```

### 2. Password Reset Page
```javascript
// After successful password update
if (passwordUpdateSuccess) {
    // Show success message
    showSuccessMessage("Password updated successfully!");
    
    // Redirect to app after 3 seconds
    setTimeout(() => {
        window.location.href = "seminarhallbooking://auth/password-reset-success";
    }, 3000);
}
```

### 3. With Fallback for Non-Mobile Users
```javascript
function redirectToApp(deepLink, fallbackUrl = "/") {
    // Check if user is on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Try to open the app
        window.location.href = deepLink;
        
        // Fallback to app store if app is not installed (after 2 seconds)
        setTimeout(() => {
            // If still on this page, redirect to fallback
            window.location.href = fallbackUrl;
        }, 2000);
    } else {
        // Desktop users stay on website
        window.location.href = fallbackUrl;
    }
}

// Usage examples
redirectToApp("seminarhallbooking://auth/email-verified", "/dashboard");
redirectToApp("seminarhallbooking://auth/password-reset-success", "/login");
```

## Supabase Configuration URLs

Make sure these URLs are added to your Supabase project under **Authentication > URL Configuration**:

### Redirect URLs to Add:
- `https://seminarhall-ivory.vercel.app/email-verification`
- `https://seminarhall-ivory.vercel.app/forgot-password`

### Site URL:
- `https://seminarhall-ivory.vercel.app`

## Testing Deep Links

### Development Testing:
```bash
# Test on Android emulator
adb shell am start -W -a android.intent.action.VIEW -d "seminarhallbooking://auth/email-verified" com.your.app

# Test on iOS simulator
xcrun simctl openurl booted "seminarhallbooking://auth/email-verified"
```

### Browser Testing:
1. Open your website
2. Open browser console
3. Run: `window.location.href = "seminarhallbooking://auth/email-verified"`
4. Should prompt to open the app

## Mobile App Deep Link Handling

The mobile app is already configured to handle these deep links with the URL scheme: `seminarhallbooking://`

## Error Handling

If the app is not installed, users will see:
- **iOS**: "Cannot Open Page" alert with option to go to App Store
- **Android**: "No app can perform this action" or similar

Consider implementing fallbacks to redirect to app stores or your website's login page.

## Quick Implementation for Your Website

Replace your current redirect:
```javascript
// OLD - redirects to website homepage
setTimeout(() => {
    window.location.href = "/";
}, 3000);

// NEW - redirects to mobile app
setTimeout(() => {
    window.location.href = "seminarhallbooking://auth/password-reset-success";
}, 3000);
```

## Benefits

- ✅ Seamless user experience from website back to app
- ✅ No need for users to manually reopen the app
- ✅ Maintains user context and flow
- ✅ Works on both iOS and Android
- ✅ Graceful fallback for desktop users
