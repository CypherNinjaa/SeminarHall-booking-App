import React from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";

// Mock booking data
const mockBookings = [
	{
		id: "1",
		hallName: "Conference Hall A",
		date: "2025-07-10",
		startTime: "10:00 AM",
		endTime: "12:00 PM",
		status: "confirmed",
		purpose: "Team Meeting",
	},
	{
		id: "2",
		hallName: "Seminar Room B",
		date: "2025-07-15",
		startTime: "2:00 PM",
		endTime: "4:00 PM",
		status: "pending",
		purpose: "Workshop",
	},
	{
		id: "3",
		hallName: "Auditorium C",
		date: "2025-07-08",
		startTime: "9:00 AM",
		endTime: "11:00 AM",
		status: "completed",
		purpose: "Presentation",
	},
];

const getStatusColor = (status: string) => {
	switch (status) {
		case "confirmed":
			return "#28A745";
		case "pending":
			return "#FFC107";
		case "completed":
			return "#6C757D";
		case "cancelled":
			return "#DC3545";
		default:
			return "#6C757D";
	}
};

const getStatusText = (status: string) => {
	return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function BookingScreen() {
	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="auto" />
			<View style={styles.header}>
				<Text style={styles.title}>My Bookings</Text>
				<Text style={styles.subtitle}>
					Manage your seminar hall reservations
				</Text>
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{mockBookings.map((booking) => (
					<View key={booking.id} style={styles.bookingCard}>
						<View style={styles.bookingHeader}>
							<Text style={styles.hallName}>{booking.hallName}</Text>
							<View
								style={[
									styles.statusBadge,
									{ backgroundColor: getStatusColor(booking.status) },
								]}
							>
								<Text style={styles.statusText}>
									{getStatusText(booking.status)}
								</Text>
							</View>
						</View>

						<Text style={styles.purpose}>📋 {booking.purpose}</Text>
						<Text style={styles.dateTime}>📅 {booking.date}</Text>
						<Text style={styles.dateTime}>
							🕐 {booking.startTime} - {booking.endTime}
						</Text>

						<View style={styles.actionButtons}>
							{booking.status === "confirmed" && (
								<>
									<TouchableOpacity style={styles.modifyButton}>
										<Text style={styles.modifyButtonText}>Modify</Text>
									</TouchableOpacity>
									<TouchableOpacity style={styles.cancelButton}>
										<Text style={styles.cancelButtonText}>Cancel</Text>
									</TouchableOpacity>
								</>
							)}
							{booking.status === "pending" && (
								<TouchableOpacity style={styles.cancelButton}>
									<Text style={styles.cancelButtonText}>Cancel Request</Text>
								</TouchableOpacity>
							)}
							{booking.status === "completed" && (
								<TouchableOpacity style={styles.reviewButton}>
									<Text style={styles.reviewButtonText}>Leave Review</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
				))}

				{mockBookings.length === 0 && (
					<View style={styles.emptyState}>
						<Text style={styles.emptyStateText}>No bookings found</Text>
						<Text style={styles.emptyStateSubtext}>
							Book a seminar hall to see your reservations here
						</Text>
					</View>
				)}
			</ScrollView>

			<TouchableOpacity style={styles.fab}>
				<Text style={styles.fabText}>+</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8f9fa",
	},
	header: {
		padding: 20,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
	},
	subtitle: {
		fontSize: 14,
		color: "#666",
		marginTop: 4,
	},
	scrollView: {
		flex: 1,
		padding: 16,
	},
	bookingCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	bookingHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	hallName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		flex: 1,
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		color: "white",
		fontSize: 12,
		fontWeight: "600",
	},
	purpose: {
		fontSize: 14,
		color: "#666",
		marginBottom: 4,
	},
	dateTime: {
		fontSize: 14,
		color: "#666",
		marginBottom: 4,
	},
	actionButtons: {
		flexDirection: "row",
		marginTop: 16,
		gap: 8,
	},
	modifyButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		flex: 1,
	},
	modifyButtonText: {
		color: "white",
		textAlign: "center",
		fontWeight: "600",
	},
	cancelButton: {
		backgroundColor: "#DC3545",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		flex: 1,
	},
	cancelButtonText: {
		color: "white",
		textAlign: "center",
		fontWeight: "600",
	},
	reviewButton: {
		backgroundColor: "#28A745",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		flex: 1,
	},
	reviewButtonText: {
		color: "white",
		textAlign: "center",
		fontWeight: "600",
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 60,
	},
	emptyStateText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#666",
		marginBottom: 8,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: "#999",
		textAlign: "center",
	},
	fab: {
		position: "absolute",
		bottom: 20,
		right: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#007AFF",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.3,
		shadowRadius: 4.65,
		elevation: 8,
	},
	fabText: {
		color: "white",
		fontSize: 24,
		fontWeight: "bold",
	},
});
