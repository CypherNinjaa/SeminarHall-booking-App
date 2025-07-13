# SMTP Configuration Guide

This guide will help you set up SMTP email functionality for your Amity Seminar Hall Booking email confirmation web app.

## Overview

The app now supports sending emails through:

- Gmail SMTP (recommended for development)
- Any other SMTP provider (for production)

## Files Added/Modified

### New Files:

- `src/lib/smtp.ts` - SMTP configuration and utilities
- `src/app/api/test-email/route.ts` - Test endpoint for SMTP configuration
- `src/app/smtp-test/page.tsx` - Web interface for testing SMTP
- `SMTP_SETUP.md` - This guide

### Modified Files:

- `src/app/api/send-email/route.ts` - Updated to use new SMTP configuration
- `.env.local` - Added SMTP environment variables

## Quick Setup (Gmail SMTP)

### Step 1: Enable 2-Factor Authentication

1. Go to your Gmail account settings
2. Enable 2-factor authentication if not already enabled

### Step 2: Generate App Password

1. Go to your Google Account settings
2. Navigate to Security → App passwords
3. Select "Mail" and generate an app password
4. Save this password securely

### Step 3: Update Environment Variables

Add these to your `.env.local` file:

```env
GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_PASSWORD=your-16-character-app-password
```

### Step 4: Test Configuration

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/smtp-test`
3. Click "Test SMTP Configuration"
4. If successful, enter your email and send a test email

## Advanced Setup (Other SMTP Providers)

For production or other SMTP providers, add these environment variables:

```env
EMAIL_PROVIDER=generic
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourprovider.com
SMTP_PASSWORD=your-password
```

Common SMTP settings:

- **Gmail**: `smtp.gmail.com:587` (TLS)
- **Outlook**: `smtp-mail.outlook.com:587` (TLS)
- **Yahoo**: `smtp.mail.yahoo.com:587` (TLS)
- **SendGrid**: `smtp.sendgrid.net:587` (TLS)

## Environment Variables Reference

### Required for Gmail SMTP:

```env
GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_PASSWORD=your-app-password
```

### Required for Generic SMTP:

```env
EMAIL_PROVIDER=generic
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false  # true for port 465, false for other ports
SMTP_USER=your-email@yourprovider.com
SMTP_PASSWORD=your-password
```

### Optional:

```env
EMAIL_PROVIDER=gmail  # defaults to gmail if not specified
```

## API Usage

### Send Email Endpoint

```http
POST /api/send-email
Content-Type: application/json

{
  "emailType": "booking_confirmation",
  "toEmail": "user@example.com",
  "data": {
    "userName": "John Doe",
    "hallName": "Conference Hall A",
    "bookingDate": "2024-01-15",
    "startTime": "09:00 AM",
    "endTime": "11:00 AM",
    "purpose": "Team Meeting",
    "bookingId": "BK-001"
  }
}
```

### Test Configuration Endpoint

```http
GET /api/test-email
```

### Send Test Email

```http
POST /api/test-email
Content-Type: application/json

{
  "testEmail": "test@example.com"
}
```

## Email Templates

The app supports different email templates. Currently available:

- `booking_confirmation` - For booking confirmations

Template variables:

- `{{userName}}` - Name of the user
- `{{hallName}}` - Name of the seminar hall
- `{{bookingDate}}` - Date of booking
- `{{startTime}}` - Start time
- `{{endTime}}` - End time
- `{{purpose}}` - Purpose of booking
- `{{bookingId}}` - Unique booking ID

## Testing

### 1. Web Interface

Visit `http://localhost:3000/smtp-test` to:

- Test SMTP configuration
- Send test emails
- View setup instructions

### 2. API Testing

Use curl or Postman to test the API endpoints directly.

### 3. Integration Testing

The email functionality integrates with your existing Supabase-based booking system.

## Troubleshooting

### Common Issues:

1. **Authentication Error**

   - Ensure 2FA is enabled for Gmail
   - Use app password, not regular password
   - Check email and password are correct

2. **Connection Timeout**

   - Check firewall settings
   - Verify SMTP host and port
   - Ensure internet connection

3. **SSL/TLS Errors**

   - For Gmail, use port 587 with TLS
   - Set `SMTP_SECURE=false` for port 587
   - Set `SMTP_SECURE=true` for port 465

4. **Rate Limiting**
   - Gmail has sending limits
   - Consider using a dedicated email service for production

### Debug Steps:

1. Check the test endpoint: `GET /api/test-email`
2. Verify environment variables are loaded
3. Check server logs for detailed error messages
4. Test with different email providers

## Production Considerations

### For Production Deployment:

1. Use environment variables on your hosting platform
2. Consider using dedicated email services (SendGrid, Mailgun, etc.)
3. Set up proper error handling and logging
4. Monitor email delivery rates
5. Implement email templates management

### Security:

- Never commit `.env.local` to version control
- Use strong, unique passwords
- Monitor for unusual email activity
- Consider rate limiting for the email API

## Next Steps

1. **Configure your SMTP settings** in `.env.local`
2. **Test the configuration** using the web interface
3. **Integrate with your booking system** using the API
4. **Customize email templates** as needed
5. **Set up production email service** when ready to deploy

## Support

If you encounter issues:

1. Check the troubleshooting section
2. Test with the web interface at `/smtp-test`
3. Check server logs for detailed error messages
4. Verify environment variables are properly set

For Gmail-specific issues, refer to Google's SMTP documentation.
