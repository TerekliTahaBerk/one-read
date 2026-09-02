import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as Speech from "expo-speech";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Mascot } from "@/components/Mascot";
import { Icon } from "@/components/Icon";
import { StatePanel } from "@/components/StatePanel";
import { useTheme } from "@/design/useTheme";
import type { Article } from "@/types/article";

type PlayerState = "idle" | "playing" | "paused";

function narration(article: Article) {
  const body = article.blocks.flatMap((block) => {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "sourceNote") return [block.text];
    if (block.type === "quote") return [block.text, block.attribution ?? ""];
    if (block.type === "callout") return [block.title ?? "", block.text];
    return [];
  });
  return [article.headline, article.deck ?? "", ...body].filter(Boolean).join(". ").slice(0, Speech.maxSpeechInputLength);
}

export default function Listen() {
  const auth = useAuth(); const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<string>(); const [player, setPlayer] = useState<PlayerState>("idle");
  const today = useQuery({ queryKey: ["today", auth.token], queryFn: () => api.today(auth.token!), enabled: Boolean(auth.token) });
  const explore = useQuery({ queryKey: ["explore", auth.token], queryFn: () => api.explore(auth.token!), enabled: Boolean(auth.token) });
  const editions = useMemo(() => [today.data?.issue, ...(explore.data?.sections.flatMap((section) => section.items) ?? [])].filter((item): item is Article => Boolean(item?.listen.enabled)), [explore.data, today.data]);
  const selected = editions.find((item) => item.id === selectedId) ?? editions[0];
  const audioPlayer = useAudioPlayer(selected?.listen.audioUrl ?? null, { updateInterval: 300 });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const masteredAudio = Boolean(selected?.listen.audioUrl);
  const isPlaying = masteredAudio ? audioStatus.playing : player === "playing";

  useEffect(() => () => { void Speech.stop(); }, []);

  const chooseEdition = (id: string) => {
    audioPlayer.pause();
    void Speech.stop();
    setPlayer("idle");
    setSelectedId(id);
  };

  const toggle = async () => {
    if (!selected) return;
    if (masteredAudio) {
      await Speech.stop();
      if (audioStatus.playing) audioPlayer.pause();
      else audioPlayer.play();
      return;
    }
    if (player === "playing") { await Speech.pause(); setPlayer("paused"); return; }
    if (player === "paused") { await Speech.resume(); setPlayer("playing"); return; }
    Speech.speak(narration(selected), { language: selected.readingLanguage.toLowerCase().startsWith("tr") ? "tr-TR" : "en-US", rate: .92, pitch: 1, onStart: () => setPlayer("playing"), onDone: () => setPlayer("idle"), onStopped: () => setPlayer("idle"), onError: () => setPlayer("idle") });
  };

  if (today.isLoading) return <View style={[styles.full, { backgroundColor: colors.background }]}><StatePanel title="Preparing OneRead Listen…" body="Tuning today’s edition for you." /></View>;
  if (!selected) return <View style={[styles.full, { backgroundColor: colors.background }]}><StatePanel title="Nothing to listen to yet." body="Today’s narrated OneArticle will appear here when it is ready." /></View>;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}><View style={styles.intro}><AppText variant="display" accessibilityRole="header">Listen</AppText><AppText color={colors.textSecondary}>One useful story, read aloud.</AppText></View><View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.cover, { backgroundColor: colors.accentSoft }]}>{selected.heroImage ? <Image source={{ uri: selected.heroImage.url }} contentFit="cover" transition={180} style={StyleSheet.absoluteFill} accessibilityLabel={selected.heroImage.alt} /> : <><View style={[styles.coverOrbit, { borderColor: colors.textPrimary }]} /><View style={[styles.coverLine, { backgroundColor: colors.textPrimary }]} /><View style={styles.coverMascot}><Mascot size={126} /></View><AppText variant="display" style={styles.coverWord}>OneRead</AppText></>}</View><View style={styles.heroCopy}><AppText variant="eyebrow" color={colors.accent}>ONEREAD LISTEN</AppText><AppText variant="title1" style={styles.title}>{selected.headline}</AppText><AppText variant="bodySmall" color={colors.textSecondary}>{selected.source?.name ?? "OneRead desk"} · {selected.listen.durationSeconds ? `${Math.max(1, Math.round(selected.listen.durationSeconds / 60))} min audio` : `${selected.readingMinutes} min`}</AppText><Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? "Pause narration" : "Play narration"} onPress={() => void toggle()} style={({ pressed }) => [styles.play, { backgroundColor: colors.textPrimary, opacity: pressed ? .75 : 1 }]}><Icon name={isPlaying ? "pause" : "play"} color={colors.background} size={19} /><AppText variant="metadata" color={colors.background}>{isPlaying ? "Pause" : !masteredAudio && player === "paused" ? "Continue" : "Listen"}</AppText></Pressable><View style={styles.dots}><View style={[styles.dot, { backgroundColor: colors.textPrimary }]} /><View style={[styles.dot, { backgroundColor: colors.border }]} /><View style={[styles.dot, { backgroundColor: colors.border }]} /></View></View></View><View style={styles.week}><AppText variant="title2">This week</AppText><AppText variant="bodySmall" color={colors.textSecondary}>Choose an edition to hear next.</AppText><View style={styles.queue}>{editions.slice(0, 4).map((article, index) => <Pressable key={article.id} accessibilityRole="button" accessibilityState={{ selected: article.id === selected.id }} onPress={() => chooseEdition(article.id)} style={({ pressed }) => [styles.row, { backgroundColor: article.id === selected.id ? colors.accentSoft : colors.surface, borderColor: colors.border, opacity: pressed ? .7 : 1 }]}><View style={[styles.rowNumber, { borderColor: colors.border }]}><AppText variant="metadata" color={article.id === selected.id ? colors.accent : colors.textTertiary}>{String(index + 1).padStart(2, "0")}</AppText></View><View style={styles.rowCopy}><AppText variant="title3" numberOfLines={2}>{article.headline}</AppText><AppText variant="caption" color={colors.textTertiary}>{article.listen.durationSeconds ? `${Math.max(1, Math.round(article.listen.durationSeconds / 60))} min` : `${article.readingMinutes} min`} · {article.source?.name ?? "OneRead"}</AppText></View><Icon name={article.id === selected.id && isPlaying ? "ellipsis-horizontal" : "play"} color={article.id === selected.id ? colors.accent : colors.textTertiary} size={20} /></Pressable>)}</View></View></ScrollView>;
}

const styles = StyleSheet.create({ full: { flex: 1 }, content: { paddingHorizontal: 18, paddingBottom: 44 }, intro: { marginTop: 14, marginBottom: 22, gap: 4 }, hero: { borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" }, cover: { height: 270, overflow: "hidden" }, coverOrbit: { position: "absolute", width: 134, height: 134, borderRadius: 67, borderWidth: 1.2, left: 26, top: 31, opacity: .68 }, coverLine: { position: "absolute", height: 1, left: 23, right: 23, bottom: 43, opacity: .7 }, coverMascot: { position: "absolute", right: 20, bottom: 7 }, coverWord: { position: "absolute", left: 24, bottom: 25 }, heroCopy: { alignItems: "center", padding: 24 }, title: { marginTop: 10, textAlign: "center", maxWidth: 360 }, play: { minWidth: 154, minHeight: 54, paddingHorizontal: 25, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11, marginTop: 24 }, dots: { flexDirection: "row", gap: 7, marginTop: 20 }, dot: { width: 7, height: 7, borderRadius: 4 }, week: { marginTop: 34 }, queue: { marginTop: 16, gap: 11 }, row: { minHeight: 92, padding: 13, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12 }, rowNumber: { width: 42, height: 42, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" }, rowCopy: { flex: 1, gap: 4 } });
