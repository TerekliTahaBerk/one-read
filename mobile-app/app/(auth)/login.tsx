import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useAuth } from "@/auth/AuthProvider";
import { useTheme } from "@/design/useTheme";

export default function Login() {
  const [email, setEmail] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const auth = useAuth(); const { colors } = useTheme();
  const submit = async () => { setLoading(true); setError(null); try { await auth.requestCode(email); router.push("/(auth)/otp"); } catch (value) { setError(value instanceof Error ? value.message : "Please try again."); } finally { setLoading(false); } };
  return <Screen><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.grow}><Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={() => router.back()} style={styles.back}><AppText variant="bodyLarge">‹</AppText></Pressable><View style={styles.form}><AppText variant="display" accessibilityRole="header">Welcome back.</AppText><AppText color={colors.textSecondary} style={styles.intro}>We’ll send a six-digit code to the email you use for OneRead.</AppText><AppText variant="metadata" style={styles.label}>Email</AppText><TextInput autoFocus autoCapitalize="none" autoComplete="email" keyboardType="email-address" returnKeyType="send" value={email} onChangeText={setEmail} onSubmitEditing={submit} placeholder="you@example.com" placeholderTextColor={colors.textTertiary} accessibilityLabel="Email address" style={[styles.input, { color: colors.textPrimary, borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.surface }]} />{error && <AppText accessibilityRole="alert" variant="bodySmall" color={colors.destructive}>{error}</AppText>}<Button loading={loading} disabled={!email.includes("@")} onPress={submit}>Send my code</Button></View></KeyboardAvoidingView></Screen>;
}
const styles = StyleSheet.create({ grow: { flex: 1 }, back: { width: 44, height: 44, justifyContent: "center" }, form: { flex: 1, justifyContent: "center", gap: 16, paddingBottom: 70 }, intro: { marginBottom: 12, maxWidth: 340 }, label: { marginBottom: -8 }, input: { minHeight: 54, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 17 } });
