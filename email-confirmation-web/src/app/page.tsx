import Link from "next/link";
import { CheckCircle, Mail, Smartphone, Download } from "lucide-react";

export default function HomePage() {
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
					<p className="text-white/90 text-lg">Seminar Hall Booking System</p>
				</div>

				{/* Main Card */}
				<div className="glass-effect rounded-2xl p-8 text-center">
					<div className="mb-6">
						<CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
						<h2 className="text-2xl font-semibold text-white mb-2">
							Welcome to Email Verification
						</h2>
						<p className="text-white/80">
							Please check your email for the verification link to access the
							Seminar Hall Booking app.
						</p>
					</div>

					{/* App Download Section */}
					<div className="border-t border-white/20 pt-6 mt-6">
						<div className="flex items-center justify-center mb-4">
							<Smartphone className="w-6 h-6 text-white/80 mr-2" />
							<span className="text-white/80">Download our mobile app:</span>
						</div>

						<div className="space-y-3">
							<Link
								href="/download/android"
								className="block w-full bg-white/10 hover:bg-white/20 transition-colors rounded-lg p-3"
							>
								<div className="flex items-center justify-center">
									<Download className="w-5 h-5 text-white mr-2" />
									<span className="text-white font-medium">
										Download for Android
									</span>
								</div>
							</Link>

							<Link
								href="/download/ios"
								className="block w-full bg-white/10 hover:bg-white/20 transition-colors rounded-lg p-3"
							>
								<div className="flex items-center justify-center">
									<Download className="w-5 h-5 text-white mr-2" />
									<span className="text-white font-medium">
										Download for iOS
									</span>
								</div>
							</Link>
						</div>
					</div>

					{/* Email Verification Link */}
					<div className="border-t border-white/20 pt-6 mt-6">
						<Link
							href="/verify"
							className="text-white/80 hover:text-white transition-colors underline"
						>
							Already have a verification link? Click here
						</Link>
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
