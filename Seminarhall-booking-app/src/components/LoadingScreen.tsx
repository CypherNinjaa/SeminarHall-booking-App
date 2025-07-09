import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Typography, Spacing } from "../constants/theme";

export default function LoadingScreen() {
	return (
		<View style={styles.container}>
			<LinearGradient
				colors={["#1e40af", "#3b82f6", "#60a5fa"]}
				style={styles.backgroundGradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			/>

			<View style={styles.content}>
				<Text style={styles.title}>Amity University Patna</Text>
				<Text style={styles.subtitle}>Seminar Hall Booking</Text>

				<ActivityIndicator size="large" color="white" style={styles.loader} />

				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	backgroundGradient: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
	},
	content: {
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: "white",
		textAlign: "center",
		marginBottom: Spacing[2],
	},
	subtitle: {
		fontSize: Typography.fontSize.lg,
		color: "rgba(255, 255, 255, 0.8)",
		textAlign: "center",
		marginBottom: Spacing[8],
	},
	loader: {
		marginBottom: Spacing[4],
	},
	loadingText: {
		fontSize: Typography.fontSize.base,
		color: "rgba(255, 255, 255, 0.8)",
		textAlign: "center",
	},
});
