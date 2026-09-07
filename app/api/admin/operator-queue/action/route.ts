import { NextResponse } from "next/server";
import { adminActorLabel, requireAdminMutation } from "@/lib/admin/auth";
import { retryQueuedDelivery } from "@/lib/admin/operator-queue";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const denied = await requireAdminMutation(request, body);
  if (denied) return denied;
  if (body.action !== "retry-delivery" || !["one-article", "one-news"].includes(String(body.product)) || typeof body.deliveryId !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  try {
    const result = await retryQueuedDelivery({ product: body.product as "one-article" | "one-news", deliveryId: body.deliveryId, actor: await adminActorLabel(request, body) });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "recovery_failed";
    const status = message.includes("not_found") ? 404 : message.includes("stale") || message.includes("eligible") ? 409 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
