"use client";

import { useEffect } from "react";
import { Download, Smartphone, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { APP_CONFIG } from "@/lib/config";

export default function AndroidDownloadPage() {
	const isDevelopment = APP_CONFIG.isDevelopment;
	const hasPlayStoreUrl = APP_CONFIG.urls.playStore;

	useEffect(() => {
		if (!isDevelopment && hasPlayStoreUrl) {
			// Auto-redirect to Play Store after 3 seconds (only in production)
			const timer = setTimeout(() => {
				window.location.href = hasPlayStoreUrl;
			}, 3000);

			return () => clearTimeout(timer);
		}
	}, [isDevelopment, hasPlayStoreUrl]);

	const handleDirectDownload = () => {
		if (isDevelopment) {
			// In development, try to open the app via scheme
			window.location.href = APP_CONFIG.urls.localAndroid + "download";
		} else if (hasPlayStoreUrl) {
			window.location.href = hasPlayStoreUrl;
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="max-w-md w-full">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 glass-effect">
						<Download className="w-10 h-10 text-white" />
					</div>
					<h1 className="text-3xl font-bold text-white mb-2 text-shadow">
						Download for Android
					</h1>
					<p className="text-white/90">
						Get the Amity Seminar Hall Booking app
					</p>
				</div>

				{/* Main Card */}
				<div className="glass-effect rounded-2xl p-8 text-center">
					{isDevelopment ? (
						// Development Mode Content
						<div className="mb-6">
							<AlertCircle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
							<h2 className="text-2xl font-semibold text-white mb-2">
								Development Mode
							</h2>
							<p className="text-white/80">
								This will attempt to open your local development app. Make sure
								your Expo/React Native app is running.
							</p>
						</div>
					) : hasPlayStoreUrl ? (
						// Production Mode with Play Store URL
						<div className="mb-6">
							<Smartphone className="w-16 h-16 text-green-400 mx-auto mb-4" />
							<h2 className="text-2xl font-semibold text-white mb-2">
								Redirecting to Play Store...
							</h2>
							<p className="text-white/80">
								You will be automatically redirected to the Google Play Store to
								download the app.
							</p>
						</div>
					) : (
						// No Play Store URL configured
						<div className="mb-6">
							<AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
							<h2 className="text-2xl font-semibold text-white mb-2">
								App Not Yet Published
							</h2>
							<p className="text-white/80">
								The app is not yet available on the Play Store. Please contact
								your administrator.
							</p>
						</div>
					)}

					<div className="space-y-4">
						<button
							onClick={handleDirectDownload}
							className={`w-full ${
								isDevelopment
									? "bg-blue-600 hover:bg-blue-700"
									: hasPlayStoreUrl
									? "bg-green-600 hover:bg-green-700"
									: "bg-gray-600 cursor-not-allowed"
							} transition-colors rounded-lg p-4 text-white font-semibold flex items-center justify-center`}
							disabled={!isDevelopment && !hasPlayStoreUrl}
						>
							<Download className="w-5 h-5 mr-2" />
							{isDevelopment
								? "Open Development App"
								: hasPlayStoreUrl
								? "Download from Play Store"
								: "Not Available"}
						</button>

						<Link
							href="/"
							className="block w-full bg-white/10 hover:bg-white/20 transition-colors rounded-lg p-3 text-white font-medium"
						>
							<ArrowLeft className="w-5 h-5 inline mr-2" />
							Back to Home
						</Link>
					</div>

					{/* Instructions */}
					<div className="border-t border-white/20 pt-6 mt-6 text-left">
						<h3 className="text-white font-semibold mb-3">
							{isDevelopment
								? "Development Instructions:"
								: "Installation Instructions:"}
						</h3>
						{isDevelopment ? (
							<ol className="text-white/80 text-sm space-y-2">
								<li>
									1. Make sure your Expo/React Native development server is
									running
								</li>
								<li>2. Tap "Open Development App" above</li>
								<li>
									3. If the app doesn't open, check your deep link configuration
								</li>
								<li>4. Test the email verification flow in development</li>
							</ol>
						) : hasPlayStoreUrl ? (
							<ol className="text-white/80 text-sm space-y-2">
								<li>1. Tap "Download from Play Store" above</li>
								<li>2. Install the app from Google Play Store</li>
								<li>3. Open the app and sign in with your university email</li>
								<li>4. Start booking seminar halls!</li>
							</ol>
						) : (
							<ol className="text-white/80 text-sm space-y-2">
								<li>1. The app is currently in development</li>
								<li>2. Contact your administrator for access</li>
								<li>3. Check back later for the official release</li>
							</ol>
						)}
					</div>
				</div>

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
