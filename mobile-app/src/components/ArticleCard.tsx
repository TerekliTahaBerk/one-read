import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import type { Article } from "@/types/article";
import { AppText } from "./AppText";
import { Mascot } from "./Mascot";
import { Icon } from "./Icon";
import { useTheme } from "@/design/useTheme";
import { shortDate } from "@/utils/date";

const washes = ["#DCEAF5", "#E8E0F1", "#F5DFD3", "#DCEDE5", "#F4E8B8"];

function washFor(id: string) {
  return washes[[...id].reduce((total, char) => total + char.charCodeAt(0), 0) % washes.length];
}

function Artwork({ article, dominant }: { article: Article; dominant: boolean }) {
  const { colors, dark } = useTheme();
  const wash = dark ? colors.accentSoft : washFor(article.id);
  return (
    <View style={[dominant ? styles.heroArt : styles.thumb, { backgroundColor: wash }]}> 
      {article.heroImage ? (
        <Image source={{ uri: article.heroImage.url }} contentFit="cover" transition={180} style={StyleSheet.absoluteFill} accessibilityLabel={article.heroImage.alt} />
      ) : (
        <>
          <View style={[styles.orbit, dominant ? styles.heroOrbit : styles.thumbOrbit, { borderColor: colors.textPrimary }]} />
          <View style={[styles.horizon, { backgroundColor: colors.textPrimary }]} />
          <View style={dominant ? styles.heroMascot : styles.thumbMascot}><Mascot size={dominant ? 118 : 68} /></View>
        </>
      )}
    </View>
  );
}

export function ArticleCard({ article, dominant = false, feed = false }: { article: Article; dominant?: boolean; feed?: boolean }) {
  const { colors } = useTheme();
  if (feed) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${article.headline}, ${article.readingMinutes} minute read`} onPress={() => router.push({ pathname: "/article/[id]", params: { id: article.id } })} style={({ pressed }) => [styles.feed, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? .72 : 1 }]}>
        <View style={styles.feedByline}><View style={[styles.sourceMark, { backgroundColor: colors.accentSoft }]}><AppText variant="metadata" color={colors.accent}>1</AppText></View><AppText variant="bodySmall" color={colors.textSecondary}>{article.source?.name ?? "OneRead desk"}</AppText><AppText variant="bodySmall" color={colors.textTertiary}>· {shortDate(article.date)}</AppText><Icon name="ellipsis-horizontal" color={colors.textTertiary} size={19} style={styles.more} /></View>
        <AppText variant="title2" style={styles.feedTitle}>{article.headline}</AppText>
        {article.deck ? <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={4} style={styles.feedDeck}>{article.deck}</AppText> : null}
        <View style={[styles.feedMeta, { borderTopColor: colors.border }]}><AppText variant="metadata" color={colors.textTertiary}>{article.readingMinutes} min read</AppText><AppText variant="metadata" color={colors.accent}>OneArticle</AppText></View>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${article.headline}, ${article.readingMinutes} minute read`}
      onPress={() => router.push({ pathname: "/article/[id]", params: { id: article.id } })}
      style={({ pressed }) => [dominant ? styles.dominant : styles.compact, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? .72 : 1 }]}
    >
      <Artwork article={article} dominant={dominant} />
      <View style={dominant ? styles.heroText : styles.compactText}>
        <AppText variant="eyebrow" color={colors.accent}>{dominant ? "TODAY’S ONEARTICLE" : "ONEARTICLE"}</AppText>
        <AppText variant={dominant ? "title1" : "title3"} style={styles.headline} numberOfLines={dominant ? 4 : 3}>{article.headline}</AppText>
        {dominant && article.deck ? <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={3}>{article.deck}</AppText> : null}
        <View style={styles.metaRow}>
          <AppText variant="metadata" color={colors.textTertiary}>{article.readingMinutes} min · {article.source?.name ?? "OneRead"}</AppText>
          <Icon name="arrow-forward" color={colors.textPrimary} size={20} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dominant: { borderRadius: 24, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, shadowColor: "#111", shadowOpacity: .07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  compact: { minHeight: 124, flexDirection: "row", borderRadius: 18, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, marginBottom: 13 },
  feed: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 18, marginBottom: 14 },
  feedByline: { flexDirection: "row", alignItems: "center", gap: 8 },
  sourceMark: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  more: { marginLeft: "auto" },
  feedTitle: { marginTop: 15 },
  feedDeck: { marginTop: 10, lineHeight: 23 },
  feedMeta: { marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroArt: { height: 188, overflow: "hidden" },
  thumb: { width: 108, minHeight: 124, overflow: "hidden" },
  orbit: { position: "absolute", borderWidth: 1.2, borderRadius: 999, opacity: .7 },
  heroOrbit: { width: 116, height: 116, left: 30, top: 28 },
  thumbOrbit: { width: 64, height: 64, left: 12, top: 16 },
  horizon: { position: "absolute", height: 1, left: 18, right: 18, bottom: 30, opacity: .72 },
  heroMascot: { position: "absolute", right: 24, bottom: 11 },
  thumbMascot: { position: "absolute", right: -7, bottom: 1 },
  heroText: { padding: 20, gap: 8 },
  compactText: { flex: 1, padding: 15, gap: 6, justifyContent: "center" },
  headline: { maxWidth: 360 },
  metaRow: { marginTop: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
});
