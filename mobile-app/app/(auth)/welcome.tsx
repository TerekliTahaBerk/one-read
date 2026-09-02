import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Mascot } from "@/components/Mascot";
import { useTheme } from "@/design/useTheme";

export default function Welcome() {
  const { colors } = useTheme();
  return <Screen><View style={styles.brand}><AppText style={styles.wordmark}>OneRead</AppText><AppText variant="eyebrow" color={colors.accent}>ONEARTICLE</AppText></View><View style={[styles.art, { backgroundColor: colors.accentSoft }]}><View style={[styles.orbit, { borderColor: colors.textPrimary }]} /><View style={[styles.line, { backgroundColor: colors.textPrimary }]} /><View style={styles.mascot}><Mascot size={150} /></View></View><View style={styles.hero}><AppText variant="displayHero" accessibilityRole="header" style={styles.title}>One useful article. Quietly waiting.</AppText><AppText variant="body" color={colors.textSecondary} style={styles.copy}>Your weekday OneArticle still arrives by email. This is simply a better place to read it.</AppText></View><View style={styles.actions}><Button onPress={() => router.push("/(auth)/login")}>Sign in with email</Button><AppText variant="caption" color={colors.textTertiary} style={styles.note}>For existing OneRead subscribers. No password needed.</AppText></View></Screen>;
}
const styles = StyleSheet.create({ brand: { paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, wordmark: { fontFamily: "Fraunces_500Medium", fontSize: 26, lineHeight: 31, letterSpacing: -.45 }, art: { height: 230, borderRadius: 24, marginTop: 24, overflow: "hidden" }, orbit: { position: "absolute", width: 132, height: 132, borderRadius: 66, borderWidth: 1.2, left: 26, top: 34, opacity: .72 }, line: { position: "absolute", height: 1, left: 24, right: 24, bottom: 38, opacity: .72 }, mascot: { position: "absolute", right: 20, bottom: 8 }, hero: { flex: 1, justifyContent: "center", alignItems: "flex-start", paddingVertical: 22 }, title: { maxWidth: 340 }, copy: { marginTop: 14, maxWidth: 350 }, actions: { paddingBottom: 28, gap: 13 }, note: { textAlign: "center" } });
