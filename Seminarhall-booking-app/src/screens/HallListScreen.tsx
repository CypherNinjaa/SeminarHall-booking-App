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
	Platform,
	RefreshControl,
	ActivityIndicator,
	Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getThemeColors } from "../utils/themeUtils";
import { useAuthStore } from "../stores/authStore";
import { useFocusEffect } from "@react-navigation/native";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";
import { hallManagementService, Hall } from "../services/hallManagementService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HallCardData extends Hall {
	statusColor: string;
	icon: string;
}

export default function HallListScreen({ navigation }: any) {
	const { isDark, toggleTheme } = useTheme();
	const { user, isAuthenticated } = useAuthStore();
	const themeColors = getThemeColors(isDark);

	// State for dynamic data
	const [halls, setHalls] = useState<HallCardData[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [stats, setStats] = useState({
		availableHalls: 0,
		totalBookings: 0,
		busyHalls: 0,
	});

	// Animation refs
	const fadeInAnim = useRef(new Animated.Value(0)).current;
	const slideInAnim = useRef(new Animated.Value(50)).current;
	const headerAnim = useRef(new Animated.Value(-50)).current;

	// Data fetching functions
	const fetchHalls = useCallback(async (showLoading = true) => {
		try {
			if (showLoading) setLoading(true);

			const hallsData = await hallManagementService.getAllHalls({
				is_active: true,
			});

			// Transform halls data to match UI requirements
			const transformedHalls: HallCardData[] = hallsData.map((hall, index) => ({
				...hall,
				// Add UI-specific properties
				statusColor: hall.is_maintenance
					? Colors.error.main
					: hall.is_active
					? Colors.success.main
					: Colors.warning.main,
				icon: index % 2 === 0 ? "business-outline" : "school-outline", // Alternate icons
			}));

			setHalls(transformedHalls);

			// Calculate stats
			const availableHalls = transformedHalls.filter(
				(h) => h.is_active && !h.is_maintenance
			).length;
			const busyHalls = transformedHalls.filter((h) => h.is_maintenance).length;

			setStats({
				availableHalls,
				totalBookings: 6, // This would come from booking service in real app
				busyHalls,
			});
		} catch (error) {
			console.error("Error fetching halls:", error);
			Alert.alert("Error", "Failed to load halls. Please try again.", [
				{ text: "Retry", onPress: () => fetchHalls() },
			]);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	// Refresh function for pull-to-refresh
	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchHalls(false);
	}, [fetchHalls]);

	// Load data when screen is focused
	useFocusEffect(
		useCallback(() => {
			fetchHalls();
		}, [fetchHalls])
	);

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

	const handleHallPress = (hall: HallCardData) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		// Check if user has admin privileges for editing
		if (
			isAuthenticated &&
			user &&
			["admin", "super_admin"].includes(user.role)
		) {
			// Navigate to edit hall
			navigation.navigate("AddEditHall", {
				hallId: hall.id,
				hall: hall,
			});
		} else {
			// Show hall details for regular users
			Alert.alert(
				hall.name,
				`Capacity: ${hall.capacity} people\nLocation: ${
					hall.location
				}\n\nEquipment: ${hall.equipment.join(
					", "
				)}\n\nAmenities: ${hall.amenities.join(", ")}`,
				[{ text: "OK" }]
			);
		}
	};

	const handleBookPress = (hall: HallCardData) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		// TODO: Navigate to booking screen
		Alert.alert("Booking", `Book ${hall.name}?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Book Now",
				onPress: () => {
					// Navigate to booking screen
					navigation.navigate("Booking", { hallId: hall.id });
				},
			},
		]);
	};

	const handleAddNewHall = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		navigation.navigate("AddEditHall", {});
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
						Amity University Patna • {halls.length} Halls Available
					</Text>
				</View>

				<View style={styles.headerButtons}>
					{/* Add Hall Button for Admins */}
					{isAuthenticated &&
						user &&
						["admin", "super_admin"].includes(user.role) && (
							<TouchableOpacity
								onPress={handleAddNewHall}
								style={[
									styles.addButton,
									{ backgroundColor: Colors.primary[500] },
								]}
								activeOpacity={0.7}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
								accessibilityLabel="Add new hall"
								accessibilityRole="button"
							>
								<Ionicons name="add" size={20} color="white" />
							</TouchableOpacity>
						)}

					{/* Theme Toggle Button */}
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
							<Text style={styles.statNumber}>{stats.availableHalls}</Text>
							<Text style={styles.statLabel}>Available Halls</Text>
						</LinearGradient>
					</BlurView>
				</View>

				{/* Total Bookings - Exact HomeScreen Green Gradient */}
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
							<Text style={styles.statNumber}>{stats.totalBookings}</Text>
							<Text style={styles.statLabel}>This Month</Text>
						</LinearGradient>
					</BlurView>
				</View>

				{/* Maintenance Halls - Exact HomeScreen Orange Gradient */}
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
							<Ionicons name="construct" size={24} color="white" />
							<Text style={styles.statNumber}>{stats.busyHalls}</Text>
							<Text style={styles.statLabel}>Maintenance</Text>
						</LinearGradient>
					</BlurView>
				</View>
			</View>
		</Animated.View>
	);

	const renderHallCard = (hall: HallCardData, index: number) => (
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
							hall.is_active && !hall.is_maintenance
								? isDark
									? ["rgba(16,185,129,0.2)", "rgba(5,150,105,0.2)"]
									: ["rgba(16,185,129,0.1)", "rgba(5,150,105,0.1)"]
								: isDark
								? ["rgba(245,158,11,0.2)", "rgba(217,119,6,0.2)"]
								: ["rgba(245,158,11,0.1)", "rgba(217,119,6,0.1)"]
						}
						style={styles.hallGradient}
					>
						{/* Hall Icon */}
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

						{/* Hall Info */}
						<Text
							style={[
								styles.hallDescription,
								{ color: themeColors.text.secondary },
							]}
						>
							{hall.capacity} people • {hall.location}
						</Text>

						{/* Status Badge */}
						<View
							style={[
								styles.statusBadge,
								{
									backgroundColor: hall.is_maintenance
										? Colors.error.main
										: hall.is_active
										? Colors.success.main
										: Colors.warning.main,
								},
							]}
						>
							<Text style={styles.statusText}>
								{hall.is_maintenance
									? "Maintenance"
									: hall.is_active
									? "Available"
									: "Inactive"}
							</Text>
						</View>

						{/* Admin Actions */}
						{isAuthenticated &&
							user &&
							["admin", "super_admin"].includes(user.role) && (
								<TouchableOpacity
									style={styles.editButton}
									onPress={() => handleHallPress(hall)}
									hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
								>
									<Ionicons
										name="create-outline"
										size={16}
										color={themeColors.text.secondary}
									/>
								</TouchableOpacity>
							)}
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
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={themeColors.text.primary}
						colors={[Colors.primary[500]]}
					/>
				}
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
						{loading ? "Loading Halls..." : `Available Halls (${halls.length})`}
					</Text>

					{loading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="large" color={Colors.primary[500]} />
							<Text
								style={[
									styles.loadingText,
									{ color: themeColors.text.secondary },
								]}
							>
								Loading halls...
							</Text>
						</View>
					) : halls.length === 0 ? (
						<View style={styles.emptyContainer}>
							<Ionicons
								name="business-outline"
								size={64}
								color={themeColors.text.tertiary}
							/>
							<Text
								style={[
									styles.emptyText,
									{ color: themeColors.text.secondary },
								]}
							>
								No halls available
							</Text>
							{isAuthenticated &&
								user &&
								["admin", "super_admin"].includes(user.role) && (
									<TouchableOpacity
										style={[
											styles.addFirstHallButton,
											{ backgroundColor: Colors.primary[500] },
										]}
										onPress={handleAddNewHall}
									>
										<Text style={styles.addFirstHallText}>Add First Hall</Text>
									</TouchableOpacity>
								)}
						</View>
					) : (
						<View style={styles.hallGrid}>
							{halls.map((hall, index) => renderHallCard(hall, index))}
						</View>
					)}
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
	headerButtons: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing[2],
	},
	addButton: {
		width: 44,
		height: 44,
		borderRadius: BorderRadius.xl,
		justifyContent: "center",
		alignItems: "center",
		...Shadows.sm,
		flexShrink: 0,
		marginTop: Spacing[1],
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
	// New styles for dynamic functionality
	statusBadge: {
		position: "absolute",
		top: Spacing[2],
		right: Spacing[2],
		paddingHorizontal: Spacing[2],
		paddingVertical: Spacing[1],
		borderRadius: BorderRadius.md,
		minWidth: 60,
	},
	statusText: {
		fontSize: Typography.fontSize.xs,
		color: "white",
		fontWeight: Typography.fontWeight.medium as any,
		textAlign: "center",
	},
	editButton: {
		position: "absolute",
		bottom: Spacing[2],
		right: Spacing[2],
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.1)",
		justifyContent: "center",
		alignItems: "center",
	},
	loadingContainer: {
		padding: Spacing[8],
		alignItems: "center",
		justifyContent: "center",
	},
	loadingText: {
		marginTop: Spacing[4],
		fontSize: Typography.fontSize.sm,
		textAlign: "center",
	},
	emptyContainer: {
		padding: Spacing[8],
		alignItems: "center",
		justifyContent: "center",
	},
	emptyText: {
		marginTop: Spacing[4],
		fontSize: Typography.fontSize.base,
		textAlign: "center",
	},
	addFirstHallButton: {
		marginTop: Spacing[6],
		paddingHorizontal: Spacing[6],
		paddingVertical: Spacing[3],
		borderRadius: BorderRadius.lg,
	},
	addFirstHallText: {
		color: "white",
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.semibold as any,
	},
});
