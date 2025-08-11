import React, { useState, useCallback, useEffect, useRef } from "react";
import {
	View,
	Text,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	Platform,
	Animated,
	TextInput,
	Dimensions,
	Switch,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import { getThemeColors } from "../utils/themeUtils";
import { useAuthStore } from "../stores/authStore";
import {
	smartBookingService,
	CreateBookingData,
	AvailabilityCheck,
	SmartBooking,
} from "../services/smartBookingService";
import { hallManagementService } from "../services/hallManagementService";

interface BookingFormScreenProps {
	navigation: any;
	route: {
		params?: {
			editingBooking?: SmartBooking;
		};
	};
}

const { width } = Dimensions.get("window");

// Enhanced modern theme
const theme = {
	colors: {
		primary: "#007AFF",
		secondary: "#5856D6",
		success: "#34C759",
		warning: "#FF9500",
		error: "#FF3B30",
		surface: "#FFFFFF",
		background: "#F2F2F7",
		card: "#FFFFFF",
		border: "#E5E5EA",
		placeholder: "#8E8E93",
		text: {
			primary: "#000000",
			secondary: "#6D6D70",
			tertiary: "#AEAEB2",
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
		xl: 20,
	},
	fontSize: {
		xs: 12,
		sm: 14,
		md: 16,
		lg: 18,
		xl: 20,
		xxl: 24,
	},
	shadows: {
		small: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
			elevation: 2,
		},
		medium: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.15,
			shadowRadius: 8,
			elevation: 4,
		},
		large: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.2,
			shadowRadius: 16,
			elevation: 8,
		},
	},
};

const BookingFormScreen: React.FC<BookingFormScreenProps> = ({
	navigation,
	route,
}) => {
	const { user } = useAuthStore();
	const { isDark } = useTheme();
	const themeColors = getThemeColors(isDark);
	const insets = useSafeAreaInsets();
	const editingBooking = route.params?.editingBooking;

	// Enhanced dynamic theme with better dark mode support
	const dynamicTheme = {
		colors: {
			primary: theme.colors.primary,
			secondary: theme.colors.secondary,
			success: theme.colors.success,
			warning: theme.colors.warning,
			error: theme.colors.error,
			surface: isDark ? "#1C1C1E" : theme.colors.surface,
			background: isDark ? "#000000" : theme.colors.background,
			card: isDark ? "#2C2C2E" : theme.colors.card,
			border: isDark ? "#38383A" : theme.colors.border,
			placeholder: isDark ? "#8E8E93" : theme.colors.placeholder,
			text: {
				primary: isDark ? "#FFFFFF" : theme.colors.text.primary,
				secondary: isDark ? "#AEAEB2" : theme.colors.text.secondary,
				tertiary: isDark ? "#6D6D70" : theme.colors.text.tertiary,
			},
		},
		spacing: theme.spacing,
		borderRadius: theme.borderRadius,
		fontSize: theme.fontSize,
		shadows: theme.shadows,
	};

	const [halls, setHalls] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [updating, setUpdating] = useState(false);

	// Form state
	const [formData, setFormData] = useState<CreateBookingData>({
		hall_id: "",
		booking_date: "",
		start_time: "09:00",
		end_time: "11:00",
		purpose: "",
		description: "",
		attendees_count: 1,
		equipment_needed: [],
		special_requirements: "",
		priority: "medium",
	});

	// Multi-date booking state
	const [isMultiDateBooking, setIsMultiDateBooking] = useState(false);
	const [selectedDates, setSelectedDates] = useState<string[]>([]);
	const [isWholeDayBooking, setIsWholeDayBooking] = useState(false);
	const [bookingMode, setBookingMode] = useState<
		"single" | "multiple" | "recurring"
	>("single");
	const [recurringDays, setRecurringDays] = useState(3);
	const [recurringStartDate, setRecurringStartDate] = useState<Date | null>(
		null
	);

	// Date picker state
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showStartTimePicker, setShowStartTimePicker] = useState(false);
	const [showEndTimePicker, setShowEndTimePicker] = useState(false);
	const [tempDate, setTempDate] = useState(new Date());

	// Availability check state
	const [availabilityCheck, setAvailabilityCheck] =
		useState<AvailabilityCheck | null>(null);
	const [checkingAvailability, setCheckingAvailability] = useState(false);

	// Booked slots state
	const [bookedSlots, setBookedSlots] = useState<SmartBooking[]>([]);
	const [loadingBookedSlots, setLoadingBookedSlots] = useState(false);

	// Animation refs
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(50)).current;
	const progressAnim = useRef(new Animated.Value(0)).current;

	// Form validation
	const [formProgress, setFormProgress] = useState(0);

	const styles = createStyles(dynamicTheme, insets);

	// Helper functions
	const isHallAvailable = (hall: any) => {
		// Strict check - hall must be active AND not in maintenance
		return hall.is_active === true && hall.is_maintenance === false;
	};

	const getSelectedHallCapacity = () => {
		if (!formData.hall_id || halls.length === 0) return null;
		const selectedHall = halls.find((hall) => hall.id === formData.hall_id);
		return selectedHall ? selectedHall.capacity : null;
	};

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

	const formatDateForInput = (dateString: string): Date => {
		const day = parseInt(dateString.substring(0, 2));
		const month = parseInt(dateString.substring(2, 4)) - 1;
		const year = parseInt(dateString.substring(4, 8));
		return new Date(year, month, day);
	};

	const formatDateToString = (date: Date): string => {
		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear().toString();
		return `${day}${month}${year}`;
	};

	const formatTimeToString = (date: Date): string => {
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		return `${hours}:${minutes}`;
	};

	// Multi-date booking helpers
	const addSelectedDate = (dateString: string) => {
		if (!selectedDates.includes(dateString)) {
			setSelectedDates((prev) => [...prev, dateString].sort());
		}
	};

	const removeSelectedDate = (dateString: string) => {
		setSelectedDates((prev) => prev.filter((date) => date !== dateString));
	};

	const generateRecurringDates = (startDate: Date, days: number): string[] => {
		const dates: string[] = [];
		for (let i = 0; i < days; i++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + i);
			dates.push(formatDateToString(date));
		}
		return dates;
	};

	const getWholeDay = () => {
		return { start_time: "09:00", end_time: "18:00" };
	};

	const isPastTime = (dateString: string, timeString: string): boolean => {
		const now = new Date();
		const [hours, minutes] = timeString.split(":").map(Number);
		const bookingDateTime = new Date(
			parseInt(dateString.substring(4, 8)),
			parseInt(dateString.substring(2, 4)) - 1,
			parseInt(dateString.substring(0, 2)),
			hours,
			minutes
		);
		return bookingDateTime <= now;
	};

	// Calculate form progress
	const calculateProgress = useCallback(() => {
		let progress = 0;
		const fields = [
			formData.hall_id,
			isMultiDateBooking
				? selectedDates.length > 0
					? "dates"
					: ""
				: formData.booking_date,
			formData.start_time,
			formData.end_time,
			formData.purpose,
		];

		fields.forEach((field) => {
			if (field) progress += 20;
		});

		if (formData.attendees_count > 0) progress += 10;
		if (formData.description) progress += 10;

		setFormProgress(progress);

		Animated.timing(progressAnim, {
			toValue: progress,
			duration: 300,
			useNativeDriver: false,
		}).start();
	}, [formData, isMultiDateBooking, selectedDates, progressAnim]);

	useEffect(() => {
		calculateProgress();
	}, [calculateProgress]);

	// Animation effect
	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 600,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	// Fetch data
	useEffect(() => {
		const fetchHalls = async () => {
			try {
				setLoading(true);
				const hallsData = await hallManagementService.getAllHalls();
				console.log("Fetched halls:", hallsData.length, hallsData);
				setHalls(hallsData);

				// If editing, populate form
				if (editingBooking) {
					setFormData({
						hall_id: editingBooking.hall_id,
						booking_date: editingBooking.booking_date,
						start_time: editingBooking.start_time,
						end_time: editingBooking.end_time,
						purpose: editingBooking.purpose,
						description: editingBooking.description || "",
						attendees_count: editingBooking.attendees_count,
						equipment_needed: editingBooking.equipment_needed || [],
						special_requirements: editingBooking.special_requirements || "",
						priority: editingBooking.priority,
					});
				}
			} catch (error) {
				console.error("Error fetching halls:", error);
				Alert.alert("Error", "Failed to load halls. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		fetchHalls();
	}, [editingBooking]);

	const checkAvailability = async () => {
		// Enhanced availability check for all booking types
		if (!formData.hall_id) {
			Alert.alert("Error", "Please select a hall first");
			return;
		}

		// Determine what to check based on booking mode
		let datesToCheck: string[] = [];
		let timeToCheck = {
			start_time: formData.start_time,
			end_time: formData.end_time,
		};

		// Handle different booking modes
		if (bookingMode === "multiple" || isMultiDateBooking) {
			if (selectedDates.length === 0) {
				Alert.alert(
					"Error",
					"Please select at least one date for multi-date booking"
				);
				return;
			}
			datesToCheck = selectedDates;
		} else if (bookingMode === "recurring") {
			if (!recurringStartDate) {
				Alert.alert("Error", "Please select start date for recurring booking");
				return;
			}
			datesToCheck = generateRecurringDates(recurringStartDate, recurringDays);
		} else {
			// Single date booking
			if (!formData.booking_date) {
				Alert.alert("Error", "Please select a booking date");
				return;
			}
			datesToCheck = [formData.booking_date];
		}

		// Handle whole day booking
		if (isWholeDayBooking) {
			timeToCheck = getWholeDay();
		}

		if (!timeToCheck.start_time || !timeToCheck.end_time) {
			Alert.alert("Error", "Please select start and end times");
			return;
		}

		try {
			setCheckingAvailability(true);

			// Determine booking type for better service handling
			const bookingType = isWholeDayBooking
				? "whole_day"
				: bookingMode === "multiple"
				? "multi_date"
				: bookingMode === "recurring"
				? "recurring"
				: "single";

			// Use enhanced multi-date availability check
			if (datesToCheck.length > 1) {
				const result = await smartBookingService.checkMultiDateAvailability(
					formData.hall_id,
					datesToCheck,
					timeToCheck.start_time,
					timeToCheck.end_time,
					bookingType,
					editingBooking?.id
				);
				setAvailabilityCheck(result);
			} else {
				// Single date - use regular availability check
				const result = await smartBookingService.checkAvailability(
					formData.hall_id,
					datesToCheck[0],
					timeToCheck.start_time,
					timeToCheck.end_time,
					editingBooking?.id
				);

				// Enhance single result with additional info
				const enhancedResult = {
					...result,
					multi_date_results: [{ date: datesToCheck[0], ...result }],
					dates_checked: datesToCheck,
					booking_type: bookingType,
				};
				setAvailabilityCheck(enhancedResult);
			}

			// Show detailed results
			if (datesToCheck.length > 1) {
				const result = availabilityCheck as any;
				const availableDates =
					result.multi_date_results?.filter((r: any) => r.is_available)
						.length || 0;
				const conflictDates =
					result.multi_date_results?.filter((r: any) => !r.is_available)
						.length || 0;

				Alert.alert(
					"Availability Check Results",
					`📅 Dates checked: ${
						datesToCheck.length
					}\n✅ Available: ${availableDates}\n❌ Conflicts: ${conflictDates}\n\n${
						isWholeDayBooking ? "🌅 Whole day booking (9 AM - 6 PM)\n" : ""
					}${
						result.is_available
							? "🎉 All selected dates are available!"
							: "⚠️ Some dates have conflicts. Check details below."
					}`,
					[{ text: "OK" }]
				);
			}
		} catch (error) {
			console.error("Error checking availability:", error);
			Alert.alert("Error", "Failed to check availability. Please try again.");
		} finally {
			setCheckingAvailability(false);
		}
	};

	const fetchBookedSlots = async (hallId: string, bookingDate: string) => {
		if (!hallId || !bookingDate) {
			setBookedSlots([]);
			return;
		}

		try {
			setLoadingBookedSlots(true);
			const result = await smartBookingService.getBookingsForHallAndDate(
				hallId,
				bookingDate
			);

			const futureBookings = result.filter((booking: SmartBooking) => {
				const now = new Date();
				const [hours, minutes] = booking.start_time.split(":").map(Number);
				const bookingDateTime = new Date(
					parseInt(bookingDate.substring(4, 8)),
					parseInt(bookingDate.substring(2, 4)) - 1,
					parseInt(bookingDate.substring(0, 2)),
					hours,
					minutes
				);

				return (
					bookingDateTime >= now &&
					(booking.status === "approved" || booking.status === "pending")
				);
			});

			setBookedSlots(futureBookings);
		} catch (error) {
			console.error("Error fetching booked slots:", error);
			setBookedSlots([]);
		} finally {
			setLoadingBookedSlots(false);
		}
	};

	const handleSubmit = async () => {
		if (!user) return;

		// Validate required fields
		const datesToBook = isMultiDateBooking
			? selectedDates
			: [formData.booking_date];
		if (!formData.hall_id || datesToBook.length === 0 || !formData.purpose) {
			Alert.alert("Error", "Please fill in all required fields");
			return;
		}

		// Check for past time
		const currentTimes = isWholeDayBooking
			? getWholeDay()
			: { start_time: formData.start_time, end_time: formData.end_time };

		for (const date of datesToBook) {
			if (isPastTime(date, currentTimes.start_time)) {
				Alert.alert(
					"Error",
					`Cannot book past dates or times for ${formatDate(date)}`
				);
				return;
			}
		}

		try {
			if (editingBooking) {
				setUpdating(true);
				await smartBookingService.updateBooking(
					editingBooking.id,
					{
						...formData,
						...currentTimes,
					},
					user.id
				);
				Alert.alert("Success", "Booking updated successfully!");
			} else {
				setCreating(true);

				// Create multiple bookings
				const bookingPromises = datesToBook.map((date) =>
					smartBookingService.createBooking(
						{
							...formData,
							booking_date: date,
							...currentTimes,
						},
						user.id
					)
				);

				await Promise.all(bookingPromises);

				const successMessage =
					datesToBook.length > 1
						? `${datesToBook.length} bookings created successfully!`
						: "Booking created successfully!";
				Alert.alert("Success", successMessage);
			}

			navigation.goBack();
		} catch (error: any) {
			console.error("Error submitting booking:", error);
			Alert.alert("Error", error.message || "Failed to submit booking");
		} finally {
			setCreating(false);
			setUpdating(false);
		}
	};

	if (loading) {
		return (
			<View style={styles.container}>
				<StatusBar style="auto" />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={styles.loadingText}>Loading form...</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
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
				<Text style={styles.headerTitle}>
					{editingBooking ? "Edit Booking" : "New Booking"}
				</Text>
				<TouchableOpacity
					onPress={handleSubmit}
					disabled={
						creating ||
						updating ||
						!formData.hall_id ||
						(isMultiDateBooking
							? selectedDates.length === 0
							: !formData.booking_date) ||
						!formData.purpose ||
						(getSelectedHallCapacity() &&
							formData.attendees_count > getSelectedHallCapacity())
					}
					style={[
						styles.submitButton,
						(creating ||
							updating ||
							!formData.hall_id ||
							(isMultiDateBooking
								? selectedDates.length === 0
								: !formData.booking_date) ||
							!formData.purpose ||
							(getSelectedHallCapacity() &&
								formData.attendees_count > getSelectedHallCapacity())) &&
							styles.submitButtonDisabled,
					]}
				>
					<Text
						style={[
							styles.submitButtonText,
							(creating ||
								updating ||
								!formData.hall_id ||
								(isMultiDateBooking
									? selectedDates.length === 0
									: !formData.booking_date) ||
								!formData.purpose ||
								(getSelectedHallCapacity() &&
									formData.attendees_count > getSelectedHallCapacity())) &&
								styles.submitButtonTextDisabled,
						]}
					>
						{creating || updating ? "Saving..." : "Save"}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Progress Bar */}
			<View style={styles.progressContainer}>
				<View style={styles.progressBar}>
					<View
						style={[
							styles.progressFill,
							{
								width: `${formProgress}%`,
							},
						]}
					/>
				</View>
				<Text style={styles.progressText}>{formProgress}% Complete</Text>
			</View>
			<View style={styles.scrollViewWrapper}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Hall Selection */}
					<View style={styles.formSection}>
						<View style={styles.sectionHeader}>
							<LinearGradient
								colors={[
									theme.colors.primary + "15",
									theme.colors.primary + "05",
								]}
								style={styles.sectionIconContainer}
							>
								<Ionicons
									name="business"
									size={20}
									color={theme.colors.primary}
								/>
							</LinearGradient>
							<Text style={styles.sectionTitle}>Select Hall *</Text>
							{formData.hall_id ? (
								<View style={styles.completedIndicator}>
									<Ionicons
										name="checkmark-circle"
										size={16}
										color={theme.colors.success}
									/>
								</View>
							) : (
								<View style={styles.completedIndicator}>
									<Ionicons
										name="close-circle"
										size={16}
										color={theme.colors.error}
									/>
								</View>
							)}
						</View>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.hallSelector}
							contentContainerStyle={styles.hallSelectorContent}
						>
							{loading ? (
								<View style={styles.hallLoadingContainer}>
									<ActivityIndicator
										size="small"
										color={theme.colors.primary}
									/>
									<Text style={styles.hallLoadingText}>Loading halls...</Text>
								</View>
							) : halls.length === 0 ? (
								<View style={styles.noHallsContainer}>
									<Ionicons
										name="business-outline"
										size={32}
										color={theme.colors.text.secondary}
									/>
									<Text style={styles.noHallsText}>No halls available</Text>
									<TouchableOpacity
										style={styles.refreshHallsButton}
										onPress={() => {
											setLoading(true);
											const fetchHalls = async () => {
												try {
													const hallsData =
														await hallManagementService.getAllHalls();
													setHalls(hallsData);
												} catch (error) {
													console.error("Error fetching halls:", error);
													Alert.alert("Error", "Failed to load halls");
												} finally {
													setLoading(false);
												}
											};
											fetchHalls();
										}}
									>
										<Text style={styles.refreshHallsText}>Refresh</Text>
									</TouchableOpacity>
								</View>
							) : halls.filter((hall) => isHallAvailable(hall)).length === 0 ? (
								<View style={styles.noHallsContainer}>
									<Ionicons
										name="construct-outline"
										size={32}
										color={theme.colors.warning}
									/>
									<Text style={styles.noHallsText}>
										All halls are currently unavailable
									</Text>
									<Text style={styles.noHallsSubtext}>
										Halls may be inactive or under maintenance
									</Text>
								</View>
							) : (
								halls
									.filter((hall) => isHallAvailable(hall))
									.map((hall) => (
										<TouchableOpacity
											key={hall.id}
											style={[
												styles.hallCard,
												formData.hall_id === hall.id && styles.hallCardSelected,
											]}
											onPress={() => {
												setFormData((prev) => ({ ...prev, hall_id: hall.id }));
												Haptics.selectionAsync();

												if (formData.booking_date) {
													fetchBookedSlots(hall.id, formData.booking_date);
												}

												if (
													formData.booking_date &&
													formData.start_time &&
													formData.end_time
												) {
													checkAvailability();
												}
											}}
										>
											<LinearGradient
												colors={
													formData.hall_id === hall.id
														? [
																theme.colors.primary,
																theme.colors.primary + "CC",
														  ]
														: [
																dynamicTheme.colors.surface,
																dynamicTheme.colors.surface,
														  ]
												}
												style={styles.hallCardGradient}
											>
												<View style={styles.hallCardContent}>
													<Text
														style={[
															styles.hallCardName,
															formData.hall_id === hall.id &&
																styles.hallCardNameSelected,
														]}
														numberOfLines={1}
													>
														{hall.name}
													</Text>
													<View style={styles.hallCardCapacity}>
														<Ionicons
															name="people"
															size={14}
															color={
																formData.hall_id === hall.id
																	? "#FFFFFF"
																	: dynamicTheme.colors.text.secondary
															}
														/>
														<Text
															style={[
																styles.hallCardCapacityText,
																formData.hall_id === hall.id &&
																	styles.hallCardCapacityTextSelected,
															]}
														>
															{hall.capacity}
														</Text>
													</View>
													{formData.hall_id === hall.id && (
														<View style={styles.selectedIndicator}>
															<Ionicons
																name="checkmark-circle"
																size={16}
																color="#FFFFFF"
															/>
														</View>
													)}
												</View>
											</LinearGradient>
										</TouchableOpacity>
									))
							)}
						</ScrollView>
					</View>

					{/* Booking Mode Selection */}
					<View style={styles.formSection}>
						<View style={styles.sectionHeader}>
							<LinearGradient
								colors={[
									theme.colors.warning + "15",
									theme.colors.warning + "05",
								]}
								style={styles.sectionIconContainer}
							>
								<Ionicons
									name="options"
									size={20}
									color={theme.colors.warning}
								/>
							</LinearGradient>
							<Text style={styles.sectionTitle}>Booking Mode</Text>
						</View>
						<View style={styles.bookingModeContainer}>
							<TouchableOpacity
								style={[
									styles.bookingModeButton,
									bookingMode === "single" && styles.bookingModeButtonActive,
								]}
								onPress={() => {
									setBookingMode("single");
									setIsMultiDateBooking(false);
									setSelectedDates([]);
									Haptics.selectionAsync();
								}}
							>
								<Ionicons
									name="calendar-outline"
									size={20}
									color={
										bookingMode === "single"
											? "#FFFFFF"
											: theme.colors.text.secondary
									}
								/>
								<Text
									style={[
										styles.bookingModeText,
										bookingMode === "single" && styles.bookingModeTextActive,
									]}
								>
									Single Date
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.bookingModeButton,
									bookingMode === "multiple" && styles.bookingModeButtonActive,
								]}
								onPress={() => {
									setBookingMode("multiple");
									setIsMultiDateBooking(true);
									setFormData((prev) => ({ ...prev, booking_date: "" }));
									Haptics.selectionAsync();
								}}
							>
								<Ionicons
									name="calendar"
									size={20}
									color={
										bookingMode === "multiple"
											? "#FFFFFF"
											: theme.colors.text.secondary
									}
								/>
								<Text
									style={[
										styles.bookingModeText,
										bookingMode === "multiple" && styles.bookingModeTextActive,
									]}
								>
									Multiple Dates
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.bookingModeButton,
									bookingMode === "recurring" && styles.bookingModeButtonActive,
								]}
								onPress={() => {
									setBookingMode("recurring");
									setIsMultiDateBooking(true);
									setFormData((prev) => ({ ...prev, booking_date: "" }));
									Haptics.selectionAsync();
								}}
							>
								<Ionicons
									name="repeat"
									size={20}
									color={
										bookingMode === "recurring"
											? "#FFFFFF"
											: theme.colors.text.secondary
									}
								/>
								<Text
									style={[
										styles.bookingModeText,
										bookingMode === "recurring" && styles.bookingModeTextActive,
									]}
								>
									Recurring
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Date & Time Selection */}
					<View style={styles.formSection}>
						<View style={styles.sectionHeader}>
							<LinearGradient
								colors={[
									theme.colors.secondary + "15",
									theme.colors.secondary + "05",
								]}
								style={styles.sectionIconContainer}
							>
								<Ionicons
									name="calendar"
									size={20}
									color={theme.colors.secondary}
								/>
							</LinearGradient>
							<Text style={styles.sectionTitle}>Date & Time *</Text>
							{((isMultiDateBooking && selectedDates.length > 0) ||
								(!isMultiDateBooking && formData.booking_date)) &&
							formData.start_time &&
							formData.end_time ? (
								<View style={styles.completedIndicator}>
									<Ionicons
										name="checkmark-circle"
										size={16}
										color={theme.colors.success}
									/>
								</View>
							) : (
								<View style={styles.completedIndicator}>
									<Ionicons
										name="close-circle"
										size={16}
										color={theme.colors.error}
									/>
								</View>
							)}
						</View>

						{/* Whole Day Toggle */}
						<TouchableOpacity
							style={styles.wholeDayToggle}
							onPress={() => {
								setIsWholeDayBooking(!isWholeDayBooking);
								if (!isWholeDayBooking) {
									const wholeDay = getWholeDay();
									setFormData((prev) => ({
										...prev,
										start_time: wholeDay.start_time,
										end_time: wholeDay.end_time,
									}));
								}
								Haptics.selectionAsync();
							}}
						>
							<View>
								<Text style={styles.wholeDayToggleText}>
									Book for Whole Day
								</Text>
								<Text style={styles.wholeDayToggleSubtext}>
									{isWholeDayBooking
										? "9:00 AM - 6:00 PM"
										: "Select custom times"}
								</Text>
							</View>
							<Switch
								value={isWholeDayBooking}
								onValueChange={(value) => {
									setIsWholeDayBooking(value);
									if (value) {
										const wholeDay = getWholeDay();
										setFormData((prev) => ({
											...prev,
											start_time: wholeDay.start_time,
											end_time: wholeDay.end_time,
										}));
									}
									Haptics.selectionAsync();
								}}
								trackColor={{
									false: theme.colors.border,
									true: theme.colors.primary + "40",
								}}
								thumbColor={
									isWholeDayBooking
										? theme.colors.primary
										: theme.colors.text.tertiary
								}
							/>
						</TouchableOpacity>

						{/* Single Date Selection */}
						{bookingMode === "single" && (
							<TouchableOpacity
								style={styles.enhancedInput}
								onPress={() => {
									setTempDate(
										formData.booking_date
											? formatDateForInput(formData.booking_date)
											: new Date()
									);
									setShowDatePicker(true);
									Haptics.selectionAsync();
								}}
							>
								<View style={styles.inputWithIcon}>
									<View style={styles.inputIconContainer}>
										<Ionicons
											name="calendar-outline"
											size={20}
											color={theme.colors.primary}
										/>
									</View>
									<View style={styles.inputTextContainer}>
										<Text style={styles.inputLabel}>Date</Text>
										<Text
											style={[
												styles.enhancedInputText,
												!formData.booking_date && styles.placeholderText,
											]}
										>
											{formData.booking_date
												? formatDate(formData.booking_date)
												: "Select date"}
										</Text>
									</View>
									<Ionicons
										name="chevron-forward"
										size={16}
										color={dynamicTheme.colors.text.secondary}
									/>
								</View>
							</TouchableOpacity>
						)}

						{/* Multiple Date Selection */}
						{bookingMode === "multiple" && (
							<View style={styles.multiDateSelector}>
								<TouchableOpacity
									style={styles.enhancedInput}
									onPress={() => {
										setTempDate(new Date());
										setShowDatePicker(true);
										Haptics.selectionAsync();
									}}
								>
									<View style={styles.inputWithIcon}>
										<View style={styles.inputIconContainer}>
											<Ionicons
												name="add-circle-outline"
												size={20}
												color={theme.colors.primary}
											/>
										</View>
										<View style={styles.inputTextContainer}>
											<Text style={styles.inputLabel}>Add Date</Text>
											<Text
												style={[
													styles.enhancedInputText,
													styles.placeholderText,
												]}
											>
												Select dates to book
											</Text>
										</View>
										<Ionicons
											name="chevron-forward"
											size={16}
											color={dynamicTheme.colors.text.secondary}
										/>
									</View>
								</TouchableOpacity>

								{/* Selected Dates */}
								{selectedDates.length > 0 && (
									<View style={styles.selectedDatesContainer}>
										{selectedDates.map((date, index) => (
											<View key={index} style={styles.selectedDateChip}>
												<Text style={styles.selectedDateText}>
													{formatDate(date)}
												</Text>
												<TouchableOpacity
													onPress={() => {
														removeSelectedDate(date);
														Haptics.selectionAsync();
													}}
												>
													<Ionicons
														name="close-circle"
														size={16}
														color={theme.colors.primary}
													/>
												</TouchableOpacity>
											</View>
										))}
									</View>
								)}
							</View>
						)}

						{/* Recurring Date Selection */}
						{bookingMode === "recurring" && (
							<View style={styles.recurringControls}>
								<TouchableOpacity
									style={styles.enhancedInput}
									onPress={() => {
										setTempDate(recurringStartDate || new Date());
										setShowDatePicker(true);
										Haptics.selectionAsync();
									}}
								>
									<View style={styles.inputWithIcon}>
										<View style={styles.inputIconContainer}>
											<Ionicons
												name="calendar-outline"
												size={20}
												color={theme.colors.primary}
											/>
										</View>
										<View style={styles.inputTextContainer}>
											<Text style={styles.inputLabel}>Start Date</Text>
											<Text
												style={[
													styles.enhancedInputText,
													!recurringStartDate && styles.placeholderText,
												]}
											>
												{recurringStartDate
													? formatDate(formatDateToString(recurringStartDate))
													: "Select start date"}
											</Text>
										</View>
										<Ionicons
											name="chevron-forward"
											size={16}
											color={dynamicTheme.colors.text.secondary}
										/>
									</View>
								</TouchableOpacity>
								<View style={styles.recurringRow}>
									<Text style={styles.inputLabel}>Number of days:</Text>
									<TextInput
										style={styles.recurringInput}
										value={recurringDays.toString()}
										onChangeText={(text) => {
											const days = parseInt(text) || 1;
											setRecurringDays(Math.max(1, Math.min(30, days)));

											// Update selected dates
											if (recurringStartDate) {
												const dates = generateRecurringDates(
													recurringStartDate,
													days
												);
												setSelectedDates(dates);
											}
										}}
										keyboardType="number-pad"
										placeholder="3"
									/>
								</View>

								{/* Generated Dates Preview */}
								{recurringStartDate && (
									<View style={styles.selectedDatesContainer}>
										{generateRecurringDates(
											recurringStartDate,
											recurringDays
										).map((date, index) => (
											<View key={index} style={styles.selectedDateChip}>
												<Text style={styles.selectedDateText}>
													{formatDate(date)}
												</Text>
											</View>
										))}
									</View>
								)}
							</View>
						)}

						{/* Time Selection */}
						<View style={styles.timeRow}>
							<View style={styles.timeInputContainer}>
								<TouchableOpacity
									style={[
										styles.enhancedTimeInput,
										isWholeDayBooking && styles.disabledInput,
									]}
									onPress={() => {
										if (!isWholeDayBooking) {
											const [hours, minutes] = formData.start_time
												.split(":")
												.map(Number);
											const date = new Date();
											date.setHours(hours, minutes);
											setTempDate(date);
											setShowStartTimePicker(true);
											Haptics.selectionAsync();
										}
									}}
									disabled={isWholeDayBooking}
								>
									<View style={styles.inputWithIcon}>
										<View style={styles.timeIconContainer}>
											<Ionicons
												name="time-outline"
												size={16}
												color={
													isWholeDayBooking
														? theme.colors.text.tertiary
														: theme.colors.primary
												}
											/>
										</View>
										<View style={styles.timeTextContainer}>
											<Text
												style={[
													styles.timeLabel,
													isWholeDayBooking && styles.disabledText,
												]}
											>
												Start Time
											</Text>
											<Text
												style={[
													styles.timeText,
													isWholeDayBooking && styles.disabledText,
												]}
											>
												{formData.start_time}
											</Text>
										</View>
									</View>
								</TouchableOpacity>
							</View>
							<View style={styles.timeSeparator}>
								<View style={styles.timeSeparatorLine} />
								<Ionicons
									name="arrow-forward"
									size={16}
									color={
										isWholeDayBooking
											? theme.colors.text.tertiary
											: theme.colors.primary
									}
								/>
								<View style={styles.timeSeparatorLine} />
							</View>
							<View style={styles.timeInputContainer}>
								<TouchableOpacity
									style={[
										styles.enhancedTimeInput,
										isWholeDayBooking && styles.disabledInput,
									]}
									onPress={() => {
										if (!isWholeDayBooking) {
											const [hours, minutes] = formData.end_time
												.split(":")
												.map(Number);
											const date = new Date();
											date.setHours(hours, minutes);
											setTempDate(date);
											setShowEndTimePicker(true);
											Haptics.selectionAsync();
										}
									}}
									disabled={isWholeDayBooking}
								>
									<View style={styles.inputWithIcon}>
										<View style={styles.timeIconContainer}>
											<Ionicons
												name="time-outline"
												size={16}
												color={
													isWholeDayBooking
														? theme.colors.text.tertiary
														: theme.colors.primary
												}
											/>
										</View>
										<View style={styles.timeTextContainer}>
											<Text
												style={[
													styles.timeLabel,
													isWholeDayBooking && styles.disabledText,
												]}
											>
												End Time
											</Text>
											<Text
												style={[
													styles.timeText,
													isWholeDayBooking && styles.disabledText,
												]}
											>
												{formData.end_time}
											</Text>
										</View>
									</View>
								</TouchableOpacity>
							</View>
						</View>

						{/* Past Time Validation */}
						{formData.booking_date &&
							formData.start_time &&
							isPastTime(formData.booking_date, formData.start_time) && (
								<View style={styles.validationError}>
									<Ionicons
										name="warning"
										size={16}
										color={theme.colors.error}
									/>
									<Text style={styles.validationErrorText}>
										Cannot book past dates or times
									</Text>
								</View>
							)}
					</View>

					{/* Availability Check */}
					{formData.hall_id &&
						((bookingMode === "single" && formData.booking_date) ||
							(bookingMode !== "single" && selectedDates.length > 0)) &&
						formData.start_time &&
						formData.end_time && (
							<View style={styles.formSection}>
								{/* Availability Check Info */}
								<View style={styles.availabilityCheckInfo}>
									<Ionicons
										name="information-circle"
										size={16}
										color={theme.colors.primary}
									/>
									<Text style={styles.availabilityCheckInfoText}>
										{isWholeDayBooking &&
											"🌅 Checking whole day availability (9 AM - 6 PM)"}
										{!isWholeDayBooking &&
											bookingMode === "single" &&
											"📅 Checking single date availability"}
										{!isWholeDayBooking &&
											bookingMode === "multiple" &&
											`📅 Checking ${selectedDates.length} selected dates`}
										{!isWholeDayBooking &&
											bookingMode === "recurring" &&
											`🔄 Checking ${recurringDays} recurring dates`}
									</Text>
								</View>
								<TouchableOpacity
									style={[
										styles.checkAvailabilityButton,
										checkingAvailability && styles.buttonDisabled,
									]}
									onPress={checkAvailability}
									disabled={checkingAvailability}
								>
									<LinearGradient
										colors={[
											theme.colors.secondary,
											theme.colors.secondary + "DD",
										]}
										style={styles.buttonGradient}
									>
										{checkingAvailability ? (
											<ActivityIndicator size="small" color="#FFFFFF" />
										) : (
											<Ionicons name="search" size={20} color="#FFFFFF" />
										)}
										<Text style={styles.buttonText}>
											{checkingAvailability
												? "Checking..."
												: "Check Availability"}
										</Text>
									</LinearGradient>
								</TouchableOpacity>

								{availabilityCheck && (
									<View
										style={[
											styles.availabilityResult,
											{
												borderColor: availabilityCheck.is_available
													? theme.colors.success
													: theme.colors.error,
												backgroundColor: availabilityCheck.is_available
													? theme.colors.success + "10"
													: theme.colors.error + "10",
											},
										]}
									>
										{/* Enhanced Availability Header */}
										<View style={styles.availabilityHeader}>
											<Ionicons
												name={
													availabilityCheck.is_available
														? "checkmark-circle"
														: "close-circle"
												}
												size={20}
												color={
													availabilityCheck.is_available
														? theme.colors.success
														: theme.colors.error
												}
											/>
											<View style={styles.availabilityHeaderText}>
												<Text
													style={[
														styles.availabilityText,
														{
															color: availabilityCheck.is_available
																? theme.colors.success
																: theme.colors.error,
														},
													]}
												>
													{availabilityCheck.is_available
														? "✅ Available!"
														: "❌ Not Available"}
												</Text>
												{/* Show booking type and date info */}
												{(availabilityCheck as any).booking_type && (
													<Text style={styles.availabilitySubText}>
														{(availabilityCheck as any).booking_type ===
															"whole_day" &&
															"🌅 Whole Day Booking (9 AM - 6 PM)"}
														{(availabilityCheck as any).booking_type ===
															"multi_date" &&
															`📅 ${
																(availabilityCheck as any).dates_checked?.length
															} dates checked`}
														{(availabilityCheck as any).booking_type ===
															"recurring" &&
															`🔄 ${
																(availabilityCheck as any).dates_checked?.length
															} recurring dates`}
														{(availabilityCheck as any).booking_type ===
															"single" && "📅 Single date booking"}
													</Text>
												)}
											</View>
										</View>

										{/* Multi-date Results Summary */}
										{(availabilityCheck as any).multi_date_results &&
											(availabilityCheck as any).multi_date_results.length >
												1 && (
												<View style={styles.multiDateSummary}>
													<Text style={styles.multiDateTitle}>
														📊 Date-by-Date Results:
													</Text>
													{(availabilityCheck as any).multi_date_results.map(
														(result: any, index: number) => (
															<View key={index} style={styles.dateResultRow}>
																<Text style={styles.dateResultDate}>
																	{formatDate(result.date)}
																</Text>
																<View style={styles.dateResultStatus}>
																	<Ionicons
																		name={
																			result.is_available
																				? "checkmark-circle"
																				: "close-circle"
																		}
																		size={16}
																		color={
																			result.is_available
																				? theme.colors.success
																				: theme.colors.error
																		}
																	/>
																	<Text
																		style={[
																			styles.dateResultText,
																			{
																				color: result.is_available
																					? theme.colors.success
																					: theme.colors.error,
																			},
																		]}
																	>
																		{result.is_available
																			? "Available"
																			: `${result.conflicting_bookings.length} conflict(s)`}
																	</Text>
																</View>
															</View>
														)
													)}
												</View>
											)}

										{/* Conflict Details */}
										{!availabilityCheck.is_available &&
											availabilityCheck.conflicting_bookings.length > 0 && (
												<View style={styles.conflictInfo}>
													<Text style={styles.conflictTitle}>
														⚠️ Booking Conflicts:
													</Text>
													{availabilityCheck.conflicting_bookings.map(
														(conflict, index) => (
															<Text key={index} style={styles.conflictText}>
																• {formatTime(conflict.start_time)} -{" "}
																{formatTime(conflict.end_time)}
															</Text>
														)
													)}
												</View>
											)}
									</View>
								)}
							</View>
						)}

					{/* Booked Slots Preview */}
					{formData.hall_id && formData.booking_date && (
						<View style={styles.formSection}>
							<View style={styles.sectionHeader}>
								<LinearGradient
									colors={[
										theme.colors.warning + "15",
										theme.colors.warning + "05",
									]}
									style={styles.sectionIconContainer}
								>
									<Ionicons
										name="time"
										size={20}
										color={theme.colors.warning}
									/>
								</LinearGradient>
								<Text style={styles.sectionTitle}>Today's Bookings</Text>
							</View>

							{loadingBookedSlots ? (
								<View style={styles.loadingSlots}>
									<ActivityIndicator
										size="small"
										color={theme.colors.primary}
									/>
									<Text style={styles.loadingSlotsText}>
										Loading bookings...
									</Text>
								</View>
							) : bookedSlots.length > 0 ? (
								<View style={styles.bookedSlotsList}>
									{bookedSlots.map((slot, index) => (
										<View key={index} style={styles.bookedSlotCard}>
											<View style={styles.bookedSlotTime}>
												<Ionicons
													name="time-outline"
													size={14}
													color={theme.colors.warning}
												/>
												<Text style={styles.bookedSlotTimeText}>
													{formatTime(slot.start_time)} -{" "}
													{formatTime(slot.end_time)}
												</Text>
											</View>
											<Text style={styles.bookedSlotPurpose} numberOfLines={1}>
												{slot.purpose}
											</Text>
										</View>
									))}
								</View>
							) : (
								<View style={styles.noBookingsContainer}>
									<Ionicons
										name="checkmark-circle-outline"
										size={32}
										color={theme.colors.success}
									/>
									<Text style={styles.noBookingsText}>
										No bookings for this date
									</Text>
								</View>
							)}
						</View>
					)}

					{/* Purpose & Details */}
					<View style={styles.formSection}>
						<View style={styles.sectionHeader}>
							<LinearGradient
								colors={[
									theme.colors.success + "15",
									theme.colors.success + "05",
								]}
								style={styles.sectionIconContainer}
							>
								<Ionicons
									name="document-text"
									size={20}
									color={theme.colors.success}
								/>
							</LinearGradient>
							<Text style={styles.sectionTitle}>Purpose & Details *</Text>
							{formData.purpose ? (
								<View style={styles.completedIndicator}>
									<Ionicons
										name="checkmark-circle"
										size={16}
										color={theme.colors.success}
									/>
								</View>
							) : (
								<View style={styles.completedIndicator}>
									<Ionicons
										name="close-circle"
										size={16}
										color={theme.colors.error}
									/>
								</View>
							)}
						</View>

						{/* Purpose Input */}
						<View style={styles.inputContainer}>
							<Text style={styles.inputLabel}>Purpose *</Text>
							<TextInput
								style={styles.textInput}
								value={formData.purpose}
								onChangeText={(text) =>
									setFormData((prev) => ({ ...prev, purpose: text }))
								}
								placeholder="e.g., Team Meeting, Workshop, Conference"
								placeholderTextColor={dynamicTheme.colors.text.secondary}
								multiline={false}
							/>
						</View>

						{/* Description Input */}
						<View style={styles.inputContainer}>
							<Text style={styles.inputLabel}>Description (Optional)</Text>
							<TextInput
								style={[styles.textInput, styles.textAreaInput]}
								value={formData.description}
								onChangeText={(text) =>
									setFormData((prev) => ({ ...prev, description: text }))
								}
								placeholder="Additional details about your booking..."
								placeholderTextColor={dynamicTheme.colors.text.secondary}
								multiline={true}
								numberOfLines={3}
							/>
						</View>

						{/* Attendees Count */}
						<View style={styles.inputContainer}>
							<Text style={styles.inputLabel}>Number of Attendees</Text>
							<View style={styles.attendeesContainer}>
								<Text style={styles.attendeesLabel}>Attendees</Text>
								<View style={styles.attendeesControls}>
									<TouchableOpacity
										style={[
											styles.attendeesButton,
											formData.attendees_count <= 1 &&
												styles.attendeesButtonDisabled,
										]}
										onPress={() => {
											setFormData((prev) => ({
												...prev,
												attendees_count: Math.max(1, prev.attendees_count - 1),
											}));
											Haptics.selectionAsync();
										}}
										disabled={formData.attendees_count <= 1}
									>
										<Ionicons name="remove" size={20} color="#FFFFFF" />
									</TouchableOpacity>
									<TextInput
										style={styles.attendeesCount}
										value={formData.attendees_count.toString()}
										onChangeText={(text) => {
											// Remove any non-numeric characters
											const numericText = text.replace(/[^0-9]/g, "");
											const count = parseInt(numericText) || 1;
											// Ensure minimum of 1
											const finalCount = Math.max(1, count);
											setFormData((prev) => ({
												...prev,
												attendees_count: finalCount,
											}));
										}}
										keyboardType="numeric"
										placeholder="1"
										placeholderTextColor={dynamicTheme.colors.text.secondary}
										maxLength={3}
										selectTextOnFocus={true}
									/>
									<TouchableOpacity
										style={styles.attendeesButton}
										onPress={() => {
											setFormData((prev) => ({
												...prev,
												attendees_count: prev.attendees_count + 1,
											}));
											Haptics.selectionAsync();
										}}
									>
										<Ionicons name="add" size={20} color="#FFFFFF" />
									</TouchableOpacity>
								</View>
							</View>

							{/* Attendees Validation Error */}
							{getSelectedHallCapacity() &&
								formData.attendees_count > getSelectedHallCapacity() && (
									<View style={styles.validationError}>
										<Ionicons
											name="warning"
											size={16}
											color={theme.colors.error}
										/>
										<Text style={styles.validationErrorText}>
											Attendees exceed hall capacity (max{" "}
											{getSelectedHallCapacity()})
										</Text>
									</View>
								)}

							{/* Quick increment buttons */}
							<View style={styles.quickIncrementContainer}>
								<Text style={styles.quickIncrementLabel}>Quick add:</Text>
								<View style={styles.quickIncrementButtons}>
									<TouchableOpacity
										style={styles.quickIncrementButton}
										onPress={() => {
											setFormData((prev) => ({
												...prev,
												attendees_count: prev.attendees_count + 5,
											}));
											Haptics.selectionAsync();
										}}
									>
										<Text style={styles.quickIncrementText}>+5</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.quickIncrementButton}
										onPress={() => {
											setFormData((prev) => ({
												...prev,
												attendees_count: prev.attendees_count + 10,
											}));
											Haptics.selectionAsync();
										}}
									>
										<Text style={styles.quickIncrementText}>+10</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.quickIncrementButton}
										onPress={() => {
											setFormData((prev) => ({
												...prev,
												attendees_count: prev.attendees_count + 25,
											}));
											Haptics.selectionAsync();
										}}
									>
										<Text style={styles.quickIncrementText}>+25</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					</View>

					{/* Priority Selection */}
					<View style={styles.formSection}>
						<View style={styles.sectionHeader}>
							<LinearGradient
								colors={[theme.colors.error + "15", theme.colors.error + "05"]}
								style={styles.sectionIconContainer}
							>
								<Ionicons name="flag" size={20} color={theme.colors.error} />
							</LinearGradient>
							<Text style={styles.sectionTitle}>Priority Level</Text>
						</View>
						<View style={styles.priorityContainer}>
							{[
								{
									value: "low",
									label: "Standard",
									description: "Regular booking",
									icon: "arrow-down-circle",
									color: theme.colors.success,
								},
								{
									value: "medium",
									label: "Important",
									description: "Higher priority",
									icon: "alert-circle",
									color: theme.colors.warning,
								},
								{
									value: "high",
									label: "Urgent",
									description: "Top priority",
									icon: "warning",
									color: theme.colors.error,
								},
							].map((priority) => (
								<TouchableOpacity
									key={priority.value}
									style={styles.priorityCard}
									onPress={() => {
										setFormData((prev) => ({
											...prev,
											priority: priority.value as any,
										}));
										Haptics.selectionAsync();
									}}
								>
									<View style={styles.priorityCardContent}>
										<View style={styles.priorityIconSection}>
											<Ionicons
												name={priority.icon as any}
												size={24}
												color={priority.color}
											/>
										</View>
										<View style={styles.priorityInfo}>
											<Text style={styles.priorityLabel}>{priority.label}</Text>
											<Text style={styles.priorityDescription}>
												{priority.description}
											</Text>
										</View>
										{formData.priority === priority.value && (
											<View style={styles.priorityCheckmark}>
												<Ionicons
													name="checkmark-circle"
													size={20}
													color={theme.colors.success}
												/>
											</View>
										)}
									</View>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Bottom Spacing */}
					<View style={styles.bottomSpacing} />
				</ScrollView>
			</View>

			{/* Date Picker */}
			{showDatePicker && (
				<DateTimePicker
					value={tempDate}
					mode="date"
					display={Platform.OS === "ios" ? "spinner" : "default"}
					minimumDate={new Date()}
					onChange={(event, selectedDate) => {
						setShowDatePicker(false);
						if (selectedDate) {
							const dateString = formatDateToString(selectedDate);

							if (bookingMode === "single") {
								setFormData((prev) => ({ ...prev, booking_date: dateString }));

								// Fetch booked slots for new date
								if (formData.hall_id) {
									fetchBookedSlots(formData.hall_id, dateString);
								}

								// Check availability if all fields are filled
								if (
									formData.hall_id &&
									formData.start_time &&
									formData.end_time
								) {
									setTimeout(checkAvailability, 100);
								}
							} else if (bookingMode === "multiple") {
								if (!selectedDates.includes(dateString)) {
									setSelectedDates((prev) => [...prev, dateString]);
								}
							} else if (bookingMode === "recurring") {
								setRecurringStartDate(selectedDate);
								const dates = generateRecurringDates(
									selectedDate,
									recurringDays
								);
								setSelectedDates(dates);
							}
						}
					}}
				/>
			)}

			{/* Start Time Picker */}
			{showStartTimePicker && (
				<DateTimePicker
					value={tempDate}
					mode="time"
					is24Hour={true}
					display={Platform.OS === "ios" ? "spinner" : "default"}
					onChange={(event, selectedTime) => {
						setShowStartTimePicker(false);
						if (selectedTime) {
							const timeString = formatTimeToString(selectedTime);
							setFormData((prev) => ({ ...prev, start_time: timeString }));

							// Auto-adjust end time to be 2 hours later
							const endTime = new Date(selectedTime);
							endTime.setHours(endTime.getHours() + 2);
							const endTimeString = formatTimeToString(endTime);
							setFormData((prev) => ({ ...prev, end_time: endTimeString }));

							// Check availability
							if (formData.hall_id && formData.booking_date) {
								setTimeout(checkAvailability, 100);
							}
						}
					}}
				/>
			)}

			{/* End Time Picker */}
			{showEndTimePicker && (
				<DateTimePicker
					value={tempDate}
					mode="time"
					is24Hour={true}
					display={Platform.OS === "ios" ? "spinner" : "default"}
					onChange={(event, selectedTime) => {
						setShowEndTimePicker(false);
						if (selectedTime) {
							const timeString = formatTimeToString(selectedTime);
							setFormData((prev) => ({ ...prev, end_time: timeString }));

							// Check availability
							if (
								formData.hall_id &&
								formData.booking_date &&
								formData.start_time
							) {
								setTimeout(checkAvailability, 100);
							}
						}
					}}
				/>
			)}
		</View>
	);
};

const createStyles = (theme: any, insets: any) =>
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
			paddingTop: insets.top + theme.spacing.md,
			paddingBottom: theme.spacing.md,
			backgroundColor: theme.colors.surface,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.text.secondary + "20",
			elevation: 2,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
		},
		backButton: {
			padding: theme.spacing.sm,
		},
		headerTitle: {
			fontSize: 20,
			fontWeight: "600",
			color: theme.colors.text.primary,
		},
		submitButton: {
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
			backgroundColor: theme.colors.primary,
			borderRadius: theme.borderRadius.sm,
		},
		submitButtonDisabled: {
			backgroundColor: theme.colors.text.secondary + "50",
		},
		submitButtonText: {
			color: "#FFFFFF",
			fontSize: 16,
			fontWeight: "600",
		},
		submitButtonTextDisabled: {
			color: "#FFFFFF80",
		},
		progressContainer: {
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
			backgroundColor: theme.colors.surface,
		},
		progressBar: {
			height: 4,
			backgroundColor: theme.colors.text.secondary + "20",
			borderRadius: 2,
			overflow: "hidden",
		},
		progressFill: {
			height: "100%",
			backgroundColor: theme.colors.primary,
			borderRadius: 2,
		},
		progressText: {
			fontSize: 12,
			color: theme.colors.text.secondary,
			marginTop: theme.spacing.xs,
			textAlign: "center",
		},
		scrollView: {
			flex: 1,
		},
		scrollViewWrapper: {
			flex: 1,
		},
		scrollContent: {
			paddingHorizontal: theme.spacing.md,
			paddingTop: theme.spacing.md,
		},
		formSection: {
			marginBottom: theme.spacing.xl,
		},
		sectionHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: theme.spacing.lg,
			paddingHorizontal: theme.spacing.sm,
		},
		sectionIconContainer: {
			width: 40,
			height: 40,
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
			marginRight: theme.spacing.md,
		},
		sectionTitle: {
			fontSize: theme.fontSize.lg,
			fontWeight: "700",
			color: theme.colors.text.primary,
			flex: 1,
		},
		completedIndicator: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: theme.colors.success,
			justifyContent: "center",
			alignItems: "center",
		},
		hallSelector: {
			marginTop: theme.spacing.sm,
		},
		hallSelectorContent: {
			paddingRight: theme.spacing.md,
		},
		hallCard: {
			width: width * 0.7,
			marginRight: theme.spacing.sm,
			borderRadius: theme.borderRadius.md,
			overflow: "hidden",
			elevation: 2,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
		},
		hallCardSelected: {
			elevation: 4,
			shadowOpacity: 0.2,
			shadowRadius: 8,
		},
		hallCardGradient: {
			padding: theme.spacing.md,
			minHeight: 80,
		},
		hallCardContent: {
			flex: 1,
			justifyContent: "space-between",
		},
		hallCardName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.colors.text.primary,
			marginBottom: theme.spacing.xs,
		},
		hallCardNameSelected: {
			color: "#FFFFFF",
		},
		hallCardCapacity: {
			flexDirection: "row",
			alignItems: "center",
		},
		hallCardCapacityText: {
			fontSize: 14,
			color: theme.colors.text.secondary,
			marginLeft: theme.spacing.xs,
		},
		hallCardCapacityTextSelected: {
			color: "#FFFFFF",
		},
		selectedIndicator: {
			position: "absolute",
			top: -theme.spacing.md,
			right: -theme.spacing.md,
			padding: theme.spacing.sm,
		},
		enhancedInput: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			marginBottom: theme.spacing.sm,
			borderWidth: 1.5,
			borderColor: theme.colors.border,
			...theme.shadows.small,
		},
		enhancedInputFocused: {
			borderColor: theme.colors.primary,
			borderWidth: 2,
		},
		inputWithIcon: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.md,
		},
		inputIconContainer: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: theme.colors.primary + "15",
			justifyContent: "center",
			alignItems: "center",
			marginRight: theme.spacing.md,
		},
		inputTextContainer: {
			flex: 1,
		},
		fieldLabel: {
			fontSize: theme.fontSize.sm,
			fontWeight: "500",
			color: theme.colors.text.secondary,
			marginBottom: theme.spacing.xs,
		},
		enhancedInputText: {
			fontSize: theme.fontSize.md,
			color: theme.colors.text.primary,
			fontWeight: "500",
		},
		placeholderText: {
			color: theme.colors.placeholder,
			fontWeight: "400",
		},
		timeRow: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: theme.spacing.sm,
		},
		timeInputContainer: {
			flex: 1,
		},
		enhancedTimeInput: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			elevation: 1,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 2,
		},
		timeIconContainer: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: theme.colors.primary + "15",
			justifyContent: "center",
			alignItems: "center",
			marginRight: theme.spacing.sm,
		},
		timeTextContainer: {
			flex: 1,
		},
		timeLabel: {
			fontSize: 12,
			color: theme.colors.text.secondary,
			marginBottom: theme.spacing.xs,
		},
		timeText: {
			fontSize: 16,
			color: theme.colors.text.primary,
			fontWeight: "500",
		},
		timeSeparator: {
			flexDirection: "row",
			alignItems: "center",
			marginHorizontal: theme.spacing.md,
		},
		timeSeparatorLine: {
			width: 20,
			height: 1,
			backgroundColor: theme.colors.text.secondary + "30",
		},
		validationError: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.colors.error + "10",
			padding: theme.spacing.sm,
			borderRadius: theme.borderRadius.sm,
			marginTop: theme.spacing.sm,
		},
		validationErrorText: {
			fontSize: 14,
			color: theme.colors.error,
			marginLeft: theme.spacing.sm,
		},
		checkAvailabilityButton: {
			borderRadius: theme.borderRadius.md,
			overflow: "hidden",
			elevation: 2,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
		},
		buttonDisabled: {
			opacity: 0.6,
		},
		buttonGradient: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			padding: theme.spacing.md,
		},
		buttonText: {
			color: "#FFFFFF",
			fontSize: 16,
			fontWeight: "600",
			marginLeft: theme.spacing.sm,
		},
		availabilityResult: {
			marginTop: theme.spacing.md,
			padding: theme.spacing.md,
			borderRadius: theme.borderRadius.md,
			borderWidth: 1,
		},
		availabilityHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: theme.spacing.sm,
		},
		availabilityHeaderText: {
			flex: 1,
			marginLeft: theme.spacing.sm,
		},
		availabilityText: {
			fontSize: 16,
			fontWeight: "600",
		},
		availabilitySubText: {
			fontSize: 12,
			fontWeight: "400",
			marginTop: 2,
			opacity: 0.8,
		},
		multiDateSummary: {
			marginTop: theme.spacing.md,
			padding: theme.spacing.sm,
			backgroundColor: "rgba(0,0,0,0.05)",
			borderRadius: theme.borderRadius.sm,
		},
		multiDateTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.colors.text.primary,
			marginBottom: theme.spacing.sm,
		},
		dateResultRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: theme.spacing.xs,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(0,0,0,0.1)",
		},
		dateResultDate: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.colors.text.primary,
		},
		dateResultStatus: {
			flexDirection: "row",
			alignItems: "center",
			gap: theme.spacing.xs,
		},
		dateResultText: {
			fontSize: 12,
			fontWeight: "500",
		},
		availabilityCheckInfo: {
			flexDirection: "row",
			alignItems: "center",
			gap: theme.spacing.xs,
			padding: theme.spacing.sm,
			backgroundColor: theme.colors.primary + "10",
			borderRadius: theme.borderRadius.sm,
			marginBottom: theme.spacing.sm,
		},
		availabilityCheckInfoText: {
			fontSize: 13,
			color: theme.colors.primary,
			fontWeight: "500",
			flex: 1,
		},
		conflictInfo: {
			marginTop: theme.spacing.sm,
		},
		conflictTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.colors.text.primary,
			marginBottom: theme.spacing.xs,
		},
		conflictText: {
			fontSize: 14,
			color: theme.colors.text.secondary,
		},
		loadingSlots: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			padding: theme.spacing.md,
		},
		loadingSlotsText: {
			fontSize: 14,
			color: theme.colors.text.secondary,
			marginLeft: theme.spacing.sm,
		},
		bookedSlotsList: {
			gap: theme.spacing.sm,
		},
		bookedSlotCard: {
			backgroundColor: theme.colors.surface,
			padding: theme.spacing.sm,
			borderRadius: theme.borderRadius.sm,
			borderLeftWidth: 3,
			borderLeftColor: theme.colors.warning,
		},
		bookedSlotTime: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: theme.spacing.xs,
		},
		bookedSlotTimeText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.colors.text.primary,
			marginLeft: theme.spacing.xs,
		},
		bookedSlotPurpose: {
			fontSize: 12,
			color: theme.colors.text.secondary,
		},
		noBookingsContainer: {
			alignItems: "center",
			padding: theme.spacing.lg,
		},
		noBookingsText: {
			fontSize: 14,
			color: theme.colors.success,
			marginTop: theme.spacing.sm,
			fontWeight: "500",
		},
		inputContainer: {
			marginBottom: theme.spacing.lg,
		},
		inputLabel: {
			fontSize: theme.fontSize.md,
			fontWeight: "600",
			color: theme.colors.text.primary,
			marginBottom: theme.spacing.sm,
			paddingHorizontal: theme.spacing.xs,
		},
		textInput: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.md,
			fontSize: theme.fontSize.md,
			color: theme.colors.text.primary,
			borderWidth: 1.5,
			borderColor: theme.colors.border,
			...theme.shadows.small,
		},
		textInputFocused: {
			borderColor: theme.colors.primary,
			borderWidth: 2,
		},
		textAreaInput: {
			minHeight: 100,
			textAlignVertical: "top",
			paddingTop: theme.spacing.md,
		},
		attendeesContainer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.md,
			...theme.shadows.small,
			borderWidth: 1,
			borderColor: theme.colors.border,
		},
		attendeesLabel: {
			fontSize: theme.fontSize.md,
			fontWeight: "600",
			color: theme.colors.text.primary,
		},
		attendeesControls: {
			flexDirection: "row",
			alignItems: "center",
		},
		attendeesButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: theme.colors.primary,
			justifyContent: "center",
			alignItems: "center",
			...theme.shadows.small,
		},
		attendeesButtonDisabled: {
			backgroundColor: theme.colors.placeholder,
			opacity: 0.5,
		},
		attendeesCount: {
			fontSize: theme.fontSize.lg,
			fontWeight: "700",
			color: theme.colors.text.primary,
			marginHorizontal: theme.spacing.lg,
			minWidth: 50,
			textAlign: "center",
			backgroundColor: theme.colors.background,
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.xs,
			borderRadius: theme.borderRadius.sm,
			borderWidth: 1,
			borderColor: theme.colors.border,
		},
		quickIncrementContainer: {
			marginTop: theme.spacing.md,
			paddingTop: theme.spacing.md,
			borderTopWidth: 1,
			borderTopColor: theme.colors.border,
		},
		quickIncrementLabel: {
			fontSize: theme.fontSize.sm,
			fontWeight: "500",
			color: theme.colors.text.secondary,
			marginBottom: theme.spacing.sm,
		},
		quickIncrementButtons: {
			flexDirection: "row",
			gap: theme.spacing.sm,
		},
		quickIncrementButton: {
			flex: 1,
			backgroundColor: theme.colors.primary + "15",
			borderRadius: theme.borderRadius.sm,
			paddingVertical: theme.spacing.sm,
			alignItems: "center",
			borderWidth: 1,
			borderColor: theme.colors.primary + "30",
		},
		quickIncrementText: {
			fontSize: theme.fontSize.sm,
			fontWeight: "600",
			color: theme.colors.primary,
		},
		priorityContainer: {
			gap: theme.spacing.sm,
		},
		priorityCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			borderWidth: 1.5,
			borderColor: theme.colors.border,
			...theme.shadows.small,
			overflow: "hidden",
		},
		priorityCardContent: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.md,
		},
		priorityIconSection: {
			marginRight: theme.spacing.md,
		},
		priorityInfo: {
			flex: 1,
		},
		priorityLabel: {
			fontSize: theme.fontSize.md,
			fontWeight: "600",
			color: theme.colors.text.primary,
			marginBottom: theme.spacing.xs,
		},
		priorityDescription: {
			fontSize: theme.fontSize.sm,
			color: theme.colors.text.secondary,
		},
		priorityCheckmark: {
			marginLeft: theme.spacing.sm,
		},
		// Hall loading and empty states
		hallLoadingContainer: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: theme.spacing.xl,
		},
		hallLoadingText: {
			marginTop: theme.spacing.sm,
			fontSize: theme.fontSize.sm,
			color: theme.colors.text.secondary,
		},
		noHallsContainer: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: theme.spacing.xl,
			paddingHorizontal: theme.spacing.lg,
		},
		noHallsText: {
			marginTop: theme.spacing.sm,
			fontSize: theme.fontSize.md,
			color: theme.colors.text.secondary,
			textAlign: "center",
		},
		noHallsSubtext: {
			marginTop: theme.spacing.xs,
			fontSize: theme.fontSize.sm,
			color: theme.colors.text.secondary,
			textAlign: "center",
			fontStyle: "italic",
		},
		refreshHallsButton: {
			marginTop: theme.spacing.md,
			backgroundColor: theme.colors.primary,
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.sm,
			borderRadius: theme.borderRadius.sm,
		},
		refreshHallsText: {
			color: "#FFFFFF",
			fontSize: theme.fontSize.sm,
			fontWeight: "600",
		},
		bookingModeContainer: {
			flexDirection: "row",
			marginTop: theme.spacing.sm,
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			padding: theme.spacing.xs,
			...theme.shadows.small,
		},
		bookingModeButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: theme.spacing.sm,
			paddingHorizontal: theme.spacing.sm,
			borderRadius: theme.borderRadius.sm,
			marginHorizontal: theme.spacing.xs,
		},
		bookingModeButtonActive: {
			backgroundColor: theme.colors.primary,
			...theme.shadows.small,
		},
		bookingModeText: {
			marginLeft: theme.spacing.xs,
			fontSize: theme.fontSize.sm,
			fontWeight: "600",
			color: theme.colors.text.secondary,
		},
		bookingModeTextActive: {
			color: "#FFFFFF",
		},
		multiDateSelector: {
			gap: 12,
		},
		selectedDatesContainer: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			marginTop: 8,
		},
		selectedDateChip: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.colors.primary + "15",
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 20,
			gap: 6,
		},
		selectedDateText: {
			fontSize: 14,
			color: theme.colors.primary,
			fontWeight: "500",
		},
		recurringControls: {
			gap: 12,
		},
		recurringRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.colors.surface,
			padding: 16,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.colors.border + "30",
		},
		recurringInput: {
			backgroundColor: theme.colors.surface,
			borderWidth: 1,
			borderColor: theme.colors.border,
			borderRadius: 8,
			paddingHorizontal: 12,
			paddingVertical: 8,
			fontSize: 16,
			color: theme.colors.text.primary,
			minWidth: 60,
			textAlign: "center",
		},
		wholeDayToggle: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.md,
			marginTop: theme.spacing.sm,
			...theme.shadows.small,
		},
		wholeDayToggleText: {
			fontSize: theme.fontSize.md,
			fontWeight: "600",
			color: theme.colors.text.primary,
		},
		wholeDayToggleSubtext: {
			fontSize: theme.fontSize.sm,
			color: theme.colors.text.secondary,
			marginTop: theme.spacing.xs,
		},
		disabledInput: {
			backgroundColor: theme.colors.surface + "50",
			borderColor: theme.colors.border + "20",
		},
		disabledText: {
			color: theme.colors.text.tertiary,
		},
		bottomSpacing: {
			height: 100,
		},
	});

export default BookingFormScreen;
