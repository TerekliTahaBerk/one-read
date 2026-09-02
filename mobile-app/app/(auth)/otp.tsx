import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useAuth } from "@/auth/AuthProvider";
import { useTheme } from "@/design/useTheme";

export default function OTP() {
  const [code, setCode] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null); const input = useRef<TextInput>(null);
  const auth = useAuth(); const { colors } = useTheme();
  const verify = async () => { setLoading(true); setError(null); try { await auth.verifyCode(code); router.replace("/(tabs)"); } catch (value) { setError(value instanceof Error ? value.message : "That code didn’t work."); } finally { setLoading(false); } };
  return <Screen><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.grow}><Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={() => router.back()} style={styles.back}><AppText variant="bodyLarge">‹</AppText></Pressable><View style={styles.form}><AppText variant="display" accessibilityRole="header">Check your inbox.</AppText><AppText color={colors.textSecondary}>Enter the code sent to {auth.pendingEmail ?? "your email"}. It expires in ten minutes.</AppText><Pressable accessibilityRole="button" accessibilityLabel={`Verification code, ${code.length} of 6 digits entered`} onPress={() => input.current?.focus()} style={styles.codeRow}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.cell, { borderColor: error ? colors.destructive : index === code.length ? colors.accent : colors.border, backgroundColor: colors.surface }]}><AppText variant="title3" maxFontSizeMultiplier={1.2}>{code[index] ?? ""}</AppText></View>)}</Pressable><TextInput ref={input} autoFocus value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" accessibilityLabel="Six-digit verification code" style={styles.hidden} />{error && <AppText accessibilityRole="alert" color={colors.destructive}>{error}</AppText>}<Button loading={loading} disabled={code.length !== 6} onPress={verify}>Open OneRead</Button><AppText variant="caption" color={colors.textTertiary} style={styles.fixture}>Development fixtures accept any six digits.</AppText></View></KeyboardAvoidingView></Screen>;
}
const styles = StyleSheet.create({ grow: { flex: 1 }, back: { width: 44, height: 44, justifyContent: "center" }, form: { flex: 1, justifyContent: "center", gap: 18, paddingBottom: 70 }, codeRow: { flexDirection: "row", gap: 7 }, cell: { flex: 1, height: 54, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" }, hidden: { position: "absolute", width: 1, height: 1, opacity: 0 }, fixture: { textAlign: "center" } });
