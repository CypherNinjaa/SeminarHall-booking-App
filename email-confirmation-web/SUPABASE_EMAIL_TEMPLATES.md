# 📧 Supabase Email Templates - Amity Seminar Hall Booking

Beautiful, branded email templates for your Amity University Patna Seminar Hall Booking system.

## 📝 How to Update Templates

1. Go to **Supabase Dashboard** → **Authentication** → **Settings** → **Email Templates**
2. Replace each template with the corresponding HTML below
3. Save each template

---

## 1. 📝 Confirm Signup Template

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Confirm Your Email - Amity University Patna</title>
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
								style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;"
							>
								<h1
									style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;"
								>
									📚 Amity University Patna
								</h1>
								<p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 16px;">
									Seminar Hall Booking System
								</p>
							</td>
						</tr>

						<!-- Content -->
						<tr>
							<td style="padding: 40px 30px;">
								<h2
									style="color: #1e40af; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;"
								>
									🎉 Welcome! Please Confirm Your Email
								</h2>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									Hello,
								</p>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									Welcome to the Amity University Patna Seminar Hall Booking
									System! Please click the button below to verify your email
									address and activate your account.
								</p>

								<!-- CTA Button -->
								<div style="text-align: center; margin: 30px 0;">
									<a
										href="{{ .ConfirmationURL }}"
										style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
                                          color: #ffffff; 
                                          padding: 14px 32px; 
                                          text-decoration: none; 
                                          border-radius: 8px; 
                                          font-weight: bold; 
                                          font-size: 16px; 
                                          display: inline-block;
                                          box-shadow: 0 4px 6px rgba(30, 64, 175, 0.3);"
									>
										✅ Verify Email Address
									</a>
								</div>

								<div
									style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;"
								>
									<p style="color: #92400e; margin: 0; font-size: 14px;">
										<strong>⏰ Important:</strong> This verification link will
										expire in 24 hours for security reasons.
									</p>
								</div>

								<p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
									If you didn't create an account with us, you can safely ignore
									this email.
								</p>
							</td>
						</tr>

						<!-- Footer -->
						<tr>
							<td
								style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;"
							>
								<p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
									<strong>Amity University Patna</strong><br />
									IT Support Team - Seminar Hall Booking System
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

---

## 2. 📨 Invite User Template

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>You're Invited - Amity University Patna</title>
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
								style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;"
							>
								<h1
									style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;"
								>
									🎓 Amity University Patna
								</h1>
								<p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 16px;">
									Seminar Hall Booking System
								</p>
							</td>
						</tr>

						<!-- Content -->
						<tr>
							<td style="padding: 40px 30px;">
								<h2
									style="color: #059669; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;"
								>
									🎉 You've Been Invited!
								</h2>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									Hello,
								</p>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									You have been invited to join the Amity University Patna
									Seminar Hall Booking System. Click the button below to accept
									the invitation and create your account.
								</p>

								<!-- CTA Button -->
								<div style="text-align: center; margin: 30px 0;">
									<a
										href="{{ .ConfirmationURL }}"
										style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); 
                                          color: #ffffff; 
                                          padding: 14px 32px; 
                                          text-decoration: none; 
                                          border-radius: 8px; 
                                          font-weight: bold; 
                                          font-size: 16px; 
                                          display: inline-block;
                                          box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);"
									>
										🚀 Accept Invitation
									</a>
								</div>

								<div
									style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;"
								>
									<p style="color: #065f46; margin: 0; font-size: 14px;">
										<strong>🎯 What you can do:</strong> Book seminar halls,
										manage reservations, and coordinate events seamlessly.
									</p>
								</div>

								<p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
									If you believe this invitation was sent in error, please
									contact our support team.
								</p>
							</td>
						</tr>

						<!-- Footer -->
						<tr>
							<td
								style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;"
							>
								<p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
									<strong>Amity University Patna</strong><br />
									IT Support Team - Seminar Hall Booking System
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

---

## 3. ✨ Magic Link Template

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Magic Link Login - Amity University Patna</title>
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
								style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center;"
							>
								<h1
									style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;"
								>
									✨ Amity University Patna
								</h1>
								<p style="color: #e9d5ff; margin: 8px 0 0 0; font-size: 16px;">
									Seminar Hall Booking System
								</p>
							</td>
						</tr>

						<!-- Content -->
						<tr>
							<td style="padding: 40px 30px;">
								<h2
									style="color: #7c3aed; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;"
								>
									🔮 Your Magic Link is Ready!
								</h2>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									Hello,
								</p>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									Click the magic link below to instantly sign in to your
									Seminar Hall Booking account. No password required!
								</p>

								<!-- CTA Button -->
								<div style="text-align: center; margin: 30px 0;">
									<a
										href="{{ .ConfirmationURL }}"
										style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
                                          color: #ffffff; 
                                          padding: 14px 32px; 
                                          text-decoration: none; 
                                          border-radius: 8px; 
                                          font-weight: bold; 
                                          font-size: 16px; 
                                          display: inline-block;
                                          box-shadow: 0 4px 6px rgba(124, 58, 237, 0.3);"
									>
										🚀 Sign In Instantly
									</a>
								</div>

								<div
									style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #a855f7;"
								>
									<p style="color: #6b21a8; margin: 0; font-size: 14px;">
										<strong>🔒 Secure & Fast:</strong> This magic link expires
										in 15 minutes for your security.
									</p>
								</div>

								<p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
									If you didn't request this login link, you can safely ignore
									this email.
								</p>
							</td>
						</tr>

						<!-- Footer -->
						<tr>
							<td
								style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;"
							>
								<p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
									<strong>Amity University Patna</strong><br />
									IT Support Team - Seminar Hall Booking System
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

---

## 4. 📧 Change Email Address Template

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Confirm Email Change - Amity University Patna</title>
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
								style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 40px 30px; text-align: center;"
							>
								<h1
									style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;"
								>
									📧 Amity University Patna
								</h1>
								<p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 16px;">
									Seminar Hall Booking System
								</p>
							</td>
						</tr>

						<!-- Content -->
						<tr>
							<td style="padding: 40px 30px;">
								<h2
									style="color: #f59e0b; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;"
								>
									🔄 Confirm Your Email Change
								</h2>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									Hello,
								</p>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
									You've requested to change your email address for the Seminar
									Hall Booking System.
								</p>

								<div
									style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;"
								>
									<p style="color: #92400e; margin: 0; font-size: 14px;">
										<strong>📬 Email Change:</strong><br />
										From:
										<code
											style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px;"
											>{{ .Email }}</code
										><br />
										To:
										<code
											style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px;"
											>{{ .NewEmail }}</code
										>
									</p>
								</div>

								<!-- CTA Button -->
								<div style="text-align: center; margin: 30px 0;">
									<a
										href="{{ .ConfirmationURL }}"
										style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); 
                                          color: #ffffff; 
                                          padding: 14px 32px; 
                                          text-decoration: none; 
                                          border-radius: 8px; 
                                          font-weight: bold; 
                                          font-size: 16px; 
                                          display: inline-block;
                                          box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);"
									>
										✅ Confirm Email Change
									</a>
								</div>

								<p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
									If you didn't request this email change, please contact our
									support team immediately.
								</p>
							</td>
						</tr>

						<!-- Footer -->
						<tr>
							<td
								style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;"
							>
								<p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
									<strong>Amity University Patna</strong><br />
									IT Support Team - Seminar Hall Booking System
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

---

## 5. 🔒 Reset Password Template

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
										style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); 
                                          color: #ffffff; 
                                          padding: 14px 32px; 
                                          text-decoration: none; 
                                          border-radius: 8px; 
                                          font-weight: bold; 
                                          font-size: 16px; 
                                          display: inline-block;
                                          box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);"
									>
										🔐 Reset Password
									</a>
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

								<div
									style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;"
								>
									<p style="color: #0c4a6e; margin: 0; font-size: 14px;">
										<strong>💡 Password Tips:</strong> Use a strong password
										with at least 8 characters, including uppercase, lowercase,
										numbers, and special characters.
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
									<strong>Amity University Patna</strong><br />
									IT Support Team - Seminar Hall Booking System
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

---

## 6. 🔐 Reauthentication Template

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Reauthentication Code - Amity University Patna</title>
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
								style="background: linear-gradient(135deg, #374151 0%, #4b5563 100%); padding: 40px 30px; text-align: center;"
							>
								<h1
									style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;"
								>
									🔐 Amity University Patna
								</h1>
								<p style="color: #d1d5db; margin: 8px 0 0 0; font-size: 16px;">
									Seminar Hall Booking System
								</p>
							</td>
						</tr>

						<!-- Content -->
						<tr>
							<td style="padding: 40px 30px; text-align: center;">
								<h2
									style="color: #374151; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;"
								>
									🔒 Reauthentication Required
								</h2>

								<p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0;">
									For your security, please enter the verification code below to
									confirm your identity:
								</p>

								<!-- Verification Code -->
								<div
									style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
                                        padding: 30px; 
                                        border-radius: 12px; 
                                        margin: 30px 0; 
                                        border: 2px dashed #9ca3af;"
								>
									<p
										style="color: #374151; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;"
									>
										Your Verification Code:
									</p>
									<div
										style="background-color: #ffffff; 
                                           padding: 20px; 
                                           border-radius: 8px; 
                                           font-family: 'Courier New', monospace; 
                                           font-size: 32px; 
                                           font-weight: bold; 
                                           color: #1f2937; 
                                           letter-spacing: 8px;
                                           box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
									>
										{{ .Token }}
									</div>
								</div>

								<div
									style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;"
								>
									<p
										style="color: #92400e; margin: 0; font-size: 14px; text-align: left;"
									>
										<strong>⏰ Time Sensitive:</strong> This code expires in 10
										minutes. Enter it in your app to continue.
									</p>
								</div>

								<div
									style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;"
								>
									<p
										style="color: #0c4a6e; margin: 0; font-size: 14px; text-align: left;"
									>
										<strong>🛡️ Security:</strong> If you didn't request this
										code, someone may be trying to access your account. Please
										change your password immediately.
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
									<strong>Amity University Patna</strong><br />
									IT Support Team - Seminar Hall Booking System
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

---

## 🎨 Design Features

### ✨ **What Makes These Templates Special:**

1. **🏢 Branded Design** - Amity University Patna colors and branding
2. **📱 Mobile Responsive** - Looks great on all devices
3. **🎨 Modern Gradients** - Beautiful color schemes for each template type
4. **🔒 Security Focused** - Clear expiration times and security warnings
5. **📧 Professional Layout** - Clean, structured email design
6. **🚀 Clear CTAs** - Prominent action buttons
7. **💡 Helpful Tips** - Security and usability guidance
8. **🎯 Context Aware** - Different colors/styles for different actions

### 🎨 **Color Schemes:**

- **Signup**: Blue gradient (trust, welcome)
- **Invite**: Green gradient (growth, invitation)
- **Magic Link**: Purple gradient (magic, instant)
- **Email Change**: Amber gradient (change, attention)
- **Password Reset**: Red gradient (security, urgent)
- **Reauthentication**: Gray gradient (security, verification)

## 📋 **Next Steps:**

1. Copy each template to your Supabase Dashboard
2. Update the **Site URL** to: `https://seminarhall-ivory.vercel.app`
3. Test each email type to ensure they work correctly
4. Customize colors or text if needed

Your users will receive beautiful, professional emails that reflect your university's brand! 🎉
