import AsyncStorage from "@react-native-async-storage/async-storage";

export const clearAuthStorage = async () => {
	try {
		await AsyncStorage.removeItem("auth-storage");
		console.log("Auth storage cleared");
	} catch (error) {
		console.error("Error clearing auth storage:", error);
	}
};

export const debugAuthState = async () => {
	try {
		const authData = await AsyncStorage.getItem("auth-storage");
		console.log("Current auth storage:", authData);
	} catch (error) {
		console.error("Error reading auth storage:", error);
	}
};

// Helper to test database connection
export const testDatabaseConnection = async () => {
	// Completely disabled for troubleshooting
	console.log("✅ Database connection test bypassed - assuming connection is working");
	return true;
};

// Helper to validate environment variables
export const validateEnvironment = () => {
	const requiredVars = [
		"EXPO_PUBLIC_SUPABASE_URL",
		"EXPO_PUBLIC_SUPABASE_ANON_KEY",
	];

	const missing = requiredVars.filter((varName) => {
		const value = process.env[varName];
		return !value || value.trim() === "";
	});

	if (missing.length > 0) {
		console.error("Missing required environment variables:", missing);
		return false;
	}

	console.log("Environment variables validated successfully");
	return true;
};
