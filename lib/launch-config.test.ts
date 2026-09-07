import { afterEach, describe, expect, it, vi } from "vitest";
import { configureAllOffers, clearOfferEnv } from "@/test/fixtures/polar-offers";
import { validatePublicLaunchConfiguration } from "./launch-config";

afterEach(() => { clearOfferEnv(); vi.unstubAllEnvs(); });

describe("C5 launch configuration", () => {
  it("fails closed when production activation is incomplete", () => {
    expect(validatePublicLaunchConfiguration({})).toMatchObject({ ready: false });
  });

  it("accepts six unique offers and explicit independent launch flags", () => {
    configureAllOffers();
    const env = {
      ...process.env,
      POLAR_ACCESS_TOKEN: "test", POLAR_WEBHOOK_SECRET: "test", RESEND_API_KEY: "re_test",
      FROM_EMAIL: "OneRead <hello@oneread.email>", RESEND_REPLY_TO: "hello@oneread.email",
      RESEND_WEBHOOK_SECRET: "whsec_test", EMAIL_VERIFICATION_SECRET: "test", POLAR_SERVER: "production",
      PUBLIC_CHECKOUT_ENABLED: "true", PUBLIC_BASE_URL: "https://oneread.test", ONENEWS_DELIVERY_ENABLED: "false",
      BETTER_STACK_DAILY_CRON_HEARTBEAT_URL: "https://heartbeat.example.test/daily-secret",
    };
    expect(validatePublicLaunchConfiguration(env)).toEqual({ ready: true, problems: [] });
  });
});
