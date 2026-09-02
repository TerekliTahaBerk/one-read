import * as Sentry from "@sentry/nextjs";
import { beforeSendPrivacy } from "@/lib/sentry-privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: beforeSendPrivacy,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
