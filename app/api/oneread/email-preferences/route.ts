import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { hasVerifiedEmail } from "@/lib/oneread/verification";
import { PRODUCT_KEYS, isProductKey } from "@/lib/products/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  const email = parseEmail(body.email);
  if (!email) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  if (!hasVerifiedEmail(email)) return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  const enabled = body.enabled === true;
  const scope = body.product === "all" ? "all" : isProductKey(body.product) ? body.product : null;
  if (!scope) return NextResponse.json({ ok: false, error: "invalid_product" }, { status: 400 });
  const keys = scope === "all" ? [...PRODUCT_KEYS] : [scope];
  const contact = await prisma.contact.findUnique({ where: { email }, select: { id: true } });
  if (!contact) return NextResponse.json({ ok: true, changed: 0 });
  if (enabled) {
    // Provider safety suppressions cannot be overridden by a customer toggle.
    const suppressed = await prisma.productSubscription.count({
      where: { contactId: contact.id, productKey: { in: keys }, emailDeliveryStatus: "SUPPRESSED" },
    });
    if (suppressed) return NextResponse.json({ ok: false, error: "email_suppressed" }, { status: 409 });
  }
  const result = await prisma.productSubscription.updateMany({
    where: {
      contactId: contact.id,
      productKey: { in: keys },
      ...(enabled ? { emailDeliveryStatus: "UNSUBSCRIBED" } : {}),
    },
    data: { emailDeliveryStatus: enabled ? "SUBSCRIBED" : "UNSUBSCRIBED" },
  });
  return NextResponse.json({ ok: true, changed: result.count });
}
