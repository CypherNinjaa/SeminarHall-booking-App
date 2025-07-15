import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";

// Import admin screens
import UnifiedAdminDashboardScreen from "../screens/admin/UnifiedAdminDashboardScreen";
import HallManagementScreen from "../screens/admin/HallManagementScreen";
import BookingOversightScreen from "../screens/admin/BookingOversightScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import BookedCalendarScreen from "../screens/BookedCalendarScreen";

export type AdminTabParamList = {
	AdminDashboard: undefined;
	HallManagement: undefined;
	BookingOversight: undefined;
	BookingCalendar: undefined;
	AdminReports: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminTabNavigator() {
	const { isDark } = useTheme();

	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				tabBarIcon: ({ focused, color, size }) => {
					let iconName: keyof typeof Ionicons.glyphMap;

					switch (route.name) {
						case "AdminDashboard":
							iconName = focused ? "grid" : "grid-outline";
							break;
						case "HallManagement":
							iconName = focused ? "business" : "business-outline";
							break;
						case "BookingOversight":
							iconName = focused ? "calendar" : "calendar-outline";
							break;
						case "BookingCalendar":
							iconName = focused ? "today" : "today-outline";
							break;
						case "AdminReports":
							iconName = focused ? "analytics" : "analytics-outline";
							break;
						default:
							iconName = "help-outline";
					}

					return <Ionicons name={iconName} size={size} color={color} />;
				},
				tabBarActiveTintColor: Colors.primary[500],
				tabBarInactiveTintColor: isDark
					? Colors.dark.text.secondary
					: Colors.gray[500],
				tabBarStyle: {
					backgroundColor: isDark ? Colors.dark.background.secondary : "white",
					borderTopColor: isDark
						? Colors.dark.border.light
						: Colors.border.light,
					paddingBottom: 8,
					paddingTop: 8,
					height: 80,
				},
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: "500",
					marginTop: 4,
				},
				headerShown: false,
			})}
		>
			<Tab.Screen
				name="AdminDashboard"
				component={UnifiedAdminDashboardScreen}
				options={{
					tabBarLabel: "Dashboard",
				}}
			/>
			<Tab.Screen
				name="HallManagement"
				component={HallManagementScreen}
				options={{
					tabBarLabel: "Halls",
				}}
			/>
			<Tab.Screen
				name="BookingOversight"
				component={BookingOversightScreen}
				options={{
					tabBarLabel: "Bookings",
				}}
			/>
			<Tab.Screen
				name="BookingCalendar"
				component={BookedCalendarScreen}
				options={{
					tabBarLabel: "Calendar",
				}}
			/>
			<Tab.Screen
				name="AdminReports"
				component={AdminReportsScreen}
				options={{
					tabBarLabel: "Reports",
				}}
			/>
		</Tab.Navigator>
	);
}
