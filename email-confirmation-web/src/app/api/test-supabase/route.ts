import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
	try {
		// Test Supabase connection
		const { data, error } = await supabase.auth.getSession();

		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		return NextResponse.json({
			status: "Environment Check",
			supabaseConfigured: !!(supabaseUrl && supabaseAnonKey),
			hasUrl: !!supabaseUrl,
			hasKey: !!supabaseAnonKey,
			urlLength: supabaseUrl?.length || 0,
			keyLength: supabaseAnonKey?.length || 0,
			connectionTest: error ? "Failed" : "Success",
			connectionError: error?.message || null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return NextResponse.json(
			{
				status: "Environment Check Failed",
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { email } = await request.json();

		if (!email) {
			return NextResponse.json(
				{ error: "Email required for test" },
				{ status: 400 }
			);
		}

		// Test password reset functionality
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${request.nextUrl.origin}/forgot-password`,
		});

		return NextResponse.json({
			status: "Password Reset Test",
			success: !error,
			error: error?.message || null,
			email: email,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return NextResponse.json(
			{
				status: "Password Reset Test Failed",
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
