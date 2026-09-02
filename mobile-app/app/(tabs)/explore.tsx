import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { ArticleCard } from "@/components/ArticleCard";
import { StatePanel } from "@/components/StatePanel";
import { useTheme } from "@/design/useTheme";
import { TopicRail, type TopicLabel } from "@/components/TopicRail";

const topicCopy: Record<TopicLabel, { title: string; subtitle: string }> = {
  Today: { title: "A little more", subtitle: "Four useful editions. Then, an end." },
  Macro: { title: "The bigger picture", subtitle: "Business, markets, energy and the forces behind the headlines." },
  Ideas: { title: "Ideas worth keeping", subtitle: "Fresh arguments, culture and better ways to see familiar things." },
  Society: { title: "How we live together", subtitle: "Cities, communities and the systems shaping daily life." },
  Science: { title: "Science in motion", subtitle: "Research, technology and patient explanations of a changing world." },
};

const validTopics = new Set<TopicLabel>(["Today", "Macro", "Ideas", "Society", "Science"]);

export default function Explore() {
  const auth = useAuth(); const { colors } = useTheme(); const params = useLocalSearchParams<{ topic?: string }>();
  const initialTopic = validTopics.has(params.topic as TopicLabel) ? params.topic as TopicLabel : "Ideas";
  const [active, setActive] = useState<TopicLabel>(initialTopic);
  const query = useQuery({ queryKey: ["explore", auth.token], queryFn: () => api.explore(auth.token!), enabled: Boolean(auth.token) });
  const allItems = query.data?.sections.flatMap((section) => section.items) ?? [];
  const items = active === "Today" ? allItems.slice(0, 4) : allItems.filter((article) => article.topics.includes(active));
  const copy = topicCopy[active];
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}><View style={styles.introBlock}><AppText variant="display" accessibilityRole="header">Explore</AppText><AppText color={colors.textSecondary} style={styles.intro}>A small shelf of useful reading. Curated, finite, and refreshed deliberately.</AppText></View><TopicRail active={active} onChange={setActive} /><View style={styles.section}><View style={styles.sectionHead}><View style={styles.headingCopy}><AppText variant="title1" accessibilityRole="header">{copy.title}</AppText><AppText variant="bodySmall" color={colors.textSecondary}>{copy.subtitle}</AppText></View><AppText variant="eyebrow" color={colors.accent}>{active.toUpperCase()}</AppText></View>{query.isError ? <StatePanel title="The shelf is unavailable." body="Your saved OneArticles are still available offline." /> : query.isLoading ? <StatePanel title="Curating your shelf…" body="Finding a few useful things." /> : items.length > 0 ? <>{items.map((article) => <ArticleCard key={article.id} article={article} feed />)}<AppText variant="caption" color={colors.textTertiary} style={styles.finished}>You’ve reached the end of this selection.</AppText></> : <StatePanel title={`Nothing in ${active} today.`} body="OneRead keeps each shelf deliberately small. Try another topic." />}</View></ScrollView>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: 18, paddingBottom: 42 }, introBlock: { marginTop: 14, marginBottom: 22 }, intro: { marginTop: 6, maxWidth: 340 }, section: { marginTop: 28 }, sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 18 }, headingCopy: { flex: 1 }, finished: { textAlign: "center", marginTop: 12 } });
