import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";
import { useTheme } from "@/design/useTheme";

const topics = [
  { icon: "sparkles-outline", selectedIcon: "sparkles", label: "Today" },
  { icon: "briefcase-outline", selectedIcon: "briefcase", label: "Macro" },
  { icon: "trending-up-outline", selectedIcon: "trending-up", label: "Ideas" },
  { icon: "business-outline", selectedIcon: "business", label: "Society" },
  { icon: "hardware-chip-outline", selectedIcon: "hardware-chip", label: "Science" },
] as const satisfies readonly { icon: IconName; selectedIcon: IconName; label: string }[];

export type TopicLabel = typeof topics[number]["label"];

export function TopicRail({ active = "Today", onChange }: { active?: TopicLabel; onChange?: (topic: TopicLabel) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.shell, { borderBottomColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {topics.map((topic) => {
          const selected = topic.label === active;
          return (
            <Pressable key={topic.label} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange?.(topic.label)} style={({ pressed }) => [styles.item, { opacity: pressed ? .55 : 1 }]}>
              <Icon name={selected ? topic.selectedIcon : topic.icon} color={selected ? colors.textPrimary : colors.textTertiary} size={21} />
              <AppText variant="caption" color={selected ? colors.textPrimary : colors.textTertiary} style={selected ? styles.selectedLabel : undefined}>{topic.label}</AppText>
              <View style={[styles.indicator, { backgroundColor: selected ? colors.textPrimary : "transparent" }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { marginHorizontal: -18, borderBottomWidth: StyleSheet.hairlineWidth },
  content: { paddingHorizontal: 18, gap: 24 },
  item: { minWidth: 48, alignItems: "center", gap: 6, paddingTop: 6 },
  selectedLabel: { fontFamily: "Inter_600SemiBold" },
  indicator: { width: 44, height: 2, borderRadius: 2, marginTop: 1 },
});
