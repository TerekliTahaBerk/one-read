import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/design/useTheme";

export function Screen({ children, scroll = false, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const { colors } = useTheme();
  const content = <View style={[styles.content, padded && styles.padded]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {scroll ? <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.grow}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flexGrow: 1 }, grow: { flexGrow: 1 }, padded: { paddingHorizontal: 22 } });
