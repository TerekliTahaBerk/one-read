import { NextResponse } from "next/server";
import { ONE_ARTICLE_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { parseResendDeliveryEvent, shouldApplyProviderEvent, verifyResendWebhook } from "@/lib/resend-webhook";
import { reportProviderEvent } from "@/lib/provider-observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return await handleResendWebhook(request);
  } catch (error) {
    await reportProviderEvent("resend_webhook_processing_failed", {
      outcome: "failed", state: "unprocessed", errorCode: "webhook_processing_failed",
      error, flush: true,
    });
    throw error;
  }
}

async function handleResendWebhook(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    await reportProviderEvent("resend_webhook_config_invalid", {
      outcome: "not_configured", errorCode: "missing_webhook_secret", flush: true,
    });
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const body = await request.text();
  if (!verifyResendWebhook({ body, headers: request.headers, secret })) {
    await reportProviderEvent("resend_webhook_signature_invalid", {
      outcome: "rejected", errorCode: "invalid_signature",
      correlationId: request.headers.get("webhook-id"),
    });
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event = parseResendDeliveryEvent(payload);
  if (!event) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (event.messageId) {
    const [deliveries, newsDeliveries] = await Promise.all([
      prisma.oneArticleDelivery.findMany({
        where: { providerMessageId: event.messageId },
        select: { id: true, providerStatus: true, providerStatusAt: true },
      }),
      prisma.oneNewsDelivery.findMany({
        where: { providerMessageId: event.messageId },
        select: { id: true, providerStatus: true, providerStatusAt: true },
      }),
    ]);
    await prisma.$transaction(
      [
        ...deliveries
        .filter((delivery) => shouldApplyProviderEvent(delivery, event))
        .map((delivery) => prisma.oneArticleDelivery.update({
          where: { id: delivery.id },
          data: { providerStatus: event.status, providerStatusAt: event.occurredAt },
        })),
        ...newsDeliveries
          .filter((delivery) => shouldApplyProviderEvent(delivery, event))
          .map((delivery) => prisma.oneNewsDelivery.update({
            where: { id: delivery.id },
            data: {
              providerStatus: event.status,
              providerStatusAt: event.occurredAt,
              ...(event.status === "DELIVERED" ? { deliveredAt: event.occurredAt } : {}),
            },
          })),
      ],
    );
  }

  if ((event.status === "BOUNCED" || event.status === "COMPLAINED") && event.recipients.length > 0) {
    await prisma.productSubscription.updateMany({
      where: {
        productKey: { in: [ONE_READ_PRODUCT_KEY, ONE_ARTICLE_PRODUCT_KEY, "one-news"] },
        contact: { email: { in: event.recipients } },
      },
      data: { emailDeliveryStatus: "SUPPRESSED" },
    });
    await reportProviderEvent("resend_business_suppression", {
      outcome: event.status.toLowerCase(), state: "recipient_suppressed",
      correlationId: event.messageId, errorCode: event.type,
      metadata: { affected_recipient_count: event.recipients.length },
    });
  } else if (event.status === "FAILED") {
    await reportProviderEvent("resend_hard_send_failure", {
      operation: "apply_delivery_status", outcome: "failed", state: "provider_failed",
      correlationId: event.messageId, errorCode: event.type,
    });
  }
  return NextResponse.json({ ok: true });
}
