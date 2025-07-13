"use client";

import { useState } from "react";

export default function SMTPTestPage() {
	const [isTestingConfig, setIsTestingConfig] = useState(false);
	const [isSendingTest, setIsSendingTest] = useState(false);
	const [testEmail, setTestEmail] = useState("");
	const [configResult, setConfigResult] = useState<any>(null);
	const [testResult, setTestResult] = useState<any>(null);

	const testConfiguration = async () => {
		setIsTestingConfig(true);
		try {
			const response = await fetch("/api/test-email");
			const result = await response.json();
			setConfigResult(result);
		} catch (error) {
			setConfigResult({
				success: false,
				error: "Failed to test configuration",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setIsTestingConfig(false);
		}
	};

	const sendTestEmail = async () => {
		if (!testEmail) return;

		setIsSendingTest(true);
		try {
			const response = await fetch("/api/test-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ testEmail }),
			});
			const result = await response.json();
			setTestResult(result);
		} catch (error) {
			setTestResult({
				success: false,
				error: "Failed to send test email",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setIsSendingTest(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-4xl mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-4">
						SMTP Configuration Test
					</h1>
					<p className="text-gray-600">
						Test your email configuration and send test emails
					</p>
				</div>

				<div className="space-y-6">
					{/* Configuration Test */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
							⚙️ Configuration Test
						</h2>
						<p className="text-gray-600 mb-4">
							Test if your SMTP configuration is valid and can connect to the
							email server
						</p>

						<button
							onClick={testConfiguration}
							disabled={isTestingConfig}
							className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium"
						>
							{isTestingConfig ? "Testing..." : "Test SMTP Configuration"}
						</button>

						{configResult && (
							<div
								className={`mt-4 p-4 rounded-md ${
									configResult.success
										? "bg-green-50 border border-green-200"
										: "bg-red-50 border border-red-200"
								}`}
							>
								<div className="flex items-center gap-2">
									<span
										className={
											configResult.success ? "text-green-600" : "text-red-600"
										}
									>
										{configResult.success ? "✅" : "❌"}
									</span>
									<span className="font-medium">
										{configResult.success ? "Success" : "Error"}:{" "}
										{configResult.message}
									</span>
								</div>
								{configResult.environment && (
									<div className="mt-2 text-sm text-gray-600">
										<p>
											<strong>Environment:</strong>{" "}
											{configResult.environment.nodeEnv}
										</p>
										<p>
											<strong>SMTP User:</strong>{" "}
											{configResult.environment.hasSmtpUser
												? "✓ Configured"
												: "✗ Missing"}
										</p>
										<p>
											<strong>SMTP Password:</strong>{" "}
											{configResult.environment.hasSmtpPassword
												? "✓ Configured"
												: "✗ Missing"}
										</p>
										<p>
											<strong>Email Provider:</strong>{" "}
											{configResult.environment.emailProvider}
										</p>
									</div>
								)}
								{configResult.details && (
									<div className="mt-2 text-sm text-red-600">
										<strong>Details:</strong> {configResult.details}
									</div>
								)}
							</div>
						)}
					</div>

					{/* Test Email */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
							📧 Send Test Email
						</h2>
						<p className="text-gray-600 mb-4">
							Send a test booking confirmation email to verify everything is
							working
						</p>

						<div className="flex gap-4 mb-4">
							<input
								type="email"
								placeholder="Enter test email address"
								value={testEmail}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setTestEmail(e.target.value)
								}
								className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<button
								onClick={sendTestEmail}
								disabled={isSendingTest || !testEmail}
								className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium"
							>
								{isSendingTest ? "Sending..." : "Send Test Email"}
							</button>
						</div>

						{testResult && (
							<div
								className={`mt-4 p-4 rounded-md ${
									testResult.success
										? "bg-green-50 border border-green-200"
										: "bg-red-50 border border-red-200"
								}`}
							>
								<div className="flex items-center gap-2">
									<span
										className={
											testResult.success ? "text-green-600" : "text-red-600"
										}
									>
										{testResult.success ? "✅" : "❌"}
									</span>
									<span className="font-medium">
										{testResult.success ? "Success" : "Error"}:{" "}
										{testResult.message}
									</span>
								</div>
								{testResult.result && (
									<div className="mt-2 text-sm text-gray-600">
										<pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded text-xs overflow-x-auto">
											{JSON.stringify(testResult.result, null, 2)}
										</pre>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Setup Instructions */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-semibold mb-4">
							📋 Setup Instructions
						</h2>
						<p className="text-gray-600 mb-4">
							How to configure your SMTP settings
						</p>

						<div className="space-y-4">
							<div>
								<h3 className="font-semibold mb-2">For Gmail SMTP:</h3>
								<ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 mb-2">
									<li>Enable 2-factor authentication on your Gmail account</li>
									<li>Go to your Google Account settings</li>
									<li>Navigate to Security → App passwords</li>
									<li>Generate an app password for "Mail"</li>
									<li>
										Update your{" "}
										<code className="bg-gray-100 px-1 rounded">.env.local</code>{" "}
										file with:
									</li>
								</ol>
								<pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
									{`GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_PASSWORD=your-app-password`}
								</pre>
							</div>

							<div>
								<h3 className="font-semibold mb-2">
									For Other SMTP Providers:
								</h3>
								<p className="text-sm text-gray-600 mb-2">
									Add these environment variables to your{" "}
									<code className="bg-gray-100 px-1 rounded">.env.local</code>{" "}
									file:
								</p>
								<pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
									{`EMAIL_PROVIDER=generic
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourprovider.com
SMTP_PASSWORD=your-password`}
								</pre>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
