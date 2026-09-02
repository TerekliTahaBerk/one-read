import { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Fraunces_500Medium } from "@expo-google-fonts/fraunces/500Medium";
import { Fraunces_500Medium_Italic } from "@expo-google-fonts/fraunces/500Medium_Italic";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProviders } from "@/providers/AppProviders";
import { useTheme } from "@/design/useTheme";
import { ThemeProvider } from "@/design/ThemeProvider";
import { internalDestination } from "@/utils/links";
import "@/analytics/observability";

void SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

function Navigation() {
  const { colors, dark } = useTheme();
  return <><StatusBar style={dark ? "light" : "dark"} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "fade_from_bottom" }} /></>;
}

export default function RootLayout() {
  const [loaded] = useFonts({ Fraunces_500Medium, Fraunces_500Medium_Italic, Inter_400Regular, Inter_600SemiBold });
  useEffect(() => { if (loaded) void SplashScreen.hideAsync(); }, [loaded]);
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    const destination = typeof url === "string" ? internalDestination(url) : "/(tabs)";
    if (destination) router.push(destination as never);
    });
    return () => subscription.remove();
  }, []);
  if (!loaded) return null;
  return <SafeAreaProvider><ThemeProvider><AppProviders><Navigation /></AppProviders></ThemeProvider></SafeAreaProvider>;
}
