import type { ExpoConfig } from "expo/config";

const environment = process.env.APP_ENV ?? "development";

const config: ExpoConfig = {
  name: environment === "production" ? "OneRead" : `OneRead (${environment})`,
  slug: "oneread",
  owner: process.env.EXPO_OWNER,
  version: "1.0.0",
  orientation: "portrait",
  scheme: "oneread",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: environment === "production" ? "email.oneread.ios" : `email.oneread.ios.${environment}`,
    buildNumber: "1",
    associatedDomains: ["applinks:www.oneread.email"],
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    "expo-router",
    "expo-audio",
    "expo-secure-store",
    "expo-notifications",
    ["expo-splash-screen", { image: "./assets/oneread-splash.svg.png", imageWidth: 160, resizeMode: "contain", backgroundColor: "#F5F0E8", dark: { backgroundColor: "#171513" } }],
    ["@sentry/react-native/expo", { organization: process.env.SENTRY_ORG ?? "configure-me", project: process.env.SENTRY_PROJECT ?? "oneread-ios" }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  runtimeVersion: { policy: "appVersion" },
  updates: { fallbackToCacheTimeout: 0 },
  extra: {
    environment,
    apiOrigin: process.env.EXPO_PUBLIC_API_ORIGIN ?? "https://www.oneread.email",
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
