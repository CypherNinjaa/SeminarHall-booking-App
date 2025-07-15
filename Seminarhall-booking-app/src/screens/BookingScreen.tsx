import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	RefreshControl,
	Modal,
	TextInput,
	Platform,
	Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import {
	smartBookingService,
	SmartBooking,
	CreateBookingData,
	AvailabilityCheck,
} from "../services/smartBookingService";
import { hallManagementService } from "../services/hallManagementService";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../contexts/ThemeContext";
import { getThemeColors } from "../utils/themeUtils";

interface BookingScreenProps {
	navigation: any;
}

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

const getStatusColor = (status: SmartBooking["status"]) => {
	switch (status) {
		case "approved":
			return theme.colors.success;
		case "pending":
			return theme.colors.warning;
		case "completed":
			return "#6366f1"; // Indigo color for completed
		case "rejected":
		case "cancelled":
			return theme.colors.error;
		default:
			return theme.colors.text.secondary;
	}
};

const getStatusIcon = (status: SmartBooking["status"]) => {
	switch (status) {
		case "approved":
			return "checkmark-circle";
		case "pending":
			return "time";
		case "completed":
			return "checkmark-done-circle";
		case "rejected":
		case "cancelled":
			return "close-circle";
		default:
			return "help-circle";
	}
};

const formatDate = (dateString: string): string => {
	// Convert DDMMYYYY to readable format
	const day = dateString.substring(0, 2);
	const month = dateString.substring(2, 4);
	const year = dateString.substring(4, 8);
	return `${day}/${month}/${year}`;
};

const formatTime = (timeString: string): string => {
	// Convert 24-hour format to 12-hour format
	const [hour, minute] = timeString.split(":");
	const hourNum = parseInt(hour);
	const ampm = hourNum >= 12 ? "PM" : "AM";
	const displayHour = hourNum % 12 || 12;
	return `${displayHour}:${minute} ${ampm}`;
};

// Validation utility functions
const isHallAvailable = (hall: any): boolean => {
	return hall.is_active && !hall.is_maintenance;
};

const isPastTime = (dateString: string, timeString: string): boolean => {
	if (!dateString || !timeString) return false;

	// Convert DDMMYYYY to Date
	const day = parseInt(dateString.substring(0, 2));
	const month = parseInt(dateString.substring(2, 4)) - 1; // Month is 0-indexed
	const year = parseInt(dateString.substring(4, 8));

	// Convert HH:MM to hours and minutes
	const [hours, minutes] = timeString.split(":").map(Number);

	// Create the booking date/time
	const bookingDateTime = new Date(year, month, day, hours, minutes);

	// Compare with current time
	return bookingDateTime < new Date();
};

const isValidTimeFormat = (timeString: string): boolean => {
	const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
	return timeRegex.test(timeString);
};

const formatTimeForDisplay = (timeString: string): string => {
	// Ensure proper 24-hour format display
	if (!timeString || timeString.length < 4) return timeString;

	if (timeString.includes(":")) {
		const [hours, minutes] = timeString.split(":");
		return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
	}

	if (timeString.length === 4) {
		const hours = timeString.substring(0, 2);
		const minutes = timeString.substring(2, 4);
		return `${hours}:${minutes}`;
	}

	return timeString;
};

const BookingScreen: React.FC<BookingScreenProps> = ({ navigation }) => {
	const { user } = useAuthStore();
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
		spacing: {
			xs: 4,
			sm: 8,
			md: 16,
			lg: 24,
			xl: 32,
		},
		borderRadius: {
			sm: 8,
			md: 16,
			lg: 24,
		},
	};

	// Helper: getStatusColor
	const getStatusColor = (status?: string) => {
		switch (status) {
			case "pending":
				return theme.colors.warning;
			case "approved":
				return theme.colors.success;
			case "rejected":
				return theme.colors.error;
			case "completed":
				return theme.colors.success;
			default:
				return theme.colors.text.secondary;
		}
	};

	// Helper: getStatusIcon
	const getStatusIcon = (status?: string) => {
		switch (status) {
			case "pending":
				return "time-outline";
			case "approved":
				return "checkmark-circle-outline";
			case "rejected":
				return "close-circle-outline";
			case "completed":
				return "checkmark-done-circle-outline";
			default:
				return "help-circle-outline";
		}
	};

	// Helper: formatDate
	const formatDate = (dateString: string) => {
		// Accepts DDMMYYYY or YYYY-MM-DD
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

	// Helper: formatTime
	const formatTime = (timeString: string) => {
		// Accepts HH:MM or HHMM
		if (!timeString) return "-";
		if (timeString.includes(":")) return timeString;
		if (timeString.length === 4) {
			return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
		}
		return timeString;
	};

	// Create styles with dynamic theme
	const styles = createStyles(dynamicTheme);

	const [bookings, setBookings] = useState<SmartBooking[]>([]);
	const [halls, setHalls] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [editingBooking, setEditingBooking] = useState<SmartBooking | null>(
		null
	);
	const [creating, setCreating] = useState(false);
	const [updating, setUpdating] = useState(false);

	// Create booking form state
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

	// Date picker state
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showStartTimePicker, setShowStartTimePicker] = useState(false);
	const [showEndTimePicker, setShowEndTimePicker] = useState(false);
	const [tempDate, setTempDate] = useState(new Date());

	// Availability check state
	const [availabilityCheck, setAvailabilityCheck] =
		useState<AvailabilityCheck | null>(null);
	const [checkingAvailability, setCheckingAvailability] = useState(false);

	// Booked slots state for selected hall and date
	const [bookedSlots, setBookedSlots] = useState<SmartBooking[]>([]);
	const [loadingBookedSlots, setLoadingBookedSlots] = useState(false);

	// Animation refs for floating action button
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.9)).current;

	const fetchData = useCallback(async () => {
		if (!user) return;

		try {
			setLoading(true);
			const [bookingsData, hallsData] = await Promise.all([
				smartBookingService.getUserBookingsWithRealTimeStatus(user.id), // Use real-time status checking
				hallManagementService.getAllHalls(),
			]);
			setBookings(bookingsData);
			setHalls(hallsData);
		} catch (error) {
			console.error("Error fetching data:", error);
			Alert.alert("Error", "Failed to load bookings. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [user]);

	useFocusEffect(
		useCallback(() => {
			fetchData();
		}, [fetchData])
	);

	// Animation effect for floating action button
	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true,
			}),
			Animated.timing(scaleAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const handleRefresh = async () => {
		setRefreshing(true);
		await fetchData();
		setRefreshing(false);
	};

	const checkAvailability = async () => {
		if (
			!formData.hall_id ||
			!formData.booking_date ||
			!formData.start_time ||
			!formData.end_time
		) {
			return;
		}

		try {
			setCheckingAvailability(true);
			const result = await smartBookingService.checkAvailability(
				formData.hall_id,
				formData.booking_date,
				formData.start_time,
				formData.end_time,
				editingBooking?.id
			);
			setAvailabilityCheck(result);
		} catch (error) {
			console.error("Error checking availability:", error);
			Alert.alert("Error", "Failed to check availability");
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

			// Filter to only show future bookings and approved/pending ones
			const futureBookings = result.filter((booking: SmartBooking) => {
				const now = new Date();
				const [hours, minutes] = booking.start_time.split(":").map(Number);
				const bookingDateTime = new Date(
					parseInt(bookingDate.substring(4, 8)), // year
					parseInt(bookingDate.substring(2, 4)) - 1, // month (0-indexed)
					parseInt(bookingDate.substring(0, 2)), // day
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

	const handleCreateBooking = async () => {
		if (!user) return;

		try {
			setCreating(true);
			await smartBookingService.createBooking(formData, user.id);
			Alert.alert("Success", "Booking created successfully!");
			setShowCreateModal(false);
			resetForm();
			await fetchData();
		} catch (error: any) {
			console.error("Error creating booking:", error);
			Alert.alert("Error", error.message || "Failed to create booking");
		} finally {
			setCreating(false);
		}
	};

	const handleUpdateBooking = async () => {
		if (!user || !editingBooking) return;

		try {
			setUpdating(true);
			await smartBookingService.updateBooking(
				editingBooking.id,
				formData,
				user.id
			);
			Alert.alert("Success", "Booking updated successfully!");
			setShowEditModal(false);
			setEditingBooking(null);
			resetForm();
			await fetchData();
		} catch (error: any) {
			console.error("Error updating booking:", error);
			Alert.alert("Error", error.message || "Failed to update booking");
		} finally {
			setUpdating(false);
		}
	};

	const handleCancelBooking = (booking: SmartBooking) => {
		Alert.alert(
			"Cancel Booking",
			"Are you sure you want to cancel this booking?",
			[
				{ text: "No", style: "cancel" },
				{
					text: "Yes",
					style: "destructive",
					onPress: async () => {
						try {
							await smartBookingService.cancelBooking(booking.id, user!.id);
							Alert.alert("Success", "Booking cancelled successfully");
							await fetchData();
						} catch (error: any) {
							Alert.alert("Error", error.message || "Failed to cancel booking");
						}
					},
				},
			]
		);
	};

	const resetForm = () => {
		setFormData({
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
		setAvailabilityCheck(null);
	};

	const openEditModal = (booking: SmartBooking) => {
		navigation.navigate("BookingForm", { editingBooking: booking });
	};

	const formatDateForInput = (dateString: string): Date => {
		// Convert DDMMYYYY to Date object
		const day = parseInt(dateString.substring(0, 2));
		const month = parseInt(dateString.substring(2, 4)) - 1;
		const year = parseInt(dateString.substring(4, 8));
		return new Date(year, month, day);
	};

	const formatDateToString = (date: Date): string => {
		// Convert Date to DDMMYYYY string
		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear().toString();
		return `${day}${month}${year}`;
	};

	const formatTimeToString = (date: Date): string => {
		// Convert Date to HH:MM string
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		return `${hours}:${minutes}`;
	};

	const handleFabPress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		navigation.navigate("BookingForm", {});
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar style="auto" />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={styles.loadingText}>Loading bookings...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="auto" />
			<View style={styles.header}>
				<Text style={styles.headerTitle}>My Bookings</Text>
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
				}
			>
				{bookings.map((booking) => (
					<View key={booking.id} style={styles.bookingCard}>
						<View style={styles.bookingHeader}>
							<View style={styles.bookingTitleRow}>
								<Text style={styles.hallName} numberOfLines={1}>
									{booking.hall_name || "Unknown Hall"}
								</Text>
								<View
									style={[
										styles.statusBadge,
										{ backgroundColor: getStatusColor(booking.status) },
									]}
								>
									<Ionicons
										name={getStatusIcon(booking.status)}
										size={14}
										color={theme.colors.surface}
									/>
									<Text style={styles.statusText}>
										{booking.status.charAt(0).toUpperCase() +
											booking.status.slice(1)}
									</Text>
								</View>
							</View>
							{booking.auto_approved && (
								<View style={styles.autoApprovedBadge}>
									<Ionicons
										name="flash"
										size={12}
										color={theme.colors.warning}
									/>
									<Text style={styles.autoApprovedText}>Auto-approved</Text>
								</View>
							)}
						</View>

						<View style={styles.bookingDetails}>
							<View style={styles.detailRow}>
								<Ionicons
									name="calendar"
									size={16}
									color={theme.colors.text.secondary}
								/>
								<Text style={styles.detailText}>
									{formatDate(booking.booking_date)}
								</Text>
							</View>
							<View style={styles.detailRow}>
								<Ionicons
									name="time"
									size={16}
									color={theme.colors.text.secondary}
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
									color={theme.colors.text.secondary}
								/>
								<Text style={styles.detailText}>
									{booking.attendees_count} attendees
								</Text>
							</View>
							<View style={styles.detailRow}>
								<Ionicons
									name="bookmark"
									size={16}
									color={theme.colors.text.secondary}
								/>
								<Text style={styles.detailText} numberOfLines={1}>
									{booking.purpose}
								</Text>
							</View>
						</View>

						{booking.status === "pending" || booking.status === "approved" ? (
							<View style={styles.bookingActions}>
								<TouchableOpacity
									style={[styles.actionButton, styles.editButton]}
									onPress={() => openEditModal(booking)}
								>
									<Ionicons
										name="pencil"
										size={16}
										color={theme.colors.primary}
									/>
									<Text style={styles.editButtonText}>Edit</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.actionButton, styles.cancelButton]}
									onPress={() => handleCancelBooking(booking)}
								>
									<Ionicons name="close" size={16} color={theme.colors.error} />
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
							</View>
						) : null}
					</View>
				))}

				{bookings.length === 0 && (
					<View style={styles.emptyState}>
						<Ionicons
							name="calendar-outline"
							size={64}
							color={theme.colors.text.secondary}
						/>
						<Text style={styles.emptyTitle}>No Bookings Yet</Text>
						<Text style={styles.emptyMessage}>
							Create your first booking to get started
						</Text>
						<TouchableOpacity
							style={styles.emptyButton}
							onPress={() => {
								navigation.navigate("BookingForm", {});
							}}
						>
							<Text style={styles.emptyButtonText}>Create Booking</Text>
						</TouchableOpacity>
					</View>
				)}
			</ScrollView>

			{/* Create/Edit Booking Modal */}
			<Modal
				visible={showCreateModal || showEditModal}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<SafeAreaView style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<TouchableOpacity
							onPress={() => {
								setShowCreateModal(false);
								setShowEditModal(false);
								setEditingBooking(null);
								resetForm();
							}}
						>
							<Text style={styles.modalCancelText}>Cancel</Text>
						</TouchableOpacity>
						<Text style={styles.modalTitle}>
							{editingBooking ? "Edit Booking" : "Create Booking"}
						</Text>
						<TouchableOpacity
							onPress={
								editingBooking ? handleUpdateBooking : handleCreateBooking
							}
							disabled={
								creating ||
								updating ||
								!formData.hall_id ||
								!formData.booking_date ||
								!formData.purpose
							}
						>
							<Text
								style={[
									styles.modalSaveText,
									(creating ||
										updating ||
										!formData.hall_id ||
										!formData.booking_date ||
										!formData.purpose) &&
										styles.modalSaveTextDisabled,
								]}
							>
								{creating || updating ? "Saving..." : "Save"}
							</Text>
						</TouchableOpacity>
					</View>

					<ScrollView
						style={styles.modalContent}
						showsVerticalScrollIndicator={false}
					>
						{/* Form Progress Indicator */}
						<View style={styles.progressIndicator}>
							<View style={styles.progressBar}>
								<View style={[styles.progressFill, { width: "60%" }]} />
							</View>
							<Text style={styles.progressText}>Basic Details</Text>
						</View>

						{/* Hall Selection */}
						<View style={styles.formSection}>
							<View style={styles.sectionHeader}>
								<Ionicons
									name="business-outline"
									size={20}
									color={theme.colors.primary}
								/>
								<Text style={styles.sectionTitle}>Select Hall *</Text>
							</View>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								style={styles.hallSelector}
								contentContainerStyle={styles.hallSelectorContent}
							>
								{halls
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

												// Fetch booked slots for this hall and date
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
																theme.colors.primary + "15",
																theme.colors.primary + "10",
														  ]
														: ["transparent", "transparent"]
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
													>
														{hall.name}
													</Text>
													<View style={styles.hallCardCapacity}>
														<Ionicons
															name="people-outline"
															size={14}
															color={
																formData.hall_id === hall.id
																	? theme.colors.primary
																	: theme.colors.text.secondary
															}
														/>
														<Text
															style={[
																styles.hallCardCapacityText,
																formData.hall_id === hall.id &&
																	styles.hallCardCapacitySelected,
															]}
														>
															{hall.capacity} people
														</Text>
													</View>
													{formData.hall_id === hall.id && (
														<View style={styles.selectedIndicator}>
															<Ionicons
																name="checkmark-circle"
																size={16}
																color={theme.colors.primary}
															/>
														</View>
													)}
												</View>
											</LinearGradient>
										</TouchableOpacity>
									))}
							</ScrollView>
						</View>

						{/* Date Selection */}
						<View style={styles.formSection}>
							<View style={styles.sectionHeader}>
								<Ionicons
									name="calendar-outline"
									size={20}
									color={theme.colors.primary}
								/>
								<Text style={styles.sectionTitle}>Date *</Text>
							</View>
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
											name="calendar"
											size={20}
											color={theme.colors.primary}
										/>
									</View>
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
									<Ionicons
										name="chevron-forward"
										size={16}
										color={theme.colors.text.secondary}
									/>
								</View>
							</TouchableOpacity>
						</View>

						{/* Time Selection */}
						<View style={styles.formSection}>
							<View style={styles.sectionHeader}>
								<Ionicons
									name="time-outline"
									size={20}
									color={theme.colors.primary}
								/>
								<Text style={styles.sectionTitle}>Time *</Text>
							</View>
							<View style={styles.timeRow}>
								<View style={styles.timeInputContainer}>
									<Text style={styles.timeLabel}>Start</Text>
									<TouchableOpacity
										style={styles.enhancedTimeInput}
										onPress={() => {
											const [hours, minutes] = formData.start_time
												.split(":")
												.map(Number);
											const date = new Date();
											date.setHours(hours, minutes);
											setTempDate(date);
											setShowStartTimePicker(true);
											Haptics.selectionAsync();
										}}
									>
										<View style={styles.inputWithIcon}>
											<Ionicons
												name="time"
												size={16}
												color={theme.colors.primary}
											/>
											<Text style={styles.timeText}>
												{formatTime(formData.start_time)}
											</Text>
										</View>
									</TouchableOpacity>
								</View>

								<View style={styles.timeSeparator}>
									<View style={styles.timeSeparatorLine} />
									<Ionicons
										name="arrow-forward"
										size={16}
										color={theme.colors.primary}
									/>
									<View style={styles.timeSeparatorLine} />
								</View>

								<View style={styles.timeInputContainer}>
									<Text style={styles.timeLabel}>End</Text>
									<TouchableOpacity
										style={styles.enhancedTimeInput}
										onPress={() => {
											const [hours, minutes] = formData.end_time
												.split(":")
												.map(Number);
											const date = new Date();
											date.setHours(hours, minutes);
											setTempDate(date);
											setShowEndTimePicker(true);
											Haptics.selectionAsync();
										}}
									>
										<View style={styles.inputWithIcon}>
											<Ionicons
												name="time"
												size={16}
												color={theme.colors.primary}
											/>
											<Text style={styles.timeText}>
												{formatTime(formData.end_time)}
											</Text>
										</View>
									</TouchableOpacity>
								</View>
							</View>

							{/* Time Format Hint */}
							<View style={styles.hintContainer}>
								<Ionicons
									name="information-circle-outline"
									size={14}
									color={theme.colors.text.secondary}
								/>
								<Text style={styles.hintText}>
									Use 24-hour format (HH:MM). Example: 14:30 for 2:30 PM
								</Text>
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
							formData.booking_date &&
							formData.start_time &&
							formData.end_time && (
								<View style={styles.formSection}>
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
												<ActivityIndicator size="small" color="white" />
											) : (
												<Ionicons name="search" size={18} color="white" />
											)}
											<Text style={styles.checkAvailabilityText}>
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
														? "Available"
														: "Not Available"}
												</Text>
											</View>

											{!availabilityCheck.is_available && (
												<View style={styles.conflictInfo}>
													<Text style={styles.conflictTitle}>
														⚠️ Time Slot Already Booked
													</Text>
													<Text style={styles.conflictSubtitle}>
														This time period has been reserved by:
													</Text>
													{availabilityCheck.conflicting_bookings.map(
														(conflict, index) => (
															<View key={index} style={styles.conflictItem}>
																<View style={styles.conflictHeader}>
																	<Ionicons
																		name="business"
																		size={18}
																		color={theme.colors.error}
																	/>
																	<Text style={styles.conflictDepartmentText}>
																		{conflict.user_name ||
																			conflict.user_email ||
																			"Department User"}
																	</Text>
																</View>
																<View style={styles.conflictDetails}>
																	<Text style={styles.conflictTimeText}>
																		🕒 {formatTime(conflict.start_time)} -{" "}
																		{formatTime(conflict.end_time)}
																	</Text>
																	<Text style={styles.conflictPurposeText}>
																		📝 Purpose: {conflict.purpose}
																	</Text>
																	<Text style={styles.conflictStatusText}>
																		📊 Status:{" "}
																		{conflict.status.charAt(0).toUpperCase() +
																			conflict.status.slice(1)}
																	</Text>
																</View>
															</View>
														)
													)}
													<Text style={styles.conflictAdvice}>
														💡 Please choose a different time slot or check the
														suggested times below.
													</Text>
												</View>
											)}

											{!availabilityCheck.is_available &&
												availabilityCheck.suggested_slots.length > 0 && (
													<View style={styles.suggestedSlots}>
														<Text style={styles.suggestedSlotsTitle}>
															Suggested Times:
														</Text>
														{availabilityCheck.suggested_slots
															.slice(0, 3)
															.map((slot, index) => (
																<TouchableOpacity
																	key={index}
																	style={styles.suggestedSlot}
																	onPress={() => {
																		setFormData((prev) => ({
																			...prev,
																			start_time: slot.start_time,
																			end_time: slot.end_time,
																		}));
																		checkAvailability();
																	}}
																>
																	<Text style={styles.suggestedSlotText}>
																		{formatTime(slot.start_time)} -{" "}
																		{formatTime(slot.end_time)}
																	</Text>
																</TouchableOpacity>
															))}
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
									<Ionicons
										name="calendar-outline"
										size={20}
										color={theme.colors.primary}
									/>
									<Text style={styles.sectionTitle}>Today's Bookings</Text>
									{loadingBookedSlots && (
										<ActivityIndicator
											size="small"
											color={theme.colors.primary}
										/>
									)}
								</View>

								{bookedSlots.length > 0 ? (
									<View style={styles.bookedSlotsContainer}>
										<Text style={styles.bookedSlotsTitle}>
											⏰ Already booked times ({bookedSlots.length} booking
											{bookedSlots.length !== 1 ? "s" : ""}):
										</Text>
										{bookedSlots
											.sort((a, b) => a.start_time.localeCompare(b.start_time))
											.map((booking, index) => (
												<View key={index} style={styles.bookedSlotItem}>
													<View style={styles.bookedSlotTime}>
														<Ionicons
															name="time"
															size={16}
															color={theme.colors.warning}
														/>
														<Text style={styles.bookedSlotTimeText}>
															{formatTime(booking.start_time)} -{" "}
															{formatTime(booking.end_time)}
														</Text>
														<View
															style={[
																styles.bookedSlotStatusBadge,
																{
																	backgroundColor: getStatusColor(
																		booking.status
																	),
																},
															]}
														>
															<Text style={styles.bookedSlotStatusText}>
																{booking.status}
															</Text>
														</View>
													</View>
													<Text
														style={styles.bookedSlotPurpose}
														numberOfLines={1}
													>
														📝 {booking.purpose}
													</Text>
													{booking.user_name && (
														<Text
															style={styles.bookedSlotUser}
															numberOfLines={1}
														>
															👤 {booking.user_name}
														</Text>
													)}
												</View>
											))}
										<View style={styles.bookedSlotsHint}>
											<Ionicons
												name="information-circle-outline"
												size={14}
												color={theme.colors.text.secondary}
											/>
											<Text style={styles.bookedSlotsHintText}>
												💡 Choose a time that doesn't overlap with these
												bookings
											</Text>
										</View>
									</View>
								) : !loadingBookedSlots ? (
									<View style={styles.noBookedSlotsContainer}>
										<Ionicons
											name="checkmark-circle-outline"
											size={24}
											color={theme.colors.success}
										/>
										<Text style={styles.noBookedSlotsText}>
											🎉 No bookings for this day! All time slots are available.
										</Text>
									</View>
								) : null}
							</View>
						)}

						{/* Purpose */}
						<View style={styles.formSection}>
							<View style={styles.sectionHeader}>
								<Ionicons
									name="document-text-outline"
									size={20}
									color={theme.colors.primary}
								/>
								<Text style={styles.sectionTitle}>Purpose *</Text>
							</View>
							<View style={styles.enhancedInputContainer}>
								<TextInput
									style={styles.enhancedTextInput}
									value={formData.purpose}
									onChangeText={(text) =>
										setFormData((prev) => ({ ...prev, purpose: text }))
									}
									placeholder="e.g., Team Meeting, Workshop, Training Session"
									placeholderTextColor={theme.colors.text.secondary}
									returnKeyType="next"
									blurOnSubmit={false}
								/>
							</View>
						</View>

						{/* Description */}
						<View style={styles.formSection}>
							<View style={styles.sectionHeader}>
								<Ionicons
									name="information-circle-outline"
									size={20}
									color={theme.colors.primary}
								/>
								<Text style={styles.sectionTitle}>Description</Text>
								<Text style={styles.optionalLabel}>(Optional)</Text>
							</View>
							<View style={styles.enhancedInputContainer}>
								<TextInput
									style={[styles.enhancedTextInput, styles.textArea]}
									value={formData.description}
									onChangeText={(text) =>
										setFormData((prev) => ({ ...prev, description: text }))
									}
									placeholder="Additional details about your booking..."
									placeholderTextColor={theme.colors.text.secondary}
									multiline
									numberOfLines={4}
									textAlignVertical="top"
								/>
							</View>
						</View>

						{/* Attendees Count */}
						<View style={styles.formSection}>
							<View style={styles.sectionHeader}>
								<Ionicons
									name="people-outline"
									size={20}
									color={theme.colors.primary}
								/>
								<Text style={styles.sectionTitle}>Number of Attendees</Text>
							</View>
							<View style={styles.attendeesSection}>
								<TextInput
									style={styles.attendeesInput}
									value={formData.attendees_count.toString()}
									onChangeText={(value) => {
										const numValue = parseInt(value) || 1;
										setFormData((prev) => ({
											...prev,
											attendees_count: Math.max(1, numValue),
										}));
									}}
									placeholder="Enter number of attendees"
									keyboardType="numeric"
									maxLength={4}
									returnKeyType="done"
									onBlur={() => {
										// Ensure minimum value of 1
										if (formData.attendees_count < 1) {
											setFormData((prev) => ({
												...prev,
												attendees_count: 1,
											}));
										}
									}}
								/>
								<View style={styles.attendeesInputSuffix}>
									<Text style={styles.attendeesInputSuffixText}>
										{formData.attendees_count === 1 ? "person" : "people"}
									</Text>
								</View>

								{/* Capacity warning */}
								{formData.hall_id &&
									halls.find((h) => h.id === formData.hall_id) && (
										<View style={styles.capacityInfo}>
											<Ionicons
												name={
													formData.attendees_count <=
													halls.find((h) => h.id === formData.hall_id)?.capacity
														? "checkmark-circle"
														: "warning"
												}
												size={16}
												color={
													formData.attendees_count <=
													halls.find((h) => h.id === formData.hall_id)?.capacity
														? theme.colors.success
														: theme.colors.warning
												}
											/>
											<Text
												style={[
													styles.capacityText,
													{
														color:
															formData.attendees_count <=
															halls.find((h) => h.id === formData.hall_id)
																?.capacity
																? theme.colors.success
																: theme.colors.warning,
													},
												]}
											>
												Hall capacity:{" "}
												{halls.find((h) => h.id === formData.hall_id)?.capacity}{" "}
												people
											</Text>
										</View>
									)}
							</View>
						</View>

						{/* Priority */}
						<View style={styles.formSection}>
							<View style={styles.sectionHeader}>
								<Ionicons
									name="flag-outline"
									size={20}
									color={theme.colors.primary}
								/>
								<Text style={styles.sectionTitle}>Priority</Text>
							</View>
							<View style={styles.priorityContainer}>
								{(["low", "medium", "high"] as const).map((priority) => (
									<TouchableOpacity
										key={priority}
										style={[
											styles.priorityOption,
											formData.priority === priority &&
												styles.priorityOptionSelected,
										]}
										onPress={() => {
											setFormData((prev) => ({ ...prev, priority }));
											Haptics.selectionAsync();
										}}
									>
										<View style={styles.priorityContent}>
											<Ionicons
												name={
													priority === "high"
														? "chevron-up"
														: priority === "medium"
														? "remove"
														: "chevron-down"
												}
												size={16}
												color={
													formData.priority === priority
														? "white"
														: theme.colors.text.secondary
												}
											/>
											<Text
												style={[
													styles.priorityOptionText,
													formData.priority === priority &&
														styles.priorityOptionTextSelected,
												]}
											>
												{priority.charAt(0).toUpperCase() + priority.slice(1)}
											</Text>
										</View>
									</TouchableOpacity>
								))}
							</View>
						</View>
					</ScrollView>

					{/* Modal Footer with Action Buttons */}
					<View style={styles.modalFooter}>
						<TouchableOpacity
							style={[
								styles.submitButton,
								(!formData.hall_id ||
									!formData.booking_date ||
									!formData.purpose) &&
									styles.submitButtonDisabled,
							]}
							onPress={
								showEditModal ? handleUpdateBooking : handleCreateBooking
							}
							disabled={
								!formData.hall_id ||
								!formData.booking_date ||
								!formData.purpose ||
								creating ||
								updating
							}
						>
							<LinearGradient
								colors={
									!formData.hall_id ||
									!formData.booking_date ||
									!formData.purpose
										? [theme.colors.text.secondary, theme.colors.text.secondary]
										: [theme.colors.primary, theme.colors.primary + "DD"]
								}
								style={styles.submitButtonGradient}
							>
								{creating || updating ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<>
										<Ionicons
											name={showEditModal ? "checkmark" : "add"}
											size={20}
											color="white"
										/>
										<Text style={styles.submitButtonText}>
											{showEditModal
												? updating
													? "Updating..."
													: "Update Booking"
												: creating
												? "Creating..."
												: "Create Booking"}
										</Text>
									</>
								)}
							</LinearGradient>
						</TouchableOpacity>
					</View>
				</SafeAreaView>
			</Modal>

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
							setFormData((prev) => ({ ...prev, booking_date: dateString }));

							// Fetch booked slots for this date and hall
							if (formData.hall_id) {
								fetchBookedSlots(formData.hall_id, dateString);
							}

							if (
								formData.hall_id &&
								formData.start_time &&
								formData.end_time
							) {
								checkAvailability();
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
							if (
								formData.hall_id &&
								formData.booking_date &&
								formData.end_time
							) {
								checkAvailability();
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
							if (
								formData.hall_id &&
								formData.booking_date &&
								formData.start_time
							) {
								checkAvailability();
							}
						}
					}}
				/>
			)}

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
					onPress={handleFabPress}
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
};

// Styles
const createStyles = (dynamicTheme: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: dynamicTheme.colors.background,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: dynamicTheme.colors.background,
		},
		loadingText: {
			marginTop: dynamicTheme.spacing.md,
			color: dynamicTheme.colors.text.secondary,
			fontSize: 16,
		},
		header: {
			paddingHorizontal: dynamicTheme.spacing.md,
			paddingVertical: dynamicTheme.spacing.md,
			backgroundColor: dynamicTheme.colors.surface,
			borderBottomWidth: 1,
			borderBottomColor: dynamicTheme.colors.text.secondary + "20",
		},
		headerTitle: {
			fontSize: 28,
			fontWeight: "bold",
			color: dynamicTheme.colors.text.primary,
		},
		scrollView: {
			flex: 1,
		},
		scrollContent: {
			padding: dynamicTheme.spacing.md,
			paddingBottom: 100,
		},
		bookingCard: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: theme.borderRadius.md,
			padding: dynamicTheme.spacing.md,
			marginBottom: dynamicTheme.spacing.md,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
			elevation: 3,
		},
		bookingHeader: {
			marginBottom: dynamicTheme.spacing.sm,
		},
		bookingTitleRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: dynamicTheme.spacing.xs,
		},
		hallName: {
			fontSize: 18,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			flex: 1,
			marginRight: dynamicTheme.spacing.sm,
		},
		statusBadge: {
			paddingHorizontal: dynamicTheme.spacing.sm,
			paddingVertical: dynamicTheme.spacing.xs,
			borderRadius: theme.borderRadius.sm,
			flexDirection: "row",
			alignItems: "center",
		},
		statusText: {
			fontSize: 12,
			fontWeight: "600",
			color: "white",
			marginLeft: 4,
			textTransform: "capitalize",
		},
		autoApprovedBadge: {
			backgroundColor: theme.colors.secondary + "20",
			paddingHorizontal: dynamicTheme.spacing.sm,
			paddingVertical: dynamicTheme.spacing.xs,
			borderRadius: theme.borderRadius.sm,
			marginTop: dynamicTheme.spacing.xs,
			alignSelf: "flex-start",
			flexDirection: "row",
			alignItems: "center",
		},
		autoApprovedText: {
			fontSize: 11,
			color: theme.colors.secondary,
			fontWeight: "500",
			marginLeft: 4,
		},
		bookingDetails: {
			borderTopWidth: 1,
			borderTopColor: dynamicTheme.colors.text.secondary + "10",
			paddingTop: dynamicTheme.spacing.sm,
		},
		detailRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: dynamicTheme.spacing.xs,
		},
		detailText: {
			marginLeft: dynamicTheme.spacing.sm,
			color: dynamicTheme.colors.text.secondary,
			fontSize: 14,
		},
		durationText: {
			marginLeft: dynamicTheme.spacing.sm,
			color: dynamicTheme.colors.text.secondary,
			fontSize: 14,
			fontWeight: "500",
		},
		bookingActions: {
			flexDirection: "row",
			marginTop: dynamicTheme.spacing.md,
			gap: dynamicTheme.spacing.sm,
		},
		actionButton: {
			flex: 1,
			paddingVertical: dynamicTheme.spacing.sm,
			borderRadius: theme.borderRadius.sm,
			alignItems: "center",
		},
		editButton: {
			backgroundColor: theme.colors.primary,
		},
		editButtonText: {
			color: "white",
			fontWeight: "600",
			fontSize: 14,
		},
		cancelButton: {
			backgroundColor: theme.colors.error,
		},
		cancelButtonText: {
			color: "white",
			fontWeight: "600",
			fontSize: 14,
		},
		emptyState: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingVertical: 60,
		},
		emptyTitle: {
			fontSize: 20,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			marginTop: dynamicTheme.spacing.md,
			marginBottom: dynamicTheme.spacing.sm,
		},
		emptyMessage: {
			fontSize: 16,
			color: dynamicTheme.colors.text.secondary,
			textAlign: "center",
			marginBottom: dynamicTheme.spacing.lg,
			paddingHorizontal: dynamicTheme.spacing.lg,
		},
		emptyButton: {
			backgroundColor: theme.colors.primary,
			paddingHorizontal: dynamicTheme.spacing.lg,
			paddingVertical: dynamicTheme.spacing.md,
			borderRadius: theme.borderRadius.sm,
		},
		emptyButtonText: {
			color: "white",
			fontWeight: "600",
			fontSize: 16,
		},
		modalContainer: {
			flex: 1,
			backgroundColor: dynamicTheme.colors.background,
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: dynamicTheme.spacing.md,
			paddingVertical: dynamicTheme.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: dynamicTheme.colors.text.secondary + "20",
			backgroundColor: dynamicTheme.colors.surface,
		},
		modalCancelText: {
			color: theme.colors.error,
			fontSize: 16,
			fontWeight: "500",
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
		},
		modalSaveText: {
			color: theme.colors.primary,
			fontSize: 16,
			fontWeight: "600",
		},
		modalSaveTextDisabled: {
			color: dynamicTheme.colors.text.secondary,
			fontSize: 16,
			fontWeight: "600",
		},
		modalContent: {
			flex: 1,
			padding: dynamicTheme.spacing.md,
		},
		fab: {
			position: "absolute",
			bottom: 20,
			right: 20,
			borderRadius: 30,
			elevation: 8,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
		},
		fabGradient: {
			width: 60,
			height: 60,
			borderRadius: 30,
			justifyContent: "center",
			alignItems: "center",
		},
		// Form styles
		formGroup: {
			marginBottom: dynamicTheme.spacing.md,
		},
		formLabel: {
			fontSize: 16,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			marginBottom: dynamicTheme.spacing.sm,
		},
		hallSelector: {
			maxHeight: 200,
		},
		hallOption: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: theme.borderRadius.sm,
			padding: dynamicTheme.spacing.md,
			marginBottom: dynamicTheme.spacing.sm,
			borderWidth: 2,
			borderColor: "transparent",
		},
		hallOptionSelected: {
			borderColor: theme.colors.primary,
			backgroundColor: theme.colors.primary + "10",
		},
		hallOptionText: {
			fontSize: 16,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			marginBottom: dynamicTheme.spacing.xs,
		},
		hallOptionTextSelected: {
			color: theme.colors.primary,
		},
		hallOptionCapacity: {
			fontSize: 14,
			color: dynamicTheme.colors.text.secondary,
		},
		hallOptionCapacitySelected: {
			color: theme.colors.primary,
		},
		dateInput: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: theme.borderRadius.sm,
			padding: dynamicTheme.spacing.md,
			borderWidth: 1,
			borderColor: dynamicTheme.colors.text.secondary + "30",
		},
		dateInputText: {
			fontSize: 16,
			color: dynamicTheme.colors.text.primary,
		},
		placeholderText: {
			color: dynamicTheme.colors.text.secondary,
		},
		timeRow: {
			flexDirection: "row",
		},
		timeInput: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: theme.borderRadius.sm,
			padding: dynamicTheme.spacing.md,
			borderWidth: 1,
			borderColor: dynamicTheme.colors.text.secondary + "30",
		},
		timeInputText: {
			fontSize: 16,
			color: dynamicTheme.colors.text.primary,
		},
		checkAvailabilityButton: {
			backgroundColor: theme.colors.secondary,
			paddingVertical: dynamicTheme.spacing.md,
			borderRadius: theme.borderRadius.sm,
			alignItems: "center",
		},
		checkAvailabilityText: {
			color: "white",
			fontWeight: "600",
			fontSize: 16,
		},
		availabilityResult: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: theme.borderRadius.sm,
			padding: dynamicTheme.spacing.md,
			marginTop: dynamicTheme.spacing.md,
			borderWidth: 2,
		},
		availabilityHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: dynamicTheme.spacing.sm,
		},
		availabilityText: {
			fontSize: 16,
			fontWeight: "600",
			marginLeft: dynamicTheme.spacing.sm,
		},
		suggestedSlots: {
			marginTop: dynamicTheme.spacing.md,
		},
		suggestedSlotsTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			marginBottom: dynamicTheme.spacing.sm,
		},
		suggestedSlot: {
			backgroundColor: theme.colors.primary + "10",
			padding: dynamicTheme.spacing.sm,
			borderRadius: theme.borderRadius.sm,
			marginBottom: dynamicTheme.spacing.xs,
		},
		suggestedSlotText: {
			color: theme.colors.primary,
			fontWeight: "500",
			fontSize: 14,
		},
		textInput: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: theme.borderRadius.sm,
			padding: dynamicTheme.spacing.md,
			borderWidth: 1,
			borderColor: dynamicTheme.colors.text.secondary + "30",
			fontSize: 16,
			color: dynamicTheme.colors.text.primary,
		},
		textArea: {
			height: 100,
			textAlignVertical: "top",
		},
		attendeesCounter: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
		},
		counterButton: {
			backgroundColor: theme.colors.primary,
			width: 40,
			height: 40,
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
		},
		counterText: {
			fontSize: 18,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			marginHorizontal: dynamicTheme.spacing.lg,
			minWidth: 40,
			textAlign: "center",
		},
		prioritySelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: dynamicTheme.spacing.sm,
		},
		priorityOption: {
			paddingHorizontal: dynamicTheme.spacing.md,
			paddingVertical: dynamicTheme.spacing.sm,
			borderRadius: theme.borderRadius.sm,
			borderWidth: 2,
			borderColor: dynamicTheme.colors.text.secondary + "30",
			backgroundColor: dynamicTheme.colors.surface,
		},
		priorityOptionSelected: {
			borderColor: theme.colors.primary,
			backgroundColor: theme.colors.primary + "10",
		},
		priorityOptionText: {
			fontSize: 14,
			color: dynamicTheme.colors.text.secondary,
			textTransform: "capitalize",
		},
		priorityOptionTextSelected: {
			color: theme.colors.primary,
			fontWeight: "600",
		},
		conflictInfo: {
			backgroundColor: theme.colors.error + "10",
			borderRadius: theme.borderRadius.sm,
			padding: dynamicTheme.spacing.md,
			marginTop: dynamicTheme.spacing.sm,
			borderLeftWidth: 4,
			borderLeftColor: theme.colors.error,
		},
		conflictTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.colors.error,
			marginBottom: dynamicTheme.spacing.sm,
		},
		conflictItem: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: theme.borderRadius.sm,
			padding: dynamicTheme.spacing.sm,
			marginBottom: dynamicTheme.spacing.xs,
			borderWidth: 1,
			borderColor: theme.colors.error + "20",
		},
		conflictHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: dynamicTheme.spacing.xs,
			gap: dynamicTheme.spacing.xs,
		},
		conflictUserText: {
			fontSize: 14,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			flex: 1,
		},
		conflictTimeText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.colors.error,
			backgroundColor: theme.colors.error + "15",
			paddingHorizontal: dynamicTheme.spacing.xs,
			paddingVertical: 2,
			borderRadius: theme.borderRadius.sm,
		},
		conflictPurposeText: {
			fontSize: 12,
			color: dynamicTheme.colors.text.secondary,
			fontStyle: "italic",
			marginBottom: 2,
		},
		conflictStatusText: {
			fontSize: 12,
			color: theme.colors.warning,
			fontWeight: "500",
		},
		conflictSubtitle: {
			fontSize: 14,
			color: dynamicTheme.colors.text.primary,
			marginBottom: dynamicTheme.spacing.sm,
			fontWeight: "500",
		},
		conflictDepartmentText: {
			fontSize: 14,
			fontWeight: "bold",
			color: dynamicTheme.colors.text.primary,
			flex: 1,
		},
		conflictDetails: {
			paddingLeft: dynamicTheme.spacing.md,
		},
		conflictAdvice: {
			fontSize: 14,
			color: theme.colors.primary,
			fontStyle: "italic",
			marginTop: dynamicTheme.spacing.sm,
			textAlign: "center",
		},
		fabContainer: {
			position: "absolute",
			bottom: 20,
			right: 20,
		},
		// Enhanced Form Styles
		progressIndicator: {
			marginBottom: dynamicTheme.spacing.lg,
			alignItems: "center",
		},
		progressBar: {
			width: "100%",
			height: 4,
			backgroundColor: dynamicTheme.colors.text.secondary + "20",
			borderRadius: 2,
			marginBottom: dynamicTheme.spacing.sm,
		},
		progressFill: {
			height: "100%",
			backgroundColor: theme.colors.primary,
			borderRadius: 2,
		},
		progressText: {
			fontSize: 14,
			color: theme.colors.primary,
			fontWeight: "600",
		},
		formSection: {
			marginBottom: dynamicTheme.spacing.xl,
		},
		sectionHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: dynamicTheme.spacing.md,
			paddingHorizontal: dynamicTheme.spacing.xs,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: dynamicTheme.colors.text.primary,
			marginLeft: dynamicTheme.spacing.sm,
			flex: 1,
		},
		optionalLabel: {
			fontSize: 14,
			color: dynamicTheme.colors.text.secondary,
			fontStyle: "italic",
		},
		// Enhanced Hall Cards
		hallSelectorContent: {
			paddingVertical: dynamicTheme.spacing.sm,
		},
		hallCard: {
			marginRight: dynamicTheme.spacing.md,
			borderRadius: dynamicTheme.borderRadius.md,
			overflow: "hidden",
			minWidth: 140,
		},
		hallCardSelected: {
			transform: [{ scale: 1.05 }],
		},
		hallCardGradient: {
			padding: dynamicTheme.spacing.md,
			borderWidth: 2,
			borderColor: "transparent",
			borderRadius: dynamicTheme.borderRadius.md,
		},
		hallCardContent: {
			alignItems: "center",
		},
		hallCardName: {
			fontSize: 16,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			textAlign: "center",
			marginBottom: dynamicTheme.spacing.xs,
		},
		hallCardNameSelected: {
			color: theme.colors.primary,
		},
		hallCardCapacity: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: dynamicTheme.spacing.xs,
		},
		hallCardCapacityText: {
			fontSize: 13,
			color: dynamicTheme.colors.text.secondary,
			marginLeft: 4,
		},
		hallCardCapacitySelected: {
			color: theme.colors.primary,
		},
		selectedIndicator: {
			position: "absolute",
			top: -8,
			right: -8,
			backgroundColor: theme.colors.primary,
			borderRadius: 12,
			padding: 2,
		},
		// Enhanced Inputs
		enhancedInput: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: dynamicTheme.borderRadius.md,
			borderWidth: 2,
			borderColor: dynamicTheme.colors.text.secondary + "20",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.05,
			shadowRadius: 4,
			elevation: 2,
		},
		inputWithIcon: {
			flexDirection: "row",
			alignItems: "center",
			padding: dynamicTheme.spacing.md,
		},
		inputIconContainer: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: theme.colors.primary + "15",
			justifyContent: "center",
			alignItems: "center",
			marginRight: dynamicTheme.spacing.sm,
		},
		enhancedInputText: {
			fontSize: 16,
			color: dynamicTheme.colors.text.primary,
			flex: 1,
		},
		// Enhanced Time Inputs
		timeInputContainer: {
			flex: 1,
		},
		timeLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			marginBottom: dynamicTheme.spacing.sm,
			textAlign: "center",
		},
		enhancedTimeInput: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: dynamicTheme.borderRadius.md,
			borderWidth: 2,
			borderColor: dynamicTheme.colors.text.secondary + "20",
			padding: dynamicTheme.spacing.md,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.05,
			shadowRadius: 4,
			elevation: 2,
		},
		timeText: {
			fontSize: 16,
			color: dynamicTheme.colors.text.primary,
			fontWeight: "600",
			marginLeft: dynamicTheme.spacing.sm,
		},
		timeSeparator: {
			alignItems: "center",
			justifyContent: "center",
			marginHorizontal: dynamicTheme.spacing.md,
			marginTop: 32, // Account for label height
		},
		timeSeparatorLine: {
			width: 20,
			height: 1,
			backgroundColor: theme.colors.primary + "30",
		},
		// Enhanced Buttons
		buttonGradient: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: dynamicTheme.spacing.md,
			borderRadius: dynamicTheme.borderRadius.md,
			gap: dynamicTheme.spacing.sm,
		},
		buttonDisabled: {
			opacity: 0.6,
		},
		// Enhanced Text Inputs
		enhancedInputContainer: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: dynamicTheme.borderRadius.md,
			borderWidth: 2,
			borderColor: dynamicTheme.colors.text.secondary + "20",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.05,
			shadowRadius: 4,
			elevation: 2,
		},
		enhancedTextInput: {
			fontSize: 16,
			color: dynamicTheme.colors.text.primary,
			padding: dynamicTheme.spacing.md,
			minHeight: 50,
		},
		// Enhanced Attendees Section
		attendeesSection: {
			alignItems: "center",
		},
		counterDisplay: {
			alignItems: "center",
			marginHorizontal: dynamicTheme.spacing.lg,
			minWidth: 60,
		},
		counterLabel: {
			fontSize: 12,
			color: dynamicTheme.colors.text.secondary,
			marginTop: 2,
		},
		counterButtonDisabled: {
			opacity: 0.5,
		},
		capacityInfo: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: dynamicTheme.spacing.md,
			paddingHorizontal: dynamicTheme.spacing.md,
			paddingVertical: dynamicTheme.spacing.sm,
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: dynamicTheme.borderRadius.sm,
			borderWidth: 1,
			borderColor: dynamicTheme.colors.text.secondary + "20",
		},
		capacityText: {
			fontSize: 14,
			marginLeft: dynamicTheme.spacing.sm,
		},
		// Enhanced Priority Section
		priorityContainer: {
			flexDirection: "row",
			gap: dynamicTheme.spacing.sm,
		},
		priorityContent: {
			flexDirection: "row",
			alignItems: "center",
			gap: dynamicTheme.spacing.xs,
		},
		// Modal Footer
		modalFooter: {
			padding: dynamicTheme.spacing.md,
			backgroundColor: dynamicTheme.colors.surface,
			borderTopWidth: 1,
			borderTopColor: dynamicTheme.colors.text.secondary + "20",
		},
		// Validation and Hint Styles
		hintContainer: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: dynamicTheme.spacing.sm,
			paddingHorizontal: dynamicTheme.spacing.md,
			paddingVertical: dynamicTheme.spacing.sm,
			backgroundColor: dynamicTheme.colors.primary + "10",
			borderRadius: dynamicTheme.borderRadius.sm,
			gap: dynamicTheme.spacing.xs,
		},
		hintText: {
			fontSize: 12,
			color: dynamicTheme.colors.text.secondary,
			lineHeight: 16,
			flex: 1,
		},
		validationError: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: dynamicTheme.spacing.sm,
			paddingHorizontal: dynamicTheme.spacing.md,
			paddingVertical: dynamicTheme.spacing.sm,
			backgroundColor: dynamicTheme.colors.error + "15",
			borderRadius: dynamicTheme.borderRadius.sm,
			borderWidth: 1,
			borderColor: dynamicTheme.colors.error + "30",
			gap: dynamicTheme.spacing.xs,
		},
		validationErrorText: {
			fontSize: 12,
			color: dynamicTheme.colors.error,
			lineHeight: 16,
			flex: 1,
			fontWeight: "500",
		},
		// Attendees Input Styles
		attendeesInput: {
			flex: 1,
			height: 50,
			paddingHorizontal: dynamicTheme.spacing.md,
			paddingVertical: dynamicTheme.spacing.sm,
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: dynamicTheme.borderRadius.md,
			borderWidth: 1,
			borderColor: dynamicTheme.colors.text.secondary + "30",
			fontSize: 16,
			color: dynamicTheme.colors.text.primary,
			textAlign: "center",
		},
		attendeesInputSuffix: {
			marginLeft: dynamicTheme.spacing.md,
			justifyContent: "center",
			alignItems: "center",
		},
		attendeesInputSuffixText: {
			fontSize: 14,
			color: dynamicTheme.colors.text.secondary,
			fontWeight: "500",
		},
		submitButton: {
			borderRadius: dynamicTheme.borderRadius.md,
			overflow: "hidden",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.15,
			shadowRadius: 8,
			elevation: 6,
		},
		submitButtonDisabled: {
			shadowOpacity: 0.05,
			elevation: 2,
		},
		submitButtonGradient: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: dynamicTheme.spacing.md + 2,
			gap: dynamicTheme.spacing.sm,
		},
		submitButtonText: {
			fontSize: 16,
			fontWeight: "700",
			color: "white",
		},
		// Booked slots styles
		bookedSlotsContainer: {
			backgroundColor: dynamicTheme.colors.surface,
			borderRadius: dynamicTheme.borderRadius.md,
			padding: dynamicTheme.spacing.md,
			marginTop: dynamicTheme.spacing.sm,
		},
		bookedSlotsTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			marginBottom: dynamicTheme.spacing.sm,
		},
		bookedSlotItem: {
			backgroundColor: dynamicTheme.colors.background,
			borderRadius: dynamicTheme.borderRadius.sm,
			padding: dynamicTheme.spacing.sm,
			marginBottom: dynamicTheme.spacing.xs,
			borderLeftWidth: 3,
			borderLeftColor: dynamicTheme.colors.warning,
		},
		bookedSlotTime: {
			flexDirection: "row",
			alignItems: "center",
			gap: dynamicTheme.spacing.xs,
			marginBottom: dynamicTheme.spacing.xs / 2,
		},
		bookedSlotTimeText: {
			fontSize: 14,
			fontWeight: "600",
			color: dynamicTheme.colors.text.primary,
			flex: 1,
		},
		bookedSlotStatusBadge: {
			paddingHorizontal: dynamicTheme.spacing.xs,
			paddingVertical: 2,
			borderRadius: dynamicTheme.borderRadius.sm / 2,
		},
		bookedSlotStatusText: {
			fontSize: 10,
			fontWeight: "600",
			color: "white",
			textTransform: "uppercase",
		},
		bookedSlotPurpose: {
			fontSize: 12,
			color: dynamicTheme.colors.text.secondary,
			marginBottom: dynamicTheme.spacing.xs / 2,
		},
		bookedSlotUser: {
			fontSize: 12,
			color: dynamicTheme.colors.text.secondary,
			fontStyle: "italic",
		},
		bookedSlotsHint: {
			flexDirection: "row",
			alignItems: "center",
			gap: dynamicTheme.spacing.xs,
			marginTop: dynamicTheme.spacing.sm,
			padding: dynamicTheme.spacing.sm,
			backgroundColor: dynamicTheme.colors.primary + "10",
			borderRadius: dynamicTheme.borderRadius.sm,
		},
		bookedSlotsHintText: {
			fontSize: 12,
			color: dynamicTheme.colors.text.secondary,
			flex: 1,
		},
		noBookedSlotsContainer: {
			flexDirection: "row",
			alignItems: "center",
			gap: dynamicTheme.spacing.sm,
			padding: dynamicTheme.spacing.md,
			backgroundColor: dynamicTheme.colors.success + "10",
			borderRadius: dynamicTheme.borderRadius.sm,
			marginTop: dynamicTheme.spacing.sm,
		},
		noBookedSlotsText: {
			fontSize: 14,
			color: dynamicTheme.colors.success,
			fontWeight: "500",
			flex: 1,
		},
	});

export default BookingScreen;
