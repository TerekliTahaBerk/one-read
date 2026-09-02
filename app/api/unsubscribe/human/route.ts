import { NextResponse } from "next/server";
import { unsubscribeHuman } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser confirmation endpoint. Mutation is POST-only and idempotent. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  await unsubscribeHuman({
    subscription: stringValue(form.get("subscription")),
    send: stringValue(form.get("send")),
    email: stringValue(form.get("email")),
  });
  return NextResponse.redirect(new URL("/unsubscribe?result=done", request.url), 303);
}

function stringValue(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}
