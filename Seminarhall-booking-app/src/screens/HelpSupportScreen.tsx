import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
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
				"Booking approvals typically take 24-48 hours during business days. For urgent bookings, you can contact the admin directly at vikashkelly@gmail.com.",
			category: "booking",
		},
		{
			id: "3",
			question: "Can I cancel my booking?",
			answer:
				"Yes, you can cancel pending or approved bookings that haven't started yet. Go to 'My Bookings' and click on the booking you want to cancel. Please note that cancellations should be made at least 2 hours before the scheduled time.",
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
				"To update your profile:\n1. Go to the Profile tab\n2. Click 'Edit Profile'\n3. Update your information\n4. Save changes\n\nFor email changes, you may need to verify the new email address.",
			category: "account",
		},
		{
			id: "6",
			question: "I forgot my password. How can I reset it?",
			answer:
				"To reset your password:\n1. Go to the login screen\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your email for reset instructions\n5. Follow the link to create a new password",
			category: "account",
		},
		{
			id: "9",
			question: "What are the booking guidelines?",
			answer:
				"Booking guidelines:\n• Book at least 24 hours in advance\n• Provide accurate attendee count\n• Specify all required equipment\n• Follow university policies\n• Cancel if unable to attend\n• Keep the hall clean and organized\n• Report any damages immediately",
			category: "general",
		},
	];

	const toggleFAQ = (faqId: string) => {
		setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
	};

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

			<ScrollView 
				style={styles.content} 
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ flexGrow: 1 }}
			>
				{/* Contact Information Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Get in Touch</Text>
					<Text style={styles.sectionDescription}>
						For any questions or support, please contact our developer directly
					</Text>
					<View style={styles.emailContactCard}>
						<View style={styles.emailIcon}>
							<Ionicons name="mail-outline" size={24} color="#FFFFFF" />
						</View>
						<View style={styles.emailInfo}>
							<Text style={styles.emailTitle}>Contact Developer</Text>
							<Text style={styles.emailAddress}>vikashkelly@gmail.com</Text>
							<Text style={styles.emailDescription}>
								Send an email for support, bug reports, or feature requests
							</Text>
						</View>
					</View>
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
							<Text style={styles.infoLabel}>Email System</Text>
							<Text style={[styles.infoValue, { color: Colors.success.main }]}>
								✅ Active & Integrated
							</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Developers</Text>
							<Text style={styles.infoValue}>Vikash Kumar{'\n'}Nikhil Anand</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Contact</Text>
							<Text
								style={[styles.infoValue, { color: Colors.primary[500] }]}
							>
								vikashkelly@gmail.com
							</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>University</Text>
							<Text style={styles.infoValue}>Amity University Patna</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Email API</Text>
							<Text style={[styles.infoValue, { color: Colors.primary[600] }]}>
								Vercel Production
							</Text>
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
			...(Platform.OS === 'web' && ({
				maxHeight: '80vh',
				overflow: 'auto',
			} as any)),
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
		emailContactCard: {
			backgroundColor: isDark ? Colors.gray[800] : Colors.background.primary,
			borderRadius: BorderRadius.lg,
			padding: Spacing[4],
			borderWidth: 1,
			borderColor: isDark ? Colors.gray[700] : Colors.gray[200],
			...Shadows.sm,
			flexDirection: "row",
			alignItems: "center",
		},
		emailIcon: {
			width: 48,
			height: 48,
			borderRadius: BorderRadius.full,
			backgroundColor: Colors.primary[600],
			justifyContent: "center",
			alignItems: "center",
			marginRight: Spacing[3],
		},
		emailInfo: {
			flex: 1,
		},
		emailTitle: {
			fontSize: Typography.fontSize.base,
			fontWeight: Typography.fontWeight.semibold,
			color: isDark ? Colors.gray[100] : Colors.gray[900],
			marginBottom: 4,
		},
		emailAddress: {
			fontSize: Typography.fontSize.lg,
			fontWeight: Typography.fontWeight.bold,
			color: Colors.primary[600],
			marginBottom: 4,
		},
		emailDescription: {
			fontSize: Typography.fontSize.sm,
			color: isDark ? Colors.gray[400] : Colors.gray[600],
			lineHeight: 18,
		},
	});

export default HelpSupportScreen;
