import { describe, expect, it } from "vitest";
import { resolveResendConfiguration, validateResendProductionConfiguration } from "./resend-config";

const valid = {
  RESEND_API_KEY: "re_production",
  FROM_EMAIL: "OneRead <hello@oneread.email>",
  RESEND_REPLY_TO: "hello@oneread.email",
  RESEND_WEBHOOK_SECRET: "whsec_production",
};

describe("Resend production configuration", () => {
  it("accepts the authenticated OneRead sender contract", () => {
    expect(validateResendProductionConfiguration(valid)).toEqual([]);
  });

  it("rejects development and foreign-domain senders", () => {
    expect(validateResendProductionConfiguration({ ...valid, FROM_EMAIL: undefined }))
      .toContain("A production Resend sender is not configured.");
    expect(validateResendProductionConfiguration({ ...valid, FROM_EMAIL: "OneRead <hello@example.com>" }))
      .toContain("Resend sender must use the verified oneread.email domain.");
  });

  it("requires the operational reply mailbox and webhook signing secret", () => {
    const problems = validateResendProductionConfiguration({
      ...valid,
      RESEND_REPLY_TO: "support@example.com",
      RESEND_WEBHOOK_SECRET: "not-a-resend-secret",
    });
    expect(problems).toContain("RESEND_REPLY_TO must be hello@oneread.email.");
    expect(problems).toContain("RESEND_WEBHOOK_SECRET does not have the expected signing-secret format.");
  });

  it("keeps RESEND_FROM as a backwards-compatible alias", () => {
    const config = resolveResendConfiguration({ ...valid, FROM_EMAIL: undefined, RESEND_FROM: "OneRead <hello@oneread.email>" });
    expect(config.from).toBe("OneRead <hello@oneread.email>");
  });
});
