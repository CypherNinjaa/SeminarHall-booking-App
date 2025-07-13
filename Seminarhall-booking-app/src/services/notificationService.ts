import { supabase } from '../utils/supabaseSetup';

export interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'reminder' | 'update' | 'system' | 'maintenance' | 'rejection' | 'cancellation';
  is_read: boolean;
  data?: any;
  created_at: string;
}

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationData['type'];
  data?: any;
}

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(params: CreateNotificationParams): Promise<NotificationData | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          data: params.data || null,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      console.log('✅ Notification created:', { 
        id: data.id, 
        title: params.title, 
        userId: params.userId 
      });

      return data;
    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }

  /**
   * Create booking rejection notification
   */
  async createBookingRejectionNotification(
    userId: string,
    bookingDetails: {
      id: string;
      hall_name: string;
      booking_date: string;
      start_time: string;
      end_time: string;
      purpose: string;
    },
    rejectionReason: string,
    adminName?: string
  ): Promise<NotificationData | null> {
    const title = `Booking Rejected - ${bookingDetails.hall_name}`;
    const message = `Your booking for ${bookingDetails.hall_name} on ${bookingDetails.booking_date} (${bookingDetails.start_time} - ${bookingDetails.end_time}) has been rejected.${rejectionReason ? `\n\nReason: ${rejectionReason}` : ''}${adminName ? `\n\nRejected by: ${adminName}` : ''}`;

    return await this.createNotification({
      userId,
      title,
      message,
      type: 'rejection',
      data: {
        booking_id: bookingDetails.id,
        hall_name: bookingDetails.hall_name,
        booking_date: bookingDetails.booking_date,
        start_time: bookingDetails.start_time,
        end_time: bookingDetails.end_time,
        purpose: bookingDetails.purpose,
        rejection_reason: rejectionReason,
        admin_name: adminName,
        action_type: 'booking_rejected',
      },
    });
  }

  /**
   * Create booking cancellation notification
   */
  async createBookingCancellationNotification(
    userId: string,
    bookingDetails: {
      id: string;
      hall_name: string;
      booking_date: string;
      start_time: string;
      end_time: string;
      purpose: string;
    },
    cancellationReason: string,
    adminName?: string
  ): Promise<NotificationData | null> {
    const title = `Booking Cancelled - ${bookingDetails.hall_name}`;
    const message = `Your booking for ${bookingDetails.hall_name} on ${bookingDetails.booking_date} (${bookingDetails.start_time} - ${bookingDetails.end_time}) has been cancelled.${cancellationReason ? `\n\nReason: ${cancellationReason}` : ''}${adminName ? `\n\nCancelled by: ${adminName}` : ''}`;

    return await this.createNotification({
      userId,
      title,
      message,
      type: 'cancellation',
      data: {
        booking_id: bookingDetails.id,
        hall_name: bookingDetails.hall_name,
        booking_date: bookingDetails.booking_date,
        start_time: bookingDetails.start_time,
        end_time: bookingDetails.end_time,
        purpose: bookingDetails.purpose,
        cancellation_reason: cancellationReason,
        admin_name: adminName,
        action_type: 'booking_cancelled',
      },
    });
  }

  /**
   * Create booking approval notification
   */
  async createBookingApprovalNotification(
    userId: string,
    bookingDetails: {
      id: string;
      hall_name: string;
      booking_date: string;
      start_time: string;
      end_time: string;
      purpose: string;
    },
    adminName?: string
  ): Promise<NotificationData | null> {
    const title = `Booking Approved - ${bookingDetails.hall_name}`;
    const message = `Your booking for ${bookingDetails.hall_name} on ${bookingDetails.booking_date} (${bookingDetails.start_time} - ${bookingDetails.end_time}) has been approved.${adminName ? `\n\nApproved by: ${adminName}` : ''}`;

    return await this.createNotification({
      userId,
      title,
      message,
      type: 'booking',
      data: {
        booking_id: bookingDetails.id,
        hall_name: bookingDetails.hall_name,
        booking_date: bookingDetails.booking_date,
        start_time: bookingDetails.start_time,
        end_time: bookingDetails.end_time,
        purpose: bookingDetails.purpose,
        admin_name: adminName,
        action_type: 'booking_approved',
      },
    });
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit = 50): Promise<NotificationData[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      console.log('📖 Notification marked as read:', notificationId);
      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return false;
      }

      console.log('📖 Multiple notifications marked as read:', notificationIds.length);
      return true;
    } catch (error) {
      console.error('Error in markMultipleAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      console.log('📖 All notifications marked as read for user:', userId);
      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      console.log('🗑️ Notification deleted:', notificationId);
      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  }

  /**
   * Delete old notifications (older than specified days)
   */
  async deleteOldNotifications(userId: string, olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Error deleting old notifications:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`🗑️ Deleted ${deletedCount} old notifications for user:`, userId);
      return deletedCount;
    } catch (error) {
      console.error('Error in deleteOldNotifications:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time notifications for a user
   */
  subscribeToUserNotifications(
    userId: string,
    callback: (notification: NotificationData) => void
  ) {
    return supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          callback(payload.new as NotificationData);
        }
      )
      .subscribe();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
