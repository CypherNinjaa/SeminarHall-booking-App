import React, { useEffect, useRef, useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	Animated,
	Dimensions,
	Image,
	RefreshControl,
	Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { getThemeColors } from "../utils/themeUtils";
import { useAuthStore } from "../stores/authStore";
import { hallManagementService, Hall } from "../services/hallManagementService";
import {
	bookingOversightService,
	BookingDetails,
} from "../services/bookingOversightService";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }: { navigation: any }) {
	const { isDark, toggleTheme } = useTheme();
	const themeColors = getThemeColors(isDark);
	const { user, isAuthenticated } = useAuthStore();

	// State
	const [refreshing, setRefreshing] = useState(false);
	const [currentTime, setCurrentTime] = useState(new Date());
	const [halls, setHalls] = useState<Hall[]>([]);
	const [bookings, setBookings] = useState<BookingDetails[]>([]);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		availableHalls: 0,
		thisMonthBookings: 0,
		pendingBookings: 0,
	});

	// Animation values
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(50)).current;
	const scaleAnim = useRef(new Animated.Value(0.9)).current;
	const pulseAnim = useRef(new Animated.Value(1)).current;

	// Data fetching functions
	const fetchData = useCallback(async () => {
		if (!isAuthenticated || !user) {
			console.log("User not authenticated, skipping data fetch");
			return;
		}

		try {
			setLoading(true);

			// Fetch halls and bookings in parallel
			const [hallsData, bookingsData] = await Promise.all([
				hallManagementService.getAllHalls(),
				bookingOversightService.getBookings(),
			]);

			setHalls(hallsData);
			setBookings(bookingsData);

			// Calculate statistics
			const availableHalls = hallsData.filter(
				(hall: Hall) => hall.is_active && !hall.is_maintenance
			).length;

			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const thisMonthBookings = bookingsData.filter(
				(booking: BookingDetails) => {
					const bookingDate = new Date(booking.date);
					return bookingDate >= startOfMonth;
				}
			).length;

			const pendingBookings = bookingsData.filter(
				(booking: BookingDetails) => booking.status === "pending"
			).length;

			setStats({
				availableHalls,
				thisMonthBookings,
				pendingBookings,
			});
		} catch (error) {
			console.error("Error fetching home data:", error);
			// Don't show alert for auth errors, just log them
		} finally {
			setLoading(false);
		}
	}, [isAuthenticated, user]);

	// Refresh data when screen comes into focus
	useFocusEffect(
		useCallback(() => {
			fetchData();
		}, [fetchData])
	);

	useEffect(() => {
		// Entrance animations
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.timing(scaleAnim, {
				toValue: 1,
				duration: 500,
				useNativeDriver: true,
			}),
		]).start();

		// Pulse animation for notifications
		Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.2,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		).start();

		// Update time every minute
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 60000);

		return () => clearInterval(timer);
	}, []);

	const getGreeting = () => {
		const hour = currentTime.getHours();
		if (hour < 12) return "Good Morning";
		if (hour < 17) return "Good Afternoon";
		return "Good Evening";
	};

	const getUserDisplayName = () => {
		if (!user) return "Guest";
		return user.name || user.email.split("@")[0];
	};

	const getRecentActivity = () => {
		if (!user) return [];

		// Get user's recent bookings (last 3)
		const userBookings = bookings
			.filter((booking) => booking.user_email === user.email)
			.sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			)
			.slice(0, 3);

		return userBookings.map((booking) => {
			const createdDate = new Date(booking.created_at);
			const now = new Date();
			const diffHours = Math.floor(
				(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60)
			);

			let timeText = "";
			if (diffHours < 1) {
				timeText = "Just now";
			} else if (diffHours < 24) {
				timeText = `${diffHours} hours ago`;
			} else {
				const diffDays = Math.floor(diffHours / 24);
				timeText = `${diffDays} days ago`;
			}

			let iconName = "calendar";
			let iconColor = Colors.primary[600];
			let backgroundColor = Colors.primary[100];

			switch (booking.status) {
				case "approved":
					iconName = "checkmark";
					iconColor = Colors.success.main;
					backgroundColor = Colors.success.light;
					break;
				case "pending":
					iconName = "time";
					iconColor = Colors.warning.main;
					backgroundColor = Colors.warning.light;
					break;
				case "rejected":
					iconName = "close";
					iconColor = Colors.error.main;
					backgroundColor = Colors.error.light;
					break;
				case "cancelled":
					iconName = "ban";
					iconColor = Colors.error.main;
					backgroundColor = Colors.error.light;
					break;
			}

			return {
				id: booking.id,
				title: `${booking.hall_name} ${booking.status}`,
				subtitle: `${timeText} • ${booking.purpose}`,
				iconName,
				iconColor,
				backgroundColor,
				onPress: () => handleQuickAction("booking-details"),
			};
		});
	};

	const getQuickActions = () => {
		const baseActions = [
			{
				id: "halls",
				title: "Browse Halls",
				description: "Explore available venues",
				icon: "business",
				colors: isDark
					? ["rgba(59,130,246,0.2)", "rgba(29,78,216,0.2)"]
					: ["rgba(59,130,246,0.1)", "rgba(29,78,216,0.1)"],
				iconColor: Colors.primary[600],
			},
			{
				id: "quick-book",
				title: "Quick Book",
				description: "Book now instantly",
				icon: "add-circle",
				colors: isDark
					? ["rgba(16,185,129,0.2)", "rgba(5,150,105,0.2)"]
					: ["rgba(16,185,129,0.1)", "rgba(5,150,105,0.1)"],
				iconColor: Colors.success.main,
			},
			{
				id: "bookings",
				title: "My Bookings",
				description: "View your reservations",
				icon: "calendar",
				colors: isDark
					? ["rgba(245,158,11,0.2)", "rgba(217,119,6,0.2)"]
					: ["rgba(245,158,11,0.1)", "rgba(217,119,6,0.1)"],
				iconColor: Colors.warning.main,
			},
		];

		// Add admin-specific action if user is admin or super_admin
		if (user && ["admin", "super_admin"].includes(user.role)) {
			baseActions.push({
				id: "admin",
				title: "Admin Panel",
				description: "Manage halls & bookings",
				icon: "settings",
				colors: isDark
					? ["rgba(139,92,246,0.2)", "rgba(109,40,217,0.2)"]
					: ["rgba(139,92,246,0.1)", "rgba(109,40,217,0.1)"],
				iconColor: "#8b5cf6",
			});
		} else {
			// For regular users, show schedule instead
			baseActions.push({
				id: "schedule",
				title: "My Schedule",
				description: "Plan ahead",
				icon: "today",
				colors: isDark
					? ["rgba(139,92,246,0.2)", "rgba(109,40,217,0.2)"]
					: ["rgba(139,92,246,0.1)", "rgba(109,40,217,0.1)"],
				iconColor: "#8b5cf6",
			});
		}

		return baseActions;
	};

	const handleQuickAction = (action: string) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		switch (action) {
			case "halls":
				navigation.navigate("Halls");
				break;
			case "quick-book":
				navigation.navigate("Booking");
				break;
			case "bookings":
				navigation.navigate("Bookings");
				break;
			case "admin":
				// Navigate to the AdminDashboard tab inside AdminTabs
				navigation.navigate("AdminTabs", { screen: "AdminDashboard" });
				break;
			case "schedule":
				// Navigate to schedule/calendar view
				console.log("Navigate to schedule");
				break;
			case "booking-details":
			case "reminder":
			case "new-hall":
				// Navigate to specific features
				console.log(`Navigate to ${action}`);
				break;
			default:
				console.log(`Navigate to ${action}`);
		}
	};

	const toggleThemeWithHaptic = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		toggleTheme();
	};

	const onRefresh = async () => {
		setRefreshing(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		try {
			await fetchData();
		} catch (error) {
			console.error("Error refreshing data:", error);
		} finally {
			setRefreshing(false);
		}
	};

	return (
		<SafeAreaView
			style={[
				styles.container,
				{ backgroundColor: themeColors.background.primary },
			]}
		>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Background Gradient */}
			<LinearGradient
				colors={
					isDark
						? ["#0f172a", "#1e293b", "#334155"]
						: ["#f8fafc", "#e2e8f0", "#cbd5e1"]
				}
				style={styles.backgroundGradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			/>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={themeColors.text.primary}
						colors={[Colors.primary[600]]}
					/>
				}
			>
				{/* Header Section */}
				<Animated.View
					style={[
						styles.header,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<View style={styles.headerTop}>
						<View>
							<Text
								style={[styles.greeting, { color: themeColors.text.secondary }]}
							>
								{getGreeting()} 👋
							</Text>
							<Text
								style={[styles.userName, { color: themeColors.text.primary }]}
							>
								{getUserDisplayName()}
							</Text>
							<Text
								style={[styles.timeText, { color: themeColors.text.secondary }]}
							>
								{currentTime.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</Text>
						</View>

						<View style={styles.headerActions}>
							{/* Theme Toggle */}
							<TouchableOpacity
								onPress={toggleThemeWithHaptic}
								style={[
									styles.iconButton,
									{ backgroundColor: themeColors.card },
								]}
								activeOpacity={0.7}
								hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // Added hitSlop for better clickability
								accessibilityLabel="Toggle theme"
								accessibilityHint="Switches between light and dark theme"
							>
								<Ionicons
									name={isDark ? "sunny" : "moon"}
									size={20}
									color={themeColors.text.primary}
								/>
							</TouchableOpacity>

							{/* Notifications */}
							<TouchableOpacity
								style={[
									styles.iconButton,
									{ backgroundColor: themeColors.card },
								]}
								activeOpacity={0.7}
								hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // Added hitSlop for better clickability
								accessibilityLabel="View notifications"
								accessibilityHint="Shows your notification center"
							>
								<Ionicons
									name="notifications-outline"
									size={20}
									color={themeColors.text.primary}
								/>
								<Animated.View
									style={[
										styles.notificationBadge,
										{ transform: [{ scale: pulseAnim }] },
									]}
								/>
							</TouchableOpacity>
						</View>
					</View>

					{/* University Logo */}
					<Animated.View
						style={[styles.logoSection, { transform: [{ scale: scaleAnim }] }]}
					>
						<BlurView
							intensity={isDark ? 20 : 10}
							tint={isDark ? "dark" : "light"}
							style={[
								styles.logoContainer,
								{
									borderColor: isDark
										? "rgba(255,255,255,0.1)"
										: "rgba(0,0,0,0.05)",
								},
							]}
						>
							<Image
								source={require("../../assets/amity-logo.png")}
								style={styles.logoImage}
								resizeMode="contain"
							/>
							<Text
								style={[
									styles.universityText,
									{ color: themeColors.text.primary },
								]}
							>
								Amity University Patna
							</Text>
						</BlurView>
					</Animated.View>
				</Animated.View>

				{/* Weather and Status Widget */}
				<Animated.View
					style={[
						styles.weatherSection,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<BlurView
						intensity={isDark ? 15 : 8}
						tint={isDark ? "dark" : "light"}
						style={[
							styles.weatherContainer,
							{
								borderColor: isDark
									? "rgba(255,255,255,0.1)"
									: "rgba(0,0,0,0.05)",
							},
						]}
					>
						<LinearGradient
							colors={
								isDark
									? ["rgba(59,130,246,0.2)", "rgba(29,78,216,0.2)"]
									: ["rgba(59,130,246,0.1)", "rgba(29,78,216,0.1)"]
							}
							style={styles.weatherGradient}
						>
							<View style={styles.weatherContent}>
								<View style={styles.weatherLeft}>
									<Ionicons name="sunny" size={32} color="#f59e0b" />
									<View style={styles.weatherInfo}>
										<Text
											style={[
												styles.weatherTemp,
												{ color: themeColors.text.primary },
											]}
										>
											24°C
										</Text>
										<Text
											style={[
												styles.weatherLocation,
												{ color: themeColors.text.secondary },
											]}
										>
											Patna, Bihar
										</Text>
									</View>
								</View>
								<View style={styles.weatherRight}>
									<View style={[styles.statusIndicator, styles.statusOnline]}>
										<View style={styles.statusDot} />
									</View>
									<Text
										style={[
											styles.statusText,
											{ color: themeColors.text.secondary },
										]}
									>
										Campus Online
									</Text>
								</View>
							</View>
						</LinearGradient>
					</BlurView>
				</Animated.View>

				{/* Quick Stats */}
				<Animated.View
					style={[
						styles.statsSection,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<View style={styles.statsContainer}>
						<View style={styles.statCard}>
							<BlurView
								intensity={isDark ? 10 : 5}
								tint={isDark ? "dark" : "light"}
								style={styles.statBlurContainer}
							>
								<LinearGradient
									colors={["#4F46E5", "#7C3AED"]}
									style={styles.statGradient}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
								>
									<Ionicons name="business" size={24} color="white" />
									<Text style={styles.statNumber}>
										{loading ? "..." : stats.availableHalls}
									</Text>
									<Text style={styles.statLabel}>Available Halls</Text>
								</LinearGradient>
							</BlurView>
						</View>

						<View style={styles.statCard}>
							<BlurView
								intensity={isDark ? 10 : 5}
								tint={isDark ? "dark" : "light"}
								style={styles.statBlurContainer}
							>
								<LinearGradient
									colors={["#059669", "#10B981"]}
									style={styles.statGradient}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
								>
									<Ionicons name="calendar" size={24} color="white" />
									<Text style={styles.statNumber}>
										{loading ? "..." : stats.thisMonthBookings}
									</Text>
									<Text style={styles.statLabel}>This Month</Text>
								</LinearGradient>
							</BlurView>
						</View>

						<View style={styles.statCard}>
							<BlurView
								intensity={isDark ? 10 : 5}
								tint={isDark ? "dark" : "light"}
								style={styles.statBlurContainer}
							>
								<LinearGradient
									colors={["#EA580C", "#F97316"]}
									style={styles.statGradient}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
								>
									<Ionicons name="time" size={24} color="white" />
									<Text style={styles.statNumber}>
										{loading ? "..." : stats.pendingBookings}
									</Text>
									<Text style={styles.statLabel}>Pending</Text>
								</LinearGradient>
							</BlurView>
						</View>
					</View>
				</Animated.View>

				{/* Quick Actions */}
				<Animated.View
					style={[
						styles.actionsSection,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<Text
						style={[styles.sectionTitle, { color: themeColors.text.primary }]}
					>
						Quick Actions
					</Text>

					<View style={styles.actionGrid}>
						{getQuickActions().map((action) => (
							<TouchableOpacity
								key={action.id}
								onPress={() => handleQuickAction(action.id)}
								activeOpacity={0.8}
								style={styles.actionCardWrapper}
							>
								<BlurView
									intensity={isDark ? 15 : 8}
									tint={isDark ? "dark" : "light"}
									style={[
										styles.actionCard,
										{
											borderColor: isDark
												? "rgba(255,255,255,0.1)"
												: "rgba(0,0,0,0.05)",
										},
									]}
								>
									<LinearGradient
										colors={action.colors as any}
										style={styles.actionGradient}
									>
										<View style={styles.actionIcon}>
											<Ionicons
												name={action.icon as any}
												size={28}
												color={action.iconColor}
											/>
										</View>
										<Text
											style={[
												styles.actionTitle,
												{ color: themeColors.text.primary },
											]}
										>
											{action.title}
										</Text>
										<Text
											style={[
												styles.actionDescription,
												{ color: themeColors.text.secondary },
											]}
										>
											{action.description}
										</Text>
									</LinearGradient>
								</BlurView>
							</TouchableOpacity>
						))}
					</View>
				</Animated.View>

				{/* Recent Activity */}
				<Animated.View
					style={[
						styles.recentSection,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<Text
						style={[styles.sectionTitle, { color: themeColors.text.primary }]}
					>
						Recent Activity
					</Text>

					<BlurView
						intensity={isDark ? 15 : 8}
						tint={isDark ? "dark" : "light"}
						style={[
							styles.recentContainer,
							{
								borderColor: isDark
									? "rgba(255,255,255,0.1)"
									: "rgba(0,0,0,0.05)",
							},
						]}
					>
						{loading ? (
							<View style={styles.recentItem}>
								<View
									style={[
										styles.recentIcon,
										{ backgroundColor: Colors.primary[100] },
									]}
								>
									<Ionicons
										name="refresh"
										size={16}
										color={Colors.primary[600]}
									/>
								</View>
								<View style={styles.recentContent}>
									<Text
										style={[
											styles.recentTitle,
											{ color: themeColors.text.primary },
										]}
									>
										Loading recent activity...
									</Text>
									<Text
										style={[
											styles.recentTime,
											{ color: themeColors.text.secondary },
										]}
									>
										Please wait
									</Text>
								</View>
							</View>
						) : getRecentActivity().length > 0 ? (
							getRecentActivity().map((activity, index) => (
								<TouchableOpacity
									key={activity.id}
									style={styles.recentItem}
									onPress={activity.onPress}
									activeOpacity={0.7}
								>
									<View
										style={[
											styles.recentIcon,
											{ backgroundColor: activity.backgroundColor },
										]}
									>
										<Ionicons
											name={activity.iconName as any}
											size={16}
											color={activity.iconColor}
										/>
									</View>
									<View style={styles.recentContent}>
										<Text
											style={[
												styles.recentTitle,
												{ color: themeColors.text.primary },
											]}
										>
											{activity.title}
										</Text>
										<Text
											style={[
												styles.recentTime,
												{ color: themeColors.text.secondary },
											]}
										>
											{activity.subtitle}
										</Text>
									</View>
									<Ionicons
										name="chevron-forward"
										size={16}
										color={themeColors.text.secondary}
									/>
								</TouchableOpacity>
							))
						) : (
							<View style={styles.recentItem}>
								<View
									style={[
										styles.recentIcon,
										{ backgroundColor: Colors.gray[100] },
									]}
								>
									<Ionicons
										name="calendar-outline"
										size={16}
										color={Colors.gray[500]}
									/>
								</View>
								<View style={styles.recentContent}>
									<Text
										style={[
											styles.recentTitle,
											{ color: themeColors.text.primary },
										]}
									>
										No recent activity
									</Text>
									<Text
										style={[
											styles.recentTime,
											{ color: themeColors.text.secondary },
										]}
									>
										Your bookings will appear here
									</Text>
								</View>
							</View>
						)}
					</BlurView>
				</Animated.View>
			</ScrollView>

			{/* Floating Action Button */}
			<Animated.View
				style={[
					styles.fabContainer,
					{
						opacity: fadeAnim,
						transform: [{ scale: scaleAnim }],
					},
				]}
			>
				<TouchableOpacity
					onPress={() => handleQuickAction("quick-book")}
					style={styles.fab}
					activeOpacity={0.8}
				>
					<LinearGradient
						colors={["#007AFF", "#0056CC"]}
						style={styles.fabGradient}
					>
						<Ionicons name="add" size={28} color="white" />
					</LinearGradient>
				</TouchableOpacity>
			</Animated.View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},

	backgroundGradient: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
	},

	scrollContent: {
		flexGrow: 1,
		padding: Spacing[5],
		paddingTop: Platform.OS === "ios" ? Spacing[2] : Spacing[6], // Add top spacing for status bar
		paddingBottom: Spacing[12], // Added extra bottom padding (48px)
	},

	// Header Styles
	header: {
		marginBottom: Spacing[6],
		marginTop: Platform.OS === "ios" ? Spacing[4] : Spacing[2], // Add top margin for breathing room
	},

	headerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing[6],
		paddingRight: Spacing[1], // Slight padding to prevent button overflow
		minHeight: 50, // Ensure minimum height for touch targets
	},

	greeting: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		marginBottom: Spacing[1],
	},

	userName: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
	},

	timeText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		marginTop: Spacing[1],
		opacity: 0.8,
	},

	headerActions: {
		flexDirection: "row",
		gap: Spacing[3],
		paddingLeft: Spacing[1], // Slight padding to prevent button overflow
		minHeight: 50, // Ensure minimum height for touch targets
	},

	iconButton: {
		width: 44,
		height: 44,
		borderRadius: BorderRadius.xl,
		justifyContent: "center",
		alignItems: "center",
		...Shadows.sm,
	},

	notificationBadge: {
		position: "absolute",
		top: 8,
		right: 8,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.error.main,
	},

	// Logo Section
	logoSection: {
		alignItems: "center",
		marginBottom: Spacing[8],
	},

	logoContainer: {
		padding: Spacing[6],
		borderRadius: BorderRadius["2xl"],
		alignItems: "center",
		borderWidth: 1,
		// borderColor is now dynamic and set inline
	},

	logoImage: {
		width: 60,
		height: 60,
		marginBottom: Spacing[3],
	},

	universityText: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		textAlign: "center",
	},

	// Weather Section
	weatherSection: {
		marginBottom: Spacing[6],
	},

	weatherContainer: {
		borderRadius: BorderRadius["2xl"],
		overflow: "hidden",
		borderWidth: 1,
		// borderColor is now dynamic and set inline
	},

	weatherGradient: {
		padding: Spacing[4],
	},

	weatherContent: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},

	weatherLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing[3],
	},

	weatherInfo: {
		gap: Spacing[1],
	},

	weatherTemp: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
	},

	weatherLocation: {
		fontSize: Typography.fontSize.sm,
		opacity: 0.8,
	},

	weatherRight: {
		alignItems: "center",
		gap: Spacing[2],
	},

	statusIndicator: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing[2],
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[2],
		borderRadius: BorderRadius.full,
		backgroundColor: "rgba(255,255,255,0.1)",
	},

	statusOnline: {
		backgroundColor: "rgba(16,185,129,0.2)",
	},

	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.success.main,
	},

	statusText: {
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.medium,
	},

	// Stats Section
	statsSection: {
		marginBottom: Spacing[10], // Increased from Spacing[8] to Spacing[10] (40px)
	},

	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: Spacing[3],
		padding: 0, // Removed padding since individual cards now have blur
		// Removed border and background since individual cards have it
	},

	statCard: {
		flex: 1,
		borderRadius: BorderRadius.xl,
		// Removed overflow: "hidden" to prevent clipping
		minHeight: 130, // Increased minimum height
		...Shadows.md,
	},

	statBlurContainer: {
		flex: 1,
		borderRadius: BorderRadius.xl,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
	},

	statGradient: {
		flex: 1,
		padding: Spacing[4], // Reduced back to Spacing[4] (16px)
		alignItems: "center",
		justifyContent: "center", // Center content vertically
		gap: Spacing[2], // Reduced gap back to Spacing[2] (8px)
		minHeight: 130, // Match the statCard minHeight
	},

	statNumber: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: "white",
	},

	statLabel: {
		fontSize: Typography.fontSize.xs,
		color: "white",
		textAlign: "center",
		opacity: 0.9,
	},

	// Actions Section
	actionsSection: {
		marginBottom: Spacing[8],
	},

	sectionTitle: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		marginBottom: Spacing[5],
	},

	actionGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing[4],
		justifyContent: "space-between",
	},

	actionCardWrapper: {
		width: (width - Spacing[5] * 2 - Spacing[4]) / 2,
	},

	actionCard: {
		borderRadius: BorderRadius["2xl"],
		overflow: "hidden",
		borderWidth: 1,
		// borderColor is now dynamic and set inline
	},

	actionGradient: {
		padding: Spacing[5],
		alignItems: "center",
		minHeight: 120,
	},

	actionIcon: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "rgba(255,255,255,0.1)",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing[3],
	},

	actionTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		textAlign: "center",
		marginBottom: Spacing[1],
	},

	actionDescription: {
		fontSize: Typography.fontSize.xs,
		textAlign: "center",
		opacity: 0.8,
	},

	// Action Card Enhancements
	actionProgress: {
		marginTop: Spacing[3],
		width: "100%",
		alignItems: "center",
	},

	progressBar: {
		width: "100%",
		height: 4,
		borderRadius: 2,
		marginBottom: Spacing[1],
		overflow: "hidden",
	},

	progressFill: {
		height: "100%",
		borderRadius: 2,
	},

	progressText: {
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.medium,
	},

	actionBadge: {
		position: "absolute",
		top: Spacing[2],
		right: Spacing[2],
		backgroundColor: Colors.success.main,
		paddingHorizontal: Spacing[2],
		paddingVertical: Spacing[1],
		borderRadius: BorderRadius.full,
	},

	badgeText: {
		fontSize: Typography.fontSize.xs,
		color: "white",
		fontWeight: Typography.fontWeight.semibold,
	},

	bookingCount: {
		marginTop: Spacing[2],
		paddingHorizontal: Spacing[2],
		paddingVertical: Spacing[1],
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: BorderRadius.md,
	},

	countText: {
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.semibold,
	},

	nextEvent: {
		fontSize: Typography.fontSize.xs,
		marginTop: Spacing[2],
		textAlign: "center",
		fontWeight: Typography.fontWeight.medium,
	},

	// Recent Activity Section
	recentSection: {
		marginBottom: Spacing[8],
	},

	recentContainer: {
		padding: Spacing[5],
		borderRadius: BorderRadius["2xl"],
		borderWidth: 1,
		// borderColor is now dynamic and set inline
	},

	recentItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: Spacing[3],
	},

	recentIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},

	recentContent: {
		flex: 1,
	},

	recentTitle: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		marginBottom: Spacing[1],
	},

	recentTime: {
		fontSize: Typography.fontSize.xs,
		opacity: 0.7,
	},

	// Floating Action Button
	fabContainer: {
		position: "absolute",
		bottom: Spacing[6],
		right: Spacing[5],
		zIndex: 1000,
	},

	fab: {
		width: 64,
		height: 64,
		borderRadius: 32,
		overflow: "hidden",
		...Shadows.lg,
	},

	fabGradient: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
});
