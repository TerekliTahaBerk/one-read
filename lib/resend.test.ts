import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe("lib/resend", () => {
  const ENV_KEYS = ["RESEND_API_KEY", "FROM_EMAIL", "RESEND_FROM", "RESEND_REPLY_TO", "RESEND_WEBHOOK_SECRET"] as const;
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    sendMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
    expect(status.productionReady).toBe(false);
  });

  it("getResendStatus reports the configured api key and FROM_EMAIL", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.FROM_EMAIL = "OneRead <hello@oneread.email>";
    process.env.RESEND_REPLY_TO = "hello@oneread.email";
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
    delete process.env.RESEND_FROM;

    const { getResendStatus } = await import("@/lib/resend");
    const status = getResendStatus();

    expect(status.hasApiKey).toBe(true);
    expect(status.usingFallbackSender).toBe(false);
    expect(status.from).toBe("OneRead <hello@oneread.email>");
    expect(status.productionReady).toBe(true);
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

  it("fails closed before calling Resend when production configuration is unsafe", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.FROM_EMAIL = "OneRead <onboarding@resend.dev>";
    delete process.env.RESEND_REPLY_TO;
    delete process.env.RESEND_WEBHOOK_SECRET;

    const { sendDailyEmail } = await import("@/lib/resend");
    await expect(sendDailyEmail({
      to: "reader@example.com",
      subject: "Subject",
      text: "text",
      html: "<p>html</p>",
    })).rejects.toThrow("Production email configuration is unsafe");
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

  it("classifies a transport exception as ambiguous so callers never auto-resend", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockRejectedValue(new Error("socket closed after write"));

    const { ResendDeliveryError, sendDailyEmail } = await import("@/lib/resend");
    const error = await sendDailyEmail({
      to: "reader@example.com", subject: "Subject", text: "text", html: "<p>html</p>",
      operation: "send_editorial", productKey: "one-article", idempotencyKey: "delivery-1",
    }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ResendDeliveryError);
    expect(error.kind).toBe("ambiguous_outcome");
  });

  it("classifies a success-shaped response without a message id as ambiguous", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValue({ data: {}, error: null });

    const { sendDailyEmail } = await import("@/lib/resend");
    await expect(sendDailyEmail({
      to: "reader@example.com", subject: "Subject", text: "text", html: "<p>html</p>",
    })).rejects.toMatchObject({ kind: "ambiguous_outcome" });
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

  it("adds reply-to and RFC 8058 headers only for editorial mail", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.FROM_EMAIL = "OneRead <hello@oneread.email>";
    process.env.RESEND_REPLY_TO = "hello@oneread.email";
    sendMock.mockResolvedValue({ data: { id: "msg_123" }, error: null });

    const { sendDailyEmail } = await import("@/lib/resend");
    await sendDailyEmail({
      to: "reader@example.com",
      subject: "Editorial",
      text: "text",
      html: "<p>html</p>",
      unsubscribeUrl: "https://www.oneread.email/api/unsubscribe?token=signed",
    });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: "hello@oneread.email",
      headers: {
        "List-Unsubscribe": "<https://www.oneread.email/api/unsubscribe?token=signed>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }), undefined);
  });
});
