import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 8058 one-click unsubscribe endpoint used by mailbox providers. */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("subscription")?.trim();
  if (!token || token.length > 256) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await prisma.productSubscription.updateMany({
    where: { unsubscribeToken: token },
    data: { emailDeliveryStatus: "UNSUBSCRIBED" },
  });

  // Keep the response generic so opaque-token probing reveals no account data.
  void result;
  return NextResponse.json({ ok: true });
}
