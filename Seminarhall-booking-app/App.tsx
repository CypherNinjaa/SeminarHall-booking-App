import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert, Platform } from "react-native";
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
			// setupAuthListener(); // Disabled to prevent infinite loading on tab switch

			// Initialize authentication state
			await initializeAuth();

			// Initialize basic notification service (without user-specific features)
			console.log("🔔 Initializing basic notification service...");
			await notificationService.initialize();
			console.log("✅ Basic notification service initialized");

			console.log("✅ App initialization complete");
		} catch (error) {
			console.error("❌ App initialization failed:", error);
			Alert.alert(
				"Initialization Error",
				"Failed to initialize the app. Please restart the application."
			);
		}
	};

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
			return;
		}

		initializationRef.current = true;
		initializeApp();
	}, []);

	// Web-only defensive fix: ensure document.body remains scrollable on web.
	// Some runtime code can set body { overflow: hidden } which breaks ScrollView on web.
	useEffect(() => {
		if (Platform.OS !== "web" || typeof document === "undefined") return;

		const apply = () => {
			try {
				document.body.style.setProperty("overflow", "auto", "important");
				document.body.style.setProperty("overflow-y", "auto", "important");
			} catch (e) {
				/* ignore */
			}
		};

		apply();

		const mo = new MutationObserver((mutations) => {
			for (const m of mutations) {
				if (m.type === "attributes" && m.attributeName === "style") {
					try {
						const cs = getComputedStyle(document.body);
						if (cs.overflow === "hidden" || cs.overflowY === "hidden") {
							apply();
						}
					} catch (e) {
						// ignore
					}
				}
			}
		});

		mo.observe(document.body, { attributes: true });

		return () => {
			mo.disconnect();
		};
	}, []);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AppNavigator />
		</GestureHandlerRootView>
	);
}
