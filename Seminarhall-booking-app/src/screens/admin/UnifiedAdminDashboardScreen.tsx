import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Dimensions,
	Alert,
	Animated,
	Modal,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	Switch,
	FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StackNavigationProp } from "@react-navigation/stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../../constants/theme";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { AdminTabParamList } from "../../navigation/AdminTabNavigator";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { hallManagementService } from "../../services/hallManagementService";
import { bookingOversightService } from "../../services/bookingOversightService";
import { userManagementService } from "../../services/userManagementService";
import { supabase } from "../../utils/supabaseSetup";
import { adminReportsService } from "../../services/adminReportsService";
import {
	enhancedAdminReportsService,
	AdminDashboardStats,
} from "../../services/enhancedAdminReportsService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Types
interface User {
	id: string;
	name: string;
	email: string;
	phone?: string;
	employee_id?: string;
	department?: string;
	role: "super_admin" | "admin" | "faculty";
	is_active: boolean;
	avatar_url?: string;
	last_login?: string;
	created_at: string;
	updated_at: string;
}

interface DashboardStats {
	total_bookings: number;
	active_bookings: number;
	pending_bookings: number;
	approved_bookings: number;
	completed_bookings: number;
	cancelled_bookings: number;
	rejected_bookings: number;
	todays_bookings: number;
	tomorrows_bookings: number;
	average_booking_duration: number;
	peak_hour: string;
	most_booked_hall: string;
	total_halls: number;
	available_halls: number;
	total_users: number;
	active_users: number;
	super_admins: number;
	admins: number;
	faculty: number;
	pending_approvals: number;
}

interface RecentActivity {
	id: string;
	type: "booking" | "hall" | "user";
	action: string;
	title: string;
	description: string;
	timestamp: string;
	user?: string;
	user_email?: string;
	status?: string;
	urgent?: boolean;
}

interface TabViewProps {
	activeTab: "dashboard" | "users";
	setActiveTab: (tab: "dashboard" | "users") => void;
	userRole: "admin" | "super_admin";
}

interface UserManagementModalProps {
	visible: boolean;
	user: User | null;
	onClose: () => void;
	onSave: (updates: Partial<User>) => Promise<void>;
}

type UnifiedAdminDashboardScreenNavigationProp = CompositeNavigationProp<
	BottomTabNavigationProp<AdminTabParamList, "AdminDashboard">,
	StackNavigationProp<RootStackParamList>
>;

interface UnifiedAdminDashboardScreenProps {
	navigation: UnifiedAdminDashboardScreenNavigationProp;
}

// Helper functions
const formatRelativeTime = (date: Date): string => {
	const now = new Date();
	const diffInMinutes = Math.floor(
		(now.getTime() - date.getTime()) / (1000 * 60)
	);

	if (diffInMinutes < 1) return "Just now";
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) return `${diffInHours}h ago`;

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) return `${diffInDays}d ago`;

	return date.toLocaleDateString();
};

const calculateBookingStats = (bookings: any[]): Partial<DashboardStats> => {
	const now = new Date();
	const today = now.toISOString().split("T")[0];
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

	const todaysBookings = bookings.filter((booking) => {
		let bookingDate = booking.booking_date;
		if (bookingDate && bookingDate.length === 8) {
			bookingDate = `${bookingDate.substring(4, 8)}-${bookingDate.substring(
				2,
				4
			)}-${bookingDate.substring(0, 2)}`;
		}
		return bookingDate === today;
	});

	const tomorrowsBookings = bookings.filter((booking) => {
		let bookingDate = booking.booking_date;
		if (bookingDate && bookingDate.length === 8) {
			bookingDate = `${bookingDate.substring(4, 8)}-${bookingDate.substring(
				2,
				4
			)}-${bookingDate.substring(0, 2)}`;
		}
		return bookingDate === tomorrow;
	});

	const statusCounts = bookings.reduce((acc, booking) => {
		acc[booking.status] = (acc[booking.status] || 0) + 1;
		return acc;
	}, {});

	const averageDuration =
		bookings.length > 0
			? bookings.reduce((sum, booking) => {
					const startTime = parseTime(booking.start_time);
					const endTime = parseTime(booking.end_time);
					return sum + (endTime - startTime);
			  }, 0) / bookings.length
			: 0;

	const hourCounts = bookings.reduce((acc, booking) => {
		const hour = booking.start_time ? booking.start_time.split(":")[0] : "09";
		acc[hour] = (acc[hour] || 0) + 1;
		return acc;
	}, {});

	const peakHour =
		Object.keys(hourCounts).length > 0
			? Object.keys(hourCounts).reduce(
					(a, b) => (hourCounts[a] > hourCounts[b] ? a : b),
					"09"
			  )
			: "09";

	const hallCounts = bookings.reduce((acc, booking) => {
		const hallName = booking.hall_name || "Unknown Hall";
		acc[hallName] = (acc[hallName] || 0) + 1;
		return acc;
	}, {});

	const mostBookedHall =
		Object.keys(hallCounts).length > 0
			? Object.keys(hallCounts).reduce(
					(a, b) => (hallCounts[a] > hallCounts[b] ? a : b),
					"No bookings"
			  )
			: "No bookings";

	return {
		total_bookings: bookings.length,
		active_bookings: statusCounts.approved || 0,
		pending_bookings: statusCounts.pending || 0,
		approved_bookings: statusCounts.approved || 0,
		completed_bookings: statusCounts.completed || 0,
		cancelled_bookings: statusCounts.cancelled || 0,
		rejected_bookings: statusCounts.rejected || 0,
		todays_bookings: todaysBookings.length,
		tomorrows_bookings: tomorrowsBookings.length,
		average_booking_duration: Math.round(averageDuration),
		peak_hour: `${peakHour}:00`,
		most_booked_hall: mostBookedHall,
	};
};

const parseTime = (timeStr: string): number => {
	const [hours, minutes] = timeStr.split(":").map(Number);
	return hours * 60 + minutes;
};

// Tab View Component
const TabView: React.FC<TabViewProps> = ({
	activeTab,
	setActiveTab,
	userRole,
}) => {
	const { isDark } = useTheme();

	return (
		<View style={[styles.tabContainer, isDark && styles.tabContainerDark]}>
			<TouchableOpacity
				style={[
					styles.tab,
					activeTab === "dashboard" && styles.activeTab,
					isDark && styles.tabDark,
					activeTab === "dashboard" && isDark && styles.activeTabDark,
				]}
				onPress={() => setActiveTab("dashboard")}
			>
				<Ionicons
					name="grid-outline"
					size={20}
					color={
						activeTab === "dashboard"
							? Colors.primary[600]
							: isDark
							? Colors.dark.text.secondary
							: Colors.gray[600]
					}
				/>
				<Text
					style={[
						styles.tabText,
						activeTab === "dashboard" && styles.activeTabText,
						isDark && styles.tabTextDark,
						activeTab === "dashboard" && isDark && styles.activeTabTextDark,
					]}
				>
					Dashboard
				</Text>
			</TouchableOpacity>

			{userRole === "super_admin" && (
				<TouchableOpacity
					style={[
						styles.tab,
						activeTab === "users" && styles.activeTab,
						isDark && styles.tabDark,
						activeTab === "users" && isDark && styles.activeTabDark,
					]}
					onPress={() => setActiveTab("users")}
				>
					<Ionicons
						name="people-outline"
						size={20}
						color={
							activeTab === "users"
								? Colors.primary[600]
								: isDark
								? Colors.dark.text.secondary
								: Colors.gray[600]
						}
					/>
					<Text
						style={[
							styles.tabText,
							activeTab === "users" && styles.activeTabText,
							isDark && styles.tabTextDark,
							activeTab === "users" && isDark && styles.activeTabTextDark,
						]}
					>
						Users
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
};

// Stats Card Component
const StatsCard: React.FC<{
	title: string;
	value: number | string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	onPress?: () => void;
}> = ({ title, value, icon, color, onPress }) => {
	const { isDark } = useTheme();

	return (
		<TouchableOpacity
			style={[styles.statsCard, isDark && styles.statsCardDark]}
			onPress={onPress}
			activeOpacity={onPress ? 0.7 : 1}
		>
			<View
				style={[styles.statsIconContainer, { backgroundColor: color + "20" }]}
			>
				<Ionicons name={icon} size={24} color={color} />
			</View>
			<View style={styles.statsContent}>
				<Text style={[styles.statsValue, { color }]}>{value}</Text>
				<Text style={[styles.statsTitle, isDark && styles.statsTitleDark]}>
					{title}
				</Text>
			</View>
		</TouchableOpacity>
	);
};

// User Item Component for User Management
const UserItem: React.FC<{
	user: User;
	onManage: (user: User) => void;
	onToggleActive: (user: User) => void;
	onDeleteUser: (user: User) => void;
}> = ({ user, onManage, onToggleActive, onDeleteUser }) => {
	const { isDark } = useTheme();

	const getRoleColor = (role: string) => {
		switch (role) {
			case "super_admin":
				return Colors.error.main;
			case "admin":
				return Colors.warning.main;
			case "faculty":
				return Colors.success.main;
			default:
				return Colors.gray[500];
		}
	};

	const getRoleLabel = (role: string) => {
		switch (role) {
			case "super_admin":
				return "Super Admin";
			case "admin":
				return "Admin";
			case "faculty":
				return "Faculty";
			default:
				return "Unknown";
		}
	};

	return (
		<View style={[styles.userCard, isDark && styles.userCardDark]}>
			<View style={styles.userInfo}>
				<View style={styles.userHeader}>
					<Text style={[styles.userName, isDark && styles.userNameDark]}>
						{user.name}
					</Text>
					<View
						style={[
							styles.roleBadge,
							{ backgroundColor: getRoleColor(user.role) + "20" },
						]}
					>
						<Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
							{getRoleLabel(user.role)}
						</Text>
					</View>
				</View>
				<Text style={[styles.userEmail, isDark && styles.userEmailDark]}>
					{user.email}
				</Text>
				{user.department && (
					<Text
						style={[styles.userDepartment, isDark && styles.userDepartmentDark]}
					>
						{user.department}
					</Text>
				)}
				<View style={styles.userMeta}>
					<Text
						style={[styles.userMetaText, isDark && styles.userMetaTextDark]}
					>
						Status: {user.is_active ? "Active" : "Inactive"}
					</Text>
					<Text
						style={[styles.userMetaText, isDark && styles.userMetaTextDark]}
					>
						Joined: {new Date(user.created_at).toLocaleDateString()}
					</Text>
				</View>
			</View>

			<View style={styles.userActions}>
				<TouchableOpacity
					style={[styles.actionButton, styles.manageButton]}
					onPress={() => onManage(user)}
				>
					<Ionicons
						name="settings-outline"
						size={20}
						color={Colors.primary[600]}
					/>
				</TouchableOpacity>
				<View style={{ width: 8 }} />
				<TouchableOpacity
					style={[styles.actionButton, styles.deactivateButton]}
					onPress={() => onToggleActive(user)}
				>
					<Ionicons
						name={user.is_active ? "pause-outline" : "play-outline"}
						size={20}
						color={user.is_active ? Colors.warning.main : Colors.success.main}
					/>
				</TouchableOpacity>
				{user.role !== "super_admin" && (
					<TouchableOpacity
						style={[styles.actionButton, styles.deleteButton]}
						onPress={() => onDeleteUser(user)}
					>
						<Ionicons
							name="trash-outline"
							size={20}
							color={Colors.error.main}
						/>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
};

// User Management Modal Component
const UserManagementModal: React.FC<UserManagementModalProps> = ({
	visible,
	user,
	onClose,
	onSave,
}) => {
	const { isDark } = useTheme();
	const [name, setName] = useState("");
	const [role, setRole] = useState("");
	const [department, setDepartment] = useState("");
	const [employeeId, setEmployeeId] = useState("");
	const [phone, setPhone] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (user) {
			setName(user.name || "");
			setRole(user.role || "");
			setDepartment(user.department || "");
			setEmployeeId(user.employee_id || "");
			setPhone(user.phone || "");
			setIsActive(user.is_active);
		}
	}, [user]);

	const handleSave = async () => {
		try {
			setIsLoading(true);

			const updates: Partial<User> = {
				name,
				role: role as "super_admin" | "admin" | "faculty",
				department,
				employee_id: employeeId,
				phone,
				is_active: isActive,
			};

			await onSave(updates);

			setIsLoading(false);
			onClose();
		} catch (error) {
			console.error("Error updating user:", error);
			Alert.alert("Error", "Failed to update user. Please try again.");
			setIsLoading(false);
		}
	};

	const handleResetPassword = async () => {
		try {
			if (!user) return;

			Alert.alert(
				"Reset Password",
				`Are you sure you want to send a password reset email to ${user.email}?`,
				[
					{ text: "Cancel" },
					{
						text: "Reset",
						onPress: async () => {
							setIsLoading(true);
							try {
								if (user) {
									await userManagementService.requestPasswordReset(user.email);
								}
								Alert.alert("Success", "Password reset email has been sent");
							} catch (error) {
								console.error("Error resetting password:", error);
								Alert.alert(
									"Error",
									"Failed to send password reset. Please try again."
								);
							} finally {
								setIsLoading(false);
							}
						},
					},
				]
			);
		} catch (error) {
			console.error("Error resetting password:", error);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
			statusBarTranslucent={true}
		>
			<View style={styles.modalOverlay}>
				<View
					style={[
						styles.modalContainer,
						isDark && styles.modalContainerDark,
						{
							width: Math.min(screenWidth * 0.95, 500),
							maxHeight: screenHeight * 0.9,
						},
					]}
				>
					{/* Modal Header */}
					<View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
						<Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
							Manage User{user ? ` - ${user.name}` : ""}
						</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons
								name="close"
								size={24}
								color={isDark ? Colors.dark.text.secondary : Colors.gray[600]}
							/>
						</TouchableOpacity>
					</View>

					{/* Modal Content */}
					<ScrollView
						style={styles.modalScrollContent}
						contentContainerStyle={[
							styles.modalContent,
							isDark && styles.modalContentDark,
							{ flexGrow: 1 },
						]}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						bounces={false}
						nestedScrollEnabled={true}
					>
						{/* User details form */}
						<View style={styles.formGroup}>
							<Text
								style={[styles.inputLabel, isDark && styles.inputLabelDark]}
							>
								Full Name
							</Text>
							<TextInput
								style={[styles.input, isDark && styles.inputDark]}
								value={name}
								onChangeText={setName}
								placeholder="Enter name"
								placeholderTextColor={
									isDark ? Colors.dark.text.tertiary : Colors.gray[400]
								}
							/>
						</View>

						{user && user.role !== "super_admin" && (
							<View style={styles.formGroup}>
								<Text
									style={[styles.inputLabel, isDark && styles.inputLabelDark]}
								>
									Role
								</Text>
								<View style={styles.roleSelector}>
									<TouchableOpacity
										style={[
											styles.rolePill,
											role === "faculty" && styles.rolePillActive,
										]}
										onPress={() => setRole("faculty")}
									>
										<Text
											style={[
												styles.rolePillText,
												role === "faculty" && styles.rolePillTextActive,
											]}
										>
											Faculty
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[
											styles.rolePill,
											role === "admin" && styles.rolePillActive,
										]}
										onPress={() => setRole("admin")}
									>
										<Text
											style={[
												styles.rolePillText,
												role === "admin" && styles.rolePillTextActive,
											]}
										>
											Admin
										</Text>
									</TouchableOpacity>

									{user && user.role === "admin" && (
										<TouchableOpacity
											style={[
												styles.rolePill,
												role === "super_admin" && styles.rolePillActive,
											]}
											onPress={() => setRole("super_admin")}
										>
											<Text
												style={[
													styles.rolePillText,
													role === "super_admin" && styles.rolePillTextActive,
												]}
											>
												Super Admin
											</Text>
										</TouchableOpacity>
									)}
								</View>
							</View>
						)}

						<View style={styles.formGroup}>
							<Text
								style={[styles.inputLabel, isDark && styles.inputLabelDark]}
							>
								Department
							</Text>
							<TextInput
								style={[styles.input, isDark && styles.inputDark]}
								value={department}
								onChangeText={setDepartment}
								placeholder="Enter department"
								placeholderTextColor={
									isDark ? Colors.dark.text.tertiary : Colors.gray[400]
								}
							/>
						</View>

						<View style={styles.formGroup}>
							<Text
								style={[styles.inputLabel, isDark && styles.inputLabelDark]}
							>
								Employee ID
							</Text>
							<TextInput
								style={[styles.input, isDark && styles.inputDark]}
								value={employeeId}
								onChangeText={setEmployeeId}
								placeholder="Enter employee ID"
								placeholderTextColor={
									isDark ? Colors.dark.text.tertiary : Colors.gray[400]
								}
							/>
						</View>

						<View style={styles.formGroup}>
							<Text
								style={[styles.inputLabel, isDark && styles.inputLabelDark]}
							>
								Phone
							</Text>
							<TextInput
								style={[styles.input, isDark && styles.inputDark]}
								value={phone}
								onChangeText={setPhone}
								placeholder="Enter phone number"
								keyboardType="phone-pad"
								placeholderTextColor={
									isDark ? Colors.dark.text.tertiary : Colors.gray[400]
								}
							/>
						</View>

						<View style={styles.switchContainer}>
							<Text
								style={[styles.inputLabel, isDark && styles.inputLabelDark]}
							>
								Account Active
							</Text>
							<Switch
								value={isActive}
								onValueChange={setIsActive}
								trackColor={{
									false: Colors.gray[300],
									true: Colors.primary[300],
								}}
								thumbColor={isActive ? Colors.primary[600] : Colors.gray[500]}
							/>
						</View>

						<View
							style={[styles.modalButtons, isDark && styles.modalButtonsDark]}
						>
							<TouchableOpacity
								style={styles.resetPasswordButton}
								onPress={handleResetPassword}
								disabled={isLoading}
							>
								<Text style={styles.resetPasswordText}>Reset Password</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.saveButton, isLoading && styles.disabledButton]}
								onPress={handleSave}
								disabled={isLoading}
							>
								{isLoading ? (
									<ActivityIndicator color="white" size="small" />
								) : (
									<Text style={styles.saveButtonText}>Save Changes</Text>
								)}
							</TouchableOpacity>
						</View>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
};



// Main Unified Admin Dashboard Screen
export default function UnifiedAdminDashboardScreen({
	navigation,
}: UnifiedAdminDashboardScreenProps) {
	const { user } = useAuthStore();
	const { isDark } = useTheme();

	// State
	const [activeTab, setActiveTab] = useState<"dashboard" | "users">(
		"dashboard"
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
		total_bookings: 0,
		active_bookings: 0,
		pending_bookings: 0,
		approved_bookings: 0,
		completed_bookings: 0,
		cancelled_bookings: 0,
		rejected_bookings: 0,
		todays_bookings: 0,
		tomorrows_bookings: 0,
		average_booking_duration: 0,
		peak_hour: "09:00",
		most_booked_hall: "No bookings",
		total_halls: 0,
		available_halls: 0,
		total_users: 0,
		active_users: 0,
		super_admins: 0,
		admins: 0,
		faculty: 0,
		pending_approvals: 0,
	});
	const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
		[]
	);
	const [users, setUsers] = useState<User[]>([]);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [isUserModalVisible, setIsUserModalVisible] = useState(false);

	// Check if user is super admin
	const isSuperAdmin = user?.role === "super_admin";

	// Load dashboard data
	const loadDashboardData = useCallback(async () => {
		try {
			const [bookingsResponse, hallsResponse, pendingApprovalsCount] = await Promise.all([
				bookingOversightService.getBookings({ status: "all" }),
				hallManagementService.getAllHalls(),
				userManagementService.getPendingApprovalsCount(),
			]);

			const bookingStats = calculateBookingStats(bookingsResponse);
			const availableHalls = hallsResponse.filter(
				(hall: any) => hall.is_available
			);

			setDashboardStats({
				...bookingStats,
				total_halls: hallsResponse.length,
				available_halls: availableHalls.length,
				total_users: 0,
				active_users: 0,
				super_admins: 0,
				admins: 0,
				faculty: 0,
				pending_approvals: pendingApprovalsCount,
			} as DashboardStats);

			// Load recent activities
			const activities = await getRecentActivities();
			setRecentActivities(activities);

			// If super admin, load user stats
			if (isSuperAdmin) {
				await loadUserData();
			}
		} catch (error) {
			console.error("Error loading dashboard data:", error);
		}
	}, [isSuperAdmin]);

	// Load user data (for super admin)
	const loadUserData = useCallback(async () => {
		try {
			const [usersResponse, pendingApprovalsCount] = await Promise.all([
				userManagementService.getAllUsers(),
				userManagementService.getPendingApprovalsCount(),
			]);
			
			setUsers(usersResponse.users);

			// Calculate user stats
			const userStats = usersResponse.users.reduce(
				(acc: any, user: any) => {
					acc.total_users++;
					if (user.is_active) acc.active_users++;
					acc[user.role]++;
					return acc;
				},
				{
					total_users: 0,
					active_users: 0,
					super_admins: 0,
					admins: 0,
					faculty: 0,
				}
			);

			setDashboardStats((prev) => ({
				...prev,
				...userStats,
				pending_approvals: pendingApprovalsCount,
			}));
		} catch (error) {
			console.error("Error loading user data:", error);
		}
	}, []);

	// Get recent activities
	const getRecentActivities = async (): Promise<RecentActivity[]> => {
		try {
			const recentBookings = await bookingOversightService.getBookings({
				status: "all",
			});

			const activities: RecentActivity[] = [];

			recentBookings.slice(0, 10).forEach((booking: any) => {
				const createdAt = new Date(booking.created_at);

				activities.push({
					id: `booking-created-${booking.id}`,
					type: "booking",
					action: "created",
					title: `New Booking Request`,
					description: `${
						booking.user_name || booking.user_email?.split("@")[0] || "User"
					} requested ${booking.hall_name} for ${booking.purpose}`,
					timestamp: formatRelativeTime(createdAt),
					user: booking.user_name || booking.user_email?.split("@")[0],
					user_email: booking.user_email,
					status: booking.status,
					urgent: booking.status === "pending",
				});
			});

			return activities.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);
		} catch (error) {
			console.error("Error fetching recent activities:", error);
			return [];
		}
	};

	// Handle refresh
	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		await loadDashboardData();
		setIsRefreshing(false);
	}, [loadDashboardData]);

	// User management functions
	const handleManageUser = (user: User) => {
		setSelectedUser(user);
		setIsUserModalVisible(true);
	};

	const handleToggleUserActive = async (user: User) => {
		try {
			const action = user.is_active ? "deactivate" : "activate";
			Alert.alert(
				`${action.charAt(0).toUpperCase() + action.slice(1)} User`,
				`Are you sure you want to ${action} ${user.name}?`,
				[
					{ text: "Cancel" },
					{
						text: action.charAt(0).toUpperCase() + action.slice(1),
						onPress: async () => {
							await userManagementService.updateUser(user.id, {
								is_active: !user.is_active,
							} as any);
							await loadUserData();
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						},
					},
				]
			);
		} catch (error) {
			console.error("Error toggling user active status:", error);
			Alert.alert("Error", "Failed to update user status. Please try again.");
		}
	};

	const handleDeleteUser = async (user: User) => {
		Alert.alert(
			"Delete User",
			`Are you sure you want to delete ${user.name}? This action cannot be undone.`,
			[
				{ text: "Cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await userManagementService.deleteUser(user.id);
							await loadUserData();
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
						} catch (error) {
							console.error("Error deleting user:", error);
							Alert.alert("Error", "Failed to delete user. Please try again.");
						}
					},
				},
			]
		);
	};

	const handleSaveUser = async (updates: Partial<User>) => {
		if (!selectedUser) return;

		try {
			await userManagementService.updateUser(selectedUser.id, updates);
			await loadUserData();
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch (error) {
			console.error("Error updating user:", error);
			throw error;
		}
	};

	// Initialize data
	useEffect(() => {
		const initializeData = async () => {
			setIsLoading(true);
			await loadDashboardData();
			setIsLoading(false);
		};

		initializeData();
	}, [loadDashboardData]);

	// Render dashboard stats
	const renderDashboardStats = () => (
		<>
			{/* Booking Stats */}
			<View style={styles.section}>
				<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
					Booking Overview
				</Text>
				<View style={styles.statsGrid}>
					<StatsCard
						title="Total Bookings"
						value={dashboardStats.total_bookings}
						icon="calendar-outline"
						color={Colors.primary[600]}
						onPress={() => navigation.navigate("BookingOversight")}
					/>
					<StatsCard
						title="Pending"
						value={dashboardStats.pending_bookings}
						icon="time-outline"
						color={Colors.warning.main}
						onPress={() => navigation.navigate("BookingOversight")}
					/>
					<StatsCard
						title="Active"
						value={dashboardStats.active_bookings}
						icon="checkmark-circle-outline"
						color={Colors.success.main}
						onPress={() => navigation.navigate("BookingOversight")}
					/>
					<StatsCard
						title="Today"
						value={dashboardStats.todays_bookings}
						icon="today-outline"
						color={Colors.primary[500]}
					/>
				</View>
			</View>

			{/* Hall Stats */}
			<View style={styles.section}>
				<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
					Hall Management
				</Text>
				<View style={styles.statsGrid}>
					<StatsCard
						title="Total Halls"
						value={dashboardStats.total_halls}
						icon="business-outline"
						color={Colors.primary[600]}
						onPress={() => navigation.navigate("HallManagement")}
					/>
					<StatsCard
						title="Available"
						value={dashboardStats.available_halls}
						icon="checkbox-outline"
						color={Colors.success.main}
						onPress={() => navigation.navigate("HallManagement")}
					/>
					<StatsCard
						title="User Approvals"
						value={dashboardStats.pending_approvals}
						icon="person-add-outline"
						color={Colors.primary[400]}
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
							navigation.navigate("UserApprovals");
						}}
					/>
					<StatsCard
						title="Peak Hour"
						value={dashboardStats.peak_hour}
						icon="trending-up-outline"
						color={Colors.primary[500]}
					/>
					<StatsCard
						title="Most Booked"
						value={dashboardStats.most_booked_hall}
						icon="star-outline"
						color={Colors.warning.main}
					/>
				</View>
			</View>

			{/* User Stats (Super Admin Only) */}
			{isSuperAdmin && (
				<View style={styles.section}>
					<Text
						style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
					>
						User Management
					</Text>
					<View style={styles.statsGrid}>
						<StatsCard
							title="Total Users"
							value={dashboardStats.total_users}
							icon="people-outline"
							color={Colors.primary[600]}
							onPress={() => setActiveTab("users")}
						/>
						<StatsCard
							title="Active Users"
							value={dashboardStats.active_users}
							icon="person-outline"
							color={Colors.success.main}
							onPress={() => setActiveTab("users")}
						/>
						<StatsCard
							title="Admins"
							value={dashboardStats.admins}
							icon="shield-outline"
							color={Colors.warning.main}
							onPress={() => setActiveTab("users")}
						/>
						<StatsCard
							title="Faculty"
							value={dashboardStats.faculty}
							icon="school-outline"
							color={Colors.primary[500]}
							onPress={() => setActiveTab("users")}
						/>
					</View>
				</View>
			)}

			{/* Recent Activities */}
			<View style={styles.section}>
				<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
					Recent Activities
				</Text>
				{recentActivities.length > 0 ? (
					recentActivities.slice(0, 5).map((activity) => (
						<View
							key={activity.id}
							style={[styles.activityCard, isDark && styles.activityCardDark]}
						>
							<View style={styles.activityIcon}>
								<Ionicons
									name={
										activity.type === "booking"
											? "calendar-outline"
											: activity.type === "hall"
											? "business-outline"
											: "person-outline"
									}
									size={20}
									color={
										activity.urgent ? Colors.error.main : Colors.primary[600]
									}
								/>
							</View>
							<View style={styles.activityContent}>
								<Text
									style={[
										styles.activityTitle,
										isDark && styles.activityTitleDark,
									]}
									accessibilityLabel={activity.title}
								>
									{activity.title}
								</Text>
								<Text
									style={[
										styles.activityDescription,
										isDark && styles.activityDescriptionDark,
									]}
									accessibilityLabel={activity.description}
								>
									{activity.description}
								</Text>
								<Text
									style={[
										styles.activityTimestamp,
										isDark && styles.activityTimestampDark,
									]}
									accessibilityLabel={`Activity time: ${activity.timestamp}`}
								>
									{activity.timestamp}
								</Text>
							</View>
							{activity.urgent && (
								<View style={styles.urgentBadge}>
									<Text style={styles.urgentText} accessibilityLabel="Urgent">
										!
									</Text>
								</View>
							)}
						</View>
					))
				) : (
					<Text style={[styles.noDataText, isDark && styles.noDataTextDark]}>
						No recent activities
					</Text>
				)}
			</View>
		</>
	);

	// Render user management
	const renderUserManagement = () => (
		<View style={styles.section}>
			<Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
				User Management
			</Text>
			<FlatList
				data={users}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<UserItem
						user={item}
						onManage={handleManageUser}
						onToggleActive={handleToggleUserActive}
						onDeleteUser={handleDeleteUser}
					/>
				)}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<Text style={[styles.noDataText, isDark && styles.noDataTextDark]}>
						No users found
					</Text>
				}
			/>
		</View>
	);

	if (isLoading) {
		return (
			<View
				style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
			>
				<ActivityIndicator size="large" color={Colors.primary[600]} />
				<Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
					Loading dashboard...
				</Text>
			</View>
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
								Colors.dark.background.secondary,
						  ]
						: [Colors.primary[600], Colors.primary[700]]
				}
				style={styles.header}
			>
				<View style={styles.headerContent}>
					<View>
						<Text
							style={[styles.headerTitle, isDark && styles.headerTitleDark]}
							accessibilityRole="header"
							accessibilityLabel={
								isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"
							}
						>
							{isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
						</Text>
						<Text
							style={[
								styles.headerSubtitle,
								isDark && styles.headerSubtitleDark,
							]}
							accessibilityLabel={`Welcome back, ${user?.name || "User"}`}
						>
							{`Welcome back, ${user?.name || "User"}`}
						</Text>
					</View>
					<TouchableOpacity
						style={styles.headerAction}
						onPress={() => {
							/* Handle profile navigation */
						}}
					>
						<Ionicons
							name="person-circle-outline"
							size={32}
							color={isDark ? Colors.dark.text.primary : Colors.text.inverse}
						/>
					</TouchableOpacity>
				</View>
			</LinearGradient>

			{/* Tab View (only show for super admin) */}
			{isSuperAdmin && (
				<TabView
					activeTab={activeTab}
					setActiveTab={setActiveTab}
					userRole={user?.role === "faculty" ? "admin" : user?.role || "admin"}
				/>
			)}

			{/* Content */}
			{activeTab === "dashboard" ? (
				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.contentContainer}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={handleRefresh}
						/>
					}
					showsVerticalScrollIndicator={false}
				>
					{renderDashboardStats()}
				</ScrollView>
			) : (
				<View style={styles.content}>
					<Text
						style={[
							styles.sectionTitle,
							isDark && styles.sectionTitleDark,
							{ paddingHorizontal: Spacing[5] },
						]}
					>
						User Management
					</Text>
					<FlatList
						contentContainerStyle={[
							styles.contentContainer,
							{ paddingHorizontal: Spacing[5] },
						]}
						data={users}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<UserItem
								user={item}
								onManage={handleManageUser}
								onToggleActive={handleToggleUserActive}
								onDeleteUser={handleDeleteUser}
							/>
						)}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={
							<Text
								style={[styles.noDataText, isDark && styles.noDataTextDark]}
							>
								No users found
							</Text>
						}
						refreshControl={
							<RefreshControl
								refreshing={isRefreshing}
								onRefresh={handleRefresh}
							/>
						}
					/>
				</View>
			)}

			{/* User Management Modal */}
			<UserManagementModal
				visible={isUserModalVisible}
				user={selectedUser}
				onClose={() => {
					setIsUserModalVisible(false);
					setSelectedUser(null);
				}}
				onSave={handleSaveUser}
			/>

		</SafeAreaView>
	);
}

// Styles
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
		backgroundColor: Colors.background.primary,
	},
	loadingContainerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	loadingText: {
		marginTop: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
	},
	loadingTextDark: {
		color: Colors.dark.text.secondary,
	},
	header: {
		paddingTop: Spacing[5],
		paddingHorizontal: Spacing[5],
		paddingBottom: Spacing[3],
	},
	headerContent: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.inverse,
	},
	headerTitleDark: {
		color: Colors.dark.text.primary,
	},
	headerSubtitle: {
		fontSize: Typography.fontSize.base,
		color: Colors.primary[100],
		marginTop: Spacing[1],
	},
	headerSubtitleDark: {
		color: Colors.dark.text.secondary,
	},
	headerAction: {
		padding: Spacing[1],
	},
	tabContainer: {
		flexDirection: "row",
		backgroundColor: Colors.background.primary,
		marginHorizontal: Spacing[5],
		marginTop: -Spacing[3],
		borderRadius: BorderRadius.lg,
		padding: Spacing[1],
		...Shadows.sm,
	},
	tabContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	tab: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing[3],
		paddingHorizontal: Spacing[2],
		borderRadius: BorderRadius.md,
	},
	tabDark: {
		backgroundColor: "transparent",
	},
	activeTab: {
		backgroundColor: Colors.primary[50],
	},
	activeTabDark: {
		backgroundColor: Colors.primary[900],
	},
	tabText: {
		marginLeft: Spacing[1],
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.gray[600],
	},
	tabTextDark: {
		color: Colors.dark.text.secondary,
	},
	activeTabText: {
		color: Colors.primary[600],
	},
	activeTabTextDark: {
		color: Colors.primary[400],
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: Spacing[5],
	},
	section: {
		marginBottom: Spacing[8],
	},
	sectionTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[3],
	},
	sectionTitleDark: {
		color: Colors.dark.text.primary,
	},
	statsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginHorizontal: -Spacing[1],
	},
	statsCard: {
		width: (screenWidth - Spacing[5] * 2 - Spacing[1] * 2) / 2,
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[3],
		marginHorizontal: Spacing[1],
		marginBottom: Spacing[3],
		flexDirection: "row",
		alignItems: "center",
		...Shadows.sm,
	},
	statsCardDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	statsIconContainer: {
		width: 48,
		height: 48,
		borderRadius: BorderRadius.full,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[2],
	},
	statsContent: {
		flex: 1,
	},
	statsValue: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		marginBottom: Spacing[1],
	},
	statsTitle: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.secondary,
	},
	statsTitleDark: {
		color: Colors.dark.text.secondary,
	},
	activityCard: {
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[3],
		marginBottom: Spacing[2],
		flexDirection: "row",
		alignItems: "flex-start",
		...Shadows.sm,
	},
	activityCardDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	activityIcon: {
		width: 40,
		height: 40,
		borderRadius: BorderRadius.full,
		backgroundColor: Colors.primary[50],
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[2],
	},
	activityContent: {
		flex: 1,
	},
	activityTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
	},
	activityTitleDark: {
		color: Colors.dark.text.primary,
	},
	activityDescription: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[1],
	},
	activityDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	activityTimestamp: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
	},
	activityTimestampDark: {
		color: Colors.dark.text.tertiary,
	},
	urgentBadge: {
		width: 24,
		height: 24,
		borderRadius: BorderRadius.full,
		backgroundColor: Colors.error.main,
		justifyContent: "center",
		alignItems: "center",
	},
	urgentText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.inverse,
	},
	noDataText: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.secondary,
		textAlign: "center",
		marginTop: Spacing[5],
	},
	noDataTextDark: {
		color: Colors.dark.text.secondary,
	},
	userCard: {
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[3],
		marginBottom: Spacing[3],
		flexDirection: "row",
		alignItems: "center",
		...Shadows.sm,
	},
	userCardDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	userInfo: {
		flex: 1,
	},
	userHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing[1],
	},
	userName: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginRight: Spacing[2],
	},
	userNameDark: {
		color: Colors.dark.text.primary,
	},
	roleBadge: {
		paddingHorizontal: Spacing[2],
		paddingVertical: Spacing[1],
		borderRadius: BorderRadius.md,
	},
	roleText: {
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.semibold,
	},
	userEmail: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[1],
	},
	userEmailDark: {
		color: Colors.dark.text.secondary,
	},
	userDepartment: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.tertiary,
		marginBottom: Spacing[1],
	},
	userDepartmentDark: {
		color: Colors.dark.text.tertiary,
	},
	userMeta: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	userMetaText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
	},
	userMetaTextDark: {
		color: Colors.dark.text.tertiary,
	},
	userActions: {
		flexDirection: "row",
		alignItems: "center",
	},
	actionButton: {
		width: 40,
		height: 40,
		borderRadius: BorderRadius.full,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: Spacing[2],
	},
	manageButton: {
		backgroundColor: Colors.primary[50],
	},
	activateButton: {
		backgroundColor: Colors.success.light,
	},
	deactivateButton: {
		backgroundColor: Colors.warning.light,
	},
	deleteButton: {
		backgroundColor: Colors.error.light,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: Spacing[5],
	},
	modalContainer: {
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.xl,
		overflow: "hidden",
		...Shadows.lg,
	},
	modalContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: Spacing[5],
		borderBottomWidth: 1,
		borderBottomColor: Colors.gray[200],
	},
	modalHeaderDark: {
		borderBottomColor: Colors.dark.border.main,
	},
	modalTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
	},
	modalTitleDark: {
		color: Colors.dark.text.primary,
	},
	closeButton: {
		padding: Spacing[1],
	},
	modalScrollContent: {
		maxHeight: screenHeight * 0.7,
	},
	modalContent: {
		padding: Spacing[5],
	},
	modalContentDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	formGroup: {
		marginBottom: Spacing[3],
	},
	inputLabel: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.primary,
		marginBottom: Spacing[2],
	},
	inputLabelDark: {
		color: Colors.dark.text.primary,
	},
	input: {
		borderWidth: 1,
		borderColor: Colors.gray[300],
		borderRadius: BorderRadius.md,
		padding: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
	},
	inputDark: {
		borderColor: Colors.dark.border.main,
		backgroundColor: Colors.dark.background.primary,
		color: Colors.dark.text.primary,
	},
	roleSelector: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginTop: Spacing[2],
	},
	rolePill: {
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[2],
		borderRadius: BorderRadius.full,
		backgroundColor: Colors.gray[100],
		marginRight: Spacing[2],
		marginBottom: Spacing[2],
	},
	rolePillActive: {
		backgroundColor: Colors.primary[100],
	},
	rolePillText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.gray[600],
	},
	rolePillTextActive: {
		color: Colors.primary[600],
	},
	switchContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing[5],
	},
	modalButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: Spacing[5],
	},
	modalButtonsDark: {
		borderTopColor: Colors.dark.border.main,
	},
	resetPasswordButton: {
		flex: 1,
		backgroundColor: Colors.gray[100],
		paddingVertical: Spacing[3],
		paddingHorizontal: Spacing[5],
		borderRadius: BorderRadius.md,
		alignItems: "center",
		marginRight: Spacing[2],
	},
	resetPasswordText: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.gray[700],
	},
	saveButton: {
		flex: 1,
		backgroundColor: Colors.primary[600],
		paddingVertical: Spacing[3],
		paddingHorizontal: Spacing[5],
		borderRadius: BorderRadius.md,
		alignItems: "center",
		marginLeft: Spacing[2],
	},
	disabledButton: {
		opacity: 0.6,
	},
	saveButtonText: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.inverse,
	},
	// User Approvals Modal styles
	approvalsModalContainer: {
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.xl,
		overflow: "hidden",
		width: Math.min(screenWidth * 0.95, 600),
		maxHeight: screenHeight * 0.8,
		...Shadows.lg,
	},
	approvalsModalContent: {
		flex: 1,
		padding: Spacing[3],
		minHeight: 200,
		maxHeight: screenHeight * 0.6,
	},
	pendingUserCard: {
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[3],
		marginBottom: Spacing[2],
		...Shadows.sm,
	},
	pendingUserCardDark: {
		backgroundColor: Colors.dark.background.tertiary,
	},
	pendingUserInfo: {
		marginBottom: Spacing[2],
	},
	pendingUserName: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
	},
	pendingUserNameDark: {
		color: Colors.dark.text.primary,
	},
	pendingUserEmail: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		marginBottom: Spacing[1],
	},
	pendingUserEmailDark: {
		color: Colors.dark.text.secondary,
	},
	pendingUserDepartment: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[1],
	},
	pendingUserDepartmentDark: {
		color: Colors.dark.text.secondary,
	},
	pendingUserDate: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
	},
	pendingUserDateDark: {
		color: Colors.dark.text.tertiary,
	},
	pendingUserActions: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: Spacing[2],
	},
	pendingActionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing[2],
		paddingHorizontal: Spacing[3],
		borderRadius: BorderRadius.md,
		gap: Spacing[1],
	},
	approveButton: {
		backgroundColor: Colors.success.main,
	},
	rejectButton: {
		backgroundColor: Colors.error.main,
	},
	approveButtonText: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.inverse,
	},
	rejectButtonText: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.inverse,
	},
	emptyApprovalsState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing[5],
	},
	emptyApprovalsTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginTop: Spacing[3],
		marginBottom: Spacing[2],
	},
	emptyApprovalsTitleDark: {
		color: Colors.dark.text.primary,
	},
	emptyApprovalsDescription: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		textAlign: "center",
		lineHeight: 24,
	},
	emptyApprovalsDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
});
