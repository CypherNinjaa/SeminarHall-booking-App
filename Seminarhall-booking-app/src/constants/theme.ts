// Design System Constants for Amity University Booking App

export const Colors = {
	// Primary Brand Colors
	primary: {
		50: "#eff6ff",
		100: "#dbeafe",
		200: "#bfdbfe",
		300: "#93c5fd",
		400: "#60a5fa",
		500: "#3b82f6", // Main brand color
		600: "#2563eb",
		700: "#1d4ed8",
		800: "#1e40af",
		900: "#1e3a8a",
	},

	// Semantic Colors
	success: {
		light: "#d1fae5",
		main: "#10b981",
		dark: "#059669",
	},

	warning: {
		light: "#fef3c7",
		main: "#f59e0b",
		dark: "#d97706",
	},

	error: {
		light: "#fee2e2",
		main: "#ef4444",
		dark: "#dc2626",
	},

	// Neutral Colors
	gray: {
		50: "#f9fafb",
		100: "#f3f4f6",
		200: "#e5e7eb",
		300: "#d1d5db",
		400: "#9ca3af",
		500: "#6b7280",
		600: "#4b5563",
		700: "#374151",
		800: "#1f2937",
		900: "#111827",
	},

	// Background Colors
	background: {
		primary: "#ffffff",
		secondary: "#f8fafc",
		tertiary: "#f1f5f9",
	},

	// Dark Theme Background Colors
	dark: {
		background: {
			primary: "#0f172a",
			secondary: "#1e293b",
			tertiary: "#334155",
		},
		text: {
			primary: "#f8fafc",
			secondary: "#cbd5e1",
			tertiary: "#94a3b8",
			inverse: "#0f172a",
		},
		border: {
			light: "#334155",
			main: "#475569",
			dark: "#64748b",
		},
	},

	// Text Colors
	text: {
		primary: "#1f2937",
		secondary: "#6b7280",
		tertiary: "#9ca3af",
		inverse: "#ffffff",
	},

	// Border Colors
	border: {
		light: "#f1f5f9",
		main: "#e5e7eb",
		dark: "#d1d5db",
	},
};

export const Typography = {
	// Font Sizes
	fontSize: {
		xs: 12,
		sm: 14,
		base: 16,
		lg: 18,
		xl: 20,
		"2xl": 24,
		"3xl": 30,
		"4xl": 36,
		"5xl": 48,
	},

	// Font Weights - Using literal types compatible with React Native
	fontWeight: {
		light: "300" as const,
		normal: "400" as const,
		medium: "500" as const,
		semibold: "600" as const,
		bold: "700" as const,
		extrabold: "800" as const,
	},

	// Line Heights
	lineHeight: {
		tight: 1.25,
		normal: 1.5,
		relaxed: 1.75,
	},
};

export const Spacing = {
	// Base spacing unit: 4px
	0: 0,
	1: 4,
	2: 8,
	3: 12,
	4: 16,
	5: 20,
	6: 24,
	7: 28,
	8: 32,
	10: 40,
	12: 48,
	16: 64,
	20: 80,
	24: 96,
	32: 128,
};

export const BorderRadius = {
	none: 0,
	sm: 4,
	md: 8,
	lg: 12,
	xl: 16,
	"2xl": 20,
	"3xl": 24,
	full: 9999,
};

export const Shadows = {
	sm: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},

	md: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 5,
	},

	lg: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.15,
		shadowRadius: 15,
		elevation: 8,
	},

	xl: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 20 },
		shadowOpacity: 0.25,
		shadowRadius: 25,
		elevation: 12,
	},
};

export const Layout = {
	// Screen dimensions
	screenPadding: Spacing[5], // 20px
	containerMaxWidth: 400,

	// Common component dimensions
	button: {
		height: 48,
		borderRadius: BorderRadius.lg,
	},

	input: {
		height: 48,
		borderRadius: BorderRadius.md,
	},

	card: {
		borderRadius: BorderRadius.xl,
		padding: Spacing[5],
	},

	header: {
		height: 60,
	},
};

// University specific theme
export const UniversityTheme = {
	brand: {
		primary: Colors.primary[600], // Amity blue
		secondary: Colors.primary[100],
		accent: Colors.warning.main, // Gold accent
	},

	// Gradient definitions
	gradients: {
		primary: ["#1e40af", "#3b82f6"],
		secondary: ["#f8fafc", "#e2e8f0"],
		success: ["#10b981", "#34d399"],
		warning: ["#f59e0b", "#fbbf24"],
	},
};
