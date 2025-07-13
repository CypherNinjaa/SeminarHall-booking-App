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
	detailed_bookings: DetailedBooking[];
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

interface DetailedBooking {
	booking_id: string;
	hall_id: string;
	hall_name: string;
	hall_capacity: number;
	hall_location: string;
	hall_type: string;
	user_id: string;
	user_name: string;
	user_email: string;
	user_phone: string;
	user_department: string;
	user_role: string;
	booking_date: string;
	start_time: string;
	end_time: string;
	duration_minutes: number;
	duration_hours: number;
	buffer_start: string;
	buffer_end: string;
	purpose: string;
	description: string;
	attendees_count: number;
	equipment_needed: string[];
	special_requirements: string;
	status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
	priority: "low" | "medium" | "high";
	auto_approved: boolean;
	approved_by: string;
	approved_at: string;
	rejected_reason?: string;
	admin_notes?: string;
	created_at: string;
	updated_at: string;
	// Legacy fields for compatibility
	cancellation_reason?: string;
	actual_attendees?: number;
	feedback_rating?: number;
	feedback_comments?: string;
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
	const [exportingFormat, setExportingFormat] = useState<
		"pdf" | "excel" | null
	>(null);

	const timeRanges: TimeRange[] = [
		{ label: "This Week", value: "week" },
		{ label: "This Month", value: "month" },
		{ label: "This Quarter", value: "quarter" },
		{ label: "This Year", value: "year" },
	];

	const loadReports = useCallback(async () => {
		try {
			setLoading(true);
			console.log(
				`[AdminReportsScreen] Loading reports for ${selectedTimeRange.value}`
			);

			// Debug database contents
			await adminReportsService.debugDatabaseContents();

			// Use real service call
			const reportsData = await adminReportsService.getMetrics(
				selectedTimeRange.value
			);
			console.log("[AdminReportsScreen] Reports data received:", reportsData);
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
			setExportingFormat(format);

			let filePath: string;
			let successMessage: string;

			if (format === "pdf") {
				filePath = await adminReportsService.exportDataAsPDF(
					selectedTimeRange.value
				);
				successMessage = `📋 Comprehensive PDF Report exported successfully!
				
✅ Includes: Analytics overview, popular halls, top users, and complete booking records with user details, contact information, booking purposes, equipment requests, and approval history.

Perfect for stakeholder presentations and data analysis!`;
			} else {
				filePath = await adminReportsService.exportDataAsExcel(
					selectedTimeRange.value
				);
				successMessage = `📊 Detailed Excel/CSV Data exported successfully!
				
✅ Includes: All booking records with complete user information, hall details, timing, purpose, attendees, equipment, approval data, and feedback.

Ready for data analysis, pivot tables, and business intelligence tools!`;
			}

			// Show success message with the option to share again
			Alert.alert("Export Successful! 🎉", successMessage, [
				{
					text: "OK",
					style: "default",
				},
			]);
		} catch (error) {
			console.error("Error exporting data:", error);
			Alert.alert(
				"Export Failed",
				"Failed to export data. Please check your device storage and try again.",
				[{ text: "OK", style: "default" }]
			);
		} finally {
			setExportLoading(false);
			setExportingFormat(null);
		}
	};

	// Redesigned metric card with modern styling
	const renderMetricCard = (
		title: string,
		value: string | number,
		subtitle?: string,
		icon?: string,
		color?: string,
		trend?: { direction: "up" | "down"; percentage: number }
	) => (
		<View style={[styles.metricCard, isDark && styles.metricCardDark]}>
			<View style={styles.metricIconContainer}>
				{icon && (
					<View
						style={[
							styles.metricIconWrapper,
							{ backgroundColor: color || Colors.primary[500] + "15" },
						]}
					>
						<Ionicons
							name={icon as any}
							size={28}
							color={color || Colors.primary[500]}
						/>
					</View>
				)}
				{trend && (
					<View style={styles.trendIndicator}>
						<Ionicons
							name={trend.direction === "up" ? "trending-up" : "trending-down"}
							size={16}
							color={
								trend.direction === "up"
									? Colors.success.main
									: Colors.error.main
							}
						/>
						<Text
							style={[
								styles.trendText,
								{
									color:
										trend.direction === "up"
											? Colors.success.main
											: Colors.error.main,
								},
							]}
						>
							{trend.percentage}%
						</Text>
					</View>
				)}
			</View>
			<View style={styles.metricContent}>
				<Text
					style={[
						styles.metricValue,
						isDark && styles.metricValueDark,
						{ color: color || Colors.text.primary },
					]}
				>
					{value}
				</Text>
				<Text style={[styles.metricTitle, isDark && styles.metricTitleDark]}>
					{title}
				</Text>
				{subtitle && (
					<Text
						style={[styles.metricSubtitle, isDark && styles.metricSubtitleDark]}
					>
						{subtitle}
					</Text>
				)}
			</View>
		</View>
	);

	// Redesigned time range picker with pills
	const renderTimeRangePicker = () => (
		<View style={styles.timeRangeContainer}>
			<Text
				style={[styles.timeRangeLabel, isDark && styles.timeRangeLabelDark]}
			>
				📊 Analytics Period
			</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.timeRangePicker}
				contentContainerStyle={styles.timeRangeContent}
			>
				{timeRanges.map((range) => (
					<TouchableOpacity
						key={range.value}
						style={[
							styles.timeRangePill,
							selectedTimeRange.value === range.value &&
								styles.activeTimeRangePill,
							isDark && styles.timeRangePillDark,
						]}
						onPress={() => setSelectedTimeRange(range)}
						accessibilityLabel={`Select ${range.label}`}
						accessibilityHint="Change analytics time period"
					>
						<Ionicons
							name="calendar-outline"
							size={16}
							color={
								selectedTimeRange.value === range.value
									? Colors.text.inverse
									: isDark
									? Colors.dark.text.secondary
									: Colors.text.secondary
							}
						/>
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
		</View>
	);

	const renderHallUsageList = () => (
		<View style={[styles.section, isDark && styles.sectionDark]}>
			<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
				🏛️ Popular Halls
			</Text>
			{metrics?.popular_halls.map((hall, index) => (
				<View
					key={hall.hall_id}
					style={[styles.hallUsageItem, isDark && styles.hallUsageItemDark]}
				>
					<View style={styles.hallUsageHeader}>
						<View style={styles.hallRankContainer}>
							<Text style={styles.hallRank}>#{index + 1}</Text>
						</View>
						<View style={styles.hallInfoContainer}>
							<Text
								style={[
									styles.hallUsageName,
									isDark && styles.hallUsageNameDark,
								]}
							>
								{hall.hall_name}
							</Text>
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
						</View>
						<View style={styles.utilizationBadge}>
							<Text
								style={[
									styles.hallUsagePercentage,
									{ color: Colors.success.main },
								]}
							>
								{hall.utilization_percentage.toFixed(1)}%
							</Text>
						</View>
					</View>
					<View style={styles.progressBarContainer}>
						<View style={styles.progressBar}>
							<View
								style={[
									styles.progressFill,
									{
										width: `${hall.utilization_percentage}%`,
										backgroundColor:
											index < 3 ? Colors.success.main : Colors.primary[500],
									},
								]}
							/>
						</View>
					</View>
				</View>
			))}
		</View>
	);

	const renderUserActivityList = () => (
		<View style={[styles.section, isDark && styles.sectionDark]}>
			<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
				👥 Top Users
			</Text>
			{metrics?.user_activity.map((user, index) => (
				<View
					key={user.user_id}
					style={[
						styles.userActivityItem,
						isDark && styles.userActivityItemDark,
					]}
				>
					<View style={styles.userActivityHeader}>
						<View style={styles.userRankContainer}>
							<Text style={styles.userRank}>#{index + 1}</Text>
						</View>
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
							<View style={styles.userStatItem}>
								<Text
									style={[
										styles.userBookings,
										isDark && styles.userBookingsDark,
									]}
								>
									{user.total_bookings}
								</Text>
								<Text
									style={[
										styles.userStatLabel,
										isDark && styles.userStatLabelDark,
									]}
								>
									bookings
								</Text>
							</View>
							<View style={styles.userStatItem}>
								<Text
									style={[styles.userHours, isDark && styles.userHoursDark]}
								>
									{user.total_hours}h
								</Text>
								<Text
									style={[
										styles.userStatLabel,
										isDark && styles.userStatLabelDark,
									]}
								>
									hours
								</Text>
							</View>
						</View>
					</View>
				</View>
			))}
		</View>
	);

	const renderExportOptions = () => (
		<View style={[styles.section, isDark && styles.sectionDark]}>
			<View style={styles.sectionHeaderTitle}>
				<Ionicons
					name="download-outline"
					size={24}
					color={isDark ? Colors.dark.text.primary : Colors.text.primary}
					style={{ marginRight: Spacing[2] }}
				/>
				<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
					Export Reports
				</Text>
			</View>

			<View style={styles.exportOptionsGrid}>
				<TouchableOpacity
					style={[
						styles.exportOptionCard,
						isDark && styles.exportOptionCardDark,
					]}
					onPress={() => handleExportData("pdf")}
					disabled={exportLoading}
					accessibilityLabel="Export PDF Report"
					accessibilityHint="Download comprehensive analytics in PDF format"
				>
					{exportingFormat === "pdf" ? (
						<View style={[styles.exportIconContainer, styles.pdfIconContainer]}>
							<ActivityIndicator size={24} color={Colors.error.main} />
						</View>
					) : (
						<View style={[styles.exportIconContainer, styles.pdfIconContainer]}>
							<Ionicons
								name="document-text-outline"
								size={24}
								color={Colors.error.main}
							/>
						</View>
					)}
					<Text
						style={[
							styles.exportOptionTitle,
							isDark && styles.exportOptionTitleDark,
						]}
					>
						{exportingFormat === "pdf" ? "Generating..." : "PDF Report"}
					</Text>
					<Text
						style={[
							styles.exportOptionDescription,
							isDark && styles.exportOptionDescriptionDark,
						]}
					>
						{exportingFormat === "pdf"
							? "Creating comprehensive PDF report..."
							: "Complete analytics with detailed booking records, user info, and approval history"}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.exportOptionCard,
						isDark && styles.exportOptionCardDark,
					]}
					onPress={() => handleExportData("excel")}
					disabled={exportLoading}
					accessibilityLabel="Export Excel Data"
					accessibilityHint="Download booking data in Excel format"
				>
					{exportingFormat === "excel" ? (
						<View
							style={[styles.exportIconContainer, styles.excelIconContainer]}
						>
							<ActivityIndicator size={24} color={Colors.success.main} />
						</View>
					) : (
						<View
							style={[styles.exportIconContainer, styles.excelIconContainer]}
						>
							<Ionicons
								name="grid-outline"
								size={24}
								color={Colors.success.main}
							/>
						</View>
					)}
					<Text
						style={[
							styles.exportOptionTitle,
							isDark && styles.exportOptionTitleDark,
						]}
					>
						{exportingFormat === "excel" ? "Generating..." : "Excel Data"}
					</Text>
					<Text
						style={[
							styles.exportOptionDescription,
							isDark && styles.exportOptionDescriptionDark,
						]}
					>
						{exportingFormat === "excel"
							? "Creating detailed CSV dataset..."
							: "Complete booking data with user details, purposes, equipment, and analytics-ready format"}
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
						{exportingFormat === "pdf"
							? "Generating PDF report..."
							: exportingFormat === "excel"
							? "Generating Excel data..."
							: "Preparing export..."}
					</Text>
				</View>
			)}

			<Text style={[styles.exportNote, isDark && styles.exportNoteDark]}>
				<Ionicons
					name="information-circle-outline"
					size={14}
					color={Colors.text.secondary}
				/>{" "}
				Reports include data from the selected time range
			</Text>

			{metrics && (
				<View style={styles.dataInsightsContainer}>
					<Text
						style={[
							styles.dataInsightsTitle,
							isDark && styles.dataInsightsTitleDark,
						]}
					>
						📊 Data Analyst Features
					</Text>
					<View style={styles.dataInsightsGrid}>
						<View
							style={[
								styles.dataInsightCard,
								isDark && styles.dataInsightCardDark,
							]}
						>
							<Text
								style={[
									styles.dataInsightNumber,
									isDark && styles.dataInsightNumberDark,
								]}
							>
								{metrics.detailed_bookings?.length || 0}
							</Text>
							<Text
								style={[
									styles.dataInsightLabel,
									isDark && styles.dataInsightLabelDark,
								]}
							>
								Complete Records
							</Text>
						</View>
						<View
							style={[
								styles.dataInsightCard,
								isDark && styles.dataInsightCardDark,
							]}
						>
							<Text
								style={[
									styles.dataInsightNumber,
									isDark && styles.dataInsightNumberDark,
								]}
							>
								25+
							</Text>
							<Text
								style={[
									styles.dataInsightLabel,
									isDark && styles.dataInsightLabelDark,
								]}
							>
								Data Fields
							</Text>
						</View>
						<View
							style={[
								styles.dataInsightCard,
								isDark && styles.dataInsightCardDark,
							]}
						>
							<Text
								style={[
									styles.dataInsightNumber,
									isDark && styles.dataInsightNumberDark,
								]}
							>
								{
									new Set(
										metrics.detailed_bookings?.map((b) => b.user_id) || []
									).size
								}
							</Text>
							<Text
								style={[
									styles.dataInsightLabel,
									isDark && styles.dataInsightLabelDark,
								]}
							>
								Unique Users
							</Text>
						</View>
					</View>
					<Text
						style={[
							styles.dataInsightsDescription,
							isDark && styles.dataInsightsDescriptionDark,
						]}
					>
						💡 Includes user contact info, booking purposes, equipment requests,
						approval history, feedback, and more for comprehensive analysis
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
						{/* Key Metrics - Redesigned */}
						<View style={styles.metricsSection}>
							<Text
								style={[
									styles.sectionHeaderTitle,
									isDark && styles.sectionHeaderTitleDark,
								]}
							>
								📈 Key Performance Metrics
							</Text>
							<View style={styles.metricsGrid}>
								{renderMetricCard(
									"Total Bookings",
									metrics.total_bookings,
									`Across ${metrics.total_halls} halls`,
									"calendar-outline",
									Colors.primary[500],
									{ direction: "up", percentage: 12 }
								)}
								{renderMetricCard(
									"Utilization Rate",
									`${metrics.utilization_rate}%`,
									"Overall efficiency",
									"analytics-outline",
									Colors.success.main,
									{ direction: "up", percentage: 8 }
								)}
								{renderMetricCard(
									"Active Halls",
									metrics.total_halls,
									"Available for booking",
									"business-outline",
									Colors.warning.main
								)}
								{renderMetricCard(
									"Peak Usage",
									"85%",
									"Today's highest",
									"flash-outline",
									Colors.error.main,
									{ direction: "down", percentage: 3 }
								)}
							</View>
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
		gap: Spacing[3],
	},
	metricCard: {
		width: (screenWidth - Spacing[5] * 2 - Spacing[3]) / 2,
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.xl,
		padding: Spacing[5],
		marginBottom: Spacing[4],
		...Shadows.lg,
		borderWidth: 1,
		borderColor: Colors.border.main + "30",
	},
	metricCardDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.main + "30",
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
		marginBottom: Spacing[1],
	},
	metricTitleDark: {
		color: Colors.dark.text.secondary,
	},
	metricValue: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
		letterSpacing: -0.5,
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
		borderRadius: BorderRadius.xl,
		padding: Spacing[5],
		marginBottom: Spacing[5],
		...Shadows.lg,
		borderWidth: 1,
		borderColor: Colors.border.main + "20",
	},
	sectionDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.main + "20",
	},
	sectionTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		marginBottom: Spacing[4],
		letterSpacing: -0.3,
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
		gap: Spacing[3],
	},
	exportButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.xl,
		padding: Spacing[4],
		borderWidth: 1,
		borderColor: Colors.border.main,
		...Shadows.md,
		minHeight: 56,
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

	// --- PRO UI/UX REDESIGN ADDITIONS ---
	// Redesigned Metrics
	metricsSection: {
		marginBottom: Spacing[6],
	},
	sectionHeaderTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		marginBottom: Spacing[4],
		marginHorizontal: Spacing[1],
	},
	sectionHeaderTitleDark: {
		color: Colors.dark.text.primary,
	},
	metricIconContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing[3],
	},
	metricIconWrapper: {
		width: 56,
		height: 56,
		borderRadius: BorderRadius.full,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: Colors.primary[50],
	},
	trendIndicator: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.background.primary,
		paddingHorizontal: Spacing[2],
		paddingVertical: Spacing[1],
		borderRadius: BorderRadius.sm,
		gap: 4,
	},
	trendText: {
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.semibold,
	},
	metricContent: {
		flex: 1,
	},

	// Redesigned Time Range Picker
	timeRangeContainer: {
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[4],
		backgroundColor: Colors.background.secondary,
		marginHorizontal: Spacing[5],
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing[4],
		...Shadows.sm,
	},
	timeRangeLabel: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[3],
	},
	timeRangeLabelDark: {
		color: Colors.dark.text.primary,
	},
	timeRangeContent: {
		paddingRight: Spacing[4],
	},
	timeRangePill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.full,
		marginRight: Spacing[3],
		borderWidth: 1,
		borderColor: Colors.border.main,
		gap: 8,
		minHeight: 44,
	},
	timeRangePillDark: {
		backgroundColor: Colors.dark.background.primary,
		borderColor: Colors.dark.border.main,
	},
	activeTimeRangePill: {
		backgroundColor: Colors.primary[500],
		borderColor: Colors.primary[500],
	},

	// Additional Redesigned Styles
	hallUsageItemDark: {
		backgroundColor: Colors.dark.background.primary + "30",
	},
	hallRankContainer: {
		width: 36,
		height: 36,
		borderRadius: BorderRadius.full,
		backgroundColor: Colors.primary[50],
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	hallRank: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.primary[500],
	},
	hallInfoContainer: {
		flex: 1,
		marginRight: Spacing[3],
	},
	utilizationBadge: {
		backgroundColor: Colors.success.light,
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[1],
		borderRadius: BorderRadius.full,
	},
	progressBarContainer: {
		marginTop: Spacing[3],
	},

	// User Activity Redesigned Styles
	userActivityItemDark: {
		backgroundColor: Colors.dark.background.primary + "30",
	},
	userRankContainer: {
		width: 36,
		height: 36,
		borderRadius: BorderRadius.full,
		backgroundColor: Colors.warning.light,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	userRank: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.warning.main,
	},
	userStatItem: {
		alignItems: "center",
		marginLeft: Spacing[3],
	},
	userStatLabel: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
		marginTop: 2,
	},
	userStatLabelDark: {
		color: Colors.dark.text.secondary,
	},

	// Export Section Redesigned Styles
	exportOptionsGrid: {
		flexDirection: "row",
		gap: Spacing[4],
		marginBottom: Spacing[4],
	},
	exportOptionCard: {
		flex: 1,
		backgroundColor: Colors.background.primary,
		padding: Spacing[4],
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		borderColor: Colors.gray[200],
		alignItems: "center",
		...Shadows.md,
	},
	exportOptionCardDark: {
		backgroundColor: Colors.dark.background.primary,
		borderColor: Colors.gray[700],
	},
	exportIconContainer: {
		width: 48,
		height: 48,
		borderRadius: BorderRadius.full,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing[3],
	},
	pdfIconContainer: {
		backgroundColor: Colors.error.light + "40",
	},
	excelIconContainer: {
		backgroundColor: Colors.success.light + "40",
	},
	exportOptionTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
	},
	exportOptionTitleDark: {
		color: Colors.dark.text.primary,
	},
	exportOptionDescription: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		textAlign: "center",
	},
	exportOptionDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	exportNote: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		textAlign: "center",
		marginTop: Spacing[3],
		lineHeight: 20,
	},
	exportNoteDark: {
		color: Colors.dark.text.secondary,
	},

	// Data Insights Section
	dataInsightsContainer: {
		marginTop: Spacing[4],
		padding: Spacing[4],
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		borderColor: Colors.primary[200],
	},
	dataInsightsTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[3],
		textAlign: "center",
	},
	dataInsightsTitleDark: {
		color: Colors.dark.text.primary,
	},
	dataInsightsGrid: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing[3],
	},
	dataInsightCard: {
		flex: 1,
		alignItems: "center",
		padding: Spacing[3],
		marginHorizontal: Spacing[1],
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		borderColor: Colors.border.main + "20",
	},
	dataInsightCardDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.main + "20",
	},
	dataInsightNumber: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.primary[500],
		marginBottom: Spacing[1],
	},
	dataInsightNumberDark: {
		color: Colors.primary[400],
	},
	dataInsightLabel: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
		textAlign: "center",
	},
	dataInsightLabelDark: {
		color: Colors.dark.text.secondary,
	},
	dataInsightsDescription: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		textAlign: "center",
		lineHeight: 18,
	},
	dataInsightsDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	// --- END PRO UI/UX REDESIGN ADDITIONS ---
});

export default AdminReportsScreen;
