import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
	Alert,
} from "react-native";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	Colors,
	Spacing,
	Typography,
	BorderRadius,
	Shadows,
} from "../../constants/theme";

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
import {
	notificationService,
	NotificationData,
} from "../../services/notificationService";

interface NotificationListProps {
	userId: string;
	onNotificationPress?: (notification: NotificationData) => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
	userId,
	onNotificationPress,
}) => {
	const [notifications, setNotifications] = useState<NotificationData[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		loadNotifications();

		// Subscribe to real-time notifications
		const subscription = notificationService.subscribeToUserNotifications(
			userId,
			(newNotification) => {
				setNotifications((prev) => [newNotification, ...prev]);
			}
		);

		return () => {
			subscription.unsubscribe();
		};
	}, [userId]);

	const loadNotifications = async () => {
		try {
			const data = await notificationService.getUserNotifications(userId);
			setNotifications(data);
		} catch (error) {
			console.error("Error loading notifications:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		await loadNotifications();
		setRefreshing(false);
	};

	const handleNotificationPress = async (notification: NotificationData) => {
		if (!notification.is_read) {
			await notificationService.markAsRead(notification.id);
			setNotifications((prev) =>
				prev.map((n) =>
					n.id === notification.id ? { ...n, is_read: true } : n
				)
			);
			await notificationService.updateBadgeCount(userId);
		}

		onNotificationPress?.(notification);
	};

	const handleMarkAllRead = async () => {
		const unreadNotifications = notifications.filter((n) => !n.is_read);
		if (unreadNotifications.length === 0) return;

		await notificationService.markAllAsRead(userId);
		setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
		await notificationService.updateBadgeCount(userId);
	};

	const handleDeleteNotification = async (notificationId: string) => {
		Alert.alert(
			"Delete Notification",
			"Are you sure you want to delete this notification?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await notificationService.deleteNotification(notificationId);
						setNotifications((prev) =>
							prev.filter((n) => n.id !== notificationId)
						);
					},
				},
			]
		);
	};

	const getNotificationIcon = (type: string) => {
		switch (type) {
			case "booking":
				return "calendar";
			case "reminder":
				return "alarm";
			case "update":
				return "refresh";
			case "system":
				return "settings";
			case "maintenance":
				return "construct";
			case "rejection":
				return "close-circle";
			case "cancellation":
				return "remove-circle";
			default:
				return "notifications";
		}
	};

	const getNotificationColor = (type: string) => {
		switch (type) {
			case "booking":
				return theme.colors.success;
			case "reminder":
				return theme.colors.warning;
			case "rejection":
			case "cancellation":
				return theme.colors.error;
			case "maintenance":
				return theme.colors.warning;
			default:
				return theme.colors.primary;
		}
	};

	const formatTime = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) {
			const diffInMinutes = Math.floor(diffInHours * 60);
			return `${diffInMinutes}m ago`;
		} else if (diffInHours < 24) {
			return `${Math.floor(diffInHours)}h ago`;
		} else if (diffInHours < 24 * 7) {
			return `${Math.floor(diffInHours / 24)}d ago`;
		} else {
			return date.toLocaleDateString();
		}
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<Text style={styles.loadingText}>Loading notifications...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{notifications.length > 0 && (
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Notifications</Text>
					<TouchableOpacity
						style={styles.markAllButton}
						onPress={handleMarkAllRead}
					>
						<Text style={styles.markAllText}>Mark All Read</Text>
					</TouchableOpacity>
				</View>
			)}

			<ScrollView
				style={styles.scrollView}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
				}
				showsVerticalScrollIndicator={false}
			>
				{notifications.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Ionicons
							name="notifications-outline"
							size={64}
							color={theme.colors.textSecondary}
						/>
						<Text style={styles.emptyTitle}>No Notifications</Text>
						<Text style={styles.emptySubtitle}>
							You're all caught up! New notifications will appear here.
						</Text>
					</View>
				) : (
					notifications.map((notification) => (
						<TouchableOpacity
							key={notification.id}
							style={[
								styles.notificationItem,
								!notification.is_read && styles.unreadNotification,
							]}
							onPress={() => handleNotificationPress(notification)}
						>
							<View style={styles.notificationContent}>
								<View style={styles.notificationHeader}>
									<View style={styles.iconContainer}>
										<Ionicons
											name={getNotificationIcon(notification.type)}
											size={24}
											color={getNotificationColor(notification.type)}
										/>
									</View>
									<View style={styles.notificationText}>
										<Text
											style={[
												styles.notificationTitle,
												!notification.is_read && styles.unreadTitle,
											]}
											numberOfLines={2}
										>
											{notification.title}
										</Text>
										<Text style={styles.notificationMessage} numberOfLines={3}>
											{notification.message}
										</Text>
									</View>
									{!notification.is_read && <View style={styles.unreadDot} />}
								</View>
								<View style={styles.notificationFooter}>
									<Text style={styles.timeText}>
										{formatTime(notification.created_at)}
									</Text>
									<TouchableOpacity
										style={styles.deleteButton}
										onPress={() => handleDeleteNotification(notification.id)}
									>
										<Ionicons
											name="trash-outline"
											size={16}
											color={theme.colors.textSecondary}
										/>
									</TouchableOpacity>
								</View>
							</View>
						</TouchableOpacity>
					))
				)}
			</ScrollView>
		</View>
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
	},
	loadingText: {
		fontSize: 16,
		color: theme.colors.textSecondary,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.sm,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: theme.colors.text,
	},
	markAllButton: {
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xs,
	},
	markAllText: {
		fontSize: 14,
		color: theme.colors.primary,
		fontWeight: "500",
	},
	scrollView: {
		flex: 1,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: theme.spacing.xl * 2,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: theme.colors.text,
		marginTop: theme.spacing.md,
	},
	emptySubtitle: {
		fontSize: 14,
		color: theme.colors.textSecondary,
		textAlign: "center",
		marginTop: theme.spacing.xs,
		paddingHorizontal: theme.spacing.xl,
	},
	notificationItem: {
		backgroundColor: theme.colors.surface,
		marginHorizontal: theme.spacing.md,
		marginVertical: theme.spacing.xs,
		borderRadius: theme.borderRadius.md,
		padding: theme.spacing.md,
		...theme.shadows.sm,
	},
	unreadNotification: {
		backgroundColor: "#f0f9ff",
		borderLeftWidth: 4,
		borderLeftColor: theme.colors.primary,
	},
	notificationContent: {
		flex: 1,
	},
	notificationHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#f8f9fa",
		justifyContent: "center",
		alignItems: "center",
		marginRight: theme.spacing.sm,
	},
	notificationText: {
		flex: 1,
		marginRight: theme.spacing.sm,
	},
	notificationTitle: {
		fontSize: 16,
		fontWeight: "500",
		color: theme.colors.text,
		marginBottom: theme.spacing.xs,
	},
	unreadTitle: {
		fontWeight: "600",
	},
	notificationMessage: {
		fontSize: 14,
		color: theme.colors.textSecondary,
		lineHeight: 20,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: theme.colors.primary,
		marginTop: 4,
	},
	notificationFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: theme.spacing.sm,
	},
	timeText: {
		fontSize: 12,
		color: theme.colors.textSecondary,
	},
	deleteButton: {
		padding: theme.spacing.xs,
	},
});

export default NotificationList;
