import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const environment = (Constants.expoConfig?.extra?.environment as string | undefined) ?? "development";
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  environment,
  sendDefaultPii: false,
  tracesSampleRate: environment === "production" ? 0.05 : 0,
  beforeSend(event) {
    if (event.request) { delete event.request.headers; delete event.request.cookies; delete event.request.data; }
    if (event.user) event.user = { id: event.user.id };
    return event;
  },
});

const allowedEvents = new Set(["app_open", "auth_started", "auth_completed", "today_viewed", "daily_article_opened", "daily_article_completed", "original_source_opened", "explore_item_opened", "notification_enabled", "notification_opened"]);
export function track(event: string, values?: Record<string, string | number | boolean>) {
  if (!allowedEvents.has(event)) return;
  Sentry.addBreadcrumb({ category: "product", message: event, data: values, level: "info" });
}
