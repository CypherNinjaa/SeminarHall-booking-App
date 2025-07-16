import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Alert,
	FlatList,
	Modal,
	Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";

import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../stores/authStore";
import { userManagementService } from "../../services/userManagementService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Types
interface PendingUser {
	id: string;
	name: string;
	email: string;
	phone?: string;
	employee_id?: string;
	department?: string;
	role: string;
	created_at: string;
	is_active: boolean;
	approved_by_admin: boolean;
}

interface UserApprovalsScreenProps {
	navigation: any;
}

// Components
const PendingUserCard: React.FC<{
	user: PendingUser;
	onApprove: (user: PendingUser) => void;
	onReject: (user: PendingUser) => void;
}> = ({ user, onApprove, onReject }) => {
	const { isDark } = useTheme();

	return (
		<View style={[styles.userCard, isDark && styles.userCardDark]}>
			<View style={styles.userInfo}>
				<Text style={[styles.userName, isDark && styles.userNameDark]}>
					{user.name}
				</Text>
				<Text style={[styles.userEmail, isDark && styles.userEmailDark]}>
					{user.email}
				</Text>
				{user.department && (
					<Text
						style={[styles.userDepartment, isDark && styles.userDepartmentDark]}
					>
						Department: {user.department}
					</Text>
				)}
				{user.employee_id && (
					<Text
						style={[styles.userEmployee, isDark && styles.userEmployeeDark]}
					>
						Employee ID: {user.employee_id}
					</Text>
				)}
				{user.phone && (
					<Text style={[styles.userPhone, isDark && styles.userPhoneDark]}>
						Phone: {user.phone}
					</Text>
				)}
				<Text style={[styles.userDate, isDark && styles.userDateDark]}>
					Registered: {new Date(user.created_at).toLocaleDateString()}
				</Text>
			</View>

			<View style={styles.userActions}>
				<TouchableOpacity
					style={[styles.actionButton, styles.approveButton]}
					onPress={() => onApprove(user)}
				>
					<Ionicons name="checkmark-outline" size={20} color={Colors.text.inverse} />
					<Text style={styles.approveButtonText}>Approve</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionButton, styles.rejectButton]}
					onPress={() => onReject(user)}
				>
					<Ionicons name="close-outline" size={20} color={Colors.text.inverse} />
					<Text style={styles.rejectButtonText}>Reject</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

// Main Component
export default function UserApprovalsScreen({
	navigation,
}: UserApprovalsScreenProps) {
	const { user } = useAuthStore();
	const { isDark } = useTheme();

	// State
	const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	// Load pending users
	const loadPendingUsers = useCallback(async () => {
		try {
			const data = await userManagementService.getPendingApprovals();
			setPendingUsers(data);
		} catch (error) {
			console.error("Error loading pending users:", error);
			Alert.alert("Error", "Failed to load pending approvals. Please try again.");
		}
	}, []);

	// Handle refresh
	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		await loadPendingUsers();
		setIsRefreshing(false);
	}, [loadPendingUsers]);

	// Handle approve user
	const handleApproveUser = async (userToApprove: PendingUser) => {
		try {
			setIsProcessing(true);
			
			Alert.alert(
				"Approve User",
				`Are you sure you want to approve ${userToApprove.name}?`,
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Approve",
						onPress: async () => {
							try {
								await userManagementService.approveUser(
									userToApprove.email,
									user?.id || ""
								);
								
								await loadPendingUsers();
								
								Alert.alert(
									"✅ User Approved",
									`${userToApprove.name} has been approved and can now access the app.`,
									[{ text: "OK" }]
								);
								
								Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
							} catch (error) {
								console.error("Error approving user:", error);
								Alert.alert(
									"Approval Failed",
									`Failed to approve ${userToApprove.name}. Please try again.`
								);
							}
						},
					},
				]
			);
		} catch (error) {
			console.error("Error in approve user handler:", error);
		} finally {
			setIsProcessing(false);
		}
	};

	// Handle reject user
	const handleRejectUser = async (userToReject: PendingUser) => {
		try {
			setIsProcessing(true);
			
			Alert.alert(
				"Reject User",
				`Are you sure you want to reject ${userToReject.name}'s account approval?`,
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Reject",
						style: "destructive",
						onPress: async () => {
							try {
								await userManagementService.rejectUser(
									userToReject.email,
									user?.id || ""
								);
								
								await loadPendingUsers();
								
								Alert.alert(
									"User Rejected",
									`${userToReject.name}'s account has been rejected.`,
									[{ text: "OK" }]
								);
								
								Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
							} catch (error) {
								console.error("Error rejecting user:", error);
								Alert.alert(
									"Rejection Failed",
									`Failed to reject ${userToReject.name}. Please try again.`
								);
							}
						},
					},
				]
			);
		} catch (error) {
			console.error("Error in reject user handler:", error);
		} finally {
			setIsProcessing(false);
		}
	};

	// Initialize data
	useEffect(() => {
		const initializeData = async () => {
			setIsLoading(true);
			await loadPendingUsers();
			setIsLoading(false);
		};

		initializeData();
	}, [loadPendingUsers]);

	if (isLoading) {
		return (
			<View
				style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
			>
				<ActivityIndicator size="large" color={Colors.primary[600]} />
				<Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
					Loading pending approvals...
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
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => navigation.goBack()}
					>
						<Ionicons
							name="arrow-back"
							size={24}
							color={isDark ? Colors.dark.text.primary : Colors.text.inverse}
						/>
					</TouchableOpacity>
					<View style={styles.headerTitleContainer}>
						<Text
							style={[styles.headerTitle, isDark && styles.headerTitleDark]}
						>
							User Approvals
						</Text>
						<Text
							style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]}
						>
							{pendingUsers.length} pending approval{pendingUsers.length !== 1 ? "s" : ""}
						</Text>
					</View>
				</View>
			</LinearGradient>

			{/* Content */}
			<View style={styles.content}>
				{pendingUsers.length > 0 ? (
					<FlatList
						data={pendingUsers}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<PendingUserCard
								user={item}
								onApprove={handleApproveUser}
								onReject={handleRejectUser}
							/>
						)}
						contentContainerStyle={styles.listContainer}
						refreshControl={
							<RefreshControl
								refreshing={isRefreshing}
								onRefresh={handleRefresh}
							/>
						}
						showsVerticalScrollIndicator={false}
					/>
				) : (
					<View style={styles.emptyState}>
						<Ionicons
							name="checkmark-circle-outline"
							size={64}
							color={isDark ? Colors.dark.text.tertiary : Colors.gray[400]}
						/>
						<Text style={[styles.emptyStateTitle, isDark && styles.emptyStateTitleDark]}>
							No Pending Approvals
						</Text>
						<Text style={[styles.emptyStateDescription, isDark && styles.emptyStateDescriptionDark]}>
							All faculty users have been approved or there are no new registration requests.
						</Text>
					</View>
				)}
			</View>

			{/* Processing Overlay */}
			{isProcessing && (
				<Modal
					visible={isProcessing}
					transparent={true}
					animationType="fade"
				>
					<View style={styles.processingOverlay}>
						<View style={styles.processingContainer}>
							<ActivityIndicator size="large" color={Colors.primary[600]} />
							<Text style={styles.processingText}>Processing...</Text>
						</View>
					</View>
				</Modal>
			)}
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
		alignItems: "center",
	},
	backButton: {
		padding: Spacing[1],
		marginRight: Spacing[3],
	},
	headerTitleContainer: {
		flex: 1,
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
	content: {
		flex: 1,
	},
	listContainer: {
		padding: Spacing[5],
	},
	userCard: {
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[4],
		marginBottom: Spacing[3],
		...Shadows.sm,
	},
	userCardDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	userInfo: {
		marginBottom: Spacing[3],
	},
	userName: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
	},
	userNameDark: {
		color: Colors.dark.text.primary,
	},
	userEmail: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		marginBottom: Spacing[1],
	},
	userEmailDark: {
		color: Colors.dark.text.secondary,
	},
	userDepartment: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[1],
	},
	userDepartmentDark: {
		color: Colors.dark.text.secondary,
	},
	userEmployee: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[1],
	},
	userEmployeeDark: {
		color: Colors.dark.text.secondary,
	},
	userPhone: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[1],
	},
	userPhoneDark: {
		color: Colors.dark.text.secondary,
	},
	userDate: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
	},
	userDateDark: {
		color: Colors.dark.text.tertiary,
	},
	userActions: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: Spacing[3],
	},
	actionButton: {
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
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing[5],
	},
	emptyStateTitle: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
		marginTop: Spacing[3],
		marginBottom: Spacing[2],
	},
	emptyStateTitleDark: {
		color: Colors.dark.text.primary,
	},
	emptyStateDescription: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		textAlign: "center",
		lineHeight: 24,
	},
	emptyStateDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	processingOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	processingContainer: {
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[5],
		alignItems: "center",
		...Shadows.md,
	},
	processingText: {
		marginTop: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
	},
});
