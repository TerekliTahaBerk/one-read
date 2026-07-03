import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { WebhookVerificationError } from "@polar-sh/sdk/webhooks";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

const applyPolarWebhookPayload = vi.fn();
vi.mock("@/lib/billing/polar", () => ({
  applyPolarWebhookPayload: (...args: unknown[]) => applyPolarWebhookPayload(...args),
}));

const validateEvent = vi.fn();
vi.mock("@polar-sh/sdk/webhooks", async () => {
  const actual = await vi.importActual<typeof import("@polar-sh/sdk/webhooks")>(
    "@polar-sh/sdk/webhooks",
  );
  return {
    ...actual,
    validateEvent: (...args: unknown[]) => validateEvent(...args),
  };
});

import { POST } from "@/app/api/webhook/polar/route";
import { prisma as prismaImport } from "@/lib/prisma";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/webhook/polar", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "webhook-id": "evt_test_1" },
  });
}

describe("POST /api/webhook/polar", () => {
  const originalSecret = process.env.POLAR_WEBHOOK_SECRET;

  beforeEach(() => {
    mockReset(prisma);
    applyPolarWebhookPayload.mockReset();
    validateEvent.mockReset();
    process.env.POLAR_WEBHOOK_SECRET = "whsec_test";
  });

  afterEach(() => {
    process.env.POLAR_WEBHOOK_SECRET = originalSecret;
    vi.clearAllMocks();
  });

  it("returns 503 when POLAR_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.POLAR_WEBHOOK_SECRET;

    const response = await POST(makeRequest({ type: "ping" }));

    expect(response.status).toBe(503);
    expect(validateEvent).not.toHaveBeenCalled();
  });

  it("returns 403 when signature verification fails", async () => {
    validateEvent.mockImplementation(() => {
      throw new WebhookVerificationError("bad signature");
    });

    const response = await POST(makeRequest({ type: "ping" }));

    expect(response.status).toBe(403);
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
  });

  it("returns 200 duplicate:true and skips processing on a duplicate providerEventId", async () => {
    validateEvent.mockReturnValue({
      type: "order.paid",
      timestamp: new Date(),
      data: { id: "order_1" },
    });
    prisma.billingEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "5.18.0",
      }),
    );

    const response = await POST(makeRequest({ type: "order.paid" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, duplicate: true });
    expect(applyPolarWebhookPayload).not.toHaveBeenCalled();
  });

  it("processes the payload and marks the billing event as processed on the happy path", async () => {
    const payload = {
      type: "order.paid",
      timestamp: new Date(),
      data: { id: "order_1" },
    };
    validateEvent.mockReturnValue(payload);
    prisma.billingEvent.create.mockResolvedValue({} as any);
    prisma.billingEvent.update.mockResolvedValue({} as any);

    const response = await POST(makeRequest({ type: "order.paid" }));
    const json = await response.json();

    expect(prisma.billingEvent.create).toHaveBeenCalledTimes(1);
    expect(applyPolarWebhookPayload).toHaveBeenCalledTimes(1);
    expect(applyPolarWebhookPayload).toHaveBeenCalledWith(payload);
    expect(prisma.billingEvent.update).toHaveBeenCalledWith({
      where: { providerEventId: "evt_test_1" },
      data: { processedAt: expect.any(Date) },
    });
    expect(json).toEqual({ ok: true });
  });
});
