import { Tabs, router } from "expo-router";
import { Pressable, StyleSheet, type ColorValue } from "react-native";
import { AppText } from "@/components/AppText";
import { Icon, type IconName } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { useTheme } from "@/design/useTheme";

function TabGlyph({ name, selectedName, color, focused }: { name: IconName; selectedName: IconName; color: ColorValue; focused: boolean }) { return <Pressable pointerEvents="none" style={[styles.glyphRing, focused && { borderColor: color }]}><Icon name={focused ? selectedName : name} color={color} size={24} /></Pressable>; }
export default function TabsLayout() {
  const { colors } = useTheme();
  return <Tabs screenOptions={{ headerShown: true, headerTitle: () => <AppText style={styles.wordmark}>OneRead</AppText>, headerTitleAlign: "left", headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, tabBarShowLabel: false, tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, height: 76, paddingTop: 8 }, tabBarActiveTintColor: colors.textPrimary, tabBarInactiveTintColor: colors.textTertiary, headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel="Account and settings" hitSlop={10} onPress={() => router.push("/settings")} style={[styles.avatar, { backgroundColor: colors.accentSoft }]}><Mascot size={39} /></Pressable> }}><Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Home", tabBarIcon: ({ color, focused }) => <TabGlyph name="home-outline" selectedName="home" color={color} focused={focused} /> }} /><Tabs.Screen name="listen" options={{ title: "Listen", tabBarAccessibilityLabel: "Listen", tabBarIcon: ({ color, focused }) => <TabGlyph name="headset-outline" selectedName="headset" color={color} focused={focused} /> }} /><Tabs.Screen name="explore" options={{ title: "Explore", tabBarAccessibilityLabel: "Explore", tabBarIcon: ({ color, focused }) => <TabGlyph name="compass-outline" selectedName="compass" color={color} focused={focused} /> }} /><Tabs.Screen name="library" options={{ href: null }} /></Tabs>;
}
const styles = StyleSheet.create({ glyphRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.25, borderColor: "transparent", alignItems: "center", justifyContent: "center" }, wordmark: { fontFamily: "Fraunces_500Medium", fontSize: 25, lineHeight: 30, letterSpacing: -.45 }, avatar: { marginRight: 18, width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden" } });
