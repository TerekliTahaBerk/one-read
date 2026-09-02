import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useTheme } from "@/design/useTheme";
import { useAuth } from "@/auth/AuthProvider";
import { api } from "@/api/client";

const interests = ["Technology", "Science", "Business", "Culture", "History", "Health"];
const languages = ["English", "Turkish", "Spanish", "French", "German"];
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { const { colors } = useTheme(); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.choice, { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border }]}><AppText variant="bodySmall" color={selected ? colors.accent : colors.textPrimary}>{label}</AppText></Pressable>; }
export default function Preferences() {
  const { colors } = useTheme(); const auth = useAuth(); const [selected, setSelected] = useState(["Technology", "Science"]); const [reading, setReading] = useState("English"); const [source, setSource] = useState("Any"); const [loading, setLoading] = useState(false);
  const save = async () => { setLoading(true); try { await api.savePreferences(auth.token!, { interests: selected, readingLanguage: reading, sourceLanguage: source }); router.back(); } finally { setLoading(false); } };
  return <Screen scroll><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><AppText variant="title2">‹</AppText></Pressable><AppText variant="display" accessibilityRole="header">Reading preferences</AppText><AppText color={colors.textSecondary} style={styles.intro}>These choices shape future OneArticle emails and the app together.</AppText><AppText variant="title3" style={styles.label}>Interests</AppText><View style={styles.choices}>{interests.map((item) => <Choice key={item} label={item} selected={selected.includes(item)} onPress={() => setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item].slice(0, 5))} />)}</View><AppText variant="title3" style={styles.label}>Reading language</AppText><View style={styles.choices}>{languages.map((item) => <Choice key={item} label={item} selected={reading === item} onPress={() => setReading(item)} />)}</View><AppText variant="title3" style={styles.label}>Source language</AppText><View style={styles.choices}>{["Any", "English", "Turkish"].map((item) => <Choice key={item} label={item} selected={source === item} onPress={() => setSource(item)} />)}</View><View style={styles.save}><Button loading={loading} disabled={selected.length === 0} onPress={save}>Save preferences</Button></View></Screen>;
}
const styles = StyleSheet.create({ back: { width: 44, height: 44, justifyContent: "center" }, intro: { marginTop: 10, maxWidth: 350 }, label: { marginTop: 30, marginBottom: 12 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, choice: { minHeight: 44, paddingHorizontal: 15, borderWidth: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" }, save: { marginVertical: 36 } });
