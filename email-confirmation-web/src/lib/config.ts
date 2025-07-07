export const APP_CONFIG = {
	name: "Amity Seminar Hall Booking",
	university: "Amity University Patna",
	scheme: "amityseminarhall",
	version: "1.0.0",
	support: {
		email: "support@amitypatna.edu.in",
		phone: "+91-612-2200100",
	},
	// Development mode settings
	isDevelopment: process.env.NEXT_PUBLIC_DEV_MODE === "true",
	urls: {
		// For local development, just use the scheme
		localAndroid:
			process.env.NEXT_PUBLIC_LOCAL_ANDROID_SCHEME || "amityseminarhall://",
		localIOS: process.env.NEXT_PUBLIC_LOCAL_IOS_SCHEME || "amityseminarhall://",
		// Future production URLs (commented out for now)
		playStore: process.env.NEXT_PUBLIC_PLAY_STORE_URL || null,
		appStore: process.env.NEXT_PUBLIC_APP_STORE_URL || null,
		website: process.env.NEXT_PUBLIC_WEB_URL || "https://amitypatna.edu.in",
	},
	colors: {
		primary: "#1e40af",
		secondary: "#3b82f6",
		accent: "#f59e0b",
		success: "#22c55e",
		error: "#ef4444",
		warning: "#f59e0b",
	},
};

export const VERIFICATION_STATES = {
	LOADING: "loading",
	SUCCESS: "success",
	ERROR: "error",
	EXPIRED: "expired",
	INVALID: "invalid",
} as const;

export const REDIRECT_DELAY = 5; // seconds
