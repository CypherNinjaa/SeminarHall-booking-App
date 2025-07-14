# Email System Documentation

## Overview

This document describes the comprehensive email notification system for the Amity Seminar Hall Booking App. The system supports multiple email templates for different booking statuses and provides both web interface and API endpoints for sending emails.

## Email Templates

### 1. Booking Confirmation (`booking_confirmation`)

- **Purpose**: Sent when a booking is initially created
- **Subject**: "🎉 Booking Confirmed - {{hallName}}"
- **Required Fields**: `userName`, `hallName`, `bookingDate`, `startTime`, `endTime`, `purpose`, `bookingId`

### 2. Booking Approved (`booking_approved`)

- **Purpose**: Sent when admin approves a booking request
- **Subject**: "✅ Booking Approved - {{hallName}}"
- **Required Fields**: `userName`, `hallName`, `bookingDate`, `startTime`, `endTime`, `purpose`, `bookingId`, `adminMessage`

### 3. Booking Rejected (`booking_rejected`)

- **Purpose**: Sent when admin rejects a booking request
- **Subject**: "❌ Booking Rejected - {{hallName}}"
- **Required Fields**: `userName`, `hallName`, `bookingDate`, `startTime`, `endTime`, `purpose`, `bookingId`, `rejectionReason`

### 4. Booking Cancelled (`booking_cancelled`)

- **Purpose**: Sent when a booking is cancelled
- **Subject**: "🚫 Booking Cancelled - {{hallName}}"
- **Required Fields**: `userName`, `hallName`, `bookingDate`, `startTime`, `endTime`, `bookingId`

### 5. Booking Reminder (`booking_reminder`)

- **Purpose**: Sent as a reminder before the booking time
- **Subject**: "⏰ Booking Reminder - {{hallName}}"
- **Required Fields**: `userName`, `hallName`, `bookingDate`, `startTime`, `endTime`, `purpose`, `bookingId`, `timeUntil`

## API Endpoints

### Send Email API

**Endpoint**: `POST /api/send-email`

**Request Body**:

```json
{
	"emailType": "booking_confirmation",
	"toEmail": "user@example.com",
	"data": {
		"userName": "John Doe",
		"hallName": "Main Conference Hall",
		"bookingDate": "2024-12-15",
		"startTime": "10:00 AM",
		"endTime": "12:00 PM",
		"purpose": "Tech Talk",
		"bookingId": "BK-2024-001"
	}
}
```

**Response**:

```json
{
	"success": true,
	"message": "Email sent successfully",
	"emailId": "<message-id@gmail.com>",
	"emailType": "booking_confirmation",
	"recipient": "user@example.com"
}
```

### Test Email API

**Endpoint**: `POST /api/test-email`

**Request Body**:

```json
{
	"to": "test@example.com",
	"subject": "Test Email",
	"message": "This is a test message"
}
```

## Environment Variables

Required environment variables for email configuration:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Amity Seminar Hall
SMTP_FROM_EMAIL=your-email@gmail.com
```

## Usage Examples

### 1. Booking Confirmation

```javascript
const response = await fetch("/api/send-email", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		emailType: "booking_confirmation",
		toEmail: "user@example.com",
		data: {
			userName: "John Doe",
			hallName: "Main Conference Hall",
			bookingDate: "2024-12-15",
			startTime: "10:00 AM",
			endTime: "12:00 PM",
			purpose: "Tech Talk",
			bookingId: "BK-2024-001",
		},
	}),
});
```

### 2. Booking Approved

```javascript
const response = await fetch("/api/send-email", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		emailType: "booking_approved",
		toEmail: "user@example.com",
		data: {
			userName: "John Doe",
			hallName: "Main Conference Hall",
			bookingDate: "2024-12-15",
			startTime: "10:00 AM",
			endTime: "12:00 PM",
			purpose: "Tech Talk",
			bookingId: "BK-2024-001",
			adminMessage: "Approved after reviewing all requirements.",
		},
	}),
});
```

### 3. Booking Rejected

```javascript
const response = await fetch("/api/send-email", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		emailType: "booking_rejected",
		toEmail: "user@example.com",
		data: {
			userName: "John Doe",
			hallName: "Main Conference Hall",
			bookingDate: "2024-12-15",
			startTime: "10:00 AM",
			endTime: "12:00 PM",
			purpose: "Tech Talk",
			bookingId: "BK-2024-001",
			rejectionReason: "Hall is not available at the requested time.",
		},
	}),
});
```

### 4. Booking Cancelled

```javascript
const response = await fetch("/api/send-email", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		emailType: "booking_cancelled",
		toEmail: "user@example.com",
		data: {
			userName: "John Doe",
			hallName: "Main Conference Hall",
			bookingDate: "2024-12-15",
			startTime: "10:00 AM",
			endTime: "12:00 PM",
			bookingId: "BK-2024-001",
		},
	}),
});
```

### 5. Booking Reminder

```javascript
const response = await fetch("/api/send-email", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		emailType: "booking_reminder",
		toEmail: "user@example.com",
		data: {
			userName: "John Doe",
			hallName: "Main Conference Hall",
			bookingDate: "2024-12-15",
			startTime: "10:00 AM",
			endTime: "12:00 PM",
			purpose: "Tech Talk",
			bookingId: "BK-2024-001",
			timeUntil: "2 hours",
		},
	}),
});
```

## Mobile App Integration

For React Native integration, use the `EmailService` class as documented in `MOBILE_APP_INTEGRATION.md`. The service provides methods for all email types:

```javascript
import { EmailService } from "./services/EmailService";

// Send booking confirmation
await EmailService.sendBookingConfirmation(userEmail, bookingData);

// Send booking approved
await EmailService.sendBookingApproved(userEmail, bookingData);

// Send booking rejected
await EmailService.sendBookingRejected(userEmail, bookingData);

// Send booking cancelled
await EmailService.sendBookingCancelled(userEmail, bookingData);

// Send booking reminder
await EmailService.sendBookingReminder(userEmail, bookingData);
```

## Testing

### Web Interface

Visit `/smtp-test` to test the email configuration through the web interface.

### API Testing

Use the test endpoint to validate SMTP configuration:

```bash
curl -X POST "http://localhost:3000/api/test-email" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","message":"Test message"}'
```

## Production Deployment

1. **Vercel Environment Variables**: Set all SMTP variables in Vercel dashboard
2. **Domain Verification**: Ensure your domain is verified with your email provider
3. **Rate Limits**: Be aware of Gmail's sending limits (500 emails/day for free accounts)

## Security Considerations

1. **App Passwords**: Use Gmail App Passwords instead of regular passwords
2. **Environment Variables**: Never commit SMTP credentials to version control
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Email Validation**: Always validate email addresses before sending

## Troubleshooting

### Common Issues

1. **Authentication Error**: Check SMTP credentials and app password
2. **Template Not Found**: Verify template name in emailTemplates object
3. **Missing Fields**: Ensure all required fields are provided in data object
4. **SMTP Connection**: Verify SMTP host, port, and security settings

### Error Messages

- `"Valid email address is required"`: Invalid or missing email address
- `"Missing required field: {field}"`: Required field missing from data
- `"Template '{template}' not found"`: Invalid template name
- `"Failed to send email"`: SMTP connection or authentication issue

## File Structure

```
src/
├── lib/
│   ├── smtp.ts              # SMTP configuration and utilities
│   └── supabase.ts          # Supabase client configuration
├── app/
│   ├── api/
│   │   ├── send-email/
│   │   │   └── route.ts     # Main email API endpoint
│   │   └── test-email/
│   │       └── route.ts     # Email testing endpoint
│   └── smtp-test/
│       └── page.tsx         # Web testing interface
```

## Support

For technical support or questions about the email system, contact:

- Email: vikashkelly@gmail.com
- GitHub: https://github.com/your-repo/seminar-hall-booking

## Version History

- **v1.0.0**: Initial SMTP setup with booking confirmation
- **v2.0.0**: Added comprehensive email templates for all booking statuses
- **v2.1.0**: Added mobile app integration support
- **v2.2.0**: Integrated password reset system with Supabase Auth

## Password Reset System

The app now includes a comprehensive password reset system that integrates with Supabase Auth:

### Forgot Password Page

**URL**: `/forgot-password`

This page handles two scenarios:

1. **Request Password Reset**: Users can enter their email to receive a reset link
2. **Reset Password**: When users click the reset link in their email, they're redirected here to set a new password

### Features:

- **Responsive Design**: Works on all devices with beautiful UI
- **Email Validation**: Validates email format before sending
- **Password Strength**: Enforces minimum 6-character passwords
- **Loading States**: Shows loading indicators during requests
- **Error Handling**: Displays clear error messages
- **Success Messages**: Confirms successful operations
- **Auto-redirect**: Redirects to main app after successful password reset

### Supabase Configuration

To use the password reset functionality, configure your Supabase project:

1. **Email Templates**: Set up custom email templates in Supabase Dashboard
2. **Redirect URLs**: Add your domain to allowed redirect URLs:
   ```
   https://your-domain.com/forgot-password
   http://localhost:3000/forgot-password (for development)
   ```

### API Endpoints

#### Forgot Password API

**Endpoint**: `POST /api/forgot-password`

**Request Body**:

```json
{
	"email": "user@example.com",
	"redirectTo": "https://your-domain.com/forgot-password" // optional
}
```

**Response**:

```json
{
	"success": true,
	"message": "Password reset email sent successfully"
}
```

### Usage Examples

#### Web Interface

Users can visit `/forgot-password` directly to:

1. Enter their email address
2. Receive a reset link via email
3. Click the link to return and set a new password

#### Mobile App Integration

```javascript
// Request password reset
const response = await fetch("/api/forgot-password", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		email: userEmail,
		redirectTo: "https://your-domain.com/forgot-password",
	}),
});
```

#### Deep Linking

The mobile app can implement deep linking to handle password reset URLs:

```javascript
// Handle deep link in React Native
const handlePasswordReset = (url) => {
	if (url.includes("/forgot-password")) {
		// Extract tokens from URL
		const urlParams = new URLSearchParams(url.split("?")[1]);
		const accessToken = urlParams.get("access_token");
		const refreshToken = urlParams.get("refresh_token");
		const type = urlParams.get("type");

		if (type === "recovery" && accessToken) {
			// Navigate to password reset screen in app
			navigateToPasswordReset({ accessToken, refreshToken });
		}
	}
};
```
