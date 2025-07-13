import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	FlatList,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	Alert,
	RefreshControl,
	Dimensions,
	Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

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
	Hall as ServiceHall,
} from "../../services/hallManagementService";

const { width: screenWidth } = Dimensions.get("window");

// Use the Hall type from the service
type Hall = ServiceHall;

interface HallFilters {
	search: string;
	capacity_min?: number;
	capacity_max?: number;
	is_active?: boolean;
	has_equipment?: string[];
}

interface HallManagementScreenProps {
	navigation: StackNavigationProp<RootStackParamList>;
}

// Hall Card Component
const HallCard: React.FC<{
	hall: Hall;
	onEdit: (hall: Hall) => void;
	onToggleStatus: (hall: Hall) => void;
	onViewDetails: (hall: Hall) => void;
	onDelete: (hall: Hall) => void;
}> = ({ hall, onEdit, onToggleStatus, onViewDetails, onDelete }) => {
	const { isDark } = useTheme();

	const getStatusColor = (isActive: boolean) => {
		return isActive ? Colors.success.main : Colors.error.main;
	};

	const getCapacityIcon = (capacity: number) => {
		if (capacity <= 20) return "people-outline";
		if (capacity <= 50) return "people";
		return "business-outline";
	};

	return (
		<TouchableOpacity
			style={[styles.hallCard, isDark && styles.hallCardDark]}
			onPress={() => onViewDetails(hall)}
			activeOpacity={0.7}
		>
			{/* Hall Image */}
			<View style={styles.hallImageContainer}>
				{hall.images && hall.images.length > 0 ? (
					<Image
						source={{ uri: hall.images[0] }}
						style={styles.hallImage}
						resizeMode="cover"
					/>
				) : (
					<View
						style={[
							styles.hallImagePlaceholder,
							isDark && styles.hallImagePlaceholderDark,
						]}
					>
						<Ionicons
							name="business-outline"
							size={40}
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
			</View>

			{/* Hall Details */}
			<View style={styles.hallContent}>
				<View style={styles.hallHeader}>
					<Text style={[styles.hallName, isDark && styles.hallNameDark]}>
						{hall.name}
					</Text>
					<View style={styles.hallActions}>
						<TouchableOpacity
							style={[styles.actionButton, styles.editButton]}
							onPress={() => onEdit(hall)}
							accessibilityLabel={`Edit ${hall.name}`}
							accessibilityHint="Edit hall details"
						>
							<Ionicons name="pencil" size={16} color={Colors.primary[600]} />
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.actionButton,
								hall.is_active
									? styles.deactivateButton
									: styles.activateButton,
							]}
							onPress={() => onToggleStatus(hall)}
							accessibilityLabel={`${
								hall.is_active ? "Deactivate" : "Activate"
							} ${hall.name}`}
							accessibilityHint={`${
								hall.is_active ? "Deactivate" : "Activate"
							} this hall`}
						>
							<Ionicons
								name={hall.is_active ? "pause" : "play"}
								size={16}
								color={
									hall.is_active ? Colors.warning.main : Colors.success.main
								}
							/>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.actionButton, styles.deleteButton]}
							onPress={() => onDelete(hall)}
							accessibilityLabel={`Delete ${hall.name}`}
							accessibilityHint="Delete this hall permanently"
						>
							<Ionicons
								name="trash-outline"
								size={16}
								color={Colors.error.main}
							/>
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.hallMeta}>
					<View style={styles.metaItem}>
						<Ionicons
							name="location-outline"
							size={14}
							color={isDark ? Colors.dark.text.secondary : Colors.gray[500]}
						/>
						<Text style={[styles.metaText, isDark && styles.metaTextDark]}>
							{hall.location}
						</Text>
					</View>
					<View style={styles.metaItem}>
						<Ionicons
							name={getCapacityIcon(hall.capacity)}
							size={14}
							color={isDark ? Colors.dark.text.secondary : Colors.gray[500]}
						/>
						<Text style={[styles.metaText, isDark && styles.metaTextDark]}>
							{hall.capacity} people
						</Text>
					</View>
				</View>

				{hall.description && (
					<Text
						style={[
							styles.hallDescription,
							isDark && styles.hallDescriptionDark,
						]}
						numberOfLines={2}
					>
						{hall.description}
					</Text>
				)}

				{/* Equipment Tags */}
				{hall.equipment && hall.equipment.length > 0 && (
					<View style={styles.equipmentContainer}>
						{hall.equipment.slice(0, 3).map((item, index) => (
							<View key={index} style={styles.equipmentTag}>
								<Text style={styles.equipmentText}>{item}</Text>
							</View>
						))}
						{hall.equipment.length > 3 && (
							<View style={styles.equipmentTag}>
								<Text style={styles.equipmentText}>
									+{hall.equipment.length - 3} more
								</Text>
							</View>
						)}
					</View>
				)}
			</View>
		</TouchableOpacity>
	);
};

// Filter Component
const HallFilters: React.FC<{
	filters: HallFilters;
	onFiltersChange: (filters: HallFilters) => void;
	onClear: () => void;
}> = ({ filters, onFiltersChange, onClear }) => {
	const { isDark } = useTheme();
	const [showAdvanced, setShowAdvanced] = useState(false);

	return (
		<View
			style={[styles.filtersContainer, isDark && styles.filtersContainerDark]}
		>
			{/* Search Bar */}
			<View style={[styles.searchBar, isDark && styles.searchBarDark]}>
				<Ionicons
					name="search"
					size={20}
					color={isDark ? Colors.dark.text.secondary : Colors.gray[400]}
				/>
				<TextInput
					style={[styles.searchInput, isDark && styles.searchInputDark]}
					value={filters.search}
					onChangeText={(text) => onFiltersChange({ ...filters, search: text })}
					placeholder="Search halls by name or location..."
					placeholderTextColor={
						isDark ? Colors.dark.text.tertiary : Colors.gray[400]
					}
				/>
				{filters.search.length > 0 && (
					<TouchableOpacity
						onPress={() => onFiltersChange({ ...filters, search: "" })}
					>
						<Ionicons
							name="close-circle"
							size={20}
							color={isDark ? Colors.dark.text.secondary : Colors.gray[400]}
						/>
					</TouchableOpacity>
				)}
			</View>

			{/* Filter Toggles */}
			<View style={styles.filterToggles}>
				<TouchableOpacity
					style={[
						styles.filterToggle,
						filters.is_active === true && styles.filterToggleActive,
						isDark && styles.filterToggleDark,
					]}
					onPress={() =>
						onFiltersChange({
							...filters,
							is_active: filters.is_active === true ? undefined : true,
						})
					}
				>
					<Text
						style={[
							styles.filterToggleText,
							filters.is_active === true && styles.filterToggleTextActive,
							isDark && styles.filterToggleTextDark,
						]}
					>
						Active Only
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.filterToggle,
						showAdvanced && styles.filterToggleActive,
						isDark && styles.filterToggleDark,
					]}
					onPress={() => setShowAdvanced(!showAdvanced)}
				>
					<Text
						style={[
							styles.filterToggleText,
							showAdvanced && styles.filterToggleTextActive,
							isDark && styles.filterToggleTextDark,
						]}
					>
						Advanced
					</Text>
					<Ionicons
						name={showAdvanced ? "chevron-up" : "chevron-down"}
						size={16}
						color={
							showAdvanced
								? "white"
								: isDark
								? Colors.dark.text.secondary
								: Colors.gray[600]
						}
					/>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.clearButton, isDark && styles.clearButtonDark]}
					onPress={onClear}
				>
					<Text
						style={[
							styles.clearButtonText,
							isDark && styles.clearButtonTextDark,
						]}
					>
						Clear
					</Text>
				</TouchableOpacity>
			</View>

			{/* Advanced Filters */}
			{showAdvanced && (
				<View style={styles.advancedFilters}>
					<View style={styles.capacityFilters}>
						<Text
							style={[styles.filterLabel, isDark && styles.filterLabelDark]}
						>
							Capacity Range
						</Text>
						<View style={styles.capacityInputs}>
							<TextInput
								style={[
									styles.capacityInput,
									isDark && styles.capacityInputDark,
								]}
								value={filters.capacity_min?.toString() || ""}
								onChangeText={(text) =>
									onFiltersChange({
										...filters,
										capacity_min: text ? parseInt(text) : undefined,
									})
								}
								placeholder="Min"
								placeholderTextColor={
									isDark ? Colors.dark.text.tertiary : Colors.gray[400]
								}
								keyboardType="numeric"
							/>
							<Text
								style={[styles.capacityDash, isDark && styles.capacityDashDark]}
							>
								-
							</Text>
							<TextInput
								style={[
									styles.capacityInput,
									isDark && styles.capacityInputDark,
								]}
								value={filters.capacity_max?.toString() || ""}
								onChangeText={(text) =>
									onFiltersChange({
										...filters,
										capacity_max: text ? parseInt(text) : undefined,
									})
								}
								placeholder="Max"
								placeholderTextColor={
									isDark ? Colors.dark.text.tertiary : Colors.gray[400]
								}
								keyboardType="numeric"
							/>
						</View>
					</View>
				</View>
			)}
		</View>
	);
};

// Main Hall Management Screen
export default function HallManagementScreen({
	navigation,
}: HallManagementScreenProps) {
	const { isDark } = useTheme();
	const [halls, setHalls] = useState<Hall[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [filters, setFilters] = useState<HallFilters>({
		search: "",
	});

	// Load halls data
	const loadHalls = useCallback(async () => {
		try {
			setIsLoading(true);

			// Use real service call
			const hallsData = await hallManagementService.getAllHalls(filters);
			setHalls(hallsData);

			setIsLoading(false);
			setRefreshing(false);
		} catch (error) {
			console.error("Error loading halls:", error);
			setIsLoading(false);
			setRefreshing(false);
		}
	}, [filters]);

	// Filter halls based on current filters
	const filteredHalls = halls.filter((hall) => {
		// Search filter
		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			const matchesSearch =
				hall.name.toLowerCase().includes(searchLower) ||
				hall.location?.toLowerCase().includes(searchLower) ||
				hall.description?.toLowerCase().includes(searchLower);
			if (!matchesSearch) return false;
		}

		// Active status filter
		if (
			filters.is_active !== undefined &&
			hall.is_active !== filters.is_active
		) {
			return false;
		}

		// Capacity filters
		if (filters.capacity_min && hall.capacity < filters.capacity_min) {
			return false;
		}
		if (filters.capacity_max && hall.capacity > filters.capacity_max) {
			return false;
		}

		return true;
	});

	// Load data when screen is focused
	useFocusEffect(
		useCallback(() => {
			loadHalls();
		}, [loadHalls])
	);

	// Handle refresh
	const handleRefresh = () => {
		setRefreshing(true);
		loadHalls();
	};

	// Handle hall actions
	const handleEditHall = (hall: Hall) => {
		navigation.navigate("AddEditHall", { hallId: hall.id, hall });
	};

	const handleToggleHallStatus = async (hall: Hall) => {
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
							// Use real service call to toggle hall status
							await hallManagementService.toggleHallStatus(hall.id);

							// Reload halls to get updated data
							loadHalls();

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

	const handleDeleteHall = async (hall: Hall) => {
		Alert.alert(
			"Delete Hall",
			`Are you sure you want to delete "${hall.name}"? This action cannot be undone.\n\nNote: Halls with active bookings cannot be deleted.`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							// Use real service call to delete hall
							await hallManagementService.deleteHall(hall.id);

							// Reload halls to get updated data
							loadHalls();

							Alert.alert(
								"Success",
								`${hall.name} has been deleted successfully.`
							);
						} catch (error) {
							console.error("Error deleting hall:", error);
							const errorMessage =
								error instanceof Error
									? error.message
									: "Unknown error occurred";

							Alert.alert(
								"Delete Failed",
								errorMessage.includes("active bookings")
									? "Cannot delete hall with active bookings. Please cancel or complete all future bookings first."
									: "Failed to delete hall. Please try again."
							);
						}
					},
				},
			]
		);
	};

	const handleViewHallDetails = (hall: Hall) => {
		navigation.navigate("HallDetails", { hallId: hall.id, hall });
	};

	const handleAddHall = () => {
		navigation.navigate("AddEditHall");
	};

	const handleClearFilters = () => {
		setFilters({ search: "" });
	};

	// Render empty state
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Ionicons
				name="business"
				size={48}
				color={isDark ? Colors.dark.text.tertiary : Colors.gray[300]}
			/>
			<Text
				style={[styles.emptyStateText, isDark && styles.emptyStateTextDark]}
			>
				{filters.search || filters.is_active !== undefined
					? "No halls match your filters"
					: "No halls found"}
			</Text>
			{(filters.search || filters.is_active !== undefined) && (
				<TouchableOpacity
					style={styles.clearFiltersButton}
					onPress={handleClearFilters}
				>
					<Text style={styles.clearFiltersText}>Clear Filters</Text>
				</TouchableOpacity>
			)}
		</View>
	);

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<StatusBar style={isDark ? "light" : "dark"} />

			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<TouchableOpacity
						style={styles.backButton}
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
						Hall Management
					</Text>
					<View style={styles.headerSpacer} />
				</View>
			</View>

			{/* Filters */}
			<HallFilters
				filters={filters}
				onFiltersChange={setFilters}
				onClear={handleClearFilters}
			/>

			{/* Hall List */}
			{isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary[500]} />
					<Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
						Loading halls...
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredHalls}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<HallCard
							hall={item}
							onEdit={handleEditHall}
							onToggleStatus={handleToggleHallStatus}
							onViewDetails={handleViewHallDetails}
							onDelete={handleDeleteHall}
						/>
					)}
					contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
					ListEmptyComponent={renderEmptyState}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handleRefresh}
							colors={[Colors.primary[500]]}
							tintColor={Colors.primary[500]}
						/>
					}
					showsVerticalScrollIndicator={false}
				/>
			)}

			{/* Floating Action Button */}
			<TouchableOpacity
				style={[styles.fabButton, isDark && styles.fabButtonDark]}
				onPress={handleAddHall}
				activeOpacity={0.8}
			>
				<Ionicons name="add" size={28} color="white" />
			</TouchableOpacity>
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
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[4],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
	},
	headerContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	backButton: {
		padding: Spacing[2],
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing[2],
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
	addButton: {
		padding: Spacing[2],
		justifyContent: "center",
		alignItems: "center",
		marginLeft: Spacing[2],
		borderRadius: BorderRadius.md,
		backgroundColor: Colors.primary[50],
	},
	headerSpacer: {
		width: 48, // Same width as back button to center title
	},
	// Floating Action Button styles
	fabButton: {
		position: "absolute",
		bottom: Spacing[6],
		right: Spacing[5],
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: Colors.primary[500],
		alignItems: "center",
		justifyContent: "center",
		...Shadows.lg,
		elevation: 8,
	},
	fabButtonDark: {
		backgroundColor: Colors.primary[600],
	},
	filtersContainer: {
		backgroundColor: "white",
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[4],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border.light,
	},
	filtersContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderBottomColor: Colors.dark.border.light,
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.background.tertiary,
		borderRadius: BorderRadius.lg,
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		marginBottom: Spacing[3],
	},
	searchBarDark: {
		backgroundColor: Colors.dark.background.tertiary,
	},
	searchInput: {
		flex: 1,
		marginLeft: Spacing[2],
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
	},
	searchInputDark: {
		color: Colors.dark.text.primary,
	},
	filterToggles: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
	},
	filterToggle: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: Spacing[2],
		paddingHorizontal: Spacing[3],
		borderRadius: BorderRadius.md,
		backgroundColor: Colors.gray[100],
		marginRight: Spacing[2],
		marginBottom: Spacing[2],
	},
	filterToggleDark: {
		backgroundColor: Colors.dark.background.tertiary,
	},
	filterToggleActive: {
		backgroundColor: Colors.primary[500],
	},
	filterToggleText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginRight: Spacing[1],
	},
	filterToggleTextDark: {
		color: Colors.dark.text.secondary,
	},
	filterToggleTextActive: {
		color: "white",
	},
	clearButton: {
		paddingVertical: Spacing[2],
		paddingHorizontal: Spacing[3],
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		borderColor: Colors.error.main,
	},
	clearButtonDark: {
		borderColor: Colors.error.light,
	},
	clearButtonText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.error.main,
	},
	clearButtonTextDark: {
		color: Colors.error.light,
	},
	advancedFilters: {
		marginTop: Spacing[3],
		paddingTop: Spacing[3],
		borderTopWidth: 1,
		borderTopColor: Colors.border.light,
	},
	capacityFilters: {
		marginBottom: Spacing[3],
	},
	filterLabel: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.text.secondary,
		marginBottom: Spacing[2],
	},
	filterLabelDark: {
		color: Colors.dark.text.secondary,
	},
	capacityInputs: {
		flexDirection: "row",
		alignItems: "center",
	},
	capacityInput: {
		flex: 1,
		backgroundColor: Colors.background.tertiary,
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[2],
		fontSize: Typography.fontSize.base,
		color: Colors.text.primary,
		textAlign: "center",
	},
	capacityInputDark: {
		backgroundColor: Colors.dark.background.tertiary,
		color: Colors.dark.text.primary,
	},
	capacityDash: {
		marginHorizontal: Spacing[3],
		fontSize: Typography.fontSize.base,
		color: Colors.text.secondary,
	},
	capacityDashDark: {
		color: Colors.dark.text.secondary,
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
	listContent: {
		padding: Spacing[5],
		paddingBottom: Spacing[8],
	},
	hallCard: {
		backgroundColor: "white",
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing[4],
		overflow: "hidden",
		...Shadows.sm,
	},
	hallCardDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderColor: Colors.dark.border.light,
		borderWidth: 1,
	},
	hallImageContainer: {
		position: "relative",
		height: 120,
	},
	hallImage: {
		width: "100%",
		height: "100%",
	},
	hallImagePlaceholder: {
		width: "100%",
		height: "100%",
		backgroundColor: Colors.gray[100],
		justifyContent: "center",
		alignItems: "center",
	},
	hallImagePlaceholderDark: {
		backgroundColor: Colors.dark.background.tertiary,
	},
	statusBadge: {
		position: "absolute",
		top: Spacing[3],
		right: Spacing[3],
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: BorderRadius.sm,
	},
	statusText: {
		fontSize: Typography.fontSize.xs,
		fontWeight: Typography.fontWeight.bold,
		color: "white",
	},
	hallContent: {
		padding: Spacing[4],
	},
	hallHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing[2],
	},
	hallName: {
		flex: 1,
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.bold,
		color: Colors.text.primary,
		marginRight: Spacing[3],
	},
	hallNameDark: {
		color: Colors.dark.text.primary,
	},
	hallActions: {
		flexDirection: "row",
	},
	actionButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: Spacing[2],
	},
	editButton: {
		backgroundColor: Colors.primary[100],
	},
	deleteButton: {
		backgroundColor: Colors.error.light,
	},
	activateButton: {
		backgroundColor: Colors.success.light,
	},
	deactivateButton: {
		backgroundColor: Colors.warning.light,
	},
	hallMeta: {
		flexDirection: "row",
		marginBottom: Spacing[3],
	},
	metaItem: {
		flexDirection: "row",
		alignItems: "center",
		marginRight: Spacing[4],
	},
	metaText: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginLeft: Spacing[1],
	},
	metaTextDark: {
		color: Colors.dark.text.secondary,
	},
	hallDescription: {
		fontSize: Typography.fontSize.sm,
		color: Colors.text.secondary,
		marginBottom: Spacing[3],
		lineHeight: 20,
	},
	hallDescriptionDark: {
		color: Colors.dark.text.secondary,
	},
	equipmentContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	equipmentTag: {
		backgroundColor: Colors.primary[100],
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: BorderRadius.sm,
		marginRight: Spacing[2],
		marginBottom: Spacing[1],
	},
	equipmentText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.primary[700],
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing[8],
	},
	emptyStateText: {
		fontSize: Typography.fontSize.lg,
		color: Colors.text.secondary,
		marginTop: Spacing[3],
		textAlign: "center",
	},
	emptyStateTextDark: {
		color: Colors.dark.text.secondary,
	},
	clearFiltersButton: {
		marginTop: Spacing[4],
		paddingVertical: Spacing[2],
		paddingHorizontal: Spacing[4],
		backgroundColor: Colors.primary[50],
		borderRadius: BorderRadius.md,
	},
	clearFiltersText: {
		color: Colors.primary[600],
		fontWeight: Typography.fontWeight.medium,
	},
});
