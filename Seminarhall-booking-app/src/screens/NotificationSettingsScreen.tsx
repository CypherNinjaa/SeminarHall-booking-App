import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	Switch,
	TouchableOpacity,
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
} from "../constants/theme";
import {
	notificationService,
	NotificationSettings,
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

interface NotificationSettingsScreenProps {
	navigation: any;
}

export const NotificationSettingsScreen: React.FC<
	NotificationSettingsScreenProps
> = ({ navigation }) => {
	const { user } = useAuthStore();
	const [settings, setSettings] = useState<NotificationSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (user?.id) {
			loadSettings();
		}
	}, [user?.id]);

	const loadSettings = async () => {
		if (!user?.id) return;

		try {
			const userSettings = await notificationService.getNotificationSettings(
				user.id
			);
			setSettings(userSettings || notificationService.getDefaultSettings());
		} catch (error) {
			console.error("Error loading notification settings:", error);
			setSettings(notificationService.getDefaultSettings());
		} finally {
			setLoading(false);
		}
	};

	const updateSetting = async (key: keyof NotificationSettings, value: any) => {
		if (!settings || !user?.id) return;

		const newSettings = { ...settings, [key]: value };
		setSettings(newSettings);

		setSaving(true);
		try {
			await notificationService.updateNotificationSettings(user.id, {
				[key]: value,
			});
		} catch (error) {
			console.error("Error updating notification settings:", error);
			Alert.alert("Error", "Failed to update notification settings");
			// Revert the change
			setSettings(settings);
		} finally {
			setSaving(false);
		}
	};

	const getReminderTimeText = (minutes: number) => {
		if (minutes < 60) {
			return `${minutes} minutes`;
		} else {
			const hours = Math.floor(minutes / 60);
			return hours === 1 ? "1 hour" : `${hours} hours`;
		}
	};

	const showReminderTimePicker = () => {
		const options = [
			{ label: "15 minutes", value: 15 },
			{ label: "30 minutes", value: 30 },
			{ label: "1 hour", value: 60 },
			{ label: "2 hours", value: 120 },
			{ label: "4 hours", value: 240 },
			{ label: "1 day", value: 1440 },
		];

		Alert.alert(
			"Reminder Time",
			"How early would you like to be reminded about your bookings?",
			[
				...options.map((option) => ({
					text: option.label,
					onPress: () => updateSetting("reminder_time", option.value),
				})),
				{ text: "Cancel", style: "cancel" },
			]
		);
	};

	const showEmailFrequencyPicker = () => {
		const options = [
			{ label: "Immediate", value: "immediate" },
			{ label: "Daily Summary", value: "daily" },
			{ label: "Weekly Summary", value: "weekly" },
		];

		Alert.alert(
			"Email Frequency",
			"How often would you like to receive email notifications?",
			[
				...options.map((option) => ({
					text: option.label,
					onPress: () => updateSetting("email_frequency", option.value),
				})),
				{ text: "Cancel", style: "cancel" },
			]
		);
	};

	if (loading || !settings) {
		return (
			<View style={styles.loadingContainer}>
				<Text style={styles.loadingText}>Loading settings...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{" "}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => navigation.goBack()}
				>
					<Ionicons name="arrow-back" size={24} color={theme.colors.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Notification Settings</Text>
				<View style={styles.placeholder} />
			</View>
			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{/* Push Notifications */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Push Notifications</Text>
					<View style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Ionicons
								name="phone-portrait"
								size={20}
								color={theme.colors.primary}
							/>
							<View style={styles.settingText}>
								<Text style={styles.settingLabel}>
									Enable Push Notifications
								</Text>
								<Text style={styles.settingDescription}>
									Receive instant notifications on your device
								</Text>
							</View>
						</View>
						<Switch
							value={settings.push_enabled}
							onValueChange={(value) => updateSetting("push_enabled", value)}
							trackColor={{ false: "#767577", true: theme.colors.primary }}
							thumbColor={settings.push_enabled ? "#fff" : "#f4f3f4"}
						/>
					</View>
				</View>

				{/* Email Notifications */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Email Notifications</Text>
					<View style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Ionicons name="mail" size={20} color={theme.colors.primary} />
							<View style={styles.settingText}>
								<Text style={styles.settingLabel}>
									Enable Email Notifications
								</Text>
								<Text style={styles.settingDescription}>
									Receive notifications via email
								</Text>
							</View>
						</View>
						<Switch
							value={settings.email_enabled}
							onValueChange={(value) => updateSetting("email_enabled", value)}
							trackColor={{ false: "#767577", true: theme.colors.primary }}
							thumbColor={settings.email_enabled ? "#fff" : "#f4f3f4"}
						/>
					</View>

					{settings.email_enabled && (
						<TouchableOpacity
							style={styles.settingItem}
							onPress={showEmailFrequencyPicker}
						>
							<View style={styles.settingInfo}>
								<Ionicons
									name="timer"
									size={20}
									color={theme.colors.textSecondary}
								/>
								<View style={styles.settingText}>
									<Text style={styles.settingLabel}>Email Frequency</Text>
									<Text style={styles.settingDescription}>
										{settings.email_frequency === "immediate" && "Immediate"}
										{settings.email_frequency === "daily" && "Daily Summary"}
										{settings.email_frequency === "weekly" && "Weekly Summary"}
									</Text>
								</View>
							</View>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={theme.colors.textSecondary}
							/>
						</TouchableOpacity>
					)}
				</View>

				{/* Notification Types */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Notification Types</Text>

					<View style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Ionicons
								name="calendar"
								size={20}
								color={theme.colors.success}
							/>
							<View style={styles.settingText}>
								<Text style={styles.settingLabel}>Booking Updates</Text>
								<Text style={styles.settingDescription}>
									Approval, rejection, and status changes
								</Text>
							</View>
						</View>
						<Switch
							value={settings.booking_updates}
							onValueChange={(value) => updateSetting("booking_updates", value)}
							trackColor={{ false: "#767577", true: theme.colors.primary }}
							thumbColor={settings.booking_updates ? "#fff" : "#f4f3f4"}
						/>
					</View>

					<View style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Ionicons name="alarm" size={20} color={theme.colors.warning} />
							<View style={styles.settingText}>
								<Text style={styles.settingLabel}>Booking Reminders</Text>
								<Text style={styles.settingDescription}>
									Reminders before your scheduled bookings
								</Text>
							</View>
						</View>
						<Switch
							value={settings.reminders}
							onValueChange={(value) => updateSetting("reminders", value)}
							trackColor={{ false: "#767577", true: theme.colors.primary }}
							thumbColor={settings.reminders ? "#fff" : "#f4f3f4"}
						/>
					</View>

					{settings.reminders && (
						<TouchableOpacity
							style={styles.settingItem}
							onPress={showReminderTimePicker}
						>
							<View style={styles.settingInfo}>
								<Ionicons
									name="time"
									size={20}
									color={theme.colors.textSecondary}
								/>
								<View style={styles.settingText}>
									<Text style={styles.settingLabel}>Reminder Time</Text>
									<Text style={styles.settingDescription}>
										{getReminderTimeText(settings.reminder_time)} before booking
									</Text>
								</View>
							</View>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={theme.colors.textSecondary}
							/>
						</TouchableOpacity>
					)}

					<View style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Ionicons
								name="construct"
								size={20}
								color={theme.colors.warning}
							/>
							<View style={styles.settingText}>
								<Text style={styles.settingLabel}>Maintenance Alerts</Text>
								<Text style={styles.settingDescription}>
									Hall maintenance and availability updates
								</Text>
							</View>
						</View>
						<Switch
							value={settings.maintenance_alerts}
							onValueChange={(value) =>
								updateSetting("maintenance_alerts", value)
							}
							trackColor={{ false: "#767577", true: theme.colors.primary }}
							thumbColor={settings.maintenance_alerts ? "#fff" : "#f4f3f4"}
						/>
					</View>

					<View style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Ionicons
								name="megaphone"
								size={20}
								color={theme.colors.primary}
							/>
							<View style={styles.settingText}>
								<Text style={styles.settingLabel}>System Announcements</Text>
								<Text style={styles.settingDescription}>
									Important updates and announcements
								</Text>
							</View>
						</View>
						<Switch
							value={settings.system_announcements}
							onValueChange={(value) =>
								updateSetting("system_announcements", value)
							}
							trackColor={{ false: "#767577", true: theme.colors.primary }}
							thumbColor={settings.system_announcements ? "#fff" : "#f4f3f4"}
						/>
					</View>
				</View>

				{/* Actions */}
				<View style={styles.section}>
					<TouchableOpacity
						style={styles.actionButton}
						onPress={async () => {
							Alert.alert(
								"Test Notification",
								"Send a test notification to verify your settings?",
								[
									{ text: "Cancel", style: "cancel" },
									{
										text: "Send Test",
										onPress: async () => {
											if (!user?.id) return;
											await notificationService.createNotification({
												userId: user.id,
												title: "🧪 Test Notification",
												message:
													"This is a test notification to verify your settings are working correctly.",
												type: "system",
												sendPush: settings.push_enabled,
												sendEmail: settings.email_enabled,
											});
											Alert.alert("Success", "Test notification sent!");
										},
									},
								]
							);
						}}
					>
						<Ionicons name="send" size={20} color={theme.colors.primary} />
						<Text style={styles.actionButtonText}>Send Test Notification</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.bottomPadding} />
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
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
		backgroundColor: theme.colors.surface,
	},
	backButton: {
		padding: theme.spacing.xs,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: theme.colors.text,
	},
	placeholder: {
		width: 40,
	},
	scrollView: {
		flex: 1,
	},
	section: {
		backgroundColor: theme.colors.surface,
		marginTop: theme.spacing.md,
		paddingVertical: theme.spacing.sm,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: theme.colors.text,
		paddingHorizontal: theme.spacing.md,
		paddingBottom: theme.spacing.sm,
	},
	settingItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
	},
	settingInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	settingText: {
		marginLeft: theme.spacing.sm,
		flex: 1,
	},
	settingLabel: {
		fontSize: 16,
		fontWeight: "500",
		color: theme.colors.text,
	},
	settingDescription: {
		fontSize: 14,
		color: theme.colors.textSecondary,
		marginTop: 2,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: "500",
		color: theme.colors.primary,
		marginLeft: theme.spacing.sm,
	},
	bottomPadding: {
		height: theme.spacing.xl,
	},
});

export default NotificationSettingsScreen;
