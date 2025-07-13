import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Switch,
	Alert,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "../stores/authStore";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";

interface SettingsScreenProps {}

interface SettingItem {
	id: string;
	title: string;
	description: string;
	type: "toggle" | "navigation" | "action";
	icon: keyof typeof Ionicons.glyphMap;
	value?: boolean;
	onPress?: () => void;
	onToggle?: (value: boolean) => void;
	disabled?: boolean;
	destructive?: boolean;
}

interface SettingSection {
	title: string;
	items: SettingItem[];
}

const SettingsScreen: React.FC<SettingsScreenProps> = () => {
	const navigation = useNavigation();
	const { isDark, toggleTheme } = useTheme();
	const { user, logout } = useAuthStore();

	// Settings state
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [emailNotifications, setEmailNotifications] = useState(true);
	const [pushNotifications, setPushNotifications] = useState(true);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [vibrationEnabled, setVibrationEnabled] = useState(true);
	const [autoRefresh, setAutoRefresh] = useState(true);
	const [offlineMode, setOfflineMode] = useState(false);

	const styles = getStyles(isDark);

	// Load settings from storage
	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		try {
			const settings = await AsyncStorage.getItem("app_settings");
			if (settings) {
				const parsedSettings = JSON.parse(settings);
				setNotificationsEnabled(parsedSettings.notificationsEnabled ?? true);
				setEmailNotifications(parsedSettings.emailNotifications ?? true);
				setPushNotifications(parsedSettings.pushNotifications ?? true);
				setSoundEnabled(parsedSettings.soundEnabled ?? true);
				setVibrationEnabled(parsedSettings.vibrationEnabled ?? true);
				setAutoRefresh(parsedSettings.autoRefresh ?? true);
				setOfflineMode(parsedSettings.offlineMode ?? false);
			}
		} catch (error) {
			console.error("Error loading settings:", error);
		}
	};

	const saveSettings = async (newSettings: any) => {
		try {
			const currentSettings = {
				notificationsEnabled,
				emailNotifications,
				pushNotifications,
				soundEnabled,
				vibrationEnabled,
				autoRefresh,
				offlineMode,
				...newSettings,
			};
			await AsyncStorage.setItem(
				"app_settings",
				JSON.stringify(currentSettings)
			);
		} catch (error) {
			console.error("Error saving settings:", error);
		}
	};

	const handleNotificationsToggle = (value: boolean) => {
		setNotificationsEnabled(value);
		saveSettings({ notificationsEnabled: value });

		if (!value) {
			// If disabling notifications, also disable all notification subtypes
			setEmailNotifications(false);
			setPushNotifications(false);
			setSoundEnabled(false);
			setVibrationEnabled(false);
			saveSettings({
				notificationsEnabled: value,
				emailNotifications: false,
				pushNotifications: false,
				soundEnabled: false,
				vibrationEnabled: false,
			});
		}
	};

	const handleEmailNotificationsToggle = (value: boolean) => {
		setEmailNotifications(value);
		saveSettings({ emailNotifications: value });
	};

	const handlePushNotificationsToggle = (value: boolean) => {
		setPushNotifications(value);
		saveSettings({ pushNotifications: value });
	};

	const handleSoundToggle = (value: boolean) => {
		setSoundEnabled(value);
		saveSettings({ soundEnabled: value });
	};

	const handleVibrationToggle = (value: boolean) => {
		setVibrationEnabled(value);
		saveSettings({ vibrationEnabled: value });
	};

	const handleAutoRefreshToggle = (value: boolean) => {
		setAutoRefresh(value);
		saveSettings({ autoRefresh: value });
	};

	const handleOfflineModeToggle = (value: boolean) => {
		setOfflineMode(value);
		saveSettings({ offlineMode: value });

		if (value) {
			Alert.alert(
				"Offline Mode",
				"Some features may be limited when offline mode is enabled. You can still view cached data and previously downloaded content.",
				[{ text: "OK" }]
			);
		}
	};

	const handleClearCache = () => {
		Alert.alert(
			"Clear Cache",
			"This will remove all cached data including offline hall information and images. You may need to refresh the app data.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: async () => {
						try {
							// Clear specific cache keys (in a real app, you'd clear actual cache)
							const keysToKeep = ["app_settings", "user_session"];
							const allKeys = await AsyncStorage.getAllKeys();
							const keysToRemove = allKeys.filter(
								(key) => !keysToKeep.includes(key)
							);

							if (keysToRemove.length > 0) {
								await AsyncStorage.multiRemove(keysToRemove);
							}

							Alert.alert("Success", "Cache cleared successfully.");
						} catch (error) {
							console.error("Error clearing cache:", error);
							Alert.alert("Error", "Failed to clear cache. Please try again.");
						}
					},
				},
			]
		);
	};

	const handleResetSettings = () => {
		Alert.alert(
			"Reset Settings",
			"This will reset all app settings to their default values. Your account and booking data will not be affected.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reset",
					style: "destructive",
					onPress: async () => {
						try {
							await AsyncStorage.removeItem("app_settings");
							// Reset to default values
							setNotificationsEnabled(true);
							setEmailNotifications(true);
							setPushNotifications(true);
							setSoundEnabled(true);
							setVibrationEnabled(true);
							setAutoRefresh(true);
							setOfflineMode(false);

							Alert.alert("Success", "Settings reset to default values.");
						} catch (error) {
							console.error("Error resetting settings:", error);
							Alert.alert(
								"Error",
								"Failed to reset settings. Please try again."
							);
						}
					},
				},
			]
		);
	};

	const handleLogout = () => {
		Alert.alert(
			"Sign Out",
			"Are you sure you want to sign out? You'll need to sign in again to access your bookings.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Sign Out",
					style: "destructive",
					onPress: () => {
						logout();
						// Navigation will be handled by auth state change
					},
				},
			]
		);
	};

	const handleContactDeveloper = () => {
		// This would navigate to HelpSupportScreen with developer contact pre-selected
		navigation.navigate("HelpSupport" as never);
	};

	const settingSections: SettingSection[] = [
		{
			title: "Appearance",
			items: [
				{
					id: "dark_mode",
					title: "Dark Mode",
					description: "Switch between light and dark themes",
					type: "toggle",
					icon: "moon-outline",
					value: isDark,
					onToggle: toggleTheme,
				},
			],
		},
		{
			title: "Notifications",
			items: [
				{
					id: "notifications",
					title: "Enable Notifications",
					description: "Receive booking updates and reminders",
					type: "toggle",
					icon: "notifications-outline",
					value: notificationsEnabled,
					onToggle: handleNotificationsToggle,
				},
				{
					id: "email_notifications",
					title: "Email Notifications",
					description: "Receive notifications via email",
					type: "toggle",
					icon: "mail-outline",
					value: emailNotifications,
					onToggle: handleEmailNotificationsToggle,
					disabled: !notificationsEnabled,
				},
				{
					id: "push_notifications",
					title: "Push Notifications",
					description: "Receive push notifications on your device",
					type: "toggle",
					icon: "phone-portrait-outline",
					value: pushNotifications,
					onToggle: handlePushNotificationsToggle,
					disabled: !notificationsEnabled,
				},
				{
					id: "sound",
					title: "Sound",
					description: "Play sound for notifications",
					type: "toggle",
					icon: "volume-high-outline",
					value: soundEnabled,
					onToggle: handleSoundToggle,
					disabled: !notificationsEnabled,
				},
				{
					id: "vibration",
					title: "Vibration",
					description: "Vibrate for notifications",
					type: "toggle",
					icon: "phone-portrait-outline",
					value: vibrationEnabled,
					onToggle: handleVibrationToggle,
					disabled: !notificationsEnabled || Platform.OS === "ios",
				},
			],
		},
		{
			title: "App Behavior",
			items: [
				{
					id: "auto_refresh",
					title: "Auto Refresh",
					description: "Automatically refresh data when app opens",
					type: "toggle",
					icon: "refresh-outline",
					value: autoRefresh,
					onToggle: handleAutoRefreshToggle,
				},
				{
					id: "offline_mode",
					title: "Offline Mode",
					description: "Use cached data when network is unavailable",
					type: "toggle",
					icon: "cloud-offline-outline",
					value: offlineMode,
					onToggle: handleOfflineModeToggle,
				},
			],
		},
		{
			title: "Data & Storage",
			items: [
				{
					id: "clear_cache",
					title: "Clear Cache",
					description: "Remove cached images and data",
					type: "action",
					icon: "trash-outline",
					onPress: handleClearCache,
				},
				{
					id: "reset_settings",
					title: "Reset Settings",
					description: "Reset all settings to default values",
					type: "action",
					icon: "refresh-outline",
					onPress: handleResetSettings,
					destructive: true,
				},
			],
		},
		{
			title: "Support",
			items: [
				{
					id: "help_support",
					title: "Help & Support",
					description: "Get help and contact support",
					type: "navigation",
					icon: "help-circle-outline",
					onPress: () => navigation.navigate("HelpSupport" as never),
				},
				{
					id: "contact_developer",
					title: "Contact Developer",
					description: "Reach out to vikashkelly@gmail.com",
					type: "navigation",
					icon: "code-outline",
					onPress: handleContactDeveloper,
				},
			],
		},
		{
			title: "Account",
			items: [
				{
					id: "logout",
					title: "Sign Out",
					description: "Sign out of your account",
					type: "action",
					icon: "log-out-outline",
					onPress: handleLogout,
					destructive: true,
				},
			],
		},
	];

	const renderSettingItem = (item: SettingItem) => {
		const isDisabled = item.disabled || false;
		const textColor = isDisabled
			? isDark
				? Colors.gray[600]
				: Colors.gray[400]
			: item.destructive
			? Colors.error.main
			: isDark
			? Colors.gray[100]
			: Colors.gray[900];

		const descriptionColor = isDisabled
			? isDark
				? Colors.gray[700]
				: Colors.gray[300]
			: isDark
			? Colors.gray[400]
			: Colors.gray[600];

		if (item.type === "toggle") {
			return (
				<View
					key={item.id}
					style={[styles.settingItem, isDisabled && styles.disabledItem]}
				>
					<View style={styles.settingIcon}>
						<Ionicons
							name={item.icon}
							size={20}
							color={
								isDisabled
									? isDark
										? Colors.gray[600]
										: Colors.gray[400]
									: Colors.primary[500]
							}
						/>
					</View>
					<View style={styles.settingContent}>
						<Text style={[styles.settingTitle, { color: textColor }]}>
							{item.title}
						</Text>
						<Text
							style={[styles.settingDescription, { color: descriptionColor }]}
						>
							{item.description}
						</Text>
					</View>
					<Switch
						value={item.value || false}
						onValueChange={item.onToggle}
						disabled={isDisabled}
						trackColor={{
							false: isDark ? Colors.gray[700] : Colors.gray[300],
							true: Colors.primary[500],
						}}
						thumbColor={
							item.value
								? Colors.background.primary
								: isDark
								? Colors.gray[400]
								: Colors.gray[100]
						}
					/>
				</View>
			);
		}

		return (
			<TouchableOpacity
				key={item.id}
				style={[styles.settingItem, isDisabled && styles.disabledItem]}
				onPress={item.onPress}
				disabled={isDisabled}
				activeOpacity={0.7}
			>
				<View style={styles.settingIcon}>
					<Ionicons
						name={item.icon}
						size={20}
						color={
							item.destructive
								? Colors.error.main
								: isDisabled
								? isDark
									? Colors.gray[600]
									: Colors.gray[400]
								: Colors.primary[500]
						}
					/>
				</View>
				<View style={styles.settingContent}>
					<Text style={[styles.settingTitle, { color: textColor }]}>
						{item.title}
					</Text>
					<Text
						style={[styles.settingDescription, { color: descriptionColor }]}
					>
						{item.description}
					</Text>
				</View>
				<Ionicons
					name="chevron-forward"
					size={20}
					color={isDark ? Colors.gray[500] : Colors.gray[400]}
				/>
			</TouchableOpacity>
		);
	};

	const renderSettingSection = (section: SettingSection) => (
		<View key={section.title} style={styles.section}>
			<Text style={styles.sectionTitle}>{section.title}</Text>
			<View style={styles.sectionContent}>
				{section.items.map(renderSettingItem)}
			</View>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons
						name="arrow-back"
						size={24}
						color={isDark ? Colors.gray[100] : Colors.gray[900]}
					/>
				</TouchableOpacity>
				<Text style={styles.title}>Settings</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* User Info */}
				{user && (
					<View style={styles.userSection}>
						<View style={styles.userInfo}>
							<View style={styles.userAvatar}>
								<Text style={styles.userAvatarText}>
									{user.name?.charAt(0).toUpperCase() || "U"}
								</Text>
							</View>
							<View style={styles.userDetails}>
								<Text style={styles.userName}>{user.name || "User"}</Text>
								<Text style={styles.userEmail}>{user.email}</Text>
							</View>
						</View>
					</View>
				)}

				{/* Settings Sections */}
				{settingSections.map(renderSettingSection)}

				{/* App Version */}
				<View style={styles.versionSection}>
					<Text style={styles.versionText}>
						Seminar Hall Booking App v1.0.0
					</Text>
					<Text style={styles.versionSubtext}>
						© 2024 Amity University Patna
					</Text>
					<Text style={styles.versionSubtext}>Developed by Vikash Kelly</Text>
				</View>

				{/* Bottom Spacing */}
				<View style={{ height: 40 }} />
			</ScrollView>
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
			backgroundColor: isDark ? Colors.gray[800] : Colors.background.primary,
		},
		title: {
			fontSize: Typography.fontSize["2xl"],
			fontWeight: Typography.fontWeight.bold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
		},
		content: {
			flex: 1,
		},
		userSection: {
			padding: Spacing[4],
			borderBottomWidth: 1,
			borderBottomColor: isDark ? Colors.gray[700] : Colors.gray[200],
		},
		userInfo: {
			flexDirection: "row",
			alignItems: "center",
		},
		userAvatar: {
			width: 60,
			height: 60,
			borderRadius: BorderRadius.full,
			backgroundColor: Colors.primary[500],
			justifyContent: "center",
			alignItems: "center",
			marginRight: Spacing[3],
		},
		userAvatarText: {
			fontSize: Typography.fontSize["2xl"],
			fontWeight: Typography.fontWeight.bold,
			color: Colors.background.primary,
		},
		userDetails: {
			flex: 1,
		},
		userName: {
			fontSize: Typography.fontSize.lg,
			fontWeight: Typography.fontWeight.semibold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
			marginBottom: 2,
		},
		userEmail: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
		},
		section: {
			padding: Spacing[4],
		},
		sectionTitle: {
			fontSize: Typography.fontSize.sm,
			fontWeight: Typography.fontWeight.semibold,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
			textTransform: "uppercase",
			letterSpacing: 0.5,
			marginBottom: Spacing[3],
		},
		sectionContent: {
			backgroundColor: isDark ? Colors.gray[800] : Colors.background.primary,
			borderRadius: BorderRadius.lg,
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[700] : Colors.gray[200],
			overflow: "hidden",
		},
		settingItem: {
			flexDirection: "row",
			alignItems: "center",
			padding: Spacing[4],
			borderBottomWidth: 1,
			borderBottomColor: isDark ? Colors.gray[700] : Colors.gray[200],
		},
		disabledItem: {
			opacity: 0.5,
		},
		settingIcon: {
			width: 32,
			height: 32,
			borderRadius: BorderRadius.md,
			backgroundColor: isDark ? Colors.gray[700] : Colors.gray[100],
			justifyContent: "center",
			alignItems: "center",
			marginRight: Spacing[3],
		},
		settingContent: {
			flex: 1,
		},
		settingTitle: {
			fontSize: Typography.fontSize.base,
			fontWeight: Typography.fontWeight.medium,
			marginBottom: 2,
		},
		settingDescription: {
			fontSize: Typography.fontSize.sm,
			lineHeight: 18,
		},
		versionSection: {
			padding: Spacing[4],
			alignItems: "center",
		},
		versionText: {
			fontSize: Typography.fontSize.sm,
			fontWeight: Typography.fontWeight.medium,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
			marginBottom: Spacing[1],
		},
		versionSubtext: {
			fontSize: Typography.fontSize.xs,
			color: isDark ? Colors.gray[500] : Colors.gray[500],
			marginBottom: 2,
		},
	});

export default SettingsScreen;
