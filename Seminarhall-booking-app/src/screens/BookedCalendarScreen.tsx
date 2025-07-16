import React, { useState, useCallback, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Alert,
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar, DateData } from "react-native-calendars";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../contexts/ThemeContext";
import { getThemeColors } from "../utils/themeUtils";
import {
	smartBookingService,
	SmartBooking,
} from "../services/smartBookingService";
import { hallManagementService } from "../services/hallManagementService";

interface BookedCalendarScreenProps {
	navigation: {
		goBack: () => void;
	};
}

interface BookingWithHall extends SmartBooking {
	hall_name?: string;
}

interface DayBookings {
	[key: string]: BookingWithHall[];
}

const { width } = Dimensions.get("window");

// Theme constants
const theme = {
	colors: {
		primary: "#007AFF",
		secondary: "#5856D6",
		success: "#28A745",
		warning: "#FFC107",
		error: "#DC3545",
		surface: "#FFFFFF",
		background: "#F8F9FA",
		text: {
			primary: "#1D1D1F",
			secondary: "#6C757D",
		},
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 16,
		lg: 24,
		xl: 32,
	},
	borderRadius: {
		sm: 8,
		md: 12,
		lg: 16,
	},
};

const BookedCalendarScreen: React.FC<BookedCalendarScreenProps> = ({
	navigation,
}) => {
	const { isDark } = useTheme();
	const themeColors = getThemeColors(isDark);

	// Dynamic theme based on dark mode
	const dynamicTheme = {
		colors: {
			...theme.colors,
			surface: isDark ? "#1C1C1E" : "#FFFFFF",
			text: {
				primary: isDark ? "#FFFFFF" : "#1D1D1F",
				secondary: isDark ? "#EBEBF599" : "#6C757D",
			},
			background: isDark ? "#000000" : "#F8F9FA",
		},
		spacing: theme.spacing,
		borderRadius: theme.borderRadius,
	};

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedDate, setSelectedDate] = useState("");
	const [allBookings, setAllBookings] = useState<BookingWithHall[]>([]);
	const [dayBookings, setDayBookings] = useState<DayBookings>({});
	const [halls, setHalls] = useState<any[]>([]);

	// Helper functions
	const getStatusColor = (status: string) => {
		switch (status) {
			case "approved":
				return theme.colors.success;
			case "pending":
				return theme.colors.warning;
			case "completed":
				return "#6366f1";
			case "rejected":
			case "cancelled":
				return theme.colors.error;
			default:
				return theme.colors.text.secondary;
		}
	};

	// Check if all slots from 9 AM to 6 PM are filled for a specific date
	const checkIfAllSlotsFilledForDate = (
		date: string,
		allBookings: BookingWithHall[]
	): boolean => {
		const dayBookings = allBookings.filter((booking) => {
			const bookingDate = formatDateToCalendarFormat(booking.booking_date);
			return (
				bookingDate === date &&
				(booking.status === "approved" || booking.status === "pending")
			);
		});

		if (dayBookings.length === 0) return false;

		// Define 9 AM to 6 PM working hours (in minutes from midnight)
		const workingHoursStart = 9 * 60; // 9 AM in minutes (540)
		const workingHoursEnd = 18 * 60; // 6 PM in minutes (1080)
		
		// Convert booking times to minutes and merge overlapping bookings
		const bookedSlots = dayBookings.map((booking) => {
			const [startHour, startMin] = booking.start_time.split(":").map(Number);
			const [endHour, endMin] = booking.end_time.split(":").map(Number);
			return {
				start: startHour * 60 + startMin,
				end: endHour * 60 + endMin
			};
		}).filter((slot) => {
			// Only consider slots that overlap with working hours
			return slot.end > workingHoursStart && slot.start < workingHoursEnd;
		}).map((slot) => {
			// Trim slots to working hours boundary
			return {
				start: Math.max(slot.start, workingHoursStart),
				end: Math.min(slot.end, workingHoursEnd)
			};
		});

		if (bookedSlots.length === 0) return false;

		// Sort slots by start time and merge overlapping ones
		bookedSlots.sort((a, b) => a.start - b.start);
		
		const mergedSlots = [];
		let currentSlot = bookedSlots[0];
		
		for (let i = 1; i < bookedSlots.length; i++) {
			const nextSlot = bookedSlots[i];
			
			// If current slot overlaps or is adjacent to next slot, merge them
			if (currentSlot.end >= nextSlot.start) {
				currentSlot.end = Math.max(currentSlot.end, nextSlot.end);
			} else {
				// No overlap, add current slot to merged list and start new one
				mergedSlots.push(currentSlot);
				currentSlot = nextSlot;
			}
		}
		mergedSlots.push(currentSlot);

		// Check if merged slots cover entire working hours
		// Calculate total coverage
		let totalCoverage = 0;
		for (const slot of mergedSlots) {
			totalCoverage += (slot.end - slot.start);
		}
		
		// Check if total coverage equals working hours duration (9 hours = 540 minutes)
		const workingHoursDuration = workingHoursEnd - workingHoursStart;
		return totalCoverage >= workingHoursDuration;
	};

	// ...existing code...

	const formatDate = (dateString: string) => {
		if (!dateString) return "-";
		let year, month, day;
		if (dateString.includes("-")) {
			[year, month, day] = dateString.split("-");
		} else {
			day = dateString.substring(0, 2);
			month = dateString.substring(2, 4);
			year = dateString.substring(4, 8);
		}
		return `${day}/${month}/${year}`;
	};

	const formatTime = (timeString: string) => {
		if (!timeString) return "-";
		if (timeString.includes(":")) return timeString;
		if (timeString.length === 4) {
			return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
		}
		return timeString;
	};

	const formatDateToCalendarFormat = (dateString: string): string => {
		// Convert DDMMYYYY to YYYY-MM-DD
		if (!dateString) return "";
		if (dateString.includes("-")) return dateString;

		const day = dateString.substring(0, 2);
		const month = dateString.substring(2, 4);
		const year = dateString.substring(4, 8);
		return `${year}-${month}-${day}`;
	};

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const [bookingsData, hallsData] = await Promise.all([
				smartBookingService.getAllBookingsForCalendar(), // Get all bookings from all users
				hallManagementService.getAllHalls(),
			]);

			// Show all bookings (including past ones) - users can see all bookings from all users
			// Only filter out cancelled and rejected bookings
			const visibleBookings = bookingsData.filter((booking: SmartBooking) => {
				return booking.status !== "cancelled" && booking.status !== "rejected";
			});

			setAllBookings(visibleBookings);
			setHalls(hallsData);

			// Group ALL bookings by date (not just current user's)
			const grouped: DayBookings = {};
			visibleBookings.forEach((booking: SmartBooking) => {
				const calendarDate = formatDateToCalendarFormat(booking.booking_date);
				if (!grouped[calendarDate]) {
					grouped[calendarDate] = [];
				}
				grouped[calendarDate].push(booking);
			});

			setDayBookings(grouped);

			// Set today as default selected date
			const today = new Date();
			const todayString = today.toISOString().split("T")[0];
			setSelectedDate(todayString);
		} catch (error) {
			console.error("Error fetching calendar data:", error);
			Alert.alert("Error", "Failed to load calendar data. Please try again.");
		} finally {
			setLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			fetchData();
		}, [fetchData])
	);

	const handleRefresh = async () => {
		setRefreshing(true);
		await fetchData();
		setRefreshing(false);
	};

	const onDayPress = (day: DateData) => {
		setSelectedDate(day.dateString);
	};

	// Create marked dates for calendar
	const markedDates = Object.keys(dayBookings).reduce((acc, date) => {
		const bookingsCount = dayBookings[date].length;
		const isSelected = date === selectedDate;
		const isFullyBooked = checkIfAllSlotsFilledForDate(date, allBookings);

		// Determine text color based on booking status
		let textColor = theme.colors.text.primary;
		if (isFullyBooked) {
			textColor = "#FF69B4"; // Pink for fully booked
		} else if (bookingsCount > 3) {
			textColor = theme.colors.error; // Red for 4+ bookings
		} else if (bookingsCount > 1) {
			textColor = theme.colors.warning; // Orange for 2-3 bookings
		} else if (bookingsCount === 1) {
			textColor = theme.colors.success; // Green for 1 booking
		}

		acc[date] = {
			selected: isSelected,
			selectedColor: isFullyBooked ? "#FF69B4" : theme.colors.primary,
			selectedTextColor: "#FFFFFF",
			customStyles: {
				text: {
					color: isSelected ? "#FFFFFF" : textColor,
					fontWeight: bookingsCount > 0 ? "600" : "400",
				},
				container: {
					backgroundColor: isSelected ? (isFullyBooked ? "#FF69B4" : theme.colors.primary) : "transparent",
				},
			},
		};
		return acc;
	}, {} as any);

	// Add selected date even if it has no bookings
	if (selectedDate && !markedDates[selectedDate]) {
		markedDates[selectedDate] = {
			selected: true,
			selectedColor: theme.colors.primary,
			selectedTextColor: "#FFFFFF",
			customStyles: {
				text: {
					color: "#FFFFFF",
					fontWeight: "400",
				},
				container: {
					backgroundColor: theme.colors.primary,
				},
			},
		};
	}

	// Get all bookings for the selected date (from all users)
	const selectedDayBookings = selectedDate
		? dayBookings[selectedDate] || []
		: [];

	// Always show all bookings for the selected date (no need for separate loading)
	const [loadingAllBookings, setLoadingAllBookings] = useState(false);

	// Check if selected date is fully booked
	const isSelectedDateFullyBooked = selectedDate ? checkIfAllSlotsFilledForDate(selectedDate, allBookings) : false;

	// All bookings are already loaded, so we use the same data
	const bookingsToShow = selectedDayBookings;

	const styles = createStyles(dynamicTheme);

	if (loading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<StatusBar style="auto" />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={styles.loadingText}>Loading calendar...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="auto" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => navigation.goBack()}
					style={styles.backButton}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color={dynamicTheme.colors.text.primary}
					/>
				</TouchableOpacity>
				<Text style={styles.headerTitle}>All Bookings Calendar</Text>
				<TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
					<Ionicons name="refresh" size={24} color={theme.colors.primary} />
				</TouchableOpacity>
			</View>

			{/* Stats Summary */}
			<View style={styles.statsContainer}>
				<View style={styles.statCard}>
					<LinearGradient
						colors={[theme.colors.primary + "15", theme.colors.primary + "05"]}
						style={styles.statCardGradient}
					>
						<Ionicons name="calendar" size={24} color={theme.colors.primary} />
						<Text style={styles.statNumber}>
							{Object.keys(dayBookings).length}
						</Text>
						<Text style={styles.statLabel}>Total Days</Text>
					</LinearGradient>
				</View>
				<View style={styles.statCard}>
					<LinearGradient
						colors={[theme.colors.success + "15", theme.colors.success + "05"]}
						style={styles.statCardGradient}
					>
						<Ionicons
							name="checkmark-circle"
							size={24}
							color={theme.colors.success}
						/>
						<Text style={styles.statNumber}>
							{allBookings.filter((b: BookingWithHall) => b.status === "approved").length}
						</Text>
						<Text style={styles.statLabel}>Total Approved</Text>
					</LinearGradient>
				</View>
				<View style={styles.statCard}>
					<LinearGradient
						colors={[theme.colors.warning + "15", theme.colors.warning + "05"]}
						style={styles.statCardGradient}
					>
						<Ionicons name="time" size={24} color={theme.colors.warning} />
						<Text style={styles.statNumber}>
							{allBookings.filter((b: BookingWithHall) => b.status === "pending").length}
						</Text>
						<Text style={styles.statLabel}>Total Pending</Text>
					</LinearGradient>
				</View>
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
				}
			>
				{/* Calendar */}
				<View style={styles.calendarContainer}>
					<Calendar
						onDayPress={onDayPress}
						markedDates={markedDates}
						markingType="custom"
						theme={{
							backgroundColor: dynamicTheme.colors.surface,
							calendarBackground: dynamicTheme.colors.surface,
							textSectionTitleColor: dynamicTheme.colors.text.secondary,
							dayTextColor: dynamicTheme.colors.text.primary,
							todayTextColor: theme.colors.primary,
							selectedDayBackgroundColor: theme.colors.primary,
							selectedDayTextColor: "#FFFFFF",
							monthTextColor: dynamicTheme.colors.text.primary,
							indicatorColor: theme.colors.primary,
							textDayFontFamily: "System",
							textMonthFontFamily: "System",
							textDayHeaderFontFamily: "System",
							textDayFontWeight: "400",
							textMonthFontWeight: "600",
							textDayHeaderFontWeight: "600",
							textDayFontSize: 16,
							textMonthFontSize: 18,
							textDayHeaderFontSize: 14,
							// Enhanced selection styling
							arrowColor: theme.colors.primary,
							disabledArrowColor: dynamicTheme.colors.text.secondary,
							textDisabledColor: dynamicTheme.colors.text.secondary + "50",
						}}
						style={styles.calendar}
						// Add animation and better touch feedback
						enableSwipeMonths={true}
						hideExtraDays={false}
						firstDay={1} // Start week on Monday
						showWeekNumbers={false}
						disableMonthChange={false}
					/>
				</View>

				{/* Legend */}
				<View style={styles.legendContainer}>
					<Text style={styles.legendTitle}>Legend</Text>
					<Text style={[styles.legendText, { marginBottom: 8, fontStyle: 'italic' }]}>
						📍 Showing all bookings from all users
					</Text>
					<View style={styles.legendItems}>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
							<Text style={styles.legendText}>1 booking</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
							<Text style={styles.legendText}>2-3 bookings</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
							<Text style={styles.legendText}>4+ bookings</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: "#FF69B4" }]} />
							<Text style={styles.legendText}>Fully booked (9AM-6PM)</Text>
						</View>
					</View>
				</View>

				{/* Selected Day Bookings */}
				{selectedDate && (
					<View style={styles.selectedDayContainer}>
						<Text style={styles.selectedDayTitle}>
							{isSelectedDateFullyBooked ? "All Bookings" : "All Bookings"} for{" "}
							{new Date(selectedDate).toLocaleDateString("en-US", {
								weekday: "long",
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
							{isSelectedDateFullyBooked && (
								<Text style={[styles.selectedDayTitle, { color: "#FF69B4", fontSize: 16 }]}>
									{" "}(Fully Booked 9AM-6PM)
								</Text>
							)}
						</Text>

						{loadingAllBookings ? (
							<View style={styles.loadingContainer}>
								<ActivityIndicator size="small" color={theme.colors.primary} />
								<Text style={styles.loadingText}>Loading bookings...</Text>
							</View>
						) : bookingsToShow.length === 0 ? (
							<View style={styles.noBookingsContainer}>
								<Ionicons
									name="calendar-outline"
									size={48}
									color={dynamicTheme.colors.text.secondary}
								/>
								<Text style={styles.noBookingsText}>
									No bookings for this day
								</Text>
								
							</View>
						) : (
							<View style={styles.bookingsList}>
								{bookingsToShow
									.sort((a: BookingWithHall, b: BookingWithHall) => a.start_time.localeCompare(b.start_time))
									.map((booking: BookingWithHall, index: number) => (
										<View key={booking.id || index} style={styles.bookingCard}>
											<View style={styles.bookingHeader}>
												<View style={styles.bookingTitleRow}>
													<Text style={styles.hallName} numberOfLines={1}>
														{booking.hall_name}
													</Text>
													<View
														style={[
															styles.statusBadge,
															{
																backgroundColor: getStatusColor(booking.status),
															},
														]}
													>
														<Text style={styles.statusText}>
															{booking.status.charAt(0).toUpperCase() +
																booking.status.slice(1)}
														</Text>
													</View>
												</View>
											</View>

											<View style={styles.bookingDetails}>
												<View style={styles.detailRow}>
													<Ionicons
														name="time"
														size={16}
														color={dynamicTheme.colors.text.secondary}
													/>
													<Text style={styles.detailText}>
														{formatTime(booking.start_time)} -{" "}
														{formatTime(booking.end_time)}
													</Text>
													<Text style={styles.durationText}>
														({booking.duration_minutes} min)
													</Text>
												</View>
												<View style={styles.detailRow}>
													<Ionicons
														name="people"
														size={16}
														color={dynamicTheme.colors.text.secondary}
													/>
													<Text style={styles.detailText}>
														{booking.attendees_count} attendees
													</Text>
												</View>
												<View style={styles.detailRow}>
													<Ionicons
														name="bookmark"
														size={16}
														color={dynamicTheme.colors.text.secondary}
													/>
													<Text style={styles.detailText} numberOfLines={1}>
														{booking.purpose}
													</Text>
												</View>
												{booking.user_name && (
													<View style={styles.detailRow}>
														<Ionicons
															name="person"
															size={16}
															color={dynamicTheme.colors.text.secondary}
														/>
														<Text style={styles.detailText} numberOfLines={1}>
															👤 {booking.user_name}
														</Text>
													</View>
												)}
											</View>
										</View>
									))}
							</View>
						)}
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const createStyles = (theme: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: theme.colors.background,
		},
		loadingText: {
			marginTop: theme.spacing.md,
			fontSize: 16,
			color: theme.colors.text.secondary,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.md,
			backgroundColor: theme.colors.surface,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.text.secondary + "20",
		},
		backButton: {
			padding: theme.spacing.sm,
		},
		headerTitle: {
			fontSize: 20,
			fontWeight: "600",
			color: theme.colors.text.primary,
		},
		refreshButton: {
			padding: theme.spacing.sm,
		},
		statsContainer: {
			flexDirection: "row",
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.md,
			gap: theme.spacing.sm,
		},
		statCard: {
			flex: 1,
			borderRadius: theme.borderRadius.md,
			overflow: "hidden",
		},
		statCardGradient: {
			padding: theme.spacing.md,
			alignItems: "center",
		},
		statNumber: {
			fontSize: 24,
			fontWeight: "bold",
			color: theme.colors.text.primary,
			marginTop: theme.spacing.xs,
		},
		statLabel: {
			fontSize: 12,
			color: theme.colors.text.secondary,
			textAlign: "center",
			marginTop: theme.spacing.xs,
		},
		scrollView: {
			flex: 1,
		},
		scrollContent: {
			paddingBottom: theme.spacing.xl,
		},
		calendarContainer: {
			margin: theme.spacing.md,
			borderRadius: theme.borderRadius.md,
			backgroundColor: theme.colors.surface,
			overflow: "hidden",
			elevation: 3,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.15,
			shadowRadius: 8,
			borderWidth: 1,
			borderColor: theme.colors.text.secondary + "10",
		},
		calendar: {
			borderRadius: theme.borderRadius.md,
			paddingBottom: theme.spacing.sm,
		},
		legendContainer: {
			marginHorizontal: theme.spacing.md,
			marginBottom: theme.spacing.md,
			padding: theme.spacing.md,
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			elevation: 1,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 2,
		},
		legendTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.colors.text.primary,
			marginBottom: theme.spacing.sm,
		},
		legendItems: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-around",
			gap: theme.spacing.sm,
		},
		legendItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: theme.spacing.xs,
		},
		legendDot: {
			width: 12,
			height: 12,
			borderRadius: 6,
			marginRight: theme.spacing.xs,
		},
		legendText: {
			fontSize: 11,
			color: theme.colors.text.secondary,
			textAlign: "center",
		},
		selectedDayContainer: {
			marginHorizontal: theme.spacing.md,
		},
		selectedDayTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.colors.text.primary,
			marginBottom: theme.spacing.md,
		},
		noBookingsContainer: {
			alignItems: "center",
			padding: theme.spacing.xl,
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
		},
		noBookingsText: {
			fontSize: 16,
			color: theme.colors.text.secondary,
			marginTop: theme.spacing.md,
			marginBottom: theme.spacing.lg,
		},
		createBookingButton: {
			backgroundColor: theme.colors.primary,
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.md,
			borderRadius: theme.borderRadius.sm,
		},
		createBookingButtonText: {
			color: "#FFFFFF",
			fontSize: 16,
			fontWeight: "600",
		},
		bookingsList: {
			gap: theme.spacing.md,
		},
		bookingCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			padding: theme.spacing.md,
			elevation: 2,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
		},
		bookingHeader: {
			marginBottom: theme.spacing.sm,
		},
		bookingTitleRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		hallName: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.colors.text.primary,
			flex: 1,
			marginRight: theme.spacing.sm,
		},
		statusBadge: {
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.xs,
			borderRadius: theme.borderRadius.sm,
		},
		statusText: {
			color: "#FFFFFF",
			fontSize: 12,
			fontWeight: "600",
		},
		bookingDetails: {
			gap: theme.spacing.xs,
		},
		detailRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: theme.spacing.sm,
		},
		detailText: {
			fontSize: 14,
			color: theme.colors.text.primary,
			flex: 1,
		},
		durationText: {
			fontSize: 12,
			color: theme.colors.text.secondary,
			fontStyle: "italic",
		},
	});

export default BookedCalendarScreen;
