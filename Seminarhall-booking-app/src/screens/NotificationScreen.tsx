import React, { useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius, Shadows } from "../constants/theme";
import { NotificationList } from "../components/notifications/NotificationList";
import {
	notificationService,
	NotificationData,
} from "../services/notificationService";
import { useAuthStore } from "../stores/authStore";

// Create a simple theme object for easier access
const theme = {
	colors: {
		background: "#f8f9fa",
		surface: "#ffffff",
		primary: Colors.primary[500],
		success: Colors.success.main,
		warning: Colors.warning.main,
		error: Colors.error.main,
		text: Colors.text.primary,
		textSecondary: Colors.text.secondary,
		border: Colors.border.main,
	},
	spacing: {
		xs: Spacing[1],
		sm: Spacing[2],
		md: Spacing[4],
		lg: Spacing[5],
		xl: Spacing[6],
	},
	borderRadius: BorderRadius,
	shadows: Shadows,
};

interface NotificationScreenProps {
	navigation: any;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({
	navigation,
}) => {
	const { user } = useAuthStore();

	useEffect(() => {
		// Initialize notification service when screen loads
		if (user) {
			notificationService.initialize(user.id);
		}
	}, [user]);

	const handleNotificationPress = (notification: NotificationData) => {
		// Handle navigation based on notification type and data
		if (notification.data?.booking_id) {
			// Navigate to booking details
			navigation.navigate("BookingDetails", {
				bookingId: notification.data.booking_id,
			});
		} else if (notification.data?.hall_id) {
			// Navigate to hall details
			navigation.navigate("HallDetails", {
				hallId: notification.data.hall_id,
			});
		}
	};

	const handleSettingsPress = () => {
		navigation.navigate("NotificationSettings");
	};

	if (!user) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>
						Please log in to view notifications
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => navigation.goBack()}
					>
						<Ionicons name="arrow-back" size={24} color={theme.colors.text} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Notifications</Text>
				</View>
				<TouchableOpacity
					style={styles.settingsButton}
					onPress={handleSettingsPress}
				>
					<Ionicons
						name="settings-outline"
						size={24}
						color={theme.colors.text}
					/>
				</TouchableOpacity>
			</View>

			<NotificationList
				userId={user.id}
				onNotificationPress={handleNotificationPress}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.md,
		backgroundColor: theme.colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
		...theme.shadows.sm,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
	},
	backButton: {
		padding: theme.spacing.xs,
		marginRight: theme.spacing.sm,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: theme.colors.text,
	},
	settingsButton: {
		padding: theme.spacing.xs,
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	errorText: {
		fontSize: 16,
		color: theme.colors.textSecondary,
	},
});

export default NotificationScreen;
