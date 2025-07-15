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
	smartBookingService,
	SmartBooking,
} from "../services/smartBookingService";
import { notificationService } from "../services/notificationService";
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
	const [bookings, setBookings] = useState<SmartBooking[]>([]);
	const [loading, setLoading] = useState(true);
	const [unreadNotifications, setUnreadNotifications] = useState(0);
	const [stats, setStats] = useState({
		availableHalls: 0,
		thisMonthBookings: 0,
		pendingBookings: 0,
	});

	// Weather and Campus Status State
	const [weather, setWeather] = useState({
		temperature: null as number | null,
		condition: "Clear" as string,
		icon: "sunny" as string,
		windSpeed: null as number | null,
		windDirection: null as number | null,
		loading: true,
		error: null as string | null,
	});
	const [campusStatus, setCampusStatus] = useState({
		isOnline: false,
		statusText: "Campus Offline",
		nextStatusChange: null as Date | null,
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
			// Still update campus status and weather even if not authenticated
			updateCampusStatus();
			fetchWeatherData();
			return;
		}

		try {
			setLoading(true);

			// Fetch halls, user bookings, weather, and update campus status in parallel
			const [hallsData, bookingsData] = await Promise.all([
				hallManagementService.getAllHalls(),
				smartBookingService.getUserBookingsWithRealTimeStatus(user.id), // Use real-time status checking
				fetchWeatherData(), // Fetch weather data
			]);

			// Update campus status
			updateCampusStatus();

			setHalls(hallsData);
			setBookings(bookingsData);

			// Fetch notification count
			try {
				const notificationCount = await notificationService.getUnreadCount(
					user.id
				);
				setUnreadNotifications(notificationCount);
			} catch (error) {
				console.error("Error fetching notification count:", error);
			}

			// Calculate statistics
			const availableHalls = hallsData.filter(
				(hall: Hall) => hall.is_active && !hall.is_maintenance
			).length;

			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const thisMonthBookings = bookingsData.filter((booking: SmartBooking) => {
				// Convert DDMMYYYY to Date object
				const dateStr = booking.booking_date;
				const day = parseInt(dateStr.substring(0, 2));
				const month = parseInt(dateStr.substring(2, 4));
				const year = parseInt(dateStr.substring(4, 8));
				const bookingDate = new Date(year, month - 1, day); // month is 0-indexed

				return bookingDate >= startOfMonth;
			}).length;

			const pendingBookings = bookingsData.filter(
				(booking: SmartBooking) => booking.status === "pending"
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

	// Function to update campus status based on university timing (9:00 AM to 6:00 PM)
	const updateCampusStatus = useCallback(() => {
		const now = new Date();
		const currentHour = now.getHours();
		const currentMinutes = now.getMinutes();
		const currentTime = currentHour * 60 + currentMinutes;

		// University timing: 9:00 AM (540 minutes) to 6:00 PM (1080 minutes)
		const openTime = 9 * 60; // 9:00 AM in minutes
		const closeTime = 18 * 60; // 6:00 PM in minutes

		const isOnline = currentTime >= openTime && currentTime < closeTime;

		let statusText = "";
		let nextStatusChange: Date | null = null;

		if (isOnline) {
			statusText = "Campus Online";
			// Next change is at 6:00 PM today
			nextStatusChange = new Date();
			nextStatusChange.setHours(18, 0, 0, 0);
		} else {
			statusText = "Campus Offline";
			// Calculate next opening time
			nextStatusChange = new Date();
			if (currentTime < openTime) {
				// Same day opening at 9:00 AM
				nextStatusChange.setHours(9, 0, 0, 0);
			} else {
				// Next day opening at 9:00 AM
				nextStatusChange.setDate(nextStatusChange.getDate() + 1);
				nextStatusChange.setHours(9, 0, 0, 0);
			}
		}

		setCampusStatus({
			isOnline,
			statusText,
			nextStatusChange,
		});
	}, []);

	// Function to fetch weather data using Open-Meteo API (free, no API key needed)
	const fetchWeatherData = useCallback(async () => {
		try {
			setWeather((prev) => ({ ...prev, loading: true, error: null }));

			// Patna, Bihar coordinates
			const latitude = 25.5941;
			const longitude = 85.1376;
			const URL = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,weathercode&timezone=Asia/Kolkata`;

			const response = await fetch(URL);
			if (!response.ok) {
				throw new Error("Weather data unavailable");
			}

			const data = await response.json();
			const currentWeather = data.current_weather;

			// Map weather codes to readable conditions
			const getWeatherCondition = (code: number) => {
				if (code === 0) return "Clear";
				if (code <= 3) return "Partly Cloudy";
				if (code <= 48) return "Cloudy";
				if (code <= 67) return "Rainy";
				if (code <= 77) return "Snowy";
				if (code <= 82) return "Rainy";
				if (code <= 99) return "Stormy";
				return "Unknown";
			};

			// Map weather codes to icons
			const getWeatherIcon = (code: number) => {
				if (code === 0) return "sunny";
				if (code <= 3) return "partly-sunny";
				if (code <= 48) return "cloudy";
				if (code <= 67) return "rainy";
				if (code <= 77) return "snow";
				if (code <= 82) return "rainy";
				if (code <= 99) return "thunderstorm";
				return "cloudy";
			};

			setWeather({
				temperature: Math.round(currentWeather.temperature),
				condition: getWeatherCondition(currentWeather.weathercode),
				icon: getWeatherIcon(currentWeather.weathercode),
				windSpeed: currentWeather.windspeed,
				windDirection: currentWeather.winddirection,
				loading: false,
				error: null,
			});
		} catch (error) {
			console.error("Weather fetch error:", error);
			setWeather((prev) => ({
				...prev,
				loading: false,
				error: "Weather unavailable",
			}));
		}
	}, []);

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
		const timeTimer = setInterval(() => {
			setCurrentTime(new Date());
			updateCampusStatus(); // Also update campus status every minute
		}, 60000);

		// Update weather every 10 minutes
		const weatherTimer = setInterval(() => {
			fetchWeatherData();
		}, 10 * 60 * 1000);

		// Initial updates
		updateCampusStatus();
		fetchWeatherData();

		return () => {
			clearInterval(timeTimer);
			clearInterval(weatherTimer);
		};
	}, [updateCampusStatus, fetchWeatherData]);

	// Real-time notification updates
	useEffect(() => {
		let subscription: any;
		if (user?.id) {
			subscription = notificationService.subscribeToUserNotifications(
				user.id,
				async () => {
					// Reload notification count when notifications change
					try {
						const count = await notificationService.getUnreadCount(user.id);
						setUnreadNotifications(count);
					} catch (error) {
						console.error("Error updating notification count:", error);
					}
				}
			);
		}

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, [user?.id]);

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
				case "completed":
					iconName = "checkmark-done-circle";
					iconColor = "#6366f1"; // Indigo color for completed
					backgroundColor = "rgba(99, 102, 241, 0.1)"; // Light indigo background
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
				title: `${booking.hall_name || "Unknown Hall"} ${booking.status}`,
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

		// Add role-specific actions
		if (user && ["admin", "super_admin"].includes(user.role)) {
			// Admin gets both admin panel and booking calendar
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
			baseActions.push({
				id: "schedule",
				title: "Booking Calendar",
				description: "View all schedules",
				icon: "today",
				colors: isDark
					? ["rgba(99,102,241,0.2)", "rgba(67,56,202,0.2)"]
					: ["rgba(99,102,241,0.1)", "rgba(67,56,202,0.1)"],
				iconColor: "#6366f1",
			});
		} else {
			// For regular users, show booking calendar
			baseActions.push({
				id: "schedule",
				title: "Booking Calendar",
				description: "View all schedules",
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
				navigation.navigate("BookingForm", {}); // Navigate directly to the new booking form
				break;
			case "bookings":
				// Navigate to the Bookings tab inside AdminTabs if admin, else to Bookings screen
				if (user && ["admin", "super_admin"].includes(user.role)) {
					navigation.navigate("AdminTabs", {
						screen: "BookingOversightScreen",
					});
				} else {
					navigation.navigate("Bookings");
				}
				break;
			case "admin":
				// Navigate to the AdminDashboard tab inside AdminTabs
				navigation.navigate("AdminTabs", { screen: "AdminDashboard" });
				break;
			case "schedule":
				// Navigate to schedule/calendar view
				navigation.navigate("BookedCalendar");
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

	const handleNotificationPress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		navigation.navigate("Notifications");
	};

	const onRefresh = async () => {
		setRefreshing(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		try {
			await Promise.all([fetchData(), fetchWeatherData()]);
			updateCampusStatus();
		} catch (error) {
			console.error("Error refreshing data:", error);
		} finally {
			setRefreshing(false);
		}
	};

	const getTimeUntilStatusChange = () => {
		if (!campusStatus.nextStatusChange) return "";

		const now = new Date();
		const timeDiff = campusStatus.nextStatusChange.getTime() - now.getTime();

		if (timeDiff <= 0) return "";

		const hours = Math.floor(timeDiff / (1000 * 60 * 60));
		const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `${hours}h ${minutes}m until ${
				campusStatus.isOnline ? "offline" : "online"
			}`;
		} else if (minutes > 0) {
			return `${minutes}m until ${
				campusStatus.isOnline ? "offline" : "online"
			}`;
		} else {
			return "Status changing soon...";
		}
	};

	// ...existing code...

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
								onPress={handleNotificationPress}
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
								{unreadNotifications > 0 && (
									<Animated.View
										style={[
											styles.notificationBadgeWithCount,
											{ transform: [{ scale: pulseAnim }] },
										]}
									>
										<Text style={styles.notificationBadgeText}>
											{unreadNotifications > 99
												? "99+"
												: unreadNotifications.toString()}
										</Text>
									</Animated.View>
								)}
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
									<Ionicons
										name={weather.icon as any}
										size={32}
										color={
											weather.icon === "sunny"
												? "#f59e0b"
												: weather.icon === "rainy" ||
												  weather.icon === "thunderstorm"
												? "#3b82f6"
												: weather.icon === "snow"
												? "#e5e7eb"
												: weather.icon === "partly-sunny"
												? "#f97316"
												: "#6b7280"
										}
									/>
									<View style={styles.weatherInfo}>
										<Text
											style={[
												styles.weatherTemp,
												{ color: themeColors.text.primary },
											]}
										>
											{weather.loading
												? "..."
												: weather.temperature
												? `${weather.temperature}°C`
												: "N/A"}
										</Text>
										<Text
											style={[
												styles.weatherLocation,
												{ color: themeColors.text.secondary },
											]}
										>
											{weather.condition}
										</Text>
										<Text
											style={[
												styles.weatherLocation,
												{ color: themeColors.text.secondary },
											]}
										>
											Patna, Bihar
										</Text>
										{weather.error && (
											<Text
												style={[
													styles.weatherLocation,
													{ color: Colors.warning.main, fontSize: 10 },
												]}
											>
												{weather.error}
											</Text>
										)}
									</View>
								</View>
								<View style={styles.weatherRight}>
									<View
										style={[
											styles.statusIndicator,
											campusStatus.isOnline
												? styles.statusOnline
												: styles.statusOffline,
										]}
									>
										<View
											style={[
												styles.statusDot,
												{
													backgroundColor: campusStatus.isOnline
														? Colors.success.main
														: Colors.error.main,
												},
											]}
										/>
									</View>
									<Text
										style={[
											styles.statusText,
											{ color: themeColors.text.secondary },
										]}
									>
										{campusStatus.statusText}
									</Text>
									<Text
										style={[
											styles.weatherLocation,
											{
												color: themeColors.text.secondary,
												fontSize: 10,
												marginTop: 2,
											},
										]}
									>
										{getTimeUntilStatusChange()}
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
									<Text style={styles.statLabel}>My Bookings</Text>
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

	// --- MISSING STYLES ADDED BELOW ---
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
	notificationBadgeWithCount: {
		position: "absolute",
		top: 2,
		right: 2,
		backgroundColor: Colors.error.main,
		borderRadius: BorderRadius.full,
		minWidth: 18,
		height: 18,
		paddingHorizontal: 5,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "#FFFFFF",
	},
	notificationBadgeText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: Typography.fontWeight.bold as any,
		textAlign: "center",
		lineHeight: 12,
	},
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

	statusOffline: {
		backgroundColor: "rgba(239,68,68,0.2)",
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
