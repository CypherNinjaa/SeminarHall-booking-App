const nodemailer = require("nodemailer");

export default async function handler(req, res) {
	// Enable CORS
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { to, subject, emailType, data } = req.body;

		// Validate required fields
		if (!to || !subject || !emailType) {
			return res
				.status(400)
				.json({ error: "Missing required fields: to, subject, emailType" });
		}

		// Create SMTP transporter
		const transporter = nodemailer.createTransporter({
			host: process.env.GMAIL_SMTP_HOST || "smtp.gmail.com",
			port: parseInt(process.env.GMAIL_SMTP_PORT || "587"),
			secure: process.env.GMAIL_SMTP_SECURE === "true",
			auth: {
				user: process.env.GMAIL_SMTP_USER,
				pass: process.env.GMAIL_SMTP_PASSWORD,
			},
		});

		// Generate HTML content based on email type
		const htmlContent = generateEmailTemplate(emailType, data);

		// Email options
		const mailOptions = {
			from: `"${
				process.env.GMAIL_FROM_NAME || "Amity Seminar Hall Booking"
			}" <${process.env.GMAIL_FROM_EMAIL}>`,
			to: to,
			subject: subject,
			html: htmlContent,
		};

		// Send email
		const info = await transporter.sendMail(mailOptions);

		console.log("📧 Email sent successfully:", info.messageId);

		return res.status(200).json({
			success: true,
			messageId: info.messageId,
			message: "Email sent successfully",
		});
	} catch (error) {
		console.error("❌ Email sending error:", error);
		return res.status(500).json({
			success: false,
			error: "Failed to send email",
			details: error.message,
		});
	}
}

function generateEmailTemplate(emailType, data) {
	const baseStyle = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Amity Seminar Hall</h1>
        <p style="color: #E8F4FD; margin: 5px 0 0 0; font-size: 16px;">Booking Management System</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
  `;

	const baseEndStyle = `
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
        <p>This email was sent by Amity Seminar Hall Booking System</p>
        <p>For support, contact: <a href="mailto:vikashkelly@gmail.com" style="color: #007AFF;">vikashkelly@gmail.com</a></p>
      </div>
    </div>
  `;

	switch (emailType) {
		case "booking_confirmation":
			return (
				baseStyle +
				`
        <h2 style="color: #007AFF; margin-bottom: 20px;">🎉 Booking Confirmed!</h2>
        <p>Dear <strong>${data.userName}</strong>,</p>
        <p>Your seminar hall booking has been confirmed. Here are the details:</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Hall:</strong> ${data.hallName}</p>
          <p><strong>Date:</strong> ${data.bookingDate}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Purpose:</strong> ${data.purpose}</p>
          <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        </div>
        <p>Please arrive on time and ensure you have this confirmation for entry.</p>
        <p>Thank you for using our booking system!</p>
      ` +
				baseEndStyle
			);

		case "booking_approved":
			return (
				baseStyle +
				`
        <h2 style="color: #28A745; margin-bottom: 20px;">✅ Booking Approved!</h2>
        <p>Dear <strong>${data.userName}</strong>,</p>
        <p>Great news! Your seminar hall booking request has been approved by the admin.</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Hall:</strong> ${data.hallName}</p>
          <p><strong>Date:</strong> ${data.bookingDate}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Purpose:</strong> ${data.purpose}</p>
          <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        </div>
        <p><strong>Admin Message:</strong> ${
					data.adminMessage || "No additional message"
				}</p>
        <p>Please arrive on time and ensure you have this confirmation for entry.</p>
      ` +
				baseEndStyle
			);

		case "booking_rejected":
			return (
				baseStyle +
				`
        <h2 style="color: #DC3545; margin-bottom: 20px;">❌ Booking Rejected</h2>
        <p>Dear <strong>${data.userName}</strong>,</p>
        <p>We regret to inform you that your seminar hall booking request has been rejected.</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Hall:</strong> ${data.hallName}</p>
          <p><strong>Date:</strong> ${data.bookingDate}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Purpose:</strong> ${data.purpose}</p>
          <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        </div>
        <p><strong>Reason:</strong> ${
					data.rejectionReason || "No specific reason provided"
				}</p>
        <p>You can try booking a different time slot or contact the admin for more information.</p>
      ` +
				baseEndStyle
			);

		case "booking_cancelled":
			return (
				baseStyle +
				`
        <h2 style="color: #FFC107; margin-bottom: 20px;">🚫 Booking Cancelled</h2>
        <p>Dear <strong>${data.userName}</strong>,</p>
        <p>Your seminar hall booking has been cancelled as requested.</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Hall:</strong> ${data.hallName}</p>
          <p><strong>Date:</strong> ${data.bookingDate}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        </div>
        <p>If you need to book again, please use the app to make a new reservation.</p>
      ` +
				baseEndStyle
			);

		case "booking_reminder":
			return (
				baseStyle +
				`
        <h2 style="color: #007AFF; margin-bottom: 20px;">⏰ Booking Reminder</h2>
        <p>Dear <strong>${data.userName}</strong>,</p>
        <p>This is a friendly reminder about your upcoming seminar hall booking:</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Hall:</strong> ${data.hallName}</p>
          <p><strong>Date:</strong> ${data.bookingDate}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Purpose:</strong> ${data.purpose}</p>
          <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        </div>
        <p>Your booking is in <strong>${data.timeUntil}</strong>. Please arrive on time!</p>
      ` +
				baseEndStyle
			);

		default:
			return (
				baseStyle +
				`
        <h2 style="color: #007AFF; margin-bottom: 20px;">Notification</h2>
        <p>Dear User,</p>
        <p>You have received a notification from Amity Seminar Hall Booking System.</p>
        <p>Please check the app for more details.</p>
      ` +
				baseEndStyle
			);
	}
}
