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
import HallListScreen from "../screens/HallListScreen";
import BookingScreen from "../screens/BookingScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SignupScreen from "../screens/SignupScreen";
import SuperAdminScreen from "../screens/SuperAdminScreen";
import LoadingScreen from "../components/LoadingScreen";

export type RootStackParamList = {
	Login: undefined;
	Signup: undefined;
	MainTabs: undefined;
	SuperAdmin: undefined;
	HallDetails: { hallId: string };
	Booking: { hallId: string };
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
				<NavigationContainer>
					<Stack.Navigator screenOptions={{ headerShown: false }}>
						{isAuthenticated ? (
							// Authenticated screens
							<>
								<Stack.Screen name="MainTabs" component={MainTabNavigator} />
								{(user?.role === "super_admin" || user?.role === "admin") && (
									<Stack.Screen
										name="SuperAdmin"
										component={SuperAdminScreen}
									/>
								)}
							</>
						) : (
							// Non-authenticated screens
							<>
								<Stack.Screen name="Login" component={LoginScreen} />
								<Stack.Screen name="Signup" component={SignupScreen} />
							</>
						)}
					</Stack.Navigator>
				</NavigationContainer>
			</SafeAreaProvider>
		</ThemeProvider>
	);
}
