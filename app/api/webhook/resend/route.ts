import { NextResponse } from "next/server";
import { ONE_ARTICLE_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { parseResendDeliveryEvent, shouldApplyProviderEvent, verifyResendWebhook } from "@/lib/resend-webhook";
import { reportOperationalEvent } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return await handleResendWebhook(request);
  } catch (error) {
    await reportOperationalEvent("resend_webhook_failed", {
      subsystem: "resend_webhook", operation: "apply_delivery_status", outcome: "failed", state: "unprocessed",
      retryClassification: "provider_retry", errorCode: "webhook_processing_failed",
    }, { error, level: "error", flush: true });
    throw error;
  }
}

async function handleResendWebhook(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });

  const body = await request.text();
  if (!verifyResendWebhook({ body, headers: request.headers, secret })) {
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
  }
  return NextResponse.json({ ok: true });
}
