# 🔧 Amity Seminar Hall Booking - Email Confirmation Setup for Local Development

## 📋 Your Current Setup

Based on your requirements:

- ✅ **Database**: Supabase
- ✅ **Email System**: Supabase Auth (built-in email sending)
- ✅ **App Status**: Local development (no app store URLs yet)
- ✅ **Email Templates**: Supabase handles confirmation and password reset

## 🚀 Quick Setup Steps

### 1. **Configure Environment Variables**

Create `.env.local` file in your `email-confirmation-web` directory:

```bash
# Copy the example file
cp .env.example .env.local
```

Fill in your actual Supabase credentials:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# App Configuration
NEXT_PUBLIC_APP_SCHEME=amityseminarhall
NEXT_PUBLIC_APP_NAME="Amity Seminar Hall Booking"

# Web App URL (will be your Vercel URL after deployment)
NEXT_PUBLIC_WEB_URL=http://localhost:3000

# Development Mode (keep as true for now)
NEXT_PUBLIC_DEV_MODE=true

# Local App URLs (for testing deep links)
NEXT_PUBLIC_LOCAL_ANDROID_SCHEME=amityseminarhall://
NEXT_PUBLIC_LOCAL_IOS_SCHEME=amityseminarhall://
```

### 2. **Configure Supabase Email Templates**

In your Supabase dashboard, go to **Authentication > Email Templates** and update:

#### Email Confirmation Template:

```html
<h2>Verify Your Email - Amity University Patna</h2>
<p>Hello,</p>
<p>
	Please click the link below to verify your email address for the Seminar Hall
	Booking system:
</p>
<p>
	<a
		href="{{ .SiteURL }}/verify?token={{ .Token }}&email={{ .Email }}&type=signup"
		style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;"
	>
		Verify Email Address
	</a>
</p>
<p>This link will expire in 24 hours.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>Best regards,<br />Amity University Patna IT Team</p>
```

#### Password Reset Template:

```html
<h2>Reset Your Password - Amity University Patna</h2>
<p>Hello,</p>
<p>
	Click the link below to reset your password for the Seminar Hall Booking
	system:
</p>
<p>
	<a
		href="{{ .SiteURL }}/verify?token={{ .Token }}&email={{ .Email }}&type=recovery"
		style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;"
	>
		Reset Password
	</a>
</p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>Best regards,<br />Amity University Patna IT Team</p>
```

### 3. **Configure Supabase Site URL**

In Supabase Dashboard > Settings > API:

- **Site URL**: Set to your web app URL:

  - Development: `http://localhost:3000`
  - Production: `https://your-app.vercel.app`

- **Redirect URLs**: Add these URLs:
  - `http://localhost:3000/verify`
  - `https://your-app.vercel.app/verify`

## 📱 Mobile App Deep Linking Setup

### For Expo/React Native:

#### 1. Update `app.json`:

```json
{
	"expo": {
		"name": "Amity Seminar Hall Booking",
		"slug": "amity-seminar-hall",
		"scheme": "amityseminarhall",
		"platforms": ["ios", "android"]
		// ... other config
	}
}
```

#### 2. Handle Deep Links in Your App:

```typescript
// In your main App component or navigation setup
import * as Linking from "expo-linking";
import { useEffect } from "react";

export default function App() {
	useEffect(() => {
		// Handle deep link when app is already open
		const subscription = Linking.addEventListener("url", handleDeepLink);

		// Handle deep link when app is opened from link
		Linking.getInitialURL().then((url) => {
			if (url) {
				handleDeepLink({ url });
			}
		});

		return () => subscription?.remove();
	}, []);

	const handleDeepLink = ({ url }: { url: string }) => {
		if (url.includes("verified")) {
			// Email verification successful
			// Navigate to appropriate screen or show success message
			console.log("Email verified successfully!");
			// navigation.navigate('Home'); // or wherever you want
		} else if (url.includes("download")) {
			// From download page
			console.log("User came from download page");
		}
	};

	// ... rest of your app
}
```

## 🌐 Testing the Complete Flow

### 1. **Start Your Development Servers**

Terminal 1 (Web App):

```bash
cd email-confirmation-web
npm run dev
# Runs on http://localhost:3000
```

Terminal 2 (Mobile App):

```bash
cd ../Seminarhall-booking-app
npm start
# or expo start
```

### 2. **Test Email Verification**

1. **Register a user** in your mobile app
2. **Check your email** for the verification link
3. **Click the link** → Opens web app verification page
4. **Verification success** → Attempts to redirect to mobile app
5. **Mobile app opens** with deep link (if configured correctly)

### 3. **Test URLs**

- **Home**: http://localhost:3000
- **Test Verification**: http://localhost:3000/verify?token=test&email=test@example.com
- **Android Download**: http://localhost:3000/download/android
- **iOS Download**: http://localhost:3000/download/ios

## 🔧 Development Mode Features

When `NEXT_PUBLIC_DEV_MODE=true`:

✅ **No App Store Redirects**: Won't try to redirect to Play Store/App Store  
✅ **Development Messaging**: Shows appropriate messages for local development  
✅ **Deep Link Testing**: Attempts to open your local app via `amityseminarhall://`  
✅ **Clear Instructions**: Provides development-specific guidance

## 🚀 Deployment to Production

### 1. **Deploy Web App to Vercel**

```bash
# Connect your GitHub repo to Vercel
# Or use Vercel CLI
npm i -g vercel
vercel --prod
```

### 2. **Update Environment Variables**

In Vercel dashboard, set:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_WEB_URL=https://your-app.vercel.app
NEXT_PUBLIC_DEV_MODE=false
# Add app store URLs when ready:
# NEXT_PUBLIC_PLAY_STORE_URL=your-play-store-url
# NEXT_PUBLIC_APP_STORE_URL=your-app-store-url
```

### 3. **Update Supabase Settings**

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: Add your production URL

## 🧪 Testing Checklist

### Email Verification Flow:

- [ ] User registers in mobile app
- [ ] Email sent with verification link
- [ ] Link opens web app correctly
- [ ] Token validation works
- [ ] Success page displays
- [ ] Deep link redirects to mobile app
- [ ] Mobile app handles deep link

### Error Handling:

- [ ] Invalid token shows error
- [ ] Expired token shows expired message
- [ ] Resend verification works
- [ ] Network errors handled gracefully

### Development Mode:

- [ ] Development messages show correctly
- [ ] No app store redirects in dev mode
- [ ] Deep links work with local app

## 📞 Support

If you encounter issues:

1. **Check browser console** for JavaScript errors
2. **Check mobile app logs** for deep link handling
3. **Verify Supabase configuration** in dashboard
4. **Test email templates** in Supabase auth settings

## 🎯 Next Steps

1. ✅ **Setup complete** - Your email confirmation system is ready
2. 🔄 **Test the flow** - Register and verify an email
3. 🚀 **Deploy to Vercel** - When ready for production
4. 📱 **Publish mobile app** - Add app store URLs later
5. 🎨 **Customize design** - Modify colors/branding as needed

Your email confirmation system is now properly configured for your local development setup with Supabase! 🎉
