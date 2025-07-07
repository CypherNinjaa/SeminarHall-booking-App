import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
	theme: Theme;
	isDark: boolean;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@seminar_hall_theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const systemTheme = useColorScheme();
	const [theme, setThemeState] = useState<Theme>("system");

	const isDark =
		theme === "dark" || (theme === "system" && systemTheme === "dark");

	useEffect(() => {
		loadTheme();
	}, []);

	const loadTheme = async () => {
		try {
			const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
			if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
				setThemeState(savedTheme as Theme);
			}
		} catch (error) {
			console.log("Error loading theme:", error);
		}
	};

	const setTheme = async (newTheme: Theme) => {
		try {
			setThemeState(newTheme);
			await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
		} catch (error) {
			console.log("Error saving theme:", error);
		}
	};

	const toggleTheme = () => {
		const newTheme = isDark ? "light" : "dark";
		setTheme(newTheme);
	};

	return (
		<ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		// Return default values if context is not available
		return {
			theme: "system" as Theme,
			isDark: false,
			setTheme: () => {},
			toggleTheme: () => {},
		};
	}
	return context;
};

export default ThemeContext;
