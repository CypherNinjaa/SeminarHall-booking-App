import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Email Verification - Amity Seminar Hall Booking",
	description:
		"Verify your email address to access the Amity University Patna Seminar Hall Booking system",
	icons: {
		icon: "/favicon.ico",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<div className="min-h-screen gradient-bg">{children}</div>
			</body>
		</html>
	);
}
