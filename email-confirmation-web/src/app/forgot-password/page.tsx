'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ForgotPasswordForm() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [isResetMode, setIsResetMode] = useState(false);
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	
	const searchParams = useSearchParams();

	useEffect(() => {
		// Check if this is a password reset redirect from email
		const accessToken = searchParams?.get('access_token');
		const refreshToken = searchParams?.get('refresh_token');
		const type = searchParams?.get('type');

		if (type === 'recovery' && accessToken && refreshToken) {
			setIsResetMode(true);
		}
	}, [searchParams]);

	const handleForgotPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		setMessage('');

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/forgot-password`,
			});

			if (error) {
				setError(error.message);
			} else {
				setMessage(
					'Password reset email sent! Please check your inbox and follow the instructions.'
				);
				setEmail('');
			}
		} catch (err) {
			setError('An unexpected error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordReset = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (newPassword !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (newPassword.length < 6) {
			setError('Password must be at least 6 characters long');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword
			});

			if (error) {
				setError(error.message);
			} else {
				setMessage('Password updated successfully! You can now sign in with your new password.');
				setNewPassword('');
				setConfirmPassword('');
				
				// Redirect to main app after 3 seconds
				setTimeout(() => {
					window.location.href = '/';
				}, 3000);
			}
		} catch (err) {
			setError('An unexpected error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
			<div className="max-w-md w-full space-y-8">
				<div className="bg-white rounded-2xl shadow-xl p-8">
					{/* Header */}
					<div className="text-center mb-8">
						<div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
							{isResetMode ? (
								<svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
							) : (
								<svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
								</svg>
							)}
						</div>
						<h2 className="text-2xl font-bold text-gray-900">
							{isResetMode ? 'Reset Your Password' : 'Forgot Password?'}
						</h2>
						<p className="mt-2 text-sm text-gray-600">
							{isResetMode 
								? 'Enter your new password below'
								: 'Enter your email address and we\'ll send you a link to reset your password'
							}
						</p>
					</div>

					{/* Success Message */}
					{message && (
						<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
							<div className="flex">
								<div className="flex-shrink-0">
									<svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
									</svg>
								</div>
								<div className="ml-3">
									<p className="text-sm text-green-800">{message}</p>
								</div>
							</div>
						</div>
					)}

					{/* Error Message */}
					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
							<div className="flex">
								<div className="flex-shrink-0">
									<svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
									</svg>
								</div>
								<div className="ml-3">
									<p className="text-sm text-red-800">{error}</p>
								</div>
							</div>
						</div>
					)}

					{/* Forms */}
					{isResetMode ? (
						/* Password Reset Form */
						<form onSubmit={handlePasswordReset} className="space-y-6">
							<div>
								<label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
									New Password
								</label>
								<input
									id="newPassword"
									name="newPassword"
									type="password"
									required
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="Enter your new password"
									minLength={6}
								/>
							</div>

							<div>
								<label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
									minLength={6}
								/>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? (
									<>
										<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Updating Password...
									</>
								) : (
									'Update Password'
								)}
							</button>
						</form>
					) : (
						/* Forgot Password Form */
						<form onSubmit={handleForgotPassword} className="space-y-6">
							<div>
								<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
									Email Address
								</label>
								<input
									id="email"
									name="email"
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="Enter your email address"
								/>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? (
									<>
										<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Sending Reset Link...
									</>
								) : (
									'Send Reset Link'
								)}
							</button>
						</form>
					)}

					{/* Footer Links */}
					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							Remember your password?{' '}
							<a href="/" className="font-medium text-blue-600 hover:text-blue-500">
								Back to App
							</a>
						</p>
					</div>
				</div>

				{/* App Info */}
				<div className="text-center text-sm text-gray-500">
					<p>Amity Seminar Hall Booking System</p>
					<p>Secure password reset powered by Supabase</p>
				</div>
			</div>
		</div>
	);
}

export default function ForgotPasswordPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
				<div className="max-w-md w-full space-y-8">
					<div className="bg-white rounded-2xl shadow-xl p-8 text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
						<p className="text-gray-600">Loading...</p>
					</div>
				</div>
			</div>
		}>
			<ForgotPasswordForm />
		</Suspense>
	);
}
