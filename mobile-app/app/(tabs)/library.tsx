import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { StatePanel } from "@/components/StatePanel";
import { useTheme } from "@/design/useTheme";
import { monthYear, shortWeekday } from "@/utils/date";

export default function Library() {
  const auth = useAuth(); const { colors } = useTheme();
  const query = useQuery({ queryKey: ["library", auth.token], queryFn: () => api.library(auth.token!), enabled: Boolean(auth.token) });
  const groups = new Map<string, NonNullable<typeof query.data>["items"]>();
  query.data?.items.forEach((item) => { const month = monthYear(item.date).toUpperCase(); groups.set(month, [...(groups.get(month) ?? []), item]); });
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}><AppText variant="display" accessibilityRole="header" style={styles.title}>Library</AppText><AppText color={colors.textSecondary} style={styles.intro}>Every OneArticle you received, in chronological order.</AppText>{query.isError ? <StatePanel title="Library is offline." body="Recently opened editions remain available when saved on this device." /> : Array.from(groups).map(([month, items]) => <View key={month} style={styles.month}><AppText variant="eyebrow" color={colors.textTertiary} style={styles.monthTitle}>{month}</AppText><View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>{items.map((article, index) => { const date = new Date(article.date); return <Pressable key={article.id} accessibilityRole="button" accessibilityLabel={`${date.getDate()}, ${article.headline}, ${article.readingMinutes} minutes`} onPress={() => router.push({ pathname: "/article/[id]", params: { id: article.id } })} style={({ pressed }) => [styles.row, index < items.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, { opacity: pressed ? .6 : 1 }]}><View style={[styles.dateTile, { backgroundColor: colors.accentSoft }]}><AppText variant="caption" color={colors.accent}>{shortWeekday(date).toUpperCase()}</AppText><AppText variant="title2">{date.getDate()}</AppText></View><View style={styles.rowText}><AppText variant="title3" numberOfLines={3}>{article.headline}</AppText><AppText variant="metadata" color={colors.textTertiary}>{article.readingMinutes} min · OneArticle</AppText></View><AppText color={colors.textTertiary}>›</AppText></Pressable>; })}</View></View>)}</ScrollView>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: 18, paddingBottom: 42 }, title: { marginTop: 14 }, intro: { marginTop: 6 }, month: { marginTop: 32 }, monthTitle: { marginLeft: 5, marginBottom: 10 }, group: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" }, row: { minHeight: 96, flexDirection: "row", alignItems: "center", gap: 13, padding: 13 }, dateTile: { width: 54, height: 64, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 1 }, rowText: { flex: 1, gap: 6 } });
