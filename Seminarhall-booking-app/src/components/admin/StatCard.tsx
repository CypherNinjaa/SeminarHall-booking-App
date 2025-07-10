import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon?: string;
	color?: string;
	onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
	title,
	value,
	subtitle,
	icon,
	color = Colors.primary[500],
	onPress,
}) => {
	const { isDark } = useTheme();

	const CardComponent = onPress ? TouchableOpacity : View;

	return (
		<CardComponent
			style={[styles.container, isDark && styles.containerDark]}
			onPress={onPress}
			activeOpacity={onPress ? 0.7 : 1}
		>
			<View style={styles.header}>
				{icon && (
					<View
						style={[styles.iconContainer, { backgroundColor: color + "20" }]}
					>
						<Ionicons name={icon as any} size={24} color={color} />
					</View>
				)}
				<Text style={[styles.title, isDark && styles.titleDark]}>{title}</Text>
			</View>
			<Text style={[styles.value, isDark && styles.valueDark]}>{value}</Text>
			{subtitle && (
				<Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
					{subtitle}
				</Text>
			)}
		</CardComponent>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: Colors.background.secondary,
		borderRadius: BorderRadius.lg,
		padding: Spacing[4],
		...Shadows.sm,
	},
	containerDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing[3],
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	title: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		fontWeight: Typography.fontWeight.medium,
		flex: 1,
	},
	titleDark: {
		color: Colors.dark.text.secondary,
	},
	value: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		marginBottom: Spacing[1],
	},
	valueDark: {
		color: Colors.dark.text.primary,
	},
	subtitle: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
	},
	subtitleDark: {
		color: Colors.dark.text.secondary,
	},
});
