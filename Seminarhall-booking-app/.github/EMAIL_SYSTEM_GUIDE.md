# 📧 Email Confirmation System - Complete Implementation Guide

## 🎯 Overview

This document provides a complete implementation guide for the email confirmation system in the Amity University Seminar Hall Booking App for Expo React Native, covering both SendGrid and Gmail SMTP options.

---

## 📮 Email Service Options Comparison

### Available Email Services

| Feature              | **Gmail SMTP** (Recommended) | **SendGrid**                   |
| -------------------- | ---------------------------- | ------------------------------ |
| **Cost**             | **FREE** (up to 2000/day)    | $19.95/month for 100k emails   |
| **Setup Complexity** | **Easy**                     | Moderate                       |
| **Deliverability**   | **Excellent**                | Excellent                      |
| **Templates**        | Custom HTML                  | Advanced Dynamic Templates     |
| **Analytics**        | Basic (Google Admin)         | Advanced with detailed metrics |
| **API Quality**      | Nodemailer integration       | Comprehensive and reliable     |
| **University Ready** | **Perfect for .edu domains** | Enterprise-grade features      |
| **Daily Limit**      | 2000 emails/day              | Based on plan                  |

**🎯 Recommendation: Gmail SMTP** - Perfect for educational institutions, completely free, and excellent deliverability with .edu domains.

---

## 🆓 Gmail SMTP Implementation (Recommended)

### 1. Gmail SMTP Setup & Configuration

#### Prerequisites

1. **Gmail Account** - Use institutional email (admin@amity.edu)
2. **App Password** - Enable 2FA and create app-specific password
3. **Less Secure Apps** - Enable if using regular password (not recommended)

#### Installation

```bash
npm install nodemailer @types/nodemailer
```

#### Environment Configuration

```typescript
// .env.local
GMAIL_USER=admin@amity.edu
GMAIL_APP_PASSWORD=your_16_character_app_password
GMAIL_FROM_NAME=Amity University Patna
GMAIL_REPLY_TO=admin@amity.edu
```

#### Gmail SMTP Client Setup

```typescript
// lib/email/gmailClient.ts
import nodemailer from "nodemailer";

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
	throw new Error("Gmail credentials not set");
}

// Create Gmail SMTP transporter
export const gmailTransporter = nodemailer.createTransporter({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_APP_PASSWORD,
	},
});

export const EMAIL_CONFIG = {
	from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
	replyTo: process.env.GMAIL_REPLY_TO || process.env.GMAIL_USER,
	baseUrl: process.env.EXPO_PUBLIC_APP_URL || "https://amity-booking.app",
};

// Verify connection
gmailTransporter.verify((error, success) => {
	if (error) {
		console.error("Gmail SMTP connection error:", error);
	} else {
		console.log("Gmail SMTP connection successful");
	}
});
```

### 2. Gmail Email Templates

#### Template Structure for Gmail

```typescript
// types/email.ts
export type EmailTemplate =
	| "booking-confirmation"
	| "booking-cancellation"
	| "booking-reminder"
	| "booking-conflict";

export interface GmailEmailData {
	to: string;
	subject: string;
	html: string;
	attachments?: EmailAttachment[];
}

export interface EmailAttachment {
	filename: string;
	content: string;
	encoding: string;
}
```

#### Gmail Email Service Implementation

```typescript
// services/gmailEmailService.ts
import { gmailTransporter, EMAIL_CONFIG } from "../lib/email/gmailClient";
import { GmailEmailData } from "../types/email";
import { supabase } from "./supabase";
import { Booking, SeminarHall, Profile } from "../types";

export class GmailEmailService {
	static async sendEmail(
		data: GmailEmailData
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			const mailOptions = {
				from: EMAIL_CONFIG.from,
				to: data.to,
				subject: data.subject,
				html: data.html,
				replyTo: EMAIL_CONFIG.replyTo,
				attachments: data.attachments,
			};

			const info = await gmailTransporter.sendMail(mailOptions);

			// Log email to database
			await this.logEmail({
				recipient: data.to,
				subject: data.subject,
				status: "sent",
				messageId: info.messageId,
			});

			return {
				success: true,
				messageId: info.messageId,
			};
		} catch (error) {
			console.error("Gmail email sending failed:", error);

			// Log failed email
			await this.logEmail({
				recipient: data.to,
				subject: data.subject,
				status: "failed",
				error: error instanceof Error ? error.message : "Unknown error",
			});

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// Specific booking-related email methods
	static async sendBookingConfirmation(
		booking: Booking,
		hall: SeminarHall,
		faculty: Profile
	) {
		const subject = `✅ Booking Confirmed - ${hall.name} | Amity University Patna`;
		const html = this.generateBookingConfirmationHTML({
			facultyName: faculty.fullName,
			booking,
			hall,
		});

		return this.sendEmail({
			to: faculty.email,
			subject,
			html,
		});
	}

	static async sendBookingReminder(
		booking: Booking,
		hall: SeminarHall,
		faculty: Profile,
		hoursUntil: number
	) {
		const subject = `🔔 Reminder: Your booking is ${
			hoursUntil < 24 ? "in " + hoursUntil + " hours" : "tomorrow"
		} - ${hall.name}`;
		const html = this.generateBookingReminderHTML({
			facultyName: faculty.fullName,
			booking,
			hall,
			hoursUntil,
		});

		return this.sendEmail({
			to: faculty.email,
			subject,
			html,
		});
	}

	static async sendBookingCancellation(
		booking: Booking,
		hall: SeminarHall,
		faculty: Profile,
		reason?: string
	) {
		const subject = `❌ Booking Cancelled - ${hall.name} | Amity University Patna`;
		const html = this.generateBookingCancellationHTML({
			facultyName: faculty.fullName,
			booking,
			hall,
			cancellationReason: reason || "No reason provided",
		});

		return this.sendEmail({
			to: faculty.email,
			subject,
			html,
		});
	}

	// HTML Template Generation Methods
	static generateBookingConfirmationHTML(data: {
		facultyName: string;
		booking: Booking;
		hall: SeminarHall;
	}): string {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px 20px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 30px 20px; }
        .confirmation-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: 600; margin-bottom: 25px; }
        .booking-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin: 20px 0; }
        .booking-header { color: #1e40af; font-size: 18px; font-weight: 600; margin-bottom: 20px; }
        .detail-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #374151; min-width: 120px; }
        .detail-value { color: #1f2937; }
        .important-notes { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { background: #f9fafb; padding: 25px 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .btn { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px; }
        @media (max-width: 600px) {
            .content { padding: 20px 15px; }
            .booking-card { padding: 20px; }
            .detail-row { flex-direction: column; align-items: flex-start; }
            .detail-label { margin-bottom: 5px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">🏛️ Amity University Patna</div>
            <h1>Seminar Hall Booking System</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <div style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">
                Dear ${data.facultyName},
            </div>
            
            <div class="confirmation-badge">✅ Booking Confirmed</div>
            
            <p style="color: #4b5563; margin-bottom: 25px;">
                Great news! Your seminar hall booking has been successfully confirmed. 
                All the details are provided below for your reference.
            </p>

            <!-- Booking Details Card -->
            <div class="booking-card">
                <div class="booking-header">📋 Booking Details</div>
                
                <div class="detail-row">
                    <span class="detail-label">📍 Hall:</span>
                    <span class="detail-value">${data.hall.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📅 Date:</span>
                    <span class="detail-value">${this.formatDate(
											data.booking.startTime
										)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">⏰ Time:</span>
                    <span class="detail-value">${this.formatTime(
											data.booking.startTime
										)} - ${this.formatTime(data.booking.endTime)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">👥 Capacity:</span>
                    <span class="detail-value">${
											data.booking.attendeeCount
										} people</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🎯 Purpose:</span>
                    <span class="detail-value">${data.booking.title}</span>
                </div>
                ${
									data.booking.description
										? `
                <div class="detail-row">
                    <span class="detail-label">📝 Description:</span>
                    <span class="detail-value">${data.booking.description}</span>
                </div>
                `
										: ""
								}
            </div>

            <!-- Equipment Section -->
            ${
							data.booking.equipmentNeeded &&
							data.booking.equipmentNeeded.length > 0
								? `
            <div class="booking-card">
                <div class="booking-header">🛠️ Equipment Included</div>
                <div style="background: white; border-radius: 8px; padding: 15px;">
                    ${data.booking.equipmentNeeded
											.map(
												(equipment) =>
													`<div style="padding: 5px 0; color: #4b5563;">✓ ${equipment}</div>`
											)
											.join("")}
                </div>
            </div>
            `
								: ""
						}

            <!-- Important Notes -->
            <div class="important-notes">
                <div style="color: #92400e; font-weight: 600; margin-bottom: 10px;">
                    ⚠️ Important Guidelines
                </div>
                <div style="color: #78350f;">
                    • Please arrive 10 minutes before your scheduled time<br>
                    • Ensure all attendees follow university guidelines<br>
                    • Return all equipment in working condition<br>
                    • Cancellation allowed up to 24 hours before the event<br>
                    • Contact admin immediately for any changes or issues
                </div>
            </div>

            <div style="text-align: center; margin: 25px 0;">
                <a href="mailto:${
									EMAIL_CONFIG.replyTo
								}?subject=Booking Inquiry - ${data.booking.id}" class="btn">
                    Contact Support
                </a>
            </div>

            <p style="color: #4b5563; text-align: center; margin-top: 25px;">
                If you need to make any changes or have questions, please contact us immediately at 
                <a href="mailto:${
									EMAIL_CONFIG.replyTo
								}" style="color: #1e40af;">${EMAIL_CONFIG.replyTo}</a>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            This is an automated email confirmation. Please do not reply directly to this email.<br>
            For support, contact us at ${EMAIL_CONFIG.replyTo}
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <strong>Amity University Patna</strong><br>
                Campus Address, Patna, Bihar<br>
                Phone: +91-XXXX-XXXXXX | Email: info@amity.edu
            </div>
            
            <div style="margin-top: 15px; color: #9ca3af; font-size: 12px;">
                © 2025 Amity University Patna. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>`;
	}

	static generateBookingReminderHTML(data: {
		facultyName: string;
		booking: Booking;
		hall: SeminarHall;
		hoursUntil: number;
	}): string {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Reminder</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .reminder-badge { background: #f59e0b; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: 600; margin-bottom: 25px; }
        .booking-card { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 25px; margin: 20px 0; }
        .countdown { text-align: center; background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .countdown-time { font-size: 36px; font-weight: bold; color: #92400e; }
        .countdown-label { color: #78350f; margin-top: 5px; font-size: 16px; }
        .detail-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #fef3c7; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #92400e; min-width: 120px; }
        .detail-value { color: #78350f; }
        .checklist { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { background: #f9fafb; padding: 25px 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">🔔 Booking Reminder</div>
            <h1>Amity University Patna</h1>
        </div>

        <div class="content">
            <div style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Dear ${
							data.facultyName
						},</div>
            
            <div class="reminder-badge">⏰ Upcoming Booking</div>
            
            <p style="color: #4b5563; margin-bottom: 25px;">
                This is a friendly reminder about your upcoming seminar hall booking.
            </p>

            <div class="countdown">
                <div class="countdown-time">${data.hoursUntil}h</div>
                <div class="countdown-label">until your booking</div>
            </div>

            <div class="booking-card">
                <div style="color: #92400e; font-size: 18px; font-weight: 600; margin-bottom: 20px;">
                    📋 Your Booking Details
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">📍 Hall:</span>
                    <span class="detail-value">${data.hall.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📅 Date:</span>
                    <span class="detail-value">${this.formatDate(
											data.booking.startTime
										)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">⏰ Time:</span>
                    <span class="detail-value">${this.formatTime(
											data.booking.startTime
										)} - ${this.formatTime(data.booking.endTime)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🎯 Purpose:</span>
                    <span class="detail-value">${data.booking.title}</span>
                </div>
            </div>

            <div class="checklist">
                <div style="color: #92400e; font-weight: 600; margin-bottom: 10px;">📝 Pre-booking Checklist</div>
                <div style="color: #78350f;">
                    ✓ Confirm attendee count<br>
                    ✓ Check equipment requirements<br>
                    ✓ Prepare presentation materials<br>
                    ✓ Notify all participants<br>
                    ✓ Arrive 10 minutes early
                </div>
            </div>

            <div style="text-align: center; margin: 25px 0;">
                <a href="mailto:${
									EMAIL_CONFIG.replyTo
								}?subject=Booking Changes - ${data.booking.id}" 
                   style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Contact Support
                </a>
            </div>
        </div>

        <div class="footer">
            Need to make changes? Contact us at ${EMAIL_CONFIG.replyTo}<br>
            <em>Cancellations must be made at least 24 hours in advance.</em>
        </div>
    </div>
</body>
</html>`;
	}

	static generateBookingCancellationHTML(data: {
		facultyName: string;
		booking: Booking;
		hall: SeminarHall;
		cancellationReason: string;
	}): string {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Cancelled</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .cancellation-badge { background: #dc2626; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: 600; margin-bottom: 25px; }
        .booking-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 25px; margin: 20px 0; }
        .detail-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #fee2e2; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #991b1b; min-width: 120px; }
        .detail-value { color: #7f1d1d; }
        .reason-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { background: #f9fafb; padding: 25px 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">❌ Booking Cancelled</div>
            <h1>Amity University Patna</h1>
        </div>

        <div class="content">
            <div style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Dear ${
							data.facultyName
						},</div>
            
            <div class="cancellation-badge">❌ Booking Cancelled</div>
            
            <p style="color: #4b5563; margin-bottom: 25px;">
                Your seminar hall booking has been cancelled. Please see the details below.
            </p>

            <div class="booking-card">
                <div style="color: #991b1b; font-size: 18px; font-weight: 600; margin-bottom: 20px;">
                    📋 Cancelled Booking Details
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">📍 Hall:</span>
                    <span class="detail-value">${data.hall.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📅 Date:</span>
                    <span class="detail-value">${this.formatDate(
											data.booking.startTime
										)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">⏰ Time:</span>
                    <span class="detail-value">${this.formatTime(
											data.booking.startTime
										)} - ${this.formatTime(data.booking.endTime)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🎯 Purpose:</span>
                    <span class="detail-value">${data.booking.title}</span>
                </div>
            </div>

            <div class="reason-box">
                <div style="color: #991b1b; font-weight: 600; margin-bottom: 10px;">📝 Cancellation Reason</div>
                <div style="color: #7f1d1d;">${data.cancellationReason}</div>
            </div>

            <p style="color: #4b5563; text-align: center; margin: 25px 0;">
                You can make a new booking anytime through the app or by contacting us at 
                <a href="mailto:${
									EMAIL_CONFIG.replyTo
								}" style="color: #1e40af;">${EMAIL_CONFIG.replyTo}</a>
            </p>

            <div style="text-align: center; margin: 25px 0;">
                <a href="mailto:${
									EMAIL_CONFIG.replyTo
								}?subject=New Booking Request" 
                   style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Make New Booking
                </a>
            </div>
        </div>

        <div class="footer">
            If you have any questions about this cancellation, please contact us at ${
							EMAIL_CONFIG.replyTo
						}
        </div>
    </div>
</body>
</html>`;
	}

	// Utility methods
	static formatDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString("en-IN", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}

	static formatTime(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleTimeString("en-IN", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	}

	// Email logging for audit trail
	private static async logEmail(logData: {
		recipient: string;
		subject: string;
		status: "sent" | "failed";
		messageId?: string;
		error?: string;
	}) {
		try {
			await supabase.from("email_logs").insert({
				recipient_email: logData.recipient,
				email_type: logData.subject,
				status: logData.status,
				message_id: logData.messageId,
				error_message: logData.error,
			});
		} catch (error) {
			console.error("Failed to log email:", error);
		}
	}
}
```

### 2. SendGrid Dynamic Templates

#### Creating Dynamic Templates in SendGrid

1. **Login to SendGrid Dashboard**
2. **Navigate to Email API → Dynamic Templates**
3. **Create Template for each email type:**
   - Booking Confirmation
   - Booking Reminder
   - Booking Cancellation
   - Booking Conflict Alert

#### Template Data Structure

```typescript
// types/email.ts
export type EmailTemplate =
	| "booking-confirmation"
	| "booking-cancellation"
	| "booking-reminder"
	| "booking-conflict";

export interface SendGridEmailData {
	to: string;
	templateId: string;
	dynamicTemplateData: Record<string, any>;
}

export interface BookingEmailData {
	facultyName: string;
	hallName: string;
	bookingDate: string;
	startTime: string;
	endTime: string;
	eventTitle: string;
	attendeeCount: number;
	equipment?: string[];
	specialRequirements?: string;
}
```

#### SendGrid Template Examples

**Booking Confirmation Template (HTML in SendGrid Dashboard):**

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Booking Confirmation</title>
		<style>
			* {
				margin: 0;
				padding: 0;
				box-sizing: border-box;
			}
			body {
				font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
				background-color: #f8fafc;
			}
			.container {
				max-width: 600px;
				margin: 0 auto;
				background: white;
			}
			.header {
				background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
				color: white;
				padding: 30px 20px;
				text-align: center;
			}
			.logo {
				font-size: 24px;
				font-weight: bold;
				margin-bottom: 10px;
			}
			.content {
				padding: 30px 20px;
			}
			.confirmation-badge {
				background: #10b981;
				color: white;
				padding: 8px 16px;
				border-radius: 20px;
				display: inline-block;
				font-weight: 600;
				margin-bottom: 25px;
			}
			.booking-card {
				background: #f8fafc;
				border: 1px solid #e5e7eb;
				border-radius: 12px;
				padding: 25px;
				margin: 20px 0;
			}
			.booking-header {
				color: #1e40af;
				font-size: 18px;
				font-weight: 600;
				margin-bottom: 20px;
			}
			.detail-row {
				display: flex;
				align-items: center;
				padding: 8px 0;
			}
			.detail-label {
				font-weight: 600;
				color: #374151;
				min-width: 100px;
			}
			.detail-value {
				color: #1f2937;
			}
			.important-notes {
				background: #fef3c7;
				border-left: 4px solid #f59e0b;
				padding: 20px;
				margin: 20px 0;
				border-radius: 0 8px 8px 0;
			}
			.footer {
				background: #f9fafb;
				padding: 25px 20px;
				text-align: center;
				border-top: 1px solid #e5e7eb;
			}
			.btn {
				display: inline-block;
				padding: 12px 24px;
				background: #1e40af;
				color: white;
				text-decoration: none;
				border-radius: 8px;
				font-weight: 600;
				margin: 10px;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<!-- Header -->
			<div class="header">
				<div class="logo">🏛️ Amity University Patna</div>
				<h1>Seminar Hall Booking System</h1>
			</div>

			<!-- Content -->
			<div class="content">
				<div style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">
					Dear {{facultyName}},
				</div>

				<div class="confirmation-badge">✅ Booking Confirmed</div>

				<p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
					Great news! Your seminar hall booking has been successfully confirmed.
					All the details are provided below for your reference.
				</p>

				<!-- Booking Details Card -->
				<div class="booking-card">
					<div class="booking-header">📋 Booking Details</div>

					<div class="detail-row">
						<span class="detail-label">📍 Hall:</span>
						<span class="detail-value">{{hallName}}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">📅 Date:</span>
						<span class="detail-value">{{bookingDate}}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">⏰ Time:</span>
						<span class="detail-value">{{startTime}} - {{endTime}}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">👥 Capacity:</span>
						<span class="detail-value">{{attendeeCount}} people</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">🎯 Purpose:</span>
						<span class="detail-value">{{eventTitle}}</span>
					</div>
				</div>

				<!-- Equipment Section -->
				{{#if equipment}}
				<div class="booking-card">
					<div class="booking-header">🛠️ Equipment Included</div>
					<div style="background: white; border-radius: 8px; padding: 15px;">
						{{#each equipment}}
						<div style="padding: 5px 0; color: #4b5563;">✓ {{this}}</div>
						{{/each}}
					</div>
				</div>
				{{/if}}

				<!-- Important Notes -->
				<div class="important-notes">
					<div style="color: #92400e; font-weight: 600; margin-bottom: 10px;">
						⚠️ Important Guidelines
					</div>
					<div style="color: #78350f;">
						• Please arrive 10 minutes before your scheduled time<br />
						• Ensure all attendees follow university guidelines<br />
						• Return all equipment in working condition<br />
						• Cancellation allowed up to 24 hours before the event<br />
						• Contact admin immediately for any changes or issues
					</div>
				</div>

				<div style="text-align: center; margin: 25px 0;">
					<a href="mailto:admin@amity.edu?subject=Booking Inquiry" class="btn"
						>Contact Support</a
					>
				</div>

				<p style="color: #4b5563; text-align: center; margin-top: 25px;">
					If you need to make any changes or have questions, please contact us
					immediately at
					<a href="mailto:admin@amity.edu" style="color: #1e40af;"
						>admin@amity.edu</a
					>
				</p>
			</div>

			<!-- Footer -->
			<div class="footer">
				<div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
					This is an automated email confirmation. Please do not reply directly
					to this email.
					<br />For support, contact us at admin@amity.edu
				</div>

				<div
					style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;"
				>
					<strong>Amity University Patna</strong><br />
					Campus Address, Patna, Bihar<br />
					Phone: +91-XXXX-XXXXXX | Email: info@amity.edu
				</div>

				<div style="margin-top: 15px; color: #9ca3af; font-size: 12px;">
					© 2025 Amity University Patna. All rights reserved.
				</div>
			</div>
		</div>
	</body>
</html>
```

### 3. Email Service Implementation

#### Main SendGrid Email Service

```typescript
// services/emailService.ts
import { sgMail, EMAIL_CONFIG } from "../lib/email/sendgridClient";
import { SendGridEmailData, EmailTemplate } from "../types/email";
import { supabase } from "./supabase";
import { Booking, SeminarHall, Profile } from "../types";

export class EmailService {
	static async sendEmail(
		data: SendGridEmailData
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			const msg = {
				to: data.to,
				from: EMAIL_CONFIG.from,
				templateId: data.templateId,
				dynamicTemplateData: data.dynamicTemplateData,
				replyTo: EMAIL_CONFIG.replyTo,
			};

			const response = await sgMail.send(msg);

			// Log email to database
			await this.logEmail({
				recipient: data.to,
				template: data.templateId,
				status: "sent",
				messageId: response[0].headers["x-message-id"],
				bookingId: data.dynamicTemplateData.bookingId,
			});

			return {
				success: true,
				messageId: response[0].headers["x-message-id"],
			};
		} catch (error) {
			console.error("SendGrid email sending failed:", error);

			// Log failed email
			await this.logEmail({
				recipient: data.to,
				template: data.templateId,
				status: "failed",
				error: error instanceof Error ? error.message : "Unknown error",
				bookingId: data.dynamicTemplateData.bookingId,
			});

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// Specific booking-related email methods
	static async sendBookingConfirmation(
		booking: Booking,
		hall: SeminarHall,
		faculty: Profile
	) {
		return this.sendEmail({
			to: faculty.email,
			templateId: EMAIL_CONFIG.templates.bookingConfirmation,
			dynamicTemplateData: {
				bookingId: booking.id,
				facultyName: faculty.fullName,
				hallName: hall.name,
				bookingDate: this.formatDate(booking.startTime),
				startTime: this.formatTime(booking.startTime),
				endTime: this.formatTime(booking.endTime),
				eventTitle: booking.title,
				attendeeCount: booking.attendeeCount,
				equipment: booking.equipmentNeeded || [],
				specialRequirements: booking.specialRequirements,
			},
		});
	}

	static async sendBookingReminder(
		booking: Booking,
		hall: SeminarHall,
		faculty: Profile,
		hoursUntil: number
	) {
		return this.sendEmail({
			to: faculty.email,
			templateId: EMAIL_CONFIG.templates.bookingReminder,
			dynamicTemplateData: {
				bookingId: booking.id,
				facultyName: faculty.fullName,
				hallName: hall.name,
				bookingDate: this.formatDate(booking.startTime),
				startTime: this.formatTime(booking.startTime),
				endTime: this.formatTime(booking.endTime),
				eventTitle: booking.title,
				hoursUntil,
			},
		});
	}

	static async sendBookingCancellation(
		booking: Booking,
		hall: SeminarHall,
		faculty: Profile,
		reason?: string
	) {
		return this.sendEmail({
			to: faculty.email,
			templateId: EMAIL_CONFIG.templates.bookingCancellation,
			dynamicTemplateData: {
				bookingId: booking.id,
				facultyName: faculty.fullName,
				hallName: hall.name,
				bookingDate: this.formatDate(booking.startTime),
				startTime: this.formatTime(booking.startTime),
				endTime: this.formatTime(booking.endTime),
				eventTitle: booking.title,
				cancellationReason: reason || "No reason provided",
			},
		});
	}

	// Utility methods
	static formatDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString("en-IN", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}

	static formatTime(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleTimeString("en-IN", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	}

	// Email logging for audit trail
	private static async logEmail(logData: {
		recipient: string;
		template: EmailTemplate;
		status: "sent" | "failed";
		messageId?: string;
		error?: string;
		bookingId?: string;
	}) {
		try {
			await supabase.from("email_logs").insert({
				recipient_email: logData.recipient,
				email_type: logData.template,
				status: logData.status,
				message_id: logData.messageId,
				error_message: logData.error,
				booking_id: logData.bookingId,
			});
		} catch (error) {
			console.error("Failed to log email:", error);
		}
	}
}
```

### 4. Automated Email Triggers

#### Supabase Edge Function for Email Automation

```typescript
// supabase/functions/email-automation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EmailService } from "../../../services/emailService.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const { type, bookingId } = await req.json();

		const supabase = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
		);

		// Fetch booking with related data
		const { data: booking, error } = await supabase
			.from("bookings")
			.select(
				`
        *,
        hall:seminar_halls(*),
        faculty:profiles(*)
      `
			)
			.eq("id", bookingId)
			.single();

		if (error) throw error;

		let result;

		switch (type) {
			case "booking-confirmation":
				result = await EmailService.sendBookingConfirmation(
					booking,
					booking.hall,
					booking.faculty
				);
				break;

			case "booking-reminder":
				const hoursUntil = Math.ceil(
					(new Date(booking.start_time).getTime() - Date.now()) /
						(1000 * 60 * 60)
				);
				result = await EmailService.sendBookingReminder(
					booking,
					booking.hall,
					booking.faculty,
					hoursUntil
				);
				break;

			case "booking-cancellation":
				result = await EmailService.sendBookingCancellation(
					booking,
					booking.hall,
					booking.faculty
				);
				break;

			default:
				throw new Error(`Unknown email type: ${type}`);
		}

		return new Response(JSON.stringify(result), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: result.success ? 200 : 400,
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
```

#### Database Triggers for Automatic Emails

```sql
-- Function to trigger email notifications
CREATE OR REPLACE FUNCTION trigger_email_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Send confirmation email when booking is confirmed
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/email-automation',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
      body := json_build_object(
        'type', 'booking-confirmation',
        'bookingId', NEW.id
      )::text
    );
  END IF;

  -- Send cancellation email when booking is cancelled
  IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/email-automation',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
      body := json_build_object(
        'type', 'booking-cancellation',
        'bookingId', NEW.id
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER booking_email_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_email_notification();
```

### 5. Email Scheduling for Reminders

#### Cron Job for Reminder Emails

```typescript
// supabase/functions/email-reminders/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
	const supabase = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
	);

	try {
		const now = new Date();
		const twentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
		const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

		// Find bookings that need 24-hour reminders
		const { data: upcomingBookings } = await supabase
			.from("bookings")
			.select("*, hall:seminar_halls(*), faculty:profiles(*)")
			.eq("status", "confirmed")
			.gte("start_time", now.toISOString())
			.lte("start_time", twentyFourHours.toISOString())
			.is("reminder_24h_sent", null);

		// Find bookings that need 2-hour reminders
		const { data: imminentBookings } = await supabase
			.from("bookings")
			.select("*, hall:seminar_halls(*), faculty:profiles(*)")
			.eq("status", "confirmed")
			.gte("start_time", now.toISOString())
			.lte("start_time", twoHours.toISOString())
			.is("reminder_2h_sent", null);

		// Send 24-hour reminders
		for (const booking of upcomingBookings || []) {
			await EmailService.sendBookingReminder(
				booking,
				booking.hall,
				booking.faculty,
				24
			);

			// Mark as sent
			await supabase
				.from("bookings")
				.update({ reminder_24h_sent: now.toISOString() })
				.eq("id", booking.id);
		}

		// Send 2-hour reminders
		for (const booking of imminentBookings || []) {
			await EmailService.sendBookingReminder(
				booking,
				booking.hall,
				booking.faculty,
				2
			);

			// Mark as sent
			await supabase
				.from("bookings")
				.update({ reminder_2h_sent: now.toISOString() })
				.eq("id", booking.id);
		}

		return new Response(
			JSON.stringify({
				success: true,
				sent24h: upcomingBookings?.length || 0,
				sent2h: imminentBookings?.length || 0,
			}),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
});
```

### 6. React Native Integration

#### Email Trigger from Mobile App

```typescript
// hooks/useEmailNotifications.ts
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../services/supabase";

export const useEmailNotifications = () => {
	const sendBookingConfirmation = useMutation({
		mutationFn: async (bookingId: string) => {
			const { data, error } = await supabase.functions.invoke(
				"email-automation",
				{
					body: {
						type: "booking-confirmation",
						bookingId,
					},
				}
			);

			if (error) throw error;
			return data;
		},
	});

	const sendBookingCancellation = useMutation({
		mutationFn: async ({
			bookingId,
			reason,
		}: {
			bookingId: string;
			reason?: string;
		}) => {
			const { data, error } = await supabase.functions.invoke(
				"email-automation",
				{
					body: {
						type: "booking-cancellation",
						bookingId,
						reason,
					},
				}
			);

			if (error) throw error;
			return data;
		},
	});

	return {
		sendBookingConfirmation,
		sendBookingCancellation,
	};
};
```

#### Usage in Booking Component

```typescript
// components/BookingConfirmation.tsx
import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useEmailNotifications } from "../hooks/useEmailNotifications";

export const BookingConfirmation = ({ booking, onConfirm }) => {
	const { sendBookingConfirmation } = useEmailNotifications();

	const handleConfirmBooking = async () => {
		try {
			// Update booking status
			await onConfirm(booking.id);

			// Send confirmation email
			await sendBookingConfirmation.mutateAsync(booking.id);

			Alert.alert("Success!", "Booking confirmed and confirmation email sent!");
		} catch (error) {
			Alert.alert(
				"Error",
				"Booking confirmed but email failed to send. Please contact admin."
			);
		}
	};

	return (
		<View>
			<Text>Confirm this booking?</Text>
			<TouchableOpacity
				onPress={handleConfirmBooking}
				disabled={sendBookingConfirmation.isLoading}
			>
				<Text>
					{sendBookingConfirmation.isLoading
						? "Confirming..."
						: "Confirm & Send Email"}
				</Text>
			</TouchableOpacity>
		</View>
	);
};
```

## 📱 React Native Integration with Gmail SMTP

### Gmail Email Hook for React Native

```typescript
// hooks/useGmailNotifications.ts
import { useMutation } from "@tanstack/react-query";
import { GmailEmailService } from "../services/gmailEmailService";

export const useGmailNotifications = () => {
	const sendBookingConfirmation = useMutation({
		mutationFn: async ({
			booking,
			hall,
			faculty,
		}: {
			booking: Booking;
			hall: SeminarHall;
			faculty: Profile;
		}) => {
			return await GmailEmailService.sendBookingConfirmation(
				booking,
				hall,
				faculty
			);
		},
	});

	const sendBookingReminder = useMutation({
		mutationFn: async ({
			booking,
			hall,
			faculty,
			hoursUntil,
		}: {
			booking: Booking;
			hall: SeminarHall;
			faculty: Profile;
			hoursUntil: number;
		}) => {
			return await GmailEmailService.sendBookingReminder(
				booking,
				hall,
				faculty,
				hoursUntil
			);
		},
	});

	const sendBookingCancellation = useMutation({
		mutationFn: async ({
			booking,
			hall,
			faculty,
			reason,
		}: {
			booking: Booking;
			hall: SeminarHall;
			faculty: Profile;
			reason?: string;
		}) => {
			return await GmailEmailService.sendBookingCancellation(
				booking,
				hall,
				faculty,
				reason
			);
		},
	});

	return {
		sendBookingConfirmation,
		sendBookingReminder,
		sendBookingCancellation,
	};
};
```

### Usage in Booking Components

```typescript
// components/BookingConfirmation.tsx
import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useGmailNotifications } from "../hooks/useGmailNotifications";

export const BookingConfirmation = ({ booking, hall, faculty, onConfirm }) => {
	const { sendBookingConfirmation } = useGmailNotifications();

	const handleConfirmBooking = async () => {
		try {
			// Update booking status first
			await onConfirm(booking.id);

			// Send confirmation email via Gmail SMTP
			const result = await sendBookingConfirmation.mutateAsync({
				booking,
				hall,
				faculty,
			});

			if (result.success) {
				Alert.alert(
					"Success! 🎉",
					"Booking confirmed and confirmation email sent!"
				);
			} else {
				Alert.alert(
					"Partial Success",
					"Booking confirmed but email failed to send. Admin will be notified."
				);
			}
		} catch (error) {
			Alert.alert("Error", "Failed to confirm booking. Please try again.");
		}
	};

	return (
		<View style={{ padding: 20 }}>
			<Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
				Confirm Booking for {hall.name}?
			</Text>

			<TouchableOpacity
				onPress={handleConfirmBooking}
				disabled={sendBookingConfirmation.isLoading}
				style={{
					backgroundColor: sendBookingConfirmation.isLoading
						? "#9CA3AF"
						: "#1E40AF",
					padding: 15,
					borderRadius: 8,
					alignItems: "center",
				}}
			>
				<Text style={{ color: "white", fontWeight: "bold" }}>
					{sendBookingConfirmation.isLoading
						? "Confirming & Sending Email..."
						: "Confirm & Send Email"}
				</Text>
			</TouchableOpacity>
		</View>
	);
};
```

## 🔄 Automated Email Triggers with Gmail

### Supabase Edge Function for Gmail Integration

```typescript
// supabase/functions/gmail-automation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const { type, bookingId } = await req.json();

		const supabase = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
		);

		// Fetch booking with related data
		const { data: booking, error } = await supabase
			.from("bookings")
			.select(
				`
        *,
        hall:seminar_halls(*),
        faculty:profiles(*)
      `
			)
			.eq("id", bookingId)
			.single();

		if (error) throw error;

		// Import Gmail service (you'll need to adapt this for Deno)
		const { GmailEmailService } = await import(
			"../../../services/gmailEmailService.ts"
		);

		let result;

		switch (type) {
			case "booking-confirmation":
				result = await GmailEmailService.sendBookingConfirmation(
					booking,
					booking.hall,
					booking.faculty
				);
				break;

			case "booking-reminder":
				const hoursUntil = Math.ceil(
					(new Date(booking.start_time).getTime() - Date.now()) /
						(1000 * 60 * 60)
				);
				result = await GmailEmailService.sendBookingReminder(
					booking,
					booking.hall,
					booking.faculty,
					hoursUntil
				);
				break;

			case "booking-cancellation":
				result = await GmailEmailService.sendBookingCancellation(
					booking,
					booking.hall,
					booking.faculty
				);
				break;

			default:
				throw new Error(`Unknown email type: ${type}`);
		}

		return new Response(JSON.stringify(result), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: result.success ? 200 : 400,
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
```

## 📊 Gmail vs SendGrid Comparison for Your Project

### Cost Analysis

| Aspect             | **Gmail SMTP**                   | **SendGrid**      |
| ------------------ | -------------------------------- | ----------------- |
| **Monthly Cost**   | **FREE**                         | $19.95/month      |
| **Yearly Cost**    | **$0**                           | $239.40/year      |
| **Setup Time**     | **15 minutes**                   | 30-60 minutes     |
| **Email Limit**    | 2000/day (enough for university) | Based on plan     |
| **Deliverability** | Excellent with .edu domain       | Excellent         |
| **Templates**      | Custom HTML (full control)       | Dynamic templates |

### Recommendation for Amity University

**✅ Use Gmail SMTP** because:

1. **Cost-Effective**: Completely free vs $240/year for SendGrid
2. **University Domain**: Excellent deliverability with @amity.edu
3. **Simple Setup**: Just need app password, no complex API setup
4. **Full Control**: Custom HTML templates, no vendor lock-in
5. **Reliable**: Google's infrastructure is highly reliable
6. **Daily Limit**: 2000 emails/day is more than enough for 2 seminar halls

### When to Consider SendGrid

- If you need more than 2000 emails per day
- If you want advanced analytics and A/B testing
- If you need complex automation workflows
- If you have a large team managing email campaigns

## 🔧 Environment Configuration Summary

### For Gmail SMTP (Recommended)

```bash
# .env.local
GMAIL_USER=admin@amity.edu
GMAIL_APP_PASSWORD=your_16_character_app_password
GMAIL_FROM_NAME=Amity University Patna
GMAIL_REPLY_TO=admin@amity.edu
```

### For SendGrid (Alternative)

```bash
# .env.local
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=bookings@amity.edu
SENDGRID_REPLY_TO=admin@amity.edu
```

## 🎯 Final Implementation Steps

1. **Choose Email Service**: Gmail SMTP (recommended) or SendGrid
2. **Set up Environment Variables**: Add credentials to .env.local
3. **Install Dependencies**: `npm install nodemailer @types/nodemailer`
4. **Implement Service**: Use GmailEmailService class
5. **Create Hooks**: Use useGmailNotifications in React Native
6. **Test Emails**: Send test confirmation emails
7. **Set up Automation**: Configure Supabase triggers
8. **Deploy**: Push to production with environment variables

**Gmail SMTP is the perfect choice for your university project - free, reliable, and perfectly suited for educational institutions!**
