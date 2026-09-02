export const lightColors = {
  background: "#F5F3EE",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  textPrimary: "#191A1B",
  textSecondary: "#68655F",
  textTertiary: "#918D85",
  border: "#E2DED6",
  accent: "#527FAB",
  accentSoft: "#E3EDF7",
  destructive: "#A33B32",
  success: "#356B52",
  warning: "#966C24",
} as const;

export const darkColors = {
  background: "#0F1011",
  surface: "#1A1B1D",
  surfaceElevated: "#222426",
  textPrimary: "#F4F1EB",
  textSecondary: "#A5A099",
  textTertiary: "#7C7972",
  border: "#2A2C2E",
  accent: "#7FA6D6",
  accentSoft: "#1C2937",
  destructive: "#E18C83",
  success: "#80B99A",
  warning: "#D8B474",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 48 } as const;
export const radii = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const touchTarget = 44;
export const fonts = { display: "Fraunces_500Medium", displayItalic: "Fraunces_500Medium_Italic", body: "Inter_400Regular", medium: "Inter_600SemiBold" } as const;

export type ThemeColors = typeof lightColors;
