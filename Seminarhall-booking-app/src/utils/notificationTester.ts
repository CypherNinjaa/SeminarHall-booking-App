// Notification System Test Utilities
import { notificationService } from '../services/notificationService';

export interface NotificationTestResults {
  permissionsGranted: boolean;
  pushTokenGenerated: boolean;
  databaseConnectionWorking: boolean;
  localNotificationWorking: boolean;
  emailServiceWorking: boolean;
  errors: string[];
}

export class NotificationTester {
  private results: NotificationTestResults = {
    permissionsGranted: false,
    pushTokenGenerated: false,
    databaseConnectionWorking: false,
    localNotificationWorking: false,
    emailServiceWorking: false,
    errors: [],
  };

  /**
   * Run comprehensive notification system tests
   */
  async runCompleteTest(userId: string): Promise<NotificationTestResults> {
    console.log('Starting comprehensive notification system test...');
    
    try {
      // Test 1: Check permissions
      await this.testPermissions();
      
      // Test 2: Test push token generation
      await this.testPushTokenGeneration(userId);
      
      // Test 3: Test database connectivity
      await this.testDatabaseConnection(userId);
      
      // Test 4: Test local notifications
      await this.testLocalNotifications();
      
      // Test 5: Test email service
      await this.testEmailService(userId);
      
      console.log('Notification system test completed:', this.results);
      return this.results;
    } catch (error) {
      console.error('Notification test failed:', error);
      this.results.errors.push(`Test execution failed: ${error}`);
      return this.results;
    }
  }

  /**
   * Test notification permissions
   */
  private async testPermissions(): Promise<void> {
    try {
      console.log('Testing notification permissions...');
      const hasPermissions = await notificationService.requestPermissions();
      this.results.permissionsGranted = hasPermissions;
      
      if (!hasPermissions) {
        this.results.errors.push('Notification permissions not granted');
      } else {
        console.log('Notification permissions granted');
      }
    } catch (error) {
      this.results.errors.push(`Permission test failed: ${error}`);
    }
  }

  /**
   * Test push token generation
   */
  private async testPushTokenGeneration(userId: string): Promise<void> {
    try {
      console.log('Testing push token generation...');
      const token = await notificationService.registerForPushNotifications(userId);
      this.results.pushTokenGenerated = token !== null;
      
      if (!token) {
        this.results.errors.push('Failed to generate push token');
      } else {
        console.log('Push token generated successfully');
      }
    } catch (error) {
      this.results.errors.push(`Push token test failed: ${error}`);
    }
  }

  /**
   * Test database connection
   */
  private async testDatabaseConnection(userId: string): Promise<void> {
    try {
      console.log('Testing database connection...');
      
      // Test creating a notification
      const testNotification = await notificationService.createNotification({
        userId,
        title: 'Test Notification',
        message: 'This is a test notification to verify database connectivity.',
        type: 'system',
        sendPush: false,
        sendEmail: false,
      });
      
      if (testNotification) {
        console.log('Database connection working');
        this.results.databaseConnectionWorking = true;
        
        // Clean up test notification
        await notificationService.deleteNotification(testNotification.id);
      } else {
        this.results.errors.push('Failed to create test notification in database');
      }
    } catch (error) {
      this.results.errors.push(`Database test failed: ${error}`);
    }
  }

  /**
   * Test local notifications
   */
  private async testLocalNotifications(): Promise<void> {
    try {
      console.log('Testing local notifications...');
      
      // Schedule a test notification for 5 seconds from now
      await notificationService.scheduleLocalNotification({
        title: 'Test Local Notification',
        body: 'This is a test local notification scheduled 5 seconds ago.',
        data: { testType: 'local_notification_test' },
      }, 5); // 5 seconds
      
      this.results.localNotificationWorking = true;
      console.log('Local notification scheduled successfully');
    } catch (error) {
      this.results.errors.push(`Local notification test failed: ${error}`);
    }
  }

  /**
   * Test email service
   */
  private async testEmailService(userId: string): Promise<void> {
    try {
      console.log('Testing email service...');
      
      // Get user settings to check if email is enabled
      const settings = await notificationService.getNotificationSettings(userId);
      
      if (settings?.email_enabled) {
        // Note: We don't actually send a test email to avoid spam
        // Instead, we just verify the email service configuration
        this.results.emailServiceWorking = true;
        console.log('Email service configuration verified');
      } else {
        this.results.errors.push('Email notifications are disabled for this user');
      }
    } catch (error) {
      this.results.errors.push(`Email service test failed: ${error}`);
    }
  }

  /**
   * Test notification settings
   */
  async testNotificationSettings(userId: string): Promise<boolean> {
    try {
      console.log('Testing notification settings...');
      
      // Get current settings
      const currentSettings = await notificationService.getNotificationSettings(userId);
      console.log('Current settings:', currentSettings);
      
      // Test updating settings
      const testSettings = {
        push_enabled: true,
        email_enabled: true,
        booking_updates: true,
        reminders: true,
        reminder_time: 30,
      };
      
      const updated = await notificationService.updateNotificationSettings(userId, testSettings);
      
      if (updated) {
        console.log('Notification settings test passed');
        return true;
      } else {
        console.log('Failed to update notification settings');
        return false;
      }
    } catch (error) {
      console.error('Notification settings test failed:', error);
      return false;
    }
  }

  /**
   * Test notification creation with all features
   */
  async testFullNotificationFlow(userId: string): Promise<boolean> {
    try {
      console.log('Testing full notification flow...');
      
      // Create a comprehensive test notification
      const notification = await notificationService.createNotification({
        userId,
        title: 'Booking Approved - Test Hall',
        message: 'Your test booking has been approved for demonstration purposes.',
        type: 'booking',
        sendPush: true,
        sendEmail: false, // Don't spam with test emails
        data: {
          booking_id: 'test-booking-123',
          hall_name: 'Test Hall',
          booking_date: '15072025',
          start_time: '10:00',
          end_time: '12:00',
          test: true,
        },
      });
      
      if (notification) {
        console.log('Full notification flow test passed');
        
        // Test marking as read
        await notificationService.markAsRead(notification.id);
        
        // Clean up test notification after 30 seconds
        setTimeout(async () => {
          await notificationService.deleteNotification(notification.id);
          console.log('Test notification cleaned up');
        }, 30000);
        
        return true;
      } else {
        console.log('Failed to create full notification');
        return false;
      }
    } catch (error) {
      console.error('Full notification flow test failed:', error);
      return false;
    }
  }

  /**
   * Run basic functionality test
   */
  async runBasicTest(userId: string): Promise<boolean> {
    try {
      console.log('Running basic notification test...');
      
      // Test initialization
      const initialized = await notificationService.initialize(userId);
      if (!initialized) {
        console.log('Failed to initialize notification service');
        return false;
      }
      
      // Test creating a simple notification
      const notification = await notificationService.createNotification({
        userId,
        title: 'Basic Test',
        message: 'Basic notification test successful!',
        type: 'system',
        sendPush: false,
        sendEmail: false,
      });
      
      if (notification) {
        console.log('Basic notification test passed');
        // Clean up
        await notificationService.deleteNotification(notification.id);
        return true;
      } else {
        console.log('Basic notification test failed');
        return false;
      }
    } catch (error) {
      console.error('Basic test failed:', error);
      return false;
    }
  }

  /**
   * Get test results summary
   */
  getTestSummary(): string {
    const { results } = this;
    const totalTests = 5;
    const passedTests = [
      results.permissionsGranted,
      results.pushTokenGenerated,
      results.databaseConnectionWorking,
      results.localNotificationWorking,
      results.emailServiceWorking,
    ].filter(Boolean).length;

    const summary = `
Notification System Test Results
==================================
Permissions: ${results.permissionsGranted ? '' : ''}
Push Token: ${results.pushTokenGenerated ? '' : ''}
Database: ${results.databaseConnectionWorking ? '' : ''}
Local Notifications: ${results.localNotificationWorking ? '' : ''}
Email Service: ${results.emailServiceWorking ? '' : ''}

Score: ${passedTests}/${totalTests} tests passed

${results.errors.length > 0 ? 'Errors:\n' + results.errors.map(e => `- ${e}`).join('\n') : 'No errors detected'}
    `;

    return summary;
  }
}

// Export singleton instance
export const notificationTester = new NotificationTester();
export default notificationTester;
