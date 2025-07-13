import { supabase } from './userManagementService';

export interface EmailNotification {
  id?: string;
  user_id: string;
  email: string;
  template_type: 'booking_confirmation' | 'booking_approved' | 'booking_rejected' | 'booking_cancelled' | 'booking_reminder' | 'password_reset';
  booking_id?: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  created_at?: string;
}

export interface EmailData {
  to: string;
  name?: string;
  bookingId?: string;
  hallName?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  reason?: string;
  purpose?: string;
  adminName?: string;
}

export interface SendEmailRequest {
  template: EmailNotification['template_type'];
  emailData: EmailData;
}

class EmailService {
  private readonly VERCEL_EMAIL_API_URL = 'https://seminarhall-ivory.vercel.app/api/send-email';
  private readonly LOCAL_EMAIL_API_URL = 'http://192.168.196.170:3000/api/send-email';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  /**
   * Get the appropriate API URL (Vercel for now, local for future development)
   */
  private getEmailApiUrl(): string {
    // For now, always use Vercel since local network setup can be tricky
    // TODO: Fix local development setup later
    return this.VERCEL_EMAIL_API_URL;
  }

  /**
   * Send email using Vercel/Local API
   */
  async sendEmail(template: EmailNotification['template_type'], emailData: EmailData): Promise<boolean> {
    try {
      console.log(`📧 Sending ${template} email to ${emailData.to}`);

      // Prepare email data for API
      const emailPayload = {
        toEmail: emailData.to,
        subject: this.getEmailSubject(template),
        emailType: template,
        data: {
          userName: emailData.name || 'User',
          bookingId: emailData.bookingId,
          hallName: emailData.hallName,
          bookingDate: emailData.bookingDate,
          startTime: emailData.startTime,
          endTime: emailData.endTime,
          purpose: emailData.purpose,
          rejectionReason: emailData.reason,
          adminMessage: emailData.reason,
          timeUntil: this.calculateTimeUntil(emailData.bookingDate, emailData.startTime),
        }
      };

      const apiUrl = this.getEmailApiUrl();
      console.log(`📤 Using email API: ${apiUrl}`);

      // Call the Email API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Email API error:', errorText);
        throw new Error(`Email service error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.error('❌ Email sending failed:', result);
        throw new Error(result.error || 'Failed to send email');
      }

      console.log('✅ Email sent successfully:', result.message);
      return true;
    } catch (error) {
      console.error('❌ Error in sendEmail:', error);
      return false; // Return false instead of throwing to prevent app crashes
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    userEmail: string,
    userName: string,
    bookingData: {
      id: string;
      hallName: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      purpose: string;
    }
  ): Promise<boolean> {
    try {
      const emailData: EmailData = {
        to: userEmail,
        name: userName,
        bookingId: bookingData.id,
        hallName: bookingData.hallName,
        bookingDate: this.formatDateForEmail(bookingData.bookingDate),
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        purpose: bookingData.purpose,
      };

      return await this.sendEmail('booking_confirmation', emailData);
    } catch (error) {
      console.error('❌ Error sending booking confirmation:', error);
      return false;
    }
  }

  /**
   * Send booking approval email
   */
  async sendBookingApproval(
    userEmail: string,
    userName: string,
    bookingData: {
      id: string;
      hallName: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      purpose: string;
    },
    adminName?: string
  ): Promise<boolean> {
    try {
      const emailData: EmailData = {
        to: userEmail,
        name: userName,
        bookingId: bookingData.id,
        hallName: bookingData.hallName,
        bookingDate: this.formatDateForEmail(bookingData.bookingDate),
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        purpose: bookingData.purpose,
        adminName: adminName,
      };

      return await this.sendEmail('booking_approved', emailData);
    } catch (error) {
      console.error('❌ Error sending booking approval:', error);
      return false;
    }
  }

  /**
   * Send booking rejection email
   */
  async sendBookingRejection(
    userEmail: string,
    userName: string,
    bookingData: {
      id: string;
      hallName: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      purpose: string;
    },
    reason?: string
  ): Promise<boolean> {
    try {
      const emailData: EmailData = {
        to: userEmail,
        name: userName,
        bookingId: bookingData.id,
        hallName: bookingData.hallName,
        bookingDate: this.formatDateForEmail(bookingData.bookingDate),
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        purpose: bookingData.purpose,
        reason: reason,
      };

      return await this.sendEmail('booking_rejected', emailData);
    } catch (error) {
      console.error('❌ Error sending booking rejection:', error);
      return false;
    }
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(
    userEmail: string,
    userName: string,
    bookingData: {
      id: string;
      hallName: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      purpose: string;
    },
    reason?: string
  ): Promise<boolean> {
    try {
      const emailData: EmailData = {
        to: userEmail,
        name: userName,
        bookingId: bookingData.id,
        hallName: bookingData.hallName,
        bookingDate: this.formatDateForEmail(bookingData.bookingDate),
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        purpose: bookingData.purpose,
        reason: reason,
      };

      return await this.sendEmail('booking_cancelled', emailData);
    } catch (error) {
      console.error('❌ Error sending booking cancellation:', error);
      return false;
    }
  }

  /**
   * Send booking reminder email (for tomorrow's bookings)
   */
  async sendBookingReminder(
    userEmail: string,
    userName: string,
    bookingData: {
      id: string;
      hallName: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      purpose: string;
    }
  ): Promise<boolean> {
    try {
      const emailData: EmailData = {
        to: userEmail,
        name: userName,
        bookingId: bookingData.id,
        hallName: bookingData.hallName,
        bookingDate: this.formatDateForEmail(bookingData.bookingDate),
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        purpose: bookingData.purpose,
      };

      return await this.sendEmail('booking_reminder', emailData);
    } catch (error) {
      console.error('❌ Error sending booking reminder:', error);
      return false;
    }
  }

  /**
   * Send bulk booking reminders for tomorrow's bookings
   */
  async sendTomorrowBookingReminders(): Promise<{ sent: number; failed: number }> {
    try {
      console.log('📧 Starting bulk reminder emails for tomorrow\'s bookings...');

      // Calculate tomorrow's date in DDMMYYYY format
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = this.formatDateForDatabase(tomorrow);

      console.log(`📅 Looking for bookings on: ${tomorrowString}`);

      // Get all approved bookings for tomorrow
      const { data: tomorrowBookings, error } = await supabase
        .from('booking_details')
        .select('*')
        .eq('booking_date', tomorrowString)
        .eq('status', 'approved');

      if (error) {
        console.error('❌ Error fetching tomorrow\'s bookings:', error);
        throw error;
      }

      if (!tomorrowBookings || tomorrowBookings.length === 0) {
        console.log('📭 No bookings found for tomorrow');
        return { sent: 0, failed: 0 };
      }

      console.log(`📧 Found ${tomorrowBookings.length} bookings for tomorrow`);

      let sentCount = 0;
      let failedCount = 0;

      // Send reminder emails
      for (const booking of tomorrowBookings) {
        try {
          const success = await this.sendBookingReminder(
            booking.user_email,
            booking.user_name,
            {
              id: booking.id,
              hallName: booking.hall_name,
              bookingDate: booking.booking_date,
              startTime: booking.start_time,
              endTime: booking.end_time,
              purpose: booking.purpose,
            }
          );

          if (success) {
            sentCount++;
            console.log(`✅ Reminder sent to ${booking.user_email} for booking ${booking.id}`);
          } else {
            failedCount++;
            console.log(`❌ Failed to send reminder to ${booking.user_email} for booking ${booking.id}`);
          }

          // Add small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          failedCount++;
          console.error(`❌ Error sending reminder for booking ${booking.id}:`, error);
        }
      }

      console.log(`📧 Reminder email summary: ${sentCount} sent, ${failedCount} failed`);
      return { sent: sentCount, failed: failedCount };
    } catch (error) {
      console.error('❌ Error in sendTomorrowBookingReminders:', error);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Log email notification to database for tracking
   */
  async logEmailNotification(
    userId: string,
    email: string,
    templateType: EmailNotification['template_type'],
    bookingId?: string,
    status: 'sent' | 'failed' = 'sent',
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_notifications')
        .insert([
          {
            user_id: userId,
            email: email,
            template_type: templateType,
            booking_id: bookingId,
            status: status,
            sent_at: status === 'sent' ? new Date().toISOString() : null,
            error_message: errorMessage,
            retry_count: 0,
          },
        ]);

      if (error) {
        console.error('❌ Error logging email notification:', error);
      }
    } catch (error) {
      console.error('❌ Error in logEmailNotification:', error);
    }
  }

  /**
   * Get email subject based on template type
   */
  private getEmailSubject(template: EmailNotification['template_type']): string {
    switch (template) {
      case 'booking_confirmation':
        return 'Booking Confirmed - Amity Seminar Hall';
      case 'booking_approved':
        return 'Booking Approved - Amity Seminar Hall';
      case 'booking_rejected':
        return 'Booking Rejected - Amity Seminar Hall';
      case 'booking_cancelled':
        return 'Booking Cancelled - Amity Seminar Hall';
      case 'booking_reminder':
        return 'Booking Reminder - Amity Seminar Hall';
      case 'password_reset':
        return 'Password Reset - Amity Seminar Hall';
      default:
        return 'Notification - Amity Seminar Hall';
    }
  }

  /**
   * Calculate time until booking
   */
  private calculateTimeUntil(bookingDate?: string, startTime?: string): string {
    if (!bookingDate || !startTime) return 'soon';
    
    try {
      // Convert DDMMYYYY to Date
      const day = parseInt(bookingDate.substring(0, 2));
      const month = parseInt(bookingDate.substring(2, 4)) - 1; // Month is 0-indexed
      const year = parseInt(bookingDate.substring(4, 8));
      
      // Parse time (assuming HH:MM format)
      const [hours, minutes] = startTime.split(':').map(Number);
      
      const bookingDateTime = new Date(year, month, day, hours, minutes);
      const now = new Date();
      
      const timeDiff = bookingDateTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) return 'now';
      
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return days === 1 ? '1 day' : `${days} days`;
      } else if (hoursLeft > 0) {
        return hoursLeft === 1 ? '1 hour' : `${hoursLeft} hours`;
      } else {
        const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        return minutesLeft <= 1 ? 'a few minutes' : `${minutesLeft} minutes`;
      }
    } catch (error) {
      console.error('❌ Error calculating time until booking:', error);
      return 'soon';
    }
  }

  /**
   * Format date from DDMMYYYY to readable format
   */
  private formatDateForEmail(dateString: string): string {
    try {
      const day = dateString.substring(0, 2);
      const month = dateString.substring(2, 4);
      const year = dateString.substring(4, 8);
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('❌ Error formatting date for email:', error);
      return dateString;
    }
  }

  /**
   * Format date to DDMMYYYY format for database
   */
  private formatDateForDatabase(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${day}${month}${year}`;
  }

  /**
   * Get email statistics
   */
  async getEmailStats(): Promise<{
    totalSent: number;
    totalFailed: number;
    todaySent: number;
    recentFailures: EmailNotification[];
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get total counts
      const { data: totalSentData, error: totalSentError } = await supabase
        .from('email_notifications')
        .select('id')
        .eq('status', 'sent');

      const { data: totalFailedData, error: totalFailedError } = await supabase
        .from('email_notifications')
        .select('id')
        .eq('status', 'failed');

      const { data: todaySentData, error: todaySentError } = await supabase
        .from('email_notifications')
        .select('id')
        .eq('status', 'sent')
        .gte('sent_at', `${today}T00:00:00Z`)
        .lte('sent_at', `${today}T23:59:59Z`);

      const { data: recentFailuresData, error: recentFailuresError } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (totalSentError || totalFailedError || todaySentError || recentFailuresError) {
        console.error('❌ Error fetching email stats');
        return { totalSent: 0, totalFailed: 0, todaySent: 0, recentFailures: [] };
      }

      return {
        totalSent: totalSentData?.length || 0,
        totalFailed: totalFailedData?.length || 0,
        todaySent: todaySentData?.length || 0,
        recentFailures: recentFailuresData || [],
      };
    } catch (error) {
      console.error('❌ Error getting email stats:', error);
      return { totalSent: 0, totalFailed: 0, todaySent: 0, recentFailures: [] };
    }
  }
}

export const emailService = new EmailService();
