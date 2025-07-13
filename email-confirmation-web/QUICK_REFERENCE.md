# Quick Reference Guide

## 🚀 **Essential URLs**

- **Production App**: https://seminarhall-ivory.vercel.app
- **SMTP Test**: https://seminarhall-ivory.vercel.app/smtp-test
- **Email API**: https://seminarhall-ivory.vercel.app/api/send-email
- **Verification**: https://seminarhall-ivory.vercel.app/verify

## 🔐 **Required Environment Variables**

```env
# Supabase (Get from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Gmail SMTP (Generate App Password from Google Account)
GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_PASSWORD=your-16-character-app-password

# App Configuration
NEXT_PUBLIC_WEB_URL=https://seminarhall-ivory.vercel.app
NEXT_PUBLIC_APP_SCHEME=amityseminarhall
NEXT_PUBLIC_DEV_MODE=false
```

## 📱 **Mobile App Integration**

### API Endpoint for Booking Confirmations

```javascript
POST https://seminarhall-ivory.vercel.app/api/send-email
Content-Type: application/json

{
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
}
```

### Deep Link Configuration

- **Scheme**: `amityseminarhall://`
- **Verification**: `amityseminarhall://verified`
- **Password Reset**: `amityseminarhall://password-reset`

## 🗄️ **Supabase Configuration**

### Authentication Settings

1. **Site URL**: `https://seminarhall-ivory.vercel.app`
2. **Redirect URLs**: `https://seminarhall-ivory.vercel.app/verify`
3. **Email Templates**: Configure in Auth → Email Templates

### API Keys Locations

- **Dashboard**: Settings → API
- **Project URL**: Used for `NEXT_PUBLIC_SUPABASE_URL`
- **anon key**: Used for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key**: Used for `SUPABASE_SERVICE_ROLE_KEY`

## 📧 **Gmail SMTP Setup**

1. **Enable 2-Factor Authentication**
2. **Google Account → Security → App passwords**
3. **Select "Mail" → Generate**
4. **Use 16-character password** (not your regular password)

## 🧪 **Testing Commands**

```bash
# Test SMTP configuration
curl -X GET https://seminarhall-ivory.vercel.app/api/test-email

# Send test email
curl -X POST https://seminarhall-ivory.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "your-email@gmail.com"}'
```

## 🚨 **Common Issues**

| Issue                         | Solution                                  |
| ----------------------------- | ----------------------------------------- |
| SMTP Auth Error               | Use App Password, not regular password    |
| Deep Link Not Working         | Check mobile app URL scheme configuration |
| Email Not Received            | Check spam folder, verify SMTP settings   |
| Environment Variables Missing | Restart server after adding variables     |
| Supabase Connection Error     | Verify URL and keys in dashboard          |

## 📋 **Deployment Checklist**

- [ ] Supabase project configured
- [ ] Environment variables set in Vercel
- [ ] SMTP tested and working
- [ ] Deep links configured in mobile app
- [ ] Production URLs updated
- [ ] Email verification flow tested
- [ ] Mobile app integration verified

## 🔧 **Quick Commands**

```bash
# Local development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Add environment variable
vercel env add VARIABLE_NAME

# List environment variables
vercel env ls
```

## 📞 **Support**

If you need help:

1. Check the **COMPLETE_SETUP_GUIDE.md** for detailed instructions
2. Use the **SMTP test page** for troubleshooting
3. Check **Vercel logs** for deployment issues
4. Review **Supabase dashboard** for auth configuration
