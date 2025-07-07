import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const verifyEmailToken = async (
	email: string,
	token: string,
	type: string = "email"
) => {
	try {
		const { error } = await supabase.auth.verifyOtp({
			email,
			token,
			type: type as any,
		});

		if (error) {
			throw error;
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Verification failed",
		};
	}
};

export const resendVerificationEmail = async (email: string) => {
	try {
		const { error } = await supabase.auth.resend({
			type: "signup",
			email: email,
		});

		if (error) {
			throw error;
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to resend email",
		};
	}
};
