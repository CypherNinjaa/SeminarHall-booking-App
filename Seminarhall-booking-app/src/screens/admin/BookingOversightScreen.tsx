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
	TextInput,
	Alert,
	FlatList,
	Modal,
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
import {
	bookingOversightService,
	BookingDetails,
	FilterOptions,
} from "../../services/bookingOversightService";

const BookingOversightScreen: React.FC = () => {
	const { isDark } = useTheme();
	// Helper function to parse DDMMYYYY date format
	const parseBookingDate = (dateStr: string): Date => {
		const day = parseInt(dateStr.substring(0, 2), 10);
		const month = parseInt(dateStr.substring(2, 4), 10) - 1;
		const year = parseInt(dateStr.substring(4, 8), 10);
		return new Date(year, month, day);
	};
	const [bookings, setBookings] = useState<BookingDetails[]>([]);
	const [filteredBookings, setFilteredBookings] = useState<BookingDetails[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filters, setFilters] = useState<Partial<FilterOptions>>({
		status: "all",
		date_range: "this_week",
		hall: "all",
		priority: "all",
	});
	const [showFilters, setShowFilters] = useState(false);

	// Add states for reason modal
	const [showReasonModal, setShowReasonModal] = useState(false);
	const [reasonModalData, setReasonModalData] = useState<{
		bookingId: string;
		action: "reject" | "cancel";
		bookingTitle: string;
	} | null>(null);
	const [reason, setReason] = useState("");
	const [isSubmittingReason, setIsSubmittingReason] = useState(false);

	const loadBookings = useCallback(async () => {
		try {
			setLoading(true);
			// Use real service call
			const bookingsData = await bookingOversightService.getBookings(filters);
			setBookings(bookingsData);
			setFilteredBookings(bookingsData);
		} catch (error) {
			console.error("Error loading bookings:", error);
			Alert.alert("Error", "Failed to load bookings. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [filters]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadBookings();
		setRefreshing(false);
	}, [loadBookings]);

	useFocusEffect(
		useCallback(() => {
			loadBookings();
		}, [loadBookings])
	);

	// Filter and search functionality
	useEffect(() => {
		let filtered = [...bookings];
		// Search
		if (searchQuery.trim()) {
			filtered = filtered.filter(
				(booking) =>
					booking.hall_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					booking.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					booking.purpose.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}
		// Status
		if (filters.status !== "all") {
			filtered = filtered.filter(
				(booking) => booking.status === filters.status
			);
		}
		// Priority
		if (filters.priority !== "all") {
			filtered = filtered.filter(
				(booking) => booking.priority === filters.priority
			);
		}
		// Date range
		const today = new Date();
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - today.getDay());
		const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
		if (filters.date_range !== "all") {
			filtered = filtered.filter((booking) => {
				const bookingDate = parseBookingDate(booking.booking_date);
				switch (filters.date_range) {
					case "today":
						return bookingDate.toDateString() === today.toDateString();
					case "this_week":
						return bookingDate >= startOfWeek;
					case "this_month":
						return bookingDate >= startOfMonth;
					default:
						return true;
				}
			});
		}
		setFilteredBookings(filtered);
	}, [bookings, searchQuery, filters]);

	const handleBookingAction = async (
		bookingId: string,
		action: "approve" | "reject" | "cancel" | "complete",
		bookingTitle?: string
	) => {
		try {
			// For reject and cancel actions, show reason modal
			if (action === "reject" || action === "cancel") {
				setReasonModalData({
					bookingId,
					action,
					bookingTitle: bookingTitle || "Unknown Booking",
				});
				setReason("");
				setShowReasonModal(true);
				return;
			}

			let actionText: string;
			let successMessage: string;

			switch (action) {
				case "approve":
					await bookingOversightService.updateBookingStatus(
						bookingId,
						"approved"
					);
					actionText = "approve";
					successMessage = "Booking approved successfully!";
					break;
				case "complete":
					await bookingOversightService.completeBooking(bookingId);
					actionText = "complete";
					successMessage = "Booking marked as completed!";
					break;
				default:
					throw new Error("Invalid action");
			}

			Alert.alert("Success", successMessage, [
				{ text: "OK", onPress: () => loadBookings() },
			]);
		} catch (error) {
			console.error(`Error ${action}ing booking:`, error);
			Alert.alert("Error", `Failed to ${action} booking. Please try again.`);
		}
	};

	// Handle reason submission
	const handleReasonSubmit = async () => {
		if (!reasonModalData) return;

		try {
			setIsSubmittingReason(true);

			const { bookingId, action } = reasonModalData;

			if (action === "reject") {
				await bookingOversightService.updateBookingStatus(
					bookingId,
					"rejected",
					undefined,
					reason.trim() || "No reason provided"
				);
			} else if (action === "cancel") {
				await bookingOversightService.updateBookingStatus(
					bookingId,
					"cancelled",
					reason.trim() || "No reason provided"
				);
			}

			const successMessage =
				action === "reject"
					? "Booking rejected successfully!"
					: "Booking cancelled successfully!";

			setShowReasonModal(false);
			setReasonModalData(null);
			setReason("");

			Alert.alert("Success", successMessage, [
				{ text: "OK", onPress: () => loadBookings() },
			]);
		} catch (error) {
			console.error(`Error ${reasonModalData.action}ing booking:`, error);
			Alert.alert(
				"Error",
				`Failed to ${reasonModalData.action} booking. Please try again.`
			);
		} finally {
			setIsSubmittingReason(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return Colors.warning.main;
			case "approved":
				return Colors.success.main;
			case "rejected":
				return Colors.error.main;
			case "cancelled":
				return Colors.text.secondary;
			default:
				return Colors.text.secondary;
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "high":
				return Colors.error.main;
			case "medium":
				return Colors.warning.main;
			case "low":
				return Colors.success.main;
			default:
				return Colors.text.secondary;
		}
	};

	// Redesigned booking card
	const renderBookingCard = ({ item }: { item: BookingDetails }) => (
		<View
			style={[
				styles.bookingCard,
				isDark && styles.bookingCardDark,
				{
					shadowColor: Colors.primary[500],
					shadowOpacity: 0.12,
					shadowRadius: 12,
					elevation: 4,
				},
			]}
			accessibilityLabel={`Booking for ${item.hall_name} by ${item.user_name}`}
			accessibilityHint={`Purpose: ${item.purpose}`}
		>
			<View style={styles.cardHeaderRow}>
				<View style={styles.cardTitleCol}>
					<Text
						style={[styles.hallName, isDark && styles.hallNameDark]}
						numberOfLines={1}
					>
						{item.hall_name}
					</Text>
					<Text
						style={[styles.purpose, isDark && styles.purposeDark]}
						numberOfLines={2}
					>
						{item.purpose}
					</Text>
				</View>
				<View style={styles.statusPillRow}>
					<View
						style={[
							styles.statusPill,
							{ backgroundColor: getStatusColor(item.status) },
						]}
						accessibilityLabel={`Status: ${item.status}`}
					>
						<Text style={styles.statusPillText}>
							{item.status.toUpperCase()}
						</Text>
					</View>
					<View
						style={[
							styles.priorityPill,
							{ backgroundColor: getPriorityColor(item.priority) },
						]}
						accessibilityLabel={`Priority: ${item.priority}`}
					>
						<Text style={styles.priorityPillText}>
							{item.priority.toUpperCase()}
						</Text>
					</View>
				</View>
			</View>
			<View style={styles.cardDetailsRow}>
				<Ionicons
					name="person-outline"
					size={16}
					color={isDark ? Colors.dark.text.secondary : Colors.text.secondary}
				/>
				<Text style={[styles.detailText, isDark && styles.detailTextDark]}>
					{item.user_name}
				</Text>
				<Ionicons
					name="calendar-outline"
					size={16}
					color={isDark ? Colors.dark.text.secondary : Colors.text.secondary}
					style={{ marginLeft: 12 }}
				/>
				<Text style={[styles.detailText, isDark && styles.detailTextDark]}>
					{parseBookingDate(item.booking_date).toLocaleDateString()} •{" "}
					{item.start_time} - {item.end_time}
				</Text>
			</View>
			<View style={styles.cardDetailsRow}>
				<Ionicons
					name="people-outline"
					size={16}
					color={isDark ? Colors.dark.text.secondary : Colors.text.secondary}
				/>
				<Text style={[styles.detailText, isDark && styles.detailTextDark]}>
					{item.attendees_count} attendees
				</Text>
				{item.equipment_needed && item.equipment_needed.length > 0 && (
					<>
						<Ionicons
							name="construct-outline"
							size={16}
							color={
								isDark ? Colors.dark.text.secondary : Colors.text.secondary
							}
							style={{ marginLeft: 12 }}
						/>
						<Text style={[styles.detailText, isDark && styles.detailTextDark]}>
							{item.equipment_needed.join(", ")}
						</Text>
					</>
				)}
			</View>
			{/* Dynamic action buttons based on status */}
			{item.status === "pending" && (
				<View style={styles.actionButtonsRow}>
					<TouchableOpacity
						style={[styles.actionButton, styles.rejectButton]}
						onPress={() =>
							handleBookingAction(
								item.id,
								"reject",
								`${item.hall_name} - ${item.purpose}`
							)
						}
						accessibilityLabel="Reject booking"
						accessibilityHint="Reject this booking request"
					>
						<Ionicons name="close" size={18} color={Colors.text.inverse} />
						<Text style={styles.actionButtonText}>Reject</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionButton, styles.approveButton]}
						onPress={() => handleBookingAction(item.id, "approve")}
						accessibilityLabel="Approve booking"
						accessibilityHint="Approve this booking request"
					>
						<Ionicons name="checkmark" size={18} color={Colors.text.inverse} />
						<Text style={styles.actionButtonText}>Approve</Text>
					</TouchableOpacity>
				</View>
			)}
			{item.status === "approved" && (
				<View style={styles.actionButtonsRow}>
					<TouchableOpacity
						style={[styles.actionButton, styles.rejectButton]}
						onPress={() =>
							handleBookingAction(
								item.id,
								"reject",
								`${item.hall_name} - ${item.purpose}`
							)
						}
						accessibilityLabel="Reject booking"
						accessibilityHint="Reject this approved booking"
					>
						<Ionicons name="close" size={18} color={Colors.text.inverse} />
						<Text style={styles.actionButtonText}>Reject</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionButton, styles.cancelButton]}
						onPress={() =>
							handleBookingAction(
								item.id,
								"cancel",
								`${item.hall_name} - ${item.purpose}`
							)
						}
						accessibilityLabel="Cancel booking"
						accessibilityHint="Cancel this approved booking"
					>
						<Ionicons name="ban" size={18} color={Colors.text.inverse} />
						<Text style={styles.actionButtonText}>Cancel</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionButton, styles.completeButton]}
						onPress={() => handleBookingAction(item.id, "complete")}
						accessibilityLabel="Mark complete"
						accessibilityHint="Mark this booking as completed"
					>
						<Ionicons
							name="checkmark-done"
							size={18}
							color={Colors.text.inverse}
						/>
						<Text style={styles.actionButtonText}>Complete</Text>
					</TouchableOpacity>
				</View>
			)}
			{/* Allow cancel for any active booking (pending or approved) */}
			{item.status === "pending" && (
				<View style={styles.actionButtonsRow}>
					<TouchableOpacity
						style={[styles.actionButton, styles.cancelButton]}
						onPress={() =>
							handleBookingAction(
								item.id,
								"cancel",
								`${item.hall_name} - ${item.purpose}`
							)
						}
						accessibilityLabel="Cancel booking"
						accessibilityHint="Cancel this booking request"
					>
						<Ionicons name="ban" size={18} color={Colors.text.inverse} />
						<Text style={styles.actionButtonText}>Cancel</Text>
					</TouchableOpacity>
				</View>
			)}
			{(item.status === "rejected" ||
				item.status === "cancelled" ||
				item.status === "completed") && (
				<View style={styles.statusInfoRow}>
					<Text style={[styles.statusText, isDark && styles.statusTextDark]}>
						Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
					</Text>
					{item.cancelled_at && (
						<Text
							style={[styles.timestampText, isDark && styles.timestampTextDark]}
						>
							Cancelled: {new Date(item.cancelled_at).toLocaleDateString()}
						</Text>
					)}
					{item.completed_at && (
						<Text
							style={[styles.timestampText, isDark && styles.timestampTextDark]}
						>
							Completed: {new Date(item.completed_at).toLocaleDateString()}
						</Text>
					)}
				</View>
			)}
		</View>
	);

	// Redesigned filter chips
	const renderFilterChips = () => (
		<View style={styles.filterChipsRow}>
			<TouchableOpacity
				style={[
					styles.filterPill,
					filters.status !== "all" && styles.filterPillActive,
					isDark && styles.filterPillDark,
				]}
				onPress={() =>
					setFilters((prev) => ({
						...prev,
						status: prev.status === "all" ? "pending" : "all",
					}))
				}
				accessibilityLabel="Filter by status"
				accessibilityHint="Toggle status filter"
			>
				<Ionicons
					name="alert-circle-outline"
					size={16}
					color={
						filters.status !== "all"
							? Colors.primary[500]
							: Colors.text.secondary
					}
				/>
				<Text
					style={[
						styles.filterPillText,
						filters.status !== "all" && styles.filterPillTextActive,
						isDark && styles.filterPillTextDark,
					]}
				>
					Status: {filters.status}
				</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[
					styles.filterPill,
					filters.date_range !== "all" && styles.filterPillActive,
					isDark && styles.filterPillDark,
				]}
				onPress={() => {
					const ranges = ["all", "today", "this_week", "this_month"];
					const currentIndex = ranges.indexOf(filters.date_range || "all");
					const nextRange = ranges[
						(currentIndex + 1) % ranges.length
					] as FilterOptions["date_range"];
					setFilters((prev) => ({ ...prev, date_range: nextRange }));
				}}
				accessibilityLabel="Filter by date range"
				accessibilityHint="Cycle through date range filters"
			>
				<Ionicons
					name="calendar-outline"
					size={16}
					color={
						filters.date_range !== "all"
							? Colors.primary[500]
							: Colors.text.secondary
					}
				/>
				<Text
					style={[
						styles.filterPillText,
						filters.date_range !== "all" && styles.filterPillTextActive,
						isDark && styles.filterPillTextDark,
					]}
				>
					{filters.date_range?.replace("_", " ") || "all"}
				</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[
					styles.filterPill,
					filters.priority !== "all" && styles.filterPillActive,
					isDark && styles.filterPillDark,
				]}
				onPress={() => {
					const priorities = ["all", "high", "medium", "low"];
					const currentIndex = priorities.indexOf(filters.priority || "all");
					const nextPriority = priorities[
						(currentIndex + 1) % priorities.length
					] as FilterOptions["priority"];
					setFilters((prev) => ({ ...prev, priority: nextPriority }));
				}}
				accessibilityLabel="Filter by priority"
				accessibilityHint="Cycle through priority filters"
			>
				<Ionicons
					name="star-outline"
					size={16}
					color={
						filters.priority !== "all"
							? Colors.primary[500]
							: Colors.text.secondary
					}
				/>
				<Text
					style={[
						styles.filterPillText,
						filters.priority !== "all" && styles.filterPillTextActive,
						isDark && styles.filterPillTextDark,
					]}
				>
					Priority: {filters.priority}
				</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />
			{/* Redesigned Header */}
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
				<Text style={styles.headerTitle}>Booking Oversight</Text>
				<Text style={styles.headerSubtitle}>
					{filteredBookings.length} booking
					{filteredBookings.length !== 1 ? "s" : ""}
				</Text>
			</LinearGradient>
			{/* Statistics Bar - Redesigned */}
			<View style={styles.statsBarRow}>
				<View style={styles.statCard}>
					<Ionicons name="time-outline" size={20} color={Colors.warning.main} />
					<Text style={[styles.statNumber, { color: Colors.warning.main }]}>
						{bookings.filter((b) => b.status === "pending").length}
					</Text>
					<Text style={styles.statLabel}>Pending</Text>
				</View>
				<View style={styles.statCard}>
					<Ionicons
						name="checkmark-circle-outline"
						size={20}
						color={Colors.success.main}
					/>
					<Text style={[styles.statNumber, { color: Colors.success.main }]}>
						{bookings.filter((b) => b.status === "approved").length}
					</Text>
					<Text style={styles.statLabel}>Approved</Text>
				</View>
				<View style={styles.statCard}>
					<Ionicons
						name="close-circle-outline"
						size={20}
						color={Colors.error.main}
					/>
					<Text style={[styles.statNumber, { color: Colors.error.main }]}>
						{bookings.filter((b) => b.status === "rejected").length}
					</Text>
					<Text style={styles.statLabel}>Rejected</Text>
				</View>
			</View>
			{/* Search and Filters - Redesigned */}
			<View
				style={[styles.searchContainer, isDark && styles.searchContainerDark]}
			>
				<View style={[styles.searchBar, isDark && styles.searchBarDark]}>
					<Ionicons
						name="search"
						size={20}
						color={isDark ? Colors.dark.text.secondary : Colors.text.secondary}
					/>
					<TextInput
						style={[styles.searchInput, isDark && styles.searchInputDark]}
						placeholder="Search bookings..."
						placeholderTextColor={
							isDark ? Colors.dark.text.secondary : Colors.text.secondary
						}
						value={searchQuery}
						onChangeText={setSearchQuery}
						accessibilityLabel="Search bookings"
						accessibilityHint="Type to search bookings by hall, user, or purpose"
						returnKeyType="search"
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity
							onPress={() => setSearchQuery("")}
							accessibilityLabel="Clear search"
						>
							<Ionicons
								name="close-circle"
								size={20}
								color={
									isDark ? Colors.dark.text.secondary : Colors.text.secondary
								}
							/>
						</TouchableOpacity>
					)}
				</View>
			</View>
			{/* Filter Chips - Redesigned */}
			{renderFilterChips()}
			{/* Filter Hint */}
			<View style={styles.filterHintContainer}>
				<Text
					style={[styles.filterHintText, isDark && styles.filterHintTextDark]}
				>
					💡 Tap filters to change options
				</Text>
			</View>
			{/* Bookings List */}
			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary[500]} />
					<Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
						Loading bookings...
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredBookings}
					renderItem={renderBookingCard}
					keyExtractor={(item) => item.id}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContainer}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Ionicons
								name="document-text-outline"
								size={64}
								color={
									isDark ? Colors.dark.text.secondary : Colors.text.secondary
								}
							/>
							<Text
								style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}
							>
								No bookings found
							</Text>
							<Text
								style={[styles.emptyMessage, isDark && styles.emptyMessageDark]}
							>
								Try adjusting your search or filters
							</Text>
						</View>
					}
				/>
			)}

			{/* Reason Modal */}
			<Modal
				visible={showReasonModal}
				transparent={true}
				animationType="slide"
				onRequestClose={() => {
					if (!isSubmittingReason) {
						setShowReasonModal(false);
						setReasonModalData(null);
						setReason("");
					}
				}}
			>
				<View style={styles.modalOverlay}>
					<View
						style={[styles.modalContainer, isDark && styles.modalContainerDark]}
					>
						<View style={styles.modalHeader}>
							<Text
								style={[styles.modalTitle, isDark && styles.modalTitleDark]}
							>
								{reasonModalData?.action === "reject"
									? "Reject Booking"
									: "Cancel Booking"}
							</Text>
							<TouchableOpacity
								style={styles.modalCloseButton}
								onPress={() => {
									if (!isSubmittingReason) {
										setShowReasonModal(false);
										setReasonModalData(null);
										setReason("");
									}
								}}
								disabled={isSubmittingReason}
							>
								<Ionicons
									name="close"
									size={24}
									color={
										isDark ? Colors.dark.text.secondary : Colors.text.secondary
									}
								/>
							</TouchableOpacity>
						</View>

						<Text
							style={[styles.modalSubtitle, isDark && styles.modalSubtitleDark]}
						>
							{reasonModalData?.bookingTitle}
						</Text>

						<Text style={[styles.modalLabel, isDark && styles.modalLabelDark]}>
							Please provide a reason for{" "}
							{reasonModalData?.action === "reject"
								? "rejecting"
								: "cancelling"}{" "}
							this booking:
						</Text>

						<TextInput
							style={[styles.reasonInput, isDark && styles.reasonInputDark]}
							placeholder={`Enter reason for ${reasonModalData?.action}...`}
							placeholderTextColor={
								isDark ? Colors.dark.text.secondary : Colors.text.secondary
							}
							value={reason}
							onChangeText={setReason}
							multiline
							numberOfLines={4}
							textAlignVertical="top"
							editable={!isSubmittingReason}
						/>

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[styles.modalButton, styles.modalCancelButton]}
								onPress={() => {
									if (!isSubmittingReason) {
										setShowReasonModal(false);
										setReasonModalData(null);
										setReason("");
									}
								}}
								disabled={isSubmittingReason}
							>
								<Text style={styles.modalCancelButtonText}>Cancel</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.modalButton,
									reasonModalData?.action === "reject"
										? styles.modalRejectButton
										: styles.modalCancelActionButton,
									(!reason.trim() || isSubmittingReason) &&
										styles.modalButtonDisabled,
								]}
								onPress={handleReasonSubmit}
								disabled={!reason.trim() || isSubmittingReason}
							>
								{isSubmittingReason ? (
									<ActivityIndicator color="white" size="small" />
								) : (
									<Text style={styles.modalActionButtonText}>
										{reasonModalData?.action === "reject" ? "Reject" : "Cancel"}{" "}
										Booking
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
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

	// Search
	searchContainer: {
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[4],
		backgroundColor: Colors.background.primary,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.main,
	},
	searchContainerDark: {
		backgroundColor: Colors.dark.background.primary,
		borderBottomColor: Colors.dark.border.main,
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		...Shadows.sm,
	},
	searchBarDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	searchInput: {
		flex: 1,
		marginLeft: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
	},
	searchInputDark: {
		color: Colors.dark.text.primary,
	},

	// Filter Chips
	filterChips: {
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[3],
	},
	filterChip: {
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[2],
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.full,
		marginRight: Spacing[3],
		borderWidth: 1,
		borderColor: Colors.border.main,
	},
	filterChipDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.main,
	},
	activeFilterChip: {
		backgroundColor: Colors.primary[500],
		borderColor: Colors.primary[500],
	},
	filterChipText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		fontWeight: Typography.fontWeight.medium,
		textTransform: "capitalize",
	},
	filterChipTextDark: {
		color: Colors.dark.text.secondary,
	},
	activeFilterChipText: {
		color: Colors.text.inverse,
	},

	// Stats Bar
	statsBar: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingVertical: Spacing[4],
		backgroundColor: Colors.background.secondary,
		marginHorizontal: Spacing[5],
		borderRadius: BorderRadius.md,
		marginBottom: Spacing[4],
		...Shadows.sm,
	},
	statsBarDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	statItem: {
		alignItems: "center",
	},
	statNumber: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
	},
	statLabel: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginTop: Spacing[1],
	},
	statLabelDark: {
		color: Colors.dark.text.secondary,
	},

	// Booking Cards
	listContainer: {
		paddingHorizontal: Spacing[5],
		paddingBottom: Spacing[8],
	},
	bookingCard: {
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[5],
		marginBottom: Spacing[4],
		...Shadows.md,
	},
	bookingCardDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	bookingHeader: {
		marginBottom: Spacing[4],
	},
	bookingTitleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing[2],
	},
	hallName: {
		fontSize: Typography.fontSize.lg,
		color: Colors.text.primary,
		fontWeight: Typography.fontWeight.semibold,
		flex: 1,
		marginRight: Spacing[3],
	},
	hallNameDark: {
		color: Colors.dark.text.primary,
	},
	statusBadgeContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	priorityDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: Spacing[2],
	},
	statusBadge: {
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[1],
		borderRadius: BorderRadius.sm,
	},
	statusText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.inverse,
		fontWeight: Typography.fontWeight.semibold,
	},
	purpose: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
	},
	purposeDark: {
		color: Colors.dark.text.secondary,
	},
	bookingDetails: {
		marginBottom: Spacing[4],
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing[2],
	},
	detailText: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		marginLeft: Spacing[3],
		flex: 1,
	},
	detailTextDark: {
		color: Colors.dark.text.secondary,
	},

	// Actions
	actionButtons: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: Spacing[3],
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		borderRadius: BorderRadius.md,
		gap: Spacing[2],
	},
	actionButtonText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.inverse,
		fontWeight: Typography.fontWeight.semibold,
	},

	// Loading & Empty States
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
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: Spacing[8] * 2,
	},
	emptyTitle: {
		fontSize: Typography.fontSize.xl,
		color: Colors.text.primary,
		marginTop: Spacing[5],
		marginBottom: Spacing[3],
	},
	emptyTitleDark: {
		color: Colors.dark.text.primary,
	},
	emptyMessage: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		textAlign: "center",
	},
	emptyMessageDark: {
		color: Colors.dark.text.secondary,
	},
	// --- PRO UI/UX ADDITIONS ---
	cardHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing[2],
	},
	cardTitleCol: {
		flex: 1,
		marginRight: Spacing[2],
	},
	statusPillRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	approveButton: {
		backgroundColor: Colors.success.main,
	},
	rejectButton: {
		backgroundColor: Colors.error.main,
	},
	cancelButton: {
		backgroundColor: Colors.warning.main,
	},
	completeButton: {
		backgroundColor: Colors.primary[500],
	},
	statusInfoRow: {
		marginTop: Spacing[3],
		paddingTop: Spacing[2],
		borderTopWidth: 1,
		borderTopColor: Colors.border.main,
	},
	statusTextDark: {
		color: Colors.dark.text.secondary,
	},
	timestampText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
		marginTop: 2,
	},
	timestampTextDark: {
		color: Colors.dark.text.tertiary,
	},
	statusPill: {
		backgroundColor: Colors.warning.main,
		borderRadius: BorderRadius.full,
		paddingHorizontal: Spacing[3],
		paddingVertical: 2,
		marginRight: 4,
		minWidth: 60,
		alignItems: "center",
		justifyContent: "center",
	},
	statusPillText: {
		color: Colors.text.inverse,
		fontWeight: "bold",
		fontSize: Typography.fontSize.xs,
		letterSpacing: 0.5,
	},
	priorityPill: {
		backgroundColor: Colors.success.main,
		borderRadius: BorderRadius.full,
		paddingHorizontal: Spacing[3],
		paddingVertical: 2,
		minWidth: 60,
		alignItems: "center",
		justifyContent: "center",
	},
	priorityPillText: {
		color: Colors.text.inverse,
		fontWeight: "bold",
		fontSize: Typography.fontSize.xs,
		letterSpacing: 0.5,
	},
	cardDetailsRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 4,
		marginBottom: 2,
		gap: 8,
	},
	actionButtonsRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
		alignItems: "center",
		marginTop: 10,
		gap: 12,
	},
	filterChipsRow: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginHorizontal: 8,
		marginBottom: 8,
		gap: 8,
	},
	filterPill: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.full,
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[2],
		marginHorizontal: 4,
		borderWidth: 1,
		borderColor: Colors.border.main,
		minHeight: 40,
	},
	filterPillActive: {
		backgroundColor: Colors.primary[50],
		borderColor: Colors.primary[500],
	},
	filterPillDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.primary[700],
	},
	filterPillText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.primary,
		marginLeft: 8,
		fontWeight: "600",
	},
	filterPillTextActive: {
		color: Colors.primary[500],
	},
	filterPillTextDark: {
		color: Colors.dark.text.primary,
	},
	statsBarRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginHorizontal: 16,
		marginTop: -24,
		marginBottom: 12,
		zIndex: 2,
	},
	statCard: {
		flex: 1,
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.lg,
		marginHorizontal: 4,
		alignItems: "center",
		paddingVertical: 16,
		shadowColor: Colors.primary[500],
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 2,
	},
	// --- END PRO UI/UX ADDITIONS ---

	// Filter hint
	filterHintContainer: {
		alignItems: "center",
		marginBottom: Spacing[3],
		paddingHorizontal: Spacing[5],
	},
	filterHintText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
		fontStyle: "italic",
		opacity: 0.7,
	},
	filterHintTextDark: {
		color: Colors.dark.text.secondary,
	},

	// Modal styles
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	modalContainer: {
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.lg,
		width: "100%",
		maxWidth: 400,
		maxHeight: "80%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	modalContainerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: Spacing[5],
		paddingTop: Spacing[5],
		paddingBottom: Spacing[3],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.main,
	},
	modalTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		flex: 1,
	},
	modalTitleDark: {
		color: Colors.dark.text.primary,
	},
	modalCloseButton: {
		padding: Spacing[2],
		marginLeft: Spacing[2],
	},
	modalSubtitle: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[3],
		lineHeight: 20,
	},
	modalSubtitleDark: {
		color: Colors.dark.text.secondary,
	},
	modalLabel: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.primary,
		marginBottom: Spacing[2],
		paddingHorizontal: Spacing[5],
	},
	modalLabelDark: {
		color: Colors.dark.text.primary,
	},
	reasonInput: {
		borderWidth: 1,
		borderColor: Colors.border.main,
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[3],
		marginHorizontal: Spacing[5],
		fontSize: Typography.fontSize.base,
		textAlignVertical: "top",
		backgroundColor: Colors.background.secondary,
		minHeight: 100,
		color: Colors.text.primary,
	},
	reasonInputDark: {
		borderColor: Colors.dark.border.main,
		backgroundColor: Colors.dark.background.secondary,
		color: Colors.dark.text.primary,
	},
	modalButtons: {
		flexDirection: "row",
		justifyContent: "flex-end",
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[5],
		gap: Spacing[3],
	},
	modalButton: {
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		borderRadius: BorderRadius.md,
		minWidth: 80,
		alignItems: "center",
	},
	modalCancelButton: {
		backgroundColor: Colors.background.secondary,
		borderWidth: 1,
		borderColor: Colors.border.main,
	},
	modalCancelButtonText: {
		color: Colors.text.secondary,
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
	},
	modalRejectButton: {
		backgroundColor: Colors.error.main,
	},
	modalCancelActionButton: {
		backgroundColor: Colors.warning.main,
	},
	modalButtonDisabled: {
		opacity: 0.5,
	},
	modalActionButtonText: {
		color: Colors.background.primary,
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
	},
});

export default BookingOversightScreen;
