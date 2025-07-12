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
		setEditingBooking(booking);
		setFormData({
			hall_id: booking.hall_id,
			booking_date: booking.booking_date,
			start_time: booking.start_time,
			end_time: booking.end_time,
			purpose: booking.purpose,
			description: booking.description || "",
			attendees_count: booking.attendees_count,
			equipment_needed: booking.equipment_needed || [],
			special_requirements: booking.special_requirements || "",
			priority: booking.priority,
		});
		setShowEditModal(true);
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
		resetForm();
		setShowCreateModal(true);
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
								resetForm();
								setShowCreateModal(true);
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

					<ScrollView style={styles.modalContent}>
						{/* Hall Selection */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Hall *</Text>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								style={styles.hallSelector}
							>
								{halls.map((hall) => (
									<TouchableOpacity
										key={hall.id}
										style={[
											styles.hallOption,
											formData.hall_id === hall.id && styles.hallOptionSelected,
										]}
										onPress={() => {
											setFormData((prev) => ({ ...prev, hall_id: hall.id }));
											if (
												formData.booking_date &&
												formData.start_time &&
												formData.end_time
											) {
												checkAvailability();
											}
										}}
									>
										<Text
											style={[
												styles.hallOptionText,
												formData.hall_id === hall.id &&
													styles.hallOptionTextSelected,
											]}
										>
											{hall.name}
										</Text>
										<Text
											style={[
												styles.hallOptionCapacity,
												formData.hall_id === hall.id &&
													styles.hallOptionCapacitySelected,
											]}
										>
											{hall.capacity} people
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>

						{/* Date Selection */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Date *</Text>
							<TouchableOpacity
								style={styles.dateInput}
								onPress={() => {
									setTempDate(
										formData.booking_date
											? formatDateForInput(formData.booking_date)
											: new Date()
									);
									setShowDatePicker(true);
								}}
							>
								<Text
									style={[
										styles.dateInputText,
										!formData.booking_date && styles.placeholderText,
									]}
								>
									{formData.booking_date
										? formatDate(formData.booking_date)
										: "Select date"}
								</Text>
								<Ionicons
									name="calendar"
									size={20}
									color={theme.colors.text.secondary}
								/>
							</TouchableOpacity>
						</View>

						{/* Time Selection */}
						<View style={styles.timeRow}>
							<View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
								<Text style={styles.formLabel}>Start Time *</Text>
								<TouchableOpacity
									style={styles.timeInput}
									onPress={() => {
										const [hours, minutes] = formData.start_time
											.split(":")
											.map(Number);
										const date = new Date();
										date.setHours(hours, minutes);
										setTempDate(date);
										setShowStartTimePicker(true);
									}}
								>
									<Text style={styles.timeInputText}>
										{formData.start_time}
									</Text>
									<Ionicons
										name="time"
										size={20}
										color={theme.colors.text.secondary}
									/>
								</TouchableOpacity>
							</View>
							<View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
								<Text style={styles.formLabel}>End Time *</Text>
								<TouchableOpacity
									style={styles.timeInput}
									onPress={() => {
										const [hours, minutes] = formData.end_time
											.split(":")
											.map(Number);
										const date = new Date();
										date.setHours(hours, minutes);
										setTempDate(date);
										setShowEndTimePicker(true);
									}}
								>
									<Text style={styles.timeInputText}>{formData.end_time}</Text>
									<Ionicons
										name="time"
										size={20}
										color={theme.colors.text.secondary}
									/>
								</TouchableOpacity>
							</View>
						</View>

						{/* Availability Check */}
						{formData.hall_id &&
							formData.booking_date &&
							formData.start_time &&
							formData.end_time && (
								<View style={styles.formGroup}>
									<TouchableOpacity
										style={styles.checkAvailabilityButton}
										onPress={checkAvailability}
										disabled={checkingAvailability}
									>
										{checkingAvailability ? (
											<ActivityIndicator
												size="small"
												color={theme.colors.primary}
											/>
										) : (
											<Ionicons
												name="search"
												size={16}
												color={theme.colors.primary}
											/>
										)}
										<Text style={styles.checkAvailabilityText}>
											{checkingAvailability
												? "Checking..."
												: "Check Availability"}
										</Text>
									</TouchableOpacity>

									{availabilityCheck && (
										<View
											style={[
												styles.availabilityResult,
												{
													borderColor: availabilityCheck.is_available
														? theme.colors.success
														: theme.colors.error,
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

						{/* Purpose */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Purpose *</Text>
							<TextInput
								style={styles.textInput}
								value={formData.purpose}
								onChangeText={(text) =>
									setFormData((prev) => ({ ...prev, purpose: text }))
								}
								placeholder="e.g., Team Meeting, Workshop"
								placeholderTextColor={theme.colors.text.secondary}
							/>
						</View>

						{/* Description */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Description</Text>
							<TextInput
								style={[styles.textInput, styles.textArea]}
								value={formData.description}
								onChangeText={(text) =>
									setFormData((prev) => ({ ...prev, description: text }))
								}
								placeholder="Additional details about the booking"
								placeholderTextColor={theme.colors.text.secondary}
								multiline
								numberOfLines={3}
							/>
						</View>

						{/* Attendees Count */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Number of Attendees</Text>
							<View style={styles.attendeesCounter}>
								<TouchableOpacity
									style={styles.counterButton}
									onPress={() =>
										setFormData((prev) => ({
											...prev,
											attendees_count: Math.max(1, prev.attendees_count - 1),
										}))
									}
								>
									<Ionicons
										name="remove"
										size={20}
										color={theme.colors.primary}
									/>
								</TouchableOpacity>
								<Text style={styles.counterText}>
									{formData.attendees_count}
								</Text>
								<TouchableOpacity
									style={styles.counterButton}
									onPress={() =>
										setFormData((prev) => ({
											...prev,
											attendees_count: prev.attendees_count + 1,
										}))
									}
								>
									<Ionicons name="add" size={20} color={theme.colors.primary} />
								</TouchableOpacity>
							</View>
						</View>

						{/* Priority */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Priority</Text>
							<View style={styles.prioritySelector}>
								{(["low", "medium", "high"] as const).map((priority) => (
									<TouchableOpacity
										key={priority}
										style={[
											styles.priorityOption,
											formData.priority === priority &&
												styles.priorityOptionSelected,
										]}
										onPress={() =>
											setFormData((prev) => ({ ...prev, priority }))
										}
									>
										<Text
											style={[
												styles.priorityOptionText,
												formData.priority === priority &&
													styles.priorityOptionTextSelected,
											]}
										>
											{priority.charAt(0).toUpperCase() + priority.slice(1)}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>
					</ScrollView>
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
		fabContainer: {
			position: "absolute",
			bottom: 20,
			right: 20,
		},
	});

export default BookingScreen;
