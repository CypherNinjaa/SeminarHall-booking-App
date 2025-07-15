#!/bin/bash

# Notification System Deployment Script
# Run this script to deploy the complete notification system

echo "🚀 Deploying Notification System..."

# 1. Deploy database schema
echo "📄 Applying database schema..."
supabase db reset || echo "Run: supabase db reset to apply schema"

# Alternative: Apply schema directly
# psql -h db.your-project.supabase.co -U postgres -d postgres -f database/notification_system_schema.sql

# 2. Deploy email service function
echo "📧 Deploying email service..."
supabase functions deploy send-email --no-verify-jwt

# 3. Set environment variables (add these to your Supabase dashboard)
echo "⚙️ Environment variables to set in Supabase:"
echo "- RESEND_API_KEY=your_resend_api_key (if using Resend)"
echo "- SENDGRID_API_KEY=your_sendgrid_api_key (if using SendGrid)"
echo "- FROM_EMAIL=your_verified_sender_email"
echo "- FROM_NAME=Your App Name"

# 4. Test the deployment
echo "✅ Testing notification system..."
echo "Run these tests in your app:"
echo "- notificationTester.runBasicTest(userId)"
echo "- notificationTester.testPushNotifications(userId)"
echo "- notificationTester.testEmailNotifications(userId)"

echo "🎉 Notification system deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Supabase dashboard"
echo "2. Test notifications with real users"
echo "3. Monitor delivery rates in admin dashboard"
echo "4. Customize email templates as needed"
