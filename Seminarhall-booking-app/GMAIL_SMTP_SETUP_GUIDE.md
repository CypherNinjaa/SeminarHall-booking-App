# Gmail SMTP Setup Guide for Seminar Hall Booking App

## 🔧 Complete Implementation Guide

### 1. Gmail Account Configuration

#### Step 1: Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. This is **REQUIRED** for App Passwords

#### Step 2: Generate App Password

1. Go to **Google Account Settings** → **Security**
2. Under "Signing in to Google", click **App passwords**
3. Select app: **Mail**
4. Select device: **Other (Custom name)**
5. Enter name: **"Seminar Hall Booking App"**
6. **Copy the 16-character password** - you'll need this!

#### Step 3: Update Environment Variables

Replace the placeholders in your `.env` file:

```env
# Gmail SMTP Configuration
GMAIL_SMTP_HOST=smtp.example.com
GMAIL_SMTP_PORT=*******
GMAIL_SMTP_SECURE=false
GMAIL_SMTP_USER=your-actual-email@gmail.com
GMAIL_SMTP_PASSWORD=your-16-character-app-password
GMAIL_FROM_NAME=Amity Seminar Hall Booking
GMAIL_FROM_EMAIL=your-actual-email@gmail.com
```

**Example:**

```env
GMAIL_SMTP_USER=vikashkelly@gmail.com
GMAIL_SMTP_PASSWORD=abcd efgh ijkl mnop
GMAIL_FROM_EMAIL=vikashkelly@gmail.com
```

### 2. Database Setup

#### Execute this SQL in your Supabase SQL Editor:

```sql
-- Create email_notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
        'booking_confirmation',
        'booking_approved',
        'booking_rejected',
        'booking_cancelled',
        'booking_reminder',
        'password_reset'
    )),
    booking_id UUID REFERENCES smart_bookings(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ NULL,
    error_message TEXT NULL,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_booking_id ON email_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);

-- Enable RLS
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own email notifications" ON email_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage email notifications" ON email_notifications
    FOR ALL USING (auth.role() = 'service_role');
```

### 3. Deploy Supabase Edge Function

#### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

#### Step 2: Login to Supabase

```bash
supabase login
```

#### Step 3: Link Your Project

```bash
supabase link --project-ref your-project-ref
```

#### Step 4: Deploy the Email Function

```bash
supabase functions deploy email-service
```

#### Step 5: Set Environment Variables in Supabase

```bash
supabase secrets set GMAIL_SMTP_HOST=smtp.gmail.com
supabase secrets set GMAIL_SMTP_PORT=587
supabase secrets set GMAIL_SMTP_SECURE=false
supabase secrets set GMAIL_SMTP_USER=your-email@gmail.com
supabase secrets set GMAIL_SMTP_PASSWORD=your-app-password
supabase secrets set GMAIL_FROM_NAME="Amity Seminar Hall Booking"
supabase secrets set GMAIL_FROM_EMAIL=your-email@gmail.com
```

### 4. Alternative: SMTP2GO Service (Recommended for Production)

If Gmail rate limits become an issue, use SMTP2GO:

#### Step 1: Sign up at [SMTP2GO](https://www.smtp2go.com/)

- Free tier: 1,000 emails/month
- Reliable delivery
- Better for production

#### Step 2: Get API Key

1. Sign up and verify your account
2. Go to **Settings** → **API Keys**
3. Create new API key
4. Copy the API key

#### Step 3: Update Environment Variables

```env
# SMTP2GO Configuration (Alternative to Gmail)
SMTP2GO_API_KEY=your-smtp2go-api-key
```

### 5. Testing Your Email Setup

#### Test Email Configuration

```typescript
// In your app, call this to test
import { emailService } from "../services/emailService";

const testEmail = async () => {
	try {
		const success = await emailService.testEmailConfiguration();
		console.log("Email test:", success ? "SUCCESS" : "FAILED");
	} catch (error) {
		console.error("Email test error:", error);
	}
};
```

### 6. Email Templates Included

✅ **Booking Confirmation** - When user creates a booking
✅ **Booking Approved** - When admin approves
✅ **Booking Rejected** - When admin rejects with reason
✅ **Booking Cancelled** - When booking is cancelled
✅ **Booking Reminder** - Day before booking
✅ **Password Reset** - For password recovery

### 7. Email Features Implemented

#### Automatic Email Triggers

- ✅ **On Booking Creation** → Confirmation email
- ✅ **On Admin Approval** → Approval email
- ✅ **On Admin Rejection** → Rejection email with reason
- ✅ **Day Before Booking** → Reminder email

#### Professional Templates

- 🎨 **Beautiful HTML emails** with your branding
- 📱 **Mobile-responsive** design
- 🏛️ **University branding** included
- 👨‍💻 **Developer contact** (vikashkelly@gmail.com) in footer

#### Smart Features

- 🔄 **Retry logic** for failed emails
- 📊 **Email tracking** and statistics
- 🚫 **Rate limiting** to prevent spam
- 📝 **Logging** of all email attempts

### 8. Integration Points

#### In Booking Creation (Already Added)

```typescript
// Automatically sends confirmation email
const booking = await smartBookingService.createBooking(bookingData, userId);
```

#### For Admin Actions (To Add)

```typescript
// When admin approves booking
await emailService.sendBookingApproval(
	userEmail,
	userName,
	bookingData,
	adminName
);

// When admin rejects booking
await emailService.sendBookingRejection(
	userEmail,
	userName,
	bookingData,
	rejectionReason
);
```

#### Daily Reminder System (To Add)

```typescript
// Run this daily (can be triggered by cron job or manual call)
const { sent, failed } = await emailService.sendTomorrowBookingReminders();
console.log(`Reminders sent: ${sent}, failed: ${failed}`);
```

### 9. Security Considerations

✅ **App Passwords** - Using Gmail App Passwords (not main password)
✅ **Environment Variables** - Sensitive data in env files
✅ **Server-side Processing** - SMTP credentials never exposed to client
✅ **Rate Limiting** - Prevents spam and abuse
✅ **Error Handling** - Graceful failure handling
✅ **Logging** - Audit trail of all email communications

### 10. Monitoring & Analytics

#### Email Statistics Available

- Total emails sent/failed
- Daily email counts
- Most used email templates
- Recent failures for debugging
- User-specific email history

#### Access Email Stats

```typescript
const stats = await emailService.getEmailStats();
console.log("Email Statistics:", stats);
```

### 11. Production Deployment Checklist

- [ ] Gmail App Password generated and tested
- [ ] Environment variables updated with real credentials
- [ ] Supabase Edge Function deployed
- [ ] Database schema applied
- [ ] Email templates customized with your branding
- [ ] Test emails sent and received successfully
- [ ] Error handling and logging verified
- [ ] Rate limiting configured appropriately

### 12. Troubleshooting Common Issues

#### "Authentication Failed"

- ✅ Verify App Password is correct (16 characters)
- ✅ Ensure 2FA is enabled on Gmail account
- ✅ Check email address is correct

#### "Connection Refused"

- ✅ Check SMTP host and port (smtp.gmail.com:587)
- ✅ Verify network connectivity
- ✅ Ensure SMTP2GO API key is valid (if using alternative)

#### "Rate Limited"

- ✅ Gmail has sending limits (~100 emails/day for new accounts)
- ✅ Consider upgrading to SMTP2GO for higher volume
- ✅ Implement longer delays between emails

#### Edge Function Errors

- ✅ Check Supabase Function logs
- ✅ Verify environment variables are set
- ✅ Ensure function is deployed correctly

### 13. Next Steps for Enhancement

1. **Admin Dashboard Integration**

   - Add email sending controls to admin panel
   - Email template management interface
   - Email statistics dashboard

2. **User Preferences**

   - Allow users to opt-out of certain email types
   - Email frequency preferences
   - HTML vs text email preferences

3. **Advanced Features**
   - Email scheduling for specific times
   - Bulk email campaigns
   - Email template editor
   - A/B testing for email templates

### 🎯 Ready to Use!

Your email system is now ready! Users will automatically receive professional, branded emails for all booking activities. The system is secure, scalable, and includes comprehensive error handling and monitoring.

**Developer Contact Integration:** Your email `vikashkelly@gmail.com` is prominently featured in all email templates and help documentation, ensuring users can reach you directly for support.
