// Test utility to verify automatic booking completion
import { SmartBooking } from '../services/smartBookingService';

export const createTestBooking = (
  endTimeMinutesAgo: number = 60
): SmartBooking => {
  const now = new Date();
  const endTime = new Date(now.getTime() - endTimeMinutesAgo * 60 * 1000);
  
  const dateStr = endTime.toLocaleDateString('en-GB')
    .split('/')
    .reverse()
    .join(''); // Convert to DDMMYYYY
  
  const endTimeStr = endTime.toTimeString().substring(0, 5); // HH:MM format
  
  return {
    id: 'test-booking-' + Date.now(),
    user_id: 'test-user',
    hall_id: 'test-hall',
    hall_name: 'Test Conference Room',
    user_name: 'Test User',
    user_email: 'test@example.com',
    booking_date: dateStr,
    start_time: '09:00',
    end_time: endTimeStr,
    duration_minutes: 120,
    purpose: 'Test Meeting',
    description: 'Automated test booking',
    attendees_count: 5,
    equipment_needed: [],
    special_requirements: '',
    status: 'approved',
    priority: 'medium',
    auto_approved: false,
    buffer_start: '08:30',
    buffer_end: endTimeStr,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as SmartBooking;
};

export const testBookingCompletion = () => {
  console.log('🧪 Testing automatic booking completion...');
  
  const expiredBooking = createTestBooking(60); // Ended 1 hour ago
  const activeBooking = createTestBooking(-60); // Will end in 1 hour
  
  console.log('📅 Expired booking:', {
    date: expiredBooking.booking_date,
    endTime: expiredBooking.end_time,
    status: expiredBooking.status
  });
  
  console.log('📅 Active booking:', {
    date: activeBooking.booking_date,
    endTime: activeBooking.end_time,
    status: activeBooking.status
  });
  
  // This would be called by the service
  // const expiredShouldComplete = smartBookingService.isBookingCompleted(expiredBooking);
  // const activeShouldNotComplete = smartBookingService.isBookingCompleted(activeBooking);
  
  console.log('✅ Test setup complete');
};
