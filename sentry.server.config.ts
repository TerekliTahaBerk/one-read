import * as Sentry from "@sentry/nextjs";
import { beforeSendPrivacy } from "@/lib/sentry-privacy";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: beforeSendPrivacy,
});
