# Complete Setup Instructions: App & Supabase Integration

This guide provides step-by-step instructions for setting up the Amity Seminar Hall Booking Email Confirmation Web App with Supabase integration.

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Application Setup](#application-setup)
4. [SMTP Configuration](#smtp-configuration)
5. [Environment Variables](#environment-variables)
6. [Local Development](#local-development)
7. [Production Deployment](#production-deployment)
8. [Mobile App Integration](#mobile-app-integration)
9. [Testing & Verification](#testing--verification)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 **Prerequisites**

Before starting, ensure you have:

- **Node.js 18+** installed
- **npm** or **yarn** package manager
- **Git** for version control
- **Vercel CLI** for deployment (optional)
- **Gmail account** for SMTP (or other email provider)
- **Supabase account** (free tier available)

### Install Required Tools

```bash
# Install Node.js (if not already installed)
# Download from: https://nodejs.org/

# Install Vercel CLI (optional, for deployment)
npm install -g vercel

# Verify installations
node --version
npm --version
vercel --version
```

---

## 🗄️ **Supabase Setup**

### Step 1: Create Supabase Project

1. **Sign up/Login** to [Supabase](https://supabase.com)
2. **Create a new project**:
   - Project name: `amity-seminar-hall`
   - Database password: (Generate a strong password)
   - Region: Choose closest to your users
3. **Wait for project creation** (~2-3 minutes)

### Step 2: Configure Authentication

1. **Navigate to Authentication → Settings**
2. **Configure Site URL**:
   - For development: `http://localhost:3000`
   - For production: `https://seminarhall-ivory.vercel.app`
3. **Add Redirect URLs**:
   - Development: `http://localhost:3000/verify`
   - Production: `https://seminarhall-ivory.vercel.app/verify`

### Step 3: Set up Email Templates

1. **Go to Authentication → Email Templates**
2. **Configure each template**:

#### **Confirm Signup Template**

```html
<h2>Confirm your signup</h2>
<p>Welcome to Amity Seminar Hall Booking!</p>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your account</a></p>
<p>If you didn't create an account, you can safely ignore this email.</p>
```

#### **Magic Link Template**

```html
<h2>Your magic link</h2>
<p>Follow this link to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

#### **Change Email Address Template**

```html
<h2>Confirm Change of Email</h2>
<p>
	Follow this link to confirm the update of your email from {{ .Email }} to {{
	.NewEmail }}:
</p>
<p><a href="{{ .ConfirmationURL }}">Change Email</a></p>
```

#### **Reset Password Template**

```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

### Step 4: Get API Keys

1. **Go to Settings → API**
2. **Copy the following**:
   - `Project URL`
   - `anon/public key`
   - `service_role key` (keep this secret!)

### Step 5: Configure Database (Optional)

If you need to store additional booking data:

```sql
-- Create bookings table (optional)
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    hall_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT NOT NULL,
    booking_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own bookings"
    ON bookings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings"
    ON bookings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

---

## 🚀 **Application Setup**

### Step 1: Clone Repository

```bash
git clone https://github.com/CypherNinjaa/SeminarHall-booking-App.git
cd SeminarHall-booking-App/email-confirmation-web
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Project Structure Overview

```
email-confirmation-web/
├── src/
│   ├── app/
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home page
│   │   ├── verify/
│   │   │   └── page.tsx             # Email verification
│   │   ├── download/
│   │   │   ├── android/page.tsx     # Android download
│   │   │   └── ios/page.tsx         # iOS download
│   │   ├── smtp-test/
│   │   │   └── page.tsx             # SMTP testing interface
│   │   └── api/
│   │       ├── send-email/
│   │       │   └── route.ts         # Email sending API
│   │       └── test-email/
│   │           └── route.ts         # Email testing API
│   └── lib/
│       ├── supabase.ts              # Supabase client
│       ├── smtp.ts                  # SMTP configuration
│       └── config.ts                # App configuration
├── package.json                     # Dependencies
├── next.config.js                   # Next.js config
├── tailwind.config.js               # Tailwind config
├── vercel.json                      # Vercel deployment config
└── .env.local                       # Environment variables
```

---

## 📧 **SMTP Configuration**

### Option 1: Gmail SMTP (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account → Security
   - Select "App passwords"
   - Choose "Mail" and generate password
   - Copy the 16-character password

### Option 2: Other SMTP Providers

#### **SendGrid**

```env
EMAIL_PROVIDER=generic
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### **Mailgun**

```env
EMAIL_PROVIDER=generic
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
```

#### **AWS SES**

```env
EMAIL_PROVIDER=generic
SMTP_HOST=email-smtp.us-west-2.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-access-key
SMTP_PASSWORD=your-ses-secret-key
```

---

## 🔐 **Environment Variables**

### Step 1: Create Environment File

```bash
cp .env.example .env.local
```

### Step 2: Configure Variables

Edit `.env.local` with your values:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gmail SMTP Configuration (Required for sending emails)
GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_PASSWORD=your-16-character-app-password

# Alternative: Generic SMTP Configuration
# EMAIL_PROVIDER=generic
# SMTP_HOST=smtp.yourprovider.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@yourprovider.com
# SMTP_PASSWORD=your-password

# App Configuration
NEXT_PUBLIC_APP_SCHEME=amityseminarhall
NEXT_PUBLIC_APP_NAME="Amity Seminar Hall Booking"

# Web App URL
NEXT_PUBLIC_WEB_URL=http://localhost:3000  # For development
# NEXT_PUBLIC_WEB_URL=https://seminarhall-ivory.vercel.app  # For production

# Local Development URLs
NEXT_PUBLIC_LOCAL_ANDROID_SCHEME=amityseminarhall://
NEXT_PUBLIC_LOCAL_IOS_SCHEME=amityseminarhall://

# Development Mode
NEXT_PUBLIC_DEV_MODE=true  # Set to false for production

# Optional: Future App Store URLs
# NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.amity.seminarhall
# NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/amity-seminar-hall/id123456789
```

---

## 🛠️ **Local Development**

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Access Development URLs

- **Main App**: http://localhost:3000
- **SMTP Test**: http://localhost:3000/smtp-test
- **Verify Page**: http://localhost:3000/verify
- **Android Download**: http://localhost:3000/download/android
- **iOS Download**: http://localhost:3000/download/ios

### Step 3: Test SMTP Configuration

1. **Visit**: http://localhost:3000/smtp-test
2. **Click**: "Test SMTP Configuration"
3. **Enter**: Your email address
4. **Click**: "Send Test Email"
5. **Check**: Your email inbox for the test message

---

## 🌐 **Production Deployment**

### Step 1: Build and Test

```bash
npm run build
npm run start
```

### Step 2: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Step 3: Configure Environment Variables

```bash
# Add each environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add GMAIL_SMTP_USER
vercel env add GMAIL_SMTP_PASSWORD
vercel env add NEXT_PUBLIC_WEB_URL
vercel env add NEXT_PUBLIC_APP_SCHEME
vercel env add NEXT_PUBLIC_APP_NAME
vercel env add NEXT_PUBLIC_DEV_MODE

# For each variable, select: Production, Preview, Development
```

### Step 4: Update Supabase Settings

1. **Go to Supabase Dashboard**
2. **Authentication → Settings**
3. **Update Site URL**: `https://your-app.vercel.app`
4. **Add Redirect URL**: `https://your-app.vercel.app/verify`

---

## 📱 **Mobile App Integration**

### Step 1: Update Mobile App Configuration

In your React Native app, update the configuration:

```javascript
// config.js
export const CONFIG = {
	API_BASE_URL: "https://seminarhall-ivory.vercel.app",
	DEEP_LINK_SCHEME: "amityseminarhall",
	// ... other config
};
```

### Step 2: Configure Deep Links

#### **Android (android/app/src/main/AndroidManifest.xml)**

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="amityseminarhall" />
</intent-filter>
```

#### **iOS (ios/YourApp/Info.plist)**

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>amityseminarhall</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>amityseminarhall</string>
        </array>
    </dict>
</array>
```

### Step 3: Handle Deep Links in Mobile App

```javascript
// React Native deep link handling
import { Linking } from "react-native";

// Listen for deep links
Linking.addEventListener("url", handleDeepLink);

function handleDeepLink(event) {
	const url = event.url;

	if (url.startsWith("amityseminarhall://")) {
		// Handle different deep link actions
		if (url.includes("verified")) {
			// Handle email verification success
			navigation.navigate("EmailVerified");
		} else if (url.includes("password-reset")) {
			// Handle password reset
			navigation.navigate("PasswordReset");
		}
	}
}
```

### Step 4: Send Booking Confirmation Emails

```javascript
// In your booking confirmation flow
const sendBookingConfirmation = async (bookingData) => {
	try {
		const response = await fetch(
			"https://seminarhall-ivory.vercel.app/api/send-email",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					emailType: "booking_confirmation",
					toEmail: bookingData.userEmail,
					data: {
						userName: bookingData.userName,
						hallName: bookingData.hallName,
						bookingDate: bookingData.date,
						startTime: bookingData.startTime,
						endTime: bookingData.endTime,
						purpose: bookingData.purpose,
						bookingId: bookingData.id,
					},
				}),
			}
		);

		const result = await response.json();

		if (result.success) {
			console.log("Booking confirmation sent successfully");
		} else {
			console.error("Failed to send booking confirmation:", result.error);
		}
	} catch (error) {
		console.error("Error sending booking confirmation:", error);
	}
};
```

---

## 🧪 **Testing & Verification**

### Step 1: Test Email Verification Flow

1. **Register a new user** in your mobile app
2. **Check email** for verification link
3. **Click the link** - should redirect to web app
4. **Verify success** - should show success page
5. **Check deep link** - should redirect back to mobile app

### Step 2: Test SMTP Functionality

```bash
# Test SMTP configuration
curl -X GET https://seminarhall-ivory.vercel.app/api/test-email

# Send test email
curl -X POST https://seminarhall-ivory.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "your-email@gmail.com"}'

# Send booking confirmation
curl -X POST https://seminarhall-ivory.vercel.app/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "booking_confirmation",
    "toEmail": "user@example.com",
    "data": {
      "userName": "John Doe",
      "hallName": "Conference Hall A",
      "bookingDate": "2025-01-15",
      "startTime": "09:00 AM",
      "endTime": "11:00 AM",
      "purpose": "Team Meeting",
      "bookingId": "BK-001"
    }
  }'
```

### Step 3: End-to-End Testing

1. **Complete booking flow** in mobile app
2. **Receive email confirmation** with booking details
3. **Verify email content** is properly formatted
4. **Test deep link navigation** back to mobile app
5. **Verify user experience** is smooth and intuitive

---

## 🔧 **Troubleshooting**

### Common Issues and Solutions

#### **1. SMTP Authentication Error**

```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution**:

- Ensure 2FA is enabled on Gmail
- Use App Password, not regular password
- Check email and password are correct

#### **2. Supabase Connection Error**

```
Error: Invalid JWT token
```

**Solution**:

- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is valid
- Ensure keys are properly set in environment

#### **3. Deep Link Not Working**

```
Deep link doesn't redirect to mobile app
```

**Solution**:

- Verify deep link scheme is configured in mobile app
- Check URL schemes in iOS Info.plist and Android manifest
- Test deep links with `adb shell am start -W -a android.intent.action.VIEW -d "amityseminarhall://verified"`

#### **4. Email Not Sending**

```
Email appears sent but not received
```

**Solution**:

- Check spam/junk folders
- Verify Gmail sending limits aren't exceeded
- Test with different email addresses
- Check SMTP configuration in test interface

#### **5. Environment Variables Not Loading**

```
Error: Environment variable not defined
```

**Solution**:

- Restart development server after adding variables
- Check `.env.local` file exists and has correct format
- Verify variable names match exactly (case-sensitive)
- For production, check Vercel environment variables

#### **6. Build Errors**

```
TypeScript/ESLint errors during build
```

**Solution**:

- Run `npm run lint` to check for linting issues
- Fix TypeScript errors shown in build output
- Check all imports are correct
- Verify all required files exist

### Getting Help

If you encounter issues:

1. **Check logs** in Vercel dashboard
2. **Test endpoints** using the SMTP test interface
3. **Review environment variables** using `vercel env ls`
4. **Check Supabase logs** in dashboard
5. **Verify email delivery** in Gmail sent items

---

## 📚 **Additional Resources**

- **Supabase Documentation**: https://supabase.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Native Deep Links**: https://reactnative.dev/docs/linking

---

## 🎉 **Completion Checklist**

- [ ] Supabase project created and configured
- [ ] Environment variables set up
- [ ] SMTP configuration tested
- [ ] Local development server running
- [ ] Production deployment successful
- [ ] Email verification flow tested
- [ ] Deep links configured in mobile app
- [ ] Booking confirmation emails working
- [ ] Mobile app integration complete
- [ ] End-to-end testing passed

**Your Amity Seminar Hall Booking Email Confirmation system is now ready for production use!** 🚀
