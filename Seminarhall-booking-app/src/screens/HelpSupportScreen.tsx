import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Linking,
	Alert,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "../stores/authStore";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../constants/theme";

interface HelpSupportScreenProps {}

interface FAQItem {
	id: string;
	question: string;
	answer: string;
	category: "booking" | "account" | "technical" | "general";
}

interface ContactMethod {
	id: string;
	title: string;
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	action: () => void;
	color: string;
}

const HelpSupportScreen: React.FC<HelpSupportScreenProps> = () => {
	const navigation = useNavigation();
	const { isDark } = useTheme();
	const { user } = useAuthStore();
	const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

	const styles = getStyles(isDark);

	// FAQ Data
	const faqs: FAQItem[] = [
		{
			id: "1",
			question: "How do I book a seminar hall?",
			answer:
				"To book a seminar hall:\n1. Navigate to 'Browse Halls' from the home screen\n2. Select your preferred hall\n3. Choose date and time\n4. Fill in booking details\n5. Submit for approval\n\nYour booking will be reviewed by administrators and you'll receive a notification with the status.",
			category: "booking",
		},
		{
			id: "2",
			question: "How long does it take for booking approval?",
			answer:
				"Booking approvals typically take 24-48 hours during business days. For urgent bookings, you can contact the admin directly through the contact methods below.",
			category: "booking",
		},
		{
			id: "3",
			question: "Can I cancel my booking?",
			answer:
				"Yes, you can cancel pending or approved bookings that haven't started yet. Go to 'My Bookings' and tap on the booking you want to cancel. Please note that cancellations should be made at least 2 hours before the scheduled time.",
			category: "booking",
		},
		{
			id: "4",
			question: "What equipment is available in the halls?",
			answer:
				"Each hall has different equipment available. Common equipment includes:\n• Projector and screen\n• Audio system\n• Microphones\n• Whiteboards\n• Air conditioning\n\nSpecific equipment details are shown in each hall's information page.",
			category: "booking",
		},
		{
			id: "5",
			question: "How do I update my profile information?",
			answer:
				"To update your profile:\n1. Go to the Profile tab\n2. Tap 'Edit Profile'\n3. Update your information\n4. Save changes\n\nFor email changes, you may need to verify the new email address.",
			category: "account",
		},
		{
			id: "6",
			question: "I forgot my password. How can I reset it?",
			answer:
				"To reset your password:\n1. Go to the login screen\n2. Tap 'Forgot Password'\n3. Enter your email address\n4. Check your email for reset instructions\n5. Follow the link to create a new password",
			category: "account",
		},
		{
			id: "7",
			question: "Why am I not receiving notifications?",
			answer:
				"If you're not receiving notifications:\n1. Check your device notification settings\n2. Ensure the app has notification permissions\n3. Check your notification preferences in Settings\n4. Make sure you have a stable internet connection\n\nIf issues persist, try logging out and back in.",
			category: "technical",
		},
		{
			id: "8",
			question: "The app is running slowly. What should I do?",
			answer:
				"To improve app performance:\n1. Close and restart the app\n2. Check your internet connection\n3. Update the app to the latest version\n4. Restart your device\n5. Clear app cache (Android)\n\nIf problems continue, contact support.",
			category: "technical",
		},
		{
			id: "9",
			question: "What are the booking guidelines?",
			answer:
				"Booking guidelines:\n• Book at least 24 hours in advance\n• Provide accurate attendee count\n• Specify all required equipment\n• Follow university policies\n• Cancel if unable to attend\n• Keep the hall clean and organized\n• Report any damages immediately",
			category: "general",
		},
		{
			id: "10",
			question: "Who can I contact for technical support?",
			answer:
				"For technical support, you can:\n• Use the contact methods below\n• Email the developer directly\n• Report bugs through the app\n• Contact university IT support\n\nPlease include details about your device and the issue you're experiencing.",
			category: "technical",
		},
	];

	// Contact Methods
	const contactMethods: ContactMethod[] = [
		{
			id: "email",
			title: "Email Support",
			description: "Get help via email - we respond within 24 hours",
			icon: "mail-outline",
			action: () => handleEmailContact(),
			color: Colors.primary[500],
		},
		{
			id: "developer",
			title: "Developer Contact",
			description: "Contact the app developer directly",
			icon: "code-outline",
			action: () => handleDeveloperContact(),
			color: Colors.success.main,
		},
		{
			id: "phone",
			title: "University Office",
			description: "Call during business hours (9 AM - 5 PM)",
			icon: "call-outline",
			action: () => handlePhoneContact(),
			color: Colors.warning.main,
		},
		{
			id: "feedback",
			title: "Send Feedback",
			description: "Share suggestions or report issues",
			icon: "chatbubble-outline",
			action: () => handleFeedback(),
			color: Colors.error.main,
		},
	];

	const handleEmailContact = () => {
		const email = "support@amitypatna.edu";
		const subject = "Seminar Hall Booking App - Support Request";
		const body = `Hello Support Team,

I need assistance with the Seminar Hall Booking App.

User ID: ${user?.id || "Not logged in"}
Device: ${Platform.OS} ${Platform.Version}
App Version: 1.0.0

Issue Description:
[Please describe your issue here]

Thank you,
${user?.name || "User"}`;

		const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
			subject
		)}&body=${encodeURIComponent(body)}`;

		Linking.canOpenURL(mailtoUrl)
			.then((supported) => {
				if (supported) {
					Linking.openURL(mailtoUrl);
				} else {
					Alert.alert(
						"Email App Not Available",
						`Please send an email to ${email} with your support request.`,
						[
							{
								text: "Copy Email",
								onPress: () => {
									// In a real app, you'd use Clipboard.setString(email)
									Alert.alert(
										"Email Copied",
										`Email address ${email} copied to clipboard.`
									);
								},
							},
							{ text: "OK" },
						]
					);
				}
			})
			.catch((err) => console.error("An error occurred", err));
	};

	const handleDeveloperContact = () => {
		const email = "vikashkelly@gmail.com";
		const subject = "Seminar Hall Booking App - Developer Contact";
		const body = `Hello Vikash,

I would like to contact you regarding the Seminar Hall Booking App.

User ID: ${user?.id || "Not logged in"}
Device: ${Platform.OS} ${Platform.Version}
App Version: 1.0.0

Message:
[Please describe your message here]

Best regards,
${user?.name || "User"}`;

		const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
			subject
		)}&body=${encodeURIComponent(body)}`;

		Linking.canOpenURL(mailtoUrl)
			.then((supported) => {
				if (supported) {
					Linking.openURL(mailtoUrl);
				} else {
					Alert.alert(
						"Email App Not Available",
						`Please send an email to ${email} to contact the developer.`,
						[
							{
								text: "Copy Email",
								onPress: () => {
									Alert.alert(
										"Email Copied",
										`Developer email ${email} copied to clipboard.`
									);
								},
							},
							{ text: "OK" },
						]
					);
				}
			})
			.catch((err) => console.error("An error occurred", err));
	};

	const handlePhoneContact = () => {
		const phoneNumber = "+91-1234567890"; // Replace with actual university number
		Alert.alert(
			"Call University Office",
			`Would you like to call ${phoneNumber}?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Call",
					onPress: () => {
						const phoneUrl = `tel:${phoneNumber}`;
						Linking.canOpenURL(phoneUrl)
							.then((supported) => {
								if (supported) {
									Linking.openURL(phoneUrl);
								} else {
									Alert.alert(
										"Unable to make call",
										"Phone app is not available on this device."
									);
								}
							})
							.catch((err) => console.error("An error occurred", err));
					},
				},
			]
		);
	};

	const handleFeedback = () => {
		// Navigate to feedback form or handle feedback submission
		Alert.alert(
			"Send Feedback",
			"This will open a feedback form. This feature will be implemented soon.",
			[{ text: "OK" }]
		);
	};

	const toggleFAQ = (faqId: string) => {
		setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
	};

	const renderContactMethod = (method: ContactMethod) => (
		<TouchableOpacity
			key={method.id}
			style={styles.contactCard}
			onPress={method.action}
			activeOpacity={0.7}
		>
			<View style={[styles.contactIcon, { backgroundColor: method.color }]}>
				<Ionicons name={method.icon} size={24} color="#FFFFFF" />
			</View>
			<View style={styles.contactInfo}>
				<Text style={styles.contactTitle}>{method.title}</Text>
				<Text style={styles.contactDescription}>{method.description}</Text>
			</View>
			<Ionicons
				name="chevron-forward"
				size={20}
				color={isDark ? Colors.gray[400] : Colors.gray[500]}
			/>
		</TouchableOpacity>
	);

	const renderFAQItem = (faq: FAQItem) => {
		const isExpanded = expandedFAQ === faq.id;

		return (
			<View key={faq.id} style={styles.faqItem}>
				<TouchableOpacity
					style={styles.faqQuestion}
					onPress={() => toggleFAQ(faq.id)}
					activeOpacity={0.7}
				>
					<Text style={styles.faqQuestionText}>{faq.question}</Text>
					<Ionicons
						name={isExpanded ? "chevron-up" : "chevron-down"}
						size={20}
						color={isDark ? Colors.gray[400] : Colors.gray[600]}
					/>
				</TouchableOpacity>
				{isExpanded && (
					<View style={styles.faqAnswer}>
						<Text style={styles.faqAnswerText}>{faq.answer}</Text>
					</View>
				)}
			</View>
		);
	};

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
				<Text style={styles.title}>Help & Support</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Contact Methods Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Get in Touch</Text>
					<Text style={styles.sectionDescription}>
						Choose the best way to reach us for help and support
					</Text>
					{contactMethods.map(renderContactMethod)}
				</View>

				{/* FAQ Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
					<Text style={styles.sectionDescription}>
						Find quick answers to common questions
					</Text>
					{faqs.map(renderFAQItem)}
				</View>

				{/* App Information */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>App Information</Text>
					<View style={styles.infoCard}>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Version</Text>
							<Text style={styles.infoValue}>1.0.0</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Developer</Text>
							<Text style={styles.infoValue}>Vikash Kumar</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Contact</Text>
							<TouchableOpacity onPress={handleDeveloperContact}>
								<Text
									style={[styles.infoValue, { color: Colors.primary[500] }]}
								>
									vikashkelly@gmail.com
								</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>University</Text>
							<Text style={styles.infoValue}>Amity University Patna</Text>
						</View>
					</View>
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
		section: {
			padding: Spacing[4],
		},
		sectionTitle: {
			fontSize: Typography.fontSize.xl,
			fontWeight: Typography.fontWeight.bold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
			marginBottom: Spacing[2],
		},
		sectionDescription: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
			marginBottom: Spacing[4],
			lineHeight: 20,
		},
		contactCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: isDark ? Colors.gray[800] : Colors.background.primary,
			borderRadius: BorderRadius.lg,
			padding: Spacing[4],
			marginBottom: Spacing[3],
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[700] : Colors.gray[200],
			...Shadows.sm,
		},
		contactIcon: {
			width: 48,
			height: 48,
			borderRadius: BorderRadius.full,
			justifyContent: "center",
			alignItems: "center",
			marginRight: Spacing[3],
		},
		contactInfo: {
			flex: 1,
		},
		contactTitle: {
			fontSize: Typography.fontSize.base,
			fontWeight: Typography.fontWeight.semibold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
			marginBottom: 2,
		},
		contactDescription: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
			lineHeight: 18,
		},
		faqItem: {
			backgroundColor: isDark ? Colors.gray[800] : Colors.background.primary,
			borderRadius: BorderRadius.lg,
			marginBottom: Spacing[3],
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[700] : Colors.gray[200],
			overflow: "hidden",
		},
		faqQuestion: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: Spacing[4],
		},
		faqQuestionText: {
			fontSize: Typography.fontSize.base,
			fontWeight: Typography.fontWeight.semibold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
			flex: 1,
			marginRight: Spacing[2],
		},
		faqAnswer: {
			paddingHorizontal: Spacing[4],
			paddingBottom: Spacing[4],
			borderTopWidth: 1,
			borderTopColor: isDark ? Colors.gray[700] : Colors.gray[200],
		},
		faqAnswerText: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[300] : Colors.gray[700],
			lineHeight: 20,
		},
		infoCard: {
			backgroundColor: isDark ? Colors.gray[800] : Colors.background.primary,
			borderRadius: BorderRadius.lg,
			padding: Spacing[4],
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[700] : Colors.gray[200],
			...Shadows.sm,
		},
		infoRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: Spacing[2],
			borderBottomWidth: 1,
			borderBottomColor: isDark ? Colors.gray[700] : Colors.gray[200],
		},
		infoLabel: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
		},
		infoValue: {
			fontSize: Typography.fontSize.sm,
			fontWeight: Typography.fontWeight.medium,
			color: isDark ? Colors.gray[200] : Colors.gray[800],
		},
	});

export default HelpSupportScreen;
