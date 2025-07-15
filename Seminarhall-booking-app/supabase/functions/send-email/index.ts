// Email Service Supabase Edge Function
// @deno-types="./types.d.ts"

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  templateId?: string
  templateData?: Record<string, any>
}

interface EmailResult {
  success: boolean
  message: string
  messageId?: string
  response?: any
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const { to, subject, html, text, templateId, templateData }: EmailRequest = await req.json()

    if (!to || !subject || (!html && !templateId)) {
      throw new Error('Missing required email parameters')
    }

    // Email service configuration
    const emailService = Deno.env.get('EMAIL_SERVICE') || 'resend' // default to Resend
    
    let emailContent = html
    
    // If using template, generate HTML content
    if (templateId && templateData) {
      emailContent = generateEmailFromTemplate(templateId, templateData)
    }

    let result
    
    switch (emailService.toLowerCase()) {
      case 'resend':
        result = await sendWithResend(to, subject, emailContent, text)
        break
      case 'sendgrid':
        result = await sendWithSendGrid(to, subject, emailContent, text)
        break
      case 'nodemailer':
        result = await sendWithNodemailer(to, subject, emailContent, text)
        break
      default:
        throw new Error(`Unsupported email service: ${emailService}`)
    }

    // Log the email to database
    await supabaseClient
      .from('email_logs')
      .insert({
        user_id: user.id,
        email_address: to,
        subject: subject,
        status: result.success ? 'sent' : 'failed',
        provider_response: result.response,
        sent_at: result.success ? new Date().toISOString() : null,
      })

    return new Response(
      JSON.stringify({ 
        success: result.success, 
        message: result.message,
        messageId: 'messageId' in result ? result.messageId : null 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400,
      }
    )

  } catch (error) {
    console.error('Email sending error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// Resend Email Service
async function sendWithResend(to: string, subject: string, html: string, text?: string): Promise<EmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    throw new Error('Resend API key not configured')
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') || 'noreply@yourdomain.com',
        to: [to],
        subject: subject,
        html: html,
        text: text,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      return {
        success: true,
        message: 'Email sent successfully',
        messageId: data.id,
        response: data,
      }
    } else {
      return {
        success: false,
        message: data.message || 'Failed to send email',
        response: data,
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      success: false,
      message: errorMessage,
      response: { error: errorMessage },
    }
  }
}

// SendGrid Email Service
async function sendWithSendGrid(to: string, subject: string, html: string, text?: string): Promise<EmailResult> {
  const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
  if (!sendGridApiKey) {
    throw new Error('SendGrid API key not configured')
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
        }],
        from: {
          email: Deno.env.get('FROM_EMAIL') || 'noreply@yourdomain.com',
          name: 'Seminar Hall Booking',
        },
        subject: subject,
        content: [
          {
            type: 'text/html',
            value: html,
          },
          ...(text ? [{
            type: 'text/plain',
            value: text,
          }] : []),
        ],
      }),
    })

    if (response.ok) {
      return {
        success: true,
        message: 'Email sent successfully',
        messageId: response.headers.get('x-message-id') || undefined,
        response: { status: response.status },
      }
    } else {
      const errorData = await response.json()
      return {
        success: false,
        message: errorData.errors?.[0]?.message || 'Failed to send email',
        response: errorData,
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      success: false,
      message: errorMessage,
      response: { error: errorMessage },
    }
  }
}

// Nodemailer Email Service (for SMTP)
async function sendWithNodemailer(to: string, subject: string, html: string, text?: string) {
  // This would require a separate email service or SMTP configuration
  // For now, return an error
  return {
    success: false,
    message: 'Nodemailer service not implemented yet',
    response: { error: 'Service not available' },
  }
}

// Email template generator
function generateEmailFromTemplate(templateId: string, data: Record<string, any>): string {
  const templates = {
    'booking-approved': `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Approved</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background-color: #34C759; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .booking-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .button { background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          .success-icon { font-size: 48px; color: #34C759; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Booking Approved!</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <h2>Hello ${data.userName || 'User'},</h2>
            <p>Great news! Your seminar hall booking has been approved.</p>
            
            <div class="booking-details">
              <h3>📅 Booking Details</h3>
              <p><strong>Hall:</strong> ${data.hallName}</p>
              <p><strong>Date:</strong> ${data.bookingDate}</p>
              <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>Purpose:</strong> ${data.purpose}</p>
              <p><strong>Attendees:</strong> ${data.attendees}</p>
              ${data.adminName ? `<p><strong>Approved by:</strong> ${data.adminName}</p>` : ''}
            </div>
            
            <p>Please make sure to:</p>
            <ul>
              <li>Arrive on time for your booking</li>
              <li>Keep the hall clean and organized</li>
              <li>Report any issues to the administration</li>
              <li>Cancel if you no longer need the booking</li>
            </ul>
            
            <a href="${data.deepLink || '#'}" class="button">View Booking Details</a>
            
            <p>If you have any questions, please contact the administration.</p>
            
            <p style="margin-top: 30px; color: #666;">
              Best regards,<br>
              Seminar Hall Booking Team
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2025 Seminar Hall Booking System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    'booking-rejected': `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Rejected</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background-color: #FF3B30; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .booking-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .rejection-reason { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .button { background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          .warning-icon { font-size: 48px; color: #FF3B30; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Rejected</h1>
          </div>
          <div class="content">
            <div class="warning-icon">❌</div>
            <h2>Hello ${data.userName || 'User'},</h2>
            <p>We regret to inform you that your seminar hall booking has been rejected.</p>
            
            <div class="booking-details">
              <h3>📅 Booking Details</h3>
              <p><strong>Hall:</strong> ${data.hallName}</p>
              <p><strong>Date:</strong> ${data.bookingDate}</p>
              <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>Purpose:</strong> ${data.purpose}</p>
              ${data.adminName ? `<p><strong>Rejected by:</strong> ${data.adminName}</p>` : ''}
            </div>
            
            ${data.rejectionReason ? `
              <div class="rejection-reason">
                <h4>📝 Reason for Rejection:</h4>
                <p>${data.rejectionReason}</p>
              </div>
            ` : ''}
            
            <p>You can try booking a different time slot or hall. If you have any questions about the rejection, please contact the administration.</p>
            
            <a href="${data.deepLink || '#'}" class="button">Book Another Slot</a>
            
            <p style="margin-top: 30px; color: #666;">
              Best regards,<br>
              Seminar Hall Booking Team
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2025 Seminar Hall Booking System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    'booking-reminder': `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background-color: #FF9500; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .booking-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .button { background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          .reminder-icon { font-size: 48px; color: #FF9500; text-align: center; margin: 20px 0; }
          .urgent { background-color: #ffe6e6; border: 1px solid #ff9999; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Booking Reminder</h1>
          </div>
          <div class="content">
            <div class="reminder-icon">🔔</div>
            <h2>Hello ${data.userName || 'User'},</h2>
            <p>This is a friendly reminder about your upcoming seminar hall booking.</p>
            
            <div class="urgent">
              <h3>🚨 Your booking starts in ${data.timeUntil || '1 hour'}!</h3>
            </div>
            
            <div class="booking-details">
              <h3>📅 Booking Details</h3>
              <p><strong>Hall:</strong> ${data.hallName}</p>
              <p><strong>Date:</strong> ${data.bookingDate}</p>
              <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>Purpose:</strong> ${data.purpose}</p>
              <p><strong>Attendees:</strong> ${data.attendees}</p>
            </div>
            
            <p><strong>Please remember to:</strong></p>
            <ul>
              <li>Arrive 10-15 minutes early</li>
              <li>Bring any necessary equipment</li>
              <li>Have your booking confirmation ready</li>
              <li>Contact administration if you're running late</li>
            </ul>
            
            <a href="${data.deepLink || '#'}" class="button">View Booking Details</a>
            
            <p style="margin-top: 30px; color: #666;">
              Best regards,<br>
              Seminar Hall Booking Team
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2025 Seminar Hall Booking System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  return templates[templateId as keyof typeof templates] || templates['booking-approved']
}

/* Deno.serve() */
