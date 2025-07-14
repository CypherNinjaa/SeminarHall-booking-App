import { NextRequest, NextResponse } from "next/server";

export async function GET() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	return NextResponse.json({
		status: "Environment Check",
		supabaseConfigured: !!(supabaseUrl && supabaseAnonKey),
		hasUrl: !!supabaseUrl,
		hasKey: !!supabaseAnonKey,
		urlLength: supabaseUrl?.length || 0,
		keyLength: supabaseAnonKey?.length || 0,
		timestamp: new Date().toISOString(),
	});
}
