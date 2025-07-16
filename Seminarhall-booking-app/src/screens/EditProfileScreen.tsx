import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Alert,
	ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, CommonActions } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../contexts/ThemeContext";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";
import { userManagementService } from "../services/userManagementService";

type EditProfileScreenNavigationProp = StackNavigationProp<
	RootStackParamList,
	"EditProfile"
>;

type EditProfileScreenRouteProp = RouteProp<RootStackParamList, "EditProfile">;

interface Props {
	navigation: EditProfileScreenNavigationProp;
	route: EditProfileScreenRouteProp;
}

interface ProfileData {
	name: string;
	email: string;
	phone: string;
	department: string;
	employee_id: string;
}

export default function EditProfileScreen({ navigation }: Props) {
	const { user, updateProfile } = useAuthStore();
	const { isDark } = useTheme();
	const insets = useSafeAreaInsets();

	const [profileData, setProfileData] = useState<ProfileData>({
		name: user?.name || "",
		email: user?.email || "",
		phone: user?.phone || "",
		department: user?.department || "",
		employee_id: user?.employeeId || "",
	});

	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<Partial<ProfileData>>({});

	useEffect(() => {
		// Initialize form with user data
		if (user) {
			setProfileData({
				name: user.name || "",
				email: user.email || "",
				phone: user.phone || "",
				department: user.department || "",
				employee_id: user.employeeId || "",
			});
		}
	}, [user]);

	const handleGoBack = () => {
		try {
			// Try to go back first, if that fails, navigate to MainTabs -> Profile
			if (navigation.canGoBack()) {
				navigation.goBack();
			} else {
				// Fallback: Simple navigation to MainTabs
				navigation.navigate("MainTabs");
			}
		} catch (error) {
			console.error("Navigation error:", error);
			// Ultimate fallback: reset to MainTabs
			navigation.dispatch(
				CommonActions.reset({
					index: 0,
					routes: [{ name: "MainTabs" }],
				})
			);
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Partial<ProfileData> = {};

		// Name validation
		if (!profileData.name.trim()) {
			newErrors.name = "Name is required";
		} else if (profileData.name.trim().length < 2) {
			newErrors.name = "Name must be at least 2 characters";
		}

		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!profileData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!emailRegex.test(profileData.email)) {
			newErrors.email = "Please enter a valid email address";
		}

		// Phone validation (optional but if provided, should be valid)
		if (profileData.phone.trim()) {
			const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
			if (!phoneRegex.test(profileData.phone)) {
				newErrors.phone = "Please enter a valid phone number";
			}
		}

		// Employee ID validation (optional but if provided, should not be empty)
		if (
			profileData.employee_id.trim() &&
			profileData.employee_id.trim().length < 3
		) {
			newErrors.employee_id = "Employee ID must be at least 3 characters";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSave = async () => {
		if (!validateForm()) {
			return;
		}

		if (!user?.id) {
			Alert.alert("Error", "User ID not found. Please try logging in again.");
			return;
		}

		try {
			setIsLoading(true);

			// Prepare update data (only include fields that changed)
			const updates: any = {};
			if (profileData.name !== user.name) updates.name = profileData.name;
			if (profileData.phone !== user.phone) updates.phone = profileData.phone;
			if (profileData.department !== user.department)
				updates.department = profileData.department;
			if (profileData.employee_id !== user.employeeId)
				updates.employee_id = profileData.employee_id;

			// If no changes, just go back
			if (Object.keys(updates).length === 0) {
				handleGoBack();
				return;
			}

			// Update via user management service
			await userManagementService.updateUser(user.id, updates);

			// Update local auth store
			const profileUpdateData: any = {
				...user,
				...updates,
			};

			// Map employee_id to employeeId for auth store
			if (updates.employee_id !== undefined) {
				profileUpdateData.employeeId = updates.employee_id;
				delete profileUpdateData.employee_id;
			}

			await updateProfile(profileUpdateData);

			Alert.alert("Success", "Profile updated successfully!", [
				{
					text: "OK",
					onPress: () => handleGoBack(),
				},
			]);
		} catch (error) {
			console.error("Error updating profile:", error);
			Alert.alert("Error", "Failed to update profile. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		// Check if there are unsaved changes
		const hasChanges =
			profileData.name !== (user?.name || "") ||
			profileData.phone !== (user?.phone || "") ||
			profileData.department !== (user?.department || "") ||
			profileData.employee_id !== (user?.employeeId || "");

		if (hasChanges) {
			Alert.alert(
				"Discard Changes",
				"You have unsaved changes. Are you sure you want to go back?",
				[
					{ text: "Stay", style: "cancel" },
					{
						text: "Discard",
						style: "destructive",
						onPress: () => handleGoBack(),
					},
				]
			);
		} else {
			handleGoBack();
		}
	};

	const handleInputChange = (field: keyof ProfileData, value: string) => {
		setProfileData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	return (
		<View style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Header */}
			<View style={[styles.header, isDark && styles.headerDark, { paddingTop: insets.top + 12 }]}>
				<TouchableOpacity style={styles.backButton} onPress={handleCancel}>
					<Ionicons
						name="arrow-back"
						size={24}
						color={isDark ? Colors.dark.text.primary : Colors.text.primary}
					/>
				</TouchableOpacity>
				<Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
					Edit Profile
				</Text>
				<TouchableOpacity
					style={[styles.saveButton, isDark && styles.saveButtonDark]}
					onPress={handleSave}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator size="small" color={Colors.background.primary} />
					) : (
						<Text style={styles.saveButtonText}>Save</Text>
					)}
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* User Role Info */}
				<View
					style={[styles.roleContainer, isDark && styles.roleContainerDark]}
				>
					<Ionicons
						name="shield-checkmark"
						size={20}
						color={isDark ? Colors.primary[200] : Colors.primary[500]}
					/>
					<Text style={[styles.roleText, isDark && styles.roleTextDark]}>
						Role: {user?.role?.replace("_", " ").toUpperCase()}
					</Text>
				</View>

				{/* Form Fields */}
				<View style={styles.formContainer}>
					{/* Name Field */}
					<View style={styles.fieldContainer}>
						<Text style={[styles.label, isDark && styles.labelDark]}>
							Full Name *
						</Text>
						<TextInput
							style={[
								styles.input,
								isDark && styles.inputDark,
								errors.name && styles.inputError,
							]}
							value={profileData.name}
							onChangeText={(value) => handleInputChange("name", value)}
							placeholder="Enter your full name"
							placeholderTextColor={
								isDark ? Colors.dark.text.tertiary : Colors.text.tertiary
							}
							autoCapitalize="words"
							maxLength={50}
						/>
						{errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
					</View>

					{/* Email Field - Read Only */}
					<View style={styles.fieldContainer}>
						<Text style={[styles.label, isDark && styles.labelDark]}>
							Email Address
						</Text>
						<TextInput
							style={[
								styles.input,
								isDark && styles.inputDark,
								styles.inputReadOnly,
							]}
							value={profileData.email}
							editable={false}
							placeholder="Email cannot be changed"
							placeholderTextColor={
								isDark ? Colors.dark.text.tertiary : Colors.text.tertiary
							}
						/>
						<Text style={[styles.helperText, isDark && styles.helperTextDark]}>
							Email address cannot be changed. Contact admin if needed.
						</Text>
					</View>

					{/* Phone Field */}
					<View style={styles.fieldContainer}>
						<Text style={[styles.label, isDark && styles.labelDark]}>
							Phone Number
						</Text>
						<TextInput
							style={[
								styles.input,
								isDark && styles.inputDark,
								errors.phone && styles.inputError,
							]}
							value={profileData.phone}
							onChangeText={(value) => handleInputChange("phone", value)}
							placeholder="Enter your phone number"
							placeholderTextColor={
								isDark ? Colors.dark.text.tertiary : Colors.text.tertiary
							}
							keyboardType="phone-pad"
							maxLength={15}
						/>
						{errors.phone && (
							<Text style={styles.errorText}>{errors.phone}</Text>
						)}
					</View>

					{/* Department Field */}
					<View style={styles.fieldContainer}>
						<Text style={[styles.label, isDark && styles.labelDark]}>
							Department
						</Text>
						<TextInput
							style={[
								styles.input,
								isDark && styles.inputDark,
								errors.department && styles.inputError,
							]}
							value={profileData.department}
							onChangeText={(value) => handleInputChange("department", value)}
							placeholder="Enter your department"
							placeholderTextColor={
								isDark ? Colors.dark.text.tertiary : Colors.text.tertiary
							}
							autoCapitalize="words"
							maxLength={50}
						/>
						{errors.department && (
							<Text style={styles.errorText}>{errors.department}</Text>
						)}
					</View>

					{/* Employee ID Field */}
					<View style={styles.fieldContainer}>
						<Text style={[styles.label, isDark && styles.labelDark]}>
							Employee ID
						</Text>
						<TextInput
							style={[
								styles.input,
								isDark && styles.inputDark,
								errors.employee_id && styles.inputError,
							]}
							value={profileData.employee_id}
							onChangeText={(value) => handleInputChange("employee_id", value)}
							placeholder="Enter your employee ID"
							placeholderTextColor={
								isDark ? Colors.dark.text.tertiary : Colors.text.tertiary
							}
							autoCapitalize="characters"
							maxLength={20}
						/>
						{errors.employee_id && (
							<Text style={styles.errorText}>{errors.employee_id}</Text>
						)}
					</View>
				</View>

				{/* Info Section */}
				<View
					style={[styles.infoContainer, isDark && styles.infoContainerDark]}
				>
					<Ionicons
						name="information-circle"
						size={20}
						color={isDark ? Colors.primary[200] : Colors.primary[500]}
					/>
					<Text style={[styles.infoText, isDark && styles.infoTextDark]}>
						Changes to your profile may require approval from administrators for
						certain fields.
					</Text>
				</View>
			</ScrollView>
		</View>
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
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing[4], // 16px
		paddingBottom: Spacing[3], // 12px
		backgroundColor: Colors.background.primary,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
	},
	headerDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderBottomColor: Colors.dark.border.light,
	},
	backButton: {
		padding: Spacing[2], // 8px
		marginLeft: -Spacing[2],
	},
	headerTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold as any,
		color: Colors.text.primary,
		flex: 1,
		textAlign: "center",
	},
	headerTitleDark: {
		color: Colors.dark.text.primary,
	},
	saveButton: {
		backgroundColor: Colors.primary[500],
		paddingHorizontal: Spacing[4], // 16px
		paddingVertical: Spacing[2], // 8px
		borderRadius: BorderRadius.md,
		minWidth: 60,
		alignItems: "center",
	},
	saveButtonDark: {
		backgroundColor: Colors.primary[600],
	},
	saveButtonText: {
		color: Colors.background.primary,
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.semibold as any,
	},
	content: {
		flex: 1,
		paddingHorizontal: Spacing[4], // 16px
	},
	roleContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.background.secondary,
		padding: Spacing[3], // 12px
		borderRadius: BorderRadius.md,
		marginVertical: Spacing[4], // 16px
	},
	roleContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	roleText: {
		marginLeft: Spacing[2], // 8px
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium as any,
		color: Colors.text.primary,
	},
	roleTextDark: {
		color: Colors.dark.text.primary,
	},
	formContainer: {
		marginBottom: Spacing[6], // 24px
	},
	fieldContainer: {
		marginBottom: Spacing[5], // 20px
	},
	label: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium as any,
		color: Colors.text.primary,
		marginBottom: Spacing[2], // 8px
	},
	labelDark: {
		color: Colors.dark.text.primary,
	},
	input: {
		backgroundColor: Colors.background.primary,
		borderWidth: 1,
		borderColor: Colors.border.main,
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing[3], // 12px
		paddingVertical: Spacing[3], // 12px
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
		...Shadows.sm,
	},
	inputDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.main,
		color: Colors.dark.text.primary,
	},
	inputError: {
		borderColor: Colors.error.main,
	},
	inputReadOnly: {
		backgroundColor: Colors.background.tertiary,
		color: Colors.text.secondary,
	},
	errorText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.error.main,
		marginTop: Spacing[1], // 4px
	},
	helperText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.tertiary,
		marginTop: Spacing[1], // 4px
	},
	helperTextDark: {
		color: Colors.dark.text.tertiary,
	},
	infoContainer: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: Colors.primary[50],
		padding: Spacing[3], // 12px
		borderRadius: BorderRadius.md,
		marginBottom: Spacing[6], // 24px
	},
	infoContainerDark: {
		backgroundColor: Colors.primary[900],
	},
	infoText: {
		marginLeft: Spacing[2], // 8px
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
		flex: 1,
		lineHeight: Typography.fontSize.xs * 1.4,
	},
	infoTextDark: {
		color: Colors.dark.text.secondary,
	},
});
