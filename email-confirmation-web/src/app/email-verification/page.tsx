"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function EmailVerificationContent() {
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading"
	);
	const [message, setMessage] = useState("");
	const searchParams = useSearchParams();

	useEffect(() => {
		const handleEmailVerification = async () => {
			try {
				// First, check URL hash for tokens (newer Supabase method)
				const hash = window.location.hash;
				const hashParams = new URLSearchParams(hash.substring(1));
				let accessToken: string | null = hashParams.get("access_token");
				let refreshToken: string | null = hashParams.get("refresh_token");
				let type: string | null = hashParams.get("type");

				// Fallback: check search params for older method
				if (!accessToken) {
					accessToken = searchParams?.get("access_token") || null;
					refreshToken = searchParams?.get("refresh_token") || null;
					type = searchParams?.get("type") || null;
				}

				// Also check for token-based verification
				const token = searchParams?.get("token");
				if (!type) {
					type = searchParams?.get("type") || null;
				}

				console.log("Verification tokens found:", {
					accessToken: !!accessToken,
					refreshToken: !!refreshToken,
					token: !!token,
					type,
				});

				if (type === "signup") {
					let verificationResult;

					// Method 1: Session-based verification (newer Supabase method using hash)
					if (accessToken && refreshToken) {
						console.log("Using session-based verification");
						verificationResult = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});
					}
					// Method 2: Token-based verification (older method)
					else if (token) {
						console.log("Using token-based verification");
						verificationResult = await supabase.auth.verifyOtp({
							token_hash: token,
							type: "signup",
						});
					} else {
						throw new Error("No verification tokens found");
					}

					if (verificationResult?.error) {
						console.error("Verification error:", verificationResult.error);
						setStatus("error");
						setMessage("Email verification failed. Please try again.");
					} else {
						setStatus("success");
						setMessage(
							"Email verified successfully! Welcome to Amity Seminar Hall Booking."
						);

						// Redirect to mobile app after 3 seconds
						setTimeout(() => {
							redirectToApp("seminarhallbooking://auth/email-verified", "/");
						}, 3000);
					}
				} else {
					setStatus("error");
					setMessage(
						"Invalid verification link. Please check your email and try again."
					);
				}
			} catch (error) {
				console.error("Verification error:", error);
				setStatus("error");
				setMessage("An error occurred during verification. Please try again.");
			}
		};

		if (searchParams) {
			handleEmailVerification();
		}
	}, [searchParams]);

	// Redirect to mobile app with fallback
	const redirectToApp = (deepLink: string, fallbackUrl = "/") => {
		// Check if user is on mobile
		const isMobile =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent
			);

		if (isMobile) {
			// Try to open the app
			window.location.href = deepLink;

			// Fallback to website if app is not installed (after 2 seconds)
			setTimeout(() => {
				// If still on this page, redirect to fallback
				window.location.href = fallbackUrl;
			}, 2000);
		} else {
			// Desktop users stay on website
			window.location.href = fallbackUrl;
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
			<div className="max-w-md w-full space-y-8">
				<div className="bg-white rounded-2xl shadow-xl p-8 text-center">
					{/* Header */}
					<div className="mb-8">
						<div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
							{status === "loading" && (
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
							)}
							{status === "success" && (
								<svg
									className="h-8 w-8 text-green-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							)}
							{status === "error" && (
								<svg
									className="h-8 w-8 text-red-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							)}
						</div>
						<h2 className="text-2xl font-bold text-gray-900">
							{status === "loading" && "Verifying Email..."}
							{status === "success" && "Email Verified!"}
							{status === "error" && "Verification Failed"}
						</h2>
					</div>

					{/* Message */}
					<div className="mb-8">
						<p
							className={`text-sm ${
								status === "success"
									? "text-green-800"
									: status === "error"
									? "text-red-800"
									: "text-gray-600"
							}`}
						>
							{message}
						</p>
					</div>

					{/* Success Actions */}
					{status === "success" && (
						<div className="space-y-4">
							<div className="bg-green-50 border border-green-200 rounded-lg p-4">
								<p className="text-sm text-green-800">
									<strong>✅ Success!</strong> Your email has been verified.
									<br />
									<span className="text-xs">
										📱 Redirecting to mobile app in 3 seconds...
									</span>
								</p>
							</div>
							<button
								onClick={() =>
									redirectToApp("seminarhallbooking://auth/email-verified", "/")
								}
								className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
							>
								🚀 Return to Mobile App
							</button>
						</div>
					)}

					{/* Error Actions */}
					{status === "error" && (
						<div className="space-y-4">
							<div className="bg-red-50 border border-red-200 rounded-lg p-4">
								<p className="text-sm text-red-800">
									<strong>❌ Error:</strong> {message}
								</p>
							</div>
							<button
								onClick={() => (window.location.href = "/")}
								className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
							>
								Back to Home
							</button>
						</div>
					)}
				</div>

				{/* App Info */}
				<div className="text-center text-sm text-gray-500">
					<p>Amity Seminar Hall Booking System</p>
					<p>Email verification powered by Supabase</p>
				</div>
			</div>
		</div>
	);
}

export default function EmailVerificationPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
					<div className="max-w-md w-full space-y-8">
						<div className="bg-white rounded-2xl shadow-xl p-8 text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
							<p className="text-gray-600">Loading verification...</p>
						</div>
					</div>
				</div>
			}
		>
			<EmailVerificationContent />
		</Suspense>
	);
}
