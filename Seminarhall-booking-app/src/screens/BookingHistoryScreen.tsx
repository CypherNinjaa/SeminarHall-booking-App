import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	RefreshControl,
	ActivityIndicator,
	Alert,
	ScrollView,
	Modal,
	Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "../stores/authStore";
import {
	smartBookingService,
	SmartBooking,
} from "../services/smartBookingService";
import {
	Colors,
	Spacing,
	BorderRadius,
	Typography,
	Shadows,
} from "../constants/theme";

interface BookingHistoryScreenProps {}

type FilterType =
	| "all"
	| "pending"
	| "approved"
	| "rejected"
	| "cancelled"
	| "completed";

const BookingHistoryScreen: React.FC<BookingHistoryScreenProps> = () => {
	const navigation = useNavigation();
	const { isDark } = useTheme();
	const { user } = useAuthStore();

	const [bookings, setBookings] = useState<SmartBooking[]>([]);
	const [filteredBookings, setFilteredBookings] = useState<SmartBooking[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
	const [selectedBooking, setSelectedBooking] = useState<SmartBooking | null>(
		null
	);
	const [modalVisible, setModalVisible] = useState(false);
	const [showFilterModal, setShowFilterModal] = useState(false);

	const styles = getStyles(isDark);

	const filters: {
		key: FilterType;
		label: string;
		icon: keyof typeof Ionicons.glyphMap;
		color: string;
	}[] = [
		{
			key: "all",
			label: "All",
			icon: "list-outline",
			color: Colors.primary[500],
		},
		{
			key: "pending",
			label: "Pending",
			icon: "time-outline",
			color: Colors.warning.main,
		},
		{
			key: "approved",
			label: "Approved",
			icon: "checkmark-circle-outline",
			color: Colors.success.main,
		},
		{
			key: "completed",
			label: "Completed",
			icon: "checkmark-done-outline",
			color: Colors.primary[400],
		},
		{
			key: "rejected",
			label: "Rejected",
			icon: "close-circle-outline",
			color: Colors.error.main,
		},
		{
			key: "cancelled",
			label: "Cancelled",
			icon: "ban-outline",
			color: Colors.gray[500],
		},
	];

	const fetchBookings = useCallback(async () => {
		if (!user?.id) return;

		try {
			setLoading(true);
			const userBookings = await smartBookingService.getUserBookings(user.id);
			setBookings(userBookings);
			filterBookings(userBookings, selectedFilter);
		} catch (error) {
			console.error("Error fetching bookings:", error);
			Alert.alert("Error", "Failed to load booking history");
		} finally {
			setLoading(false);
		}
	}, [user?.id, selectedFilter]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchBookings();
		setRefreshing(false);
	}, [fetchBookings]);

	const filterBookings = (allBookings: SmartBooking[], filter: FilterType) => {
		if (filter === "all") {
			setFilteredBookings(allBookings);
		} else {
			setFilteredBookings(
				allBookings.filter((booking) => booking.status === filter)
			);
		}
	};

	const handleFilterChange = (filter: FilterType) => {
		setSelectedFilter(filter);
		filterBookings(bookings, filter);
	};

	const formatDate = (dateString: string) => {
		// Convert DDMMYYYY format to readable date
		if (dateString.length === 8) {
			const day = dateString.substring(0, 2);
			const month = dateString.substring(2, 4);
			const year = dateString.substring(4, 8);
			const date = new Date(`${year}-${month}-${day}`);
			return date.toLocaleDateString("en-US", {
				weekday: "short",
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		}
		return dateString;
	};

	const formatTime = (timeString: string) => {
		// Convert 24-hour format to 12-hour format with AM/PM
		const [hours, minutes] = timeString.split(":");
		const hour = parseInt(hours);
		const ampm = hour >= 12 ? "PM" : "AM";
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${ampm}`;
	};

	const getStatusColor = (status: SmartBooking["status"]) => {
		switch (status) {
			case "pending":
				return Colors.warning.main;
			case "approved":
				return Colors.success.main;
			case "completed":
				return Colors.primary[400];
			case "rejected":
				return Colors.error.main;
			case "cancelled":
				return Colors.gray[500];
			default:
				return Colors.gray[500];
		}
	};

	const getStatusIcon = (status: SmartBooking["status"]) => {
		switch (status) {
			case "pending":
				return "time-outline";
			case "approved":
				return "checkmark-circle-outline";
			case "completed":
				return "checkmark-done-outline";
			case "rejected":
				return "close-circle-outline";
			case "cancelled":
				return "ban-outline";
			default:
				return "help-circle-outline";
		}
	};

	const canCancelBooking = (booking: SmartBooking) => {
		if (booking.status !== "pending" && booking.status !== "approved") {
			return false;
		}

		// Check if booking is in the future
		const bookingDate = booking.booking_date;
		const today = new Date();
		const todayString = today
			.toISOString()
			.slice(0, 10)
			.replace(/-/g, "")
			.slice(0, 8);

		return bookingDate >= todayString;
	};

	const handleCancelBooking = async (booking: SmartBooking) => {
		Alert.alert(
			"Cancel Booking",
			"Are you sure you want to cancel this booking?",
			[
				{ text: "No", style: "cancel" },
				{
					text: "Yes, Cancel",
					style: "destructive",
					onPress: async () => {
						try {
							await smartBookingService.cancelBooking(
								booking.id,
								user?.id || "",
								"Cancelled by user"
							);
							await fetchBookings(); // Refresh the list
							Alert.alert("Success", "Booking cancelled successfully");
						} catch (error) {
							console.error("Error cancelling booking:", error);
							Alert.alert("Error", "Failed to cancel booking");
						}
					},
				},
			]
		);
	};

	const openBookingDetails = (booking: SmartBooking) => {
		setSelectedBooking(booking);
		setModalVisible(true);
	};

	const renderBookingItem = ({ item }: { item: SmartBooking }) => (
		<TouchableOpacity
			style={styles.bookingCard}
			onPress={() => openBookingDetails(item)}
		>
			<View style={styles.cardHeader}>
				<View style={styles.hallInfo}>
					<Text style={styles.hallName}>
						{item.hall_name || "Unknown Hall"}
					</Text>
					<Text style={styles.purpose}>{item.purpose}</Text>
				</View>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: getStatusColor(item.status) },
					]}
				>
					<Ionicons
						name={getStatusIcon(item.status)}
						size={14}
						color="#FFFFFF"
					/>
					<Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
				</View>
			</View>

			<View style={styles.cardContent}>
				<View style={styles.dateTimeRow}>
					<View style={styles.dateTimeItem}>
						<Ionicons
							name="calendar-outline"
							size={16}
							color={Colors.gray[500]}
						/>
						<Text style={styles.dateTimeText}>
							{formatDate(item.booking_date)}
						</Text>
					</View>
					<View style={styles.dateTimeItem}>
						<Ionicons name="time-outline" size={16} color={Colors.gray[500]} />
						<Text style={styles.dateTimeText}>
							{formatTime(item.start_time)} - {formatTime(item.end_time)}
						</Text>
					</View>
				</View>

				<View style={styles.detailsRow}>
					<View style={styles.detailItem}>
						<Ionicons
							name="people-outline"
							size={16}
							color={Colors.gray[500]}
						/>
						<Text style={styles.detailText}>
							{item.attendees_count} attendees
						</Text>
					</View>
					<View style={styles.detailItem}>
						<Ionicons name="time-outline" size={16} color={Colors.gray[500]} />
						<Text style={styles.detailText}>{item.duration_minutes} mins</Text>
					</View>
				</View>
			</View>

			{canCancelBooking(item) && (
				<View style={styles.cardActions}>
					<TouchableOpacity
						style={styles.cancelButton}
						onPress={() => handleCancelBooking(item)}
					>
						<Ionicons
							name="close-circle-outline"
							size={16}
							color={Colors.error.main}
						/>
						<Text style={styles.cancelButtonText}>Cancel</Text>
					</TouchableOpacity>
				</View>
			)}
		</TouchableOpacity>
	);

	const renderBookingDetailsModal = () => {
		if (!selectedBooking) return null;

		return (
			<Modal
				animationType="slide"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Booking Details</Text>
							<TouchableOpacity
								style={styles.closeButton}
								onPress={() => setModalVisible(false)}
							>
								<Ionicons name="close" size={24} color={Colors.gray[500]} />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalBody}>
							<View style={styles.modalSection}>
								<Text style={styles.modalSectionTitle}>Hall Information</Text>
								<Text style={styles.modalText}>
									{selectedBooking.hall_name || "Unknown Hall"}
								</Text>
							</View>

							<View style={styles.modalSection}>
								<Text style={styles.modalSectionTitle}>Date & Time</Text>
								<Text style={styles.modalText}>
									{formatDate(selectedBooking.booking_date)}
								</Text>
								<Text style={styles.modalText}>
									{formatTime(selectedBooking.start_time)} -{" "}
									{formatTime(selectedBooking.end_time)}
								</Text>
								<Text style={styles.modalSubText}>
									Duration: {selectedBooking.duration_minutes} minutes
								</Text>
							</View>

							<View style={styles.modalSection}>
								<Text style={styles.modalSectionTitle}>Purpose</Text>
								<Text style={styles.modalText}>{selectedBooking.purpose}</Text>
								{selectedBooking.description && (
									<Text style={styles.modalSubText}>
										{selectedBooking.description}
									</Text>
								)}
							</View>

							<View style={styles.modalSection}>
								<Text style={styles.modalSectionTitle}>Attendees</Text>
								<Text style={styles.modalText}>
									{selectedBooking.attendees_count} people
								</Text>
							</View>

							{selectedBooking.equipment_needed &&
								selectedBooking.equipment_needed.length > 0 && (
									<View style={styles.modalSection}>
										<Text style={styles.modalSectionTitle}>
											Equipment Needed
										</Text>
										{selectedBooking.equipment_needed.map(
											(equipment, index) => (
												<Text key={index} style={styles.modalText}>
													• {equipment}
												</Text>
											)
										)}
									</View>
								)}

							{selectedBooking.special_requirements && (
								<View style={styles.modalSection}>
									<Text style={styles.modalSectionTitle}>
										Special Requirements
									</Text>
									<Text style={styles.modalText}>
										{selectedBooking.special_requirements}
									</Text>
								</View>
							)}

							<View style={styles.modalSection}>
								<Text style={styles.modalSectionTitle}>Status</Text>
								<View
									style={[
										styles.statusBadge,
										{ backgroundColor: getStatusColor(selectedBooking.status) },
									]}
								>
									<Ionicons
										name={getStatusIcon(selectedBooking.status)}
										size={14}
										color="#FFFFFF"
									/>
									<Text style={styles.statusText}>
										{selectedBooking.status.toUpperCase()}
									</Text>
								</View>
							</View>

							{selectedBooking.rejected_reason && (
								<View style={styles.modalSection}>
									<Text style={styles.modalSectionTitle}>Rejection Reason</Text>
									<Text style={styles.modalText}>
										{selectedBooking.rejected_reason}
									</Text>
								</View>
							)}

							{selectedBooking.admin_notes && (
								<View style={styles.modalSection}>
									<Text style={styles.modalSectionTitle}>Admin Notes</Text>
									<Text style={styles.modalText}>
										{selectedBooking.admin_notes}
									</Text>
								</View>
							)}
						</ScrollView>

						{canCancelBooking(selectedBooking) && (
							<View style={styles.modalActions}>
								<TouchableOpacity
									style={styles.modalCancelButton}
									onPress={() => {
										setModalVisible(false);
										handleCancelBooking(selectedBooking);
									}}
								>
									<Text style={styles.modalCancelButtonText}>
										Cancel Booking
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				</View>
			</Modal>
		);
	};

	useEffect(() => {
		fetchBookings();
	}, [fetchBookings]);

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => navigation.goBack()}>
						<Ionicons
							name="arrow-back"
							size={24}
							color={isDark ? Colors.gray[100] : Colors.gray[900]}
						/>
					</TouchableOpacity>
					<Text style={styles.title}>Booking History</Text>
					<View style={{ width: 24 }} />
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary[500]} />
					<Text style={styles.loadingText}>Loading your bookings...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons
						name="arrow-back"
						size={24}
						color={isDark ? Colors.gray[100] : Colors.gray[900]}
					/>
				</TouchableOpacity>
				<Text style={styles.title}>Booking History</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* FAB for Filter */}
			<View style={{ position: "absolute", bottom: 32, right: 24, zIndex: 10 }}>
				<TouchableOpacity
					style={{
						backgroundColor: Colors.primary[500],
						borderRadius: 32,
						width: 56,
						height: 56,
						justifyContent: "center",
						alignItems: "center",
						elevation: 6,
						shadowColor: Colors.gray[900],
						shadowOffset: { width: 0, height: 2 },
						shadowOpacity: 0.18,
						shadowRadius: 4,
					}}
					onPress={() => setShowFilterModal(true)}
				>
					<Ionicons name="filter" size={28} color="#fff" />
				</TouchableOpacity>
			</View>

			{/* Filter Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={showFilterModal}
				onRequestClose={() => setShowFilterModal(false)}
			>
				<View
					style={{
						flex: 1,
						backgroundColor: "rgba(0,0,0,0.3)",
						justifyContent: "flex-end",
					}}
				>
					<View
						style={{
							backgroundColor: isDark ? Colors.gray[900] : "#fff",
							borderTopLeftRadius: 24,
							borderTopRightRadius: 24,
							padding: 24,
							minHeight: 220,
						}}
					>
						<Text
							style={{
								fontSize: 20,
								fontWeight: "bold",
								color: isDark ? Colors.gray[100] : Colors.gray[900],
								marginBottom: 16,
							}}
						>
							Filter Bookings
						</Text>
						{filters.map((filter) => {
							const isSelected = selectedFilter === filter.key;
							const count =
								filter.key === "all"
									? bookings.length
									: bookings.filter((b) => b.status === filter.key).length;
							return (
								<TouchableOpacity
									key={filter.key}
									style={{
										flexDirection: "row",
										alignItems: "center",
										paddingVertical: 12,
										paddingHorizontal: 16,
										borderRadius: 24,
										marginBottom: 8,
										backgroundColor: isSelected
											? filter.color
											: isDark
											? Colors.gray[800]
											: Colors.gray[100],
									}}
									onPress={() => {
										handleFilterChange(filter.key);
										setShowFilterModal(false);
									}}
								>
									<Ionicons
										name={filter.icon}
										size={20}
										color={isSelected ? "#fff" : filter.color}
									/>
									<Text
										style={{
											marginLeft: 12,
											fontSize: 16,
											fontWeight: "600",
											color: isSelected ? "#fff" : filter.color,
											flex: 1,
										}}
									>
										{filter.label}
									</Text>
									{count > 0 && (
										<View
											style={{
												backgroundColor: isSelected ? "#fff" : filter.color,
												borderRadius: 12,
												minWidth: 28,
												alignItems: "center",
												justifyContent: "center",
												paddingHorizontal: 8,
												paddingVertical: 2,
											}}
										>
											<Text
												style={{
													color: isSelected ? filter.color : "#fff",
													fontWeight: "bold",
													fontSize: 14,
												}}
											>
												{count}
											</Text>
										</View>
									)}
								</TouchableOpacity>
							);
						})}
						<TouchableOpacity
							onPress={() => setShowFilterModal(false)}
							style={{ marginTop: 8, alignSelf: "flex-end" }}
						>
							<Text
								style={{
									color: Colors.primary[500],
									fontWeight: "bold",
									fontSize: 16,
								}}
							>
								Close
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Bookings List */}
			{filteredBookings.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons
						name="calendar-outline"
						size={64}
						color={Colors.gray[400]}
					/>
					<Text style={styles.emptyTitle}>No bookings found</Text>
					<Text style={styles.emptyText}>
						{selectedFilter === "all"
							? "You haven't made any bookings yet."
							: `No ${selectedFilter} bookings found.`}
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredBookings}
					renderItem={renderBookingItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContainer}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
					showsVerticalScrollIndicator={false}
				/>
			)}

			{renderBookingDetailsModal()}
		</SafeAreaView>
	);
};

const getStyles = (isDark: boolean) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: isDark ? Colors.gray[900] : Colors.gray[50],
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: Spacing[4],
			paddingVertical: Spacing[3],
			borderBottomWidth: 1,
			borderBottomColor: isDark ? Colors.gray[700] : Colors.gray[200],
		},
		title: {
			fontSize: Typography.fontSize["2xl"],
			fontWeight: Typography.fontWeight.bold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			gap: Spacing[4],
		},
		loadingText: {
			fontSize: Typography.fontSize.base,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
		},
		filterContainer: {
			backgroundColor: isDark ? Colors.gray[800] : Colors.gray[100],
			borderBottomWidth: 1,
			borderBottomColor: isDark ? Colors.gray[600] : Colors.gray[300],
			paddingVertical: Spacing[4],
			minHeight: 70,
		},
		filterContent: {
			paddingHorizontal: Spacing[4],
			paddingVertical: Spacing[3],
			gap: Spacing[3],
			alignItems: "center",
		},
		filterTab: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: Spacing[5],
			paddingVertical: Spacing[5],
			borderRadius: BorderRadius.full,
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[600] : Colors.gray[300],
			backgroundColor: isDark ? Colors.gray[700] : Colors.gray[50],
			gap: Spacing[3],
			shadowColor: Colors.gray[900],
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.12,
			shadowRadius: 3,
			elevation: 3,
			minHeight: 48,
			minWidth: 80,
			justifyContent: "center",
		},
		filterText: {
			fontSize: Typography.fontSize.base,
			fontWeight: Typography.fontWeight.semibold,
			textAlign: "center",
			lineHeight: 22,
		},
		filterBadge: {
			borderRadius: BorderRadius.full,
			paddingHorizontal: 8,
			paddingVertical: 4,
			minWidth: 24,
			minHeight: 20,
			alignItems: "center",
			justifyContent: "center",
		},
		filterBadgeText: {
			fontSize: 12,
			fontWeight: Typography.fontWeight.bold,
			textAlign: "center",
		},
		listContainer: {
			padding: Spacing[4],
			gap: Spacing[4],
		},
		bookingCard: {
			backgroundColor: isDark ? Colors.gray[800] : "#FFFFFF",
			borderRadius: BorderRadius.lg,
			padding: Spacing[4],
			...Shadows.sm,
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[600] : Colors.gray[300],
			marginBottom: Spacing[2],
		},
		cardHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: Spacing[3],
		},
		hallInfo: {
			flex: 1,
			marginRight: Spacing[3],
		},
		hallName: {
			fontSize: Typography.fontSize.lg,
			fontWeight: Typography.fontWeight.semibold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
			marginBottom: 2,
		},
		purpose: {
			fontSize: Typography.fontSize.base,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
		},
		statusBadge: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: Spacing[3],
			paddingVertical: 4,
			borderRadius: BorderRadius.full,
			gap: 4,
		},
		statusText: {
			fontSize: Typography.fontSize.xs,
			fontWeight: Typography.fontWeight.semibold,
			color: "#FFFFFF",
		},
		cardContent: {
			gap: Spacing[3],
		},
		dateTimeRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			flexWrap: "wrap",
			gap: Spacing[3],
		},
		dateTimeItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: Spacing[2],
			flex: 1,
			minWidth: 120,
		},
		dateTimeText: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
		},
		detailsRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			gap: Spacing[3],
		},
		detailItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: Spacing[2],
			flex: 1,
		},
		detailText: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
		},
		cardActions: {
			marginTop: Spacing[3],
			paddingTop: Spacing[3],
			borderTopWidth: 1,
			borderTopColor: isDark ? Colors.gray[700] : Colors.gray[200],
			alignItems: "flex-end",
		},
		cancelButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: Spacing[2],
			paddingHorizontal: Spacing[3],
			paddingVertical: Spacing[2],
		},
		cancelButtonText: {
			fontSize: Typography.fontSize.sm,
			color: Colors.error.main,
			fontWeight: Typography.fontWeight.semibold,
		},
		emptyContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: Spacing[8],
			gap: Spacing[4],
		},
		emptyTitle: {
			fontSize: Typography.fontSize.lg,
			fontWeight: Typography.fontWeight.semibold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
			textAlign: "center",
		},
		emptyText: {
			fontSize: Typography.fontSize.base,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
			textAlign: "center",
			lineHeight: 20,
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.5)",
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: Spacing[4],
			paddingVertical: Spacing[8],
		},
		modalContent: {
			backgroundColor: isDark ? Colors.gray[800] : "#FFFFFF",
			borderRadius: BorderRadius["2xl"],
			width: "100%",
			maxWidth: 400,
			maxHeight: "85%",
			minHeight: "60%",
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[600] : Colors.gray[200],
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.25,
			shadowRadius: 8,
			elevation: 8,
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: Spacing[4],
			borderBottomWidth: 1,
			borderBottomColor: isDark ? Colors.gray[600] : Colors.gray[200],
			backgroundColor: isDark ? Colors.gray[700] : Colors.gray[50],
		},
		modalTitle: {
			fontSize: Typography.fontSize["2xl"],
			fontWeight: Typography.fontWeight.bold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
		},
		closeButton: {
			padding: Spacing[2],
		},
		modalBody: {
			flex: 1,
			padding: Spacing[4],
			backgroundColor: isDark ? Colors.gray[800] : "#FFFFFF",
			maxHeight: "75%",
		},
		modalSection: {
			marginBottom: Spacing[6],
			backgroundColor: isDark ? Colors.gray[700] : Colors.gray[50],
			padding: Spacing[3],
			borderRadius: BorderRadius.md,
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[600] : Colors.gray[200],
		},
		modalSectionTitle: {
			fontSize: Typography.fontSize.lg,
			fontWeight: Typography.fontWeight.semibold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
			marginBottom: Spacing[3],
			borderBottomWidth: 1,
			borderBottomColor: isDark ? Colors.gray[600] : Colors.gray[300],
			paddingBottom: Spacing[2],
		},
		modalText: {
			fontSize: Typography.fontSize.base,
			color: isDark ? Colors.gray[200] : Colors.gray[800],
			marginBottom: 4,
			lineHeight: 20,
		},
		modalSubText: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[300] : Colors.gray[700],
			marginTop: 4,
			lineHeight: 18,
		},
		modalActions: {
			paddingHorizontal: Spacing[4],
			paddingVertical: Spacing[4],
			paddingBottom: Spacing[6],
			borderTopWidth: 1,
			borderTopColor: isDark ? Colors.gray[600] : Colors.gray[200],
			backgroundColor: isDark ? Colors.gray[700] : Colors.gray[50],
		},
		modalCancelButton: {
			backgroundColor: Colors.error.main,
			paddingVertical: Spacing[4],
			borderRadius: BorderRadius.md,
			alignItems: "center",
		},
		modalCancelButtonText: {
			fontSize: Typography.fontSize.base,
			fontWeight: Typography.fontWeight.semibold,
			color: "#FFFFFF",
		},
	});

export default BookingHistoryScreen;
