import { useThemeStore } from "../store/theme-store";
import { gradient, palette } from "./palette";

export const darkGradient = ["#0B1220", "#101827", "#111E35"] as const;

const lightColors = {
  contentBackground: palette.blue100,
  cardBackground: palette.white,
  cardMutedBackground: palette.blue100,
  border: palette.blue200,
  textPrimary: palette.slate900,
  textSecondary: palette.slate700,
  textMuted: palette.slate500,
  primary: palette.blue700,
  primarySoft: palette.blue100,
  tabBackground: palette.white,
  tabBorder: palette.blue200,
  inputBackground: palette.blue100,
  inputText: palette.slate900,
  dangerSurface: "#FFF3F5",
  dangerBorder: "#FFB5C0",
};

const darkColors = {
  contentBackground: "#0F172A",
  cardBackground: "#111C33",
  cardMutedBackground: "#0B1428",
  border: "#263753",
  textPrimary: "#E7EEFF",
  textSecondary: "#B4C3E3",
  textMuted: "#8EA1C7",
  primary: "#4C8DFF",
  primarySoft: "#142645",
  tabBackground: "#0B1428",
  tabBorder: "#263753",
  inputBackground: "#0B1428",
  inputText: "#E7EEFF",
  dangerSurface: "#30141D",
  dangerBorder: "#7A3041",
};

export function useAppTheme() {
  const isDark = useThemeStore((state) => state.isDark);

  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
    gradientColors: isDark ? darkGradient : gradient,
  };
}
