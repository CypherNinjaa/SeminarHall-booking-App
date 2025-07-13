import { NextRequest, NextResponse } from "next/server";
import {
	createEmailTransporter,
	defaultSender,
	isValidEmail,
} from "@/lib/smtp";

// Comprehensive email templates for all booking statuses
const emailTemplates = {
	booking_confirmation: {
		subject: "🎉 Booking Confirmed - {{hallName}}",
		template: `
			<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
					<h1 style="color: white; margin: 0; font-size: 28px;">Amity Seminar Hall</h1>
					<p style="color: #E8F4FD; margin: 5px 0 0 0; font-size: 16px;">Booking Management System</p>
				</div>
				<div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
					<h2 style="color: #007AFF; margin-bottom: 20px;">🎉 Booking Confirmed!</h2>
					<p>Dear <strong>{{userName}}</strong>,</p>
					<p>Your seminar hall booking has been confirmed. Here are the details:</p>
					<div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Hall:</strong> {{hallName}}</p>
						<p><strong>Date:</strong> {{bookingDate}}</p>
						<p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
						<p><strong>Purpose:</strong> {{purpose}}</p>
						<p><strong>Booking ID:</strong> {{bookingId}}</p>
					</div>
					<p>Please arrive on time and ensure you have this confirmation for entry.</p>
					<p>Thank you for using our booking system!</p>
				</div>
				<div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
					<p>This email was sent by Amity Seminar Hall Booking System</p>
					<p>For support, contact: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a></p>
				</div>
			</div>
		`,
	},

	booking_approved: {
		subject: "✅ Booking Approved - {{hallName}}",
		template: `
			<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
					<h1 style="color: white; margin: 0; font-size: 28px;">Amity Seminar Hall</h1>
					<p style="color: #E8F4FD; margin: 5px 0 0 0; font-size: 16px;">Booking Management System</p>
				</div>
				<div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
					<h2 style="color: #28A745; margin-bottom: 20px;">✅ Booking Approved!</h2>
					<p>Dear <strong>{{userName}}</strong>,</p>
					<p>Great news! Your seminar hall booking request has been approved by the admin.</p>
					<div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Hall:</strong> {{hallName}}</p>
						<p><strong>Date:</strong> {{bookingDate}}</p>
						<p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
						<p><strong>Purpose:</strong> {{purpose}}</p>
						<p><strong>Booking ID:</strong> {{bookingId}}</p>
					</div>
					<p><strong>Admin Message:</strong> {{adminMessage}}</p>
					<p>Please arrive on time and ensure you have this confirmation for entry.</p>
				</div>
				<div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
					<p>This email was sent by Amity Seminar Hall Booking System</p>
					<p>For support, contact: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a></p>
				</div>
			</div>
		`,
	},

	booking_rejected: {
		subject: "❌ Booking Rejected - {{hallName}}",
		template: `
			<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
					<h1 style="color: white; margin: 0; font-size: 28px;">Amity Seminar Hall</h1>
					<p style="color: #E8F4FD; margin: 5px 0 0 0; font-size: 16px;">Booking Management System</p>
				</div>
				<div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
					<h2 style="color: #DC3545; margin-bottom: 20px;">❌ Booking Rejected</h2>
					<p>Dear <strong>{{userName}}</strong>,</p>
					<p>We regret to inform you that your seminar hall booking request has been rejected.</p>
					<div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Hall:</strong> {{hallName}}</p>
						<p><strong>Date:</strong> {{bookingDate}}</p>
						<p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
						<p><strong>Purpose:</strong> {{purpose}}</p>
						<p><strong>Booking ID:</strong> {{bookingId}}</p>
					</div>
					<p><strong>Reason:</strong> {{rejectionReason}}</p>
					<p>You can try booking a different time slot or contact the admin for more information.</p>
				</div>
				<div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
					<p>This email was sent by Amity Seminar Hall Booking System</p>
					<p>For support, contact: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a></p>
				</div>
			</div>
		`,
	},

	booking_cancelled: {
		subject: "🚫 Booking Cancelled - {{hallName}}",
		template: `
			<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
					<h1 style="color: white; margin: 0; font-size: 28px;">Amity Seminar Hall</h1>
					<p style="color: #E8F4FD; margin: 5px 0 0 0; font-size: 16px;">Booking Management System</p>
				</div>
				<div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
					<h2 style="color: #FFC107; margin-bottom: 20px;">🚫 Booking Cancelled</h2>
					<p>Dear <strong>{{userName}}</strong>,</p>
					<p>Your seminar hall booking has been cancelled as requested.</p>
					<div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Hall:</strong> {{hallName}}</p>
						<p><strong>Date:</strong> {{bookingDate}}</p>
						<p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
						<p><strong>Booking ID:</strong> {{bookingId}}</p>
					</div>
					<p>If you need to book again, please use the app to make a new reservation.</p>
				</div>
				<div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
					<p>This email was sent by Amity Seminar Hall Booking System</p>
					<p>For support, contact: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a></p>
				</div>
			</div>
		`,
	},

	booking_reminder: {
		subject: "⏰ Booking Reminder - {{hallName}}",
		template: `
			<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
					<h1 style="color: white; margin: 0; font-size: 28px;">Amity Seminar Hall</h1>
					<p style="color: #E8F4FD; margin: 5px 0 0 0; font-size: 16px;">Booking Management System</p>
				</div>
				<div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
					<h2 style="color: #007AFF; margin-bottom: 20px;">⏰ Booking Reminder</h2>
					<p>Dear <strong>{{userName}}</strong>,</p>
					<p>This is a friendly reminder about your upcoming seminar hall booking:</p>
					<div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Hall:</strong> {{hallName}}</p>
						<p><strong>Date:</strong> {{bookingDate}}</p>
						<p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
						<p><strong>Purpose:</strong> {{purpose}}</p>
						<p><strong>Booking ID:</strong> {{bookingId}}</p>
					</div>
					<p>Your booking is in <strong>{{timeUntil}}</strong>. Please arrive on time!</p>
				</div>
				<div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
					<p>This email was sent by Amity Seminar Hall Booking System</p>
					<p>For support, contact: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a></p>
				</div>
			</div>
		`,
	},
};

// Function to replace placeholders in template
function replacePlaceholders(template: string, data: any): string {
	return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		return data[key] || match;
	});
}

// Data validation for required fields
function validateBookingData(data: any): { isValid: boolean; error?: string } {
	const requiredFields = [
		"userName",
		"hallName",
		"bookingDate",
		"startTime",
		"endTime",
		"bookingId",
	];

	for (const field of requiredFields) {
		if (!data[field]) {
			return { isValid: false, error: `Missing required field: ${field}` };
		}
	}

	return { isValid: true };
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { emailType, toEmail, data: templateData } = body;

		if (!emailType || !toEmail || !templateData) {
			return NextResponse.json(
				{ error: "Missing required fields: emailType, toEmail, data" },
				{ status: 400 }
			);
		}

		// Validate email format
		if (!isValidEmail(toEmail)) {
			return NextResponse.json(
				{ error: "Invalid email address format" },
				{ status: 400 }
			);
		}

		const template = emailTemplates[emailType as keyof typeof emailTemplates];
		if (!template) {
			return NextResponse.json(
				{ error: `Invalid email type: ${emailType}` },
				{ status: 400 }
			);
		}

		// Validate booking data
		const validation = validateBookingData(templateData);
		if (!validation.isValid) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		const subject = replacePlaceholders(template.subject, templateData);
		const htmlContent = replacePlaceholders(template.template, templateData);

		// Create email transporter
		const transporter = createEmailTransporter();

		// Send email
		const info = await transporter.sendMail({
			from: `"${defaultSender.name}" <${defaultSender.email}>`,
			to: toEmail,
			subject: subject,
			html: htmlContent,
		});

		return NextResponse.json({
			success: true,
			message: "Email sent successfully",
			emailId: info.messageId,
			emailType,
			recipient: toEmail,
		});
	} catch (error) {
		console.error("Email API error:", error);
		return NextResponse.json(
			{
				error: "Failed to send email",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function OPTIONS(request: NextRequest) {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
