import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { initializeSupabase } from "./src/utils/supabaseSetup";
import { useAuthStore } from "./src/stores/authStore";
import { notificationService } from "./src/services/notificationService";
import {
	validateEnvironment,
	testDatabaseConnection,
} from "./src/utils/debugUtils";

export default function App() {
	const { initializeAuth, setupAuthListener, user } = useAuthStore();
	const initializationRef = useRef(false);
	const notificationInitRef = useRef(false);

	// Initialize notification service when user changes
	useEffect(() => {
		const initializeNotifications = async () => {
			if (user && !notificationInitRef.current) {
				console.log("🔔 Initializing notification service for user:", user.id);
				const success = await notificationService.initialize(user.id);
				if (success) {
					notificationInitRef.current = true;
					console.log("✅ Notification service initialized for user");
				}
			} else if (!user && notificationInitRef.current) {
				// User logged out, cleanup notifications
				console.log("🔔 Cleaning up notification service");
				notificationService.cleanup();
				notificationInitRef.current = false;
			}
		};

		initializeNotifications();
	}, [user]);

	useEffect(() => {
		if (initializationRef.current) {
			console.log("App already initialized, skipping");
			return;
		}

		initializationRef.current = true;
		console.log("Initializing app...");

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

				// Initialize basic notification service (without user-specific features)
				console.log("🔔 Initializing basic notification service...");
				await notificationService.initialize();
				console.log("✅ Basic notification service initialized");
			} catch (error) {
				console.error("App initialization error:", error);
				Alert.alert(
					"Initialization Error",
					"Failed to initialize the app. Please restart the application."
				);
			}
		};

		initializeApp();
	}, []); // Empty dependency array since these functions are stable

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AppNavigator />
		</GestureHandlerRootView>
	);
}
