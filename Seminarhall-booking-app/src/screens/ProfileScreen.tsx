import React from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
	const user = {
		name: "John Doe",
		email: "john.doe@example.com",
		phone: "+1 234 567 8890",
		role: "Faculty",
		avatar: "https://via.placeholder.com/100x100/007AFF/FFFFFF?text=JD",
	};

	const menuItems = [
		{
			icon: "person-outline",
			title: "Edit Profile",
			description: "Update your personal information",
		},
		{
			icon: "calendar-outline",
			title: "Booking History",
			description: "View all your past bookings",
		},
		{
			icon: "notifications-outline",
			title: "Notifications",
			description: "Manage notification preferences",
		},
		{
			icon: "help-circle-outline",
			title: "Help & Support",
			description: "Get help and contact support",
		},
		{
			icon: "settings-outline",
			title: "Settings",
			description: "App settings and preferences",
		},
	];

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="auto" />
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* Profile Header */}
				<View style={styles.profileHeader}>
					<Image source={{ uri: user.avatar }} style={styles.avatar} />
					<Text style={styles.userName}>{user.name}</Text>
					<Text style={styles.userRole}>{user.role}</Text>
					<Text style={styles.userEmail}>{user.email}</Text>
				</View>

				{/* Stats Section */}
				<View style={styles.statsContainer}>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>12</Text>
						<Text style={styles.statLabel}>Total Bookings</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>3</Text>
						<Text style={styles.statLabel}>This Month</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>4.8</Text>
						<Text style={styles.statLabel}>Rating</Text>
					</View>
				</View>

				{/* Menu Items */}
				<View style={styles.menuContainer}>
					{menuItems.map((item, index) => (
						<TouchableOpacity key={index} style={styles.menuItem}>
							<View style={styles.menuItemLeft}>
								<View style={styles.iconContainer}>
									<Ionicons name={item.icon as any} size={24} color="#007AFF" />
								</View>
								<View style={styles.menuItemText}>
									<Text style={styles.menuItemTitle}>{item.title}</Text>
									<Text style={styles.menuItemDescription}>
										{item.description}
									</Text>
								</View>
							</View>
							<Ionicons name="chevron-forward" size={20} color="#ccc" />
						</TouchableOpacity>
					))}
				</View>

				{/* Logout Button */}
				<TouchableOpacity style={styles.logoutButton}>
					<Ionicons name="log-out-outline" size={20} color="#DC3545" />
					<Text style={styles.logoutText}>Sign Out</Text>
				</TouchableOpacity>

				{/* App Version */}
				<Text style={styles.versionText}>Version 1.0.0</Text>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8f9fa",
	},
	profileHeader: {
		backgroundColor: "white",
		alignItems: "center",
		paddingVertical: 30,
		marginBottom: 20,
	},
	avatar: {
		width: 100,
		height: 100,
		borderRadius: 50,
		marginBottom: 16,
	},
	userName: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 4,
	},
	userRole: {
		fontSize: 16,
		color: "#007AFF",
		fontWeight: "600",
		marginBottom: 4,
	},
	userEmail: {
		fontSize: 14,
		color: "#666",
	},
	statsContainer: {
		flexDirection: "row",
		backgroundColor: "white",
		marginHorizontal: 16,
		borderRadius: 16,
		padding: 20,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	statItem: {
		flex: 1,
		alignItems: "center",
	},
	statNumber: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 12,
		color: "#666",
		textAlign: "center",
	},
	menuContainer: {
		backgroundColor: "white",
		marginHorizontal: 16,
		borderRadius: 16,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f0f0",
	},
	menuItemLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#f0f8ff",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	menuItemText: {
		flex: 1,
	},
	menuItemTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 2,
	},
	menuItemDescription: {
		fontSize: 12,
		color: "#666",
	},
	logoutButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "white",
		marginHorizontal: 16,
		borderRadius: 16,
		padding: 16,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	logoutText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#DC3545",
		marginLeft: 8,
	},
	versionText: {
		textAlign: "center",
		color: "#999",
		fontSize: 12,
		marginBottom: 20,
	},
});
