import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { hasVerifiedEmail } from "@/lib/oneread/verification";
import { resumeEmailDelivery } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const email = parseEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (!hasVerifiedEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }
  const resumed = await resumeEmailDelivery(email);
  return NextResponse.json({ ok: true, resumed });
}
