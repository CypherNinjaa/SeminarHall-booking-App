# Amity University Seminar Hall Booking - Email Confirmation Web App

This is a Next.js web application that handles email verification for the Amity University Patna Seminar Hall Booking mobile app. It provides a seamless way for users to verify their email addresses and redirects them back to the mobile application.

## 🚀 Features

- **Email Verification**: Secure email verification with token validation
- **Mobile App Integration**: Deep linking to redirect users back to the mobile app
- **App Store Redirects**: Automatic redirects to Play Store/App Store for app downloads
- **Responsive Design**: Beautiful, mobile-friendly UI with glassmorphic design
- **Multi-State Handling**: Loading, success, error, and expired states
- **Countdown Timer**: Auto-redirect with visual countdown
- **Fallback Options**: Manual redirect buttons and support contact

## 🛠 Technology Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom glassmorphic effects
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
email-confirmation-web/
├── src/
│   └── app/
│       ├── globals.css           # Global styles and Tailwind
│       ├── layout.tsx            # Root layout component
│       ├── page.tsx              # Home page
│       ├── verify/
│       │   └── page.tsx          # Email verification page
│       └── download/
│           ├── android/
│           │   └── page.tsx      # Android download page
│           └── ios/
│               └── page.tsx      # iOS download page
├── package.json                  # Dependencies and scripts
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── postcss.config.js            # PostCSS configuration
└── .env.example                 # Environment variables template
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd email-confirmation-web
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_SCHEME=amityseminarhall
NEXT_PUBLIC_APP_NAME="Amity Seminar Hall Booking"

# Production URLs
NEXT_PUBLIC_WEB_URL=https://your-app.vercel.app
NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.amity.seminarhall
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/amity-seminar-hall/id123456789
```

### 3. Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
npm start
```

## 🔗 Mobile App Integration

### Deep Linking Setup

The web app uses deep linking to redirect users back to the mobile app after email verification:

1. **App Scheme**: `amityseminarhall://`
2. **Verification Success**: `amityseminarhall://verified`
3. **Fallback**: Redirects to app store if app is not installed

### Email Template

Your email verification emails should include links like:

```
https://your-web-app.vercel.app/verify?token=EMAIL_TOKEN&email=USER_EMAIL&type=email_verification
```

## 📱 User Flow

1. **Registration**: User registers in mobile app
2. **Email Sent**: System sends verification email with web link
3. **Web Verification**: User clicks link, opens web app
4. **Token Validation**: Web app validates token with Supabase
5. **Success Redirect**: Redirects back to mobile app
6. **Fallback**: If app not installed, redirects to app store

## 🎨 Design Features

- **Glassmorphic UI**: Modern glass effect with backdrop blur
- **Amity Branding**: University colors and logo integration
- **Responsive**: Works on all device sizes
- **Animations**: Smooth transitions and loading states
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🚀 Deployment to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/email-confirmation-web)

### Manual Deployment

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add all required env vars in Vercel dashboard
3. **Deploy**: Vercel will automatically build and deploy
4. **Custom Domain**: Configure your custom domain (optional)

### Recommended Vercel Settings

```json
{
	"framework": "nextjs",
	"buildCommand": "npm run build",
	"outputDirectory": ".next",
	"installCommand": "npm install",
	"devCommand": "npm run dev"
}
```

## 🔒 Security Considerations

- **Token Validation**: All tokens are validated server-side
- **Rate Limiting**: Implement rate limiting for verification endpoints
- **HTTPS Only**: All production traffic uses HTTPS
- **Environment Variables**: Sensitive data stored in environment variables
- **CORS**: Properly configured for mobile app domains

## 🧪 Testing

### Local Testing

1. **Start Development Server**: `npm run dev`
2. **Test Verification**: Use test tokens from Supabase
3. **Mobile Testing**: Test deep linking with mobile device/emulator

### Production Testing

1. **Email Flow**: Test complete email verification flow
2. **Deep Linking**: Verify mobile app redirection works
3. **App Store Fallback**: Test app store redirection
4. **Error States**: Test expired/invalid token handling

## 🌐 API Endpoints

### GET /verify

Handles email verification with query parameters:

- `token`: Email verification token
- `email`: User email address
- `type`: Verification type (email_verification, password_reset)

### GET /download/android

Redirects to Google Play Store

### GET /download/ios

Redirects to Apple App Store

## 🔧 Configuration

### Mobile App Scheme Configuration

#### React Native (Expo)

```json
// app.json
{
	"expo": {
		"scheme": "amityseminarhall",
		"platforms": ["ios", "android"]
	}
}
```

#### iOS Configuration

```xml
<!-- ios/YourApp/Info.plist -->
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

#### Android Configuration

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity android:name=".MainActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="amityseminarhall" />
  </intent-filter>
</activity>
```

## 📞 Support

For issues or questions:

- **Email**: support@amitypatna.edu.in
- **Developer**: Create GitHub issues in the repository

## 📝 License

This project is proprietary to Amity University Patna.

---

## 🚀 Next Steps

1. **Install Dependencies**: Run `npm install` in the email-confirmation-web directory
2. **Configure Environment**: Set up your `.env.local` file
3. **Test Locally**: Run `npm run dev` and test the flow
4. **Deploy to Vercel**: Connect your repository and deploy
5. **Configure Mobile App**: Set up deep linking in your mobile app
6. **Test Integration**: Test the complete email verification flow

The web app is ready to be deployed and integrated with your mobile application!
