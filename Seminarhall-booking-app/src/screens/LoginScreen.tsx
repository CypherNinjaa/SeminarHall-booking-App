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

type LoginScreenNavigationProp = StackNavigationProp<
	RootStackParamList,
	"Login"
>;

interface Props {
	navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const { login, error, clearError } = useAuthStore();

	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert("Missing Information", "Please fill in all fields");
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return;
		}

		setIsLoading(true);
		clearError();

		try {
			await login(email, password);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			// Remove manual navigation - let the auth state change handle navigation automatically
			// navigation.navigate("MainTabs");
		} catch (error) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			// Show the specific error message from auth store (includes email verification errors)
			const errorMessage =
				error instanceof Error
					? error.message
					: "Login failed. Please check your credentials and try again.";
			Alert.alert("Login Failed", errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const toggleRememberMe = () => {
		setRememberMe(!rememberMe);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
						<Text style={styles.subtitle}>Sign in to your account</Text>
					</View>

					{/* Login Form */}
					<BlurView intensity={20} tint="light" style={styles.formContainer}>
						<View style={styles.form}>
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
										placeholder="Enter your password"
										placeholderTextColor={Colors.gray[400]}
										secureTextEntry={!showPassword}
										autoCapitalize="none"
										autoComplete="password"
									/>
									<TouchableOpacity
										onPress={togglePasswordVisibility}
										style={styles.passwordToggle}
									>
										<Ionicons
											name={showPassword ? "eye-off-outline" : "eye-outline"}
											size={20}
											color={Colors.gray[400]}
										/>
									</TouchableOpacity>
								</View>
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

							{/* Remember Me Checkbox */}
							<View style={styles.rememberMeContainer}>
								<TouchableOpacity
									style={styles.checkboxContainer}
									onPress={toggleRememberMe}
									activeOpacity={0.7}
								>
									<View
										style={[
											styles.checkbox,
											rememberMe && styles.checkboxChecked,
										]}
									>
										{rememberMe && (
											<Ionicons name="checkmark" size={16} color="white" />
										)}
									</View>
									<Text style={styles.rememberMeText}>Remember me</Text>
								</TouchableOpacity>
							</View>

							{/* Login Button */}
							<TouchableOpacity
								style={[
									styles.loginButton,
									isLoading && styles.loginButtonDisabled,
								]}
								onPress={handleLogin}
								disabled={isLoading}
								activeOpacity={0.8}
							>
								<LinearGradient
									colors={
										isLoading
											? [Colors.gray[400], Colors.gray[500]]
											: ["#1e40af", "#3b82f6"]
									}
									style={styles.loginButtonGradient}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
								>
									{isLoading ? (
										<View style={styles.loadingContainer}>
											<Text style={styles.loginButtonText}>Signing In...</Text>
										</View>
									) : (
										<View style={styles.loginButtonContent}>
											<Text style={styles.loginButtonText}>Sign In</Text>
											<Ionicons name="arrow-forward" size={20} color="white" />
										</View>
									)}
								</LinearGradient>
							</TouchableOpacity>

							{/* Forgot Password */}
							<TouchableOpacity
								style={styles.forgotPasswordButton}
								onPress={() => navigation.navigate("ForgotPassword")}
								activeOpacity={0.7}
							>
								<Text style={styles.forgotPasswordText}>
									Forgot your password?
								</Text>
							</TouchableOpacity>
						</View>
					</BlurView>

					{/* Footer */}
					<View style={styles.footer}>
						<Text style={styles.footerText}>Don't have an account? </Text>
						<TouchableOpacity onPress={() => navigation.navigate("Signup")}>
							<Text style={styles.signUpText}>Sign Up</Text>
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
		marginBottom: Spacing[8],
	},

	logoContainer: {
		marginBottom: Spacing[4],
	},

	logoGradient: {
		width: 100,
		height: 100,
		borderRadius: 50,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.3)",
	},

	logoImage: {
		width: 70,
		height: 70,
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

	errorContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.error.light,
		padding: Spacing[3],
		borderRadius: BorderRadius.md,
		marginBottom: Spacing[4],
	},

	errorText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.error.main,
		marginLeft: Spacing[2],
		flex: 1,
	},

	loginButton: {
		borderRadius: BorderRadius.lg,
		overflow: "hidden",
		marginTop: Spacing[2],
		...Shadows.md,
	},

	loginButtonDisabled: {
		opacity: 0.7,
	},

	loginButtonGradient: {
		height: 56,
		justifyContent: "center",
		alignItems: "center",
	},

	loginButtonContent: {
		flexDirection: "row",
		alignItems: "center",
	},

	loadingContainer: {
		justifyContent: "center",
		alignItems: "center",
	},

	loginButtonText: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: "white",
		marginRight: Spacing[2],
	},

	forgotPasswordButton: {
		alignItems: "center",
		marginTop: Spacing[5],
		padding: Spacing[2],
	},

	forgotPasswordText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.primary[600],
		fontWeight: Typography.fontWeight.medium,
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

	signUpText: {
		fontSize: Typography.fontSize.sm,
		color: "white",
		fontWeight: Typography.fontWeight.semibold,
	},

	rememberMeContainer: {
		marginBottom: Spacing[4],
	},

	checkboxContainer: {
		flexDirection: "row",
		alignItems: "center",
	},

	checkbox: {
		width: 20,
		height: 20,
		borderRadius: BorderRadius.sm,
		borderWidth: 2,
		borderColor: Colors.gray[400],
		backgroundColor: "transparent",
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[2],
	},

	checkboxChecked: {
		backgroundColor: Colors.primary[600],
		borderColor: Colors.primary[600],
	},

	rememberMeText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.gray[700],
		fontWeight: Typography.fontWeight.medium,
	},
});
