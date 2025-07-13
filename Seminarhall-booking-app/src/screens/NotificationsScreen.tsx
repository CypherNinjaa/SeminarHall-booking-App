import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
	Alert,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/theme";
import {
	notificationService,
	NotificationData,
} from "../services/notificationService";
import { useAuthStore } from "../stores/authStore";

interface NotificationsScreenProps {
	navigation: any;
}

export default function NotificationsScreen({
	navigation,
}: NotificationsScreenProps) {
	const { isDark } = useTheme();
	const { user } = useAuthStore();

	const [notifications, setNotifications] = useState<NotificationData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);

	// Load notifications
	const loadNotifications = useCallback(
		async (showLoader = true) => {
			if (!user?.id) return;

			try {
				if (showLoader) setIsLoading(true);

				const [notificationsData, unreadCountData] = await Promise.all([
					notificationService.getUserNotifications(user.id),
					notificationService.getUnreadCount(user.id),
				]);

				setNotifications(notificationsData);
				setUnreadCount(unreadCountData);
			} catch (error) {
				console.error("Error loading notifications:", error);
				Alert.alert("Error", "Failed to load notifications");
			} finally {
				setIsLoading(false);
				setRefreshing(false);
			}
		},
		[user?.id]
	);

	// Initial load
	useEffect(() => {
		loadNotifications();
	}, [loadNotifications]);

	// Subscribe to real-time notifications
	useEffect(() => {
		if (!user?.id) return;

		const subscription = notificationService.subscribeToUserNotifications(
			user.id,
			(newNotification) => {
				setNotifications((prev) => [newNotification, ...prev]);
				setUnreadCount((prev) => prev + 1);
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			}
		);

		return () => {
			subscription?.unsubscribe();
		};
	}, [user?.id]);

	// Handle refresh
	const handleRefresh = useCallback(() => {
		setRefreshing(true);
		loadNotifications(false);
	}, [loadNotifications]);

	// Mark notification as read
	const handleMarkAsRead = useCallback(async (notificationId: string) => {
		try {
			const success = await notificationService.markAsRead(notificationId);
			if (success) {
				setNotifications((prev) =>
					prev.map((notification) =>
						notification.id === notificationId
							? { ...notification, is_read: true }
							: notification
					)
				);
				setUnreadCount((prev) => Math.max(0, prev - 1));
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			}
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	}, []);

	// Mark all as read
	const handleMarkAllAsRead = useCallback(async () => {
		if (!user?.id || unreadCount === 0) return;

		try {
			const success = await notificationService.markAllAsRead(user.id);
			if (success) {
				setNotifications((prev) =>
					prev.map((notification) => ({ ...notification, is_read: true }))
				);
				setUnreadCount(0);
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			}
		} catch (error) {
			console.error("Error marking all notifications as read:", error);
			Alert.alert("Error", "Failed to mark all notifications as read");
		}
	}, [user?.id, unreadCount]);

	// Delete notification
	const handleDeleteNotification = useCallback(
		async (notificationId: string) => {
			Alert.alert(
				"Delete Notification",
				"Are you sure you want to delete this notification?",
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Delete",
						style: "destructive",
						onPress: async () => {
							try {
								const success = await notificationService.deleteNotification(
									notificationId
								);
								if (success) {
									setNotifications((prev) =>
										prev.filter(
											(notification) => notification.id !== notificationId
										)
									);
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								}
							} catch (error) {
								console.error("Error deleting notification:", error);
								Alert.alert("Error", "Failed to delete notification");
							}
						},
					},
				]
			);
		},
		[]
	);

	// Get notification icon
	const getNotificationIcon = (type: NotificationData["type"]) => {
		switch (type) {
			case "booking":
				return "calendar-outline";
			case "rejection":
				return "close-circle-outline";
			case "cancellation":
				return "ban-outline";
			case "reminder":
				return "alarm-outline";
			case "update":
				return "information-circle-outline";
			case "system":
				return "settings-outline";
			case "maintenance":
				return "construct-outline";
			default:
				return "notifications-outline";
		}
	};

	// Get notification color
	const getNotificationColor = (type: NotificationData["type"]) => {
		switch (type) {
			case "booking":
				return Colors.success.main;
			case "rejection":
				return Colors.error.main;
			case "cancellation":
				return Colors.warning.main;
			case "reminder":
				return Colors.primary[500];
			case "update":
				return Colors.primary[400];
			case "system":
				return Colors.gray[600];
			case "maintenance":
				return Colors.warning.main;
			default:
				return Colors.gray[500];
		}
	};

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) {
			const diffInMinutes = Math.floor(diffInHours * 60);
			return `${diffInMinutes}m ago`;
		} else if (diffInHours < 24) {
			return `${Math.floor(diffInHours)}h ago`;
		} else {
			const diffInDays = Math.floor(diffInHours / 24);
			return `${diffInDays}d ago`;
		}
	};

	// Render notification item
	const renderNotificationItem = (notification: NotificationData) => (
		<View
			key={notification.id}
			style={[
				styles.notificationItem,
				isDark && styles.notificationItemDark,
				!notification.is_read && styles.unreadNotification,
			]}
		>
			<View style={styles.notificationContent}>
				{/* Icon and Status */}
				<View style={styles.notificationIcon}>
					<Ionicons
						name={getNotificationIcon(notification.type)}
						size={24}
						color={getNotificationColor(notification.type)}
					/>
					{!notification.is_read && <View style={styles.unreadIndicator} />}
				</View>

				{/* Content */}
				<View style={styles.notificationText}>
					<Text
						style={[
							styles.notificationTitle,
							isDark && styles.notificationTitleDark,
						]}
					>
						{notification.title}
					</Text>
					<Text
						style={[
							styles.notificationMessage,
							isDark && styles.notificationMessageDark,
						]}
					>
						{notification.message}
					</Text>
					<Text
						style={[
							styles.notificationDate,
							isDark && styles.notificationDateDark,
						]}
					>
						{formatDate(notification.created_at)}
					</Text>
				</View>

				{/* Actions */}
				<View style={styles.notificationActions}>
					{!notification.is_read && (
						<TouchableOpacity
							style={styles.readButton}
							onPress={() => handleMarkAsRead(notification.id)}
							accessibilityLabel="Mark as read"
						>
							<Ionicons
								name="checkmark"
								size={16}
								color={Colors.success.main}
							/>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						style={styles.deleteButton}
						onPress={() => handleDeleteNotification(notification.id)}
						accessibilityLabel="Delete notification"
					>
						<Ionicons
							name="trash-outline"
							size={16}
							color={Colors.error.main}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Additional data for booking notifications */}
			{notification.data?.booking_id && (
				<View style={styles.bookingDetails}>
					<Text
						style={[
							styles.bookingDetailsText,
							isDark && styles.bookingDetailsTextDark,
						]}
					>
						Booking ID: {notification.data.booking_id}
					</Text>
					{notification.data.rejection_reason && (
						<Text style={[styles.reasonText, isDark && styles.reasonTextDark]}>
							Reason: {notification.data.rejection_reason}
						</Text>
					)}
					{notification.data.cancellation_reason && (
						<Text style={[styles.reasonText, isDark && styles.reasonTextDark]}>
							Reason: {notification.data.cancellation_reason}
						</Text>
					)}
				</View>
			)}
		</View>
	);

	if (isLoading) {
		return (
			<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
				<StatusBar style={isDark ? "light" : "dark"} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary[500]} />
					<Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
						Loading notifications...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Header */}
			<LinearGradient
				colors={
					isDark
						? [
								Colors.dark.background.secondary,
								Colors.dark.background.tertiary,
						  ]
						: [Colors.primary[600], Colors.primary[500]]
				}
				style={styles.header}
			>
				<View style={styles.headerContent}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => navigation.goBack()}
					>
						<Ionicons name="arrow-back" size={24} color="white" />
					</TouchableOpacity>

					<View style={styles.headerTitleContainer}>
						<Text style={styles.headerTitle}>Notifications</Text>
						{unreadCount > 0 && (
							<View style={styles.unreadBadge}>
								<Text style={styles.unreadBadgeText}>{unreadCount}</Text>
							</View>
						)}
					</View>

					{unreadCount > 0 && (
						<TouchableOpacity
							style={styles.markAllButton}
							onPress={handleMarkAllAsRead}
						>
							<Ionicons name="checkmark-done" size={20} color="white" />
						</TouchableOpacity>
					)}
				</View>
			</LinearGradient>

			{/* Content */}
			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.contentContainer}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						colors={[Colors.primary[500]]}
						tintColor={Colors.primary[500]}
					/>
				}
				showsVerticalScrollIndicator={false}
			>
				{notifications.length > 0 ? (
					notifications.map(renderNotificationItem)
				) : (
					<View style={styles.emptyState}>
						<Ionicons
							name="notifications-outline"
							size={64}
							color={Colors.gray[400]}
						/>
						<Text
							style={[
								styles.emptyStateTitle,
								isDark && styles.emptyStateTitleDark,
							]}
						>
							No Notifications
						</Text>
						<Text
							style={[
								styles.emptyStateMessage,
								isDark && styles.emptyStateMessageDark,
							]}
						>
							You're all caught up! New notifications will appear here.
						</Text>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background.primary,
	},
	containerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: Colors.text.secondary,
	},
	loadingTextDark: {
		color: Colors.dark.text.secondary,
	},
	header: {
		paddingTop: 8,
		paddingBottom: 16,
		paddingHorizontal: 20,
	},
	headerContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	backButton: {
		padding: 8,
		marginLeft: -8,
	},
	headerTitleContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginHorizontal: 16,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "white",
	},
	unreadBadge: {
		backgroundColor: Colors.error.main,
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 2,
		marginLeft: 8,
		minWidth: 24,
		alignItems: "center",
	},
	unreadBadgeText: {
		fontSize: 12,
		fontWeight: "bold",
		color: "white",
	},
	markAllButton: {
		padding: 8,
		marginRight: -8,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: 20,
	},
	notificationItem: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: Colors.gray[200],
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	notificationItemDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.background.tertiary,
	},
	unreadNotification: {
		borderLeftWidth: 4,
		borderLeftColor: Colors.primary[500],
	},
	notificationContent: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	notificationIcon: {
		position: "relative",
		marginRight: 12,
		marginTop: 2,
	},
	unreadIndicator: {
		position: "absolute",
		top: -2,
		right: -2,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.primary[500],
	},
	notificationText: {
		flex: 1,
		marginRight: 12,
	},
	notificationTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: Colors.text.primary,
		marginBottom: 4,
	},
	notificationTitleDark: {
		color: Colors.dark.text.primary,
	},
	notificationMessage: {
		fontSize: 14,
		color: Colors.text.secondary,
		lineHeight: 20,
		marginBottom: 8,
	},
	notificationMessageDark: {
		color: Colors.dark.text.secondary,
	},
	notificationDate: {
		fontSize: 12,
		color: Colors.gray[500],
	},
	notificationDateDark: {
		color: Colors.gray[400],
	},
	notificationActions: {
		flexDirection: "row",
		alignItems: "center",
	},
	readButton: {
		padding: 8,
		marginRight: 4,
	},
	deleteButton: {
		padding: 8,
	},
	bookingDetails: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: Colors.gray[200],
	},
	bookingDetailsText: {
		fontSize: 12,
		color: Colors.text.secondary,
		marginBottom: 4,
	},
	bookingDetailsTextDark: {
		color: Colors.dark.text.secondary,
	},
	reasonText: {
		fontSize: 12,
		color: Colors.error.main,
		fontStyle: "italic",
	},
	reasonTextDark: {
		color: Colors.error.light,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 60,
	},
	emptyStateTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: Colors.text.primary,
		marginTop: 16,
		marginBottom: 8,
	},
	emptyStateTitleDark: {
		color: Colors.dark.text.primary,
	},
	emptyStateMessage: {
		fontSize: 16,
		color: Colors.text.secondary,
		textAlign: "center",
		lineHeight: 24,
	},
	emptyStateMessageDark: {
		color: Colors.dark.text.secondary,
	},
});
