import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	Animated,
	Dimensions,
	Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getThemeColors } from "../utils/themeUtils";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Amity University Patna - Only Two Seminar Halls
const amityHalls = [
	{
		id: "block-a",
		name: "Block-A",
		fullName: "Seminar Hall Block-A",
		capacity: 120,
		location: "Academic Block A, Ground Floor",
		amenities: [
			"Smart Projector",
			"Central AC",
			"WiFi",
			"Microphone",
			"Whiteboard",
		],
		availability: "Available",
		todayBookings: 2,
		weeklyBookings: 8,
		description: "Main seminar hall for academic conferences",
		icon: "business-outline",
		statusColor: Colors.success.main,
	},
	{
		id: "block-b",
		name: "Block-B",
		fullName: "Seminar Hall Block-B",
		capacity: 80,
		location: "Academic Block B, First Floor",
		amenities: [
			"Digital Display",
			"Climate Control",
			"WiFi",
			"Wireless Mic",
			"Interactive Board",
		],
		availability: "Busy",
		todayBookings: 4,
		weeklyBookings: 15,
		description: "Compact hall perfect for workshops",
		icon: "school-outline",
		statusColor: Colors.warning.main,
	},
];

export default function HallListScreen() {
	const { isDark, toggleTheme } = useTheme();
	const themeColors = getThemeColors(isDark);

	// Animation refs
	const fadeInAnim = useRef(new Animated.Value(0)).current;
	const slideInAnim = useRef(new Animated.Value(50)).current;
	const headerAnim = useRef(new Animated.Value(-50)).current; // Reduced from -100 for better positioning

	useEffect(() => {
		// Entrance animations - same as HomeScreen
		Animated.parallel([
			Animated.timing(fadeInAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true,
			}),
			Animated.timing(slideInAnim, {
				toValue: 0,
				duration: 800,
				useNativeDriver: true,
			}),
			Animated.timing(headerAnim, {
				toValue: 0,
				duration: 600,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const handleHallPress = (hall: any) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		// TODO: Navigate to hall details
	};

	const handleBookPress = (hall: any) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		// TODO: Navigate to booking
	};

	const toggleThemeWithHaptic = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		toggleTheme();
	};

	const renderHeader = () => (
		<Animated.View
			style={[
				styles.headerContainer,
				{ transform: [{ translateY: headerAnim }] },
			]}
		>
			<View style={styles.headerTop}>
				<View style={styles.headerTextContainer}>
					<Text
						style={[styles.headerTitle, { color: themeColors.text.primary }]}
					>
						Seminar Halls
					</Text>
					<Text
						style={[
							styles.headerSubtitle,
							{ color: themeColors.text.secondary },
						]}
					>
						Amity University Patna • Internal Faculty Only
					</Text>
				</View>

				{/* Theme Toggle Button - Fixed positioning */}
				<TouchableOpacity
					onPress={toggleThemeWithHaptic}
					style={[styles.themeButton, { backgroundColor: themeColors.card }]}
					activeOpacity={0.7}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					accessibilityLabel="Toggle dark mode"
					accessibilityRole="button"
				>
					<Ionicons
						name={isDark ? "sunny" : "moon"}
						size={20}
						color={themeColors.text.primary}
					/>
				</TouchableOpacity>
			</View>
		</Animated.View>
	);

	const renderStatsCards = () => (
		<Animated.View
			style={[
				styles.statsSection,
				{
					opacity: fadeInAnim,
					transform: [{ translateY: slideInAnim }],
				},
			]}
		>
			<View style={styles.statsContainer}>
				{/* Available Halls - Exact HomeScreen Purple Gradient */}
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
								{
									amityHalls.filter((h) => h.availability === "Available")
										.length
								}
							</Text>
							<Text style={styles.statLabel}>Available Halls</Text>
						</LinearGradient>
					</BlurView>
				</View>

				{/* Today's Bookings - Exact HomeScreen Green Gradient */}
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
								{amityHalls.reduce((sum, h) => sum + h.todayBookings, 0)}
							</Text>
							<Text style={styles.statLabel}>This Month</Text>
						</LinearGradient>
					</BlurView>
				</View>

				{/* Busy Halls - Exact HomeScreen Orange Gradient */}
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
								{amityHalls.filter((h) => h.availability === "Busy").length}
							</Text>
							<Text style={styles.statLabel}>Pending</Text>
						</LinearGradient>
					</BlurView>
				</View>
			</View>
		</Animated.View>
	);

	const renderHallCard = (hall: any, index: number) => (
		<Animated.View
			key={hall.id}
			style={[
				styles.hallCardWrapper,
				{
					opacity: fadeInAnim,
					transform: [
						{
							translateY: slideInAnim.interpolate({
								inputRange: [0, 50],
								outputRange: [0, 50 + index * 20],
							}),
						},
						{
							scale: fadeInAnim.interpolate({
								inputRange: [0, 1],
								outputRange: [0.95, 1],
							}),
						},
					],
				},
			]}
		>
			<TouchableOpacity
				onPress={() => handleHallPress(hall)}
				activeOpacity={0.8}
			>
				<BlurView
					intensity={isDark ? 15 : 8}
					tint={isDark ? "dark" : "light"}
					style={[
						styles.hallCard,
						{
							borderColor: isDark
								? "rgba(255,255,255,0.1)"
								: "rgba(0,0,0,0.05)",
						},
					]}
				>
					<LinearGradient
						colors={
							hall.availability === "Available"
								? isDark
									? ["rgba(16,185,129,0.2)", "rgba(5,150,105,0.2)"]
									: ["rgba(16,185,129,0.1)", "rgba(5,150,105,0.1)"]
								: isDark
								? ["rgba(245,158,11,0.2)", "rgba(217,119,6,0.2)"]
								: ["rgba(245,158,11,0.1)", "rgba(217,119,6,0.1)"]
						}
						style={styles.hallGradient}
					>
						{/* Hall Icon - Exact HomeScreen Style */}
						<View style={styles.hallIcon}>
							<Ionicons
								name={hall.icon as any}
								size={28}
								color={hall.statusColor}
							/>
						</View>

						{/* Hall Name */}
						<Text
							style={[styles.hallTitle, { color: themeColors.text.primary }]}
						>
							{hall.name}
						</Text>

						{/* Hall Description */}
						<Text
							style={[
								styles.hallDescription,
								{ color: themeColors.text.secondary },
							]}
						>
							{hall.description}
						</Text>
					</LinearGradient>
				</BlurView>
			</TouchableOpacity>
		</Animated.View>
	);

	return (
		<SafeAreaView
			style={[
				styles.container,
				{ backgroundColor: themeColors.background.primary },
			]}
		>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Background Gradient - Exact match to HomeScreen */}
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
			>
				{renderHeader()}
				{renderStatsCards()}

				{/* Halls Section */}
				<Animated.View
					style={[
						styles.hallsSection,
						{
							opacity: fadeInAnim,
							transform: [{ translateY: slideInAnim }],
						},
					]}
				>
					<Text
						style={[styles.sectionTitle, { color: themeColors.text.primary }]}
					>
						Available Halls
					</Text>

					<View style={styles.hallGrid}>
						{amityHalls.map((hall, index) => renderHallCard(hall, index))}
					</View>
				</Animated.View>
			</ScrollView>
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
		padding: Spacing[4], // Reduced from Spacing[5] to give more space
		paddingTop: Platform.OS === "ios" ? Spacing[2] : Spacing[6], // Add top spacing for status bar
		paddingBottom: Spacing[12], // Match HomeScreen extra bottom padding
	},
	// Header styles - matching HomeScreen with proper spacing
	headerContainer: {
		marginBottom: Spacing[6], // Match HomeScreen header margin
		marginTop: Platform.OS === "ios" ? Spacing[4] : Spacing[2], // Add top margin for breathing room
	},
	headerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		paddingRight: Spacing[1], // Slight padding to prevent button overflow
		minHeight: 50, // Ensure minimum height for touch targets
	},
	headerTextContainer: {
		flex: 1,
		marginRight: Spacing[3], // Space between text and button
	},
	headerTitle: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold as any,
		marginBottom: Spacing[1],
		lineHeight: 32, // Control line height for better spacing
	},
	headerSubtitle: {
		fontSize: Typography.fontSize.sm, // Smaller subtitle
		fontWeight: Typography.fontWeight.medium as any,
		opacity: 0.7,
		lineHeight: 20, // Control line height
	},
	themeButton: {
		width: 44,
		height: 44,
		borderRadius: BorderRadius.xl,
		justifyContent: "center",
		alignItems: "center",
		...Shadows.sm,
		// Ensure button stays in bounds and is easily clickable
		flexShrink: 0,
		marginTop: Spacing[1], // Small top margin to align better with text
	},
	// Stats section - exact match to HomeScreen style
	statsSection: {
		marginBottom: Spacing[10], // Match HomeScreen spacing
	},
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: Spacing[3],
		padding: 0,
	},
	statCard: {
		flex: 1,
		borderRadius: BorderRadius.xl,
		minHeight: 130,
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
		padding: Spacing[4],
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing[2],
		minHeight: 130,
	},
	statNumber: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold as any,
		color: "white",
	},
	statLabel: {
		fontSize: Typography.fontSize.xs,
		color: "white",
		textAlign: "center",
		opacity: 0.9,
	},
	// Halls section
	hallsSection: {
		marginBottom: Spacing[8], // Match HomeScreen section spacing
	},
	sectionTitle: {
		fontSize: Typography.fontSize["2xl"], // Match HomeScreen
		fontWeight: Typography.fontWeight.bold as any,
		marginBottom: Spacing[5], // Match HomeScreen
	},
	// Hall cards - exact HomeScreen action card style
	hallGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing[4],
		justifyContent: "space-between",
	},
	hallCardWrapper: {
		width: (SCREEN_WIDTH - Spacing[4] * 2 - Spacing[4]) / 2, // Updated for new padding
	},
	hallCard: {
		borderRadius: BorderRadius["2xl"],
		overflow: "hidden",
		borderWidth: 1,
	},
	hallGradient: {
		padding: Spacing[5],
		alignItems: "center",
		minHeight: 120, // Match HomeScreen action cards
	},
	hallIcon: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "rgba(255,255,255,0.1)",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing[3],
	},
	hallTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold as any,
		textAlign: "center",
		marginBottom: Spacing[1],
	},
	hallDescription: {
		fontSize: Typography.fontSize.xs,
		textAlign: "center",
		opacity: 0.8,
	},
});
