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

interface BookingScreenProps {
	navigation: any;
}

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
			return theme.colors.text.secondary;
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
	const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

const formatTime = (timeString: string): string => {
	// timeString is already in HH:MM format (24-hour)
	return timeString;
};

const BookingScreen: React.FC<BookingScreenProps> = ({ navigation }) => {
	const { user } = useAuthStore();
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
				smartBookingService.getUserBookings(user.id),
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

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: theme.spacing.md,
	},
	loadingText: {
		fontSize: 16,
		color: theme.colors.text.secondary,
	},
	header: {
		flexDirection: "row",
		justifyContent: "flex-start",
		alignItems: "center",
		padding: theme.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E5E7",
		backgroundColor: theme.colors.surface,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: "700",
		color: theme.colors.text.primary,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: theme.spacing.md,
		gap: theme.spacing.md,
	},
	bookingCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.md,
		padding: theme.spacing.md,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	bookingHeader: {
		marginBottom: theme.spacing.sm,
	},
	bookingTitleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: theme.spacing.xs,
	},
	hallName: {
		fontSize: 18,
		fontWeight: "600",
		color: theme.colors.text.primary,
		flex: 1,
		marginRight: theme.spacing.sm,
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xs,
		borderRadius: theme.borderRadius.sm,
		gap: 4,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "600",
		color: theme.colors.surface,
	},
	autoApprovedBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginTop: theme.spacing.xs,
	},
	autoApprovedText: {
		fontSize: 12,
		color: theme.colors.warning,
		fontWeight: "500",
	},
	bookingDetails: {
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.md,
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
	bookingActions: {
		flexDirection: "row",
		gap: theme.spacing.sm,
		borderTopWidth: 1,
		borderTopColor: "#F0F0F0",
		paddingTop: theme.spacing.md,
	},
	actionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: theme.spacing.sm,
		borderRadius: theme.borderRadius.sm,
		gap: 4,
	},
	editButton: {
		backgroundColor: "#F0F8FF",
		borderWidth: 1,
		borderColor: theme.colors.primary,
	},
	editButtonText: {
		color: theme.colors.primary,
		fontWeight: "600",
		fontSize: 14,
	},
	cancelButton: {
		backgroundColor: "#FFF5F5",
		borderWidth: 1,
		borderColor: theme.colors.error,
	},
	cancelButtonText: {
		color: theme.colors.error,
		fontWeight: "600",
		fontSize: 14,
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: theme.spacing.xl * 2,
		gap: theme.spacing.md,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: theme.colors.text.primary,
	},
	emptyMessage: {
		fontSize: 16,
		color: theme.colors.text.secondary,
		textAlign: "center",
		lineHeight: 24,
	},
	emptyButton: {
		backgroundColor: theme.colors.primary,
		paddingHorizontal: theme.spacing.lg,
		paddingVertical: theme.spacing.md,
		borderRadius: theme.borderRadius.sm,
		marginTop: theme.spacing.sm,
	},
	emptyButtonText: {
		color: theme.colors.surface,
		fontWeight: "600",
		fontSize: 16,
	},

	// Modal Styles
	modalContainer: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: theme.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E5E7",
		backgroundColor: theme.colors.surface,
	},
	modalCancelText: {
		fontSize: 16,
		color: theme.colors.primary,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: theme.colors.text.primary,
	},
	modalSaveText: {
		fontSize: 16,
		fontWeight: "600",
		color: theme.colors.primary,
	},
	modalSaveTextDisabled: {
		color: theme.colors.text.secondary,
	},
	modalContent: {
		flex: 1,
		padding: theme.spacing.md,
	},
	formGroup: {
		marginBottom: theme.spacing.lg,
	},
	formLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: theme.colors.text.primary,
		marginBottom: theme.spacing.sm,
	},
	hallSelector: {
		flexDirection: "row",
	},
	hallOption: {
		backgroundColor: "#F8F9FA",
		borderWidth: 1,
		borderColor: "#E9ECEF",
		borderRadius: theme.borderRadius.sm,
		padding: theme.spacing.md,
		marginRight: theme.spacing.sm,
		minWidth: 120,
	},
	hallOptionSelected: {
		backgroundColor: theme.colors.primary,
		borderColor: theme.colors.primary,
	},
	hallOptionText: {
		fontSize: 14,
		fontWeight: "600",
		color: theme.colors.text.primary,
		textAlign: "center",
	},
	hallOptionTextSelected: {
		color: theme.colors.surface,
	},
	hallOptionCapacity: {
		fontSize: 12,
		color: theme.colors.text.secondary,
		textAlign: "center",
		marginTop: 2,
	},
	hallOptionCapacitySelected: {
		color: "rgba(255, 255, 255, 0.8)",
	},
	dateInput: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: theme.colors.surface,
		borderWidth: 1,
		borderColor: "#E9ECEF",
		borderRadius: theme.borderRadius.sm,
		padding: theme.spacing.md,
	},
	dateInputText: {
		fontSize: 16,
		color: theme.colors.text.primary,
	},
	placeholderText: {
		color: theme.colors.text.secondary,
	},
	timeRow: {
		flexDirection: "row",
		gap: theme.spacing.md,
	},
	timeInput: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: theme.colors.surface,
		borderWidth: 1,
		borderColor: "#E9ECEF",
		borderRadius: theme.borderRadius.sm,
		padding: theme.spacing.md,
	},
	timeInputText: {
		fontSize: 16,
		color: theme.colors.text.primary,
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
	checkAvailabilityButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#F0F8FF",
		borderWidth: 1,
		borderColor: theme.colors.primary,
		borderRadius: theme.borderRadius.sm,
		padding: theme.spacing.md,
		gap: theme.spacing.sm,
	},
	checkAvailabilityText: {
		fontSize: 16,
		fontWeight: "600",
		color: theme.colors.primary,
	},
	availabilityResult: {
		marginTop: theme.spacing.md,
		padding: theme.spacing.md,
		borderWidth: 1,
		borderRadius: theme.borderRadius.sm,
		backgroundColor: theme.colors.surface,
	},
	availabilityHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.sm,
	},
	availabilityText: {
		fontSize: 16,
		fontWeight: "600",
	},
	suggestedSlots: {
		marginTop: theme.spacing.sm,
	},
	suggestedSlotsTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: theme.colors.text.primary,
		marginBottom: theme.spacing.sm,
	},
	suggestedSlot: {
		backgroundColor: "#F8F9FA",
		borderRadius: theme.borderRadius.sm,
		padding: theme.spacing.sm,
		marginBottom: theme.spacing.xs,
	},
	suggestedSlotText: {
		fontSize: 14,
		color: theme.colors.text.primary,
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
	textInput: {
		backgroundColor: theme.colors.surface,
		borderWidth: 1,
		borderColor: "#E9ECEF",
		borderRadius: theme.borderRadius.sm,
		padding: theme.spacing.md,
		fontSize: 16,
		color: theme.colors.text.primary,
	},
	textArea: {
		height: 80,
		textAlignVertical: "top",
	},
	attendeesCounter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: theme.spacing.lg,
	},
	counterButton: {
		backgroundColor: "#F0F8FF",
		borderWidth: 1,
		borderColor: theme.colors.primary,
		borderRadius: 20,
		width: 40,
		height: 40,
		justifyContent: "center",
		alignItems: "center",
	},
	counterText: {
		fontSize: 18,
		fontWeight: "600",
		color: theme.colors.text.primary,
		minWidth: 40,
		textAlign: "center",
	},
	prioritySelector: {
		flexDirection: "row",
		gap: theme.spacing.sm,
	},
	priorityOption: {
		flex: 1,
		backgroundColor: "#F8F9FA",
		borderWidth: 1,
		borderColor: "#E9ECEF",
		borderRadius: theme.borderRadius.sm,
		paddingVertical: theme.spacing.md,
		alignItems: "center",
	},
	priorityOptionSelected: {
		backgroundColor: theme.colors.primary,
		borderColor: theme.colors.primary,
	},
	priorityOptionText: {
		fontSize: 14,
		fontWeight: "600",
		color: theme.colors.text.primary,
	},
	priorityOptionTextSelected: {
		color: theme.colors.surface,
	},

	// Floating Action Button
	fabContainer: {
		position: "absolute",
		bottom: 24,
		right: 20,
		zIndex: 1000,
	},

	fab: {
		width: 64,
		height: 64,
		borderRadius: 32,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 16,
		elevation: 12,
	},

	fabGradient: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
});

export default BookingScreen;
