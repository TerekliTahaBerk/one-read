import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { Mascot } from "./Mascot";
import { useTheme } from "@/design/useTheme";

export function StatePanel({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return <View style={styles.wrap}><Mascot /><AppText variant="title1" accessibilityRole="header" style={styles.center}>{title}</AppText><AppText color={colors.textSecondary} style={styles.center}>{body}</AppText></View>;
}
const styles = StyleSheet.create({ wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 50 }, center: { textAlign: "center", maxWidth: 310 } });
