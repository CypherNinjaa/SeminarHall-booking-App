import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	Image,
	ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../contexts/ThemeContext";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";
import { smartBookingService } from "../services/smartBookingService";
import { notificationService } from "../services/notificationService";

type ProfileScreenNavigationProp = StackNavigationProp<
	RootStackParamList,
	"MainTabs"
>;

interface Props {
	navigation: ProfileScreenNavigationProp;
}

export default function ProfileScreen({ navigation }: Props) {
	const { user, logout } = useAuthStore();
	const { isDark } = useTheme();

	// State for user statistics
	const [userStats, setUserStats] = useState({
		totalBookings: 0,
		thisMonthBookings: 0,
		averageRating: 0,
	});
	const [isLoadingStats, setIsLoadingStats] = useState(true);
	const [unreadNotifications, setUnreadNotifications] = useState(0);

	// Load user statistics on component mount
	useEffect(() => {
		const loadUserStats = async () => {
			if (!user?.id) {
				setIsLoadingStats(false);
				return;
			}

			try {
				setIsLoadingStats(true);
				const stats = await smartBookingService.getUserBookingStats(user.id);
				setUserStats({
					totalBookings: stats.totalBookings,
					thisMonthBookings: stats.thisMonthBookings,
					averageRating: stats.averageRating,
				});
			} catch (error) {
				console.error("Error loading user stats:", error);
				// Keep default values on error
			} finally {
				setIsLoadingStats(false);
			}
		};

		loadUserStats();
	}, [user?.id]);

	// Load unread notifications count and set up real-time updates
	useEffect(() => {
		const loadUnreadCount = async () => {
			if (!user?.id) return;

			try {
				const count = await notificationService.getUnreadCount(user.id);
				setUnreadNotifications(count);
			} catch (error) {
				console.error("Error loading unread notifications count:", error);
			}
		};

		loadUnreadCount();

		// Set up real-time subscription for notification updates
		let subscription: any;
		if (user?.id) {
			subscription = notificationService.subscribeToUserNotifications(
				user.id,
				() => {
					// Reload count when notifications change
					loadUnreadCount();
				}
			);
		}

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, [user?.id]);

	// Refresh notification count when screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			const refreshNotificationCount = async () => {
				if (!user?.id) return;

				try {
					const count = await notificationService.getUnreadCount(user.id);
					setUnreadNotifications(count);
				} catch (error) {
					console.error("Error refreshing notification count:", error);
				}
			};

			refreshNotificationCount();
		}, [user?.id])
	);

	const handleLogout = async () => {
		try {
			await logout();
			// Remove manual navigation - let the auth state change handle navigation automatically
			// navigation.navigate("Login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	const menuItems = [
		{
			icon: "person-outline",
			title: "Edit Profile",
			description: "Update your personal information",
			action: () => navigation.navigate("EditProfile"),
		},
		{
			icon: "calendar-outline",
			title: "Booking History",
			description: "View all your past bookings",
			action: () => navigation.navigate("BookingHistory"),
		},
		{
			icon: "notifications-outline",
			title: "Notifications",
			description: "Manage notification preferences",
			action: () => navigation.navigate("Notifications"),
		},
		{
			icon: "help-circle-outline",
			title: "Help & Support",
			description: "Get help and contact support",
			action: () => navigation.navigate("HelpSupport"),
		},
		{
			icon: "settings-outline",
			title: "Settings",
			description: "App settings and preferences",
			action: () => navigation.navigate("Settings"),
		},
	];

	// Add admin options based on user role
	if (user?.role === "super_admin" || user?.role === "admin") {
		menuItems.unshift({
			icon: "business-outline",
			title: "Admin Panel",
			description: "Manage halls, bookings and reports",
			action: () => navigation.navigate("AdminTabs"),
		});
	}

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* Profile Header */}
				<View
					style={[styles.profileHeader, isDark && styles.profileHeaderDark]}
				>
					<Image
						source={{ uri: user?.avatar || "https://via.placeholder.com/100" }}
						style={styles.avatar}
					/>
					<Text style={[styles.userName, isDark && styles.userNameDark]}>
						{user?.name || "User"}
					</Text>
					<Text style={[styles.userRole, isDark && styles.userRoleDark]}>
						{user?.role || "Guest"}
					</Text>
					<Text style={[styles.userEmail, isDark && styles.userEmailDark]}>
						{user?.email || "No email"}
					</Text>
				</View>

				{/* Stats Section */}
				<View
					style={[styles.statsContainer, isDark && styles.statsContainerDark]}
				>
					<View style={styles.statItem}>
						{isLoadingStats ? (
							<ActivityIndicator
								size="small"
								color={isDark ? Colors.primary[200] : Colors.primary[500]}
							/>
						) : (
							<Text
								style={[styles.statNumber, isDark && styles.statNumberDark]}
							>
								{userStats.totalBookings}
							</Text>
						)}
						<Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
							Total Bookings
						</Text>
					</View>
					<View style={styles.statItem}>
						{isLoadingStats ? (
							<ActivityIndicator
								size="small"
								color={isDark ? Colors.primary[200] : Colors.primary[500]}
							/>
						) : (
							<Text
								style={[styles.statNumber, isDark && styles.statNumberDark]}
							>
								{userStats.thisMonthBookings}
							</Text>
						)}
						<Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
							This Month
						</Text>
					</View>
					<View style={styles.statItem}>
						{isLoadingStats ? (
							<ActivityIndicator
								size="small"
								color={isDark ? Colors.primary[200] : Colors.primary[500]}
							/>
						) : (
							<Text
								style={[styles.statNumber, isDark && styles.statNumberDark]}
							>
								{userStats.averageRating.toFixed(1)}
							</Text>
						)}
						<Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
							Rating
						</Text>
					</View>
				</View>

				{/* Menu Items */}
				<View
					style={[styles.menuContainer, isDark && styles.menuContainerDark]}
				>
					{menuItems.map((item, index) => (
						<TouchableOpacity
							key={index}
							style={[
								styles.menuItem,
								isDark && styles.menuItemDark,
								index === menuItems.length - 1 && styles.menuItemLast,
							]}
							onPress={item.action}
						>
							<View style={styles.menuItemLeft}>
								<View
									style={[
										styles.iconContainer,
										isDark && styles.iconContainerDark,
									]}
								>
									<Ionicons
										name={item.icon as any}
										size={24}
										color={isDark ? Colors.primary[200] : Colors.primary[500]}
									/>
								</View>
								<View style={styles.menuItemText}>
									<Text
										style={[
											styles.menuItemTitle,
											isDark && styles.menuItemTitleDark,
										]}
									>
										{item.title}
									</Text>
									<Text
										style={[
											styles.menuItemDescription,
											isDark && styles.menuItemDescriptionDark,
										]}
									>
										{item.description}
									</Text>
								</View>
							</View>
							<View style={styles.menuItemRight}>
								{item.title === "Notifications" && unreadNotifications > 0 && (
									<View
										style={[
											styles.notificationBadge,
											isDark && styles.notificationBadgeDark,
										]}
									>
										<Text style={styles.notificationBadgeText}>
											{unreadNotifications > 99
												? "99+"
												: unreadNotifications.toString()}
										</Text>
									</View>
								)}
								<Ionicons
									name="chevron-forward"
									size={20}
									color={isDark ? Colors.gray[400] : Colors.gray[500]}
								/>
							</View>
						</TouchableOpacity>
					))}
				</View>

				{/* Logout Button */}
				<TouchableOpacity
					style={[styles.logoutButton, isDark && styles.logoutButtonDark]}
					onPress={handleLogout}
				>
					<Ionicons
						name="log-out-outline"
						size={20}
						color={Colors.error.dark}
					/>
					<Text style={styles.logoutText}>Sign Out</Text>
				</TouchableOpacity>

				{/* App Version */}
				<Text style={[styles.versionText, isDark && styles.versionTextDark]}>
					Version 1.0.0
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background.primary,
	},
	containerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	profileHeader: {
		backgroundColor: Colors.background.primary,
		alignItems: "center",
		paddingVertical: Spacing[8], // 32px
		marginBottom: Spacing[5], // 20px
	},
	profileHeaderDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	avatar: {
		width: 100,
		height: 100,
		borderRadius: BorderRadius.full,
		marginBottom: Spacing[4], // 16px
	},
	userName: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold as any,
		color: Colors.text.primary,
		marginBottom: Spacing[1], // 4px
	},
	userNameDark: {
		color: Colors.dark.text.primary,
	},
	userRole: {
		fontSize: Typography.fontSize.base,
		color: Colors.primary[500],
		fontWeight: Typography.fontWeight.semibold as any,
		marginBottom: Spacing[1], // 4px
	},
	userRoleDark: {
		color: Colors.primary[200],
	},
	userEmail: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
	},
	userEmailDark: {
		color: Colors.dark.text.secondary,
	},
	statsContainer: {
		flexDirection: "row",
		backgroundColor: Colors.background.primary,
		marginHorizontal: Spacing[4], // 16px
		borderRadius: BorderRadius.lg,
		padding: Spacing[5], // 20px
		marginBottom: Spacing[5], // 20px
		...Shadows.sm,
	},
	statsContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	statItem: {
		flex: 1,
		alignItems: "center",
	},
	statNumber: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold as any,
		color: Colors.text.primary,
		marginBottom: Spacing[1], // 4px
	},
	statNumberDark: {
		color: Colors.dark.text.primary,
	},
	statLabel: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
		textAlign: "center",
	},
	statLabelDark: {
		color: Colors.dark.text.secondary,
	},
	menuContainer: {
		backgroundColor: Colors.background.primary,
		marginHorizontal: Spacing[4], // 16px
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing[5], // 20px
		...Shadows.sm,
	},
	menuContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing[4], // 16px
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
	},
	menuItemDark: {
		borderBottomColor: Colors.dark.border.light,
	},
	menuItemLast: {
		borderBottomWidth: 0,
	},
	menuItemLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: BorderRadius.full,
		backgroundColor: Colors.primary[50],
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3], // 12px
	},
	iconContainerDark: {
		backgroundColor: Colors.primary[900],
	},
	menuItemText: {
		flex: 1,
	},
	menuItemTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold as any,
		color: Colors.text.primary,
		marginBottom: 2,
	},
	menuItemTitleDark: {
		color: Colors.dark.text.primary,
	},
	menuItemDescription: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
	},
	menuItemDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	logoutButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.background.primary,
		marginHorizontal: Spacing[4], // 16px
		borderRadius: BorderRadius.lg,
		padding: Spacing[4], // 16px
		marginBottom: Spacing[5], // 20px
		...Shadows.sm,
	},
	logoutButtonDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	logoutText: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold as any,
		color: Colors.error.dark,
		marginLeft: Spacing[2], // 8px
	},
	versionText: {
		textAlign: "center",
		color: Colors.text.tertiary,
		fontSize: Typography.fontSize.xs,
		marginBottom: Spacing[5], // 20px
	},
	versionTextDark: {
		color: Colors.dark.text.tertiary,
	},
	menuItemRight: {
		flexDirection: "row",
		alignItems: "center",
	},
	notificationBadge: {
		backgroundColor: Colors.error.light,
		borderRadius: BorderRadius.full,
		minWidth: 20,
		height: 20,
		paddingHorizontal: 6,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[2], // 8px
	},
	notificationBadgeDark: {
		backgroundColor: Colors.error.dark,
	},
	notificationBadgeText: {
		color: Colors.background.primary,
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.bold as any,
		textAlign: "center",
	},
});
