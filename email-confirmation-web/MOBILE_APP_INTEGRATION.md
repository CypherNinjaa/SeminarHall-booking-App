# Mobile App Integration Guide

## 📱 **React Native Integration**

### **1. API Service Setup**

Create an API service file in your React Native app:

```javascript
// services/emailService.js
const API_BASE_URL = 'https://seminarhall-ivory.vercel.app/api';

export const EmailService = {
  // Send booking confirmation email
  sendBookingConfirmation: async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: bookingData.userEmail,
          subject: `Booking Confirmation - ${bookingData.hallName}`,
          emailType: 'booking_confirmation',
          data: {
            userName: bookingData.userName,
            hallName: bookingData.hallName,
            bookingDate: bookingData.bookingDate,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            purpose: bookingData.purpose,
            bookingId: bookingData.bookingId,
          }
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  },

  // Send booking approval email
  sendBookingApproval: async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: bookingData.userEmail,
          subject: `Booking Approved - ${bookingData.hallName}`,
          emailType: 'booking_approved',
          data: {
            userName: bookingData.userName,
            hallName: bookingData.hallName,
            bookingDate: bookingData.bookingDate,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            purpose: bookingData.purpose,
            bookingId: bookingData.bookingId,
            adminMessage: bookingData.adminMessage || 'Your booking has been approved.',
          }
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  },

  // Send booking rejection email
  sendBookingRejection: async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: bookingData.userEmail,
          subject: `Booking Rejected - ${bookingData.hallName}`,
          emailType: 'booking_rejected',
          data: {
            userName: bookingData.userName,
            hallName: bookingData.hallName,
            bookingDate: bookingData.bookingDate,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            purpose: bookingData.purpose,
            bookingId: bookingData.bookingId,
            rejectionReason: bookingData.rejectionReason || 'No specific reason provided.',
          }
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  },

  // Send booking cancellation email
  sendBookingCancellation: async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: bookingData.userEmail,
          subject: `Booking Cancelled - ${bookingData.hallName}`,
          emailType: 'booking_cancelled',
          data: {
            userName: bookingData.userName,
            hallName: bookingData.hallName,
            bookingDate: bookingData.bookingDate,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            bookingId: bookingData.bookingId,
          }
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  },

  // Send booking reminder email
  sendBookingReminder: async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: bookingData.userEmail,
          subject: `Booking Reminder - ${bookingData.hallName}`,
          emailType: 'booking_reminder',
          data: {
            userName: bookingData.userName,
            hallName: bookingData.hallName,
            bookingDate: bookingData.bookingDate,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            purpose: bookingData.purpose,
            bookingId: bookingData.bookingId,
            timeUntil: bookingData.timeUntil, // e.g., "2 hours"
          }
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  },
};
```

### **2. Usage in Your Booking Components**

#### **After Booking Creation:**
```javascript
// components/BookingConfirmation.js
import { EmailService } from '../services/emailService';

const handleBookingSubmit = async (bookingData) => {
  try {
    // 1. Save booking to your database
    const savedBooking = await saveBookingToDatabase(bookingData);
    
    // 2. Send confirmation email
    const emailResult = await EmailService.sendBookingConfirmation({
      userEmail: bookingData.userEmail,
      userName: bookingData.userName,
      hallName: bookingData.hallName,
      bookingDate: bookingData.bookingDate,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      purpose: bookingData.purpose,
      bookingId: savedBooking.id,
    });

    if (emailResult.success) {
      Alert.alert('Success', 'Booking confirmed! Check your email for details.');
    } else {
      Alert.alert('Booking Saved', 'Booking saved but email notification failed.');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to process booking.');
    console.error('Booking error:', error);
  }
};
```

#### **Admin Approval Flow:**
```javascript
// components/AdminBookingManagement.js
import { EmailService } from '../services/emailService';

const handleBookingApproval = async (bookingId, adminMessage) => {
  try {
    // 1. Update booking status in database
    await updateBookingStatus(bookingId, 'approved');
    
    // 2. Get booking details
    const booking = await getBookingById(bookingId);
    
    // 3. Send approval email
    const emailResult = await EmailService.sendBookingApproval({
      userEmail: booking.userEmail,
      userName: booking.userName,
      hallName: booking.hallName,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      purpose: booking.purpose,
      bookingId: booking.id,
      adminMessage: adminMessage,
    });

    if (emailResult.success) {
      Alert.alert('Success', 'Booking approved and user notified.');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to approve booking.');
    console.error('Approval error:', error);
  }
};

const handleBookingRejection = async (bookingId, rejectionReason) => {
  try {
    // 1. Update booking status in database
    await updateBookingStatus(bookingId, 'rejected');
    
    // 2. Get booking details
    const booking = await getBookingById(bookingId);
    
    // 3. Send rejection email
    const emailResult = await EmailService.sendBookingRejection({
      userEmail: booking.userEmail,
      userName: booking.userName,
      hallName: booking.hallName,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      purpose: booking.purpose,
      bookingId: booking.id,
      rejectionReason: rejectionReason,
    });

    if (emailResult.success) {
      Alert.alert('Success', 'Booking rejected and user notified.');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to reject booking.');
    console.error('Rejection error:', error);
  }
};
```

#### **Booking Cancellation:**
```javascript
// components/MyBookings.js
import { EmailService } from '../services/emailService';

const handleBookingCancellation = async (bookingId) => {
  Alert.alert(
    'Cancel Booking',
    'Are you sure you want to cancel this booking?',
    [
      { text: 'No', style: 'cancel' },
      { 
        text: 'Yes', 
        style: 'destructive',
        onPress: async () => {
          try {
            // 1. Update booking status
            await updateBookingStatus(bookingId, 'cancelled');
            
            // 2. Get booking details
            const booking = await getBookingById(bookingId);
            
            // 3. Send cancellation email
            const emailResult = await EmailService.sendBookingCancellation({
              userEmail: booking.userEmail,
              userName: booking.userName,
              hallName: booking.hallName,
              bookingDate: booking.bookingDate,
              startTime: booking.startTime,
              endTime: booking.endTime,
              bookingId: booking.id,
            });

            if (emailResult.success) {
              Alert.alert('Success', 'Booking cancelled. Confirmation email sent.');
            }
            
            // Refresh bookings list
            refreshBookings();
          } catch (error) {
            Alert.alert('Error', 'Failed to cancel booking.');
            console.error('Cancellation error:', error);
          }
        }
      }
    ]
  );
};
```

### **3. Automated Reminder System**

Set up a background task or cron job to send reminders:

```javascript
// utils/reminderService.js
import { EmailService } from '../services/emailService';

export const sendBookingReminders = async () => {
  try {
    // Get bookings for tomorrow
    const upcomingBookings = await getUpcomingBookings();
    
    for (const booking of upcomingBookings) {
      const timeUntil = calculateTimeUntil(booking.bookingDate, booking.startTime);
      
      await EmailService.sendBookingReminder({
        userEmail: booking.userEmail,
        userName: booking.userName,
        hallName: booking.hallName,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        purpose: booking.purpose,
        bookingId: booking.id,
        timeUntil: timeUntil,
      });
    }
  } catch (error) {
    console.error('Reminder sending error:', error);
  }
};

const calculateTimeUntil = (bookingDate, startTime) => {
  const now = new Date();
  const bookingDateTime = new Date(`${bookingDate} ${startTime}`);
  const diffInHours = Math.ceil((bookingDateTime - now) / (1000 * 60 * 60));
  
  if (diffInHours < 24) {
    return `${diffInHours} hours`;
  } else {
    const days = Math.ceil(diffInHours / 24);
    return `${days} days`;
  }
};
```

### **4. Error Handling and Retry Logic**

```javascript
// utils/emailUtils.js
export const sendEmailWithRetry = async (emailFunction, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await emailFunction();
      return result;
    } catch (error) {
      console.log(`Email attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Usage
const sendBookingEmail = async (bookingData) => {
  try {
    const result = await sendEmailWithRetry(
      () => EmailService.sendBookingConfirmation(bookingData),
      3
    );
    return result;
  } catch (error) {
    console.error('Failed to send email after 3 attempts:', error);
    // Handle email failure (maybe save to queue for later retry)
    return { success: false, error: error.message };
  }
};
```

### **5. Configuration**

Create a config file for your email settings:

```javascript
// config/emailConfig.js
export const EMAIL_CONFIG = {
  API_BASE_URL: 'https://seminarhall-ivory.vercel.app/api',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  REMINDER_HOURS_BEFORE: 24,
};
```

## 📋 **Integration Checklist**

- [ ] Create `services/emailService.js` in your React Native app
- [ ] Import and use `EmailService` in booking components
- [ ] Set up error handling and retry logic
- [ ] Test all email types (confirmation, approval, rejection, cancellation, reminder)
- [ ] Implement automated reminder system
- [ ] Add proper error messages and user feedback
- [ ] Test with different email providers
- [ ] Set up monitoring for email delivery

This integration will give you a complete email notification system for your seminar hall booking app!
