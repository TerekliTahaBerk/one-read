import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/auth/AuthProvider";
import { useTheme } from "@/design/useTheme";

export default function Index() {
  const auth = useAuth();
  const { colors } = useTheme();
  if (!auth.ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  return <Redirect href={auth.token ? "/(tabs)" : "/(auth)/welcome"} />;
}
