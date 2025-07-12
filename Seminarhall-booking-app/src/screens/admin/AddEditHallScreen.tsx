import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TextInput,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../stores/authStore";
import {
	hallManagementService,
	CreateHallData,
	UpdateHallData,
} from "../../services/hallManagementService";

const EQUIPMENT_OPTIONS = [
	"Projector",
	"Sound System",
	"Microphone",
	"Whiteboard",
	"Smart Board",
	"TV Display",
	"Computer",
	"Podium",
	"Laser Pointer",
	"Document Camera",
];
const AMENITY_OPTIONS = [
	"Air Conditioning",
	"WiFi",
	"Parking",
	"Elevator Access",
	"Wheelchair Access",
	"Natural Light",
	"Blackout Curtains",
	"Kitchen Access",
	"Storage Space",
	"Security System",
];

// TODO: Replace 'any' with proper navigation/route types
const AddEditHallScreen: React.FC<{ navigation: any; route: any }> = ({
	navigation,
	route,
}) => {
	const { isDark } = useTheme();
	const { user, isAuthenticated } = useAuthStore();
	const { hallId, hall } = route.params || {};
	const isEditing = !!hallId;

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [capacity, setCapacity] = useState("");
	const [location, setLocation] = useState("");
	const [floorNumber, setFloorNumber] = useState("");
	const [building, setBuilding] = useState("");
	const [equipment, setEquipment] = useState<string[]>([]);
	const [amenities, setAmenities] = useState<string[]>([]);
	const [isActive, setIsActive] = useState(true);
	const [isMaintenance, setIsMaintenance] = useState(false);
	const [maintenanceNotes, setMaintenanceNotes] = useState("");
	const [saving, setSaving] = useState(false);

	// Check authentication on component mount
	useEffect(() => {
		if (!isAuthenticated || !user) {
			Alert.alert(
				"Authentication Required",
				"Please log in to access this feature.",
				[{ text: "OK", onPress: () => navigation.goBack() }]
			);
			return;
		}

		// Check if user has admin privileges
		if (!["admin", "super_admin"].includes(user.role)) {
			Alert.alert(
				"Access Denied",
				"You don't have permission to manage halls.",
				[{ text: "OK", onPress: () => navigation.goBack() }]
			);
			return;
		}
	}, [isAuthenticated, user, navigation]);

	useEffect(() => {
		if (isEditing && hall) {
			setName(hall.name || "");
			setDescription(hall.description || "");
			setCapacity(hall.capacity?.toString() || "");
			setLocation(hall.location || "");
			setFloorNumber(hall.floor_number?.toString() || "");
			setBuilding(hall.building || "");
			setEquipment(hall.equipment || []);
			setAmenities(hall.amenities || []);
			setIsActive(hall.is_active ?? true);
			setIsMaintenance(hall.is_maintenance ?? false);
			setMaintenanceNotes(hall.maintenance_notes || "");
		}
	}, [isEditing, hall]);

	// Show loading or redirect if not authenticated
	if (!isAuthenticated || !user) {
		return (
			<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
				<View
					style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
				>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={{ marginTop: 16, color: isDark ? "#fff" : "#222" }}>
						Checking authentication...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	const toggleEquipment = (item: string) => {
		setEquipment((prev: string[]) =>
			prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
		);
	};
	const toggleAmenity = (item: string) => {
		setAmenities((prev: string[]) =>
			prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
		);
	};

	const handleSubmit = async () => {
		// Double-check authentication before submission
		if (!isAuthenticated || !user) {
			Alert.alert("Authentication Error", "Please log in again to continue.");
			return;
		}

		if (!["admin", "super_admin"].includes(user.role)) {
			Alert.alert(
				"Access Denied",
				"You don't have permission to perform this action."
			);
			return;
		}

		if (!name.trim() || !capacity.trim() || !location.trim()) {
			Alert.alert("Validation Error", "Please fill all required fields");
			return;
		}

		const capacityNum = parseInt(capacity);
		if (isNaN(capacityNum) || capacityNum < 1) {
			Alert.alert("Validation Error", "Please enter a valid capacity number");
			return;
		}

		setSaving(true);
		try {
			const hallData = {
				name: name.trim(),
				description: description.trim() || undefined,
				capacity: capacityNum,
				location: location.trim(),
				floor_number: floorNumber ? parseInt(floorNumber) : undefined,
				building: building.trim() || undefined,
				equipment,
				amenities,
				is_active: isActive,
				is_maintenance: isMaintenance,
				maintenance_notes: maintenanceNotes.trim() || undefined,
			};

			if (isEditing) {
				await hallManagementService.updateHall(hallId, hallData);
				Alert.alert("Success", "Hall updated successfully", [
					{ text: "OK", onPress: () => navigation.goBack() },
				]);
			} else {
				await hallManagementService.createHall(hallData);
				Alert.alert("Success", "Hall created successfully", [
					{ text: "OK", onPress: () => navigation.goBack() },
				]);
			}
		} catch (error: any) {
			console.error("Error saving hall:", error);

			// Provide specific error messages based on the error type
			let errorMessage = `Failed to ${
				isEditing ? "update" : "create"
			} hall. Please try again.`;

			if (error.message) {
				if (
					error.message.includes("permissions") ||
					error.message.includes("Insufficient permissions")
				) {
					errorMessage =
						"You don't have permission to perform this action. Please contact your administrator.";
				} else if (
					error.message.includes("authenticated") ||
					error.message.includes("User not authenticated")
				) {
					errorMessage = "Please log in again to continue.";
				} else if (error.message.includes("violates row-level security")) {
					errorMessage =
						"Access denied. Please ensure you have admin privileges.";
				} else if (
					error.message.includes("Unable to verify admin permissions")
				) {
					errorMessage =
						"Unable to verify your permissions. Please contact your administrator.";
				} else {
					errorMessage = error.message;
				}
			}

			Alert.alert("Error", errorMessage);
		} finally {
			setSaving(false);
		}
	};

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<View style={[styles.header, isDark && styles.headerDark]}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => navigation.goBack()}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color={isDark ? "#fff" : "#222"}
					/>
				</TouchableOpacity>
				<Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
					{isEditing ? "Edit Hall" : "Add New Hall"}
				</Text>
				<View style={styles.headerSpacer} />
			</View>
			<View style={{ flex: 1 }}>
				<ScrollView
					style={{ flex: 1, padding: 24 }}
					contentContainerStyle={{ paddingBottom: 120 }}
					keyboardShouldPersistTaps="handled"
				>
					{/* ...existing form fields... */}
					<Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>
						Hall Name *
					</Text>
					<TextInput
						style={[styles.textInput, isDark && styles.textInputDark]}
						value={name}
						onChangeText={setName}
						placeholder="e.g., Conference Room A"
						placeholderTextColor={isDark ? "#aaa" : "#888"}
					/>
					<Text
						style={[
							styles.inputLabel,
							isDark && styles.inputLabelDark,
							{ marginTop: 16 },
						]}
					>
						Description
					</Text>
					<TextInput
						style={[
							styles.textInput,
							styles.textInputMultiline,
							isDark && styles.textInputDark,
						]}
						value={description}
						onChangeText={setDescription}
						placeholder="Brief description of the hall..."
						placeholderTextColor={isDark ? "#aaa" : "#888"}
						multiline
						numberOfLines={3}
					/>
					<Text
						style={[
							styles.inputLabel,
							isDark && styles.inputLabelDark,
							{ marginTop: 16 },
						]}
					>
						Capacity *
					</Text>
					<TextInput
						style={[styles.textInput, isDark && styles.textInputDark]}
						value={capacity}
						onChangeText={setCapacity}
						placeholder="e.g., 50"
						placeholderTextColor={isDark ? "#aaa" : "#888"}
						keyboardType="numeric"
					/>
					<Text
						style={[
							styles.inputLabel,
							isDark && styles.inputLabelDark,
							{ marginTop: 16 },
						]}
					>
						Location *
					</Text>
					<TextInput
						style={[styles.textInput, isDark && styles.textInputDark]}
						value={location}
						onChangeText={setLocation}
						placeholder="e.g., Ground Floor, East Wing"
						placeholderTextColor={isDark ? "#aaa" : "#888"}
					/>
					<Text
						style={[
							styles.inputLabel,
							isDark && styles.inputLabelDark,
							{ marginTop: 16 },
						]}
					>
						Building
					</Text>
					<TextInput
						style={[styles.textInput, isDark && styles.textInputDark]}
						value={building}
						onChangeText={setBuilding}
						placeholder="e.g., Main Building, Block A"
						placeholderTextColor={isDark ? "#aaa" : "#888"}
					/>
					<Text
						style={[
							styles.inputLabel,
							isDark && styles.inputLabelDark,
							{ marginTop: 16 },
						]}
					>
						Floor Number
					</Text>
					<TextInput
						style={[styles.textInput, isDark && styles.textInputDark]}
						value={floorNumber}
						onChangeText={setFloorNumber}
						placeholder="e.g., 1, 2, 3..."
						placeholderTextColor={isDark ? "#aaa" : "#888"}
						keyboardType="numeric"
					/>
					<Text
						style={[
							styles.inputLabel,
							isDark && styles.inputLabelDark,
							{ marginTop: 16 },
						]}
					>
						Equipment
					</Text>
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}
					>
						{EQUIPMENT_OPTIONS.map((item) => (
							<TouchableOpacity
								key={item}
								style={[
									styles.selectionItem,
									isDark && styles.selectionItemDark,
									equipment.includes(item) && styles.selectionItemSelected,
								]}
								onPress={() => toggleEquipment(item)}
							>
								<Text
									style={[
										styles.selectionItemText,
										isDark && styles.selectionItemTextDark,
										equipment.includes(item) &&
											styles.selectionItemTextSelected,
									]}
								>
									{item}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<Text
						style={[
							styles.inputLabel,
							isDark && styles.inputLabelDark,
							{ marginTop: 16 },
						]}
					>
						Amenities
					</Text>
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}
					>
						{AMENITY_OPTIONS.map((item) => (
							<TouchableOpacity
								key={item}
								style={[
									styles.selectionItem,
									isDark && styles.selectionItemDark,
									amenities.includes(item) && styles.selectionItemSelected,
								]}
								onPress={() => toggleAmenity(item)}
							>
								<Text
									style={[
										styles.selectionItemText,
										isDark && styles.selectionItemTextDark,
										amenities.includes(item) &&
											styles.selectionItemTextSelected,
									]}
								>
									{item}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							marginTop: 24,
						}}
					>
						<Text
							style={[
								styles.inputLabel,
								isDark && styles.inputLabelDark,
								{ flex: 1 },
							]}
						>
							Active Status
						</Text>
						<Switch
							value={isActive}
							onValueChange={setIsActive}
							trackColor={{ false: isDark ? "#333" : "#ccc", true: "#007AFF" }}
							thumbColor={isActive ? "white" : "#888"}
						/>
					</View>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							marginTop: 16,
						}}
					>
						<Text
							style={[
								styles.inputLabel,
								isDark && styles.inputLabelDark,
								{ flex: 1 },
							]}
						>
							Maintenance Mode
						</Text>
						<Switch
							value={isMaintenance}
							onValueChange={setIsMaintenance}
							trackColor={{ false: isDark ? "#333" : "#ccc", true: "#007AFF" }}
							thumbColor={isMaintenance ? "white" : "#888"}
						/>
					</View>
					{isMaintenance && (
						<View style={{ marginTop: 16 }}>
							<Text
								style={[styles.inputLabel, isDark && styles.inputLabelDark]}
							>
								Maintenance Notes
							</Text>
							<TextInput
								style={[
									styles.textInput,
									styles.textInputMultiline,
									isDark && styles.textInputDark,
								]}
								value={maintenanceNotes}
								onChangeText={setMaintenanceNotes}
								placeholder="Describe maintenance requirements..."
								placeholderTextColor={isDark ? "#aaa" : "#888"}
								multiline
								numberOfLines={3}
							/>
						</View>
					)}
				</ScrollView>
				<View style={styles.fixedButtonContainer}>
					<TouchableOpacity
						style={styles.buttonTouchable}
						onPress={handleSubmit}
						disabled={saving}
						activeOpacity={0.85}
					>
						<LinearGradient
							colors={saving ? ["#aaa", "#aaa"] : ["#007AFF", "#0051A8"]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={styles.gradientButton}
						>
							{saving ? (
								<ActivityIndicator
									size="small"
									color="white"
									style={{ marginRight: 8 }}
								/>
							) : (
								<Ionicons
									name="checkmark"
									size={22}
									color="white"
									style={{ marginRight: 8 }}
								/>
							)}
							<Text style={styles.gradientButtonText}>
								{isEditing ? "Update Hall" : "Create Hall"}
							</Text>
						</LinearGradient>
					</TouchableOpacity>
				</View>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8f8f8",
	},
	containerDark: {
		backgroundColor: "#181a20",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	headerDark: {
		backgroundColor: "#23242a",
		borderBottomColor: "#333",
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: "#222",
		flex: 1,
		textAlign: "center",
		marginHorizontal: 16,
	},
	headerTitleDark: {
		color: "#fff",
	},
	headerSpacer: {
		width: 60,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: "500",
		color: "#444",
		marginBottom: 6,
	},
	inputLabelDark: {
		color: "#ccc",
	},
	textInput: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: "#222",
		backgroundColor: "white",
		minHeight: 48,
		textAlignVertical: "center",
	},
	textInputDark: {
		borderColor: "#444",
		backgroundColor: "#23242a",
		color: "#fff",
	},
	textInputMultiline: {
		height: 80,
		textAlignVertical: "top",
	},
	selectionItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f0f0f0",
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		margin: 4,
	},
	selectionItemDark: {
		backgroundColor: "#23242a",
		borderColor: "#444",
	},
	selectionItemSelected: {
		backgroundColor: "#007AFF",
		borderColor: "#007AFF",
	},
	selectionItemText: {
		fontSize: 13,
		color: "#444",
		marginRight: 4,
	},
	selectionItemTextDark: {
		color: "#ccc",
	},
	selectionItemTextSelected: {
		color: "white",
	},
	saveBottomButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#007AFF",
		paddingVertical: 16,
		borderRadius: 12,
	},
	saveBottomButtonDisabled: {
		backgroundColor: "#aaa",
	},
	saveBottomButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 8,
	},
	fixedButtonContainer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		paddingVertical: 16,
		paddingHorizontal: 20,
		backgroundColor: "#f8f8f8",
		borderTopWidth: 1,
		borderTopColor: "#eee",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 8,
	},
	buttonTouchable: {
		width: "100%",
		borderRadius: 32,
		overflow: "hidden",
	},
	gradientButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		paddingVertical: 18,
		borderRadius: 32,
		shadowColor: "#007AFF",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.18,
		shadowRadius: 8,
		elevation: 4,
	},
	gradientButtonText: {
		color: "white",
		fontSize: 18,
		fontWeight: "bold",
		letterSpacing: 0.5,
	},
});

export default AddEditHallScreen;
