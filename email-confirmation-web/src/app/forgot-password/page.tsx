"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function PasswordResetContent() {
	const [status, setStatus] = useState<
		"loading" | "form" | "success" | "error"
	>("loading");
	const [message, setMessage] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [passwordStrength, setPasswordStrength] = useState({
		score: 0,
		label: "",
		color: "",
		requirements: {
			length: false,
			uppercase: false,
			lowercase: false,
			number: false,
			special: false,
		},
	});
	const searchParams = useSearchParams();

	useEffect(() => {
		const handlePasswordReset = async () => {
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

				console.log("Password reset tokens found:", {
					accessToken: !!accessToken,
					refreshToken: !!refreshToken,
					token: !!token,
					type,
				});

				if (type === "recovery") {
					let resetResult;

					// Method 1: Session-based verification (newer Supabase method using hash)
					if (accessToken && refreshToken) {
						console.log("Using session-based password reset");
						resetResult = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});
					}
					// Method 2: Token-based verification (older method)
					else if (token) {
						console.log("Using token-based password reset");
						resetResult = await supabase.auth.verifyOtp({
							token_hash: token,
							type: "recovery",
						});
					} else {
						throw new Error("No reset tokens found");
					}

					if (resetResult?.error) {
						console.error("Password reset error:", resetResult.error);
						setStatus("error");
						setMessage(
							"Invalid or expired reset link. Please request a new password reset."
						);
					} else {
						setStatus("form");
						setMessage("Please enter your new password below.");
					}
				} else {
					setStatus("error");
					setMessage(
						"Please request a password reset from your mobile app to get started."
					);
				}
			} catch (error) {
				console.error("Verification error:", error);
				setStatus("error");
				setMessage("An error occurred during verification. Please try again.");
			}
		};

		if (searchParams) {
			handlePasswordReset();
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

	// Password strength checker
	const checkPasswordStrength = (password: string) => {
		const requirements = {
			length: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /\d/.test(password),
			special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
		};

		const score = Object.values(requirements).filter(Boolean).length;
		let label = "";
		let color = "";

		switch (score) {
			case 0:
			case 1:
				label = "Very Weak";
				color = "text-red-600 bg-red-50 border-red-200";
				break;
			case 2:
				label = "Weak";
				color = "text-orange-600 bg-orange-50 border-orange-200";
				break;
			case 3:
				label = "Fair";
				color = "text-yellow-600 bg-yellow-50 border-yellow-200";
				break;
			case 4:
				label = "Good";
				color = "text-blue-600 bg-blue-50 border-blue-200";
				break;
			case 5:
				label = "Strong";
				color = "text-green-600 bg-green-50 border-green-200";
				break;
		}

		setPasswordStrength({ score, label, color, requirements });
	};

	const handlePasswordUpdate = async (e: React.FormEvent) => {
		e.preventDefault();

		if (newPassword !== confirmPassword) {
			setMessage("Passwords do not match");
			return;
		}

		if (newPassword.length < 6) {
			setMessage("Password must be at least 6 characters long");
			return;
		}

		if (passwordStrength.score < 4) {
			setMessage("Password must be at least 'Good' strength to continue");
			return;
		}

		setLoading(true);

		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				setMessage(error.message);
				setStatus("error");
			} else {
				setStatus("success");
				setMessage(
					"Password updated successfully! You can now sign in with your new password."
				);
				setNewPassword("");
				setConfirmPassword("");

				// Redirect to mobile app after 3 seconds
				setTimeout(() => {
					redirectToApp(
						"seminarhallbooking://auth/password-reset-success",
						"/"
					);
				}, 3000);
			}
		} catch (err) {
			setMessage("An unexpected error occurred. Please try again.");
			setStatus("error");
		} finally {
			setLoading(false);
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
							{status === "form" && (
								<svg
									className="h-8 w-8 text-blue-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									/>
								</svg>
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
							{status === "loading" && "Processing..."}
							{status === "form" && "Reset Your Password"}
							{status === "success" && "Password Updated!"}
							{status === "error" && "Reset Failed"}
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

					{/* Password Reset Form */}
					{status === "form" && (
						<form onSubmit={handlePasswordUpdate} className="space-y-6">
							<div>
								<label
									htmlFor="newPassword"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									New Password
								</label>
								<input
									id="newPassword"
									name="newPassword"
									type="password"
									required
									value={newPassword}
									onChange={(e) => {
										setNewPassword(e.target.value);
										checkPasswordStrength(e.target.value);
									}}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="Enter your new password"
									minLength={8}
								/>

								{/* Password Strength Indicator */}
								{newPassword && (
									<div className="mt-3 space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-gray-700">
												Password Strength:
											</span>
											<span
												className={`text-sm font-medium px-2 py-1 rounded-full border ${passwordStrength.color}`}
											>
												{passwordStrength.label}
											</span>
										</div>

										{/* Strength Bar */}
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className={`h-2 rounded-full transition-all duration-300 ${
													passwordStrength.score === 1
														? "bg-red-500 w-1/5"
														: passwordStrength.score === 2
														? "bg-orange-500 w-2/5"
														: passwordStrength.score === 3
														? "bg-yellow-500 w-3/5"
														: passwordStrength.score === 4
														? "bg-blue-500 w-4/5"
														: passwordStrength.score === 5
														? "bg-green-500 w-full"
														: "bg-gray-300 w-0"
												}`}
											></div>
										</div>

										{/* Requirements Checklist */}
										<div className="grid grid-cols-1 gap-1 text-xs">
											<div
												className={`flex items-center ${
													passwordStrength.requirements.length
														? "text-green-600"
														: "text-gray-400"
												}`}
											>
												<span className="mr-2">
													{passwordStrength.requirements.length ? "✅" : "⭕"}
												</span>
												At least 8 characters
											</div>
											<div
												className={`flex items-center ${
													passwordStrength.requirements.uppercase
														? "text-green-600"
														: "text-gray-400"
												}`}
											>
												<span className="mr-2">
													{passwordStrength.requirements.uppercase
														? "✅"
														: "⭕"}
												</span>
												One uppercase letter (A-Z)
											</div>
											<div
												className={`flex items-center ${
													passwordStrength.requirements.lowercase
														? "text-green-600"
														: "text-gray-400"
												}`}
											>
												<span className="mr-2">
													{passwordStrength.requirements.lowercase
														? "✅"
														: "⭕"}
												</span>
												One lowercase letter (a-z)
											</div>
											<div
												className={`flex items-center ${
													passwordStrength.requirements.number
														? "text-green-600"
														: "text-gray-400"
												}`}
											>
												<span className="mr-2">
													{passwordStrength.requirements.number ? "✅" : "⭕"}
												</span>
												One number (0-9)
											</div>
											<div
												className={`flex items-center ${
													passwordStrength.requirements.special
														? "text-green-600"
														: "text-gray-400"
												}`}
											>
												<span className="mr-2">
													{passwordStrength.requirements.special ? "✅" : "⭕"}
												</span>
												One special character (!@#$%^&*)
											</div>
										</div>
									</div>
								)}
							</div>

							<div>
								<label
									htmlFor="confirmPassword"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Confirm Password
								</label>
								<input
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									required
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="Confirm your new password"
									minLength={8}
								/>
							</div>

							<button
								type="submit"
								disabled={
									loading ||
									passwordStrength.score < 4 ||
									!newPassword ||
									!confirmPassword
								}
								className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
									loading ||
									passwordStrength.score < 4 ||
									!newPassword ||
									!confirmPassword
										? "bg-gray-400 cursor-not-allowed opacity-50"
										: "bg-blue-600 hover:bg-blue-700"
								}`}
							>
								{loading ? (
									<div className="flex items-center">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
										Updating Password...
									</div>
								) : passwordStrength.score < 4 ? (
									"Password Must Be Stronger"
								) : (
									"Update Password"
								)}
							</button>

							{/* Password Match Indicator */}
							{confirmPassword && (
								<div className="mt-2">
									<div
										className={`flex items-center text-sm ${
											newPassword === confirmPassword
												? "text-green-600"
												: "text-red-600"
										}`}
									>
										<span className="mr-2">
											{newPassword === confirmPassword ? "✅" : "❌"}
										</span>
										{newPassword === confirmPassword
											? "Passwords match"
											: "Passwords do not match"}
									</div>
								</div>
							)}
						</form>
					)}

					{/* Success Actions */}
					{status === "success" && (
						<div className="space-y-4">
							<div className="bg-green-50 border border-green-200 rounded-lg p-4">
								<p className="text-sm text-green-800">
									<strong>✅ Success!</strong> Your password has been updated.
									<br />
									<span className="text-xs">
										📱 Redirecting to mobile app in 3 seconds...
									</span>
								</p>
							</div>
							<button
								onClick={() =>
									redirectToApp(
										"seminarhallbooking://auth/password-reset-success",
										"/"
									)
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

export default function ForgotPasswordPage() {
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
			<PasswordResetContent />
		</Suspense>
	);
}
