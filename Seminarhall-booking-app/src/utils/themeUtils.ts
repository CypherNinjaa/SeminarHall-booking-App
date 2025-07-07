import { Colors } from "../constants/theme";

export const getThemeColors = (isDark: boolean) => ({
	background: {
		primary: isDark
			? Colors.dark.background.primary
			: Colors.background.primary,
		secondary: isDark
			? Colors.dark.background.secondary
			: Colors.background.secondary,
		tertiary: isDark
			? Colors.dark.background.tertiary
			: Colors.background.tertiary,
	},
	text: {
		primary: isDark ? Colors.dark.text.primary : Colors.text.primary,
		secondary: isDark ? Colors.dark.text.secondary : Colors.text.secondary,
		tertiary: isDark ? Colors.dark.text.tertiary : Colors.text.tertiary,
		inverse: isDark ? Colors.dark.text.inverse : Colors.text.inverse,
	},
	border: {
		light: isDark ? Colors.dark.border.light : Colors.border.light,
		main: isDark ? Colors.dark.border.main : Colors.border.main,
		dark: isDark ? Colors.dark.border.dark : Colors.border.dark,
	},
	card: isDark ? Colors.dark.background.secondary : Colors.background.primary,
	shadow: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.1)",
});
