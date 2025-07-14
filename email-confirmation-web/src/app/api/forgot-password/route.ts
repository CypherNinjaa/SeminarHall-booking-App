import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, redirectTo } = body;

		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		// Set default redirect URL if not provided
		const resetRedirectTo =
			redirectTo || `${request.nextUrl.origin}/forgot-password`;

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: resetRedirectTo,
		});

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({
			success: true,
			message: "Password reset email sent successfully",
		});
	} catch (error) {
		console.error("Password reset error:", error);
		return NextResponse.json(
			{ error: "Failed to send password reset email" },
			{ status: 500 }
		);
	}
}

export async function OPTIONS(request: NextRequest) {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
