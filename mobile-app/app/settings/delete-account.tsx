import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useTheme } from "@/design/useTheme";
import { useAuth } from "@/auth/AuthProvider";
import { api } from "@/api/client";

export default function DeleteAccount() {
  const [text, setText] = useState(""); const [loading, setLoading] = useState(false); const auth = useAuth(); const { colors } = useTheme();
  const remove = async () => { setLoading(true); try { await api.deleteAccount(auth.token!); await auth.signOut(); router.replace("/(auth)/welcome"); } finally { setLoading(false); } };
  return <Screen scroll><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><AppText variant="title2">‹</AppText></Pressable><AppText variant="display" accessibilityRole="header">Delete account</AppText><AppText color={colors.textSecondary} style={styles.intro}>This removes your reading preferences, mobile sessions, push devices, delivery history, and reading progress. Financial records that must be retained are anonymized. This does not issue a billing refund.</AppText><View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}><AppText variant="title3">Before you continue</AppText><AppText variant="bodySmall" color={colors.textSecondary}>Manage or cancel an active subscription through the provider where it was purchased. Email unsubscribe and billing cancellation remain separate.</AppText></View><AppText variant="metadata" style={styles.label}>Type DELETE to confirm</AppText><TextInput value={text} onChangeText={setText} autoCapitalize="characters" accessibilityLabel="Type DELETE to confirm" style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]} /><Button tone="destructive" loading={loading} disabled={text !== "DELETE"} onPress={remove}>Permanently delete account</Button></Screen>;
}
const styles = StyleSheet.create({ back: { width: 44, height: 44, justifyContent: "center" }, intro: { marginTop: 13 }, notice: { padding: 18, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8, marginTop: 25 }, label: { marginTop: 28, marginBottom: 8 }, input: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 16 } });
