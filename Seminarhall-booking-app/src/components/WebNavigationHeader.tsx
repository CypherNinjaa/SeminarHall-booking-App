import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isLargeScreen = screenWidth > 768;

interface WebNavigationHeaderProps {
	activeTab: string;
	onTabPress: (tab: string) => void;
	onNotificationsPress?: () => void;
	onSettingsPress?: () => void;
}

const tabs = [
	{ key: "Home", label: "Home", icon: "home" },
	{ key: "Halls", label: "Halls", icon: "business" },
	{ key: "Bookings", label: "Bookings", icon: "calendar" },
	{ key: "Profile", label: "Profile", icon: "person" },
];

export default function WebNavigationHeader({
	activeTab,
	onTabPress,
	onNotificationsPress,
	onSettingsPress,
}: WebNavigationHeaderProps) {
	if (!isWeb || !isLargeScreen) {
		return null;
	}

	return (
		<LinearGradient
			colors={["#ffffff", "#f8fafc"]}
			style={styles.headerContainer}
		>
			{/* Logo/Brand Section */}
			<View style={styles.brandSection}>
				<View style={styles.logoContainer}>
					<Ionicons name="business" size={24} color="#007AFF" />
				</View>
				<Text style={styles.brandText}>Amity University Patna</Text>
			</View>

			{/* Navigation Tabs */}
			<View style={styles.tabsContainer}>
				{tabs.map((tab) => (
					<TouchableOpacity
						key={tab.key}
						style={[
							styles.tabItem,
							activeTab === tab.key && styles.activeTabItem,
						]}
						onPress={() => onTabPress(tab.key)}
					>
						<Ionicons
							name={
								activeTab === tab.key
									? (tab.icon as any)
									: (`${tab.icon}-outline` as any)
							}
							size={16}
							color={activeTab === tab.key ? "#007AFF" : "#64748b"}
						/>
						<Text
							style={[
								styles.tabLabel,
								activeTab === tab.key && styles.activeTabLabel,
							]}
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* User Section */}
			<View style={styles.userSection}>
				{/* Icons removed as requested */}
			</View>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	headerContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 32,
		paddingVertical: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
		backgroundColor: "#ffffff",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
		zIndex: 1000,
		minHeight: 80,
	},

	brandSection: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		minWidth: 250,
	},

	logoContainer: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#f0f9ff",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
		borderWidth: 2,
		borderColor: "#007AFF20",
	},

	brandText: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1e293b",
		letterSpacing: -0.5,
	},

	tabsContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		borderRadius: 35,
		padding: 6,
		flex: 2,
		justifyContent: "center",
		maxWidth: 500,
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},

	tabItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 28,
		marginHorizontal: 3,
		minWidth: 90,
		justifyContent: "center",
	},

	activeTabItem: {
		backgroundColor: "#ffffff",
		shadowColor: "#007AFF",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 3,
	},

	tabLabel: {
		fontSize: 14,
		fontWeight: "500",
		color: "#64748b",
		marginLeft: 8,
	},

	activeTabLabel: {
		color: "#007AFF",
		fontWeight: "600",
	},

	userSection: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		justifyContent: "flex-end",
		minWidth: 120,
	},
});
