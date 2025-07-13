import nodemailer from "nodemailer";

// SMTP Configuration
export const smtpConfig = {
	// Gmail SMTP settings
	gmail: {
		service: "gmail",
		auth: {
			user: process.env.GMAIL_SMTP_USER,
			pass: process.env.GMAIL_SMTP_PASSWORD,
		},
		tls: {
			rejectUnauthorized: false,
		},
	},

	// Generic SMTP settings (if you want to use other providers)
	generic: {
		host: process.env.SMTP_HOST || "smtp.gmail.com",
		port: parseInt(process.env.SMTP_PORT || "587"),
		secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
		auth: {
			user: process.env.SMTP_USER || process.env.GMAIL_SMTP_USER,
			pass: process.env.SMTP_PASSWORD || process.env.GMAIL_SMTP_PASSWORD,
		},
		tls: {
			rejectUnauthorized: false,
		},
	},
};

// Create transporter based on configuration
export function createEmailTransporter() {
	const useGmail =
		process.env.EMAIL_PROVIDER === "gmail" || !process.env.EMAIL_PROVIDER;

	if (useGmail) {
		return nodemailer.createTransport(smtpConfig.gmail);
	} else {
		return nodemailer.createTransport(smtpConfig.generic);
	}
}

// Default sender information
export const defaultSender = {
	name: "Amity Seminar Hall Booking",
	email: process.env.GMAIL_SMTP_USER || "noreply@amitypatna.edu.in",
};

// Email validation
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

// Test email configuration
export async function testEmailConfig() {
	try {
		const transporter = createEmailTransporter();
		await transporter.verify();
		return { success: true, message: "SMTP configuration is valid" };
	} catch (error) {
		return {
			success: false,
			message: `SMTP configuration error: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		};
	}
}
