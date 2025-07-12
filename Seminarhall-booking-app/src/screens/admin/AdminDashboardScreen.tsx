import React, { useState, useEffect, useCallback, useRef } from "react";
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
	Alert,
	Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";

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

// Helper function to calculate booking statistics
const calculateBookingStats = (bookings: any[]): Partial<DashboardStats> => {
	const now = new Date();
	const today = now.toISOString().split("T")[0];
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

	// Handle both date formats: 'date' field and 'booking_date' field
	const todaysBookings = bookings.filter((booking) => {
		let bookingDate = booking.booking_date;

		// If it's in DDMMYYYY format, convert to YYYY-MM-DD for comparison
		if (bookingDate && bookingDate.length === 8) {
			bookingDate = `${bookingDate.substring(4, 8)}-${bookingDate.substring(
				2,
				4
			)}-${bookingDate.substring(0, 2)}`;
		}

		return bookingDate === today;
	});

	const tomorrowsBookings = bookings.filter((booking) => {
		let bookingDate = booking.booking_date;

		// If it's in DDMMYYYY format, convert to YYYY-MM-DD for comparison
		if (bookingDate && bookingDate.length === 8) {
			bookingDate = `${bookingDate.substring(4, 8)}-${bookingDate.substring(
				2,
				4
			)}-${bookingDate.substring(0, 2)}`;
		}

		return bookingDate === tomorrow;
	});

	const statusCounts = bookings.reduce((acc, booking) => {
		acc[booking.status] = (acc[booking.status] || 0) + 1;
		return acc;
	}, {});

	// Calculate average booking duration
	const averageDuration =
		bookings.length > 0
			? bookings.reduce((sum, booking) => {
					const startTime = parseTime(booking.start_time);
					const endTime = parseTime(booking.end_time);
					return sum + (endTime - startTime);
			  }, 0) / bookings.length
			: 0;

	// Find peak hour
	const hourCounts = bookings.reduce((acc, booking) => {
		const hour = booking.start_time ? booking.start_time.split(":")[0] : "09";
		acc[hour] = (acc[hour] || 0) + 1;
		return acc;
	}, {});

	const peakHour =
		Object.keys(hourCounts).length > 0
			? Object.keys(hourCounts).reduce(
					(a, b) => (hourCounts[a] > hourCounts[b] ? a : b),
					"09"
			  )
			: "09";

	// Find most booked hall
	const hallCounts = bookings.reduce((acc, booking) => {
		const hallName = booking.hall_name || "Unknown Hall";
		acc[hallName] = (acc[hallName] || 0) + 1;
		return acc;
	}, {});

	const mostBookedHall =
		Object.keys(hallCounts).length > 0
			? Object.keys(hallCounts).reduce(
					(a, b) => (hallCounts[a] > hallCounts[b] ? a : b),
					"No bookings"
			  )
			: "No bookings";

	return {
		total_bookings: bookings.length,
		active_bookings: statusCounts.approved || 0,
		pending_bookings: statusCounts.pending || 0,
		approved_bookings: statusCounts.approved || 0,
		completed_bookings: statusCounts.completed || 0,
		cancelled_bookings: statusCounts.cancelled || 0,
		rejected_bookings: statusCounts.rejected || 0,
		todays_bookings: todaysBookings.length,
		tomorrows_bookings: tomorrowsBookings.length,
		average_booking_duration: Math.round(averageDuration),
		peak_hour: `${peakHour}:00`,
		most_booked_hall: mostBookedHall,
	};
};

// Helper function to parse time
const parseTime = (timeStr: string): number => {
	const [hours, minutes] = timeStr.split(":").map(Number);
	return hours * 60 + minutes;
};

// Enhanced function to get recent activities with real-time data
const getRecentActivities = async (): Promise<RecentActivity[]> => {
	try {
		// Get recent bookings with detailed information
		const recentBookings = await bookingOversightService.getBookings({
			status: "all",
		});

		// Get recent halls
		const halls = await hallManagementService.getAllHalls();

		const activities: RecentActivity[] = [];

		// Add comprehensive booking activities (only recent ones)
		recentBookings.slice(0, 10).forEach((booking: any) => {
			const createdAt = new Date(booking.created_at);
			const updatedAt = new Date(booking.updated_at);

			// Add creation activity
			activities.push({
				id: `booking-created-${booking.id}`,
				type: "booking",
				action: "created",
				title: `New Booking Request`,
				description: `${
					booking.user_name || booking.user_email?.split("@")[0] || "User"
				} requested ${booking.hall_name} for ${booking.purpose}`,
				timestamp: formatRelativeTime(createdAt),
				user: booking.user_name || booking.user_email?.split("@")[0],
				user_email: booking.user_email,
				hall_name: booking.hall_name,
				booking_id: booking.id,
				status: booking.status,
				priority: booking.status === "pending" ? "high" : "medium",
				metadata: {
					booking_date: booking.booking_date,
					start_time: booking.start_time,
					end_time: booking.end_time,
					attendees: booking.attendees_count,
					created_at: booking.created_at,
					updated_at: booking.updated_at,
				},
			});

			// Add status change activity if booking was updated
			if (updatedAt > createdAt && booking.status !== "pending") {
				let actionTitle = "";
				let actionDescription = "";
				let priority: "low" | "medium" | "high" | "urgent" = "medium";

				switch (booking.status) {
					case "approved":
						actionTitle = "Booking Approved";
						actionDescription = `${booking.hall_name} booking approved for ${
							booking.user_name || "User"
						}`;
						priority = "low";
						break;
					case "rejected":
						actionTitle = "Booking Rejected";
						actionDescription = `${booking.hall_name} booking rejected for ${
							booking.user_name || "User"
						}`;
						priority = "high";
						break;
					case "completed":
						actionTitle = "Booking Completed";
						actionDescription = `${booking.hall_name} booking completed successfully`;
						priority = "low";
						break;
					case "cancelled":
						actionTitle = "Booking Cancelled";
						actionDescription = `${booking.hall_name} booking was cancelled`;
						priority = "medium";
						break;
				}

				if (actionTitle) {
					activities.push({
						id: `booking-${booking.status}-${booking.id}`,
						type: "booking",
						action: booking.status as any,
						title: actionTitle,
						description: actionDescription,
						timestamp: formatRelativeTime(updatedAt),
						user: booking.user_name || booking.user_email?.split("@")[0],
						user_email: booking.user_email,
						hall_name: booking.hall_name,
						booking_id: booking.id,
						status: booking.status,
						priority,
						metadata: {
							booking_date: booking.booking_date,
							start_time: booking.start_time,
							end_time: booking.end_time,
							created_at: booking.created_at,
							updated_at: booking.updated_at,
						},
					});
				}
			}
		});

		// Add hall management activities (only recent ones)
		halls.slice(0, 3).forEach((hall: any) => {
			activities.push({
				id: `hall-${hall.id}`,
				type: "hall",
				action: "created",
				title: "New Hall Added",
				description: `"${hall.name}" added to system (Capacity: ${hall.capacity})`,
				timestamp: formatRelativeTime(new Date(hall.created_at)),
				hall_name: hall.name,
				status: hall.is_active ? "approved" : "pending",
				priority: "low",
				metadata: {
					capacity: hall.capacity,
					features: hall.features,
					is_active: hall.is_active,
					is_maintenance: hall.is_maintenance,
					created_at: hall.created_at,
					updated_at: hall.updated_at || hall.created_at,
				},
			});
		});

		// Sort by most recent first and limit to 4 activities for cleaner UI
		return activities
			.sort((a, b) => {
				// Prioritize "Just now" and urgent activities
				if (
					a.timestamp.includes("Just now") &&
					!b.timestamp.includes("Just now")
				)
					return -1;
				if (
					!a.timestamp.includes("Just now") &&
					b.timestamp.includes("Just now")
				)
					return 1;
				if (a.priority === "urgent" && b.priority !== "urgent") return -1;
				if (a.priority !== "urgent" && b.priority === "urgent") return 1;

				// Sort by creation time for bookings, updated time for status changes
				const aTime =
					a.type === "booking" && a.action !== "created"
						? new Date(a.metadata?.updated_at || Date.now()).getTime()
						: new Date(a.metadata?.created_at || Date.now()).getTime();
				const bTime =
					b.type === "booking" && b.action !== "created"
						? new Date(b.metadata?.updated_at || Date.now()).getTime()
						: new Date(b.metadata?.created_at || Date.now()).getTime();

				return bTime - aTime; // Most recent first
			})
			.slice(0, 4); // Limit to 4 activities for better UX
	} catch (error) {
		console.error("Error fetching recent activities:", error);
		return [];
	}
};

// Types
interface DashboardStats {
	total_halls: number;
	active_halls: number;
	maintenance_halls: number;
	total_bookings: number;
	active_bookings: number;
	pending_bookings: number;
	approved_bookings: number;
	completed_bookings: number;
	cancelled_bookings: number;
	rejected_bookings: number;
	todays_bookings: number;
	tomorrows_bookings: number;
	hall_utilization: number;
	conflicts_resolved: number;
	average_booking_duration: number;
	peak_hour: string;
	most_booked_hall: string;
	recent_bookings_trend: "up" | "down" | "stable";
}

interface RecentActivity {
	id: string;
	type: "booking" | "hall" | "conflict" | "maintenance" | "user" | "system";
	action:
		| "created"
		| "updated"
		| "deleted"
		| "approved"
		| "rejected"
		| "cancelled"
		| "completed";
	title: string;
	description: string;
	timestamp: string;
	user?: string;
	user_email?: string;
	hall_name?: string;
	booking_id?: string;
	status?: "pending" | "approved" | "rejected" | "completed" | "cancelled";
	priority?: "low" | "medium" | "high" | "urgent";
	metadata?: Record<string, any>;
}

interface QuickAction {
	id: string;
	title: string;
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	badge?: number;
	onPress: () => void;
}

interface AdminDashboardScreenProps {
	navigation: StackNavigationProp<RootStackParamList>;
}

// Enhanced Statistics Card Component with animations
const StatCard: React.FC<{
	title: string;
	value: number | string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	subtitle?: string;
	trend?: "up" | "down" | "stable";
	isLive?: boolean;
	badge?: number;
}> = ({ title, value, icon, color, subtitle, trend, isLive, badge }) => {
	const { isDark } = useTheme();
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const glowAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (isLive) {
			const glowLoop = Animated.loop(
				Animated.sequence([
					Animated.timing(glowAnim, {
						toValue: 1,
						duration: 2000,
						useNativeDriver: true,
					}),
					Animated.timing(glowAnim, {
						toValue: 0,
						duration: 2000,
						useNativeDriver: true,
					}),
				])
			);
			glowLoop.start();
			return () => glowLoop.stop();
		}
	}, [isLive]);

	const handlePress = () => {
		Animated.sequence([
			Animated.timing(scaleAnim, {
				toValue: 0.95,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(scaleAnim, {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}),
		]).start();
	};

	const getTrendIcon = () => {
		switch (trend) {
			case "up":
				return "trending-up";
			case "down":
				return "trending-down";
			default:
				return "remove";
		}
	};

	const getTrendColor = () => {
		switch (trend) {
			case "up":
				return Colors.success.main;
			case "down":
				return Colors.error.main;
			default:
				return Colors.gray[500];
		}
	};

	return (
		<TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
			<Animated.View
				style={[
					styles.statCard,
					isDark && styles.statCardDark,
					{ transform: [{ scale: scaleAnim }] },
					isLive && {
						shadowColor: color,
						shadowOpacity: glowAnim,
						shadowRadius: 10,
						elevation: glowAnim,
					},
				]}
			>
				{badge !== undefined && badge > 0 && (
					<View
						style={[styles.statBadge, { backgroundColor: Colors.error.main }]}
					>
						<Text style={styles.statBadgeText}>
							{badge > 99 ? "99+" : badge}
						</Text>
					</View>
				)}

				<View style={styles.statCardHeader}>
					<View
						style={[
							styles.statIconContainer,
							{ backgroundColor: color + "20" },
						]}
					>
						<Ionicons name={icon} size={24} color={color} />
						{isLive && (
							<Animated.View
								style={[styles.liveIndicator, { opacity: glowAnim }]}
							>
								<View style={styles.liveDot} />
							</Animated.View>
						)}
					</View>
					<View style={styles.statContent}>
						<View style={styles.statValueRow}>
							<Text
								style={[
									styles.statValue,
									{ color },
									isDark && styles.statValueDark,
								]}
							>
								{value}
							</Text>
							{trend && (
								<Ionicons
									name={getTrendIcon()}
									size={16}
									color={getTrendColor()}
									style={styles.trendIcon}
								/>
							)}
						</View>
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
			</Animated.View>
		</TouchableOpacity>
	);
};

// Enhanced Activity Item Component
const ActivityItem: React.FC<{ activity: RecentActivity; index: number }> = ({
	activity,
	index,
}) => {
	const { isDark } = useTheme();
	const slideAnim = useRef(new Animated.Value(50)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		// Staggered animation for activity items
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 500,
				delay: index * 100,
				useNativeDriver: true,
			}),
			Animated.timing(opacityAnim, {
				toValue: 1,
				duration: 500,
				delay: index * 100,
				useNativeDriver: true,
			}),
		]).start();
	}, [index]);

	const getActivityIcon = (
		type: RecentActivity["type"],
		action: RecentActivity["action"]
	) => {
		switch (type) {
			case "booking":
				switch (action) {
					case "created":
						return "add-circle-outline";
					case "approved":
						return "checkmark-circle-outline";
					case "rejected":
						return "close-circle-outline";
					case "cancelled":
						return "ban-outline";
					case "completed":
						return "checkmark-done-circle-outline";
					default:
						return "calendar-outline";
				}
			case "hall":
				return "business-outline";
			case "conflict":
				return "warning-outline";
			case "maintenance":
				return "construct-outline";
			case "user":
				return "person-outline";
			case "system":
				return "settings-outline";
			default:
				return "information-circle-outline";
		}
	};

	const getActivityColor = (
		type: RecentActivity["type"],
		action: RecentActivity["action"]
	) => {
		switch (type) {
			case "booking":
				switch (action) {
					case "created":
						return Colors.primary[500];
					case "approved":
						return Colors.success.main;
					case "rejected":
						return Colors.error.main;
					case "cancelled":
						return Colors.warning.main;
					case "completed":
						return "#6366f1";
					default:
						return Colors.primary[500];
				}
			case "hall":
				return Colors.success.main;
			case "conflict":
				return Colors.error.main;
			case "maintenance":
				return Colors.warning.main;
			case "user":
				return Colors.primary[600];
			case "system":
				return Colors.gray[600];
			default:
				return Colors.gray[500];
		}
	};

	const getPriorityIndicator = (priority?: RecentActivity["priority"]) => {
		switch (priority) {
			case "urgent":
				return { color: Colors.error.main, size: 8 };
			case "high":
				return { color: Colors.warning.main, size: 6 };
			case "medium":
				return { color: Colors.primary[500], size: 4 };
			default:
				return { color: Colors.gray[400], size: 3 };
		}
	};

	const priorityIndicator = getPriorityIndicator(activity.priority);

	return (
		<Animated.View
			style={[
				styles.activityItem,
				isDark && styles.activityItemDark,
				{
					opacity: opacityAnim,
					transform: [{ translateX: slideAnim }],
				},
			]}
		>
			<View
				style={[
					styles.activityIcon,
					{
						backgroundColor:
							getActivityColor(activity.type, activity.action) + "20",
					},
				]}
			>
				<Ionicons
					name={getActivityIcon(activity.type, activity.action)}
					size={20}
					color={getActivityColor(activity.type, activity.action)}
				/>
			</View>
			<View style={styles.activityContent}>
				<View style={styles.activityHeader}>
					<Text
						style={[styles.activityTitle, isDark && styles.activityTitleDark]}
					>
						{activity.title}
					</Text>
					<View
						style={[
							styles.priorityIndicator,
							{
								backgroundColor: priorityIndicator.color,
								width: priorityIndicator.size,
								height: priorityIndicator.size,
							},
						]}
					/>
				</View>
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
					{activity.user && (
						<Text
							style={[styles.activityUser, isDark && styles.activityUserDark]}
						>
							by {activity.user}
						</Text>
					)}
					{activity.status && (
						<View
							style={[
								styles.statusBadge,
								{
									backgroundColor:
										getActivityColor(activity.type, activity.action) + "20",
								},
							]}
						>
							<Text
								style={[
									styles.statusText,
									{ color: getActivityColor(activity.type, activity.action) },
								]}
							>
								{activity.status.toUpperCase()}
							</Text>
						</View>
					)}
				</View>
			</View>
		</Animated.View>
	);
};

// Enhanced Quick Action Button Component
const QuickActionButton: React.FC<{ action: QuickAction; index: number }> = ({
	action,
	index,
}) => {
	const { isDark } = useTheme();
	const scaleAnim = useRef(new Animated.Value(0.8)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	useEffect(() => {
		// Staggered entrance animation
		Animated.parallel([
			Animated.timing(scaleAnim, {
				toValue: 1,
				duration: 400,
				delay: index * 100,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 400,
				delay: index * 100,
				useNativeDriver: true,
			}),
		]).start();
	}, [index]);

	const handlePress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		Animated.sequence([
			Animated.timing(scaleAnim, {
				toValue: 0.9,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(scaleAnim, {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}),
		]).start(() => {
			action.onPress();
		});
	};

	return (
		<TouchableOpacity
			style={[styles.quickActionButton, isDark && styles.quickActionButtonDark]}
			onPress={handlePress}
			activeOpacity={0.7}
		>
			<Animated.View
				style={{
					transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
				}}
			>
				{action.badge !== undefined && action.badge > 0 && (
					<View
						style={[styles.actionBadge, { backgroundColor: Colors.error.main }]}
					>
						<Text style={styles.actionBadgeText}>
							{action.badge > 99 ? "99+" : action.badge}
						</Text>
					</View>
				)}

				<View
					style={[
						styles.quickActionIcon,
						{ backgroundColor: action.color + "20" },
					]}
				>
					<Ionicons name={action.icon} size={28} color={action.color} />
				</View>
				<Text
					style={[
						styles.quickActionTitle,
						isDark && styles.quickActionTitleDark,
					]}
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
			</Animated.View>
		</TouchableOpacity>
	);
};

// Main Admin Dashboard Screen
export default function AdminDashboardScreen({
	navigation,
}: AdminDashboardScreenProps) {
	const { user } = useAuthStore();
	const { isDark } = useTheme();

	// State management
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
	const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
	const [stats, setStats] = useState<DashboardStats>({
		total_halls: 0,
		active_halls: 0,
		maintenance_halls: 0,
		total_bookings: 0,
		active_bookings: 0,
		pending_bookings: 0,
		approved_bookings: 0,
		completed_bookings: 0,
		cancelled_bookings: 0,
		rejected_bookings: 0,
		todays_bookings: 0,
		tomorrows_bookings: 0,
		hall_utilization: 0,
		conflicts_resolved: 0,
		average_booking_duration: 0,
		peak_hour: "09:00",
		most_booked_hall: "Loading...",
		recent_bookings_trend: "stable",
	});
	const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
	const [realTimeUpdates, setRealTimeUpdates] = useState(0);

	// Animation values
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const updateIndicatorAnim = useRef(new Animated.Value(0)).current;

	// Auto-refresh timer
	const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

	// Real-time subscription
	const subscriptionRef = useRef<any>(null);

	// Load comprehensive dashboard data
	const loadDashboardData = useCallback(async (showLoader = true) => {
		try {
			if (showLoader) setIsLoading(true);

			console.log("📊 Starting dashboard data load...");

			// Fetch all data in parallel for better performance
			const [hallsData, allBookings, hallStats] = await Promise.all([
				hallManagementService.getAllHalls(),
				bookingOversightService.getBookings({ status: "all" }), // Use bookingOversightService
				hallManagementService.getHallStats(),
			]);

			console.log("📊 Data fetched:", {
				halls: hallsData?.length || 0,
				bookings: allBookings?.length || 0,
				hallStats: hallStats ? "✓" : "✗",
			});

			// Calculate comprehensive statistics
			const bookingStats = calculateBookingStats(allBookings || []);
			console.log("📊 Booking Statistics:", {
				totalBookings: (allBookings || []).length,
				bookingStats,
				firstBooking:
					allBookings && allBookings[0]
						? {
								id: allBookings[0].id,
								booking_date: allBookings[0].booking_date,
								status: allBookings[0].status,
								hall_name: allBookings[0].hall_name,
						  }
						: "No bookings",
			});

			// Calculate hall statistics
			const activeHalls = (hallsData || []).filter(
				(hall: any) => hall.is_active && !hall.is_maintenance
			).length;
			const maintenanceHalls = (hallsData || []).filter(
				(hall: any) => hall.is_maintenance
			).length;

			// Calculate utilization rate (more accurate)
			const approvedBookings = (allBookings || []).filter(
				(b: any) => b.status === "approved"
			);
			const totalHallHours = (hallsData || []).length * 12; // Assuming 12 working hours per day
			const bookedHours = approvedBookings.reduce(
				(sum: number, booking: any) => {
					const duration =
						parseTime(booking.end_time) - parseTime(booking.start_time);
					return sum + duration / 60; // Convert to hours
				},
				0
			);
			const utilizationRate =
				totalHallHours > 0
					? Math.round((bookedHours / totalHallHours) * 100)
					: 0;

			// Determine booking trend
			const recentBookings = (allBookings || []).filter((booking: any) => {
				const bookingDate = new Date(booking.created_at);
				const threeDaysAgo = new Date();
				threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
				return bookingDate >= threeDaysAgo;
			});

			const weekOldBookings = (allBookings || []).filter((booking: any) => {
				const bookingDate = new Date(booking.created_at);
				const sevenDaysAgo = new Date();
				sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
				const fourDaysAgo = new Date();
				fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
				return bookingDate >= sevenDaysAgo && bookingDate < fourDaysAgo;
			});

			let trend: "up" | "down" | "stable" = "stable";
			if (recentBookings.length > weekOldBookings.length * 1.1) trend = "up";
			else if (recentBookings.length < weekOldBookings.length * 0.9)
				trend = "down";

			// Update stats with comprehensive data
			const newStats: DashboardStats = {
				total_halls: (hallsData || []).length,
				active_halls: activeHalls,
				maintenance_halls: maintenanceHalls,
				hall_utilization: utilizationRate,
				conflicts_resolved: 0, // TODO: Implement conflict detection
				recent_bookings_trend: trend,
				total_bookings: bookingStats.total_bookings || 0,
				active_bookings: bookingStats.active_bookings || 0,
				pending_bookings: bookingStats.pending_bookings || 0,
				approved_bookings: bookingStats.approved_bookings || 0,
				completed_bookings: bookingStats.completed_bookings || 0,
				cancelled_bookings: bookingStats.cancelled_bookings || 0,
				rejected_bookings: bookingStats.rejected_bookings || 0,
				todays_bookings: bookingStats.todays_bookings || 0,
				tomorrows_bookings: bookingStats.tomorrows_bookings || 0,
				average_booking_duration: bookingStats.average_booking_duration || 0,
				peak_hour: bookingStats.peak_hour || "09:00",
				most_booked_hall: bookingStats.most_booked_hall || "No bookings",
			};

			console.log("📊 Final stats:", newStats);
			setStats(newStats);

			// Get recent activities
			const activities = await getRecentActivities();
			setRecentActivity(activities);

			setLastUpdated(new Date());
			setRealTimeUpdates((prev) => prev + 1);

			// Animate update indicator
			Animated.sequence([
				Animated.timing(updateIndicatorAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(updateIndicatorAnim, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			]).start();

			if (showLoader) {
				setIsLoading(false);
				setRefreshing(false);
			}
		} catch (error) {
			console.error("Error loading dashboard data:", error);
			Alert.alert("Error", "Failed to load dashboard data. Please try again.");
			setIsLoading(false);
			setRefreshing(false);
		}
	}, []);

	// Setup real-time subscriptions
	const setupRealTimeSubscriptions = useCallback(() => {
		if (subscriptionRef.current) {
			subscriptionRef.current.unsubscribe();
		}

		// Subscribe to booking changes
		subscriptionRef.current = supabase
			.channel("dashboard-updates")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "smart_bookings",
				},
				(payload) => {
					console.log("📊 Real-time booking update:", payload);
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

					// Reload data with slight delay to ensure consistency
					setTimeout(() => {
						loadDashboardData(false);
					}, 500);
				}
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "halls",
				},
				(payload) => {
					console.log("🏢 Real-time hall update:", payload);
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

					setTimeout(() => {
						loadDashboardData(false);
					}, 500);
				}
			)
			.subscribe();

		console.log("🔄 Real-time subscriptions established");
	}, [loadDashboardData]);

	// Setup auto-refresh
	const setupAutoRefresh = useCallback(() => {
		if (autoRefreshEnabled && !autoRefreshInterval.current) {
			autoRefreshInterval.current = setInterval(() => {
				console.log("🔄 Auto-refreshing dashboard data...");
				loadDashboardData(false);
			}, 30000); // Refresh every 30 seconds
		}
	}, [autoRefreshEnabled, loadDashboardData]);

	// Enhanced quick actions with dynamic badges
	const quickActions: QuickAction[] = [
		{
			id: "add-hall",
			title: "Add Hall",
			description: "Create new seminar hall",
			icon: "add-circle-outline",
			color: Colors.primary[500],
			onPress: () => {
				navigation.navigate("AddEditHall");
			},
		},
		{
			id: "pending-bookings",
			title: "Pending Bookings",
			description: "Review booking requests",
			icon: "time-outline",
			color: Colors.warning.main,
			badge: stats.pending_bookings,
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
		{
			id: "todays-bookings",
			title: "Today's Bookings",
			description: "View today's schedule",
			icon: "today-outline",
			color: Colors.success.main,
			badge: stats.todays_bookings,
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
		{
			id: "hall-management",
			title: "Manage Halls",
			description: "Edit halls & settings",
			icon: "business-outline",
			color: Colors.primary[600],
			badge: stats.maintenance_halls > 0 ? stats.maintenance_halls : undefined,
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
		{
			id: "generate-report",
			title: "Generate Report",
			description: "Create usage reports",
			icon: "document-text-outline",
			color: Colors.gray[600],
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
		{
			id: "view-calendar",
			title: "View Calendar",
			description: "See booking calendar",
			icon: "calendar-outline",
			color: "#8b5cf6",
			onPress: () => {
				navigation.navigate("AdminTabs");
			},
		},
	];

	// Effect for initial setup and animations
	useEffect(() => {
		// Entrance animations
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 800,
			useNativeDriver: true,
		}).start();

		// Pulse animation for real-time indicator
		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.3,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		);
		pulseLoop.start();

		return () => {
			pulseLoop.stop();
		};
	}, []);

	// Effect for real-time subscriptions
	useEffect(() => {
		setupRealTimeSubscriptions();

		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.unsubscribe();
				console.log("🔄 Real-time subscriptions cleaned up");
			}
		};
	}, [setupRealTimeSubscriptions]);

	// Effect for auto-refresh
	useEffect(() => {
		if (autoRefreshEnabled) {
			setupAutoRefresh();
		} else if (autoRefreshInterval.current) {
			clearInterval(autoRefreshInterval.current);
			autoRefreshInterval.current = null;
		}

		return () => {
			if (autoRefreshInterval.current) {
				clearInterval(autoRefreshInterval.current);
			}
		};
	}, [autoRefreshEnabled, setupAutoRefresh]);

	// Load data when screen is focused
	useFocusEffect(
		useCallback(() => {
			loadDashboardData();
		}, [loadDashboardData])
	);

	// Handle pull-to-refresh
	const handleRefresh = useCallback(() => {
		setRefreshing(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		loadDashboardData();
	}, [loadDashboardData]);

	// Toggle auto-refresh
	const toggleAutoRefresh = useCallback(() => {
		setAutoRefreshEnabled((prev) => !prev);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, []);

	// Manual refresh button
	const handleManualRefresh = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		loadDashboardData(false);
	}, [loadDashboardData]);

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
				{/* Real-time Status Header */}
				<Animated.View style={[styles.statusHeader, { opacity: fadeAnim }]}>
					<View style={styles.statusInfo}>
						<View style={styles.realTimeIndicator}>
							<Animated.View
								style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]}
							/>
							<Text
								style={[styles.realTimeText, isDark && styles.realTimeTextDark]}
							>
								Live Updates {autoRefreshEnabled ? "ON" : "OFF"}
							</Text>
						</View>
						<Text
							style={[
								styles.lastUpdatedText,
								isDark && styles.lastUpdatedTextDark,
							]}
						>
							Last updated: {lastUpdated.toLocaleTimeString()}
						</Text>
					</View>
					<View style={styles.statusActions}>
						<TouchableOpacity
							style={[
								styles.autoRefreshToggle,
								autoRefreshEnabled && styles.autoRefreshActive,
							]}
							onPress={toggleAutoRefresh}
						>
							<Ionicons
								name={autoRefreshEnabled ? "sync" : "sync-outline"}
								size={16}
								color={autoRefreshEnabled ? "white" : Colors.primary[500]}
							/>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.manualRefreshButton}
							onPress={handleManualRefresh}
						>
							<Animated.View
								style={{ transform: [{ scale: updateIndicatorAnim }] }}
							>
								<Ionicons
									name="refresh"
									size={16}
									color={Colors.primary[500]}
								/>
							</Animated.View>
						</TouchableOpacity>
					</View>
				</Animated.View>

				{/* Enhanced Statistics Section */}
				<Animated.View style={[styles.section, { opacity: fadeAnim }]}>
					<Text
						style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
					>
						📊 Real-time Overview
					</Text>
					<View style={styles.statsGrid}>
						<StatCard
							title="Total Halls"
							value={stats.total_halls}
							icon="business-outline"
							color={Colors.primary[500]}
							subtitle={`${stats.active_halls} active, ${stats.maintenance_halls} maintenance`}
							isLive={true}
						/>
						<StatCard
							title="Active Bookings"
							value={stats.active_bookings}
							icon="calendar-outline"
							color={Colors.success.main}
							trend={stats.recent_bookings_trend}
							isLive={true}
						/>
						<StatCard
							title="Pending Approvals"
							value={stats.pending_bookings}
							icon="time-outline"
							color={Colors.warning.main}
							badge={stats.pending_bookings}
							isLive={stats.pending_bookings > 0}
						/>
						<StatCard
							title="Today's Bookings"
							value={stats.todays_bookings}
							icon="today-outline"
							color={Colors.gray[600]}
							subtitle={`${stats.tomorrows_bookings} tomorrow`}
						/>
						<StatCard
							title="Completed"
							value={stats.completed_bookings}
							icon="checkmark-done-circle-outline"
							color="#6366f1"
							subtitle="All-time total"
						/>
						<StatCard
							title="Hall Utilization"
							value={`${stats.hall_utilization}%`}
							icon="stats-chart-outline"
							color={Colors.primary[400]}
							subtitle={`Peak: ${stats.peak_hour}`}
						/>
					</View>

					{/* Additional Stats Row */}
					<View style={styles.additionalStatsRow}>
						<View style={styles.miniStatCard}>
							<Text
								style={[styles.miniStatValue, { color: Colors.error.main }]}
							>
								{stats.cancelled_bookings + stats.rejected_bookings}
							</Text>
							<Text
								style={[
									styles.miniStatLabel,
									isDark && styles.miniStatLabelDark,
								]}
							>
								Cancelled/Rejected
							</Text>
						</View>
						<View style={styles.miniStatCard}>
							<Text
								style={[styles.miniStatValue, { color: Colors.primary[500] }]}
							>
								{stats.average_booking_duration}min
							</Text>
							<Text
								style={[
									styles.miniStatLabel,
									isDark && styles.miniStatLabelDark,
								]}
							>
								Avg Duration
							</Text>
						</View>{" "}
						<View style={styles.miniStatCard}>
							<Text
								style={[styles.miniStatValue, { color: Colors.success.main }]}
							>
								{stats.most_booked_hall === "No bookings"
									? "N/A"
									: stats.most_booked_hall.length > 12
									? stats.most_booked_hall.substring(0, 12) + "..."
									: stats.most_booked_hall}
							</Text>
							<Text
								style={[
									styles.miniStatLabel,
									isDark && styles.miniStatLabelDark,
								]}
							>
								Popular Hall
							</Text>
						</View>
					</View>
				</Animated.View>

				{/* Enhanced Quick Actions */}
				<Animated.View style={[styles.section, { opacity: fadeAnim }]}>
					<Text
						style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
					>
						⚡ Quick Actions
					</Text>
					<View style={styles.quickActionsGrid}>
						{quickActions.map((action, index) => (
							<QuickActionButton
								key={action.id}
								action={action}
								index={index}
							/>
						))}
					</View>
				</Animated.View>

				{/* Enhanced Recent Activity */}
				<Animated.View style={[styles.section, { opacity: fadeAnim }]}>
					<View style={styles.sectionHeader}>
						<Text
							style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
						>
							🔄 Recent Activity
						</Text>
						<Text
							style={[styles.activityCount, isDark && styles.activityCountDark]}
						>
							{recentActivity.length} activities
						</Text>
					</View>
					<View style={styles.activityList}>
						{recentActivity.length > 0 ? (
							recentActivity.map((activity, index) => (
								<ActivityItem
									key={activity.id}
									activity={activity}
									index={index}
								/>
							))
						) : (
							<View style={styles.emptyState}>
								<Ionicons
									name="information-circle-outline"
									size={48}
									color={Colors.gray[400]}
								/>
								<Text
									style={[
										styles.emptyStateText,
										isDark && styles.emptyStateTextDark,
									]}
								>
									No recent activity
								</Text>
								<Text
									style={[
										styles.emptyStateSubtext,
										isDark && styles.emptyStateSubtextDark,
									]}
								>
									Activities will appear here as they happen
								</Text>
							</View>
						)}
					</View>
				</Animated.View>
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
	// Enhanced Dashboard Styles
	statusHeader: {
		backgroundColor: "white",
		marginHorizontal: Spacing[4],
		marginTop: Spacing[3],
		marginBottom: Spacing[2],
		borderRadius: BorderRadius.lg,
		padding: Spacing[3],
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		...Shadows.sm,
	},
	statusInfo: {
		flex: 1,
	},
	realTimeIndicator: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
	},
	liveDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.success.main,
		marginRight: 8,
	},
	realTimeText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.primary,
	},
	realTimeTextDark: {
		color: Colors.dark.text.primary,
	},
	lastUpdatedText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
	},
	lastUpdatedTextDark: {
		color: Colors.dark.text.secondary,
	},
	statusActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	autoRefreshToggle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: Colors.gray[100],
		justifyContent: "center",
		alignItems: "center",
	},
	autoRefreshActive: {
		backgroundColor: Colors.primary[500],
	},
	manualRefreshButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: Colors.gray[100],
		justifyContent: "center",
		alignItems: "center",
	},
	// Enhanced Stat Card Styles
	statBadge: {
		position: "absolute",
		top: -5,
		right: -5,
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1,
	},
	statBadgeText: {
		color: "white",
		fontSize: 10,
		fontWeight: "bold",
	},
	liveIndicator: {
		position: "absolute",
		top: -2,
		right: -2,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.success.main,
	},
	statValueRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	trendIcon: {
		marginLeft: 4,
	},
	// Additional Stats Row
	additionalStatsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: Spacing[3],
	},
	miniStatCard: {
		backgroundColor: "white",
		borderRadius: BorderRadius.md,
		padding: Spacing[3],
		alignItems: "center",
		flex: 1,
		marginHorizontal: 4,
		...Shadows.sm,
	},
	miniStatValue: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.bold,
		marginBottom: 4,
	},
	miniStatLabel: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
		textAlign: "center",
	},
	miniStatLabelDark: {
		color: Colors.dark.text.secondary,
	},
	// Enhanced Activity Styles
	activityHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 4,
	},
	priorityIndicator: {
		borderRadius: 2,
		marginTop: 2,
	},
	activityUser: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
		fontStyle: "italic",
	},
	activityUserDark: {
		color: Colors.dark.text.tertiary,
	},
	activityCount: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		backgroundColor: Colors.gray[100],
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
	},
	activityCountDark: {
		color: Colors.dark.text.secondary,
		backgroundColor: Colors.dark.background.tertiary,
	},
	// Enhanced Quick Actions - Action badges
	actionBadge: {
		position: "absolute",
		top: -5,
		right: -5,
		borderRadius: 12,
		minWidth: 24,
		height: 24,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1,
	},
	actionBadgeText: {
		color: "white",
		fontSize: 11,
		fontWeight: "bold",
	},
	// Empty State
	emptyState: {
		alignItems: "center",
		paddingVertical: Spacing[8],
	},
	emptyStateText: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.secondary,
		marginTop: Spacing[3],
		marginBottom: Spacing[1],
	},
	emptyStateTextDark: {
		color: Colors.dark.text.secondary,
	},
	emptyStateSubtext: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.tertiary,
		textAlign: "center",
	},
	emptyStateSubtextDark: {
		color: Colors.dark.text.tertiary,
	},
});
