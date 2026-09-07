import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ captureException: vi.fn(), captureMessage: vi.fn(), flush: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);

import { reportOperationalEvent, telemetryId } from "./observability";

describe("canonical observability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sentry.captureException.mockReset();
    sentry.captureMessage.mockReset();
    sentry.flush.mockReset();
    process.env.SENTRY_DSN = "https://public@example.invalid/1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_GIT_COMMIT_SHA = "1234567890abcdef";
  });

  it("emits the same canonical, PII-safe context to logs and Sentry", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await reportOperationalEvent("delivery_failed", {
      subsystem: "delivery",
      productKey: "one-article",
      operation: "send_editorial",
      outcome: "failed",
      state: "provider_rejected",
      correlationId: "provider-message-123",
      retryClassification: "reconciliation_required",
      errorCode: "provider_error",
      metadata: { message: "reader@example.com postgresql://u:p@db/app", rawPayload: { secret: "x" } },
    }, { error: new Error("reader@example.com failed"), flush: true });

    const fields = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(fields).toMatchObject({
      subsystem: "delivery", product_key: "one-article", operation: "send_editorial", outcome: "failed",
      state: "provider_rejected", environment: "preview", release_sha: "1234567890ab",
      correlation_id: telemetryId("provider-message-123"), retry_classification: "reconciliation_required",
    });
    expect(JSON.stringify(fields)).not.toContain("reader@example.com");
    expect(JSON.stringify(fields)).not.toContain("postgresql://");
    expect(fields.rawPayload).toBe("[Filtered]");
    expect(sentry.captureException).toHaveBeenCalledOnce();
    expect(sentry.flush).toHaveBeenCalledWith(2000);
  });
});
