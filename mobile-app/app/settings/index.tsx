import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Mascot } from "@/components/Mascot";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useTheme } from "@/design/useTheme";
import type { AppearanceMode } from "@/design/useTheme";
import { pushTokenStorage } from "@/storage/session";

function Row({ title, detail, onPress, destructive = false }: { title: string; detail?: string; onPress: () => void; destructive?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? .6 : 1 }]}><View style={styles.rowText}><AppText color={destructive ? colors.destructive : colors.textPrimary}>{title}</AppText>{detail ? <AppText variant="bodySmall" color={colors.textTertiary}>{detail}</AppText> : null}</View><AppText color={colors.textTertiary}>›</AppText></Pressable>;
}

function AppearancePicker() {
  const { colors, mode, setMode } = useTheme();
  const choices: { label: string; value: AppearanceMode }[] = [{ label: "System", value: "system" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }];
  return <View accessibilityRole="radiogroup" style={[styles.appearance, { backgroundColor: colors.surface, borderColor: colors.border }]}>{choices.map((choice) => { const selected = mode === choice.value; return <Pressable key={choice.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setMode(choice.value)} style={[styles.appearanceChoice, selected && { backgroundColor: colors.accentSoft }]}><View style={[styles.appearancePreview, { backgroundColor: choice.value === "dark" ? "#0F1011" : choice.value === "light" ? "#F5F3EE" : colors.background, borderColor: selected ? colors.accent : colors.border }]}><View style={[styles.appearanceCard, { backgroundColor: choice.value === "dark" ? "#242628" : "#FFFFFF" }]} /></View><AppText variant="caption" color={selected ? colors.accent : colors.textSecondary} style={selected ? styles.appearanceLabel : undefined}>{choice.label}</AppText></Pressable>; })}</View>;
}
export default function Settings() {
  const auth = useAuth(); const { colors } = useTheme(); const [push, setPush] = useState(false);
  const me = useQuery({ queryKey: ["me", auth.token], queryFn: () => api.me(auth.token!), enabled: Boolean(auth.token) });
  const enablePush = async (value: boolean) => {
    if (!value) {
      const stored = await pushTokenStorage.get();
      if (stored) await api.unregisterPush(auth.token!, stored).catch(() => undefined);
      await pushTokenStorage.clear();
      setPush(false);
      return;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) { Alert.alert("Notifications are off", "You can enable OneRead notifications later in iOS Settings."); return; }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) { Alert.alert("Build setup needed", "The EAS project ID must be configured before push registration."); return; }
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPush(auth.token!, token.data, Intl.DateTimeFormat().resolvedOptions().timeZone);
    await pushTokenStorage.set(token.data);
    setPush(true);
  };
  return <Screen scroll><View style={styles.topbar}><AppText style={styles.wordmark}>OneRead</AppText><Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={() => router.back()} style={[styles.close, { backgroundColor: colors.surface }]}><AppText variant="title2">×</AppText></Pressable></View><View style={[styles.profile, { backgroundColor: colors.accentSoft }]}><View style={styles.profileCopy}><AppText variant="eyebrow" color={colors.accent}>YOUR ONEREAD</AppText><AppText variant="display" accessibilityRole="header">Settings</AppText><AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={1}>{me.data?.account.email ?? "Your account"}</AppText></View><Mascot size={92} /></View><AppText variant="eyebrow" color={colors.textTertiary} style={styles.section}>ACCOUNT</AppText><View style={[styles.group, { backgroundColor: colors.surface }]}><Row title={me.data?.account.email ?? "Your account"} detail="Verified email" onPress={() => undefined} /></View><AppText variant="eyebrow" color={colors.textTertiary} style={styles.section}>READING</AppText><View style={[styles.group, { backgroundColor: colors.surface }]}><Row title="Reading preferences" detail={me.data?.preferences ? `${me.data.preferences.readingLanguage} · ${me.data.preferences.sourceLanguage} sources` : "Complete your choices"} onPress={() => router.push("/settings/preferences")} /></View><AppText variant="eyebrow" color={colors.textTertiary} style={styles.section}>APPEARANCE</AppText><AppearancePicker /><AppText variant="eyebrow" color={colors.textTertiary} style={styles.section}>DELIVERY</AppText><View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.rowText}><AppText>Morning notification</AppText><AppText variant="bodySmall" color={colors.textTertiary}>One quiet alert when today’s article is ready. Email remains primary.</AppText></View><Switch accessibilityLabel="Morning notification" value={push} onValueChange={(value) => void enablePush(value)} trackColor={{ true: colors.accent }} /></View><AppText variant="eyebrow" color={colors.textTertiary} style={styles.section}>ONEREAD</AppText><View style={[styles.group, { backgroundColor: colors.surface }]}><Row title="Editorial standards" onPress={() => void Linking.openURL("https://www.oneread.email/editorial")} /><Row title="Privacy" onPress={() => void Linking.openURL("https://www.oneread.email/privacy")} /><Row title="Terms" onPress={() => void Linking.openURL("https://www.oneread.email/terms")} /><Row title="Send feedback" onPress={() => void Linking.openURL("mailto:hello@oneread.email?subject=OneRead%20iOS%20feedback")} /></View><AppText variant="eyebrow" color={colors.textTertiary} style={styles.section}>SESSION</AppText><View style={[styles.group, { backgroundColor: colors.surface }]}><Row title="Delete account" destructive onPress={() => router.push("/settings/delete-account")} /></View><Button tone="quiet" onPress={() => { void auth.signOut().then(() => router.replace("/(auth)/welcome")); }}>Sign out</Button><AppText variant="caption" color={colors.textTertiary} style={styles.version}>OneRead 1.0 · Email delivery is managed separately.</AppText></Screen>;
}
const styles = StyleSheet.create({ topbar: { paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, wordmark: { fontFamily: "Fraunces_500Medium", fontSize: 25, lineHeight: 30, letterSpacing: -.45 }, close: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, profile: { minHeight: 150, borderRadius: 22, padding: 20, marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden" }, profileCopy: { flex: 1, gap: 6 }, section: { marginTop: 30, marginBottom: 9 }, group: { borderRadius: 16, paddingHorizontal: 16, overflow: "hidden" }, row: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth }, rowText: { flex: 1, gap: 3, paddingVertical: 12 }, appearance: { minHeight: 118, flexDirection: "row", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 8, gap: 6 }, appearanceChoice: { flex: 1, borderRadius: 14, padding: 7, alignItems: "center", gap: 7 }, appearancePreview: { width: "100%", height: 58, borderRadius: 10, borderWidth: 1.5, padding: 7, justifyContent: "flex-end" }, appearanceCard: { height: 24, borderRadius: 5 }, appearanceLabel: { fontFamily: "Inter_600SemiBold" }, toggleRow: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth }, version: { textAlign: "center", paddingVertical: 25 } });
