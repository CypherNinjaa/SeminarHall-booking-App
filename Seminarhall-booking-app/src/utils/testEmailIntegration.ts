import { emailService } from '../services/emailService';

/**
 * Test the email integration between mobile app and email API
 */
export const testEmailIntegration = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('🧪 Starting email integration test...');

    // Test data
    const testEmailData = {
      to: 'vikashkelly@gmail.com',
      name: 'Test User',
      bookingId: 'TEST-' + Date.now(),
      hallName: 'Conference Hall A',
      bookingDate: 'Monday, July 14, 2025',
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Email Integration Test',
    };

    // Test booking confirmation email
    console.log('📧 Testing booking confirmation email...');
    const result = await emailService.sendBookingConfirmation(
      testEmailData.to,
      testEmailData.name,
      {
        id: testEmailData.bookingId,
        hallName: testEmailData.hallName,
        bookingDate: '14072025', // DDMMYYYY format for internal processing
        startTime: testEmailData.startTime,
        endTime: testEmailData.endTime,
        purpose: testEmailData.purpose,
      }
    );

    if (result) {
      console.log('✅ Email integration test PASSED!');
      return {
        success: true,
        message: 'Email integration test successful! Check your email inbox.',
        details: testEmailData,
      };
    } else {
      console.log('❌ Email integration test FAILED!');
      return {
        success: false,
        message: 'Email sending failed - check logs for details',
        details: testEmailData,
      };
    }
  } catch (error) {
    console.error('❌ Email integration test ERROR:', error);
    return {
      success: false,
      message: `Email integration test error: ${error}`,
      details: { error: String(error) },
    };
  }
};

/**
 * Test all email templates
 */
export const testAllEmailTemplates = async (): Promise<{
  results: Array<{ template: string; success: boolean; message: string }>;
  overallSuccess: boolean;
}> => {
  const results = [];
  const testBookingData = {
    id: 'TEST-' + Date.now(),
    hallName: 'Conference Hall A',
    bookingDate: '14072025', // DDMMYYYY format
    startTime: '10:00',
    endTime: '12:00',
    purpose: 'Email Template Test',
  };

  // Test booking confirmation
  try {
    const confirmationResult = await emailService.sendBookingConfirmation(
      'vikashkelly@gmail.com',
      'Test User',
      testBookingData
    );
    results.push({
      template: 'booking_confirmation',
      success: confirmationResult,
      message: confirmationResult ? 'Success' : 'Failed',
    });
  } catch (error) {
    results.push({
      template: 'booking_confirmation',
      success: false,
      message: String(error),
    });
  }

  // Test booking approval
  try {
    const approvalResult = await emailService.sendBookingApproval(
      'vikashkelly@gmail.com',
      'Test User',
      testBookingData,
      'Admin Test'
    );
    results.push({
      template: 'booking_approved',
      success: approvalResult,
      message: approvalResult ? 'Success' : 'Failed',
    });
  } catch (error) {
    results.push({
      template: 'booking_approved',
      success: false,
      message: String(error),
    });
  }

  // Test booking rejection
  try {
    const rejectionResult = await emailService.sendBookingRejection(
      'vikashkelly@gmail.com',
      'Test User',
      testBookingData,
      'Test rejection reason'
    );
    results.push({
      template: 'booking_rejected',
      success: rejectionResult,
      message: rejectionResult ? 'Success' : 'Failed',
    });
  } catch (error) {
    results.push({
      template: 'booking_rejected',
      success: false,
      message: String(error),
    });
  }

  const overallSuccess = results.every(r => r.success);
  
  console.log('📊 Email template test results:', results);
  console.log(`🎯 Overall success: ${overallSuccess}`);

  return { results, overallSuccess };
};
