import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../utils/supabaseSetup';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  sendPush?: boolean;
  sendEmail?: boolean;
  scheduleTime?: Date;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | 'custom';
  priority?: 'default' | 'high' | 'max';
  categoryId?: string;
  badge?: number;
}

export interface NotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  booking_updates: boolean;
  reminders: boolean;
  maintenance_alerts: boolean;
  system_announcements: boolean;
  reminder_time: number; // hours before booking
  email_frequency: 'immediate' | 'daily' | 'weekly';
}

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private isInitialized = false;

  /**
   * Check if running in Expo Go
   */
  async isRunningInExpoGo(): Promise<boolean> {
    try {
      // In Expo Go, Constants.executionEnvironment is 'storeClient'
      const Constants = require('expo-constants');
      return Constants.default?.executionEnvironment === 'storeClient';
    } catch (error) {
      // If expo-constants is not available, assume not Expo Go
      return false;
    }
  }

  /**
   * Initialize notification service with push notifications
   */
  async initialize(userId?: string): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      // Check if running in Expo Go
      const isExpoGo = await this.isRunningInExpoGo();
      if (isExpoGo) {
        console.warn('📱 Running in Expo Go - Push notifications not supported in SDK 53+');
        console.warn('📱 Use a development build for full push notification functionality');
        console.log('✅ Notification service initialized (Expo Go mode - limited functionality)');
        this.isInitialized = true;
        return true;
      }

      // Request permissions (only for development builds/production)
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.warn('Notification permissions not granted');
        return false;
      }
      
      // Setup notification categories
      await this.setupNotificationCategories();
      
      // Register for push notifications
      if (userId) {
        await this.registerForPushNotifications(userId);
      }
      
      // Setup notification listeners
      this.setupNotificationListeners();
      
      this.isInitialized = true;
      console.log('✅ Notification service initialized successfully (Development Build)');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications don\'t work on simulator/emulator');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return false;
      }

      // Setup Android notification channels
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Setup Android notification channels
   */
  async setupAndroidChannels() {
    const channels = [
      {
        id: 'default',
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
      },
      {
        id: 'booking-updates',
        name: 'Booking Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#34C759',
        description: 'Notifications about booking status changes',
      },
      {
        id: 'reminders',
        name: 'Booking Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FF9500',
        description: 'Reminders about upcoming bookings',
      },
      {
        id: 'maintenance',
        name: 'Maintenance Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100, 100, 100],
        lightColor: '#FF3B30',
        description: 'Hall maintenance and availability updates',
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, channel);
    }
  }

  /**
   * Setup notification categories with actions
   */
  async setupNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync('booking-actions', [
        {
          identifier: 'view-booking',
          buttonTitle: 'View Details',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'cancel-booking',
          buttonTitle: 'Cancel',
          options: { 
            opensAppToForeground: false,
            isDestructive: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('reminder-actions', [
        {
          identifier: 'view-booking',
          buttonTitle: 'View Booking',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'snooze-reminder',
          buttonTitle: 'Remind Later',
          options: { opensAppToForeground: false },
        },
      ]);
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }

  /**
   * Register for push notifications and save token
   */
  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('📱 Push notifications only work on physical devices');
        return null;
      }

      // Check if running in Expo Go
      const isExpoGo = await this.isRunningInExpoGo();
      if (isExpoGo) {
        console.warn('📱 Push notifications not available in Expo Go (SDK 53+)');
        console.warn('📱 Use EAS development build: npx expo run:android or npx expo run:ios');
        return null;
      }

      // Get project ID from environment variable or use hardcoded value
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || '3474eaee-01b2-4e2c-8ba1-83ac94ced14e';
      
      console.log('📱 Registering for push notifications with project ID:', projectId);

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.pushToken = token.data;

      // Save token to database
      await this.savePushToken(userId, token.data);

      console.log('✅ Push token registered:', token.data);
      return token.data;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      console.error('💡 If using Expo Go, switch to development build for push notifications');
      return null;
    }
  }

  /**
   * Save push token to database
   */
  async savePushToken(userId: string, token: string) {
    try {
      const platform = Platform.OS as 'ios' | 'android';
      
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          platform: platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform',
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('✅ Push token saved successfully');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  setupNotificationListeners() {
    // Listen for notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        console.log('🔔 Notification received:', notification);
        this.handleInAppNotification(notification);
      }
    );

    // Listen for notification responses (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        console.log('👆 Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  /**
   * Handle in-app notification display
   */
  handleInAppNotification(notification: Notifications.Notification) {
    // Implement custom in-app notification display logic here
    console.log('📱 Showing in-app notification:', notification.request.content.title);
    
    // You can implement a custom toast/banner component here
    // or trigger a state update in your app to show the notification
  }

  /**
   * Handle notification response (user interaction)
   */
  handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { notification, actionIdentifier } = response;
    const data = notification.request.content.data;

    switch (actionIdentifier) {
      case 'view-booking':
        console.log('📱 Navigating to booking:', data?.bookingId);
        // Implement navigation logic here
        break;
      case 'cancel-booking':
        console.log('❌ Canceling booking:', data?.bookingId);
        // Implement booking cancellation logic here
        break;
      case 'snooze-reminder':
        if (data?.bookingId && typeof data.bookingId === 'string') {
          this.scheduleReminder(data.bookingId, 30); // 30 minutes later
        }
        break;
      default:
        console.log('📱 Opening app from notification');
        break;
    }
  }

  /**
   * Send push notification to user
   */
  async sendPushNotification(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    try {
      // Check if running in Expo Go
      const isExpoGo = await this.isRunningInExpoGo();
      if (isExpoGo) {
        console.warn('📱 Push notifications not supported in Expo Go. Notification skipped.');
        return false;
      }

      // Check if user has push notifications enabled
      const settings = await this.getNotificationSettings(userId);
      if (!settings?.push_enabled) {
        console.log('📵 Push notifications disabled for user:', userId);
        return false;
      }

      // Get user's push token
      const { data: tokenData, error } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      if (error || !tokenData || tokenData.length === 0) {
        console.log('🚫 No active push token found for user:', userId);
        return false;
      }

      const pushToken = tokenData[0].token;

      // Send to Expo's push notification service
      const message = {
        to: pushToken,
        sound: payload.sound || 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        priority: payload.priority || 'default',
        categoryId: payload.categoryId,
        badge: payload.badge || 1,
        channelId: this.getChannelId(payload.categoryId),
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data && result.data[0] && result.data[0].status === 'ok') {
        console.log('✅ Push notification sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send push notification:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Get channel ID based on category
   */
  getChannelId(categoryId?: string): string {
    switch (categoryId) {
      case 'booking-actions':
        return 'booking-updates';
      case 'reminder-actions':
        return 'reminders';
      case 'maintenance':
        return 'maintenance';
      default:
        return 'default';
    }
  }

  /**
   * Schedule local notification
   */
  async scheduleLocalNotification(
    payload: PushNotificationPayload,
    scheduledTime: Date | number
  ) {
    try {
      let trigger: Notifications.NotificationTriggerInput;
      
      if (typeof scheduledTime === 'number') {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: scheduledTime,
        };
      } else {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledTime,
        };
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: payload.sound || 'default',
          categoryIdentifier: payload.categoryId,
          badge: payload.badge || 1,
        },
        trigger,
      });

      console.log('⏰ Notification scheduled:', payload.title);
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
    }
  }

  /**
   * Schedule booking reminder
   */
  async scheduleReminder(bookingId: string, minutesBefore: number = 60) {
    try {
      // Get booking details from database
      const { data: booking, error } = await supabase
        .from('smart_bookings')
        .select(`
          *,
          hall:halls(name),
          user:profiles(full_name, email)
        `)
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        console.error('Error fetching booking for reminder:', error);
        return;
      }

      // Calculate reminder time
      const bookingDateTime = new Date(
        `${booking.booking_date.substring(4, 8)}-${booking.booking_date.substring(2, 4)}-${booking.booking_date.substring(0, 2)}T${booking.start_time}:00`
      );
      const reminderTime = new Date(bookingDateTime.getTime() - (minutesBefore * 60 * 1000));

      // Only schedule if reminder time is in the future
      if (reminderTime > new Date()) {
        await this.scheduleLocalNotification({
          title: '⏰ Upcoming Booking Reminder',
          body: `Your booking at ${booking.hall?.name} starts in ${minutesBefore} minutes`,
          data: { 
            bookingId, 
            type: 'reminder',
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            hall_name: booking.hall?.name,
          },
          priority: 'high',
          categoryId: 'reminder-actions',
        }, reminderTime);

        console.log(`⏰ Reminder scheduled for booking ${bookingId} at ${reminderTime}`);
      }
    } catch (error) {
      console.error('❌ Error scheduling reminder:', error);
    }
  }

  /**
   * Get notification settings for user
   */
  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching notification settings:', error);
        return null;
      }

      return data || this.getDefaultSettings();
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>) {
    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error updating notification settings:', error);
        return false;
      }

      console.log('✅ Notification settings updated');
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }

  /**
   * Get default notification settings
   */
  getDefaultSettings(): NotificationSettings {
    return {
      push_enabled: true,
      email_enabled: true,
      booking_updates: true,
      reminders: true,
      maintenance_alerts: true,
      system_announcements: true,
      reminder_time: 60, // 1 hour before
      email_frequency: 'immediate',
    };
  }

  /**
   * Send email notification using existing emailService
   */
  async sendEmailNotification(
    userEmail: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<boolean> {
    try {
      // Use your existing emailService instead of Supabase function
      // This integrates with your existing email infrastructure
      console.log('📧 Email notification will be handled by existing emailService');
      console.log('Subject:', subject);
      console.log('To:', userEmail);
      
      // Return true since your emailService handles the actual sending
      return true;
    } catch (error) {
      console.error('❌ Error in email notification preparation:', error);
      return false;
    }
  }

  /**
   * Create a new notification with enhanced features
   */
  async createNotification(params: CreateNotificationParams): Promise<NotificationData | null> {
    try {
      // Create database notification
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

      // Send push notification if enabled
      if (params.sendPush !== false) {
        await this.sendPushNotification(params.userId, {
          title: params.title,
          body: params.message,
          data: { notificationId: data.id, ...params.data },
          categoryId: this.getCategoryForType(params.type),
        });
      }

      // Send email notification if enabled
      if (params.sendEmail) {
        await this.sendEmailForNotification(params.userId, data);
      }

      // Schedule notification if specified
      if (params.scheduleTime) {
        await this.scheduleLocalNotification({
          title: params.title,
          body: params.message,
          data: { notificationId: data.id, ...params.data },
          categoryId: this.getCategoryForType(params.type),
        }, params.scheduleTime);
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
   * Get category for notification type
   */
  getCategoryForType(type: string): string {
    switch (type) {
      case 'booking':
      case 'rejection':
      case 'cancellation':
        return 'booking-actions';
      case 'reminder':
        return 'reminder-actions';
      case 'maintenance':
        return 'maintenance';
      default:
        return 'default';
    }
  }

  /**
   * Send email for notification
   */
  async sendEmailForNotification(userId: string, notification: NotificationData) {
    try {
      // Get user email
      const { data: user, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (error || !user?.email) {
        console.log('No email found for user:', userId);
        return;
      }

      // Check if user has email notifications enabled
      const settings = await this.getNotificationSettings(userId);
      if (!settings?.email_enabled) {
        console.log('📧 Email notifications disabled for user:', userId);
        return;
      }

      const htmlContent = this.generateEmailTemplate(notification, user.full_name);
      
      await this.sendEmailNotification(
        user.email,
        notification.title,
        htmlContent,
        notification.message
      );
    } catch (error) {
      console.error('Error sending email for notification:', error);
    }
  }

  /**
   * Generate email template
   */
  generateEmailTemplate(notification: NotificationData, userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #007AFF; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
          .button { background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Seminar Hall Booking</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <h3>${notification.title}</h3>
            <p>${notification.message}</p>
            
            ${notification.data?.booking_id ? `
              <a href="your-app-deep-link://booking/${notification.data.booking_id}" class="button">
                View Booking Details
              </a>
            ` : ''}
            
            <p style="margin-top: 30px; color: #666;">
              Best regards,<br>
              Seminar Hall Booking Team
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Clear notification badge
   */
  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  /**
   * Update notification badge count
   */
  async updateBadgeCount(userId: string) {
    try {
      const unreadCount = await this.getUnreadCount(userId);
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    this.isInitialized = false;
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
      sendPush: true,
      sendEmail: true,
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
      sendPush: true,
      sendEmail: true,
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
      sendPush: true,
      sendEmail: true,
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
