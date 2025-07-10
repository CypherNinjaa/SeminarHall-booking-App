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
	Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import { adminReportsService } from "../../services/adminReportsService";

const { width: screenWidth } = Dimensions.get("window");

// Types
interface ReportMetrics {
	total_bookings: number;
	total_halls: number;
	utilization_rate: number;
	popular_halls: HallUsage[];
	booking_trends: BookingTrend[];
	user_activity: UserActivity[];
}

interface HallUsage {
	hall_id: string;
	hall_name: string;
	bookings_count: number;
	total_hours: number;
	utilization_percentage: number;
}

interface BookingTrend {
	period: string;
	bookings: number;
}

interface UserActivity {
	user_id: string;
	user_name: string;
	department: string;
	total_bookings: number;
	total_hours: number;
}

interface TimeRange {
	label: string;
	value: "week" | "month" | "quarter" | "year";
}

const AdminReportsScreen: React.FC = () => {
	const { isDark } = useTheme();
	const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
		label: "This Month",
		value: "month",
	});
	const [exportLoading, setExportLoading] = useState(false);

	const timeRanges: TimeRange[] = [
		{ label: "This Week", value: "week" },
		{ label: "This Month", value: "month" },
		{ label: "This Quarter", value: "quarter" },
		{ label: "This Year", value: "year" },
	];

	const loadReports = useCallback(async () => {
		try {
			setLoading(true);
			// Use real service call
			const reportsData = await adminReportsService.getMetrics(
				selectedTimeRange.value
			);
			setMetrics(reportsData);
		} catch (error) {
			console.error("Error loading reports:", error);
			Alert.alert("Error", "Failed to load reports. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [selectedTimeRange]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadReports();
		setRefreshing(false);
	}, [loadReports]);

	useFocusEffect(
		useCallback(() => {
			loadReports();
		}, [loadReports])
	);

	const handleExportData = async (format: "pdf" | "excel") => {
		try {
			setExportLoading(true);
			// Use real service call
			const filePath =
				format === "pdf"
					? await adminReportsService.exportDataAsPDF(selectedTimeRange.value)
					: await adminReportsService.exportDataAsExcel(
							selectedTimeRange.value
					  );

			Alert.alert(
				"Success",
				`Report exported successfully as ${format.toUpperCase()}! File saved at: ${filePath}`
			);
		} catch (error) {
			console.error("Error exporting data:", error);
			Alert.alert("Error", "Failed to export data. Please try again.");
		} finally {
			setExportLoading(false);
		}
	};

	const renderMetricCard = (
		title: string,
		value: string | number,
		subtitle?: string,
		icon?: string,
		color?: string
	) => (
		<View style={[styles.metricCard, isDark && styles.metricCardDark]}>
			<View style={styles.metricHeader}>
				{icon && (
					<View
						style={[
							styles.metricIcon,
							{ backgroundColor: color || Colors.primary[500] + "20" },
						]}
					>
						<Ionicons
							name={icon as any}
							size={24}
							color={color || Colors.primary[500]}
						/>
					</View>
				)}
				<Text style={[styles.metricTitle, isDark && styles.metricTitleDark]}>
					{title}
				</Text>
			</View>
			<Text style={[styles.metricValue, isDark && styles.metricValueDark]}>
				{value}
			</Text>
			{subtitle && (
				<Text
					style={[styles.metricSubtitle, isDark && styles.metricSubtitleDark]}
				>
					{subtitle}
				</Text>
			)}
		</View>
	);

	const renderTimeRangePicker = () => (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			style={styles.timeRangePicker}
		>
			{timeRanges.map((range) => (
				<TouchableOpacity
					key={range.value}
					style={[
						styles.timeRangeChip,
						selectedTimeRange.value === range.value &&
							styles.activeTimeRangeChip,
						isDark && styles.timeRangeChipDark,
					]}
					onPress={() => setSelectedTimeRange(range)}
				>
					<Text
						style={[
							styles.timeRangeText,
							selectedTimeRange.value === range.value &&
								styles.activeTimeRangeText,
							isDark && styles.timeRangeTextDark,
						]}
					>
						{range.label}
					</Text>
				</TouchableOpacity>
			))}
		</ScrollView>
	);

	const renderHallUsageList = () => (
		<View style={[styles.section, isDark && styles.sectionDark]}>
			<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
				Popular Halls
			</Text>
			{metrics?.popular_halls.map((hall, index) => (
				<View key={hall.hall_id} style={styles.hallUsageItem}>
					<View style={styles.hallUsageHeader}>
						<Text
							style={[styles.hallUsageName, isDark && styles.hallUsageNameDark]}
						>
							{hall.hall_name}
						</Text>
						<Text
							style={[
								styles.hallUsagePercentage,
								{ color: Colors.success.main },
							]}
						>
							{hall.utilization_percentage.toFixed(1)}%
						</Text>
					</View>
					<View style={styles.hallUsageDetails}>
						<Text
							style={[
								styles.hallUsageDetail,
								isDark && styles.hallUsageDetailDark,
							]}
						>
							{hall.bookings_count} bookings • {hall.total_hours} hours
						</Text>
					</View>
					<View style={styles.progressBar}>
						<View
							style={[
								styles.progressFill,
								{
									width: `${hall.utilization_percentage}%`,
									backgroundColor: Colors.success.main,
								},
							]}
						/>
					</View>
				</View>
			))}
		</View>
	);

	const renderUserActivityList = () => (
		<View style={[styles.section, isDark && styles.sectionDark]}>
			<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
				Top Users
			</Text>
			{metrics?.user_activity.map((user, index) => (
				<View key={user.user_id} style={styles.userActivityItem}>
					<View style={styles.userActivityHeader}>
						<View style={styles.userInfo}>
							<Text style={[styles.userName, isDark && styles.userNameDark]}>
								{user.user_name}
							</Text>
							<Text
								style={[
									styles.userDepartment,
									isDark && styles.userDepartmentDark,
								]}
							>
								{user.department}
							</Text>
						</View>
						<View style={styles.userStats}>
							<Text
								style={[styles.userBookings, isDark && styles.userBookingsDark]}
							>
								{user.total_bookings} bookings
							</Text>
							<Text style={[styles.userHours, isDark && styles.userHoursDark]}>
								{user.total_hours} hours
							</Text>
						</View>
					</View>
				</View>
			))}
		</View>
	);

	const renderExportOptions = () => (
		<View style={[styles.section, isDark && styles.sectionDark]}>
			<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
				Export Data
			</Text>
			<View style={styles.exportButtonsContainer}>
				<TouchableOpacity
					style={[styles.exportButton, isDark && styles.exportButtonDark]}
					onPress={() => handleExportData("pdf")}
					disabled={exportLoading}
				>
					<Ionicons
						name="document-text-outline"
						size={20}
						color={Colors.primary[500]}
					/>
					<Text
						style={[
							styles.exportButtonText,
							isDark && styles.exportButtonTextDark,
						]}
					>
						Export as PDF
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.exportButton, isDark && styles.exportButtonDark]}
					onPress={() => handleExportData("excel")}
					disabled={exportLoading}
				>
					<Ionicons name="grid-outline" size={20} color={Colors.success.main} />
					<Text
						style={[
							styles.exportButtonText,
							isDark && styles.exportButtonTextDark,
						]}
					>
						Export as Excel
					</Text>
				</TouchableOpacity>
			</View>
			{exportLoading && (
				<View style={styles.exportLoadingContainer}>
					<ActivityIndicator size="small" color={Colors.primary[500]} />
					<Text
						style={[
							styles.exportLoadingText,
							isDark && styles.exportLoadingTextDark,
						]}
					>
						Preparing export...
					</Text>
				</View>
			)}
		</View>
	);

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Header */}
			<LinearGradient
				colors={
					isDark
						? [
								Colors.dark.background.secondary,
								Colors.dark.background.secondary + "80",
						  ]
						: [Colors.primary[500], Colors.primary[500] + "80"]
				}
				style={styles.header}
			>
				<Text style={styles.headerTitle}>Reports & Analytics</Text>
				<Text style={styles.headerSubtitle}>
					Insights for {selectedTimeRange.label.toLowerCase()}
				</Text>
			</LinearGradient>

			{/* Time Range Picker */}
			{renderTimeRangePicker()}

			<ScrollView
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				contentContainerStyle={styles.scrollContent}
			>
				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={Colors.primary[500]} />
						<Text
							style={[styles.loadingText, isDark && styles.loadingTextDark]}
						>
							Loading reports...
						</Text>
					</View>
				) : metrics ? (
					<>
						{/* Key Metrics */}
						<View style={styles.metricsGrid}>
							{renderMetricCard(
								"Total Bookings",
								metrics.total_bookings,
								`Across ${metrics.total_halls} halls`,
								"calendar-outline",
								Colors.primary[500]
							)}
							{renderMetricCard(
								"Utilization Rate",
								`${metrics.utilization_rate}%`,
								"Overall efficiency",
								"analytics-outline",
								Colors.success.main
							)}
							{renderMetricCard(
								"Active Halls",
								metrics.total_halls,
								"Available for booking",
								"business-outline",
								Colors.primary[500]
							)}
						</View>

						{/* Hall Usage */}
						{renderHallUsageList()}

						{/* User Activity */}
						{renderUserActivityList()}

						{/* Export Options */}
						{renderExportOptions()}
					</>
				) : (
					<View style={styles.errorContainer}>
						<Ionicons
							name="alert-circle-outline"
							size={64}
							color={
								isDark ? Colors.dark.text.secondary : Colors.text.secondary
							}
						/>
						<Text style={[styles.errorTitle, isDark && styles.errorTitleDark]}>
							Failed to Load Reports
						</Text>
						<Text
							style={[styles.errorMessage, isDark && styles.errorMessageDark]}
						>
							Please try refreshing the page or check your connection.
						</Text>
						<TouchableOpacity style={styles.retryButton} onPress={loadReports}>
							<Text style={styles.retryButtonText}>Retry</Text>
						</TouchableOpacity>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background.primary,
	},
	containerDark: {
		backgroundColor: Colors.dark.background.primary,
	},

	// Header
	header: {
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[8],
		paddingTop: Spacing[8] + 20,
	},
	headerTitle: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.inverse,
	},
	headerSubtitle: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.inverse + "90",
		marginTop: Spacing[1],
	},

	// Time Range Picker
	timeRangePicker: {
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[4],
	},
	timeRangeChip: {
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.full,
		marginRight: Spacing[3],
		borderWidth: 1,
		borderColor: Colors.border.main,
	},
	timeRangeChipDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.main,
	},
	activeTimeRangeChip: {
		backgroundColor: Colors.primary[500],
		borderColor: Colors.primary[500],
	},
	timeRangeText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		fontWeight: Typography.fontWeight.medium,
	},
	timeRangeTextDark: {
		color: Colors.dark.text.secondary,
	},
	activeTimeRangeText: {
		color: Colors.text.inverse,
	},

	// Content
	scrollContent: {
		paddingHorizontal: Spacing[5],
		paddingBottom: Spacing[8],
	},

	// Metrics Grid
	metricsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: Spacing[6],
	},
	metricCard: {
		width: (screenWidth - Spacing[5] * 2 - Spacing[3]) / 2,
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[4],
		marginBottom: Spacing[4],
		...Shadows.md,
	},
	metricCardDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	metricHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing[3],
	},
	metricIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	metricTitle: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		fontWeight: Typography.fontWeight.medium,
		flex: 1,
	},
	metricTitleDark: {
		color: Colors.dark.text.secondary,
	},
	metricValue: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
	},
	metricValueDark: {
		color: Colors.dark.text.primary,
	},
	metricSubtitle: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
	},
	metricSubtitleDark: {
		color: Colors.dark.text.secondary,
	},

	// Sections
	section: {
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[5],
		marginBottom: Spacing[5],
		...Shadows.sm,
	},
	sectionDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	sectionTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[4],
	},
	sectionTitleDark: {
		color: Colors.dark.text.primary,
	},

	// Hall Usage
	hallUsageItem: {
		marginBottom: Spacing[4],
	},
	hallUsageHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing[2],
	},
	hallUsageName: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.primary,
		flex: 1,
	},
	hallUsageNameDark: {
		color: Colors.dark.text.primary,
	},
	hallUsagePercentage: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.semibold,
	},
	hallUsageDetails: {
		marginBottom: Spacing[2],
	},
	hallUsageDetail: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
	},
	hallUsageDetailDark: {
		color: Colors.dark.text.secondary,
	},
	progressBar: {
		height: 6,
		backgroundColor: Colors.gray[200],
		borderRadius: BorderRadius.sm,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		borderRadius: BorderRadius.sm,
	},

	// User Activity
	userActivityItem: {
		marginBottom: Spacing[4],
	},
	userActivityHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
	},
	userInfo: {
		flex: 1,
	},
	userName: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
	},
	userNameDark: {
		color: Colors.dark.text.primary,
	},
	userDepartment: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
	},
	userDepartmentDark: {
		color: Colors.dark.text.secondary,
	},
	userStats: {
		alignItems: "flex-end",
	},
	userBookings: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.primary[500],
		marginBottom: Spacing[1],
	},
	userBookingsDark: {
		color: Colors.primary[400],
	},
	userHours: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
	},
	userHoursDark: {
		color: Colors.dark.text.secondary,
	},

	// Export Options
	exportButtonsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing[4],
	},
	exportButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.md,
		padding: Spacing[4],
		marginHorizontal: Spacing[2],
		borderWidth: 1,
		borderColor: Colors.border.main,
		...Shadows.sm,
	},
	exportButtonDark: {
		backgroundColor: Colors.dark.background.primary,
		borderColor: Colors.dark.border.main,
	},
	exportButtonText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.primary,
		marginLeft: Spacing[2],
	},
	exportButtonTextDark: {
		color: Colors.dark.text.primary,
	},
	exportLoadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing[3],
	},
	exportLoadingText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginLeft: Spacing[2],
	},
	exportLoadingTextDark: {
		color: Colors.dark.text.secondary,
	},

	// Loading & Error States
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: Spacing[8],
	},
	loadingText: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		marginTop: Spacing[4],
	},
	loadingTextDark: {
		color: Colors.dark.text.secondary,
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: Spacing[8],
	},
	errorTitle: {
		fontSize: Typography.fontSize.xl,
		color: Colors.text.primary,
		marginTop: Spacing[5],
		marginBottom: Spacing[3],
	},
	errorTitleDark: {
		color: Colors.dark.text.primary,
	},
	errorMessage: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		textAlign: "center",
		marginBottom: Spacing[5],
	},
	errorMessageDark: {
		color: Colors.dark.text.secondary,
	},
	retryButton: {
		backgroundColor: Colors.primary[500],
		paddingHorizontal: Spacing[6],
		paddingVertical: Spacing[3],
		borderRadius: BorderRadius.md,
	},
	retryButtonText: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.inverse,
		fontWeight: Typography.fontWeight.medium,
	},
});

export default AdminReportsScreen;
