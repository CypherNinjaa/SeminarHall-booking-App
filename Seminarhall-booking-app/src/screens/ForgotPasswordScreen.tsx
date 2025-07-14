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

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
	RootStackParamList,
	"ForgotPassword"
>;

interface Props {
	navigation: ForgotPasswordScreenNavigationProp;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const [emailError, setEmailError] = useState("");

	const { requestPasswordReset, error, clearError } = useAuthStore();

	// Enhanced email validation
	const validateEmail = (email: string) => {
		const emailRegex =
			/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

		if (!email.trim()) {
			return { isValid: false, message: "Email address is required" };
		}

		if (!emailRegex.test(email)) {
			return { isValid: false, message: "Please enter a valid email address" };
		}

		return { isValid: true, message: "" };
	};

	const handleEmailChange = (value: string) => {
		setEmail(value);
		const validation = validateEmail(value);
		setEmailError(validation.isValid ? "" : validation.message);
		clearError();
	};

	const handleSendResetEmail = async () => {
		// Validate email first
		const validation = validateEmail(email);
		if (!validation.isValid) {
			setEmailError(validation.message);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return;
		}

		setIsLoading(true);
		clearError();

		try {
			const result = await requestPasswordReset(email.trim().toLowerCase());

			if (result.success) {
				setEmailSent(true);
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			} else {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
				Alert.alert(
					"Error",
					result.message ||
						"Unable to send reset email. Please verify your email address and try again."
				);
			}
		} catch (error) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			// Don't show specific error details for security reasons
			Alert.alert(
				"Error",
				"Unable to send reset email. Please verify your email address and try again."
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleResendEmail = () => {
		setEmailSent(false);
		setEmail("");
		setEmailError("");
		clearError();
	};

	const goBackToLogin = () => {
		navigation.navigate("Login");
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
					{/* Header */}
					<View style={styles.header}>
						<TouchableOpacity
							style={styles.backButton}
							onPress={goBackToLogin}
							activeOpacity={0.7}
						>
							<Ionicons name="arrow-back" size={24} color="white" />
						</TouchableOpacity>

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
						<Text style={styles.subtitle}>
							{emailSent ? "Check your email" : "Reset your password"}
						</Text>
					</View>

					{/* Main Content */}
					<BlurView intensity={20} tint="light" style={styles.formContainer}>
						<View style={styles.form}>
							{!emailSent ? (
								<>
									{/* Reset Password Form */}
									<View style={styles.formTitle}>
										<Ionicons
											name="mail-outline"
											size={24}
											color={Colors.primary[600]}
											style={styles.formTitleIcon}
										/>
										<Text style={styles.formTitleText}>Forgot Password?</Text>
									</View>

									<Text style={styles.instructionText}>
										No worries! Enter your email address and we'll send you a
										secure link to reset your password on our website.
									</Text>

									{/* Email Input */}
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Email Address</Text>
										<View
											style={[
												styles.inputWrapper,
												emailError && styles.inputWrapperError,
											]}
										>
											<Ionicons
												name="mail-outline"
												size={20}
												color={
													emailError ? Colors.error.main : Colors.gray[400]
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
												editable={!isLoading}
											/>
											{!emailError &&
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
										{emailError ? (
											<Text style={styles.errorHint}>{emailError}</Text>
										) : null}
									</View>

									{/* Send Reset Email Button */}
									<TouchableOpacity
										style={[
											styles.actionButton,
											isLoading && styles.actionButtonDisabled,
										]}
										onPress={handleSendResetEmail}
										disabled={isLoading}
										activeOpacity={0.8}
									>
										<LinearGradient
											colors={
												isLoading
													? [Colors.gray[400], Colors.gray[500]]
													: ["#1e40af", "#3b82f6"]
											}
											style={styles.actionButtonGradient}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 0 }}
										>
											{isLoading ? (
												<View style={styles.loadingContainer}>
													<ActivityIndicator color="white" size="small" />
													<Text style={styles.actionButtonText}>
														Sending...
													</Text>
												</View>
											) : (
												<View style={styles.actionButtonContent}>
													<Ionicons
														name="mail"
														size={20}
														color="white"
														style={styles.buttonIcon}
													/>
													<Text style={styles.actionButtonText}>
														Send Reset Link
													</Text>
												</View>
											)}
										</LinearGradient>
									</TouchableOpacity>

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
							) : (
								<>
									{/* Success State */}
									<View style={styles.successContainer}>
										<View style={styles.successIconContainer}>
											<LinearGradient
												colors={[Colors.success.light, Colors.success.main]}
												style={styles.successIconGradient}
											>
												<Ionicons name="mail" size={32} color="white" />
											</LinearGradient>
										</View>

										<Text style={styles.successTitle}>Email Sent!</Text>
										<Text style={styles.successMessage}>
											We've sent a password reset link to{" "}
											<Text style={styles.emailHighlight}>{email}</Text>
										</Text>

										<View style={styles.instructionsContainer}>
											<Text style={styles.instructionStep}>
												1. Check your email inbox (and spam folder)
											</Text>
											<Text style={styles.instructionStep}>
												2. Click the "Reset Password" link in the email
											</Text>
											<Text style={styles.instructionStep}>
												3. Create your new password on our website
											</Text>
											<Text style={styles.instructionStep}>
												4. Return to the app and sign in with your new password
											</Text>
										</View>

										{/* Resend Email Button */}
										<TouchableOpacity
											style={styles.resendButton}
											onPress={handleResendEmail}
											activeOpacity={0.8}
										>
											<Text style={styles.resendButtonText}>
												Didn't receive the email? Send again
											</Text>
										</TouchableOpacity>
									</View>
								</>
							)}
						</View>
					</BlurView>

					{/* Footer */}
					<View style={styles.footer}>
						<Text style={styles.footerText}>Remember your password? </Text>
						<TouchableOpacity onPress={goBackToLogin}>
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
		position: "relative",
	},

	backButton: {
		position: "absolute",
		top: 0,
		left: 0,
		padding: Spacing[2],
		zIndex: 1,
	},

	logoContainer: {
		marginBottom: Spacing[3],
		marginTop: Spacing[6],
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
		justifyContent: "center",
	},

	formTitleIcon: {
		marginRight: Spacing[2],
	},

	formTitleText: {
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.gray[800],
	},

	instructionText: {
		fontSize: Typography.fontSize.base,
		color: Colors.gray[600],
		textAlign: "center",
		marginBottom: Spacing[6],
		lineHeight: 22,
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
	},

	validationIcon: {
		marginLeft: Spacing[2],
	},

	errorHint: {
		fontSize: Typography.fontSize.xs,
		color: Colors.error.main,
		marginTop: Spacing[1],
		marginLeft: Spacing[2],
		fontWeight: Typography.fontWeight.medium,
	},

	actionButton: {
		borderRadius: BorderRadius.lg,
		overflow: "hidden",
		marginTop: Spacing[3],
		...Shadows.md,
	},

	actionButtonDisabled: {
		opacity: 0.7,
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

	loadingContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},

	buttonIcon: {
		marginRight: Spacing[2],
	},

	actionButtonText: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: "white",
		marginLeft: Spacing[1],
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

	successContainer: {
		alignItems: "center",
	},

	successIconContainer: {
		marginBottom: Spacing[4],
	},

	successIconGradient: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: "center",
		alignItems: "center",
	},

	successTitle: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: Colors.gray[800],
		marginBottom: Spacing[3],
		textAlign: "center",
	},

	successMessage: {
		fontSize: Typography.fontSize.base,
		color: Colors.gray[600],
		textAlign: "center",
		marginBottom: Spacing[5],
		lineHeight: 22,
	},

	emailHighlight: {
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.primary[600],
	},

	instructionsContainer: {
		width: "100%",
		marginBottom: Spacing[6],
	},

	instructionStep: {
		fontSize: Typography.fontSize.sm,
		color: Colors.gray[600],
		marginBottom: Spacing[2],
		paddingLeft: Spacing[4],
	},

	resendButton: {
		paddingVertical: Spacing[3],
		paddingHorizontal: Spacing[4],
	},

	resendButtonText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.primary[600],
		fontWeight: Typography.fontWeight.medium,
		textAlign: "center",
		textDecorationLine: "underline",
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
