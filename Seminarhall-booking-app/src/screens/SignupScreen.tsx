import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Image,
	ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../stores/authStore";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";

type SignupScreenNavigationProp = StackNavigationProp<
	RootStackParamList,
	"Signup"
>;

interface Props {
	navigation: SignupScreenNavigationProp;
}

export default function SignupScreen({ navigation }: Props) {
	// Form state
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [employeeId, setEmployeeId] = useState("");
	const [department, setDepartment] = useState("");

	// UI state
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [currentStep, setCurrentStep] = useState(1);

	const { register, error, clearError } = useAuthStore();

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const toggleConfirmPasswordVisibility = () => {
		setShowConfirmPassword(!showConfirmPassword);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const validateEmail = (email: string) => {
		const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return regex.test(email);
	};

	const validateStep1 = () => {
		if (!name || !email || !password || !confirmPassword) {
			Alert.alert("Missing Information", "Please fill in all required fields");
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		if (!validateEmail(email)) {
			Alert.alert("Invalid Email", "Please enter a valid email address");
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		if (password.length < 8) {
			Alert.alert(
				"Weak Password",
				"Password must be at least 8 characters long"
			);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		if (password !== confirmPassword) {
			Alert.alert("Password Mismatch", "Passwords do not match");
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		return true;
	};

	const moveToNextStep = () => {
		if (validateStep1()) {
			setCurrentStep(2);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		}
	};

	const moveToPreviousStep = () => {
		setCurrentStep(1);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const handleSignup = async () => {
		// Additional validation for step 2 if needed
		if (!employeeId) {
			Alert.alert("Missing Information", "Employee ID is required");
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return;
		}

		setIsLoading(true);
		clearError();

		try {
			await register({
				name,
				email,
				password,
				phone,
				employeeId,
				department,
				role: "faculty", // Default role, will be approved by admin
			});

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

			// Show success message
			Alert.alert(
				"Registration Successful",
				"Your account has been created. Please wait for admin approval.",
				[
					{
						text: "OK",
						onPress: () => navigation.navigate("Login"),
					},
				]
			);
		} catch (error) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert(
				"Registration Failed",
				"There was an issue creating your account. Please try again."
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />

			{/* Background Gradient */}
			<LinearGradient
				colors={["#1e40af", "#3b82f6", "#60a5fa"]}
				style={styles.backgroundGradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardView}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					{/* University Header */}
					<View style={styles.header}>
						<View style={styles.logoContainer}>
							<LinearGradient
								colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
								style={styles.logoGradient}
							>
								<Image
									source={require("../../assets/amity-logo.png")}
									style={styles.logoImage}
									resizeMode="contain"
								/>
							</LinearGradient>
						</View>
						<Text style={styles.universityName}>Amity University Patna</Text>
						<Text style={styles.appTitle}>Seminar Hall Booking</Text>
						<Text style={styles.subtitle}>Create your account</Text>
					</View>

					{/* Progress Indicator */}
					<View style={styles.progressContainer}>
						<View
							style={[
								styles.progressStep,
								currentStep >= 1 && styles.progressStepActive,
							]}
						>
							<Text
								style={[
									styles.progressText,
									currentStep >= 1 && styles.progressTextActive,
								]}
							>
								1
							</Text>
						</View>
						<View style={styles.progressLine} />
						<View
							style={[
								styles.progressStep,
								currentStep >= 2 && styles.progressStepActive,
							]}
						>
							<Text
								style={[
									styles.progressText,
									currentStep >= 2 && styles.progressTextActive,
								]}
							>
								2
							</Text>
						</View>
					</View>

					{/* Registration Form */}
					<BlurView intensity={20} tint="light" style={styles.formContainer}>
						<View style={styles.form}>
							{currentStep === 1 ? (
								<>
									{/* Step 1: Basic Information */}
									<View style={styles.formTitle}>
										<Ionicons
											name="person-add-outline"
											size={20}
											color={Colors.primary[600]}
											style={styles.formTitleIcon}
										/>
										<Text style={styles.formTitleText}>Basic Information</Text>
									</View>

									{/* Full Name Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Full Name</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name="person-outline"
												size={20}
												color={Colors.gray[400]}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={name}
												onChangeText={setName}
												placeholder="Enter your full name"
												placeholderTextColor={Colors.gray[400]}
												autoCapitalize="words"
												autoCorrect={false}
											/>
										</View>
									</View>

									{/* Email Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Email Address</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name="mail-outline"
												size={20}
												color={Colors.gray[400]}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={email}
												onChangeText={setEmail}
												placeholder="Enter your university email"
												placeholderTextColor={Colors.gray[400]}
												keyboardType="email-address"
												autoCapitalize="none"
												autoCorrect={false}
												autoComplete="email"
											/>
										</View>
									</View>

									{/* Password Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Password</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name="lock-closed-outline"
												size={20}
												color={Colors.gray[400]}
												style={styles.inputIcon}
											/>
											<TextInput
												style={[styles.textInput, styles.passwordInput]}
												value={password}
												onChangeText={setPassword}
												placeholder="Create a strong password"
												placeholderTextColor={Colors.gray[400]}
												secureTextEntry={!showPassword}
												autoCapitalize="none"
												autoComplete="password-new"
											/>
											<TouchableOpacity
												onPress={togglePasswordVisibility}
												style={styles.passwordToggle}
											>
												<Ionicons
													name={
														showPassword ? "eye-off-outline" : "eye-outline"
													}
													size={20}
													color={Colors.gray[400]}
												/>
											</TouchableOpacity>
										</View>
										<Text style={styles.passwordHint}>
											Password must be at least 8 characters long
										</Text>
									</View>

									{/* Confirm Password Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Confirm Password</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name="lock-closed-outline"
												size={20}
												color={Colors.gray[400]}
												style={styles.inputIcon}
											/>
											<TextInput
												style={[styles.textInput, styles.passwordInput]}
												value={confirmPassword}
												onChangeText={setConfirmPassword}
												placeholder="Confirm your password"
												placeholderTextColor={Colors.gray[400]}
												secureTextEntry={!showConfirmPassword}
												autoCapitalize="none"
											/>
											<TouchableOpacity
												onPress={toggleConfirmPasswordVisibility}
												style={styles.passwordToggle}
											>
												<Ionicons
													name={
														showConfirmPassword
															? "eye-off-outline"
															: "eye-outline"
													}
													size={20}
													color={Colors.gray[400]}
												/>
											</TouchableOpacity>
										</View>
									</View>

									{/* Next Step Button */}
									<TouchableOpacity
										style={styles.actionButton}
										onPress={moveToNextStep}
										activeOpacity={0.8}
									>
										<LinearGradient
											colors={["#1e40af", "#3b82f6"]}
											style={styles.actionButtonGradient}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 0 }}
										>
											<View style={styles.actionButtonContent}>
												<Text style={styles.actionButtonText}>Continue</Text>
												<Ionicons
													name="arrow-forward"
													size={20}
													color="white"
												/>
											</View>
										</LinearGradient>
									</TouchableOpacity>
								</>
							) : (
								<>
									{/* Step 2: Faculty Information */}
									<View style={styles.formTitle}>
										<Ionicons
											name="school-outline"
											size={20}
											color={Colors.primary[600]}
											style={styles.formTitleIcon}
										/>
										<Text style={styles.formTitleText}>
											Faculty Information
										</Text>
									</View>

									{/* Employee ID Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Employee ID</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name="card-outline"
												size={20}
												color={Colors.gray[400]}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={employeeId}
												onChangeText={setEmployeeId}
												placeholder="Enter your employee ID"
												placeholderTextColor={Colors.gray[400]}
												autoCapitalize="characters"
												autoCorrect={false}
											/>
										</View>
									</View>

									{/* Department Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Department</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name="business-outline"
												size={20}
												color={Colors.gray[400]}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={department}
												onChangeText={setDepartment}
												placeholder="Enter your department"
												placeholderTextColor={Colors.gray[400]}
												autoCapitalize="words"
												autoCorrect={false}
											/>
										</View>
									</View>

									{/* Phone Number Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Phone Number</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name="call-outline"
												size={20}
												color={Colors.gray[400]}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={phone}
												onChangeText={setPhone}
												placeholder="Enter your phone number"
												placeholderTextColor={Colors.gray[400]}
												keyboardType="phone-pad"
												autoCorrect={false}
											/>
										</View>
									</View>

									{/* Back and Register Button Row */}
									<View style={styles.buttonRow}>
										<TouchableOpacity
											style={styles.backButton}
											onPress={moveToPreviousStep}
											activeOpacity={0.8}
										>
											<View style={styles.backButtonContent}>
												<Ionicons
													name="arrow-back"
													size={20}
													color={Colors.primary[600]}
												/>
												<Text style={styles.backButtonText}>Back</Text>
											</View>
										</TouchableOpacity>

										<TouchableOpacity
											style={[
												styles.registerButton,
												isLoading && styles.registerButtonDisabled,
											]}
											onPress={handleSignup}
											disabled={isLoading}
											activeOpacity={0.8}
										>
											<LinearGradient
												colors={
													isLoading
														? [Colors.gray[400], Colors.gray[500]]
														: ["#1e40af", "#3b82f6"]
												}
												style={styles.registerButtonGradient}
												start={{ x: 0, y: 0 }}
												end={{ x: 1, y: 0 }}
											>
												{isLoading ? (
													<View style={styles.loadingContainer}>
														<ActivityIndicator color="white" size="small" />
														<Text style={styles.registerButtonText}>
															Creating...
														</Text>
													</View>
												) : (
													<View style={styles.registerButtonContent}>
														<Text style={styles.registerButtonText}>
															Sign Up
														</Text>
													</View>
												)}
											</LinearGradient>
										</TouchableOpacity>
									</View>

									{/* Error Message */}
									{error && (
										<View style={styles.errorContainer}>
											<Ionicons
												name="alert-circle"
												size={16}
												color={Colors.error.main}
											/>
											<Text style={styles.errorText}>{error}</Text>
										</View>
									)}
								</>
							)}
						</View>
					</BlurView>

					{/* Footer */}
					<View style={styles.footer}>
						<Text style={styles.footerText}>Already have an account? </Text>
						<TouchableOpacity onPress={() => navigation.navigate("Login")}>
							<Text style={styles.signInText}>Sign In</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.primary[700],
	},

	backgroundGradient: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
	},

	keyboardView: {
		flex: 1,
	},

	scrollContent: {
		flexGrow: 1,
		justifyContent: "center",
		padding: Spacing[5],
	},

	header: {
		alignItems: "center",
		marginBottom: Spacing[6],
	},

	logoContainer: {
		marginBottom: Spacing[3],
	},

	logoGradient: {
		width: 90,
		height: 90,
		borderRadius: 45,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.3)",
	},

	logoImage: {
		width: 65,
		height: 65,
	},

	universityName: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: "white",
		textAlign: "center",
		marginBottom: Spacing[1],
	},

	appTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: "rgba(255,255,255,0.9)",
		textAlign: "center",
		marginBottom: Spacing[2],
	},

	subtitle: {
		fontSize: Typography.fontSize.base,
		color: "rgba(255,255,255,0.8)",
		textAlign: "center",
	},

	progressContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: Spacing[6],
	},

	progressStep: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.2)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.3)",
	},

	progressStepActive: {
		backgroundColor: Colors.primary[500],
		borderColor: "rgba(255,255,255,0.8)",
	},

	progressText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.bold,
		color: "rgba(255,255,255,0.6)",
	},

	progressTextActive: {
		color: "white",
	},

	progressLine: {
		flex: 0.2,
		height: 2,
		backgroundColor: "rgba(255,255,255,0.3)",
		marginHorizontal: Spacing[2],
	},

	formContainer: {
		borderRadius: BorderRadius["2xl"],
		overflow: "hidden",
		marginBottom: Spacing[6],
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.2)",
	},

	form: {
		padding: Spacing[6],
	},

	formTitle: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing[4],
	},

	formTitleIcon: {
		marginRight: Spacing[2],
	},

	formTitleText: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.gray[800],
	},

	inputContainer: {
		marginBottom: Spacing[5],
	},

	inputLabel: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.gray[700],
		marginBottom: Spacing[2],
	},

	inputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.background.primary,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		borderColor: Colors.border.light,
		paddingHorizontal: Spacing[4],
		height: 56,
		...Shadows.sm,
	},

	inputIcon: {
		marginRight: Spacing[3],
	},

	textInput: {
		flex: 1,
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
		height: "100%",
	},

	passwordInput: {
		paddingRight: Spacing[10],
	},

	passwordToggle: {
		position: "absolute",
		right: Spacing[4],
		padding: Spacing[2],
	},

	passwordHint: {
		fontSize: Typography.fontSize.xs,
		color: Colors.gray[500],
		marginTop: Spacing[1],
		marginLeft: Spacing[2],
	},

	actionButton: {
		borderRadius: BorderRadius.lg,
		overflow: "hidden",
		marginTop: Spacing[3],
		...Shadows.md,
	},

	actionButtonGradient: {
		height: 56,
		justifyContent: "center",
		alignItems: "center",
	},

	actionButtonContent: {
		flexDirection: "row",
		alignItems: "center",
	},

	actionButtonText: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: "white",
		marginRight: Spacing[2],
	},

	buttonRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: Spacing[3],
	},

	backButton: {
		flex: 0.45,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		borderColor: Colors.primary[500],
		height: 56,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "white",
		...Shadows.sm,
	},

	backButtonContent: {
		flexDirection: "row",
		alignItems: "center",
	},

	backButtonText: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.primary[600],
		marginLeft: Spacing[2],
	},

	registerButton: {
		flex: 0.45,
		borderRadius: BorderRadius.lg,
		overflow: "hidden",
		...Shadows.md,
	},

	registerButtonDisabled: {
		opacity: 0.7,
	},

	registerButtonGradient: {
		height: 56,
		justifyContent: "center",
		alignItems: "center",
	},

	registerButtonContent: {
		flexDirection: "row",
		alignItems: "center",
	},

	loadingContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},

	registerButtonText: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: "white",
		marginLeft: Spacing[2],
	},

	errorContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.error.light,
		padding: Spacing[3],
		borderRadius: BorderRadius.md,
		marginTop: Spacing[4],
	},

	errorText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.error.main,
		marginLeft: Spacing[2],
		flex: 1,
	},

	footer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},

	footerText: {
		fontSize: Typography.fontSize.sm,
		color: "rgba(255,255,255,0.8)",
	},

	signInText: {
		fontSize: Typography.fontSize.sm,
		color: "white",
		fontWeight: Typography.fontWeight.semibold,
	},
});
