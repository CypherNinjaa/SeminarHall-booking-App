import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { corsHeaders } from '../_shared/cors.ts';

// Email template types
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailData {
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

interface SendEmailRequest {
  template: 'booking_confirmation' | 'booking_approved' | 'booking_rejected' | 'booking_cancelled' | 'booking_reminder' | 'password_reset';
  emailData: EmailData;
}

// Email templates
const getEmailTemplate = (template: string, data: EmailData): EmailTemplate => {
  const baseUrl = 'https://your-app-url.com'; // Replace with your actual app URL
  
  switch (template) {
    case 'booking_confirmation':
      return {
        subject: `📅 Booking Confirmation - ${data.hallName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #007AFF; margin: 0;">🏛️ Amity University Patna</h1>
                <h2 style="color: #333; margin: 10px 0;">Seminar Hall Booking Confirmation</h2>
              </div>
              
              <p style="font-size: 16px; color: #333;">Dear ${data.name || 'User'},</p>
              
              <p style="font-size: 16px; color: #333;">Your seminar hall booking request has been submitted successfully and is now under review.</p>
              
              <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #007AFF; margin-top: 0;">📋 Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Booking ID:</td>
                    <td style="padding: 8px 0; color: #333;">${data.bookingId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Hall:</td>
                    <td style="padding: 8px 0; color: #333;">${data.hallName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                    <td style="padding: 8px 0; color: #333;">${data.bookingDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Time:</td>
                    <td style="padding: 8px 0; color: #333;">${data.startTime} - ${data.endTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Purpose:</td>
                    <td style="padding: 8px 0; color: #333;">${data.purpose}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Status:</td>
                    <td style="padding: 8px 0; color: #FFC107; font-weight: bold;">⏳ Pending Approval</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #FFC107; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⏰ What's Next?</strong><br>
                  Your booking is now under review by our admin team. You'll receive an email notification once your booking is approved or if any changes are needed.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}" style="background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">📱 Open App</a>
              </div>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                <p>Best regards,<br><strong>Amity University Patna</strong><br>Seminar Hall Booking Team</p>
                <p style="margin-top: 15px;">
                  Need help? Contact us at <a href="mailto:support@amitypatna.edu" style="color: #007AFF;">support@amitypatna.edu</a><br>
                  Developer: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
Booking Confirmation - ${data.hallName}

Dear ${data.name || 'User'},

Your seminar hall booking request has been submitted successfully and is now under review.

Booking Details:
- Booking ID: ${data.bookingId}
- Hall: ${data.hallName}
- Date: ${data.bookingDate}
- Time: ${data.startTime} - ${data.endTime}
- Purpose: ${data.purpose}
- Status: Pending Approval

What's Next?
Your booking is now under review by our admin team. You'll receive an email notification once your booking is approved or if any changes are needed.

Best regards,
Amity University Patna
Seminar Hall Booking Team

Need help? Contact us at support@amitypatna.edu
Developer: vikashkelly@gmail.com
        `
      };

    case 'booking_approved':
      return {
        subject: `✅ Booking Approved - ${data.hallName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #28A745; margin: 0;">🎉 Booking Approved!</h1>
                <h2 style="color: #333; margin: 10px 0;">Your seminar hall is confirmed</h2>
              </div>
              
              <p style="font-size: 16px; color: #333;">Dear ${data.name || 'User'},</p>
              
              <p style="font-size: 16px; color: #333;">Great news! Your seminar hall booking has been approved by our admin team.</p>
              
              <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28A745;">
                <h3 style="color: #155724; margin-top: 0;">✅ Confirmed Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Booking ID:</td>
                    <td style="padding: 8px 0; color: #333;">${data.bookingId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Hall:</td>
                    <td style="padding: 8px 0; color: #333;">${data.hallName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                    <td style="padding: 8px 0; color: #333;">${data.bookingDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Time:</td>
                    <td style="padding: 8px 0; color: #333;">${data.startTime} - ${data.endTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Approved by:</td>
                    <td style="padding: 8px 0; color: #333;">${data.adminName || 'Admin Team'}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 20px 0;">
                <p style="margin: 0; color: #0c5460;">
                  <strong>📝 Important Reminders:</strong><br>
                  • Please arrive 15 minutes before your scheduled time<br>
                  • Ensure the hall is clean and organized after use<br>
                  • Report any technical issues immediately<br>
                  • Contact admin if you need to make any changes
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}" style="background-color: #28A745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">📱 View in App</a>
              </div>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                <p>Best regards,<br><strong>Amity University Patna</strong><br>Seminar Hall Booking Team</p>
                <p style="margin-top: 15px;">
                  Need help? Contact us at <a href="mailto:support@amitypatna.edu" style="color: #007AFF;">support@amitypatna.edu</a><br>
                  Developer: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
Booking Approved - ${data.hallName}

Dear ${data.name || 'User'},

Great news! Your seminar hall booking has been approved by our admin team.

Confirmed Booking Details:
- Booking ID: ${data.bookingId}
- Hall: ${data.hallName}
- Date: ${data.bookingDate}
- Time: ${data.startTime} - ${data.endTime}
- Approved by: ${data.adminName || 'Admin Team'}

Important Reminders:
• Please arrive 15 minutes before your scheduled time
• Ensure the hall is clean and organized after use
• Report any technical issues immediately
• Contact admin if you need to make any changes

Best regards,
Amity University Patna
Seminar Hall Booking Team

Need help? Contact us at support@amitypatna.edu
Developer: vikashkelly@gmail.com
        `
      };

    case 'booking_rejected':
      return {
        subject: `❌ Booking Request Update - ${data.hallName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #DC3545; margin: 0;">📋 Booking Update</h1>
                <h2 style="color: #333; margin: 10px 0;">Request requires attention</h2>
              </div>
              
              <p style="font-size: 16px; color: #333;">Dear ${data.name || 'User'},</p>
              
              <p style="font-size: 16px; color: #333;">We've reviewed your seminar hall booking request and need to discuss some details with you.</p>
              
              <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC3545;">
                <h3 style="color: #721c24; margin-top: 0;">📋 Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Booking ID:</td>
                    <td style="padding: 8px 0; color: #333;">${data.bookingId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Hall:</td>
                    <td style="padding: 8px 0; color: #333;">${data.hallName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                    <td style="padding: 8px 0; color: #333;">${data.bookingDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Time:</td>
                    <td style="padding: 8px 0; color: #333;">${data.startTime} - ${data.endTime}</td>
                  </tr>
                </table>
              </div>
              
              ${data.reason ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #FFC107; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>💬 Admin Notes:</strong><br>
                  ${data.reason}
                </p>
              </div>
              ` : ''}
              
              <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 20px 0;">
                <p style="margin: 0; color: #0c5460;">
                  <strong>🔄 Next Steps:</strong><br>
                  • Review the admin notes above<br>
                  • Contact our admin team for clarification<br>
                  • Submit a new booking request with updated details<br>
                  • Check alternative time slots in the app
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}" style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">📱 Open App</a>
                <a href="mailto:support@amitypatna.edu" style="background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">✉️ Contact Admin</a>
              </div>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                <p>Best regards,<br><strong>Amity University Patna</strong><br>Seminar Hall Booking Team</p>
                <p style="margin-top: 15px;">
                  Need help? Contact us at <a href="mailto:support@amitypatna.edu" style="color: #007AFF;">support@amitypatna.edu</a><br>
                  Developer: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
Booking Request Update - ${data.hallName}

Dear ${data.name || 'User'},

We've reviewed your seminar hall booking request and need to discuss some details with you.

Booking Details:
- Booking ID: ${data.bookingId}
- Hall: ${data.hallName}
- Date: ${data.bookingDate}
- Time: ${data.startTime} - ${data.endTime}

${data.reason ? `Admin Notes: ${data.reason}` : ''}

Next Steps:
• Review the admin notes above
• Contact our admin team for clarification
• Submit a new booking request with updated details
• Check alternative time slots in the app

Best regards,
Amity University Patna
Seminar Hall Booking Team

Need help? Contact us at support@amitypatna.edu
Developer: vikashkelly@gmail.com
        `
      };

    case 'booking_reminder':
      return {
        subject: `🔔 Reminder: Your booking tomorrow - ${data.hallName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #FFC107; margin: 0;">🔔 Booking Reminder</h1>
                <h2 style="color: #333; margin: 10px 0;">Don't forget about tomorrow!</h2>
              </div>
              
              <p style="font-size: 16px; color: #333;">Dear ${data.name || 'User'},</p>
              
              <p style="font-size: 16px; color: #333;">This is a friendly reminder about your confirmed seminar hall booking tomorrow.</p>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFC107;">
                <h3 style="color: #856404; margin-top: 0;">📅 Tomorrow's Booking</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Hall:</td>
                    <td style="padding: 8px 0; color: #333;">${data.hallName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                    <td style="padding: 8px 0; color: #333;">${data.bookingDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Time:</td>
                    <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.startTime} - ${data.endTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #666;">Purpose:</td>
                    <td style="padding: 8px 0; color: #333;">${data.purpose}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28A745; margin: 20px 0;">
                <p style="margin: 0; color: #155724;">
                  <strong>✅ Preparation Checklist:</strong><br>
                  • Arrive 15 minutes early for setup<br>
                  • Bring all necessary materials and equipment<br>
                  • Test any technical equipment beforehand<br>
                  • Notify attendees of any last-minute changes<br>
                  • Have contact information for technical support
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}" style="background-color: #FFC107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">📱 View Details</a>
              </div>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                <p>Best regards,<br><strong>Amity University Patna</strong><br>Seminar Hall Booking Team</p>
                <p style="margin-top: 15px;">
                  Need help? Contact us at <a href="mailto:support@amitypatna.edu" style="color: #007AFF;">support@amitypatna.edu</a><br>
                  Developer: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
Booking Reminder - ${data.hallName}

Dear ${data.name || 'User'},

This is a friendly reminder about your confirmed seminar hall booking tomorrow.

Tomorrow's Booking:
- Hall: ${data.hallName}
- Date: ${data.bookingDate}
- Time: ${data.startTime} - ${data.endTime}
- Purpose: ${data.purpose}

Preparation Checklist:
• Arrive 15 minutes early for setup
• Bring all necessary materials and equipment
• Test any technical equipment beforehand
• Notify attendees of any last-minute changes
• Have contact information for technical support

Best regards,
Amity University Patna
Seminar Hall Booking Team

Need help? Contact us at support@amitypatna.edu
Developer: vikashkelly@gmail.com
        `
      };

    default:
      return {
        subject: 'Notification from Seminar Hall Booking',
        html: '<p>You have a new notification.</p>',
        text: 'You have a new notification.'
      };
  }
};

// SMTP sending function
const sendEmail = async (to: string, subject: string, html: string, text: string) => {
  const smtp = {
    host: Deno.env.get('GMAIL_SMTP_HOST') || 'smtp.gmail.com',
    port: parseInt(Deno.env.get('GMAIL_SMTP_PORT') || '587'),
    secure: Deno.env.get('GMAIL_SMTP_SECURE') === 'true',
    auth: {
      user: Deno.env.get('GMAIL_SMTP_USER'),
      pass: Deno.env.get('GMAIL_SMTP_PASSWORD'),
    },
  };

  const fromName = Deno.env.get('GMAIL_FROM_NAME') || 'Amity Seminar Hall Booking';
  const fromEmail = Deno.env.get('GMAIL_FROM_EMAIL') || smtp.auth.user;

  // Using SMTP with fetch (for Edge Functions)
  try {
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': Deno.env.get('SMTP2GO_API_KEY') || '', // Alternative service
      },
      body: JSON.stringify({
        api_key: Deno.env.get('SMTP2GO_API_KEY'),
        to: [to],
        sender: `${fromName} <${fromEmail}>`,
        subject: subject,
        html_body: html,
        text_body: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMTP service responded with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Fallback: Use nodemailer-style SMTP (for demonstration)
    console.error('SMTP Error:', error);
    throw new Error('Failed to send email');
  }
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { template, emailData }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!template || !emailData || !emailData.to) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: template and emailData.to' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get email template
    const emailTemplate = getEmailTemplate(template, emailData);

    // Send email
    await sendEmail(
      emailData.to,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        template: template,
        recipient: emailData.to
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email service error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
