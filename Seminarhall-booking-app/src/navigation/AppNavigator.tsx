import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useAuthStore } from "../stores/authStore";

// Import screens
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import HallListScreen from "../screens/HallListScreen";
import BookingScreen from "../screens/BookingScreen";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import BookingHistoryScreen from "../screens/BookingHistoryScreen";
import SignupScreen from "../screens/SignupScreen";
import SuperAdminScreen from "../screens/SuperAdminScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import LoadingScreen from "../components/LoadingScreen";
import AddEditHallScreen from "../screens/admin/AddEditHallScreen";
import HallDetailsScreen from "../screens/admin/HallDetailsScreen";
import HelpSupportScreen from "../screens/HelpSupportScreen";
import SettingsScreen from "../screens/SettingsScreen";

// Import admin navigation
import AdminTabNavigator from "./AdminTabNavigator";

export type RootStackParamList = {
	Login: undefined;
	Signup: undefined;
	ForgotPassword: undefined;
	MainTabs: undefined;
	AdminTabs: undefined;
	SuperAdmin: undefined;
	HallDetails: { hallId: string; hall?: any };
	Booking: { hallId: string };
	AddEditHall: { hallId?: string; hall?: any } | undefined;
	Notifications: undefined;
	EditProfile: undefined;
	BookingHistory: undefined;
	HelpSupport: undefined;
	Settings: undefined;
	"auth/email-verified": undefined;
	"auth/password-reset-success": undefined;
	"auth/login": undefined;
};

export type MainTabParamList = {
	Home: undefined;
	Halls: undefined;
	Bookings: undefined;
	Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				tabBarIcon: ({ focused, color, size }) => {
					let iconName: keyof typeof Ionicons.glyphMap;

					if (route.name === "Home") {
						iconName = focused ? "home" : "home-outline";
					} else if (route.name === "Halls") {
						iconName = focused ? "business" : "business-outline";
					} else if (route.name === "Bookings") {
						iconName = focused ? "calendar" : "calendar-outline";
					} else if (route.name === "Profile") {
						iconName = focused ? "person" : "person-outline";
					} else {
						iconName = "help-outline";
					}

					return <Ionicons name={iconName} size={size} color={color} />;
				},
				tabBarActiveTintColor: "#007AFF",
				tabBarInactiveTintColor: "gray",
				headerShown: false,
			})}
		>
			<Tab.Screen name="Home" component={HomeScreen} />
			<Tab.Screen name="Halls" component={HallListScreen} />
			<Tab.Screen name="Bookings" component={BookingScreen} />
			<Tab.Screen name="Profile" component={ProfileScreen} />
		</Tab.Navigator>
	);
}

export default function AppNavigator() {
	const { isAuthenticated, isLoading, user } = useAuthStore();

	// Deep linking configuration for website redirects
	const linking = {
		prefixes: ["seminarhallbooking://"],
		config: {
			screens: {
				Login: "login",
				Signup: "signup",
				ForgotPassword: "forgot-password",
				MainTabs: "main",
				AdminTabs: "admin",
				SuperAdmin: "super-admin",
				// Auth-related deep links from website
				"auth/email-verified": "main",
				"auth/password-reset-success": "login",
				"auth/login": "login",
			},
		},
	};

	// Show loading spinner while initializing auth
	if (isLoading) {
		return (
			<ThemeProvider>
				<SafeAreaProvider>
					<LoadingScreen />
				</SafeAreaProvider>
			</ThemeProvider>
		);
	}

	return (
		<ThemeProvider>
			<SafeAreaProvider>
				<NavigationContainer linking={linking}>
					<Stack.Navigator screenOptions={{ headerShown: false }}>
						{isAuthenticated ? (
							// Authenticated screens - Always start with MainTabs for all users
							<>
								<Stack.Screen name="MainTabs" component={MainTabNavigator} />
								<Stack.Screen
									name="Notifications"
									component={NotificationsScreen}
								/>
								<Stack.Screen
									name="EditProfile"
									component={EditProfileScreen}
								/>
								<Stack.Screen
									name="BookingHistory"
									component={BookingHistoryScreen}
								/>
								<Stack.Screen
									name="AddEditHall"
									component={AddEditHallScreen}
								/>
								<Stack.Screen
									name="HallDetails"
									component={HallDetailsScreen}
								/>
								<Stack.Screen
									name="HelpSupport"
									component={HelpSupportScreen}
								/>
								<Stack.Screen name="Settings" component={SettingsScreen} />
								{user?.role === "super_admin" && (
									// Super Admin gets access to both admin tabs and super admin screen
									<>
										<Stack.Screen
											name="AdminTabs"
											component={AdminTabNavigator}
										/>
										<Stack.Screen
											name="SuperAdmin"
											component={SuperAdminScreen}
										/>
									</>
								)}
								{user?.role === "admin" && (
									// Regular Admin gets admin tabs only
									<Stack.Screen
										name="AdminTabs"
										component={AdminTabNavigator}
									/>
								)}
							</>
						) : (
							// Non-authenticated screens
							<>
								<Stack.Screen name="Login" component={LoginScreen} />
								<Stack.Screen name="Signup" component={SignupScreen} />
								<Stack.Screen
									name="ForgotPassword"
									component={ForgotPasswordScreen}
								/>
							</>
						)}
					</Stack.Navigator>
				</NavigationContainer>
			</SafeAreaProvider>
		</ThemeProvider>
	);
}
