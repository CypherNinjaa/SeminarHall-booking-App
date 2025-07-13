import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	TextInput,
	Alert,
	RefreshControl,
	ActivityIndicator,
	Modal,
	Switch,
	ScrollView,
	Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
	userManagementService,
	supabase,
} from "../services/userManagementService";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../contexts/ThemeContext";
import { RootStackParamList } from "../navigation/AppNavigator";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Types for user management
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

interface UserAnalytics {
	total_users: number;
	active_users: number;
	inactive_users: number;
	super_admins: number;
	admins: number;
	faculty: number;
	new_users_last_month: number;
	recent_activity: Array<{
		id: string;
		user_id: string;
		action: string;
		details: any;
		created_at: string;
		user_name: string;
		user_email: string;
	}>;
}

interface UserItemProps {
	user: User;
	onManage: (user: User) => void;
	onToggleActive: (user: User) => void;
	onDeleteUser: (user: User) => void;
}

interface UserManagementModalProps {
	visible: boolean;
	user: User | null;
	onClose: () => void;
	onSave: (updates: Partial<User>) => Promise<void>;
}

interface AnalyticsCardProps {
	title: string;
	value: number | string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
}

interface Analytics {
	total_users: number;
	super_admins: number;
	admins: number;
	faculty: number;
	active_users: number;
	inactive_users: number;
	new_users_last_30_days: number;
}

interface Pagination {
	page: number;
	pageSize: number;
	totalPages: number;
	totalCount: number;
}

// User item component
const UserItem: React.FC<UserItemProps> = ({
	user,
	onManage,
	onToggleActive,
	onDeleteUser,
}) => {
	const { isDark } = useTheme();

	const getRoleColor = (role: string): string => {
		switch (role) {
			case "super_admin":
				return Colors.primary[600];
			case "admin":
				return Colors.warning.main;
			default:
				return Colors.gray[600];
		}
	};

	const getStatusColor = (isActive: boolean): string => {
		return isActive ? Colors.success.main : Colors.error.main;
	};

	return (
		<View style={[styles.userCard, isDark && styles.userCardDark]}>
			<View style={[styles.userHeader, isDark && styles.userHeaderDark]}>
				<View style={styles.avatarContainer}>
					<Text style={styles.avatarText}>
						{user.name ? user.name.charAt(0).toUpperCase() : "?"}
					</Text>
				</View>
				<View style={styles.userInfo}>
					<Text style={[styles.userName, isDark && styles.userNameDark]}>
						{user.name}
					</Text>
					<Text style={[styles.userEmail, isDark && styles.userEmailDark]}>
						{user.email}
					</Text>
				</View>
			</View>

			<View style={[styles.userDetails, isDark && styles.userDetailsDark]}>
				<View style={styles.detailRow}>
					<View style={styles.detailItem}>
						<Text
							style={[styles.detailLabel, isDark && styles.detailLabelDark]}
						>
							Role
						</Text>
						<View
							style={[
								styles.roleBadge,
								{ backgroundColor: getRoleColor(user.role) + "20" },
							]}
						>
							<Text
								style={[styles.detailValue, { color: getRoleColor(user.role) }]}
							>
								{user.role?.toUpperCase()}
							</Text>
						</View>
					</View>

					<View style={styles.detailItem}>
						<Text
							style={[styles.detailLabel, isDark && styles.detailLabelDark]}
						>
							Status
						</Text>
						<View
							style={[
								styles.statusBadge,
								{ backgroundColor: getStatusColor(user.is_active) + "20" },
							]}
						>
							<Text
								style={[
									styles.detailValue,
									{ color: getStatusColor(user.is_active) },
								]}
							>
								{user.is_active ? "ACTIVE" : "INACTIVE"}
							</Text>
						</View>
					</View>
				</View>

				<View style={styles.detailRow}>
					{user.employee_id && (
						<View style={styles.detailItem}>
							<Text
								style={[styles.detailLabel, isDark && styles.detailLabelDark]}
							>
								ID
							</Text>
							<Text
								style={[styles.detailValue, isDark && styles.detailValueDark]}
							>
								{user.employee_id}
							</Text>
						</View>
					)}

					{user.department && (
						<View style={styles.detailItem}>
							<Text
								style={[styles.detailLabel, isDark && styles.detailLabelDark]}
							>
								Dept.
							</Text>
							<Text
								style={[styles.detailValue, isDark && styles.detailValueDark]}
							>
								{user.department}
							</Text>
						</View>
					)}
				</View>
			</View>

			<View style={[styles.actionButtons, isDark && styles.actionButtonsDark]}>
				<TouchableOpacity
					style={[styles.actionButton, styles.manageButton]}
					onPress={() => onManage(user)}
				>
					<Ionicons
						name="settings-outline"
						size={18}
						color={Colors.primary[600]}
					/>
					<Text style={styles.manageButtonText}>Manage</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.actionButton,
						user.is_active ? styles.deactivateButton : styles.activateButton,
					]}
					onPress={() => onToggleActive(user)}
				>
					<Ionicons
						name={
							user.is_active
								? "close-circle-outline"
								: "checkmark-circle-outline"
						}
						size={18}
						color={user.is_active ? Colors.error.main : Colors.success.main}
					/>
					<Text
						style={[
							styles.actionButtonText,
							{
								color: user.is_active ? Colors.error.main : Colors.success.main,
							},
						]}
					>
						{user.is_active ? "Deactivate" : "Activate"}
					</Text>
				</TouchableOpacity>

				{/* Only show delete button for non-super admins */}
				{user.role !== "super_admin" && (
					<TouchableOpacity
						style={[styles.actionButton, styles.deleteButton]}
						onPress={() => onDeleteUser(user)}
					>
						<Ionicons
							name="trash-outline"
							size={18}
							color={Colors.error.dark}
						/>
						<Text style={styles.deleteButtonText}>Delete</Text>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
};

// User management modal component
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
			console.log("Modal user data:", user); // Debug log
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
							width: Math.min(screenWidth * 0.95, 500), // Better width calculation
							maxHeight: screenHeight * 0.9, // Increase max height to 90%
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
							{ flexGrow: 1 }, // Ensure content fills available space
						]}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						bounces={false}
						nestedScrollEnabled={true}
					>
						{/* Debug info - remove in production */}
						{__DEV__ && (
							<Text style={{ fontSize: 12, color: "red", marginBottom: 10 }}>
								Debug: User {user ? "loaded" : "not loaded"}, Role:{" "}
								{role || "none"}
							</Text>
						)}
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

									{/* Only super admin can promote to super admin, and only admins can become super admins */}
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

// Analytics Card Component
const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
	title,
	value,
	icon,
	color,
}) => {
	const { isDark } = useTheme();
	const displayValue = typeof value === "number" && !isNaN(value) ? value : 0;

	return (
		<View
			style={[
				styles.analyticsCard,
				{ borderLeftColor: color },
				isDark && styles.analyticsCardDark,
			]}
		>
			<View
				style={[
					styles.analyticsIconContainer,
					{ backgroundColor: color + "20" },
				]}
			>
				<Ionicons name={icon} size={20} color={color} />
			</View>
			<View style={styles.analyticsContent}>
				<Text style={[styles.analyticsTitle, isDark && styles.analyticsTitle]}>
					{title}
				</Text>
				<Text style={[styles.analyticsValue, { color }, isDark && { color }]}>
					{displayValue}
				</Text>
			</View>
		</View>
	);
};

// Main Super Admin Screen
export default function SuperAdminScreen({
	navigation,
}: {
	navigation: StackNavigationProp<RootStackParamList, "SuperAdmin">;
}) {
	const { user } = useAuthStore();
	const { isDark } = useTheme();

	// Authentication states
	const [authChecked, setAuthChecked] = useState(false);
	const [currentUser, setCurrentUser] = useState<any>(null);

	// Login modal states
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [loginEmail, setLoginEmail] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const [loginError, setLoginError] = useState("");
	const [isLoggingIn, setIsLoggingIn] = useState(false);

	// Existing states
	const [users, setUsers] = useState<User[]>([]);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [analytics, setAnalytics] = useState({
		total_users: 0,
		super_admins: 0,
		admins: 0,
		faculty: 0,
		active_users: 0,
		inactive_users: 0,
		new_users_last_30_days: 0,
	});
	const [pagination, setPagination] = useState({
		page: 1,
		pageSize: 10,
		totalPages: 1,
		totalCount: 0,
	});

	// Authentication check effect
	useEffect(() => {
		const checkAuthState = async () => {
			try {
				console.log("🔐 SuperAdmin: Checking authentication state...");

				// First, try to get current session
				const {
					data: { session },
					error: sessionError,
				} = await supabase.auth.getSession();

				if (sessionError) {
					console.error("🔐 SuperAdmin: Session error:", sessionError);
				}

				if (session?.user) {
					console.log("🔐 SuperAdmin: Valid session found:", {
						userId: session.user.id,
						email: session.user.email,
					});
					setCurrentUser(session.user);
					setAuthChecked(true);
					return;
				}

				// If no session, try getUser()
				console.log("🔐 SuperAdmin: No session found, trying getUser...");
				const {
					data: { user: authUser },
					error: userError,
				} = await supabase.auth.getUser();

				if (authUser && !userError) {
					console.log("🔐 SuperAdmin: User found via getUser:", {
						userId: authUser.id,
						email: authUser.email,
					});
					setCurrentUser(authUser);
					setAuthChecked(true);
					return;
				}

				// If still no user, check auth store as fallback
				console.log(
					"🔐 SuperAdmin: No user from Supabase, checking auth store..."
				);
				if (user?.id) {
					console.log("🔐 SuperAdmin: User found in auth store:", {
						userId: user.id,
						email: user.email,
					});
					setCurrentUser(user);
					setAuthChecked(true);
					return;
				}

				console.log("🔐 SuperAdmin: No authenticated user found anywhere");
				setCurrentUser(null);
				setAuthChecked(true);
				// Show login modal instead of blocking screen
				setShowLoginModal(true);
			} catch (error) {
				console.error("🔐 SuperAdmin: Auth check error:", error);
				setCurrentUser(null);
				setAuthChecked(true);
				setShowLoginModal(true);
			}
		};

		checkAuthState();

		// Listen for auth state changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log(
				"🔐 SuperAdmin: Auth state changed:",
				event,
				session?.user?.id
			);
			if (session?.user) {
				setCurrentUser(session.user);
				setShowLoginModal(false); // Close modal if user is authenticated
			} else {
				setCurrentUser(null);
				if (authChecked) {
					setShowLoginModal(true); // Show modal if auth checked and no user
				}
			}
			setAuthChecked(true);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [user]); // Add user from auth store as dependency

	// Handle admin login
	const handleSuperAdminLogin = useCallback(async () => {
		if (!loginEmail || !loginPassword) {
			setLoginError("Please enter both email and password");
			return;
		}

		try {
			setIsLoggingIn(true);
			setLoginError("");

			console.log("🔐 SuperAdmin: Attempting login...");

			const { data, error } = await supabase.auth.signInWithPassword({
				email: loginEmail,
				password: loginPassword,
			});

			if (error) {
				console.error("🔐 SuperAdmin: Login error:", error);
				setLoginError(error.message || "Login failed");
				return;
			}

			if (data?.user) {
				console.log("🔐 SuperAdmin: Login successful:", data.user.id);
				setCurrentUser(data.user);
				setShowLoginModal(false);
				setLoginEmail("");
				setLoginPassword("");
				setLoginError("");
			}
		} catch (error: any) {
			console.error("🔐 SuperAdmin: Login exception:", error);
			setLoginError("Login failed. Please try again.");
		} finally {
			setIsLoggingIn(false);
		}
	}, [loginEmail, loginPassword]);

	// Handle login modal close
	const handleCloseLoginModal = useCallback(() => {
		setShowLoginModal(false);
		// Reset to main tabs instead of staying on super admin screen
		navigation.reset({
			index: 0,
			routes: [{ name: "MainTabs" }],
		});
	}, [navigation]);

	// Load users
	const loadUsers = useCallback(
		async (page = 1, query = searchQuery) => {
			// Only proceed if we have a valid authenticated user
			if (!currentUser?.id) {
				console.log(
					"🔐 SuperAdmin: No authenticated user found, skipping user load"
				);
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				console.log("🔐 SuperAdmin: Loading users...");
				const response = await userManagementService.getAllUsers(
					page,
					pagination.pageSize,
					undefined, // role parameter
					undefined, // isActive parameter
					query // searchQuery parameter
				);

				setUsers(response.users);
				setPagination({
					page: response.currentPage,
					pageSize: response.pageSize,
					totalPages: response.totalPages,
					totalCount: response.totalCount,
				});
			} catch (error) {
				console.error("Error loading users:", error);
				Alert.alert("Error", "Failed to load users. Please try again.");
			} finally {
				setIsLoading(false);
				setRefreshing(false);
			}
		},
		[searchQuery, pagination.pageSize, currentUser]
	);

	// Load analytics with error handling and fallback values
	const loadAnalytics = useCallback(async () => {
		// Only proceed if we have a valid authenticated user
		if (!currentUser?.id) {
			console.log(
				"🔐 SuperAdmin: No authenticated user found, skipping analytics load"
			);
			return;
		}

		try {
			console.log("🔐 SuperAdmin: Loading analytics...");
			const data = await userManagementService.getUserAnalytics();

			// Provide fallback values if the API returns invalid data
			const safeAnalytics = {
				total_users: Number(data?.total_users) || 0,
				super_admins: Number(data?.super_admins) || 0,
				admins: Number(data?.admins) || 0,
				faculty: Number(data?.faculty) || 0,
				active_users: Number(data?.active_users) || 0,
				inactive_users: Number(data?.inactive_users) || 0,
				new_users_last_30_days: Number(data?.new_users_last_30_days) || 0,
			};

			setAnalytics(safeAnalytics);
		} catch (error) {
			console.error("Error loading analytics:", error);
			// Set fallback values on error
			setAnalytics({
				total_users: 0,
				super_admins: 0,
				admins: 0,
				faculty: 0,
				active_users: 0,
				inactive_users: 0,
				new_users_last_30_days: 0,
			});
		}
	}, [currentUser]);

	// Load data when screen is focused AND user is authenticated
	useFocusEffect(
		useCallback(() => {
			if (authChecked && currentUser) {
				console.log("🔐 SuperAdmin: Auth confirmed, loading data");
				loadUsers();
				loadAnalytics();
			} else if (authChecked && !currentUser) {
				console.log("🔐 SuperAdmin: No user authenticated, stopping loading");
				setIsLoading(false);
			}
		}, [loadUsers, loadAnalytics, authChecked, currentUser])
	);

	// Load data when authentication is confirmed and user is available
	useEffect(() => {
		if (authChecked && currentUser) {
			console.log("🔐 SuperAdmin: Auth confirmed, loading initial data");
			loadUsers();
			loadAnalytics();
		} else if (authChecked && !currentUser) {
			console.log("🔐 SuperAdmin: No user authenticated, stopping loading");
			setIsLoading(false);
		}
	}, [authChecked, currentUser, loadUsers, loadAnalytics]);

	// Handle pull-to-refresh
	const handleRefresh = () => {
		setRefreshing(true);
		loadUsers(1);
		loadAnalytics();
	};

	// Handle search
	const handleSearch = (query: string) => {
		setSearchQuery(query);
		loadUsers(1, query);
	};

	// Handle pagination
	const handleLoadMore = () => {
		if (pagination.page < pagination.totalPages && !isLoading) {
			loadUsers(pagination.page + 1);
		}
	};

	// Handle manage user
	const handleManageUser = (user: User) => {
		console.log("Opening modal for user:", user); // Debug log
		setSelectedUser(user);
		setIsModalVisible(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	};

	// Handle toggle active status
	const handleToggleActive = (user: User) => {
		const isDeactivating = user.is_active;
		const actionText = isDeactivating ? "deactivate" : "activate";
		const warningText = isDeactivating
			? `\n\n⚠️ When deactivated:\n• User will be signed out immediately\n• User cannot login until reactivated\n• User will see "Contact admin" message`
			: "";

		Alert.alert(
			isDeactivating ? "Deactivate User" : "Activate User",
			`Are you sure you want to ${actionText} ${user.name}?${warningText}`,
			[
				{ text: "Cancel" },
				{
					text: "Confirm",
					style: isDeactivating ? "destructive" : "default",
					onPress: async () => {
						try {
							console.log(
								`🔄 ${isDeactivating ? "Deactivating" : "Activating"} user: ${
									user.name
								}`
							);

							await userManagementService.toggleUserActiveStatus(
								user.id,
								!user.is_active
							);

							console.log(
								"✅ User status updated successfully, refreshing data..."
							);

							// Force refresh all data to ensure consistency
							await Promise.all([loadUsers(), loadAnalytics()]);

							Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Success
							);

							Alert.alert(
								"Success",
								`${user.name} has been ${
									isDeactivating ? "deactivated" : "activated"
								} successfully.${
									isDeactivating
										? "\n\nThey will be signed out and cannot login until reactivated."
										: ""
								}`
							);
						} catch (error) {
							console.error("❌ Error toggling active status:", error);

							const errorMessage =
								error instanceof Error
									? error.message
									: "Unknown error occurred";

							Alert.alert(
								"Status Update Failed",
								`Failed to ${actionText} ${user.name}.\n\nError: ${errorMessage}\n\nPlease try again or contact support.`
							);

							// Still refresh to ensure UI is in sync
							try {
								await loadUsers();
							} catch (refreshError) {
								console.error("Failed to refresh after error:", refreshError);
							}
						}
					},
				},
			]
		);
	};

	// Handle delete user
	const handleDeleteUser = (user: User) => {
		Alert.alert(
			"Delete User",
			`Are you sure you want to permanently delete ${user.name}? This action cannot be undone.`,
			[
				{ text: "Cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							console.log(`🗑️ Deleting user: ${user.name} (${user.id})`);

							// Delete the user using the improved service
							await userManagementService.deleteUser(user.id);

							console.log("✅ User deleted successfully, refreshing data...");

							// Force refresh all data
							await Promise.all([loadUsers(), loadAnalytics()]);

							Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Success
							);

							Alert.alert(
								"Success",
								`${user.name} has been deleted successfully`
							);
						} catch (error) {
							console.error("❌ Error deleting user:", error);

							// Show detailed error message
							const errorMessage =
								error instanceof Error
									? error.message
									: "Unknown error occurred";

							Alert.alert(
								"Delete Failed",
								`Failed to delete ${user.name}.\n\nError: ${errorMessage}\n\nPlease try again or contact support.`
							);

							// Still refresh to ensure UI is in sync
							try {
								await loadUsers();
							} catch (refreshError) {
								console.error("Failed to refresh after error:", refreshError);
							}
						}
					},
				},
			]
		);
	};

	// Handle save user changes
	const handleSaveUser = async (updates: Partial<User>): Promise<void> => {
		try {
			if (!selectedUser) return;

			// Use the new updateUser service method that handles all updates securely
			await userManagementService.updateUser(selectedUser.id, {
				name: updates.name,
				department: updates.department,
				employee_id: updates.employee_id,
				phone: updates.phone,
				role: updates.role,
			});

			// If active status has changed, use the toggle function
			if (
				updates.is_active !== undefined &&
				updates.is_active !== selectedUser.is_active
			) {
				await userManagementService.toggleUserActiveStatus(
					selectedUser.id,
					updates.is_active
				);
			}

			// Update local state
			setUsers(
				users.map((u) => (u.id === selectedUser.id ? { ...u, ...updates } : u))
			);

			// Update analytics
			await loadAnalytics();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			Alert.alert("Success", "User has been updated");
		} catch (error) {
			console.error("Error updating user:", error);
			Alert.alert("Error", "Failed to update user. Please try again.");
			throw error;
		}
	};

	// Render list header (analytics)
	const renderListHeader = () => (
		<View style={styles.analyticsContainer}>
			<View style={styles.analyticsRow}>
				<AnalyticsCard
					title="Total Users"
					value={analytics.total_users}
					icon="people-outline"
					color={Colors.primary[600]}
				/>
				<AnalyticsCard
					title="Active Users"
					value={analytics.active_users}
					icon="checkmark-circle-outline"
					color={Colors.success.main}
				/>
			</View>

			<View style={styles.analyticsRow}>
				<AnalyticsCard
					title="Faculty"
					value={analytics.faculty}
					icon="school-outline"
					color={Colors.gray[600]}
				/>
				<AnalyticsCard
					title="Admins"
					value={analytics.admins + analytics.super_admins}
					icon="shield-outline"
					color={Colors.warning.main}
				/>
			</View>

			<View style={styles.analyticsRow}>
				<AnalyticsCard
					title="Inactive"
					value={analytics.inactive_users}
					icon="close-circle-outline"
					color={Colors.error.main}
				/>
				<AnalyticsCard
					title="New (30d)"
					value={analytics.new_users_last_30_days}
					icon="calendar-outline"
					color={Colors.primary[400]}
				/>
			</View>
		</View>
	);

	// Render empty state
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Ionicons name="people" size={48} color={Colors.gray[300]} />
			<Text style={styles.emptyStateText}>
				{searchQuery ? "No users match your search" : "No users found"}
			</Text>
			{searchQuery && (
				<TouchableOpacity
					style={styles.clearSearchButton}
					onPress={() => {
						setSearchQuery("");
						loadUsers(1, "");
					}}
				>
					<Text style={styles.clearSearchText}>Clear Search</Text>
				</TouchableOpacity>
			)}
		</View>
	);

	// Render list footer (pagination)
	const renderListFooter = () => {
		if (isLoading) {
			return (
				<View style={styles.loaderFooter}>
					<ActivityIndicator color={Colors.primary[500]} />
				</View>
			);
		}

		return (
			<View style={styles.paginationFooter}>
				<Text style={styles.paginationText}>
					{`Page ${pagination.page} of ${pagination.totalPages} (${pagination.totalCount} users)`}
				</Text>
				{pagination.page < pagination.totalPages && (
					<TouchableOpacity
						style={styles.loadMoreButton}
						onPress={handleLoadMore}
					>
						<Text style={styles.loadMoreText}>Load More</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	};

	// Super Admin Login Modal
	const renderSuperAdminLoginModal = () => {
		return (
			<Modal
				visible={showLoginModal}
				transparent={true}
				animationType="slide"
				onRequestClose={handleCloseLoginModal}
			>
				<View style={styles.simpleModalOverlay}>
					<View style={styles.simpleModalContainer}>
						<View
							style={[
								styles.simpleModalContent,
								isDark && styles.simpleModalContentDark,
							]}
						>
							{/* Simple Header */}
							<View style={styles.simpleHeader}>
								<Text
									style={[styles.simpleTitle, isDark && styles.simpleTitleDark]}
								>
									Super Admin Login
								</Text>
								<TouchableOpacity
									style={styles.simpleCloseButton}
									onPress={handleCloseLoginModal}
								>
									<Text style={styles.simpleCloseText}>✕</Text>
								</TouchableOpacity>
							</View>

							{/* Simple Form */}
							<View style={styles.simpleForm}>
								<TextInput
									style={[styles.simpleInput, isDark && styles.simpleInputDark]}
									placeholder="Email"
									placeholderTextColor="#999"
									value={loginEmail}
									onChangeText={setLoginEmail}
									autoCapitalize="none"
									keyboardType="email-address"
								/>

								<TextInput
									style={[styles.simpleInput, isDark && styles.simpleInputDark]}
									placeholder="Password"
									placeholderTextColor="#999"
									value={loginPassword}
									onChangeText={setLoginPassword}
									secureTextEntry
								/>

								{loginError ? (
									<Text style={styles.simpleError}>{loginError}</Text>
								) : null}

								<TouchableOpacity
									style={[
										styles.simpleButton,
										isLoggingIn && styles.simpleButtonDisabled,
									]}
									onPress={handleSuperAdminLogin}
									disabled={isLoggingIn}
								>
									{isLoggingIn ? (
										<ActivityIndicator color="white" />
									) : (
										<Text style={styles.simpleButtonText}>Login</Text>
									)}
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.simpleCancelButton}
									onPress={handleCloseLoginModal}
								>
									<Text style={styles.simpleCancelText}>Cancel</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</Modal>
		);
	};

	// Show loading screen during authentication check
	if (isLoading || !authChecked) {
		return (
			<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
				<StatusBar style={isDark ? "light" : "dark"} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary[500]} />
					<Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
						{!authChecked
							? "Checking authentication..."
							: "Loading super admin panel..."}
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Super Admin Login Modal */}
			{renderSuperAdminLoginModal()}

			{/* Only render main content if user is authenticated */}

			{/* Enhanced Header */}
			<View style={styles.header}>
				<LinearGradient
					colors={
						isDark
							? [
									Colors.dark.background.secondary,
									Colors.dark.background.tertiary,
							  ]
							: [Colors.primary[700], Colors.primary[500]]
					}
					style={styles.headerGradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<View style={styles.headerContent}>
						<View style={styles.headerTop}>
							<View style={styles.headerTitleContainer}>
								<Ionicons
									name="shield-checkmark"
									size={24}
									color="white"
									style={styles.headerIcon}
								/>
								<Text style={styles.headerTitle}>Super Admin Portal</Text>
							</View>
							<TouchableOpacity
								style={styles.profileButton}
								onPress={() => navigation.navigate("MainTabs")}
							>
								<View style={styles.profileAvatar}>
									<Text style={styles.profileAvatarText}>
										{user?.name?.charAt(0).toUpperCase() || "A"}
									</Text>
								</View>
							</TouchableOpacity>
						</View>
						<Text style={styles.headerSubtitle}>
							User Management & Analytics
						</Text>
						<View style={styles.headerStats}>
							<View style={styles.headerStat}>
								<Text style={styles.headerStatNumber}>
									{analytics.total_users}
								</Text>
								<Text style={styles.headerStatLabel}>Total Users</Text>
							</View>
							<View style={styles.headerStat}>
								<Text style={styles.headerStatNumber}>
									{analytics.active_users}
								</Text>
								<Text style={styles.headerStatLabel}>Active</Text>
							</View>
							<View style={styles.headerStat}>
								<Text style={styles.headerStatNumber}>
									{analytics.new_users_last_30_days}
								</Text>
								<Text style={styles.headerStatLabel}>New (30d)</Text>
							</View>
						</View>
					</View>
				</LinearGradient>
			</View>

			{/* Search Bar */}
			<View
				style={[styles.searchContainer, isDark && styles.searchContainerDark]}
			>
				<View style={[styles.searchBar, isDark && styles.searchBarDark]}>
					<Ionicons
						name="search"
						size={20}
						color={isDark ? Colors.dark.text.secondary : Colors.gray[400]}
					/>
					<TextInput
						style={[styles.searchInput, isDark && styles.searchInputDark]}
						value={searchQuery}
						onChangeText={handleSearch}
						placeholder="Search by name, email, department..."
						placeholderTextColor={
							isDark ? Colors.dark.text.tertiary : Colors.gray[400]
						}
						clearButtonMode="always"
					/>
				</View>
			</View>

			{/* User List */}
			<FlatList
				data={users}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<UserItem
						user={item}
						onManage={handleManageUser}
						onToggleActive={handleToggleActive}
						onDeleteUser={handleDeleteUser}
					/>
				)}
				contentContainerStyle={styles.listContent}
				ListHeaderComponent={renderListHeader}
				ListEmptyComponent={renderEmptyState}
				ListFooterComponent={renderListFooter}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						colors={[Colors.primary[500]]}
						tintColor={Colors.primary[500]}
					/>
				}
				showsVerticalScrollIndicator={false}
			/>

			{/* User Management Modal */}
			<UserManagementModal
				visible={isModalVisible}
				user={selectedUser}
				onClose={() => {
					setIsModalVisible(false);
					setSelectedUser(null);
				}}
				onSave={handleSaveUser}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background.secondary,
	},
	containerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	header: {
		width: "100%",
		overflow: "hidden",
	},
	headerGradient: {
		padding: Spacing[5],
		paddingBottom: Spacing[4], // Reduce bottom padding since search is no longer overlapping
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
	},
	headerContent: {
		flex: 1,
	},
	headerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing[3],
	},
	headerTitleContainer: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	headerIcon: {
		marginRight: Spacing[2],
	},
	headerTitle: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: "white",
	},
	headerSubtitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.normal,
		color: "rgba(255, 255, 255, 0.8)",
		marginBottom: Spacing[4],
	},
	profileButton: {
		padding: Spacing[2],
	},
	profileAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "rgba(255, 255, 255, 0.2)",
		justifyContent: "center",
		alignItems: "center",
	},
	profileAvatarText: {
		color: "white",
		fontWeight: Typography.fontWeight.bold,
		fontSize: Typography.fontSize.base,
	},
	headerStats: {
		flexDirection: "row",
		justifyContent: "space-around",
		backgroundColor: "rgba(255, 255, 255, 0.1)",
		borderRadius: BorderRadius.lg,
		padding: Spacing[3],
	},
	headerStat: {
		alignItems: "center",
	},
	headerStatNumber: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.bold,
		color: "white",
		marginBottom: 2,
	},
	headerStatLabel: {
		fontSize: Typography.fontSize.xs,
		color: "rgba(255, 255, 255, 0.8)",
		textAlign: "center",
	},
	searchContainer: {
		paddingHorizontal: Spacing[5],
		marginTop: Spacing[2], // Add positive margin to create gap from header
		marginBottom: Spacing[4],
		paddingTop: Spacing[3], // Add extra padding for better spacing
	},
	searchContainerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	searchBar: {
		backgroundColor: "white",
		borderRadius: BorderRadius.lg,
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		flexDirection: "row",
		alignItems: "center",
		...Shadows.md,
	},
	searchBarDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderWidth: 1,
		borderColor: Colors.dark.border.light,
	},
	searchInput: {
		flex: 1,
		marginLeft: Spacing[2],
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
	},
	searchInputDark: {
		color: Colors.dark.text.primary,
	},
	listContent: {
		paddingHorizontal: Spacing[5],
		paddingBottom: Spacing[6],
	},
	analyticsContainer: {
		marginBottom: Spacing[5],
	},
	analyticsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing[3],
	},
	analyticsCard: {
		backgroundColor: "white",
		borderRadius: BorderRadius.lg,
		padding: Spacing[4],
		flexDirection: "row",
		alignItems: "center",
		flex: 0.48,
		borderLeftWidth: 4,
		...Shadows.sm,
	},
	analyticsCardDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.light,
	},
	analyticsIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	analyticsContent: {
		flex: 1,
	},
	analyticsTitle: {
		fontSize: Typography.fontSize.sm,
		color: Colors.gray[600],
		marginBottom: 2,
	},
	analyticsValue: {
		fontSize: Typography.fontSize["xl"],
		fontWeight: Typography.fontWeight.bold,
	},
	userCard: {
		backgroundColor: "white",
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing[4],
		overflow: "hidden",
		...Shadows.sm,
	},
	userCardDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.light,
	},
	userHeader: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing[4],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
	},
	userHeaderDark: {
		borderBottomColor: Colors.dark.border.light,
	},
	avatarContainer: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: Colors.primary[100],
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	avatarText: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.primary[600],
	},
	userInfo: {
		flex: 1,
	},
	userName: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: 2,
	},
	userNameDark: {
		color: Colors.dark.text.primary,
	},
	userEmail: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
	},
	userEmailDark: {
		color: Colors.dark.text.secondary,
	},
	userDetails: {
		padding: Spacing[4],
		backgroundColor: Colors.background.tertiary,
	},
	userDetailsDark: {
		backgroundColor: Colors.dark.background.tertiary,
	},
	detailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing[3],
	},
	detailItem: {
		flex: 1,
	},
	detailLabel: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
		marginBottom: 2,
	},
	detailLabelDark: {
		color: Colors.dark.text.tertiary,
	},
	detailValue: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.secondary,
	},
	detailValueDark: {
		color: Colors.dark.text.secondary,
	},
	roleBadge: {
		alignSelf: "flex-start",
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: BorderRadius.md,
	},
	statusBadge: {
		alignSelf: "flex-start",
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: BorderRadius.md,
	},
	actionButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		padding: Spacing[3],
		backgroundColor: "white",
		borderTopWidth: 1,
		borderTopColor: Colors.border.light,
	},
	actionButtonsDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderTopColor: Colors.dark.border.light,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing[2],
		paddingHorizontal: Spacing[3],
		borderRadius: BorderRadius.md,
		flex: 1,
		marginHorizontal: 4,
	},
	manageButton: {
		backgroundColor: Colors.primary[50],
	},
	activateButton: {
		backgroundColor: Colors.success.light,
	},
	deactivateButton: {
		backgroundColor: Colors.error.light,
	},
	deleteButton: {
		backgroundColor: "#FFEEEE",
	},
	actionButtonText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		marginLeft: 5,
	},
	manageButtonText: {
		color: Colors.primary[600],
		marginLeft: 5,
	},
	deleteButtonText: {
		color: Colors.error.dark,
		marginLeft: 5,
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing[6],
	},
	emptyStateText: {
		fontSize: Typography.fontSize.lg,
		color: Colors.gray[500],
		marginTop: Spacing[3],
		textAlign: "center",
	},
	clearSearchButton: {
		marginTop: Spacing[4],
		paddingVertical: Spacing[2],
		paddingHorizontal: Spacing[4],
		backgroundColor: Colors.primary[50],
		borderRadius: BorderRadius.md,
	},
	clearSearchText: {
		color: Colors.primary[600],
		fontWeight: Typography.fontWeight.medium,
	},
	loaderFooter: {
		paddingVertical: Spacing[5],
		alignItems: "center",
	},
	paginationFooter: {
		paddingVertical: Spacing[5],
		alignItems: "center",
	},
	paginationText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[3],
	},
	loadMoreButton: {
		paddingVertical: Spacing[2],
		paddingHorizontal: Spacing[4],
		backgroundColor: Colors.primary[500],
		borderRadius: BorderRadius.md,
	},
	loadMoreText: {
		color: "white",
		fontWeight: Typography.fontWeight.medium,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.6)",
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing[4],
	},
	modalContainer: {
		backgroundColor: "white",
		borderRadius: BorderRadius.xl,
		width: "100%",
		maxHeight: "85%",
		minHeight: 400, // Ensure minimum height for content visibility
		...Shadows.lg,
		overflow: "hidden", // Ensure content doesn't overflow
	},
	modalContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.light,
		borderWidth: 1,
	},
	modalScrollContent: {
		flex: 1,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: Spacing[4],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
		backgroundColor: "white", // Ensure header has background
	},
	modalHeaderDark: {
		borderBottomColor: Colors.dark.border.light,
		backgroundColor: Colors.dark.background.secondary,
	},
	closeButton: {
		padding: Spacing[2],
		borderRadius: BorderRadius.md,
	},
	modalTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
	},
	modalTitleDark: {
		color: Colors.dark.text.primary,
	},
	modalContent: {
		padding: Spacing[5],
		paddingBottom: Spacing[6], // Adequate bottom padding
		minHeight: 400, // Ensure minimum height for content visibility
	},
	modalContentDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	formGroup: {
		marginBottom: Spacing[4],
	},
	input: {
		backgroundColor: Colors.background.tertiary,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		borderColor: Colors.border.main,
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
	},
	inputDark: {
		backgroundColor: Colors.dark.background.tertiary,
		borderColor: Colors.dark.border.light,
		color: Colors.dark.text.primary,
	},
	inputLabel: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.secondary,
		marginBottom: Spacing[2],
	},
	inputLabelDark: {
		color: Colors.dark.text.secondary,
	},
	roleSelector: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	rolePill: {
		paddingVertical: Spacing[2],
		paddingHorizontal: Spacing[4],
		borderRadius: 20,
		backgroundColor: Colors.gray[100],
		marginRight: Spacing[2],
		marginBottom: Spacing[2],
	},
	rolePillActive: {
		backgroundColor: Colors.primary[500],
	},
	rolePillText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
	},
	rolePillTextActive: {
		color: "white",
		fontWeight: Typography.fontWeight.medium,
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
		marginTop: Spacing[4],
		marginBottom: Spacing[4], // Add bottom margin to prevent overlap
		paddingTop: Spacing[3], // Add top padding for better separation
		borderTopWidth: 1, // Add subtle border to separate from content
		borderTopColor: Colors.border.light,
	},
	modalButtonsDark: {
		borderTopColor: Colors.dark.border.light,
	},
	resetPasswordButton: {
		flex: 0.48,
		paddingVertical: Spacing[3],
		alignItems: "center",
		borderWidth: 1,
		borderColor: Colors.primary[500],
		borderRadius: BorderRadius.lg,
		minHeight: 44, // Ensure minimum touch target
	},
	resetPasswordText: {
		color: Colors.primary[600],
		fontWeight: Typography.fontWeight.medium,
	},
	saveButton: {
		flex: 0.48,
		backgroundColor: Colors.primary[500],
		paddingVertical: Spacing[3],
		alignItems: "center",
		borderRadius: BorderRadius.lg,
		minHeight: 44, // Ensure minimum touch target
	},
	disabledButton: {
		backgroundColor: Colors.gray[400],
	},
	saveButtonText: {
		color: "white",
		fontWeight: Typography.fontWeight.medium,
	},

	// Loading container styles
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing[5],
	},
	loadingText: {
		marginTop: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		textAlign: "center",
	},
	loadingTextDark: {
		color: Colors.dark.text.secondary,
	},

	// Simple Modal Styles for Authentication
	simpleModalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	simpleModalContainer: {
		width: "100%",
		maxWidth: 400,
	},
	simpleModalContent: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 24,
	},
	simpleModalContentDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	simpleHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	simpleTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: Colors.text.primary,
	},
	simpleTitleDark: {
		color: Colors.dark.text.primary,
	},
	simpleCloseButton: {
		padding: 4,
	},
	simpleCloseText: {
		fontSize: 18,
		color: Colors.text.secondary,
	},
	simpleForm: {
		gap: 16,
	},
	simpleInput: {
		height: 48,
		borderWidth: 1,
		borderColor: Colors.gray[300],
		borderRadius: 8,
		paddingHorizontal: 16,
		fontSize: 16,
		color: Colors.text.primary,
		backgroundColor: "white",
	},
	simpleInputDark: {
		borderColor: Colors.gray[600],
		backgroundColor: Colors.dark.background.primary,
		color: Colors.dark.text.primary,
	},
	simpleError: {
		color: Colors.error.main,
		fontSize: 14,
		textAlign: "center",
	},
	simpleButton: {
		backgroundColor: Colors.primary[500],
		height: 48,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginTop: 8,
	},
	simpleButtonDisabled: {
		backgroundColor: Colors.gray[400],
	},
	simpleButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	simpleCancelButton: {
		height: 48,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: Colors.gray[300],
	},
	simpleCancelText: {
		color: Colors.text.secondary,
		fontSize: 16,
	},
});
