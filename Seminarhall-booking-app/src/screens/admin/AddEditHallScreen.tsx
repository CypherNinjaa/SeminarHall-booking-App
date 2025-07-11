import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from "react";
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
	Platform,
	Switch,
	KeyboardAvoidingView,
	findNodeHandle,
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
	CreateHallData,
	UpdateHallData,
	Hall,
} from "../../services/hallManagementService";

interface AddEditHallScreenProps {
	navigation: StackNavigationProp<RootStackParamList, "AddEditHall">;
	route: RouteProp<RootStackParamList, "AddEditHall">;
}

interface FormData {
	name: string;
	description: string;
	capacity: string;
	location: string;
	floor_number: string;
	building: string;
	equipment: string[];
	amenities: string[];
	images: string[];
	is_active: boolean;
	is_maintenance: boolean;
	maintenance_notes: string;
}

interface FormErrors {
	name?: string;
	capacity?: string;
	location?: string;
	equipment?: string;
	amenities?: string;
}

// Predefined equipment and amenities options
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

const AddEditHallScreen: React.FC<AddEditHallScreenProps> = ({
	navigation,
	route,
}) => {
	const { isDark } = useTheme();
	const { hallId, hall } = (route.params as any) || {};
	const isEditing = !!hallId;

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [formData, setFormData] = useState<FormData>({
		name: "",
		description: "",
		capacity: "",
		location: "",
		floor_number: "",
		building: "",
		equipment: [],
		amenities: [],
		images: [],
		is_active: true,
		is_maintenance: false,
		maintenance_notes: "",
	});
	const [errors, setErrors] = useState<FormErrors>({});

	// Create refs for input focus management
	const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

	const setInputRef = useCallback((key: string, ref: TextInput | null) => {
		inputRefs.current[key] = ref;
	}, []);

	// Load hall data if editing
	useEffect(() => {
		if (isEditing && hall) {
			setFormData({
				name: hall.name || "",
				description: hall.description || "",
				capacity: hall.capacity?.toString() || "",
				location: hall.location || "",
				floor_number: hall.floor_number?.toString() || "",
				building: hall.building || "",
				equipment: hall.equipment || [],
				amenities: hall.amenities || [],
				images: hall.images || [],
				is_active: hall.is_active ?? true,
				is_maintenance: hall.is_maintenance ?? false,
				maintenance_notes: hall.maintenance_notes || "",
			});
		}
	}, [isEditing, hall]);

	// Form validation that sets errors
	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		// Required fields
		if (!formData.name.trim()) {
			newErrors.name = "Hall name is required";
		} else if (formData.name.length < 3) {
			newErrors.name = "Hall name must be at least 3 characters";
		}

		if (!formData.capacity.trim()) {
			newErrors.capacity = "Capacity is required";
		} else {
			const capacity = parseInt(formData.capacity);
			if (isNaN(capacity) || capacity < 1) {
				newErrors.capacity = "Capacity must be a positive number";
			} else if (capacity > 1000) {
				newErrors.capacity = "Capacity cannot exceed 1000";
			}
		}

		if (!formData.location.trim()) {
			newErrors.location = "Location is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Validation check without setting errors (for button state)
	const isFormValid = useMemo(() => {
		return (
			formData.name.trim().length >= 3 &&
			formData.capacity.trim() !== "" &&
			!isNaN(parseInt(formData.capacity)) &&
			parseInt(formData.capacity) > 0 &&
			parseInt(formData.capacity) <= 1000 &&
			formData.location.trim() !== ""
		);
	}, [formData.name, formData.capacity, formData.location]);

	// Handle form submission
	const handleSubmit = async () => {
		if (!validateForm()) {
			Alert.alert("Validation Error", "Please fix the errors and try again");
			return;
		}

		setSaving(true);
		try {
			const hallData = {
				name: formData.name.trim(),
				description: formData.description.trim() || undefined,
				capacity: parseInt(formData.capacity),
				location: formData.location.trim(),
				floor_number: formData.floor_number
					? parseInt(formData.floor_number)
					: undefined,
				building: formData.building.trim() || undefined,
				equipment: formData.equipment,
				amenities: formData.amenities,
				images: formData.images,
				is_active: formData.is_active,
				is_maintenance: formData.is_maintenance,
				maintenance_notes: formData.maintenance_notes.trim() || undefined,
			};

			if (isEditing) {
				await hallManagementService.updateHall(
					hallId,
					hallData as UpdateHallData
				);
				Alert.alert("Success", "Hall updated successfully", [
					{ text: "OK", onPress: () => navigation.goBack() },
				]);
			} else {
				await hallManagementService.createHall(hallData as CreateHallData);
				Alert.alert("Success", "Hall created successfully", [
					{ text: "OK", onPress: () => navigation.goBack() },
				]);
			}
		} catch (error) {
			console.error("Error saving hall:", error);
			Alert.alert(
				"Error",
				`Failed to ${isEditing ? "update" : "create"} hall. Please try again.`
			);
		} finally {
			setSaving(false);
		}
	};

	// Toggle equipment selection
	const toggleEquipment = useCallback((equipment: string) => {
		setFormData((prev) => ({
			...prev,
			equipment: prev.equipment.includes(equipment)
				? prev.equipment.filter((item) => item !== equipment)
				: [...prev.equipment, equipment],
		}));
	}, []);

	// Toggle amenity selection
	const toggleAmenity = useCallback((amenity: string) => {
		setFormData((prev) => ({
			...prev,
			amenities: prev.amenities.includes(amenity)
				? prev.amenities.filter((item) => item !== amenity)
				: [...prev.amenities, amenity],
		}));
	}, []);

	// Create optimized input change handlers
	const handleNameChange = useCallback((text: string) => {
		setFormData((prev) => ({ ...prev, name: text }));
	}, []);

	const handleDescriptionChange = useCallback((text: string) => {
		setFormData((prev) => ({ ...prev, description: text }));
	}, []);

	const handleCapacityChange = useCallback((text: string) => {
		setFormData((prev) => ({ ...prev, capacity: text }));
	}, []);

	const handleLocationChange = useCallback((text: string) => {
		setFormData((prev) => ({ ...prev, location: text }));
	}, []);

	const handleBuildingChange = useCallback((text: string) => {
		setFormData((prev) => ({ ...prev, building: text }));
	}, []);

	const handleFloorNumberChange = useCallback((text: string) => {
		setFormData((prev) => ({ ...prev, floor_number: text }));
	}, []);

	const handleMaintenanceNotesChange = useCallback((text: string) => {
		setFormData((prev) => ({ ...prev, maintenance_notes: text }));
	}, []);

	// Custom input component
	const FormInput: React.FC<{
		label: string;
		value: string;
		onChangeText: (text: string) => void;
		placeholder?: string;
		error?: string;
		keyboardType?: "default" | "numeric";
		multiline?: boolean;
		maxLength?: number;
		required?: boolean;
		inputKey?: string;
		nextInputKey?: string;
	}> = React.memo(
		({
			label,
			value,
			onChangeText,
			placeholder,
			error,
			keyboardType = "default",
			multiline = false,
			maxLength,
			required = false,
			inputKey,
			nextInputKey,
		}) => {
			const inputRef = useRef<TextInput | null>(null);
			const handleFocus = useCallback(() => {
				if (inputKey) {
					setInputRef(inputKey, inputRef.current);
				}
				scrollToInput(inputRef.current);
			}, [inputKey]);
			const handleSubmitEditing = useCallback(() => {
				if (nextInputKey && inputRefs.current[nextInputKey]) {
					inputRefs.current[nextInputKey]?.focus();
				}
			}, [nextInputKey]);
			return (
				<View style={styles.inputContainer}>
					<Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>
						{label}
						{required && <Text style={styles.requiredStar}> *</Text>}
					</Text>
					<TextInput
						ref={inputRef}
						style={[
							styles.textInput,
							isDark && styles.textInputDark,
							error && styles.textInputError,
							multiline && styles.textInputMultiline,
						]}
						value={value}
						onChangeText={onChangeText}
						placeholder={placeholder}
						placeholderTextColor={
							isDark ? Colors.dark.text.tertiary : Colors.gray[400]
						}
						keyboardType={keyboardType}
						multiline={multiline}
						maxLength={maxLength}
						numberOfLines={multiline ? 3 : 1}
						autoCorrect={false}
						autoCapitalize="sentences"
						returnKeyType={nextInputKey ? "next" : "done"}
						blurOnSubmit={false}
						onSubmitEditing={handleSubmitEditing}
						enablesReturnKeyAutomatically={true}
						textContentType="none"
						clearButtonMode="never"
						spellCheck={false}
						onFocus={handleFocus}
					/>
					{error && <Text style={styles.errorText}>{error}</Text>}
				</View>
			);
		}
	);

	// Custom switch component
	const FormSwitch: React.FC<{
		label: string;
		value: boolean;
		onValueChange: (value: boolean) => void;
		description?: string;
	}> = ({ label, value, onValueChange, description }) => (
		<View style={styles.switchContainer}>
			<View style={styles.switchLabelContainer}>
				<Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>
					{label}
				</Text>
				{description && (
					<Text
						style={[
							styles.switchDescription,
							isDark && styles.switchDescriptionDark,
						]}
					>
						{description}
					</Text>
				)}
			</View>
			<Switch
				value={value}
				onValueChange={onValueChange}
				trackColor={{
					false: isDark ? Colors.dark.background.secondary : Colors.gray[300],
					true: Colors.primary[500],
				}}
				thumbColor={value ? "white" : Colors.gray[400]}
			/>
		</View>
	);

	// Custom selection component
	const SelectionGrid: React.FC<{
		label: string;
		options: string[];
		selected: string[];
		onToggle: (option: string) => void;
	}> = ({ label, options, selected, onToggle }) => (
		<View style={styles.selectionContainer}>
			<Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>
				{label}
			</Text>
			<View style={styles.selectionGrid}>
				{options.map((option) => (
					<TouchableOpacity
						key={option}
						style={[
							styles.selectionItem,
							isDark && styles.selectionItemDark,
							selected.includes(option) && styles.selectionItemSelected,
						]}
						onPress={() => onToggle(option)}
					>
						<Text
							style={[
								styles.selectionItemText,
								isDark && styles.selectionItemTextDark,
								selected.includes(option) && styles.selectionItemTextSelected,
							]}
						>
							{option}
						</Text>
						{selected.includes(option) && (
							<Ionicons name="checkmark" size={16} color="white" />
						)}
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	// For auto-scrolling to focused input
	const scrollViewRef = useRef<ScrollView | null>(null);

	const scrollToInput = useCallback((inputRef: TextInput | null) => {
		if (inputRef && scrollViewRef.current) {
			setTimeout(() => {
				const node = findNodeHandle(inputRef);
				if (node) {
					scrollViewRef.current?.scrollTo({
						y: 0,
						animated: true,
					});
				}
			}, 100);
		}
	}, []);

	return (
		<SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				enabled
			>
				{/* Header */}
				<View style={[styles.header, isDark && styles.headerDark]}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => navigation.goBack()}
					>
						<Ionicons
							name="arrow-back"
							size={24}
							color={isDark ? Colors.dark.text.primary : Colors.gray[800]}
						/>
					</TouchableOpacity>
					<Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
						{isEditing ? "Edit Hall" : "Add New Hall"}
					</Text>
					<View style={styles.headerSpacer} />
				</View>
				<ScrollView
					ref={scrollViewRef}
					style={styles.content}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					nestedScrollEnabled={true}
				>
					{/* Form Content */}
					{/* Basic Information */}
					<View style={[styles.section, isDark && styles.sectionDark]}>
						<Text
							style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
						>
							Basic Information
						</Text>

						<FormInput
							label="Hall Name"
							value={formData.name}
							onChangeText={handleNameChange}
							placeholder="e.g., Conference Room A"
							error={errors.name}
							maxLength={100}
							required
							inputKey="name"
							nextInputKey="description"
						/>

						<FormInput
							label="Description"
							value={formData.description}
							onChangeText={handleDescriptionChange}
							placeholder="Brief description of the hall..."
							multiline
							maxLength={500}
							inputKey="description"
							nextInputKey="capacity"
						/>

						<FormInput
							label="Capacity"
							value={formData.capacity}
							onChangeText={handleCapacityChange}
							placeholder="e.g., 50"
							error={errors.capacity}
							keyboardType="numeric"
							required
							inputKey="capacity"
							nextInputKey="location"
						/>
					</View>

					{/* Location Information */}
					<View style={[styles.section, isDark && styles.sectionDark]}>
						<Text
							style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
						>
							Location Details
						</Text>

						<FormInput
							label="Location"
							value={formData.location}
							onChangeText={handleLocationChange}
							placeholder="e.g., Ground Floor, East Wing"
							error={errors.location}
							required
							inputKey="location"
							nextInputKey="building"
						/>

						<FormInput
							label="Building"
							value={formData.building}
							onChangeText={handleBuildingChange}
							placeholder="e.g., Main Building, Block A"
							inputKey="building"
							nextInputKey="floor_number"
						/>

						<FormInput
							label="Floor Number"
							value={formData.floor_number}
							onChangeText={handleFloorNumberChange}
							placeholder="e.g., 1, 2, 3..."
							keyboardType="numeric"
							inputKey="floor_number"
						/>
					</View>

					{/* Equipment */}
					<View style={[styles.section, isDark && styles.sectionDark]}>
						<SelectionGrid
							label="Available Equipment"
							options={EQUIPMENT_OPTIONS}
							selected={formData.equipment}
							onToggle={toggleEquipment}
						/>
					</View>

					{/* Amenities */}
					<View style={[styles.section, isDark && styles.sectionDark]}>
						<SelectionGrid
							label="Available Amenities"
							options={AMENITY_OPTIONS}
							selected={formData.amenities}
							onToggle={toggleAmenity}
						/>
					</View>

					{/* Status Settings */}
					<View style={[styles.section, isDark && styles.sectionDark]}>
						<Text
							style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
						>
							Status Settings
						</Text>

						<FormSwitch
							label="Active Status"
							value={formData.is_active}
							onValueChange={(value) =>
								setFormData((prev) => ({ ...prev, is_active: value }))
							}
							description="Hall is available for booking when active"
						/>

						<FormSwitch
							label="Maintenance Mode"
							value={formData.is_maintenance}
							onValueChange={(value) =>
								setFormData((prev) => ({ ...prev, is_maintenance: value }))
							}
							description="Hall is temporarily unavailable for maintenance"
						/>

						{formData.is_maintenance && (
							<FormInput
								label="Maintenance Notes"
								value={formData.maintenance_notes}
								onChangeText={handleMaintenanceNotesChange}
								placeholder="Describe maintenance requirements..."
								multiline
								maxLength={300}
								inputKey="maintenance_notes"
							/>
						)}
					</View>

					{/* Bottom Spacing */}
					<View style={styles.bottomSpacing} />
				</ScrollView>

				{/* Fixed Bottom Save Button */}
				<View
					style={[
						styles.bottomButtonContainer,
						isDark && styles.bottomButtonContainerDark,
					]}
				>
					<TouchableOpacity
						style={[
							styles.saveBottomButton,
							(!isFormValid || saving) && styles.saveBottomButtonDisabled,
						]}
						onPress={handleSubmit}
						disabled={saving || !isFormValid}
						activeOpacity={0.8}
					>
						{saving ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<Ionicons name="checkmark" size={20} color="white" />
						)}
						<Text style={styles.saveBottomButtonText}>
							{isEditing ? "Update Hall" : "Create Hall"}
						</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.gray[50],
	},
	containerDark: {
		backgroundColor: Colors.dark.background.primary,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[3],
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: Colors.gray[200],
		...Shadows.sm,
	},
	headerDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderBottomColor: Colors.dark.border.main,
	},
	backButton: {
		padding: Spacing[2],
	},
	headerTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.gray[800],
		flex: 1,
		textAlign: "center",
		marginHorizontal: Spacing[4],
	},
	headerTitleDark: {
		color: Colors.dark.text.primary,
	},
	headerSpacer: {
		width: 60,
	},
	content: {
		flex: 1,
		backgroundColor: "transparent",
	},
	scrollContent: {
		paddingBottom: 120,
		minHeight: "100%",
	},
	section: {
		backgroundColor: "white",
		marginHorizontal: Spacing[4],
		marginTop: Spacing[4],
		padding: Spacing[4],
		borderRadius: BorderRadius.lg,
		...Shadows.sm,
	},
	sectionDark: {
		backgroundColor: Colors.dark.background.secondary,
	},
	sectionTitle: {
		fontSize: Typography.fontSize.lg,
		fontWeight: Typography.fontWeight.semibold,
		color: Colors.gray[800],
		marginBottom: Spacing[4],
	},
	sectionTitleDark: {
		color: Colors.dark.text.primary,
	},
	inputContainer: {
		marginBottom: Spacing[4],
	},
	inputLabel: {
		fontSize: Typography.fontSize.sm,
		fontWeight: Typography.fontWeight.medium,
		color: Colors.gray[700],
		marginBottom: Spacing[2],
	},
	inputLabelDark: {
		color: Colors.dark.text.secondary,
	},
	requiredStar: {
		color: Colors.error.main,
	},
	textInput: {
		borderWidth: 1,
		borderColor: Colors.gray[300],
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing[4],
		paddingVertical: Spacing[3],
		fontSize: 16,
		color: Colors.gray[800],
		backgroundColor: "white",
		minHeight: 48,
		textAlignVertical: "center",
	},
	textInputDark: {
		borderColor: Colors.dark.border.main,
		backgroundColor: Colors.dark.background.tertiary,
		color: Colors.dark.text.primary,
	},
	textInputError: {
		borderColor: Colors.error.main,
	},
	textInputMultiline: {
		height: 80,
		textAlignVertical: "top",
	},
	errorText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.error.main,
		marginTop: Spacing[1],
	},
	switchContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: Spacing[3],
	},
	switchLabelContainer: {
		flex: 1,
		marginRight: Spacing[4],
	},
	switchDescription: {
		fontSize: Typography.fontSize.xs,
		color: Colors.gray[600],
		marginTop: Spacing[1],
	},
	switchDescriptionDark: {
		color: Colors.dark.text.tertiary,
	},
	selectionContainer: {
		marginBottom: Spacing[4],
	},
	selectionGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginTop: Spacing[3],
	},
	selectionItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.gray[100],
		borderWidth: 1,
		borderColor: Colors.gray[300],
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing[3],
		paddingVertical: Spacing[2],
		margin: Spacing[1],
	},
	selectionItemDark: {
		backgroundColor: Colors.dark.background.tertiary,
		borderColor: Colors.dark.border.main,
	},
	selectionItemSelected: {
		backgroundColor: Colors.primary[500],
		borderColor: Colors.primary[500],
	},
	selectionItemText: {
		fontSize: Typography.fontSize.xs,
		color: Colors.gray[700],
		marginRight: Spacing[1],
	},
	selectionItemTextDark: {
		color: Colors.dark.text.secondary,
	},
	selectionItemTextSelected: {
		color: "white",
	},
	bottomSpacing: {
		height: Spacing[8],
	},
	// Bottom button styles
	bottomButtonContainer: {
		backgroundColor: "white",
		paddingHorizontal: Spacing[5],
		paddingVertical: Spacing[4],
		borderTopWidth: 1,
		borderTopColor: Colors.gray[200],
		...Shadows.lg,
	},
	bottomButtonContainerDark: {
		backgroundColor: Colors.dark.background.secondary,
		borderTopColor: Colors.dark.border.main,
	},
	saveBottomButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.primary[500],
		paddingVertical: Spacing[4],
		borderRadius: BorderRadius.lg,
		...Shadows.sm,
	},
	saveBottomButtonDisabled: {
		backgroundColor: Colors.gray[400],
	},
	saveBottomButtonText: {
		color: "white",
		fontSize: Typography.fontSize.base,
		fontWeight: Typography.fontWeight.semibold,
		marginLeft: Spacing[2],
	},
});

export default AddEditHallScreen;
