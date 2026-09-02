import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "./AppText";
import { radii, touchTarget } from "@/design/tokens";
import { useTheme } from "@/design/useTheme";

export function Button({ children, onPress, disabled, loading, tone = "primary", accessibilityLabel }: { children: ReactNode; onPress: () => void; disabled?: boolean; loading?: boolean; tone?: "primary" | "quiet" | "destructive"; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  const background = tone === "primary" ? colors.textPrimary : tone === "destructive" ? colors.destructive : colors.surface;
  const foreground = tone === "quiet" ? colors.textPrimary : colors.background;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={() => { void Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [styles.button, { backgroundColor: background, borderColor: colors.border, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : <AppText variant="bodySmall" color={foreground} style={styles.label}>{children}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({ button: { minHeight: touchTarget + 6, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, borderWidth: StyleSheet.hairlineWidth }, label: { fontFamily: "Inter_600SemiBold" } });
