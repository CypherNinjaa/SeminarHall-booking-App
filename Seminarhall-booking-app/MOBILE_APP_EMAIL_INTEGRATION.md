# Mobile App Email Integration Guide

## Overview

This document explains how the React Native mobile app integrates with your website's comprehensive email system. The mobile app now uses your website's email API endpoints instead of standalone email services.

## Integration Architecture

```
Mobile App → Website Email API → SMTP Service → Email Delivery
```

### Components:

- **Mobile App**: React Native app with integrated email service
- **Website Email API**: Your website's `/api/send-email` and `/api/forgot-password` endpoints
- **SMTP Service**: Gmail SMTP configuration on your website
- **Email Templates**: Professional HTML templates for all email types

## Email Service Integration

### Configuration

Update the email service configuration in `src/services/emailService.ts`:

```typescript
// Update these URLs to match your website
private readonly WEBSITE_EMAIL_API_URL = __DEV__
  ? 'http://localhost:3000' // Your website's development server
  : 'https://your-domain.com'; // Your website's production domain
```

### Supported Email Types

The mobile app now supports all email templates from your website:

1. **booking_confirmation** - When booking is created
2. **booking_approved** - When admin approves booking
3. **booking_rejected** - When admin rejects booking
4. **booking_cancelled** - When booking is cancelled
5. **booking_reminder** - Reminder before booking time
6. **password_reset** - Password reset functionality

## Usage Examples

### 1. Booking Confirmation Email

```typescript
import { emailService } from "../services/emailService";

// Send booking confirmation
const success = await emailService.sendBookingConfirmation(
	user.email,
	user.name,
	{
		id: booking.id,
		hallName: hall.name,
		bookingDate: booking.date,
		startTime: booking.start_time,
		endTime: booking.end_time,
		purpose: booking.purpose,
	}
);

if (success) {
	console.log("✅ Booking confirmation email sent");
} else {
	console.log("❌ Failed to send booking confirmation");
}
```

### 2. Booking Approval Email

```typescript
// Send booking approval with admin message
const success = await emailService.sendBookingApproval(
	user.email,
	user.name,
	{
		id: booking.id,
		hallName: hall.name,
		bookingDate: booking.date,
		startTime: booking.start_time,
		endTime: booking.end_time,
		purpose: booking.purpose,
	},
	adminUser.name // Admin who approved
);
```

### 3. Booking Rejection Email

```typescript
// Send booking rejection with reason
const success = await emailService.sendBookingRejection(
	user.email,
	user.name,
	bookingData,
	"Hall is not available at the requested time."
);
```

### 4. Password Reset Email

```typescript
// Send password reset email using your website's API
const result = await emailService.sendPasswordResetEmail(
	user.email,
	"https://your-domain.com/forgot-password"
);

if (result.success) {
	console.log("✅ Password reset email sent");
} else {
	console.log("❌ Failed to send password reset:", result.message);
}
```

### 5. Test Email Configuration

```typescript
// Test email configuration
const result = await emailService.testEmailConfiguration(
	"test@example.com",
	"Test Subject",
	"Test message from mobile app"
);

if (result.success) {
	console.log("✅ Email configuration working");
} else {
	console.log("❌ Email configuration issue:", result.message);
}
```

## Booking Flow Integration

### Complete Booking Workflow

```typescript
// 1. Create booking
const booking = await createBooking(bookingData);

// 2. Send confirmation email
await emailService.sendBookingConfirmation(user.email, user.name, {
	id: booking.id,
	hallName: hall.name,
	bookingDate: booking.date,
	startTime: booking.start_time,
	endTime: booking.end_time,
	purpose: booking.purpose,
});

// 3. Admin approval process
if (bookingApproved) {
	await emailService.sendBookingApproval(
		user.email,
		user.name,
		bookingData,
		admin.name
	);
} else {
	await emailService.sendBookingRejection(
		user.email,
		user.name,
		bookingData,
		rejectionReason
	);
}

// 4. Send reminders (automated)
await emailService.sendTomorrowBookingReminders();
```

## Password Reset Integration

### Mobile App Flow

1. **Request Reset**: User taps "Forgot Password" in mobile app
2. **API Call**: App calls your website's `/api/forgot-password` endpoint
3. **Email Sent**: Website sends reset email with link to web interface
4. **Web Reset**: User completes password reset on your website
5. **Return to App**: User returns to mobile app to login with new password

### Implementation

```typescript
// In ForgotPasswordScreen.tsx
const handleSendResetEmail = async () => {
	try {
		const result = await emailService.sendPasswordResetEmail(
			email,
			"https://your-domain.com/forgot-password"
		);

		if (result.success) {
			setEmailSent(true);
			Alert.alert(
				"Email Sent",
				"Please check your email for password reset instructions."
			);
		} else {
			Alert.alert("Error", result.message);
		}
	} catch (error) {
		Alert.alert("Error", "Failed to send reset email");
	}
};
```

## Error Handling & Fallback

### Primary and Fallback APIs

The email service includes fallback functionality:

1. **Primary**: Your website's email API
2. **Fallback**: Vercel email API (existing)

```typescript
// Automatic fallback in email service
try {
	// Try your website's API first
	return await this.sendEmail(template, emailData);
} catch (error) {
	// Fallback to Vercel API
	return await this.sendEmailFallback(template, emailData);
}
```

### Error Types

- **Network Errors**: Connection issues with your website
- **API Errors**: 4xx/5xx responses from email endpoints
- **Email Delivery Errors**: SMTP configuration issues
- **Template Errors**: Missing or invalid email templates

## Configuration Requirements

### Environment Variables (on your website)

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Amity Seminar Hall
SMTP_FROM_EMAIL=your-email@gmail.com
```

### Mobile App Configuration

```typescript
// Update in emailService.ts
private readonly WEBSITE_EMAIL_API_URL = 'https://your-actual-domain.com';
```

### Cross-Origin Resource Sharing (CORS)

Ensure your website allows requests from the mobile app:

```javascript
// In your website's API routes
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};
```

## Testing

### Development Testing

1. **Start your website**: `npm run dev` (localhost:3000)
2. **Start mobile app**: `npm start` (Expo)
3. **Test email flow**: Create booking and verify email delivery
4. **Test password reset**: Use forgot password feature

### Production Testing

1. **Deploy website**: Ensure email API endpoints are live
2. **Update mobile app**: Set production URL in email service
3. **Test all email types**: Verify each template works correctly
4. **Monitor email delivery**: Check for any failed emails

## Monitoring & Analytics

### Email Statistics

The mobile app tracks email statistics:

```typescript
// Get email stats
const stats = await emailService.getEmailStats();
console.log(`Emails sent today: ${stats.todaySent}`);
console.log(`Total sent: ${stats.totalSent}`);
console.log(`Failed: ${stats.totalFailed}`);
```

### Logging

All email operations are logged:

- ✅ Successful email sends
- ❌ Failed email attempts
- 📧 Email type and recipient
- 🔄 Fallback API usage

## Security Considerations

### API Security

- **HTTPS Only**: Use HTTPS for all API calls in production
- **Rate Limiting**: Your website should implement rate limiting
- **Input Validation**: Validate all email addresses and data
- **Error Messages**: Don't expose sensitive information in errors

### Email Security

- **App Passwords**: Use Gmail App Passwords, not regular passwords
- **Secure Storage**: Never store SMTP credentials in mobile app
- **Email Validation**: Validate email addresses before sending
- **Spam Prevention**: Monitor sending patterns to avoid spam filters

## Troubleshooting

### Common Issues

1. **"Failed to send email"**

   - Check network connection
   - Verify website URL is correct
   - Ensure website's email API is running

2. **"SMTP Authentication Error"**

   - Check SMTP credentials on website
   - Verify Gmail App Password is correct
   - Ensure SMTP settings are correct

3. **"Template not found"**

   - Verify email template names match exactly
   - Check website's email template configuration

4. **"CORS Error"**
   - Configure CORS headers on website
   - Allow requests from mobile app domain

### Debug Steps

1. **Check API URLs**: Verify development vs production URLs
2. **Test Website Directly**: Test email APIs using Postman/curl
3. **Check Network**: Ensure mobile device can reach website
4. **Review Logs**: Check both mobile app and website logs

## Future Enhancements

### Planned Features

- **Email Templates**: Custom templates with university branding
- **Push Notifications**: Complement emails with push notifications
- **Email Preferences**: Allow users to customize email settings
- **Analytics Dashboard**: Email delivery analytics in admin panel
- **Bulk Operations**: Mass email capabilities for administrators

### Optimization Opportunities

- **Caching**: Cache email templates for faster delivery
- **Queue System**: Queue emails for better reliability
- **A/B Testing**: Test different email subject lines
- **Personalization**: More personalized email content

## Support

For technical support with email integration:

- **Mobile App Issues**: Check mobile app logs and network connectivity
- **Website API Issues**: Check website server logs and SMTP configuration
- **Email Delivery Issues**: Monitor Gmail/SMTP service status
- **Template Issues**: Verify email template syntax and data mapping

## Migration Notes

### From Previous System

If migrating from the previous email system:

1. **Update Dependencies**: Ensure emailService is imported correctly
2. **Update API URLs**: Change from Vercel-only to website-primary
3. **Test All Flows**: Verify all email types work with new API
4. **Monitor Performance**: Watch for any delivery issues
5. **Update Documentation**: Keep team informed of changes

The integration provides a robust, scalable email system that leverages your website's professional email infrastructure while maintaining the mobile app's user experience.
