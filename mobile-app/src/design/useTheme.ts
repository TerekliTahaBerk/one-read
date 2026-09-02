import { createContext, useContext } from "react";
import { darkColors, lightColors } from "./tokens";

export type AppearanceMode = "system" | "light" | "dark";

export const ThemeContext = createContext({
  colors: lightColors as typeof lightColors | typeof darkColors,
  dark: false,
  mode: "system" as AppearanceMode,
  setMode: (_mode: AppearanceMode) => undefined as void,
});

export function useTheme() {
  return useContext(ThemeContext);
}
