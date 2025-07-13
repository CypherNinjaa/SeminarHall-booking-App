-- Create email_notifications table for tracking email communications
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_booking_id ON email_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_template_type ON email_notifications(template_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);

-- Add RLS (Row Level Security)
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own email notifications
CREATE POLICY "Users can view their own email notifications" ON email_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to view all email notifications
CREATE POLICY "Admins can view all email notifications" ON email_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Allow service role to insert/update email notifications (for edge functions)
CREATE POLICY "Service role can manage email notifications" ON email_notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_notifications_updated_at
    BEFORE UPDATE ON email_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_email_notifications_updated_at();

-- Create function to get email statistics
CREATE OR REPLACE FUNCTION get_email_statistics(p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT JSON_BUILD_OBJECT(
        'total_sent', COALESCE(sent_count.count, 0),
        'total_failed', COALESCE(failed_count.count, 0),
        'today_sent', COALESCE(today_count.count, 0),
        'pending_count', COALESCE(pending_count.count, 0),
        'most_used_template', COALESCE(popular_template.template_type, ''),
        'last_24h_sent', COALESCE(recent_count.count, 0)
    ) INTO result
    FROM (
        SELECT COUNT(*) as count 
        FROM email_notifications 
        WHERE status = 'sent' 
        AND (p_user_id IS NULL OR user_id = p_user_id)
    ) sent_count
    CROSS JOIN (
        SELECT COUNT(*) as count 
        FROM email_notifications 
        WHERE status = 'failed'
        AND (p_user_id IS NULL OR user_id = p_user_id)
    ) failed_count
    CROSS JOIN (
        SELECT COUNT(*) as count 
        FROM email_notifications 
        WHERE status = 'sent' 
        AND DATE(sent_at) = CURRENT_DATE
        AND (p_user_id IS NULL OR user_id = p_user_id)
    ) today_count
    CROSS JOIN (
        SELECT COUNT(*) as count 
        FROM email_notifications 
        WHERE status = 'pending'
        AND (p_user_id IS NULL OR user_id = p_user_id)
    ) pending_count
    CROSS JOIN (
        SELECT template_type
        FROM email_notifications 
        WHERE status = 'sent'
        AND (p_user_id IS NULL OR user_id = p_user_id)
        GROUP BY template_type 
        ORDER BY COUNT(*) DESC 
        LIMIT 1
    ) popular_template
    CROSS JOIN (
        SELECT COUNT(*) as count 
        FROM email_notifications 
        WHERE status = 'sent' 
        AND sent_at >= NOW() - INTERVAL '24 hours'
        AND (p_user_id IS NULL OR user_id = p_user_id)
    ) recent_count;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old email notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_email_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_notifications 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retry failed email notifications
CREATE OR REPLACE FUNCTION get_failed_emails_for_retry(max_retry_count INTEGER DEFAULT 3)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email VARCHAR(255),
    template_type VARCHAR(50),
    booking_id UUID,
    retry_count INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        en.id,
        en.user_id,
        en.email,
        en.template_type,
        en.booking_id,
        en.retry_count,
        en.error_message,
        en.created_at
    FROM email_notifications en
    WHERE en.status = 'failed'
    AND en.retry_count < max_retry_count
    AND en.created_at >= NOW() - INTERVAL '24 hours' -- Only retry recent failures
    ORDER BY en.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON email_notifications TO postgres, service_role;
GRANT SELECT ON email_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_statistics(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_email_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION get_failed_emails_for_retry(INTEGER) TO service_role;

-- Insert some sample email notification types documentation
COMMENT ON TABLE email_notifications IS 'Tracks all email communications sent to users for bookings and system notifications';
COMMENT ON COLUMN email_notifications.template_type IS 'Type of email template used: booking_confirmation, booking_approved, booking_rejected, booking_cancelled, booking_reminder, password_reset';
COMMENT ON COLUMN email_notifications.status IS 'Email delivery status: pending, sent, failed';
COMMENT ON COLUMN email_notifications.retry_count IS 'Number of times this email has been retried after failure';
COMMENT ON FUNCTION get_email_statistics(UUID) IS 'Get comprehensive email statistics, optionally filtered by user_id';
COMMENT ON FUNCTION cleanup_old_email_notifications() IS 'Remove email notifications older than 90 days to keep the table size manageable';
COMMENT ON FUNCTION get_failed_emails_for_retry(INTEGER) IS 'Get failed emails that can be retried (within 24 hours and under max retry count)';
