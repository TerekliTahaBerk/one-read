import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { ArticleCard } from "@/components/ArticleCard";
import { StatePanel } from "@/components/StatePanel";
import { useTheme } from "@/design/useTheme";
import { longDate } from "@/utils/date";
import { cacheArticle, readCachedArticle } from "@/storage/session";
import type { Today } from "@/types/article";
import { TopicRail, type TopicLabel } from "@/components/TopicRail";
import { Icon, type IconName } from "@/components/Icon";

const copy = {
  UPCOMING: ["A little early.", "Today’s OneArticle will appear here when the edition is ready."],
  NO_EDITION: ["No edition today.", "OneRead publishes every weekday. Your inbox and this space will be ready next time."],
  SUBSCRIPTION_REQUIRED: ["OneRead access needed.", "This reader is available to current subscribers. Your email delivery settings remain unchanged."],
  ACCOUNT_INCOMPLETE: ["One choice left.", "Choose your reading language in Settings so email and iOS stay in sync."],
} as const;

export default function TodayScreen() {
  const auth = useAuth(); const { colors } = useTheme();
  const [offline, setOffline] = useState(false);
  const query = useQuery({ queryKey: ["today", auth.token], queryFn: async () => {
    try { const value = await api.today(auth.token!); setOffline(false); await cacheArticle("today", value); return value; }
    catch (error) { const saved = await readCachedArticle("today") as Today | null; if (saved) { setOffline(true); return saved; } throw error; }
  }, enabled: Boolean(auth.token) });
  const now = new Date(); const greeting = now.getHours() < 12 ? "Good morning." : now.getHours() < 18 ? "Good afternoon." : "Good evening.";
  const formattedDate = longDate(now);
  const openTopic = (topic: TopicLabel) => { if (topic !== "Today") router.push({ pathname: "/(tabs)/explore", params: { topic } }); };
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.accent} />}><View style={styles.intro}><AppText variant="display" accessibilityRole="header">{greeting}</AppText><AppText variant="bodySmall" color={colors.textTertiary}>{formattedDate}</AppText></View><TopicRail onChange={openTopic} />{offline ? <View accessibilityRole="alert" style={[styles.offline, { backgroundColor: colors.accentSoft }]}><AppText variant="bodySmall">You’re offline. Today’s saved OneArticle is still available.</AppText></View> : null}{query.isLoading ? <StatePanel title="Preparing your edition…" body="This should only take a moment." /> : query.isError ? <StatePanel title="We couldn’t reach OneRead." body="Pull to try again. Saved articles remain available in your Library." /> : query.data?.issue ? <><View style={styles.stack}><View style={[styles.stackBack, styles.stackBackFar, { backgroundColor: colors.border }]} /><View style={[styles.stackBack, styles.stackBackNear, { backgroundColor: colors.surfaceElevated }]} /><ArticleCard article={query.data.issue} dominant /></View><View style={styles.quickSection}><AppText variant="metadata" color={colors.textSecondary}>Quick links</AppText><View style={styles.quickGrid}><QuickLink title="Explore" detail="Recent editions" icon="compass-outline" onPress={() => router.push("/(tabs)/explore")} /><QuickLink title="Preferences" detail="Tune your reading" icon="options-outline" onPress={() => router.push("/settings/preferences")} /></View></View><View style={[styles.end, { borderTopColor: colors.border }]}><AppText variant="title2">One useful thing at a time.</AppText><AppText variant="bodySmall" color={colors.textSecondary}>No endless feed, no unread-count anxiety. Tomorrow’s edition will wait here.</AppText></View></> : query.data ? <StatePanel title={copy[query.data.state as keyof typeof copy]?.[0] ?? "Not available yet."} body={copy[query.data.state as keyof typeof copy]?.[1] ?? "Please check again soon."} /> : null}</ScrollView>;
}

function QuickLink({ title, detail, icon, onPress }: { title: string; detail: string; icon: IconName; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickLink, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? .7 : 1 }]}><Icon name={icon} color={colors.accent} size={25} style={styles.quickIcon} /><AppText variant="metadata">{title}</AppText><AppText variant="caption" color={colors.textTertiary}>{detail}</AppText></Pressable>;
}

const styles = StyleSheet.create({ content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 42 }, intro: { marginTop: 14, marginBottom: 18, gap: 4 }, offline: { marginTop: 14, padding: 12, borderRadius: 10 }, stack: { marginTop: 22, marginRight: 5, marginBottom: 10 }, stackBack: { position: "absolute", left: 12, right: -8, borderRadius: 24 }, stackBackFar: { top: 16, bottom: -12, opacity: .55 }, stackBackNear: { top: 8, bottom: -6, opacity: .9 }, quickSection: { marginTop: 38, gap: 12 }, quickGrid: { flexDirection: "row", gap: 10 }, quickLink: { flex: 1, minHeight: 116, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, justifyContent: "flex-end", gap: 4 }, quickIcon: { marginBottom: "auto" }, end: { marginTop: 30, paddingTop: 26, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 } });
