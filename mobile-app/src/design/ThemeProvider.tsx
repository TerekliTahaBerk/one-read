import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors } from "./tokens";
import { ThemeContext, type AppearanceMode } from "./useTheme";

const APPEARANCE_KEY = "oneread.appearance.v1";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>("system");

  useEffect(() => {
    void AsyncStorage.getItem(APPEARANCE_KEY).then((saved) => {
      if (saved === "system" || saved === "light" || saved === "dark") setModeState(saved);
    });
  }, []);

  const setMode = (next: AppearanceMode) => {
    setModeState(next);
    void AsyncStorage.setItem(APPEARANCE_KEY, next);
  };
  const dark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const value = useMemo(() => ({ colors: dark ? darkColors : lightColors, dark, mode, setMode }), [dark, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
