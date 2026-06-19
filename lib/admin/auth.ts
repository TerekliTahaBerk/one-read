import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "oneread_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type AdminSessionPayload = {
  email: string;
  exp: number;
};

export type AdminSession = {
  email: string;
  expiresAt: Date;
};

export type AdminPageGuard =
  | { ok: true; session: AdminSession }
  | { ok: false; reason: "not_configured" };

export function adminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

export function adminLoginConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.ADMIN_SESSION_SECRET &&
      (process.env.ADMIN_PASSWORD_HASH ||
        (process.env.NODE_ENV !== "production" && process.env.ADMIN_PASSWORD)),
  );
}

export function adminFeatureFlags() {
  return {
    approvalRequired: process.env.ONE_ARTICLE_REQUIRE_APPROVAL !== "false",
    mutationsEnabled: process.env.ADMIN_MUTATIONS_ENABLED !== "false",
    sendActionsEnabled: process.env.ADMIN_SEND_ACTIONS_ENABLED !== "false",
  };
}

export function getAdminToken(req: Request, body?: unknown): string {
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

export function isAdminAuthorized(req: Request, body?: unknown): boolean {
  return Boolean(readAdminSessionFromRequest(req)) || isAdminTokenAuthorized(req, body);
}

export function isAdminRequest(req: Request, body?: unknown): boolean {
  return isAdminAuthorized(req, body);
}

export function requireAdmin(
  req: Request,
  body?: unknown,
): NextResponse | null {
  if (isAdminAuthorized(req, body)) return null;
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export function guardAdminPage(
  pathname: string,
  searchParams?: Record<string, string | string[] | undefined>,
): AdminPageGuard {
  const queryToken = readTokenFromSearchParams(searchParams);
  const queryTokenAuthorized = Boolean(queryToken && isAdminTokenValueAuthorized(queryToken));
  if (!adminLoginConfigured() && !queryTokenAuthorized) {
    adminAuthDebug({ path: pathname, cookie: "n/a", verify: "skipped", reason: "not_configured", redirect: "no" });
    return { ok: false, reason: "not_configured" };
  }

  const cookiePresent = Boolean(cookies().get(ADMIN_SESSION_COOKIE)?.value);
  const session = getAdminSession();
  if (session) {
    adminAuthDebug({ path: pathname, cookie: "present", verify: "ok", actor: "session", redirect: "no" });
    return { ok: true, session };
  }

  if (queryTokenAuthorized) {
    adminAuthDebug({ path: pathname, cookie: cookiePresent ? "present" : "absent", verify: "ok", actor: "admin-token", redirect: "no" });
    return {
      ok: true,
      session: {
        email: "admin-token",
        expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000),
      },
    };
  }

  adminAuthDebug({
    path: pathname,
    cookie: cookiePresent ? "present" : "absent",
    verify: "failed",
    reason: cookiePresent ? "invalid_or_expired" : "no_cookie",
    redirect: "login",
  });

  const next = buildSafeAdminPath(pathname, searchParams);
  redirect(`/admin/login?next=${encodeURIComponent(next)}`);
}

/**
 * Safe admin-auth debug logging. Off by default; enable with ADMIN_AUTH_DEBUG=true
 * in development. Never logs secrets, passwords, tokens, or raw cookie values —
 * only presence/verification status.
 */
function adminAuthDebug(fields: Record<string, string>): void {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.ADMIN_AUTH_DEBUG !== "true") return;
  const line = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.log(`[admin-auth] ${line}`);
}

export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  const expectedEmail = process.env.ADMIN_EMAIL ?? "";
  if (!expectedEmail || !timingSafeStringEqual(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase())) {
    return false;
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return verifyPasswordHash(password, hash);

  if (process.env.NODE_ENV !== "production" && process.env.ADMIN_PASSWORD) {
    return timingSafeStringEqual(password, process.env.ADMIN_PASSWORD);
  }

  return false;
}

export function setAdminSessionCookie(res: NextResponse, email: string): void {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionToken(email),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function adminActorLabel(req: Request, body?: unknown): string {
  const session = readAdminSessionFromRequest(req);
  if (session) return session.email;

  const token = getAdminToken(req, body);
  if (!token) return "admin";
  const fp = createHmac("sha256", "admin-token-fingerprint")
    .update(token)
    .digest("hex")
    .slice(0, 8);
  return `admin#${fp}`;
}

export function generateAdminPasswordHash(password: string): string {
  const salt = randomBytes(16);
  const iterations = 210_000;
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `pbkdf2_sha256:${iterations}:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

function createAdminSessionToken(email: string): string {
  const payload: AdminSessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function readCurrentAdminSession(): AdminSession | null {
  return getAdminSession();
}

export function getAdminSession(): AdminSession | null {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

export function sanitizeAdminNextPath(next?: string): string {
  if (!next) return "/admin";
  if (!next.startsWith("/")) return "/admin";

  let pathname = next;
  try {
    const parsed = new URL(next, "http://oneread.local");
    if (parsed.origin !== "http://oneread.local") return "/admin";
    pathname = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/admin";
  }

  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login?") ||
    pathname.startsWith("/admin/login#")
  ) {
    return "/admin";
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/admin?")) {
    return pathname;
  }

  return "/admin";
}

function readAdminSessionFromRequest(req: Request): AdminSession | null {
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = cookie ? decodeURIComponent(cookie.slice(ADMIN_SESSION_COOKIE.length + 1)) : "";
  return verifyAdminSessionToken(token);
}

function verifyAdminSessionToken(token?: string): AdminSession | null {
  if (!token || !process.env.ADMIN_SESSION_SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !timingSafeStringEqual(sig, sign(body))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSessionPayload;
    if (!payload.email || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (process.env.ADMIN_EMAIL && payload.email !== process.env.ADMIN_EMAIL) return null;
    return { email: payload.email, expiresAt: new Date(payload.exp * 1000) };
  } catch {
    return null;
  }
}

function isAdminTokenAuthorized(req: Request, body?: unknown): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return timingSafeStringEqual(getAdminToken(req, body), expected);
}

function isAdminTokenValueAuthorized(token: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return timingSafeStringEqual(token, expected);
}

function readTokenFromSearchParams(
  searchParams?: Record<string, string | string[] | undefined>,
): string {
  const value = searchParams?.token;
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function sign(body: string): string {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET ?? "")
    .update(body)
    .digest("base64url");
}

function verifyPasswordHash(password: string, encoded: string): boolean {
  const parts = encoded.includes(":") ? encoded.split(":") : encoded.split("$");
  const [scheme, iterationsRaw, saltRaw, hashRaw] = parts;
  if (scheme !== "pbkdf2_sha256") return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100_000 || !saltRaw || !hashRaw) {
    return false;
  }

  try {
    const salt = Buffer.from(saltRaw, "base64url");
    const expected = Buffer.from(hashRaw, "base64url");
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
    return safeBufferEqual(actual, expected);
  } catch {
    return false;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  return safeBufferEqual(Buffer.from(a), Buffer.from(b));
}

function safeBufferEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    const max = Math.max(a.length, b.length, 1);
    timingSafeEqual(Buffer.alloc(max), Buffer.alloc(max));
    return false;
  }
  return timingSafeEqual(a, b);
}

function buildSafeAdminPath(
  pathname: string,
  searchParams?: Record<string, string | string[] | undefined>,
): string {
  const safePathname = sanitizeAdminNextPath(pathname);
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (key === "token" || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }

  const qs = params.toString();
  return qs ? `${safePathname}?${qs}` : safePathname;
}
