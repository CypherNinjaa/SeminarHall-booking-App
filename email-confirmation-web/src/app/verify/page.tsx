"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Mail, Loader2, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { APP_CONFIG } from "@/lib/config";

type VerificationState =
	| "loading"
	| "success"
	| "error"
	| "expired"
	| "invalid";

function VerifyContent() {
	const [state, setState] = useState<VerificationState>("loading");
	const [message, setMessage] = useState("");
	const [countdown, setCountdown] = useState(5);
	const searchParams = useSearchParams();

	useEffect(() => {
		const verifyEmail = async () => {
			const token = searchParams.get("token");
			const email = searchParams.get("email");
			const type = searchParams.get("type"); // 'email_verification' or 'password_reset'

			if (!token || !email) {
				setState("invalid");
				setMessage(
					"Invalid verification link. Please check your email and try again."
				);
				return;
			}

			try {
				// Verify the email with Supabase
				const { error } = await supabase.auth.verifyOtp({
					email,
					token,
					type: (type as any) || "email",
				});

				if (error) {
					if (error.message.includes("expired")) {
						setState("expired");
						setMessage(
							"This verification link has expired. Please request a new one."
						);
					} else {
						setState("error");
						setMessage(
							"Verification failed. Please try again or contact support."
						);
					}
				} else {
					setState("success");
					setMessage(
						"Email verified successfully! You can now access the Seminar Hall Booking app."
					);

					// Start countdown for app redirect
					const countdownInterval = setInterval(() => {
						setCountdown((prev) => {
							if (prev <= 1) {
								clearInterval(countdownInterval);
								// Redirect to app
								redirectToApp();
								return 0;
							}
							return prev - 1;
						});
					}, 1000);
				}
			} catch (error) {
				setState("error");
				setMessage("An unexpected error occurred. Please try again.");
			}
		};

		verifyEmail();
	}, [searchParams, supabase.auth]);

	const redirectToApp = () => {
		const isDevelopment = APP_CONFIG.isDevelopment;
		const appScheme = APP_CONFIG.scheme;

		// Try to open the app with deep link
		window.location.href = `${appScheme}://verified`;

		// In development, don't redirect to app store
		if (!isDevelopment) {
			// Fallback to app store after 2 seconds if app doesn't open (only in production)
			setTimeout(() => {
				const fallbackUrl =
					APP_CONFIG.urls.playStore || APP_CONFIG.urls.appStore;
				if (fallbackUrl) {
					window.location.href = fallbackUrl;
				}
			}, 2000);
		}
	};

	const handleManualRedirect = () => {
		redirectToApp();
	};

	const handleRequestNewLink = async () => {
		// Implementation for requesting new verification link
		const email = searchParams.get("email");
		if (email) {
			try {
				const { error } = await supabase.auth.resend({
					type: "signup",
					email: email,
				});

				if (!error) {
					setMessage("A new verification link has been sent to your email.");
				}
			} catch (error) {
				setMessage("Failed to send new verification link. Please try again.");
			}
		}
	};

	const renderContent = () => {
		switch (state) {
			case "loading":
				return (
					<div className="text-center">
						<Loader2 className="w-16 h-16 text-white mx-auto mb-4 animate-spin" />
						<h2 className="text-2xl font-semibold text-white mb-2">
							Verifying your email...
						</h2>
						<p className="text-white/80">
							Please wait while we verify your email address.
						</p>
					</div>
				);

			case "success":
				return (
					<div className="text-center">
						<CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4 animate-bounce-gentle" />
						<h2 className="text-2xl font-semibold text-white mb-2">
							Email Verified Successfully!
						</h2>
						<p className="text-white/80 mb-6">{message}</p>

						<div className="bg-white/10 rounded-lg p-4 mb-6">
							<div className="flex items-center justify-center mb-2">
								<Smartphone className="w-5 h-5 text-white/80 mr-2" />
								<span className="text-white/80">Redirecting to app in:</span>
							</div>
							<div className="text-3xl font-bold text-white">{countdown}</div>
						</div>

						<button
							onClick={handleManualRedirect}
							className="w-full bg-white/20 hover:bg-white/30 transition-colors rounded-lg p-3 text-white font-medium"
						>
							Open App Now
						</button>
					</div>
				);

			case "expired":
				return (
					<div className="text-center">
						<XCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
						<h2 className="text-2xl font-semibold text-white mb-2">
							Link Expired
						</h2>
						<p className="text-white/80 mb-6">{message}</p>

						<button
							onClick={handleRequestNewLink}
							className="w-full bg-white/20 hover:bg-white/30 transition-colors rounded-lg p-3 text-white font-medium"
						>
							Request New Verification Link
						</button>
					</div>
				);

			case "error":
			case "invalid":
				return (
					<div className="text-center">
						<XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
						<h2 className="text-2xl font-semibold text-white mb-2">
							Verification Failed
						</h2>
						<p className="text-white/80 mb-6">{message}</p>

						<div className="space-y-3">
							<button
								onClick={handleRequestNewLink}
								className="w-full bg-white/20 hover:bg-white/30 transition-colors rounded-lg p-3 text-white font-medium"
							>
								Request New Link
							</button>

							<a
								href="mailto:support@amitypatna.edu.in"
								className="block w-full bg-white/10 hover:bg-white/20 transition-colors rounded-lg p-3 text-white font-medium"
							>
								Contact Support
							</a>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="max-w-md w-full">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 glass-effect">
						<Mail className="w-10 h-10 text-white" />
					</div>
					<h1 className="text-3xl font-bold text-white mb-2 text-shadow">
						Amity University Patna
					</h1>
					<p className="text-white/90">Seminar Hall Booking System</p>
				</div>

				{/* Main Card */}
				<div className="glass-effect rounded-2xl p-8">{renderContent()}</div>

				{/* Footer */}
				<div className="text-center mt-8">
					<p className="text-white/60 text-sm">
						© 2025 Amity University Patna. All rights reserved.
					</p>
				</div>
			</div>
		</div>
	);
}

export default function VerifyPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
					<div className="glass-effect rounded-2xl p-8">
						<div className="flex items-center justify-center">
							<Loader2 className="w-8 h-8 animate-spin text-blue-400" />
							<span className="ml-3 text-white">Loading verification...</span>
						</div>
					</div>
				</div>
			}
		>
			<VerifyContent />
		</Suspense>
	);
}
