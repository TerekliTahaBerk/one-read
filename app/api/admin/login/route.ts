import { NextResponse } from "next/server";
import {
  adminLoginConfigured,
  sanitizeAdminNextPath,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/admin/auth";
import {
  adminLoginThrottleKeys,
  checkAdminLoginRateLimit,
  clearAdminLoginFailures,
  recordAdminLoginFailure,
} from "@/lib/admin/login-throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!adminLoginConfigured()) {
    return NextResponse.json(
      { ok: false, error: "admin_login_not_configured" },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = body.email ?? "";
  const password = body.password ?? "";
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    null;
  const throttleKeys = adminLoginThrottleKeys(email, ip);
  const rateLimit = await checkAdminLoginRateLimit(throttleKeys);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const ok = await verifyAdminCredentials(email, password);
  if (!ok) {
    await recordAdminLoginFailure(throttleKeys);
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 },
    );
  }

  await clearAdminLoginFailures(throttleKeys);
  const next = sanitizeAdminNextPath(body.next);
  const res = NextResponse.json({ ok: true, next });
  await setAdminSessionCookie(res, email.trim().toLowerCase());
  return res;
}
