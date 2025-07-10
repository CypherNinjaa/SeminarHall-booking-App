import React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Activity {
	id: string;
	type: "booking" | "hall" | "conflict" | "maintenance" | "user";
	title: string;
	description: string;
	timestamp: string;
	user?: string;
	status?: "pending" | "approved" | "rejected" | "completed";
}

interface ActivityFeedProps {
	activities: Activity[];
	onActivityPress?: (activity: Activity) => void;
	maxItems?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
	activities,
	onActivityPress,
	maxItems = 10,
}) => {
	const { isDark } = useTheme();

	const getActivityIcon = (type: Activity["type"]) => {
		switch (type) {
			case "booking":
				return "calendar-outline";
			case "hall":
				return "business-outline";
			case "conflict":
				return "warning-outline";
			case "maintenance":
				return "construct-outline";
			case "user":
				return "person-outline";
			default:
				return "information-circle-outline";
		}
	};

	const getActivityColor = (type: Activity["type"]) => {
		switch (type) {
			case "booking":
				return Colors.primary[500];
			case "hall":
				return Colors.success.main;
			case "conflict":
				return Colors.warning.main;
			case "maintenance":
				return Colors.error.main;
			case "user":
				return Colors.gray[600];
			default:
				return Colors.gray[500];
		}
	};

	const getStatusColor = (status?: Activity["status"]) => {
		switch (status) {
			case "pending":
				return Colors.warning.main;
			case "approved":
				return Colors.success.main;
			case "rejected":
				return Colors.error.main;
			case "completed":
				return Colors.success.main;
			default:
				return Colors.gray[500];
		}
	};

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInMinutes = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60)
		);

		if (diffInMinutes < 1) return "Just now";
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
		return `${Math.floor(diffInMinutes / 1440)}d ago`;
	};

	const renderActivityItem = ({ item }: { item: Activity }) => (
		<TouchableOpacity
			style={[styles.activityItem, isDark && styles.activityItemDark]}
			onPress={() => onActivityPress?.(item)}
			activeOpacity={0.7}
		>
			<View
				style={[
					styles.activityIcon,
					{ backgroundColor: getActivityColor(item.type) + "20" },
				]}
			>
				<Ionicons
					name={getActivityIcon(item.type) as any}
					size={20}
					color={getActivityColor(item.type)}
				/>
			</View>

			<View style={styles.activityContent}>
				<View style={styles.activityHeader}>
					<Text
						style={[styles.activityTitle, isDark && styles.activityTitleDark]}
						numberOfLines={1}
					>
						{item.title}
					</Text>
					{item.status && (
						<View
							style={[
								styles.statusBadge,
								{ backgroundColor: getStatusColor(item.status) },
							]}
						>
							<Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
						</View>
					)}
				</View>

				<Text
					style={[
						styles.activityDescription,
						isDark && styles.activityDescriptionDark,
					]}
					numberOfLines={2}
				>
					{item.description}
				</Text>

				<View style={styles.activityMeta}>
					{item.user && (
						<Text
							style={[styles.activityUser, isDark && styles.activityUserDark]}
						>
							by {item.user}
						</Text>
					)}
					<Text
						style={[styles.activityTime, isDark && styles.activityTimeDark]}
					>
						{formatTimestamp(item.timestamp)}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	);

	const displayActivities = activities.slice(0, maxItems);

	return (
		<View style={[styles.container, isDark && styles.containerDark]}>
			<View style={styles.header}>
				<Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
					Recent Activity
				</Text>
				{activities.length > maxItems && (
					<TouchableOpacity>
						<Text style={[styles.viewAllText, { color: Colors.primary[500] }]}>
							View All
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{displayActivities.length > 0 ? (
				<FlatList
					data={displayActivities}
					renderItem={renderActivityItem}
					keyExtractor={(item) => item.id}
					showsVerticalScrollIndicator={false}
					style={styles.list}
				/>
			) : (
				<View style={styles.emptyContainer}>
					<Ionicons
						name="time-outline"
						size={48}
						color={isDark ? Colors.dark.text.secondary : Colors.text.secondary}
					/>
					<Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
						No recent activity
					</Text>
				</View>
			)}
		</View>
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
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing[4],
	},
	headerTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.text.primary,
	},
	headerTitleDark: {
		color: Colors.dark.text.primary,
	},
	viewAllText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
	},
	list: {
		maxHeight: 300,
	},
	activityItem: {
		flexDirection: "row",
		paddingVertical: Spacing[3],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
	},
	activityItemDark: {
		borderBottomColor: Colors.dark.border.light,
	},
	activityIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[3],
	},
	activityContent: {
		flex: 1,
	},
	activityHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing[1],
	},
	activityTitle: {
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.primary,
		flex: 1,
		marginRight: Spacing[2],
	},
	activityTitleDark: {
		color: Colors.dark.text.primary,
	},
	statusBadge: {
		paddingHorizontal: Spacing[2],
		paddingVertical: Spacing[1],
		borderRadius: BorderRadius.sm,
	},
	statusText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.inverse,
		fontWeight: Typography.fontWeight.semibold,
	},
	activityDescription: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[2],
		lineHeight: Typography.fontSize.sm * 1.4,
	},
	activityDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	activityMeta: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	activityUser: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
		fontStyle: "italic",
	},
	activityUserDark: {
		color: Colors.dark.text.secondary,
	},
	activityTime: {
		fontSize: Typography.fontSize.xs,
		color: Colors.text.secondary,
	},
	activityTimeDark: {
		color: Colors.dark.text.secondary,
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing[8],
	},
	emptyText: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		marginTop: Spacing[3],
	},
	emptyTextDark: {
		color: Colors.dark.text.secondary,
	},
});
