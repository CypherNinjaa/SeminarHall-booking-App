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
	Dimensions,
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

const { width: screenWidth } = Dimensions.get("window");

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

	// Focus states
	const [focusedField, setFocusedField] = useState<string | null>(null);

	// Validation state for real-time feedback
	const [validationErrors, setValidationErrors] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
		phone: "",
		employeeId: "",
		department: "",
	});
	const [passwordStrength, setPasswordStrength] = useState(0);

	const { register, error, clearError } = useAuthStore();

	// Real-time validation handlers
	const handleNameChange = (value: string) => {
		setName(value);
		const validation = validateName(value);
		setValidationErrors((prev) => ({
			...prev,
			name: validation.isValid ? "" : validation.message,
		}));
	};

	const handleEmailChange = (value: string) => {
		setEmail(value);
		const validation = validateEmail(value);
		setValidationErrors((prev) => ({
			...prev,
			email: validation.isValid ? "" : validation.message,
		}));
	};

	const handlePasswordChange = (value: string) => {
		setPassword(value);
		const validation = validatePassword(value);
		setPasswordStrength(validation.strength);
		setValidationErrors((prev) => ({
			...prev,
			password: validation.isValid ? "" : validation.message,
		}));

		// Also validate confirm password if it exists
		if (confirmPassword) {
			const confirmMatch = value === confirmPassword;
			setValidationErrors((prev) => ({
				...prev,
				confirmPassword: confirmMatch ? "" : "Passwords do not match",
			}));
		}
	};

	const handleConfirmPasswordChange = (value: string) => {
		setConfirmPassword(value);
		const passwordsMatch = password === value;
		setValidationErrors((prev) => ({
			...prev,
			confirmPassword: passwordsMatch ? "" : "Passwords do not match",
		}));
	};

	const handlePhoneChange = (value: string) => {
		setPhone(value);
		const validation = validatePhone(value);
		setValidationErrors((prev) => ({
			...prev,
			phone: validation.isValid ? "" : validation.message,
		}));
	};

	const handleEmployeeIdChange = (value: string) => {
		setEmployeeId(value);
		const validation = validateEmployeeId(value);
		setValidationErrors((prev) => ({
			...prev,
			employeeId: validation.isValid ? "" : validation.message,
		}));
	};

	const handleDepartmentChange = (value: string) => {
		setDepartment(value);
		const validation = validateDepartment(value);
		setValidationErrors((prev) => ({
			...prev,
			department: validation.isValid ? "" : validation.message,
		}));
	};

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const toggleConfirmPasswordVisibility = () => {
		setShowConfirmPassword(!showConfirmPassword);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	// Enhanced validation functions
	const validateEmail = (email: string) => {
		// More strict email validation with domain requirements
		const emailRegex =
			/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

		// Check basic format
		if (!emailRegex.test(email)) {
			return { isValid: false, message: "Please enter a valid email address" };
		}

		// Check for required university domain
		const requiredDomain = "@ptn.amity.edu";
		if (!email.toLowerCase().includes(requiredDomain)) {
			return { isValid: false, message: "Please use your university email address (@ptn.amity.edu)" };
		}

		return { isValid: true, message: "" };
	};

	const validatePassword = (password: string) => {
		const validations = [
			{ test: password.length >= 8, message: "At least 8 characters" },
			{ test: /[A-Z]/.test(password), message: "One uppercase letter" },
			{ test: /[a-z]/.test(password), message: "One lowercase letter" },
			{ test: /\d/.test(password), message: "One number" },
			{
				test: /[!@#$%^&*(),.?":{}|<>]/.test(password),
				message: "One special character",
			},
		];

		const failedValidations = validations.filter((v) => !v.test);

		return {
			isValid: failedValidations.length === 0,
			message:
				failedValidations.length > 0
					? `Missing: ${failedValidations.map((v) => v.message).join(", ")}`
					: "",
			strength: validations.length - failedValidations.length,
		};
	};

	const validateName = (name: string) => {
		if (!name.trim()) {
			return { isValid: false, message: "Full name is required" };
		}
		if (name.trim().length < 2) {
			return { isValid: false, message: "Name must be at least 2 characters" };
		}
		if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
			return {
				isValid: false,
				message: "Name can only contain letters and spaces",
			};
		}
		return { isValid: true, message: "" };
	};

	const validatePhone = (phone: string) => {
		if (!phone.trim()) {
			return { isValid: true, message: "" }; // Phone is optional
		}
		// Indian phone number validation
		const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[789]\d{9}$/;
		if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
			return {
				isValid: false,
				message: "Please enter a valid Indian phone number",
			};
		}
		return { isValid: true, message: "" };
	};

	const validateEmployeeId = (empId: string) => {
		if (!empId.trim()) {
			return { isValid: false, message: "Employee ID is required" };
		}
		if (empId.trim().length < 3) {
			return {
				isValid: false,
				message: "Employee ID must be at least 3 characters",
			};
		}
		// Basic alphanumeric validation
		if (!/^[a-zA-Z0-9]+$/.test(empId.trim())) {
			return {
				isValid: false,
				message: "Employee ID can only contain letters and numbers",
			};
		}
		return { isValid: true, message: "" };
	};

	const validateDepartment = (dept: string) => {
		if (!dept.trim()) {
			return { isValid: true, message: "" }; // Department is optional
		}
		if (dept.trim().length < 2) {
			return {
				isValid: false,
				message: "Department name must be at least 2 characters",
			};
		}
		return { isValid: true, message: "" };
	};

	const validateStep1 = () => {
		// Clear any previous errors
		clearError();

		// Validate name
		const nameValidation = validateName(name);
		if (!nameValidation.isValid) {
			Alert.alert("Invalid Name", nameValidation.message);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		// Validate email
		const emailValidation = validateEmail(email);
		if (!emailValidation.isValid) {
			Alert.alert("Invalid Email", emailValidation.message);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		// Validate password
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.isValid) {
			Alert.alert(
				"Weak Password",
				`Your password needs improvement:\n${passwordValidation.message}`
			);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		// Check password confirmation
		if (!confirmPassword) {
			Alert.alert("Missing Information", "Please confirm your password");
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

	const validateStep2 = () => {
		// Validate employee ID (required)
		const empIdValidation = validateEmployeeId(employeeId);
		if (!empIdValidation.isValid) {
			Alert.alert("Invalid Employee ID", empIdValidation.message);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		// Validate phone (optional but if provided, must be valid)
		const phoneValidation = validatePhone(phone);
		if (!phoneValidation.isValid) {
			Alert.alert("Invalid Phone Number", phoneValidation.message);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		// Validate department (optional but if provided, must be valid)
		const deptValidation = validateDepartment(department);
		if (!deptValidation.isValid) {
			Alert.alert("Invalid Department", deptValidation.message);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return false;
		}

		return true;
	};

	const handleSignup = async () => {
		// Validate step 2 fields
		if (!validateStep2()) {
			return;
		}

		setIsLoading(true);
		clearError();

		try {
			await register({
				name: name.trim(),
				email: email.trim().toLowerCase(),
				password,
				phone: phone.trim(),
				employeeId: employeeId.trim().toUpperCase(),
				department: department.trim(),
				role: "faculty", // Default role, will be approved by admin
			});

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

			// Show success message
			Alert.alert(
				"Registration Successful",
				"Your account has been created! Please check your email and click the verification link before logging in. After verification, wait for admin approval to access the app.",
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
					{/* Responsive Container */}
					<View style={styles.responsiveContainer}>
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
										<Text style={styles.inputLabel}>Full Name *</Text>
										<View
											style={[
												styles.inputWrapper,
												validationErrors.name && styles.inputWrapperError,
											]}
										>
											<Ionicons
												name="person-outline"
												size={20}
												color={
													validationErrors.name
														? Colors.error.main
														: Colors.gray[400]
												}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={name}
												onChangeText={handleNameChange}
												placeholder="Enter your full name"
												placeholderTextColor={Colors.gray[400]}
												autoCapitalize="words"
												autoCorrect={false}
											/>
											{!validationErrors.name && name.length > 1 && (
												<Ionicons
													name="checkmark-circle"
													size={20}
													color={Colors.success.main}
													style={styles.validationIcon}
												/>
											)}
										</View>
										{validationErrors.name ? (
											<Text style={styles.errorHint}>
												{validationErrors.name}
											</Text>
										) : null}
									</View>

									{/* Email Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Email Address *</Text>
										<View
											style={[
												styles.inputWrapper,
												validationErrors.email && styles.inputWrapperError,
											]}
										>
											<Ionicons
												name="mail-outline"
												size={20}
												color={
													validationErrors.email
														? Colors.error.main
														: Colors.gray[400]
												}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={email}
												onChangeText={handleEmailChange}
												placeholder="Enter your university email"
												placeholderTextColor={Colors.gray[400]}
												keyboardType="email-address"
												autoCapitalize="none"
												autoCorrect={false}
												autoComplete="email"
											/>
											{!validationErrors.email &&
												email.length > 0 &&
												validateEmail(email).isValid && (
													<Ionicons
														name="checkmark-circle"
														size={20}
														color={Colors.success.main}
														style={styles.validationIcon}
													/>
												)}
										</View>
										{validationErrors.email ? (
											<Text style={styles.errorHint}>
												{validationErrors.email}
											</Text>
										) : null}
									</View>

									{/* Password Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Password *</Text>
										<View
											style={[
												styles.inputWrapper,
												validationErrors.password && styles.inputWrapperError,
											]}
										>
											<Ionicons
												name="lock-closed-outline"
												size={20}
												color={
													validationErrors.password
														? Colors.error.main
														: Colors.gray[400]
												}
												style={styles.inputIcon}
											/>
											<TextInput
												style={[styles.textInput, styles.passwordInput]}
												value={password}
												onChangeText={handlePasswordChange}
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

										{/* Password Strength Indicator */}
										{password.length > 0 && (
											<View style={styles.passwordStrengthContainer}>
												<View style={styles.strengthBars}>
													{[1, 2, 3, 4, 5].map((level) => (
														<View
															key={level}
															style={[
																styles.strengthBar,
																passwordStrength >= level &&
																	styles.strengthBarActive,
																passwordStrength >= level && {
																	backgroundColor:
																		passwordStrength <= 2
																			? Colors.error.main
																			: passwordStrength <= 4
																			? Colors.warning.main
																			: Colors.success.main,
																},
															]}
														/>
													))}
												</View>
												<Text
													style={[
														styles.strengthText,
														{
															color:
																passwordStrength <= 2
																	? Colors.error.main
																	: passwordStrength <= 4
																	? Colors.warning.main
																	: Colors.success.main,
														},
													]}
												>
													{passwordStrength <= 2
														? "Weak"
														: passwordStrength <= 4
														? "Medium"
														: "Strong"}
												</Text>
											</View>
										)}

										<Text style={styles.passwordHint}>
											Password must include: uppercase, lowercase, number,
											special character (8+ chars)
										</Text>
										{validationErrors.password ? (
											<Text style={styles.errorHint}>
												{validationErrors.password}
											</Text>
										) : null}
									</View>

									{/* Confirm Password Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Confirm Password *</Text>
										<View
											style={[
												styles.inputWrapper,
												validationErrors.confirmPassword &&
													styles.inputWrapperError,
											]}
										>
											<Ionicons
												name="lock-closed-outline"
												size={20}
												color={
													validationErrors.confirmPassword
														? Colors.error.main
														: Colors.gray[400]
												}
												style={styles.inputIcon}
											/>
											<TextInput
												style={[styles.textInput, styles.passwordInput]}
												value={confirmPassword}
												onChangeText={handleConfirmPasswordChange}
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
											{!validationErrors.confirmPassword &&
												confirmPassword.length > 0 &&
												password === confirmPassword && (
													<View style={styles.confirmPasswordCheck}>
														<Ionicons
															name="checkmark-circle"
															size={20}
															color={Colors.success.main}
														/>
													</View>
												)}
										</View>
										{validationErrors.confirmPassword ? (
											<Text style={styles.errorHint}>
												{validationErrors.confirmPassword}
											</Text>
										) : null}
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
										<Text style={styles.inputLabel}>Employee ID *</Text>
										<View
											style={[
												styles.inputWrapper,
												validationErrors.employeeId && styles.inputWrapperError,
											]}
										>
											<Ionicons
												name="card-outline"
												size={20}
												color={
													validationErrors.employeeId
														? Colors.error.main
														: Colors.gray[400]
												}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={employeeId}
												onChangeText={handleEmployeeIdChange}
												placeholder="Enter your employee ID"
												placeholderTextColor={Colors.gray[400]}
												autoCapitalize="characters"
												autoCorrect={false}
											/>
											{!validationErrors.employeeId &&
												employeeId.length > 2 && (
													<Ionicons
														name="checkmark-circle"
														size={20}
														color={Colors.success.main}
														style={styles.validationIcon}
													/>
												)}
										</View>
										{validationErrors.employeeId ? (
											<Text style={styles.errorHint}>
												{validationErrors.employeeId}
											</Text>
										) : null}
									</View>

									{/* Department Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Department</Text>
										<View
											style={[
												styles.inputWrapper,
												validationErrors.department && styles.inputWrapperError,
											]}
										>
											<Ionicons
												name="business-outline"
												size={20}
												color={
													validationErrors.department
														? Colors.error.main
														: Colors.gray[400]
												}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={department}
												onChangeText={handleDepartmentChange}
												placeholder="Enter your department"
												placeholderTextColor={Colors.gray[400]}
												autoCapitalize="words"
												autoCorrect={false}
											/>
											{!validationErrors.department &&
												department.length > 1 && (
													<Ionicons
														name="checkmark-circle"
														size={20}
														color={Colors.success.main}
														style={styles.validationIcon}
													/>
												)}
										</View>
										{validationErrors.department ? (
											<Text style={styles.errorHint}>
												{validationErrors.department}
											</Text>
										) : null}
									</View>

									{/* Phone Number Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Phone Number</Text>
										<View
											style={[
												styles.inputWrapper,
												validationErrors.phone && styles.inputWrapperError,
											]}
										>
											<Ionicons
												name="call-outline"
												size={20}
												color={
													validationErrors.phone
														? Colors.error.main
														: Colors.gray[400]
												}
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.textInput}
												value={phone}
												onChangeText={handlePhoneChange}
												placeholder="Enter your phone number"
												placeholderTextColor={Colors.gray[400]}
												keyboardType="phone-pad"
												autoCorrect={false}
											/>
											{!validationErrors.phone &&
												phone.length > 0 &&
												validatePhone(phone).isValid && (
													<Ionicons
														name="checkmark-circle"
														size={20}
														color={Colors.success.main}
														style={styles.validationIcon}
													/>
												)}
										</View>
										{validationErrors.phone ? (
											<Text style={styles.errorHint}>
												{validationErrors.phone}
											</Text>
										) : phone.length === 0 ? (
											<Text style={styles.optionalHint}>
												Optional - but recommended for notifications
											</Text>
										) : null}
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
		paddingHorizontal: screenWidth > 768 ? Spacing[8] : Spacing[5],
		paddingVertical: Spacing[5],
	},

	responsiveContainer: {
		width: "100%",
		maxWidth: screenWidth > 768 ? 480 : "100%",
		alignSelf: "center",
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
		...(Platform.OS === "web" && {
			outline: "none",
			WebkitTapHighlightColor: "transparent",
		}),
	},

	inputWrapperFocused: {
		borderColor: Colors.primary[500],
		borderWidth: 2,
	},

	inputWrapperError: {
		borderColor: Colors.error.main,
		borderWidth: 2,
	},

	inputIcon: {
		marginRight: Spacing[3],
	},

	textInput: {
		flex: 1,
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
		height: "100%",
		...(Platform.OS === "web" && {
			outline: "none", // Remove default web outline
			WebkitAppearance: "none", // Remove webkit styling
			border: "none", // Ensure no border
			boxShadow: "none", // Remove any box shadow
		}),
	},

	passwordInput: {
		paddingRight: Spacing[12],
	},

	passwordToggle: {
		position: "absolute",
		right: Spacing[4],
		padding: Spacing[2],
	},

	confirmPasswordCheck: {
		position: "absolute",
		right: Spacing[12],
		padding: Spacing[2],
	},

	validationIcon: {
		marginLeft: Spacing[2],
	},

	passwordStrengthContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: Spacing[2],
		marginLeft: Spacing[2],
	},

	strengthBars: {
		flexDirection: "row",
		flex: 1,
		gap: Spacing[1],
		marginRight: Spacing[3],
	},

	strengthBar: {
		flex: 1,
		height: 4,
		backgroundColor: Colors.gray[200],
		borderRadius: 2,
	},

	strengthBarActive: {
		backgroundColor: Colors.success.main,
	},

	strengthText: {
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.medium,
		minWidth: 50,
	},

	passwordHint: {
		fontSize: Typography.fontSize.xs,
		color: Colors.gray[500],
		marginTop: Spacing[1],
		marginLeft: Spacing[2],
	},

	errorHint: {
		fontSize: Typography.fontSize.xs,
		color: Colors.error.main,
		marginTop: Spacing[1],
		marginLeft: Spacing[2],
		fontWeight: Typography.fontWeight.medium,
	},

	optionalHint: {
		fontSize: Typography.fontSize.xs,
		color: Colors.gray[400],
		marginTop: Spacing[1],
		marginLeft: Spacing[2],
		fontStyle: "italic",
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
