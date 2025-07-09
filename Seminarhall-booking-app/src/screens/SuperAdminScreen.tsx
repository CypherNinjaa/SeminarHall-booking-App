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
import { RootStackParamList } from "../navigation/AppNavigator";

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
		<View style={styles.userCard}>
			<View style={styles.userHeader}>
				<View style={styles.avatarContainer}>
					<Text style={styles.avatarText}>
						{user.name ? user.name.charAt(0).toUpperCase() : "?"}
					</Text>
				</View>
				<View style={styles.userInfo}>
					<Text style={styles.userName}>{user.name}</Text>
					<Text style={styles.userEmail}>{user.email}</Text>
				</View>
			</View>

			<View style={styles.userDetails}>
				<View style={styles.detailRow}>
					<View style={styles.detailItem}>
						<Text style={styles.detailLabel}>Role</Text>
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
						<Text style={styles.detailLabel}>Status</Text>
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
							<Text style={styles.detailLabel}>ID</Text>
							<Text style={styles.detailValue}>{user.employee_id}</Text>
						</View>
					)}

					{user.department && (
						<View style={styles.detailItem}>
							<Text style={styles.detailLabel}>Dept.</Text>
							<Text style={styles.detailValue}>{user.department}</Text>
						</View>
					)}
				</View>
			</View>

			<View style={styles.actionButtons}>
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
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Manage User</Text>
						<TouchableOpacity onPress={onClose}>
							<Ionicons name="close" size={24} color={Colors.gray[600]} />
						</TouchableOpacity>
					</View>

					<View style={styles.modalContent}>
						{/* User details form */}
						<View style={styles.formGroup}>
							<Text style={styles.inputLabel}>Full Name</Text>
							<TextInput
								style={styles.input}
								value={name}
								onChangeText={setName}
								placeholder="Enter name"
							/>
						</View>

						{user && user.role !== "super_admin" && (
							<View style={styles.formGroup}>
								<Text style={styles.inputLabel}>Role</Text>
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
							<Text style={styles.inputLabel}>Department</Text>
							<TextInput
								style={styles.input}
								value={department}
								onChangeText={setDepartment}
								placeholder="Enter department"
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.inputLabel}>Employee ID</Text>
							<TextInput
								style={styles.input}
								value={employeeId}
								onChangeText={setEmployeeId}
								placeholder="Enter employee ID"
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.inputLabel}>Phone</Text>
							<TextInput
								style={styles.input}
								value={phone}
								onChangeText={setPhone}
								placeholder="Enter phone number"
								keyboardType="phone-pad"
							/>
						</View>

						<View style={styles.switchContainer}>
							<Text style={styles.inputLabel}>Account Active</Text>
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

						<View style={styles.modalButtons}>
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
					</View>
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
}) => (
	<View style={[styles.analyticsCard, { borderLeftColor: color }]}>
		<View
			style={[styles.analyticsIconContainer, { backgroundColor: color + "20" }]}
		>
			<Ionicons name={icon} size={20} color={color} />
		</View>
		<View style={styles.analyticsContent}>
			<Text style={styles.analyticsTitle}>{title}</Text>
			<Text style={[styles.analyticsValue, { color }]}>{value}</Text>
		</View>
	</View>
);

// Main Super Admin Screen
export default function SuperAdminScreen({
	navigation,
}: {
	navigation: StackNavigationProp<RootStackParamList, "SuperAdmin">;
}) {
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

	// Load users
	const loadUsers = useCallback(
		async (page = 1, query = searchQuery) => {
			try {
				setIsLoading(true);
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
		[searchQuery, pagination.pageSize]
	);

	// Load analytics
	const loadAnalytics = useCallback(async () => {
		try {
			const data = await userManagementService.getUserAnalytics();
			setAnalytics(data);
		} catch (error) {
			console.error("Error loading analytics:", error);
		}
	}, []);

	// Load data when screen is focused
	useFocusEffect(
		useCallback(() => {
			loadUsers();
			loadAnalytics();
		}, [loadUsers, loadAnalytics])
	);

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
		setSelectedUser(user);
		setIsModalVisible(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	};

	// Handle toggle active status
	const handleToggleActive = (user: User) => {
		Alert.alert(
			user.is_active ? "Deactivate User" : "Activate User",
			`Are you sure you want to ${user.is_active ? "deactivate" : "activate"} ${
				user.name
			}?`,
			[
				{ text: "Cancel" },
				{
					text: "Confirm",
					onPress: async () => {
						try {
							await userManagementService.toggleUserActiveStatus(
								user.id,
								!user.is_active
							);

							// Update local state
							setUsers(
								users.map((u) =>
									u.id === user.id ? { ...u, is_active: !u.is_active } : u
								)
							);

							Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Success
							);
							Alert.alert(
								"Success",
								`User has been ${user.is_active ? "deactivated" : "activated"}`
							);
						} catch (error) {
							console.error("Error toggling active status:", error);
							Alert.alert(
								"Error",
								"Failed to update user status. Please try again."
							);
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
							await userManagementService.deleteUser(user.id);

							// Update local state
							setUsers(users.filter((u) => u.id !== user.id));

							// Update analytics
							await loadAnalytics();

							Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Success
							);
							Alert.alert("Success", "User has been deleted");
						} catch (error) {
							console.error("Error deleting user:", error);
							Alert.alert("Error", "Failed to delete user. Please try again.");
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

			// If role has changed, use the special function
			if (updates.role && updates.role !== selectedUser.role) {
				await userManagementService.changeUserRole(
					selectedUser.id,
					updates.role
				);
			}

			// If active status has changed, use the special function
			if (
				updates.is_active !== undefined &&
				updates.is_active !== selectedUser.is_active
			) {
				await userManagementService.toggleUserActiveStatus(
					selectedUser.id,
					updates.is_active
				);
			}

			// Update the other fields using the service
			const { data, error } = await supabase
				.from("profiles")
				.update({
					name: updates.name,
					department: updates.department,
					employee_id: updates.employee_id,
					phone: updates.phone,
				})
				.eq("id", selectedUser.id);

			if (error) throw error;

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

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" />

			{/* Header */}
			<View style={styles.header}>
				<LinearGradient
					colors={["#1e40af", "#3b82f6"]}
					style={styles.headerGradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<Text style={styles.headerTitle}>User Management</Text>
					<Text style={styles.headerSubtitle}>Manage all system users</Text>
				</LinearGradient>
			</View>

			{/* Search Bar */}
			<View style={styles.searchContainer}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color={Colors.gray[400]} />
					<TextInput
						style={styles.searchInput}
						value={searchQuery}
						onChangeText={handleSearch}
						placeholder="Search by name, email, department..."
						placeholderTextColor={Colors.gray[400]}
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
	header: {
		width: "100%",
		overflow: "hidden",
	},
	headerGradient: {
		padding: Spacing[5],
		paddingBottom: Spacing[6],
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
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
		marginTop: Spacing[1],
	},
	searchContainer: {
		paddingHorizontal: Spacing[5],
		marginTop: -Spacing[5],
		marginBottom: Spacing[4],
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
	searchInput: {
		flex: 1,
		marginLeft: Spacing[2],
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
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
	userHeader: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing[4],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
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
	userEmail: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
	},
	userDetails: {
		padding: Spacing[4],
		backgroundColor: Colors.background.tertiary,
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
	detailValue: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.secondary,
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
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing[5],
	},
	modalContainer: {
		backgroundColor: "white",
		borderRadius: BorderRadius.xl,
		width: "100%",
		maxHeight: "80%",
		...Shadows.lg,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: Spacing[4],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
	},
	modalTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
	},
	modalContent: {
		padding: Spacing[5],
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
	inputLabel: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.secondary,
		marginBottom: Spacing[2],
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
	},
	resetPasswordButton: {
		flex: 0.48,
		paddingVertical: Spacing[3],
		alignItems: "center",
		borderWidth: 1,
		borderColor: Colors.primary[500],
		borderRadius: BorderRadius.lg,
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
	},
	disabledButton: {
		backgroundColor: Colors.gray[400],
	},
	saveButtonText: {
		color: "white",
		fontWeight: Typography.fontWeight.medium,
	},
});
