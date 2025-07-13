import { NextRequest, NextResponse } from "next/server";
import { testEmailConfig } from "@/lib/smtp";

export async function GET(request: NextRequest) {
	try {
		const result = await testEmailConfig();

		return NextResponse.json({
			...result,
			timestamp: new Date().toISOString(),
			environment: {
				nodeEnv: process.env.NODE_ENV,
				hasSmtpUser: !!process.env.GMAIL_SMTP_USER,
				hasSmtpPassword: !!process.env.GMAIL_SMTP_PASSWORD,
				emailProvider: process.env.EMAIL_PROVIDER || "gmail",
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "Failed to test email configuration",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { testEmail } = body;

		if (!testEmail) {
			return NextResponse.json(
				{ error: "testEmail is required" },
				{ status: 400 }
			);
		}

		// Send test email
		const emailResponse = await fetch(
			`${process.env.NEXT_PUBLIC_WEB_URL}/api/send-email`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					emailType: "booking_confirmation",
					toEmail: testEmail,
					data: {
						userName: "Test User",
						hallName: "Test Hall",
						bookingDate: "2024-01-15",
						startTime: "09:00 AM",
						endTime: "11:00 AM",
						purpose: "SMTP Configuration Test",
						bookingId: "TEST-001",
					},
				}),
			}
		);

		const emailResult = await emailResponse.json();

		return NextResponse.json({
			success: emailResponse.ok,
			message: emailResponse.ok
				? "Test email sent successfully"
				: "Failed to send test email",
			result: emailResult,
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "Failed to send test email",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
