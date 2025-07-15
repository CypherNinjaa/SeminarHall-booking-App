-- Notification System Complete Schema
-- Run this script to set up the complete notification system

-- 1. Push Tokens Table (for Expo push notifications)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT push_tokens_user_platform_unique UNIQUE (user_id, platform)
) TABLESPACE pg_default;

-- Index for push tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens USING btree (is_active) TABLESPACE pg_default;

-- 2. User Notification Settings Table
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  booking_updates BOOLEAN NOT NULL DEFAULT TRUE,
  reminders BOOLEAN NOT NULL DEFAULT TRUE,
  maintenance_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  system_announcements BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time INTEGER NOT NULL DEFAULT 60, -- minutes before booking
  email_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT user_notification_settings_user_id_unique UNIQUE (user_id)
) TABLESPACE pg_default;

-- Index for notification settings
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id) TABLESPACE pg_default;

-- 3. Email Logs Table (to track email notifications) 
-- Note: Integrates with existing emailService implementation
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  notification_id UUID NULL,
  email_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider_response JSONB NULL,
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT email_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Index for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs USING btree (created_at) TABLESPACE pg_default;

-- 4. Push Notification Logs Table (to track push notifications)
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  notification_id UUID NULL,
  push_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  expo_response JSONB NULL,
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT push_notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT push_notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT push_notification_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Index for push notification logs
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_user_id ON public.push_notification_logs USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_status ON public.push_notification_logs USING btree (status) TABLESPACE pg_default;

-- 5. Scheduled Notifications Table (for future notifications)
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  send_push BOOLEAN NOT NULL DEFAULT TRUE,
  send_email BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT scheduled_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Index for scheduled notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_id ON public.scheduled_notifications USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON public.scheduled_notifications USING btree (scheduled_for) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_is_sent ON public.scheduled_notifications USING btree (is_sent) TABLESPACE pg_default;

-- 6. Create or replace function to automatically create default notification settings for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to automatically create notification settings for new users
DROP TRIGGER IF EXISTS create_default_notification_settings_trigger ON auth.users;
CREATE TRIGGER create_default_notification_settings_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_settings();

-- 8. Function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < (NOW() - INTERVAL '1 day' * days_to_keep);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also clean up related logs
  DELETE FROM public.email_logs 
  WHERE created_at < (NOW() - INTERVAL '1 day' * days_to_keep);
  
  DELETE FROM public.push_notification_logs 
  WHERE created_at < (NOW() - INTERVAL '1 day' * days_to_keep);
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to get notification statistics
CREATE OR REPLACE FUNCTION public.get_notification_stats(user_uuid UUID)
RETURNS TABLE (
  total_notifications INTEGER,
  unread_notifications INTEGER,
  notifications_this_week INTEGER,
  last_notification_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_notifications,
    COUNT(CASE WHEN NOT is_read THEN 1 END)::INTEGER as unread_notifications,
    COUNT(CASE WHEN created_at > (NOW() - INTERVAL '7 days') THEN 1 END)::INTEGER as notifications_this_week,
    MAX(created_at) as last_notification_date
  FROM public.notifications 
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RLS Policies for security
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Push tokens policies
CREATE POLICY "Users can view their own push tokens" ON public.push_tokens
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own push tokens" ON public.push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own push tokens" ON public.push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view their own notification settings" ON public.user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own notification settings" ON public.user_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Email logs policies (read-only for users)
CREATE POLICY "Users can view their own email logs" ON public.email_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Push notification logs policies (read-only for users)
CREATE POLICY "Users can view their own push notification logs" ON public.push_notification_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Scheduled notifications policies
CREATE POLICY "Users can view their own scheduled notifications" ON public.scheduled_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies for all tables
CREATE POLICY "Admins can manage all push tokens" ON public.push_tokens
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can manage all notification settings" ON public.user_notification_settings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can manage all email logs" ON public.email_logs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can manage all push notification logs" ON public.push_notification_logs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can manage all scheduled notifications" ON public.scheduled_notifications
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.push_tokens TO authenticated;
GRANT ALL ON public.user_notification_settings TO authenticated;
GRANT ALL ON public.email_logs TO authenticated;
GRANT ALL ON public.push_notification_logs TO authenticated;
GRANT ALL ON public.scheduled_notifications TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.push_tokens IS 'Stores Expo push notification tokens for users';
COMMENT ON TABLE public.user_notification_settings IS 'User preferences for different types of notifications';
COMMENT ON TABLE public.email_logs IS 'Logs of all email notifications sent';
COMMENT ON TABLE public.push_notification_logs IS 'Logs of all push notifications sent';
COMMENT ON TABLE public.scheduled_notifications IS 'Future notifications to be sent at specific times';

-- Insert default notification settings for existing users
INSERT INTO public.user_notification_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

PRINT 'Notification system schema created successfully!';
