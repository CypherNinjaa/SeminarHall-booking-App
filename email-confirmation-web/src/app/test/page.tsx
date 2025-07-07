"use client";

import { useState } from "react";
import { Copy, ExternalLink, TestTube } from "lucide-react";

export default function TestPage() {
	const [baseUrl] = useState("https://seminarhall-ivory.vercel.app");
	const [copiedUrl, setCopiedUrl] = useState("");

	const testCases = [
		{
			name: "Email Verification (Signup)",
			type: "signup",
			description: "Test email confirmation after user registration",
			icon: "📝",
			color: "bg-blue-500",
		},
		{
			name: "Password Reset",
			type: "recovery",
			description: "Test password reset verification",
			icon: "🔒",
			color: "bg-red-500",
		},
		{
			name: "Magic Link Login",
			type: "magiclink",
			description: "Test passwordless login",
			icon: "✨",
			color: "bg-purple-500",
		},
		{
			name: "Email Change Confirmation",
			type: "email_change",
			description: "Test email address change verification",
			icon: "📧",
			color: "bg-amber-500",
		},
		{
			name: "User Invitation",
			type: "invite",
			description: "Test user invitation acceptance",
			icon: "🎉",
			color: "bg-green-500",
		},
		{
			name: "Reauthentication",
			type: "reauthentication",
			description: "Test security reauthentication (token-based)",
			icon: "🔐",
			color: "bg-gray-600",
		},
	];

	const generateTestUrl = (type: string, includeEmail = true) => {
		const params = new URLSearchParams();
		params.set("token", "test_token_123456");
		params.set("type", type);

		if (includeEmail) {
			params.set("email", "test@amitypatna.edu.in");
		}

		// Add extra params for specific types
		if (type === "email_change") {
			params.set("new_email", "newemail@amitypatna.edu.in");
		}

		return `${baseUrl}/verify?${params.toString()}`;
	};

	const copyToClipboard = async (url: string) => {
		try {
			await navigator.clipboard.writeText(url);
			setCopiedUrl(url);
			setTimeout(() => setCopiedUrl(""), 2000);
		} catch (err) {
			console.error("Failed to copy: ", err);
		}
	};

	const openInNewTab = (url: string) => {
		window.open(url, "_blank");
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-8">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12">
					<TestTube className="w-16 h-16 text-white mx-auto mb-4" />
					<h1 className="text-4xl font-bold text-white mb-4">
						🧪 Authentication Flow Tester
					</h1>
					<p className="text-xl text-white/80 mb-2">
						Amity Seminar Hall Booking - Email Verification System
					</p>
					<p className="text-white/60">
						Test all authentication flows with simulated URLs
					</p>
				</div>

				{/* Test Cases Grid */}
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{testCases.map((testCase) => {
						const testUrl = generateTestUrl(testCase.type);
						const isCopied = copiedUrl === testUrl;

						return (
							<div
								key={testCase.type}
								className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
							>
								{/* Header */}
								<div className="flex items-center mb-4">
									<div
										className={`${testCase.color} w-12 h-12 rounded-lg flex items-center justify-center mr-4`}
									>
										<span className="text-white text-xl">{testCase.icon}</span>
									</div>
									<div>
										<h3 className="text-lg font-semibold text-white">
											{testCase.name}
										</h3>
									</div>
								</div>

								{/* Description */}
								<p className="text-white/70 text-sm mb-4">
									{testCase.description}
								</p>

								{/* URL Display */}
								<div className="bg-black/20 rounded-lg p-3 mb-4">
									<code className="text-xs text-white/80 break-all">
										{testUrl}
									</code>
								</div>

								{/* Action Buttons */}
								<div className="flex gap-2">
									<button
										onClick={() => copyToClipboard(testUrl)}
										className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
											isCopied
												? "bg-green-500 text-white"
												: "bg-white/20 text-white hover:bg-white/30"
										}`}
									>
										<Copy className="w-4 h-4" />
										{isCopied ? "Copied!" : "Copy URL"}
									</button>

									<button
										onClick={() => openInNewTab(testUrl)}
										className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
									>
										<ExternalLink className="w-4 h-4" />
										Test
									</button>
								</div>
							</div>
						);
					})}
				</div>

				{/* Information Section */}
				<div className="mt-12 bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
					<h2 className="text-2xl font-bold text-white mb-6">
						🔧 Test Instructions
					</h2>

					<div className="grid md:grid-cols-2 gap-8">
						{/* Expected Behaviors */}
						<div>
							<h3 className="text-lg font-semibold text-white mb-4">
								✅ Expected Behaviors:
							</h3>
							<ul className="space-y-2 text-white/80 text-sm">
								<li>• Different icons and colors for each auth type</li>
								<li>• Context-specific loading messages</li>
								<li>• Proper error handling for test tokens</li>
								<li>• Deep link generation with correct schemes</li>
								<li>• Fallback to app stores (production only)</li>
								<li>• Dynamic success messages</li>
							</ul>
						</div>

						{/* Deep Link Schemes */}
						<div>
							<h3 className="text-lg font-semibold text-white mb-4">
								🔗 Deep Link Schemes:
							</h3>
							<ul className="space-y-2 text-white/80 text-sm font-mono">
								<li>• amityseminarhall://verified (email confirmation)</li>
								<li>• amityseminarhall://password-reset</li>
								<li>• amityseminarhall://magic-login</li>
								<li>• amityseminarhall://email-changed</li>
								<li>• amityseminarhall://invited</li>
								<li>• amityseminarhall://verified (fallback)</li>
							</ul>
						</div>
					</div>

					{/* Production vs Development */}
					<div className="mt-6 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
						<h4 className="text-yellow-200 font-semibold mb-2">
							⚠️ Development Mode Active
						</h4>
						<p className="text-yellow-100 text-sm">
							App store redirects are disabled. Test URLs use dummy tokens and
							will show appropriate error states.
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="text-center mt-12">
					<p className="text-white/60 text-sm">
						© 2025 Amity University Patna - Seminar Hall Booking System
					</p>
				</div>
			</div>
		</div>
	);
}
