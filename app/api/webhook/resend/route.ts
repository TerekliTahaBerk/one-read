import { NextResponse } from "next/server";
import { ONE_ARTICLE_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { resendEventRecipients, verifyResendWebhook } from "@/lib/resend-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPRESSION_EVENTS = new Set(["email.bounced", "email.complained"]);

export async function POST(request: Request) {
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
  const type = (payload as { type?: unknown }).type;
  if (typeof type !== "string" || !SUPPRESSION_EVENTS.has(type)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const emails = resendEventRecipients(payload);
  if (emails.length > 0) {
    await prisma.productSubscription.updateMany({
      where: {
        productKey: { in: [ONE_READ_PRODUCT_KEY, ONE_ARTICLE_PRODUCT_KEY] },
        contact: { email: { in: emails } },
      },
      data: { emailDeliveryStatus: "SUPPRESSED" },
    });
  }
  return NextResponse.json({ ok: true });
}
