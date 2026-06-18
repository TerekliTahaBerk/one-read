import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * Centralized admin auth. The whole admin surface is gated by a single shared
 * secret, `ADMIN_TOKEN`, kept out of the client bundle. This mirrors the
 * original per-route checks (see app/admin/page.tsx and
 * app/api/admin/manual-article/route.ts) so behavior is unchanged — it just
 * lives in one place now.
 *
 * There is intentionally no login system and no middleware: the blast radius
 * stays small and every admin entrypoint opts in explicitly.
 */

/** Whether ADMIN_TOKEN is configured at all. */
export function adminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

/**
 * Extracts the presented token from a request, checking (in order):
 *   1. `Authorization: Bearer <token>` header,
 *   2. `?token=` query param,
 *   3. a `token` field in an already-parsed JSON/form body.
 */
export function getAdminToken(
  req: Request,
  body?: unknown,
): string {
  const headerToken = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (headerToken) return headerToken;

  try {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    if (queryToken) return queryToken;
  } catch {
    // req.url may be relative in some test contexts; ignore.
  }

  if (body && typeof body === "object" && "token" in body) {
    const t = (body as { token?: unknown }).token;
    if (typeof t === "string") return t;
  }
  return "";
}

/** Constant-ish comparison against the configured token. */
export function isAdminAuthorized(req: Request, body?: unknown): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return getAdminToken(req, body) === expected;
}

/**
 * For API routes: returns a 401 NextResponse when unauthorized, or null when
 * the caller may proceed. Usage:
 *   const denied = requireAdmin(req, body);
 *   if (denied) return denied;
 */
export function requireAdmin(
  req: Request,
  body?: unknown,
): NextResponse | null {
  if (isAdminAuthorized(req, body)) return null;
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export type AdminPageGuard =
  | { ok: true; token: string }
  | { ok: false; reason: "not_configured" };

/**
 * For server-component admin pages. Mirrors the original app/admin/page.tsx
 * behavior:
 *   - ADMIN_TOKEN not set → caller should render a config notice
 *     ({ ok: false, reason: "not_configured" }).
 *   - token missing/wrong → redirect to "/" (never reveals data).
 *   - correct token → { ok: true, token }.
 */
export function guardAdminPage(searchParams: { token?: string }): AdminPageGuard {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return { ok: false, reason: "not_configured" };
  if (searchParams.token !== expected) redirect("/");
  return { ok: true, token: searchParams.token };
}

/**
 * A best-effort, non-secret label for who performed an admin action, for the
 * audit log. We never store the token itself — only a short fingerprint so two
 * different tokens are distinguishable without being reversible.
 */
export function adminActorLabel(req: Request, body?: unknown): string {
  const token = getAdminToken(req, body);
  if (!token) return "admin";
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash * 31 + token.charCodeAt(i)) | 0;
  }
  return `admin#${(hash >>> 0).toString(16).slice(0, 6)}`;
}
