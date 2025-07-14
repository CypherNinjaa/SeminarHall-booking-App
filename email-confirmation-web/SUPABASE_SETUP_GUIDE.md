# 🚀 SUPABASE EMAIL INTEGRATION SETUP GUIDE

## 📋 **Complete Setup Instructions**

Follow these steps to connect Supabase authentication with your deployed website for seamless email verification and password reset flows.

---

## 🎯 **1. VERCEL ENVIRONMENT VARIABLES** (CRITICAL FIRST STEP)

### Go to your Vercel Dashboard:

**URL:** https://vercel.com/vikashs-projects-b0e8ebf0/seminarhall/settings/environment-variables

### Add these environment variables:

```bash
# REQUIRED - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL = https://dndrqqoejfctqpcbmxyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZHJxcW9lamZjdHFwY2JteHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTQ5MDQsImV4cCI6MjA2NzM5MDkwNH0.EInSlWOizmOdFEagc-9x-IRDtAIkwLqzszQlPTIsPvI
```

### ⚠️ **IMPORTANT:** After adding environment variables, redeploy your app!

---

## 🔧 **2. SUPABASE DASHBOARD CONFIGURATION**

### Go to your Supabase Dashboard:

**URL:** https://supabase.com/dashboard/project/dndrqqoejfctqpcbmxyk

---

### 📧 **EMAIL VERIFICATION SETUP**

1. **Navigate to:** Authentication → Email Templates → Confirm signup
2. **Select:** "Custom HTML"
3. **Copy and paste this template:**

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Email Verification - Amity University Patna</title>
	</head>
	<body
		style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;"
	>
		<table
			width="100%"
			cellpadding="0"
			cellspacing="0"
			style="background-color: #f8fafc; padding: 40px 20px;"
		>
			<tr>
				<td align="center">
					<table
						width="600"
						cellpadding="0"
						cellspacing="0"
						style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;"
					>
						<!-- Header -->
						<tr>
							<td
								style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center;"
							>
								<h1
									style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;"
								>
									📧 Amity University Patna
								</h1>
								<p style="color: #fecaca; margin: 8px 0 0 0; font-size: 16px;">
									Seminar Hall Booking System
								</p>
							</td>
						</tr>
						<!-- Content -->
						<tr>
							<td style="padding: 40px 30px;">
								<h2
									style="color: #dc2626; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;"
								>
									✉️ Verify Your Email Address
								</h2>
								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									Welcome to the Seminar Hall Booking System!
								</p>
								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									To complete your registration and start booking seminar halls,
									please verify your email address by clicking the button below.
								</p>

								<!-- CTA Button -->
								<div style="text-align: center; margin: 30px 0;">
									<a
										href="{{ .ConfirmationURL }}"
										style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);"
										>✅ Verify Email Address</a
									>
								</div>

								<div
									style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;"
								>
									<p style="color: #0c4a6e; margin: 0; font-size: 14px;">
										<strong>📱 What happens next:</strong><br />
										1. Click the button above<br />
										2. Your email will be verified automatically<br />
										3. Return to your mobile app<br />
										4. Start booking seminar halls!
									</p>
								</div>
							</td>
						</tr>
						<!-- Footer -->
						<tr>
							<td
								style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;"
							>
								<p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
									<strong>Amity University Patna</strong><br />IT Support Team -
									Seminar Hall Booking System
								</p>
								<p style="color: #9ca3af; font-size: 12px; margin: 0;">
									Need help? Contact us at support@amitypatna.edu.in
								</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>
```

4. **Set Redirect URL:**

```
https://seminarhall-fvi2w08jw-vikashs-projects-b0e8ebf0.vercel.app/email-verification
```

---

### 🔑 **PASSWORD RESET SETUP**

1. **Navigate to:** Authentication → Email Templates → Reset password
2. **Select:** "Custom HTML"
3. **Copy and paste this template:**

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Reset Password - Amity University Patna</title>
	</head>
	<body
		style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;"
	>
		<table
			width="100%"
			cellpadding="0"
			cellspacing="0"
			style="background-color: #f8fafc; padding: 40px 20px;"
		>
			<tr>
				<td align="center">
					<table
						width="600"
						cellpadding="0"
						cellspacing="0"
						style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;"
					>
						<!-- Header -->
						<tr>
							<td
								style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center;"
							>
								<h1
									style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;"
								>
									🔒 Amity University Patna
								</h1>
								<p style="color: #fecaca; margin: 8px 0 0 0; font-size: 16px;">
									Seminar Hall Booking System
								</p>
							</td>
						</tr>
						<!-- Content -->
						<tr>
							<td style="padding: 40px 30px;">
								<h2
									style="color: #dc2626; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;"
								>
									🔑 Reset Your Password
								</h2>
								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									Hello,
								</p>
								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									You've requested to reset your password for the Seminar Hall
									Booking System. Click the button below to create a new
									password.
								</p>

								<!-- CTA Button -->
								<div style="text-align: center; margin: 30px 0;">
									<a
										href="{{ .ConfirmationURL }}"
										style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);"
										>🔐 Reset Password Now</a
									>
								</div>

								<div
									style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;"
								>
									<p style="color: #0c4a6e; margin: 0; font-size: 14px;">
										<strong>📱 How it works:</strong><br />
										1. Click the button above<br />
										2. You'll be redirected to our secure website<br />
										3. Enter your new password<br />
										4. Return to your mobile app to sign in
									</p>
								</div>

								<div
									style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;"
								>
									<p style="color: #b91c1c; margin: 0; font-size: 14px;">
										<strong>⚠️ Security Notice:</strong> This password reset
										link will expire in 1 hour. If you didn't request this
										reset, please ignore this email and consider changing your
										password.
									</p>
								</div>
							</td>
						</tr>
						<!-- Footer -->
						<tr>
							<td
								style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;"
							>
								<p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
									<strong>Amity University Patna</strong><br />IT Support Team -
									Seminar Hall Booking System
								</p>
								<p style="color: #9ca3af; font-size: 12px; margin: 0;">
									Need help? Contact us at support@amitypatna.edu.in
								</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>
```

4. **Set Redirect URL:**

```
https://seminarhall-fvi2w08jw-vikashs-projects-b0e8ebf0.vercel.app/forgot-password
```

---

## 📱 **3. MOBILE APP INTEGRATION**

### Email Verification (User Signup):

```javascript
// In your mobile app signup flow
const { data, error } = await supabase.auth.signUp({
	email: userEmail,
	password: userPassword,
	options: {
		emailRedirectTo:
			"https://seminarhall-fvi2w08jw-vikashs-projects-b0e8ebf0.vercel.app/email-verification",
	},
});
```

### Password Reset:

```javascript
// In your mobile app forgot password flow
const { data, error } = await supabase.auth.resetPasswordForEmail(userEmail, {
	redirectTo:
		"https://seminarhall-fvi2w08jw-vikashs-projects-b0e8ebf0.vercel.app/forgot-password",
});
```

---

## ✅ **4. TESTING THE COMPLETE FLOW**

### Test Email Verification:

1. Create a new user in your mobile app
2. Check email for verification link
3. Click link → should redirect to website
4. Website should show "Email verified successfully!"

### Test Password Reset:

1. Use "Forgot Password" in your mobile app
2. Check email for reset link
3. Click link → should redirect to website
4. Enter new password → should update successfully

---

## 🎯 **5. CURRENT DEPLOYMENT STATUS**

✅ **Website Deployed:** https://seminarhall-fvi2w08jw-vikashs-projects-b0e8ebf0.vercel.app
✅ **Email Verification Page:** `/email-verification`
✅ **Password Reset Page:** `/forgot-password`
✅ **Beautiful Email Templates:** Ready for Supabase

⚠️ **TODO:** Add environment variables to Vercel and configure Supabase templates

---

## 🔒 **SECURITY NOTES**

- Email links expire automatically (Supabase default: 1 hour)
- All authentication flows use secure tokens
- Website validates tokens before allowing password changes
- Users are redirected back to main app after completion

---

**Once you complete these steps, your 405 error will be completely resolved!** 🚀
