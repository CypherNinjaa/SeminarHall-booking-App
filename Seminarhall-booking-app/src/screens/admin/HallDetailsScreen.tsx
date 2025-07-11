import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	Image,
	Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

import {
	Colors,
	Typography,
	Spacing,
	BorderRadius,
	Shadows,
} from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
	hallManagementService,
	Hall,
} from "../../services/hallManagementService";

const { width: screenWidth } = Dimensions.get("window");

interface HallDetailsScreenProps {
	navigation: StackNavigationProp<RootStackParamList, "HallDetails">;
	route: RouteProp<RootStackParamList, "HallDetails">;
}

export default function HallDetailsScreen({
	navigation,
	route,
}: HallDetailsScreenProps) {
	const { isDark } = useTheme();
	const { hallId, hall: initialHall } = route.params;
	const [hall, setHall] = useState<Hall | null>(initialHall || null);
	const [isLoading, setIsLoading] = useState(!initialHall);

	useEffect(() => {
		if (!initialHall && hallId) {
			loadHallDetails();
		}
	}, [hallId]);

	const loadHallDetails = async () => {
		try {
			setIsLoading(true);
			const hallData = await hallManagementService.getHallById(hallId);
			setHall(hallData);
		} catch (error) {
			console.error("Error loading hall details:", error);
			Alert.alert("Error", "Failed to load hall details");
		} finally {
			setIsLoading(false);
		}
	};

	const handleEdit = () => {
		navigation.navigate("AddEditHall", { hallId: hall?.id, hall });
	};

	const handleToggleStatus = async () => {
		if (!hall) return;

		Alert.alert(
			hall.is_active ? "Deactivate Hall" : "Activate Hall",
			`Are you sure you want to ${hall.is_active ? "deactivate" : "activate"} ${
				hall.name
			}?`,
			[
				{ text: "Cancel" },
				{
					text: "Confirm",
					onPress: async () => {
						try {
							const updatedHall = await hallManagementService.toggleHallStatus(
								hall.id
							);
							setHall(updatedHall);
							Alert.alert(
								"Success",
								`${hall.name} has been ${
									hall.is_active ? "deactivated" : "activated"
								}`
							);
						} catch (error) {
							console.error("Error toggling hall status:", error);
							Alert.alert(
								"Error",
								"Failed to update hall status. Please try again."
							);
						}
					},
				},
			]
		);
	};

	const handleDelete = () => {
		if (!hall) return;

		Alert.alert(
			"Delete Hall",
			`Are you sure you want to delete ${hall.name}? This action cannot be undone.`,
			[
				{ text: "Cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await hallManagementService.deleteHall(hall.id);
							Alert.alert("Success", "Hall deleted successfully", [
								{
									text: "OK",
									onPress: () => navigation.goBack(),
								},
							]);
						} catch (error) {
							console.error("Error deleting hall:", error);
							Alert.alert("Error", "Failed to delete hall. Please try again.");
						}
					},
				},
			]
		);
	};

	if (isLoading) {
		return (
			<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
				<StatusBar style={isDark ? "light" : "dark"} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary[500]} />
					<Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
						Loading hall details...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!hall) {
		return (
			<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
				<StatusBar style={isDark ? "light" : "dark"} />
				<View style={styles.errorContainer}>
					<Ionicons
						name="alert-circle-outline"
						size={64}
						color={isDark ? Colors.dark.text.tertiary : Colors.gray[400]}
					/>
					<Text style={[styles.errorText, isDark && styles.errorTextDark]}>
						Hall not found
					</Text>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => navigation.goBack()}
					>
						<Text style={styles.backButtonText}>Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	const getStatusColor = (isActive: boolean) => {
		return isActive ? Colors.success.main : Colors.error.main;
	};

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Header */}
			<View style={[styles.header, isDark && styles.headerDark]}>
				<TouchableOpacity
					style={styles.headerButton}
					onPress={() => navigation.goBack()}
					activeOpacity={0.7}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color={isDark ? Colors.dark.text.primary : Colors.text.primary}
					/>
				</TouchableOpacity>
				<Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
					Hall Details
				</Text>
				<TouchableOpacity
					style={styles.headerButton}
					onPress={handleEdit}
					activeOpacity={0.7}
				>
					<Ionicons
						name="pencil"
						size={24}
						color={isDark ? Colors.dark.text.primary : Colors.text.primary}
					/>
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Hall Images */}
				{hall.images && hall.images.length > 0 ? (
					<View style={styles.imageContainer}>
						<Image
							source={{ uri: hall.images[0] }}
							style={styles.mainImage}
							resizeMode="cover"
						/>
					</View>
				) : (
					<View
						style={[
							styles.imagePlaceholder,
							isDark && styles.imagePlaceholderDark,
						]}
					>
						<Ionicons
							name="business-outline"
							size={80}
							color={isDark ? Colors.dark.text.tertiary : Colors.gray[400]}
						/>
					</View>
				)}

				{/* Status Badge */}
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: getStatusColor(hall.is_active) },
					]}
				>
					<Text style={styles.statusText}>
						{hall.is_active ? "ACTIVE" : "INACTIVE"}
					</Text>
				</View>

				{/* Hall Info */}
				<View style={[styles.infoSection, isDark && styles.infoSectionDark]}>
					<Text style={[styles.hallName, isDark && styles.hallNameDark]}>
						{hall.name}
					</Text>

					{hall.description && (
						<Text
							style={[
								styles.hallDescription,
								isDark && styles.hallDescriptionDark,
							]}
						>
							{hall.description}
						</Text>
					)}

					{/* Basic Info */}
					<View style={styles.basicInfo}>
						<View style={styles.infoRow}>
							<Ionicons
								name="people-outline"
								size={20}
								color={isDark ? Colors.dark.text.secondary : Colors.gray[500]}
							/>
							<Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
								Capacity:
							</Text>
							<Text style={[styles.infoValue, isDark && styles.infoValueDark]}>
								{hall.capacity} people
							</Text>
						</View>

						<View style={styles.infoRow}>
							<Ionicons
								name="location-outline"
								size={20}
								color={isDark ? Colors.dark.text.secondary : Colors.gray[500]}
							/>
							<Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
								Location:
							</Text>
							<Text style={[styles.infoValue, isDark && styles.infoValueDark]}>
								{hall.location || "Not specified"}
							</Text>
						</View>

						{hall.building && (
							<View style={styles.infoRow}>
								<Ionicons
									name="business-outline"
									size={20}
									color={isDark ? Colors.dark.text.secondary : Colors.gray[500]}
								/>
								<Text
									style={[styles.infoLabel, isDark && styles.infoLabelDark]}
								>
									Building:
								</Text>
								<Text
									style={[styles.infoValue, isDark && styles.infoValueDark]}
								>
									{hall.building}
								</Text>
							</View>
						)}

						{hall.floor_number && (
							<View style={styles.infoRow}>
								<Ionicons
									name="layers-outline"
									size={20}
									color={isDark ? Colors.dark.text.secondary : Colors.gray[500]}
								/>
								<Text
									style={[styles.infoLabel, isDark && styles.infoLabelDark]}
								>
									Floor:
								</Text>
								<Text
									style={[styles.infoValue, isDark && styles.infoValueDark]}
								>
									{hall.floor_number}
								</Text>
							</View>
						)}
					</View>

					{/* Equipment */}
					{hall.equipment && hall.equipment.length > 0 && (
						<View style={styles.section}>
							<Text
								style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
							>
								Available Equipment
							</Text>
							<View style={styles.equipmentGrid}>
								{hall.equipment.map((item, index) => (
									<View key={index} style={styles.equipmentTag}>
										<Text style={styles.equipmentText}>{item}</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Amenities */}
					{hall.amenities && hall.amenities.length > 0 && (
						<View style={styles.section}>
							<Text
								style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
							>
								Amenities
							</Text>
							<View style={styles.equipmentGrid}>
								{hall.amenities.map((item, index) => (
									<View key={index} style={styles.amenityTag}>
										<Text style={styles.amenityText}>{item}</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Maintenance Info */}
					{hall.is_maintenance && (
						<View style={styles.section}>
							<Text
								style={[
									styles.sectionTitle,
									isDark && styles.sectionTitleDark,
									{ color: Colors.warning.main },
								]}
							>
								⚠️ Under Maintenance
							</Text>
							{hall.maintenance_notes && (
								<Text
									style={[
										styles.maintenanceNotes,
										isDark && styles.maintenanceNotesDark,
									]}
								>
									{hall.maintenance_notes}
								</Text>
							)}
						</View>
					)}
				</View>

				{/* Basic Information Section */}
				<View style={[styles.infoSection, isDark && styles.infoSectionDark]}>
					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
							Capacity
						</Text>
						<Text style={[styles.infoValue, isDark && styles.infoValueDark]}>
							{hall.capacity} people
						</Text>
					</View>

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
							Location
						</Text>
						<Text style={[styles.infoValue, isDark && styles.infoValueDark]}>
							{hall.location}
						</Text>
					</View>

					{hall.building && (
						<View style={styles.infoRow}>
							<Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
								Building
							</Text>
							<Text style={[styles.infoValue, isDark && styles.infoValueDark]}>
								{hall.building}
							</Text>
						</View>
					)}

					{hall.floor_number && (
						<View style={styles.infoRow}>
							<Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
								Floor
							</Text>
							<Text style={[styles.infoValue, isDark && styles.infoValueDark]}>
								{hall.floor_number}
							</Text>
						</View>
					)}

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
							Status
						</Text>
						<View style={styles.statusContainer}>
							<View
								style={[
									styles.statusBadge,
									{ backgroundColor: getStatusColor(hall.is_active) },
								]}
							>
								<Text style={styles.statusText}>
									{hall.is_active ? "Active" : "Inactive"}
								</Text>
							</View>
							{hall.is_maintenance && (
								<View style={[styles.statusBadge, styles.maintenanceBadge]}>
									<Text style={styles.statusText}>Maintenance</Text>
								</View>
							)}
						</View>
					</View>

					{hall.description && (
						<View style={styles.descriptionContainer}>
							<Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
								Description
							</Text>
							<Text
								style={[styles.descriptionText, isDark && styles.infoValueDark]}
							>
								{hall.description}
							</Text>
						</View>
					)}
				</View>

				{/* Equipment Section */}
				{hall.equipment && hall.equipment.length > 0 && (
					<View style={[styles.infoSection, isDark && styles.infoSectionDark]}>
						<Text
							style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
						>
							Available Equipment
						</Text>
						<View style={styles.tagContainer}>
							{hall.equipment.map((item, index) => (
								<View key={index} style={styles.tag}>
									<Text style={styles.tagText}>{item}</Text>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Amenities Section */}
				{hall.amenities && hall.amenities.length > 0 && (
					<View style={[styles.infoSection, isDark && styles.infoSectionDark]}>
						<Text
							style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
						>
							Available Amenities
						</Text>
						<View style={styles.tagContainer}>
							{hall.amenities.map((item, index) => (
								<View key={index} style={styles.tag}>
									<Text style={styles.tagText}>{item}</Text>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Maintenance Notes */}
				{hall.is_maintenance && hall.maintenance_notes && (
					<View style={[styles.infoSection, isDark && styles.infoSectionDark]}>
						<Text
							style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
						>
							Maintenance Notes
						</Text>
						<Text style={[styles.infoValue, isDark && styles.infoValueDark]}>
							{hall.maintenance_notes}
						</Text>
					</View>
				)}

				{/* Bottom spacing for floating buttons */}
				<View style={styles.bottomSpacing} />
			</ScrollView>

			{/* Fixed Bottom Action Buttons */}
			<View
				style={[
					styles.bottomButtonContainer,
					isDark && styles.bottomButtonContainerDark,
				]}
			>
				<TouchableOpacity
					style={[styles.bottomActionButton, styles.editBottomButton]}
					onPress={handleEdit}
					activeOpacity={0.8}
				>
					<Ionicons name="pencil" size={20} color="white" />
					<Text style={styles.bottomActionButtonText}>Edit</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.bottomActionButton,
						hall.is_active
							? styles.deactivateBottomButton
							: styles.activateBottomButton,
					]}
					onPress={handleToggleStatus}
					activeOpacity={0.8}
				>
					<Ionicons
						name={hall.is_active ? "pause" : "play"}
						size={20}
						color="white"
					/>
					<Text style={styles.bottomActionButtonText}>
						{hall.is_active ? "Deactivate" : "Activate"}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.bottomActionButton, styles.deleteBottomButton]}
					onPress={handleDelete}
					activeOpacity={0.8}
				>
					<Ionicons name="trash" size={20} color="white" />
					<Text style={styles.bottomActionButtonText}>Delete</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background.secondary,
	},
	containerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[4],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
		backgroundColor: "white",
	},
	headerDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderBottomColor: Colors.dark.border.light,
	},
	headerButton: {
		padding: Spacing[2],
		justifyContent: "center",
		alignItems: "center",
		marginHorizontal: Spacing[1],
		borderRadius: BorderRadius.md,
		backgroundColor: "transparent",
	},
	headerTitle: {
		flex: 1,
		fontSize: Typography.fontSize.xl,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		textAlign: "center",
	},
	headerTitleDark: {
		color: Colors.dark.text.primary,
	},
	content: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
	},
	loadingTextDark: {
		color: Colors.dark.text.secondary,
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: Spacing[6],
	},
	errorText: {
		fontSize: Typography.fontSize.lg,
		color: Colors.text.secondary,
		marginTop: Spacing[4],
		marginBottom: Spacing[6],
		textAlign: "center",
	},
	errorTextDark: {
		color: Colors.dark.text.secondary,
	},
	backButton: {
		paddingVertical: Spacing[3],
		paddingHorizontal: Spacing[6],
		backgroundColor: Colors.primary[500],
		borderRadius: BorderRadius.md,
	},
	backButtonText: {
		color: "white",
		fontWeight: Typography.fontWeight.medium,
	},
	imageContainer: {
		position: "relative",
	},
	mainImage: {
		width: screenWidth,
		height: 250,
	},
	imagePlaceholder: {
		width: screenWidth,
		height: 250,
		backgroundColor: Colors.gray[100],
		justifyContent: "center",
		alignItems: "center",
	},
	imagePlaceholderDark: {
		backgroundColor: Colors.dark.background.tertiary,
	},
	statusBadge: {
		position: "absolute",
		top: 270,
		right: Spacing[5],
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: BorderRadius.md,
		...Shadows.sm,
	},
	statusText: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.bold,
		color: "white",
	},
	infoSection: {
		backgroundColor: "white",
		marginTop: Spacing[6],
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[6],
	},
	infoSectionDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	hallName: {
		fontSize: Typography.fontSize["2xl"],
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		marginBottom: Spacing[3],
	},
	hallNameDark: {
		color: Colors.dark.text.primary,
	},
	hallDescription: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		lineHeight: 24,
		marginBottom: Spacing[5],
	},
	hallDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	basicInfo: {
		marginBottom: Spacing[5],
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing[3],
	},
	infoLabel: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		marginLeft: Spacing[3],
		marginRight: Spacing[2],
		minWidth: 80,
	},
	infoLabelDark: {
		color: Colors.dark.text.secondary,
	},
	infoValue: {
		flex: 1,
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
		fontWeight: Typography.fontWeight.medium,
	},
	infoValueDark: {
		color: Colors.dark.text.primary,
	},
	section: {
		marginBottom: Spacing[5],
	},
	sectionTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		marginBottom: Spacing[3],
	},
	sectionTitleDark: {
		color: Colors.dark.text.primary,
	},
	equipmentGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	equipmentTag: {
		backgroundColor: Colors.primary[100],
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: BorderRadius.md,
		marginRight: Spacing[2],
		marginBottom: Spacing[2],
	},
	equipmentText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.primary[700],
		fontWeight: Typography.fontWeight.medium,
	},
	amenityTag: {
		backgroundColor: Colors.success.light,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: BorderRadius.md,
		marginRight: Spacing[2],
		marginBottom: Spacing[2],
	},
	amenityText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.success.dark,
		fontWeight: Typography.fontWeight.medium,
	},
	maintenanceNotes: {
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
		fontStyle: "italic",
		marginTop: Spacing[2],
		padding: Spacing[3],
		backgroundColor: Colors.warning.light,
		borderRadius: BorderRadius.md,
	},
	maintenanceNotesDark: {
		color: Colors.dark.text.secondary,
		backgroundColor: Colors.warning.dark,
	},
	actionsSection: {
		backgroundColor: "white",
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[6],
		marginTop: Spacing[1],
	},
	actionsSectionDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing[4],
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing[3],
		...Shadows.sm,
	},
	editActionButton: {
		backgroundColor: Colors.primary[500],
	},
	activateActionButton: {
		backgroundColor: Colors.success.main,
	},
	deactivateActionButton: {
		backgroundColor: Colors.warning.main,
	},
	deleteActionButton: {
		backgroundColor: Colors.error.main,
	},
	actionButtonText: {
		color: "white",
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.bold,
		marginLeft: Spacing[2],
	},
	bottomSpacing: {
		height: Spacing[6],
	},
	// New bottom button styles
	bottomButtonContainer: {
		flexDirection: "row",
		backgroundColor: "white",
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		borderTopWidth: 1,
		borderTopColor: Colors.gray[200],
		...Shadows.lg,
	},
	bottomButtonContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderTopColor: Colors.dark.border.main,
	},
	bottomActionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing[3],
		paddingHorizontal: Spacing[3],
		borderRadius: BorderRadius.md,
		marginHorizontal: Spacing[1],
		...Shadows.sm,
	},
	editBottomButton: {
		backgroundColor: Colors.primary[500],
	},
	activateBottomButton: {
		backgroundColor: Colors.success.main,
	},
	deactivateBottomButton: {
		backgroundColor: Colors.warning.main,
	},
	deleteBottomButton: {
		backgroundColor: Colors.error.main,
	},
	bottomActionButtonText: {
		color: "white",
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.semibold,
		marginLeft: Spacing[1],
	},
	// Missing styles from content
	statusContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	maintenanceBadge: {
		backgroundColor: Colors.warning.main,
		marginLeft: Spacing[2],
	},
	descriptionContainer: {
		marginTop: Spacing[3],
	},
	descriptionText: {
		fontSize: Typography.fontSize.base,
		lineHeight: 24,
		marginTop: Spacing[2],
	},
	tagContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginTop: Spacing[3],
	},
	tag: {
		backgroundColor: Colors.primary[100],
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[1],
		borderRadius: BorderRadius.md,
		margin: Spacing[1],
	},
	tagText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.primary[700],
		fontWeight: Typography.fontWeight.medium,
	},
});
