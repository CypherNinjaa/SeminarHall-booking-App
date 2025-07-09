import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { initializeSupabase } from "./src/utils/supabaseSetup";
import { useAuthStore } from "./src/stores/authStore";
import {
	validateEnvironment,
	testDatabaseConnection,
} from "./src/utils/debugUtils";

export default function App() {
	const { initializeAuth, setupAuthListener } = useAuthStore();

	useEffect(() => {
		const initializeApp = async () => {
			try {
				// Validate environment variables
				const envValid = validateEnvironment();
				if (!envValid) {
					Alert.alert(
						"Configuration Error",
						"Missing required environment variables. Please check your .env file."
					);
					return;
				}

				// Initialize Supabase on app startup
				initializeSupabase();

				// Test database connection
				const dbConnected = await testDatabaseConnection();
				if (!dbConnected) {
					console.warn(
						"Database connection test failed - app may have limited functionality"
					);
				}

				// Set up auth state listener
				setupAuthListener();

				// Initialize authentication state
				await initializeAuth();
			} catch (error) {
				console.error("App initialization error:", error);
				Alert.alert(
					"Initialization Error",
					"Failed to initialize the app. Please restart the application."
				);
			}
		};

		initializeApp();
	}, [initializeAuth, setupAuthListener]);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AppNavigator />
		</GestureHandlerRootView>
	);
}
