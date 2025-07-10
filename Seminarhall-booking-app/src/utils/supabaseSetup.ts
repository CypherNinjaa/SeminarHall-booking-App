import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl =
	process.env.EXPO_PUBLIC_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	"";
const supabaseAnonKey =
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	"";

// Initialize the main Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Supabase
export const initializeSupabase = (
	customUrl?: string,
	customAnonKey?: string
) => {
	// Use custom values or fall back to environment variables
	const url = customUrl || supabaseUrl;
	const anonKey = customAnonKey || supabaseAnonKey;

	// Create the main client
	const client = createClient(url, anonKey);

	return client;
};

// Helper function to convert auth user to app user
export const convertAuthUser = (authUser: any, profileData?: any) => {
	if (!authUser) return null;

	return {
		id: authUser.id,
		email: authUser.email,
		name: profileData?.name || authUser?.user_metadata?.name || "",
		role: profileData?.role || authUser?.user_metadata?.role || "faculty",
		is_active:
			profileData?.is_active ?? authUser?.user_metadata?.is_active ?? false,
		department:
			profileData?.department || authUser?.user_metadata?.department || "",
		employee_id:
			profileData?.employee_id || authUser?.user_metadata?.employee_id || "",
		phone: profileData?.phone || authUser?.user_metadata?.phone || "",
		avatar_url:
			profileData?.avatar_url || authUser?.user_metadata?.avatar_url || null,
		created_at: authUser.created_at || new Date().toISOString(),
		updated_at: profileData?.updated_at || new Date().toISOString(),
	};
};
