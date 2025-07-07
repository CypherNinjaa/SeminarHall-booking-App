"use client";

import { useEffect } from "react";
import { Download, Smartphone, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { APP_CONFIG } from "@/lib/config";

export default function IOSDownloadPage() {
	const isDevelopment = APP_CONFIG.isDevelopment;
	const hasAppStoreUrl = APP_CONFIG.urls.appStore;

	useEffect(() => {
		if (!isDevelopment && hasAppStoreUrl) {
			// Auto-redirect to App Store after 3 seconds (only in production)
			const timer = setTimeout(() => {
				window.location.href = hasAppStoreUrl;
			}, 3000);

			return () => clearTimeout(timer);
		}
	}, [isDevelopment, hasAppStoreUrl]);

	const handleDirectDownload = () => {
		if (isDevelopment) {
			// In development, try to open the app via scheme
			window.location.href = APP_CONFIG.urls.localIOS + "download";
		} else if (hasAppStoreUrl) {
			window.location.href = hasAppStoreUrl;
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
						Download for iOS
					</h1>
					<p className="text-white/90">
						Get the Amity Seminar Hall Booking app
					</p>
				</div>

				{/* Main Card */}
				<div className="glass-effect rounded-2xl p-8 text-center">
					<div className="mb-6">
						<Smartphone className="w-16 h-16 text-blue-400 mx-auto mb-4" />
						<h2 className="text-2xl font-semibold text-white mb-2">
							Redirecting to App Store...
						</h2>
						<p className="text-white/80">
							You will be automatically redirected to the Apple App Store to
							download the app.
						</p>
					</div>

					<div className="space-y-4">
						<button
							onClick={handleDirectDownload}
							className="w-full bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg p-4 text-white font-semibold flex items-center justify-center"
						>
							<Download className="w-5 h-5 mr-2" />
							Download from App Store
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
							Installation Instructions:
						</h3>
						<ol className="text-white/80 text-sm space-y-2">
							<li>1. Tap "Download from App Store" above</li>
							<li>2. Install the app from Apple App Store</li>
							<li>3. Open the app and sign in with your university email</li>
							<li>4. Start booking seminar halls!</li>
						</ol>
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
