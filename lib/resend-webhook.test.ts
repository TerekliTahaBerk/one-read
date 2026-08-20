import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { resendEventRecipients, verifyResendWebhook } from "./resend-webhook";

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
