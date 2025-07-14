# Vercel Environment Variables Setup Guide

## 🎯 **Critical Issue Solved: Password Reset Flow**

Your password reset was failing because **Supabase environment variables were missing in production**. Here's how to fix it:

## 🔧 **Step 1: Add Environment Variables to Vercel**

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: `seminarhall-ivory`
3. **Go to Settings** → **Environment Variables**
4. **Add these variables** (one by one):

### **Required Variables:**

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL = https://dndrqqoejfctqpcbmxyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZHJxcW9lamZjdHFwY2JteHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTQ5MDQsImV4cCI6MjA2NzM5MDkwNH0.EInSlWOizmOdFEagc-9x-IRDtAIkwLqzszQlPTIsPvI

# SMTP Configuration (for email sending)
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = t15296632@gmail.com
SMTP_PASS = plll gmtc wtpi mywj
SMTP_FROM_NAME = Amity Seminar Hall
SMTP_FROM_EMAIL = t15296632@gmail.com

# App Configuration
NEXT_PUBLIC_APP_SCHEME = amityseminarhall
NEXT_PUBLIC_APP_NAME = Amity Seminar Hall Booking
NEXT_PUBLIC_WEB_URL = https://seminarhall-ivory.vercel.app
NEXT_PUBLIC_DEV_MODE = false
```

## 🔄 **Step 2: Redeploy Your App**

After adding environment variables:

1. **Go to Deployments tab** in Vercel
2. **Click "Redeploy"** on the latest deployment
3. **Wait for deployment** to complete

## ✅ **Step 3: Test the Flow**

Once redeployed, test the complete flow:

### **Test 1: API Endpoint**

```bash
curl -X POST "https://seminarhall-ivory.vercel.app/api/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

### **Test 2: Web Interface**

1. **Visit**: https://seminarhall-ivory.vercel.app/forgot-password
2. **Enter email** and request reset
3. **Check email** for reset link
4. **Click link** to reset password

## 🎯 **How the Password Reset Flow Works**

### **Complete Flow:**

1. **Mobile App** → Calls your `/api/forgot-password` endpoint
2. **Your Web App** → Uses Supabase to send reset email
3. **Supabase** → Sends email with reset link to user
4. **User** → Clicks link in email
5. **Link** → Opens your web app (`/forgot-password`) with reset tokens
6. **Web App** → Uses Supabase connection to update password
7. **Success** → User can now login with new password

### **Key Components:**

- ✅ **Your Web App** needs Supabase credentials (for password reset)
- ✅ **Your Mobile App** calls your web API (no direct Supabase needed)
- ✅ **Supabase** handles email sending and token management
- ✅ **Your Email Templates** redirect back to your web app

## 🛠️ **Why This Works:**

1. **Mobile App** doesn't need Supabase - it just calls your API
2. **Your Web App** has Supabase credentials to handle the actual password reset
3. **Users** get a seamless experience from mobile → email → web → back to mobile

## 🚨 **Current Status:**

- ✅ **Local Development**: Working (Supabase configured)
- ❌ **Production**: Needs environment variables in Vercel
- ✅ **Mobile Integration**: Ready (API endpoint available)

## 📱 **For Your Mobile App:**

Your React Native app just needs to call your API - no Supabase setup required:

```javascript
// This is all your mobile app needs:
const response = await fetch(
	"https://seminarhall-ivory.vercel.app/api/forgot-password",
	{
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: userEmail }),
	}
);
```

## 🎉 **Next Steps:**

1. **Add environment variables** to Vercel (Step 1)
2. **Redeploy** your app (Step 2)
3. **Test** the complete flow (Step 3)
4. **Update mobile app** to use the working API

Once you add the Supabase environment variables to Vercel, your password reset will work perfectly!
