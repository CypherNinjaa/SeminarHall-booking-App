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
		const verifyToken = async () => {
			if (!searchParams) {
				setState("invalid");
				setMessage("Invalid verification link. Missing parameters.");
				return;
			}

			const token = searchParams.get("token");
			const email = searchParams.get("email");
			const type = searchParams.get("type") || "email"; // Default to email verification
			const next = searchParams.get("next"); // Optional redirect parameter

			if (!token) {
				setState("invalid");
				setMessage("Invalid verification link. Missing token.");
				return;
			}

			try {
				let result;
				let successMessage = "";
				let redirectScheme = "verified";

				// Handle different authentication types
				switch (type) {
					case "signup":
					case "email":
					case "email_verification":
						if (!email) {
							setState("invalid");
							setMessage("Email address is required for verification.");
							return;
						}
						result = await supabase.auth.verifyOtp({
							email,
							token,
							type: "email",
						});
						successMessage =
							"Email verified successfully! Welcome to Amity Seminar Hall Booking.";
						redirectScheme = "verified";
						break;

					case "recovery":
					case "password_reset":
						result = await supabase.auth.verifyOtp({
							email: email || "",
							token,
							type: "recovery",
						});
						successMessage =
							"Password reset verified! Please set your new password in the app.";
						redirectScheme = "password-reset";
						break;

					case "magiclink":
					case "magic_link":
						result = await supabase.auth.verifyOtp({
							email: email || "",
							token,
							type: "magiclink",
						});
						successMessage = "Magic link verified! You are now signed in.";
						redirectScheme = "magic-login";
						break;

					case "email_change":
					case "change_email":
						if (!email) {
							setState("invalid");
							setMessage(
								"Email address is required for email change verification."
							);
							return;
						}
						result = await supabase.auth.verifyOtp({
							email,
							token,
							type: "email_change",
						});
						successMessage =
							"Email change verified successfully! Your new email is now active.";
						redirectScheme = "email-changed";
						break;

					case "invite":
					case "invitation":
						if (!email) {
							setState("invalid");
							setMessage(
								"Email address is required for invitation acceptance."
							);
							return;
						}
						result = await supabase.auth.verifyOtp({
							email,
							token,
							type: "invite",
						});
						successMessage =
							"Invitation accepted! Welcome to Amity Seminar Hall Booking.";
						redirectScheme = "invited";
						break;

					default:
						// Fallback to email verification
						if (!email) {
							setState("invalid");
							setMessage("Email address is required for verification.");
							return;
						}
						result = await supabase.auth.verifyOtp({
							email,
							token,
							type: "email",
						});
						successMessage = "Verification successful!";
						redirectScheme = "verified";
				}

				const { error } = result;

				if (error) {
					if (
						error.message.includes("expired") ||
						error.message.includes("invalid")
					) {
						setState("expired");
						setMessage(
							"This verification link has expired or is invalid. Please request a new one."
						);
					} else if (error.message.includes("already")) {
						setState("success");
						setMessage(
							"This link has already been used. You can now use the app."
						);
						// Still redirect to app even if already verified
						setTimeout(() => {
							redirectToApp(redirectScheme, next);
						}, 2000);
					} else {
						setState("error");
						setMessage(
							error.message ||
								"Verification failed. Please try again or contact support."
						);
					}
				} else {
					setState("success");
					setMessage(successMessage);

					// Start countdown for app redirect
					const countdownInterval = setInterval(() => {
						setCountdown((prev) => {
							if (prev <= 1) {
								clearInterval(countdownInterval);
								redirectToApp(redirectScheme, next);
								return 0;
							}
							return prev - 1;
						});
					}, 1000);
				}
			} catch (error) {
				setState("error");
				setMessage("An unexpected error occurred. Please try again.");
				console.error("Verification error:", error);
			}
		};

		verifyToken();
	}, [searchParams]);

	const redirectToApp = (action: string = "verified", next?: string | null) => {
		const isDevelopment = APP_CONFIG.isDevelopment;
		const appScheme = APP_CONFIG.scheme;

		// Create deep link with action and optional next parameter
		let deepLink = `${appScheme}://${action}`;
		if (next) {
			deepLink += `?next=${encodeURIComponent(next)}`;
		}

		// Try to open the app with deep link
		window.location.href = deepLink;

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
		if (!searchParams) return;

		const type = searchParams.get("type") || "email";
		const next = searchParams.get("next");

		let redirectScheme = "verified";
		switch (type) {
			case "recovery":
			case "password_reset":
				redirectScheme = "password-reset";
				break;
			case "magiclink":
			case "magic_link":
				redirectScheme = "magic-login";
				break;
			case "email_change":
			case "change_email":
				redirectScheme = "email-changed";
				break;
			case "invite":
			case "invitation":
				redirectScheme = "invited";
				break;
			default:
				redirectScheme = "verified";
		}

		redirectToApp(redirectScheme, next);
	};

	const handleRequestNewLink = async () => {
		if (!searchParams) return;

		const email = searchParams.get("email");
		const type = searchParams.get("type") || "email";

		if (!email) {
			setMessage("Email address is required to resend verification link.");
			return;
		}

		try {
			let result;

			switch (type) {
				case "signup":
				case "email":
				case "email_verification":
					result = await supabase.auth.resend({
						type: "signup",
						email: email,
					});
					break;

				case "recovery":
				case "password_reset":
					result = await supabase.auth.resetPasswordForEmail(email, {
						redirectTo: `${window.location.origin}/verify`,
					});
					break;

				default:
					result = await supabase.auth.resend({
						type: "signup",
						email: email,
					});
			}

			if (!result.error) {
				setMessage(
					"A new verification link has been sent to your email address."
				);
			} else {
				setMessage(
					result.error.message ||
						"Failed to send new verification link. Please try again."
				);
			}
		} catch (error) {
			setMessage("Failed to send new verification link. Please try again.");
			console.error("Resend error:", error);
		}
	};

	const getVerificationTypeInfo = () => {
		if (!searchParams)
			return {
				title: "Email Verification",
				loadingText: "Verifying email...",
				icon: "📧",
				color: "text-blue-400",
			};

		const type = searchParams.get("type") || "email";

		switch (type) {
			case "recovery":
			case "password_reset":
				return {
					title: "Password Reset",
					loadingText: "Verifying password reset request...",
					icon: "🔒",
					color: "text-red-400",
				};
			case "magiclink":
			case "magic_link":
				return {
					title: "Magic Link Login",
					loadingText: "Signing you in...",
					icon: "✨",
					color: "text-purple-400",
				};
			case "email_change":
			case "change_email":
				return {
					title: "Email Change",
					loadingText: "Verifying email change...",
					icon: "📧",
					color: "text-amber-400",
				};
			case "invite":
			case "invitation":
				return {
					title: "Invitation",
					loadingText: "Processing invitation...",
					icon: "🎉",
					color: "text-green-400",
				};
			default:
				return {
					title: "Email Verification",
					loadingText: "Verifying your email...",
					icon: "📝",
					color: "text-blue-400",
				};
		}
	};

	const renderContent = () => {
		const typeInfo = getVerificationTypeInfo();
		switch (state) {
			case "loading":
				return (
					<div className="text-center">
						<Loader2
							className={`w-16 h-16 mx-auto mb-4 animate-spin ${typeInfo.color}`}
						/>
						<h2 className="text-2xl font-semibold text-white mb-2">
							{typeInfo.icon} {typeInfo.title}
						</h2>
						<p className="text-white/80">{typeInfo.loadingText}</p>
					</div>
				);

			case "success":
				return (
					<div className="text-center">
						<CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4 animate-bounce-gentle" />
						<h2 className="text-2xl font-semibold text-white mb-2">
							{typeInfo.icon} {typeInfo.title} Complete!
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
