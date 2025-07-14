# Mobile App Email Integration Guide

## Overview

This document explains how the React Native app integrates with the comprehensive email system deployed on your website. The mobile app communicates with your email API to send various types of notifications.

## Email Service Configuration

The `EmailService` class in the mobile app is configured to use your website's email API:

```typescript
// Production URL (update this with your actual domain)
private readonly WEBSITE_EMAIL_API_URL = 'https://seminarhall-ivory.vercel.app';
```

## Available Email Functions

### 1. Password Reset Email

```typescript
import { EmailService } from "../services/EmailService";

// Send password reset email
try {
	await EmailService.sendPasswordResetEmail("user@example.com");
	console.log("Password reset email sent successfully");
} catch (error) {
	console.error("Failed to send password reset email:", error);
}
```

### 2. Booking Confirmation Email

```typescript
// Send booking confirmation
const bookingData = {
	userName: "John Doe",
	hallName: "Main Conference Hall",
	bookingDate: "2024-12-15",
	startTime: "10:00 AM",
	endTime: "12:00 PM",
	purpose: "Tech Talk",
	bookingId: "BK-2024-001",
};

try {
	await EmailService.sendBookingConfirmation("user@example.com", bookingData);
	console.log("Booking confirmation sent");
} catch (error) {
	console.error("Failed to send booking confirmation:", error);
}
```

### 3. Booking Status Updates

```typescript
// Booking approved
await EmailService.sendBookingApproved("user@example.com", {
	...bookingData,
	adminMessage: "Approved after reviewing all requirements.",
});

// Booking rejected
await EmailService.sendBookingRejected("user@example.com", {
	...bookingData,
	rejectionReason: "Hall is not available at the requested time.",
});

// Booking cancelled
await EmailService.sendBookingCancelled("user@example.com", bookingData);
```

### 4. Booking Reminders

```typescript
// Send booking reminder
await EmailService.sendBookingReminder("user@example.com", {
	...bookingData,
	timeUntil: "2 hours",
});
```

## Integration with Booking Flow

Here's how to integrate email notifications into your booking workflow:

### In BookingScreen.tsx

```typescript
import { EmailService } from "../services/EmailService";
import { useAuthStore } from "../stores/authStore";

const BookingScreen = () => {
	const { user } = useAuthStore();

	const handleCreateBooking = async (bookingData) => {
		try {
			// 1. Create booking in Supabase
			const booking = await createBooking(bookingData);

			// 2. Send confirmation email
			await EmailService.sendBookingConfirmation(user.email, {
				userName: user.name,
				hallName: bookingData.hallName,
				bookingDate: bookingData.date,
				startTime: bookingData.startTime,
				endTime: bookingData.endTime,
				purpose: bookingData.purpose,
				bookingId: booking.id,
			});

			// 3. Show success message
			Alert.alert("Success", "Booking created and confirmation email sent!");
		} catch (error) {
			console.error("Booking creation failed:", error);
			Alert.alert("Error", "Failed to create booking");
		}
	};
};
```

### In Admin Dashboard

```typescript
const handleApproveBooking = async (booking) => {
	try {
		// 1. Update booking status in database
		await updateBookingStatus(booking.id, "approved");

		// 2. Send approval email
		await EmailService.sendBookingApproved(booking.userEmail, {
			userName: booking.userName,
			hallName: booking.hallName,
			bookingDate: booking.date,
			startTime: booking.startTime,
			endTime: booking.endTime,
			purpose: booking.purpose,
			bookingId: booking.id,
			adminMessage: "Your booking has been approved!",
		});

		// 3. Refresh the booking list
		fetchBookings();
	} catch (error) {
		console.error("Failed to approve booking:", error);
	}
};

const handleRejectBooking = async (booking, reason) => {
	try {
		// 1. Update booking status
		await updateBookingStatus(booking.id, "rejected");

		// 2. Send rejection email
		await EmailService.sendBookingRejected(booking.userEmail, {
			userName: booking.userName,
			hallName: booking.hallName,
			bookingDate: booking.date,
			startTime: booking.startTime,
			endTime: booking.endTime,
			purpose: booking.purpose,
			bookingId: booking.id,
			rejectionReason: reason,
		});
	} catch (error) {
		console.error("Failed to reject booking:", error);
	}
};
```

## Error Handling

The EmailService includes comprehensive error handling:

```typescript
// The service automatically handles:
// - Network failures with retries
// - API errors with detailed logging
// - Fallback to alternative email services
// - User-friendly error messages

// Example error handling in your components:
try {
	await EmailService.sendBookingConfirmation(email, data);
} catch (error) {
	if (error.message.includes("Network request failed")) {
		Alert.alert(
			"Connection Error",
			"Please check your internet connection and try again."
		);
	} else if (error.message.includes("Invalid email")) {
		Alert.alert(
			"Invalid Email",
			"Please check the email address and try again."
		);
	} else {
		Alert.alert(
			"Email Error",
			"Failed to send email notification. The booking was still created successfully."
		);
	}
}
```

## Email Queue and Retry Logic

The service includes built-in retry logic for failed emails:

```typescript
// Automatic retry with exponential backoff
// - First attempt: immediate
// - Second attempt: after 5 seconds
// - Third attempt: after 10 seconds
// - Failure: logged to console and Supabase

// Track email status in your database
const emailNotification = {
	user_id: user.id,
	email: user.email,
	template_type: "booking_confirmation",
	booking_id: booking.id,
	status: "pending", // 'sent' | 'failed'
	retry_count: 0,
};
```

## Offline Support

The app handles offline scenarios gracefully:

```typescript
import NetInfo from "@react-native-async-storage/async-storage";

// Check network status before sending emails
const sendEmailWithOfflineSupport = async (emailFunction) => {
	const netInfo = await NetInfo.fetch();

	if (!netInfo.isConnected) {
		// Queue email for later
		await queueEmailForLater(emailFunction);
		Alert.alert("Offline", "Email will be sent when connection is restored.");
		return;
	}

	// Send immediately
	await emailFunction();
};
```

## Configuration for Different Environments

### Development

```typescript
// For local testing, you might want to use a different endpoint
const WEBSITE_EMAIL_API_URL = __DEV__
	? "http://your-local-ip:3000" // Your local development server
	: "https://seminarhall-ivory.vercel.app"; // Production
```

### Production

Ensure your production website has:

1. **CORS configured** to allow requests from your mobile app domain
2. **Rate limiting** to prevent abuse
3. **SSL certificate** for secure HTTPS communication
4. **Email service configured** with proper SMTP settings

## Testing Email Integration

### Manual Testing

1. Use the email testing endpoint in your website:

```bash
curl -X POST "https://seminarhall-ivory.vercel.app/api/test-email" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","message":"Test from mobile app"}'
```

2. Test from the mobile app:

```typescript
// Add a test button in development builds
const testEmail = async () => {
	try {
		await EmailService.sendBookingConfirmation("test@example.com", {
			userName: "Test User",
			hallName: "Test Hall",
			bookingDate: "2024-12-15",
			startTime: "10:00 AM",
			endTime: "12:00 PM",
			purpose: "Test Purpose",
			bookingId: "TEST-001",
		});
		Alert.alert("Success", "Test email sent!");
	} catch (error) {
		Alert.alert("Error", `Failed to send test email: ${error.message}`);
	}
};
```

### Automated Testing

```typescript
// Unit tests for email service
import { EmailService } from "../services/EmailService";

describe("EmailService", () => {
	it("should send booking confirmation email", async () => {
		const mockFetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		});
		global.fetch = mockFetch;

		await EmailService.sendBookingConfirmation("test@example.com", {
			userName: "Test User",
			// ... other required fields
		});

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining("/api/send-email"),
			expect.objectContaining({
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: expect.stringContaining("booking_confirmation"),
			})
		);
	});
});
```

## Monitoring and Analytics

Track email performance in your app:

```typescript
// Log email events for analytics
const logEmailEvent = (eventType, emailType, success, error = null) => {
	// Send to your analytics service
	Analytics.track("Email Event", {
		eventType, // 'sent', 'failed', 'retry'
		emailType, // 'booking_confirmation', 'password_reset', etc.
		success,
		error: error?.message,
		timestamp: new Date().toISOString(),
	});
};

// Use in EmailService
await EmailService.sendBookingConfirmation(email, data)
	.then(() => logEmailEvent("sent", "booking_confirmation", true))
	.catch((error) =>
		logEmailEvent("failed", "booking_confirmation", false, error)
	);
```

## Security Considerations

1. **API Key Protection**: Never expose email API keys in the mobile app
2. **Rate Limiting**: Implement client-side rate limiting to prevent spam
3. **Email Validation**: Always validate email addresses before sending
4. **User Consent**: Ensure users have consented to receive emails
5. **Unsubscribe**: Provide unsubscribe options in emails

## Support and Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your website allows requests from your app domain
2. **Network Timeouts**: Implement proper timeout handling
3. **Invalid Email Formats**: Use email validation before sending
4. **Rate Limits**: Handle rate limit responses gracefully

### Debug Logging

Enable detailed logging in development:

```typescript
const DEBUG_EMAIL = __DEV__;

if (DEBUG_EMAIL) {
	console.log("📧 Email Service Debug Info:", {
		apiUrl: this.getEmailApiUrl(),
		emailType: template,
		recipient: emailData.to,
		timestamp: new Date().toISOString(),
	});
}
```

For support, contact:

- Email: vikashkelly@gmail.com
- GitHub: https://github.com/CypherNinjaa/SeminarHall-booking-App
