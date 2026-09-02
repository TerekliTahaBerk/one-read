import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  parseResendDeliveryEvent,
  resendEventRecipients,
  shouldApplyProviderEvent,
  verifyResendWebhook,
} from "./resend-webhook";

const secretBytes = Buffer.from("launch-webhook-secret");
const secret = `whsec_${secretBytes.toString("base64")}`;
const now = new Date("2026-08-20T12:00:00Z");

function signedHeaders(body: string, timestamp = Math.floor(now.getTime() / 1000)) {
  const id = "msg_launch_1";
  const signature = createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": `v1,${signature}`,
  });
}

describe("verifyResendWebhook", () => {
  it("accepts an authentic fresh raw payload", () => {
    const body = JSON.stringify({ type: "email.bounced" });
    expect(verifyResendWebhook({ body, headers: signedHeaders(body), secret, now })).toBe(true);
  });

  it("rejects tampering and replay outside the five-minute window", () => {
    const body = JSON.stringify({ type: "email.complained" });
    expect(verifyResendWebhook({ body: `${body} `, headers: signedHeaders(body), secret, now })).toBe(false);
    expect(verifyResendWebhook({
      body,
      headers: signedHeaders(body, Math.floor(now.getTime() / 1000) - 301),
      secret,
      now,
    })).toBe(false);
  });
});

describe("resendEventRecipients", () => {
  it("normalizes and deduplicates recipient addresses", () => {
    expect(resendEventRecipients({ data: { to: [" Reader@Example.com ", "reader@example.com"] } }))
      .toEqual(["reader@example.com"]);
  });
});

describe("provider delivery events", () => {
  it.each([
    ["email.sent", "ACCEPTED"],
    ["email.delivered", "DELIVERED"],
    ["email.delivery_delayed", "DELAYED"],
    ["email.failed", "FAILED"],
    ["email.bounced", "BOUNCED"],
    ["email.complained", "COMPLAINED"],
  ])("maps %s to %s without retaining the raw body", (type, status) => {
    const event = parseResendDeliveryEvent({
      type,
      created_at: "2026-09-02T08:00:00Z",
      data: { email_id: "msg_123", to: ["reader@example.com"], secret: "must-not-survive" },
    });
    expect(event).toEqual({
      type,
      status,
      messageId: "msg_123",
      occurredAt: new Date("2026-09-02T08:00:00Z"),
      recipients: ["reader@example.com"],
    });
  });

  it("ignores duplicate and older events and does not regress terminal state", () => {
    const current = { providerStatus: "DELIVERED", providerStatusAt: new Date("2026-09-02T09:00:00Z") };
    expect(shouldApplyProviderEvent(current, { status: "DELAYED", occurredAt: new Date("2026-09-02T08:00:00Z") })).toBe(false);
    expect(shouldApplyProviderEvent(current, { status: "DELIVERED", occurredAt: new Date("2026-09-02T09:00:00Z") })).toBe(false);
    expect(shouldApplyProviderEvent(current, { status: "DELAYED", occurredAt: new Date("2026-09-02T10:00:00Z") })).toBe(false);
  });
});
