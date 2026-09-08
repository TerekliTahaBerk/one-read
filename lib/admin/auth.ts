import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE = "oneread_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type AdminSessionPayload = {
  email: string;
  exp: number;
  version?: number;
};

export type AdminSession = {
  email: string;
  expiresAt: Date;
};

export type AdminPageGuard =
  | { ok: true; session: AdminSession }
  | { ok: false; reason: "not_configured" };

type ConfiguredAdminAccount = {
  email: string;
  passwordHash: string | null;
  developmentPassword: string | null;
};

export function adminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

export function adminLoginConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_SESSION_SECRET &&
      getConfiguredAdminAccounts().some(
        (account) =>
          account.passwordHash ||
          (process.env.NODE_ENV !== "production" && account.developmentPassword),
      ),
  );
}

/**
 * Canonical list of browser-login admins. Every listed account receives the
 * same panel permissions; authorization remains feature-flag based.
 *
 * Backwards compatible primary account:
 *   ADMIN_EMAIL + ADMIN_PASSWORD_HASH
 *
 * Additional accounts:
 *   ADMIN_ADDITIONAL_ACCOUNTS='[{"email":"person@example.com","passwordHash":"pbkdf2_sha256:..."}]'
 */
export function configuredAdminEmails(): string[] {
  return getConfiguredAdminAccounts().map((account) => account.email);
}

export function adminFeatureFlags() {
  return {
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
  void body;
  return "";
}

export async function isAdminAuthorized(req: Request, body?: unknown): Promise<boolean> {
  return Boolean(await readAdminSessionFromRequest(req)) || isAdminTokenAuthorized(req, body);
}

export async function isAdminRequest(req: Request, body?: unknown): Promise<boolean> {
  return isAdminAuthorized(req, body);
}

export async function requireAdmin(
  req: Request,
  body?: unknown,
): Promise<NextResponse | null> {
  if (await isAdminAuthorized(req, body)) return null;
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

/** Enforces same-origin requests for cookie-authenticated browser mutations.
 * Machine callers authenticate exclusively with an Authorization bearer. */
export async function requireAdminMutation(
  req: Request,
  body?: unknown,
): Promise<NextResponse | null> {
  const session = await readAdminSessionFromRequest(req);
  if (session) {
    const origin = req.headers.get("origin");
    const fetchSite = req.headers.get("sec-fetch-site");
    let expectedOrigin = "";
    try { expectedOrigin = new URL(req.url).origin; } catch { /* relative test URL */ }
    if (fetchSite === "cross-site" || (origin && expectedOrigin && origin !== expectedOrigin)) {
      return NextResponse.json({ ok: false, error: "cross_origin_mutation_rejected" }, { status: 403 });
    }
    return null;
  }
  if (isAdminTokenAuthorized(req, body)) return null;
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function guardAdminPage(
  pathname: string,
  searchParams?: Record<string, string | string[] | undefined>,
): Promise<AdminPageGuard> {
  // Query-string credentials leak through browser history, logs and referrers.
  // Keep the local-development shortcut, but production pages require the
  // signed, httpOnly admin session cookie.
  const queryToken = process.env.NODE_ENV === "production" ? "" : readTokenFromSearchParams(searchParams);
  const queryTokenAuthorized = Boolean(queryToken && isAdminTokenValueAuthorized(queryToken));
  if (!adminLoginConfigured() && !queryTokenAuthorized) {
    adminAuthDebug({ path: pathname, cookie: "n/a", verify: "skipped", reason: "not_configured", redirect: "no" });
    return { ok: false, reason: "not_configured" };
  }

  const cookiePresent = Boolean((cookies() as unknown as UnsafeUnwrappedCookies).get(ADMIN_SESSION_COOKIE)?.value);
  const session = await getAdminSession();
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
  const normalizedEmail = email.trim().toLowerCase();
  const account = getConfiguredAdminAccounts().find((candidate) =>
    timingSafeStringEqual(normalizedEmail, candidate.email),
  );

  const override = await prisma.adminCredential.findUnique({
    where: { email: normalizedEmail },
    select: { passwordHash: true },
  });
  // An account exists if the deployment names it, or if the panel created a
  // row for it. A row with no password is an outstanding invitation and must
  // not authenticate — the invitee has not chosen a password yet.
  if (!account && !override?.passwordHash) return false;

  const passwordHash = override?.passwordHash ?? account?.passwordHash ?? null;
  if (passwordHash) {
    return verifyPasswordHash(password, passwordHash);
  }
  if (!account) return false;
  if (
    process.env.NODE_ENV !== "production" &&
    account.developmentPassword
  ) {
    return timingSafeStringEqual(password, account.developmentPassword);
  }

  return false;
}

export async function setAdminSessionCookie(res: NextResponse, email: string): Promise<void> {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: await createAdminSessionToken(email),
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

export async function adminActorLabel(req: Request, body?: unknown): Promise<string> {
  const session = await readAdminSessionFromRequest(req);
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

export function validateAdminPassword(password: string, email: string): string | null {
  if (password.length < 12) return "password_too_short";
  if (password.length > 128) return "password_too_long";

  const characterClasses = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  if (characterClasses < 3) return "password_not_strong_enough";

  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  if (localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
    return "password_contains_email";
  }
  return null;
}

export async function changeAdminPassword(input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true; sessionVersion: number } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  // Panel-created admins change their own password here too, so membership is
  // checked against both identity sources rather than the environment alone.
  if (!(await allAdminEmails()).includes(email)) {
    return { ok: false, error: "admin_not_configured" };
  }
  if (!(await verifyAdminCredentials(email, input.currentPassword))) {
    return { ok: false, error: "current_password_incorrect" };
  }
  if (timingSafeStringEqual(input.currentPassword, input.newPassword)) {
    return { ok: false, error: "password_unchanged" };
  }
  const validationError = validateAdminPassword(input.newPassword, email);
  if (validationError) return { ok: false, error: validationError };

  const passwordHash = generateAdminPasswordHash(input.newPassword);
  const credential = await prisma.adminCredential.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      sessionVersion: 1,
      changedBy: email,
    },
    update: {
      passwordHash,
      sessionVersion: { increment: 1 },
      changedBy: email,
    },
    select: { sessionVersion: true },
  });
  return { ok: true, sessionVersion: credential.sessionVersion };
}

async function createAdminSessionToken(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await prisma.adminCredential.findUnique({
    where: { email: normalizedEmail },
    select: { sessionVersion: true },
  });
  const payload: AdminSessionPayload = {
    email: normalizedEmail,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
    version: credential?.sessionVersion ?? 0,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export async function readCurrentAdminSession(): Promise<AdminSession | null> {
  return getAdminSession();
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (cookies() as unknown as UnsafeUnwrappedCookies).get(ADMIN_SESSION_COOKIE)?.value;
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

export async function readAdminSessionFromRequest(req: Request): Promise<AdminSession | null> {
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = cookie ? decodeURIComponent(cookie.slice(ADMIN_SESSION_COOKIE.length + 1)) : "";
  return verifyAdminSessionToken(token);
}

/* ----------------------------------------------------------------------- */
/* Panel-managed administrator accounts                                    */
/* ----------------------------------------------------------------------- */

/** Where an administrator's identity comes from. */
export type AdminAccountOrigin = "deployment" | "panel";

export interface AdminAccountSummary {
  email: string;
  origin: AdminAccountOrigin;
  /** False while an invitation is outstanding — the account cannot sign in. */
  active: boolean;
  invitePending: boolean;
  inviteExpiresAt: Date | null;
  createdBy: string | null;
  /** True when the panel is allowed to remove this account. */
  removable: boolean;
  updatedAt: Date | null;
}

export const ADMIN_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Every administrator, from both identity sources.
 *
 * Deployment accounts are listed first and are never removable here: they are
 * the recovery path if a panel change locks everyone out, and the panel has no
 * way to edit the environment anyway — a "remove" that silently did nothing
 * would be exactly the kind of lie this panel is being cleaned up to stop
 * telling.
 */
export async function listAdminAccounts(): Promise<AdminAccountSummary[]> {
  const envEmails = configuredAdminEmails();
  let rows: {
    email: string;
    passwordHash: string | null;
    createdBy: string | null;
    inviteExpiresAt: Date | null;
    updatedAt: Date;
  }[] = [];
  try {
    rows = await prisma.adminCredential.findMany({
      select: {
        email: true,
        passwordHash: true,
        createdBy: true,
        inviteExpiresAt: true,
        updatedAt: true,
      },
    });
  } catch {
    // A database blip must not hide the deployment admins, who are exactly the
    // accounts still able to sign in when the database is the thing that broke.
    rows = [];
  }
  const byEmail = new Map(rows.map((row) => [row.email, row]));

  const accounts: AdminAccountSummary[] = envEmails.map((email) => ({
    email,
    origin: "deployment" as const,
    active: true,
    invitePending: false,
    inviteExpiresAt: null,
    createdBy: null,
    removable: false,
    updatedAt: byEmail.get(email)?.updatedAt ?? null,
  }));

  for (const row of rows) {
    if (envEmails.includes(row.email)) continue;
    accounts.push({
      email: row.email,
      origin: "panel",
      active: Boolean(row.passwordHash),
      invitePending: !row.passwordHash,
      inviteExpiresAt: row.inviteExpiresAt,
      createdBy: row.createdBy,
      removable: true,
      updatedAt: row.updatedAt,
    });
  }
  return accounts;
}

/** Every email that is an administrator, from both sources. */
export async function allAdminEmails(): Promise<string[]> {
  return (await listAdminAccounts()).map((account) => account.email);
}

export type AdminInviteResult =
  | { ok: true; email: string; token: string; expiresAt: Date }
  | { ok: false; error: string };

/**
 * Create (or re-invite) a panel administrator.
 *
 * The account is created *without* a password. The returned token is the only
 * time it exists in plaintext; it is stored hashed, so an administrator can
 * hand out access without ever knowing — or choosing — the other person's
 * password. Re-inviting an account that has not been activated reissues the
 * token; re-inviting an active account is refused, because that would be a
 * silent password reset for someone who is already signed in.
 */
export async function inviteAdmin(
  rawEmail: string,
  actor: string,
): Promise<AdminInviteResult> {
  const email = normalizeAdminEmail(rawEmail);
  if (!email) return { ok: false, error: "invalid_email" };
  if (configuredAdminEmails().includes(email)) {
    return { ok: false, error: "already_a_deployment_admin" };
  }

  const existing = await prisma.adminCredential.findUnique({
    where: { email },
    select: { passwordHash: true },
  });
  if (existing?.passwordHash) return { ok: false, error: "already_an_admin" };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ADMIN_INVITE_TTL_MS);
  await prisma.adminCredential.upsert({
    where: { email },
    create: {
      email,
      passwordHash: null,
      createdBy: actor,
      inviteTokenHash: hashInviteToken(token),
      inviteExpiresAt: expiresAt,
    },
    update: {
      inviteTokenHash: hashInviteToken(token),
      inviteExpiresAt: expiresAt,
      createdBy: actor,
    },
  });
  return { ok: true, email, token, expiresAt };
}

/**
 * Remove a panel-created administrator. Deployment accounts are refused, and so
 * is removing the last account that can still sign in — a panel that can lock
 * every operator out of itself is not a safe panel.
 */
export async function revokeAdmin(
  rawEmail: string,
  actor: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeAdminEmail(rawEmail);
  if (!email) return { ok: false, error: "invalid_email" };
  if (configuredAdminEmails().includes(email)) {
    return { ok: false, error: "cannot_remove_deployment_admin" };
  }

  const accounts = await listAdminAccounts();
  const target = accounts.find((account) => account.email === email);
  if (!target) return { ok: false, error: "admin_not_found" };
  if (target.active && accounts.filter((account) => account.active).length <= 1) {
    return { ok: false, error: "cannot_remove_last_admin" };
  }

  await prisma.adminCredential.delete({ where: { email } });
  void actor;
  return { ok: true };
}

export type AdminInviteRedemption =
  | { ok: true; email: string; sessionVersion: number }
  | { ok: false; error: string };

/** The email an unredeemed, unexpired invitation belongs to, for the setup page. */
export async function peekAdminInvite(token: string): Promise<string | null> {
  if (!token) return null;
  const row = await prisma.adminCredential.findFirst({
    where: {
      inviteTokenHash: hashInviteToken(token),
      passwordHash: null,
      inviteExpiresAt: { gt: new Date() },
    },
    select: { email: true },
  });
  return row?.email ?? null;
}

/**
 * Redeem an invitation by choosing a password. Single use: the token hash is
 * cleared in the same write that sets the password, so a leaked link cannot be
 * replayed. The password policy is the same one `changeAdminPassword` enforces
 * — an invitation is not a way around it.
 */
export async function redeemAdminInvite(
  token: string,
  password: string,
): Promise<AdminInviteRedemption> {
  const email = await peekAdminInvite(token);
  if (!email) return { ok: false, error: "invite_invalid_or_expired" };

  const validationError = validateAdminPassword(password, email);
  if (validationError) return { ok: false, error: validationError };

  // Conditional on the token still being present, so two concurrent redemptions
  // cannot both succeed.
  const claimed = await prisma.adminCredential.updateMany({
    where: { email, inviteTokenHash: hashInviteToken(token), passwordHash: null },
    data: {
      passwordHash: generateAdminPasswordHash(password),
      inviteTokenHash: null,
      inviteExpiresAt: null,
      changedBy: email,
      sessionVersion: 1,
    },
  });
  if (claimed.count !== 1) return { ok: false, error: "invite_invalid_or_expired" };

  const credential = await prisma.adminCredential.findUnique({
    where: { email },
    select: { sessionVersion: true },
  });
  return { ok: true, email, sessionVersion: credential?.sessionVersion ?? 1 };
}

async function verifyAdminSessionToken(token?: string): Promise<AdminSession | null> {
  if (!token || !process.env.ADMIN_SESSION_SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !timingSafeStringEqual(sig, sign(body))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSessionPayload;
    if (!payload.email || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    const email = payload.email.trim().toLowerCase();
    const credential = await prisma.adminCredential.findUnique({
      where: { email },
      select: { sessionVersion: true, passwordHash: true },
    });
    // Membership: named by the deployment, or an activated panel account.
    // Revoking an admin deletes the row, which invalidates their session here.
    const isAdmin =
      configuredAdminEmails().includes(email) || Boolean(credential?.passwordHash);
    if (!isAdmin) return null;
    if ((payload.version ?? 0) !== (credential?.sessionVersion ?? 0)) return null;
    return { email, expiresAt: new Date(payload.exp * 1000) };
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

function getConfiguredAdminAccounts(): ConfiguredAdminAccount[] {
  const accounts: ConfiguredAdminAccount[] = [];
  const primaryEmail = normalizeAdminEmail(process.env.ADMIN_EMAIL);
  if (primaryEmail) {
    accounts.push({
      email: primaryEmail,
      passwordHash: clean(process.env.ADMIN_PASSWORD_HASH),
      developmentPassword: clean(process.env.ADMIN_PASSWORD),
    });
  }

  const raw = process.env.ADMIN_ADDITIONAL_ACCOUNTS;
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const record = item as Record<string, unknown>;
          const email = normalizeAdminEmail(record.email);
          const passwordHash =
            typeof record.passwordHash === "string"
              ? clean(record.passwordHash)
              : null;
          if (!email || !passwordHash || accounts.some((a) => a.email === email)) {
            continue;
          }
          accounts.push({
            email,
            passwordHash,
            developmentPassword: null,
          });
        }
      }
    } catch {
      // Fail closed: malformed additional-account config grants no access.
    }
  }
  return accounts;
}

function normalizeAdminEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function clean(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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
