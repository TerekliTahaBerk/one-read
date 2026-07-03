import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe("lib/resend", () => {
  const ENV_KEYS = ["RESEND_API_KEY", "FROM_EMAIL", "RESEND_FROM"] as const;
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    sendMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("getResendStatus reports no api key and the fallback sender when unconfigured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.FROM_EMAIL;
    delete process.env.RESEND_FROM;

    const { getResendStatus } = await import("@/lib/resend");
    const status = getResendStatus();

    expect(status.hasApiKey).toBe(false);
    expect(status.usingFallbackSender).toBe(true);
    expect(status.from).toBe("OneRead <onboarding@resend.dev>");
  });

  it("getResendStatus reports the configured api key and FROM_EMAIL", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.FROM_EMAIL = "OneRead <hello@oneread.email>";
    delete process.env.RESEND_FROM;

    const { getResendStatus } = await import("@/lib/resend");
    const status = getResendStatus();

    expect(status.hasApiKey).toBe(true);
    expect(status.usingFallbackSender).toBe(false);
    expect(status.from).toBe("OneRead <hello@oneread.email>");
  });

  it("getResendStatus falls back to legacy RESEND_FROM when FROM_EMAIL is unset", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    delete process.env.FROM_EMAIL;
    process.env.RESEND_FROM = "Legacy <legacy@oneread.email>";

    const { getResendStatus } = await import("@/lib/resend");
    const status = getResendStatus();

    expect(status.from).toBe("Legacy <legacy@oneread.email>");
  });

  it("sendDailyEmail resolves without throwing and skips sending when no API key is configured", async () => {
    delete process.env.RESEND_API_KEY;

    const { sendDailyEmail } = await import("@/lib/resend");
    const result = await sendDailyEmail({
      to: "reader@example.com",
      subject: "Subject",
      text: "text",
      html: "<p>html</p>",
    });

    expect(result).toEqual({});
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sendDailyEmail propagates an error when Resend returns an error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid `to` field" },
    });

    const { sendDailyEmail } = await import("@/lib/resend");

    await expect(
      sendDailyEmail({
        to: "not-an-email",
        subject: "Subject",
        text: "text",
        html: "<p>html</p>",
      }),
    ).rejects.toThrow("validation_error: Invalid `to` field");
  });

  it("sendDailyEmail returns the message id on success", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValue({ data: { id: "msg_123" }, error: null });

    const { sendDailyEmail } = await import("@/lib/resend");
    const result = await sendDailyEmail({
      to: "reader@example.com",
      subject: "Subject",
      text: "text",
      html: "<p>html</p>",
    });

    expect(result).toEqual({ messageId: "msg_123" });
  });
});
