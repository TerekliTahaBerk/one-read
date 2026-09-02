import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";

const prisma = vi.hoisted(() => ({
  oneArticleDelivery: { findMany: vi.fn(), update: vi.fn() },
  productSubscription: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { POST } from "./route";

const secretBytes = Buffer.from("launch-webhook-secret");
const secret = `whsec_${secretBytes.toString("base64")}`;

/** Builds a correctly signed Standard Webhooks request, as Resend sends them. */
function signedRequest(payload: unknown) {
  const body = JSON.stringify(payload);
  const id = "msg_webhook_1";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Request("https://www.oneread.email/api/webhook/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    },
    body,
  });
}

function event(type: string, createdAt: string) {
  return {
    type,
    created_at: createdAt,
    data: { email_id: "msg_123", to: ["reader@example.com"] },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_WEBHOOK_SECRET = secret;
  prisma.$transaction.mockResolvedValue([]);
  prisma.productSubscription.updateMany.mockResolvedValue({ count: 1 });
  prisma.oneArticleDelivery.update.mockImplementation((args: unknown) => args);
});

describe("POST /api/webhook/resend", () => {
  it("records a delivered event against the correlated delivery", async () => {
    prisma.oneArticleDelivery.findMany.mockResolvedValue([
      { id: "d1", providerStatus: "ACCEPTED", providerStatusAt: new Date("2026-09-02T08:00:00Z") },
    ]);

    const response = await POST(
      signedRequest(event("email.delivered", "2026-09-02T09:00:00Z")),
    );

    expect(response.status).toBe(200);
    expect(prisma.oneArticleDelivery.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: {
        providerStatus: "DELIVERED",
        providerStatusAt: new Date("2026-09-02T09:00:00Z"),
      },
    });
  });

  it("is idempotent: a duplicate delivered event writes nothing", async () => {
    prisma.oneArticleDelivery.findMany.mockResolvedValue([
      { id: "d1", providerStatus: "DELIVERED", providerStatusAt: new Date("2026-09-02T09:00:00Z") },
    ]);

    await POST(signedRequest(event("email.delivered", "2026-09-02T09:00:00Z")));

    expect(prisma.oneArticleDelivery.update).not.toHaveBeenCalled();
  });

  it("does not let a late delay event regress a confirmed delivery", async () => {
    prisma.oneArticleDelivery.findMany.mockResolvedValue([
      { id: "d1", providerStatus: "DELIVERED", providerStatusAt: new Date("2026-09-02T09:00:00Z") },
    ]);

    await POST(signedRequest(event("email.delivery_delayed", "2026-09-02T10:00:00Z")));

    expect(prisma.oneArticleDelivery.update).not.toHaveBeenCalled();
  });

  it.each(["email.bounced", "email.complained"])("suppresses email on %s", async (type) => {
    prisma.oneArticleDelivery.findMany.mockResolvedValue([]);

    await POST(signedRequest(event(type, "2026-09-02T09:00:00Z")));

    expect(prisma.productSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailDeliveryStatus: "SUPPRESSED" } }),
    );
  });

  it("does not suppress email on an ordinary delivery failure", async () => {
    prisma.oneArticleDelivery.findMany.mockResolvedValue([]);

    await POST(signedRequest(event("email.failed", "2026-09-02T09:00:00Z")));

    expect(prisma.productSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("ignores an unrecognised event type without touching the database", async () => {
    const response = await POST(
      signedRequest(event("email.opened", "2026-09-02T09:00:00Z")),
    );

    await expect(response.json()).resolves.toEqual({ ok: true, ignored: true });
    expect(prisma.oneArticleDelivery.findMany).not.toHaveBeenCalled();
  });

  it("rejects a request whose signature does not verify", async () => {
    const response = await POST(
      new Request("https://www.oneread.email/api/webhook/resend", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "webhook-id": "msg_1",
          "webhook-timestamp": Math.floor(Date.now() / 1000).toString(),
          "webhook-signature": "v1,not-a-valid-signature",
        },
        body: JSON.stringify(event("email.delivered", "2026-09-02T09:00:00Z")),
      }),
    );

    expect(response.status).toBe(403);
    expect(prisma.oneArticleDelivery.findMany).not.toHaveBeenCalled();
  });
});
