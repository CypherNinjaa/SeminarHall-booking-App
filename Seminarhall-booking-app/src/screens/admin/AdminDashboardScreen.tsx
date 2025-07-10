import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../../constants/theme";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { hallManagementService } from "../../services/hallManagementService";
import { bookingOversightService } from "../../services/bookingOversightService";
import { supabase } from "../../utils/supabaseSetup";
import { adminReportsService } from "../../services/adminReportsService";

const { width: screenWidth } = Dimensions.get("window");

// Helper function to format relative time
const formatRelativeTime = (date: Date): string => {
	const now = new Date();
	const diffInMinutes = Math.floor(
		(now.getTime() - date.getTime()) / (1000 * 60)
	);

	if (diffInMinutes < 1) return "Just now";
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) return `${diffInHours}h ago`;

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) return `${diffInDays}d ago`;

	return date.toLocaleDateString();
};

// Helper function to get recent activities
const getRecentActivities = async (): Promise<RecentActivity[]> => {
	try {
		// Get recent bookings for activity feed
		const recentBookings = await bookingOversightService.getBookings({
			status: "all",
		});

		// Get recent halls (using getAllHalls method)
		const halls = await hallManagementService.getAllHalls();

		const activities: RecentActivity[] = [];

		// Add booking activities
		recentBookings.slice(0, 5).forEach((booking: any) => {
			activities.push({
				id: `booking-${booking.id}`,
				type: "booking",
				title: `Booking Request`,
				description: `${booking.user_name || "User"} requested ${
					booking.hall_name
				} for ${booking.purpose}`,
				timestamp: formatRelativeTime(new Date(booking.created_at)),
				user: booking.user_name,
				status: booking.status,
			});
		});

		// Add hall activities (recent halls)
		halls.slice(0, 2).forEach((hall: any) => {
			activities.push({
				id: `hall-${hall.id}`,
				type: "hall",
				title: "Hall Added",
				description: `New hall "${hall.name}" added to system`,
				timestamp: formatRelativeTime(new Date(hall.created_at)),
				status: "completed",
			});
		});

		// Sort by most recent first
		return activities
			.sort((a, b) => {
				// For sorting, we'll use a simple heuristic based on the timestamp string
				// This is a simplification; in a real app you'd store actual timestamps
				if (a.timestamp.includes("Just now")) return -1;
				if (b.timestamp.includes("Just now")) return 1;
				return 0;
			})
			.slice(0, 8);
	} catch (error) {
		console.error("Error fetching recent activities:", error);
		return [];
	}
};

// Types
interface DashboardStats {
	total_halls: number;
	active_bookings: number;
	pending_bookings: number;
	todays_bookings: number;
	hall_utilization: number;
	conflicts_resolved: number;
}

interface RecentActivity {
	id: string;
	type: "booking" | "hall" | "conflict" | "maintenance";
	title: string;
	description: string;
	timestamp: string;
	user?: string;
	status?: "pending" | "approved" | "rejected" | "completed" | "cancelled";
}

interface QuickAction {
	id: string;
	title: string;
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	onPress: () => void;
}

interface AdminDashboardScreenProps {
	navigation: StackNavigationProp<RootStackParamList>;
}

// Statistics Card Component
const StatCard: React.FC<{
	title: string;
	value: number | string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => {
	const { isDark } = useTheme();

	return (
		<View style={[styles.statCard, isDark && styles.statCardDark]}>
			<View style={styles.statCardHeader}>
				<View
					style={[styles.statIconContainer, { backgroundColor: color + "20" }]}
				>
					<Ionicons name={icon} size={24} color={color} />
				</View>
				<View style={styles.statContent}>
					<Text
						style={[
							styles.statValue,
							{ color },
							isDark && styles.statValueDark,
						]}
					>
						{value}
					</Text>
					<Text style={[styles.statTitle, isDark && styles.statTitleDark]}>
						{title}
					</Text>
					{subtitle && (
						<Text
							style={[styles.statSubtitle, isDark && styles.statSubtitleDark]}
						>
							{subtitle}
						</Text>
					)}
				</View>
			</View>
		</View>
	);
};

// Activity Item Component
const ActivityItem: React.FC<{ activity: RecentActivity }> = ({ activity }) => {
	const { isDark } = useTheme();

	const getActivityIcon = (type: RecentActivity["type"]) => {
		switch (type) {
			case "booking":
				return "calendar-outline";
			case "hall":
				return "business-outline";
			case "conflict":
				return "warning-outline";
			case "maintenance":
				return "construct-outline";
			default:
				return "information-circle-outline";
		}
	};

	const getActivityColor = (type: RecentActivity["type"]) => {
		switch (type) {
			case "booking":
				return Colors.primary[500];
			case "hall":
				return Colors.success.main;
			case "conflict":
				return Colors.warning.main;
			case "maintenance":
				return Colors.gray[600];
			default:
				return Colors.gray[500];
		}
	};

	const getStatusColor = (status?: RecentActivity["status"]) => {
		switch (status) {
			case "approved":
				return Colors.success.main;
			case "rejected":
				return Colors.error.main;
			case "pending":
				return Colors.warning.main;
			case "completed":
				return Colors.primary[500];
			default:
				return Colors.gray[500];
		}
	};

	return (
		<View style={[styles.activityItem, isDark && styles.activityItemDark]}>
			<View
				style={[
					styles.activityIcon,
					{ backgroundColor: getActivityColor(activity.type) + "20" },
				]}
			>
				<Ionicons
					name={getActivityIcon(activity.type)}
					size={20}
					color={getActivityColor(activity.type)}
				/>
			</View>
			<View style={styles.activityContent}>
				<Text
					style={[styles.activityTitle, isDark && styles.activityTitleDark]}
				>
					{activity.title}
				</Text>
				<Text
					style={[
						styles.activityDescription,
						isDark && styles.activityDescriptionDark,
					]}
				>
					{activity.description}
				</Text>
				<View style={styles.activityMeta}>
					<Text
						style={[
							styles.activityTimestamp,
							isDark && styles.activityTimestampDark,
						]}
					>
						{activity.timestamp}
					</Text>
					{activity.status && (
						<View
							style={[
								styles.statusBadge,
								{ backgroundColor: getStatusColor(activity.status) + "20" },
							]}
						>
							<Text
								style={[
									styles.statusText,
									{ color: getStatusColor(activity.status) },
								]}
							>
								{activity.status.toUpperCase()}
							</Text>
						</View>
					)}
				</View>
			</View>
		</View>
	);
};

// Quick Action Button Component
const QuickActionButton: React.FC<{ action: QuickAction }> = ({ action }) => {
	const { isDark } = useTheme();

	return (
		<TouchableOpacity
			style={[styles.quickActionButton, isDark && styles.quickActionButtonDark]}
			onPress={action.onPress}
			activeOpacity={0.7}
		>
			<View
				style={[
					styles.quickActionIcon,
					{ backgroundColor: action.color + "20" },
				]}
			>
				<Ionicons name={action.icon} size={28} color={action.color} />
			</View>
			<Text
				style={[styles.quickActionTitle, isDark && styles.quickActionTitleDark]}
			>
				{action.title}
			</Text>
			<Text
				style={[
					styles.quickActionDescription,
					isDark && styles.quickActionDescriptionDark,
				]}
			>
				{action.description}
			</Text>
		</TouchableOpacity>
	);
};

// Main Admin Dashboard Screen
export default function AdminDashboardScreen({
	navigation,
}: AdminDashboardScreenProps) {
	const { user } = useAuthStore();
	const { isDark } = useTheme();
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [stats, setStats] = useState<DashboardStats>({
		total_halls: 0,
		active_bookings: 0,
		pending_bookings: 0,
		todays_bookings: 0,
		hall_utilization: 0,
		conflicts_resolved: 0,
	});
	const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

	// Load dashboard data
	const loadDashboardData = useCallback(async () => {
		try {
			setIsLoading(true);

			// Fetch real data from services
			const [
				hallStats,
				allBookings,
				pendingBookings,
				todaysBookings,
				recentActivities,
			] = await Promise.all([
				hallManagementService.getHallStats(),
				bookingOversightService.getBookings({ status: "all" }),
				bookingOversightService.getBookings({ status: "pending" }),
				bookingOversightService.getBookings({
					status: "approved",
					date_range: "today",
				}),
				getRecentActivities(),
			]);

			// Calculate utilization rate
			const approvedBookings = allBookings.filter(
				(b: any) => b.status === "approved"
			);
			const utilizationRate =
				hallStats.total_halls > 0
					? Math.round(
							(approvedBookings.length / (hallStats.total_halls * 30)) * 100
					  ) // Rough calculation
					: 0;

			setStats({
				total_halls: hallStats.total_halls,
				active_bookings: approvedBookings.length,
				pending_bookings: pendingBookings.length,
				todays_bookings: todaysBookings.length,
				hall_utilization: utilizationRate,
				conflicts_resolved: 0, // TODO: Implement conflicts tracking
			});

			setRecentActivity(recentActivities);
			setIsLoading(false);
			setRefreshing(false);
		} catch (error) {
			console.error("Error loading dashboard data:", error);
			setIsLoading(false);
			setRefreshing(false);
		}
	}, []);

	// Quick actions configuration
	const quickActions: QuickAction[] = [
		{
			id: "add-hall",
			title: "Add Hall",
			description: "Create new seminar hall",
			icon: "add-circle-outline",
			color: Colors.primary[500],
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
		{
			id: "pending-bookings",
			title: "Pending Bookings",
			description: "Review booking requests",
			icon: "time-outline",
			color: Colors.warning.main,
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
		{
			id: "generate-report",
			title: "Generate Report",
			description: "Create usage reports",
			icon: "document-text-outline",
			color: Colors.success.main,
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
		{
			id: "view-calendar",
			title: "View Calendar",
			description: "See booking calendar",
			icon: "calendar-outline",
			color: Colors.gray[600],
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
	];

	// Load data when screen is focused
	useFocusEffect(
		useCallback(() => {
			loadDashboardData();
		}, [loadDashboardData])
	);

	// Handle pull-to-refresh
	const handleRefresh = () => {
		setRefreshing(true);
		loadDashboardData();
	};

	if (isLoading) {
		return (
			<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
				<StatusBar style={isDark ? "light" : "dark"} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary[500]} />
					<Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
						Loading dashboard...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Header */}
			<View style={styles.header}>
				<LinearGradient
					colors={
						isDark
							? [
									Colors.dark.background.secondary,
									Colors.dark.background.tertiary,
							  ]
							: [Colors.primary[600], Colors.primary[500]]
					}
					style={styles.headerGradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<View style={styles.headerContent}>
						<View style={styles.headerTop}>
							<View style={styles.headerTitleContainer}>
								<Ionicons
									name="business"
									size={24}
									color="white"
									style={styles.headerIcon}
								/>
								<Text style={styles.headerTitle}>Admin Dashboard</Text>
							</View>
							<TouchableOpacity
								style={styles.profileButton}
								onPress={() => navigation.navigate("MainTabs")}
							>
								<View style={styles.profileAvatar}>
									<Text style={styles.profileAvatarText}>
										{user?.name?.charAt(0).toUpperCase() || "A"}
									</Text>
								</View>
							</TouchableOpacity>
						</View>
						<Text style={styles.headerSubtitle}>Hall & Booking Management</Text>
					</View>
				</LinearGradient>
			</View>

			<ScrollView
				style={styles.scrollContainer}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						colors={[Colors.primary[500]]}
						tintColor={Colors.primary[500]}
					/>
				}
			>
				{/* Statistics Section */}
				<View style={styles.section}>
					<Text
						style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
					>
						Quick Overview
					</Text>
					<View style={styles.statsGrid}>
						<StatCard
							title="Total Halls"
							value={stats.total_halls}
							icon="business-outline"
							color={Colors.primary[500]}
						/>
						<StatCard
							title="Active Bookings"
							value={stats.active_bookings}
							icon="calendar-outline"
							color={Colors.success.main}
						/>
						<StatCard
							title="Pending Approvals"
							value={stats.pending_bookings}
							icon="time-outline"
							color={Colors.warning.main}
						/>
						<StatCard
							title="Today's Bookings"
							value={stats.todays_bookings}
							icon="today-outline"
							color={Colors.gray[600]}
						/>
						<StatCard
							title="Hall Utilization"
							value={`${stats.hall_utilization}%`}
							icon="stats-chart-outline"
							color={Colors.primary[400]}
						/>
						<StatCard
							title="Conflicts Resolved"
							value={stats.conflicts_resolved}
							icon="checkmark-circle-outline"
							color={Colors.error.main}
						/>
					</View>
				</View>

				{/* Quick Actions Section */}
				<View style={styles.section}>
					<Text
						style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
					>
						Quick Actions
					</Text>
					<View style={styles.quickActionsGrid}>
						{quickActions.map((action) => (
							<QuickActionButton key={action.id} action={action} />
						))}
					</View>
				</View>

				{/* Recent Activity Section */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text
							style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
						>
							Recent Activity
						</Text>
						<TouchableOpacity style={styles.viewAllButton}>
							<Text style={styles.viewAllText}>View All</Text>
							<Ionicons
								name="chevron-forward"
								size={16}
								color={Colors.primary[500]}
							/>
						</TouchableOpacity>
					</View>
					<View style={styles.activityList}>
						{recentActivity.map((activity) => (
							<ActivityItem key={activity.id} activity={activity} />
						))}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background.secondary,
	},
	containerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
	},
	loadingTextDark: {
		color: Colors.dark.text.secondary,
	},
	header: {
		width: "100%",
		overflow: "hidden",
	},
	headerGradient: {
		padding: Spacing[5],
		paddingBottom: Spacing[4],
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
	},
	headerContent: {
		flex: 1,
	},
	headerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing[2],
	},
	headerTitleContainer: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	headerIcon: {
		marginRight: Spacing[2],
	},
	headerTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: "white",
	},
	headerSubtitle: {
		fontSize: Typography.fontSize.sm,
		color: "rgba(255, 255, 255, 0.8)",
		marginTop: Spacing[1],
	},
	profileButton: {
		padding: Spacing[1],
	},
	profileAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "rgba(255, 255, 255, 0.2)",
		justifyContent: "center",
		alignItems: "center",
	},
	profileAvatarText: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.bold,
		color: "white",
	},
	scrollContainer: {
		flex: 1,
	},
	scrollContent: {
		padding: Spacing[5],
		paddingBottom: Spacing[8],
	},
	section: {
		marginBottom: Spacing[6],
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing[4],
	},
	sectionTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
	},
	sectionTitleDark: {
		color: Colors.dark.text.primary,
	},
	viewAllButton: {
		flexDirection: "row",
		alignItems: "center",
	},
	viewAllText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.primary[500],
		marginRight: Spacing[1],
	},
	statsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	statCard: {
		backgroundColor: "white",
		borderRadius: BorderRadius.lg,
		padding: Spacing[4],
		marginBottom: Spacing[3],
		width: (screenWidth - Spacing[5] * 2 - Spacing[3]) / 2,
		...Shadows.sm,
	},
	statCardDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.light,
		borderWidth: 1,
	},
	statCardHeader: {
		flexDirection: "row",
		alignItems: "center",
	},
	statIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	statContent: {
		flex: 1,
	},
	statValue: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		marginBottom: 2,
	},
	statValueDark: {
		// Color applied dynamically
	},
	statTitle: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: 2,
	},
	statTitleDark: {
		color: Colors.dark.text.secondary,
	},
	statSubtitle: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
	},
	statSubtitleDark: {
		color: Colors.dark.text.tertiary,
	},
	quickActionsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	quickActionButton: {
		backgroundColor: "white",
		borderRadius: BorderRadius.lg,
		padding: Spacing[4],
		alignItems: "center",
		marginBottom: Spacing[3],
		width: (screenWidth - Spacing[5] * 2 - Spacing[3]) / 2,
		...Shadows.sm,
	},
	quickActionButtonDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.light,
		borderWidth: 1,
	},
	quickActionIcon: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing[3],
	},
	quickActionTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		textAlign: "center",
		marginBottom: Spacing[1],
	},
	quickActionTitleDark: {
		color: Colors.dark.text.primary,
	},
	quickActionDescription: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		textAlign: "center",
	},
	quickActionDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	activityList: {
		backgroundColor: "white",
		borderRadius: BorderRadius.lg,
		...Shadows.sm,
	},
	activityItem: {
		flexDirection: "row",
		padding: Spacing[4],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
	},
	activityItemDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderBottomColor: Colors.dark.border.light,
	},
	activityIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	activityContent: {
		flex: 1,
	},
	activityTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
	},
	activityTitleDark: {
		color: Colors.dark.text.primary,
	},
	activityDescription: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[2],
	},
	activityDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	activityMeta: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	activityTimestamp: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
	},
	activityTimestampDark: {
		color: Colors.dark.text.tertiary,
	},
	statusBadge: {
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: BorderRadius.sm,
	},
	statusText: {
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.medium,
	},
});
