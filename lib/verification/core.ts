import { renderVerificationHtml, renderVerificationText } from "./email";
import { verificationCopy } from "./email-copy";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResendStatus, sendDailyEmail } from "@/lib/resend";

/**
 * Product-agnostic email verification core. Proves a user controls an email by
 * sending a 6-digit code and checking it back. It deliberately does NOT grant
 * any billing/trial access — the billing provider (Polar) remains the sole
 * source of truth. Codes are never stored in plaintext (HMAC only).
 *
 * OneArticle instantiates this via
 * `createVerification(descriptor)`, which binds the shared crypto/session/rate-
 * limit logic to that product's purposes, cookie name, and email copy. The
 * underlying `EmailVerificationCode` table and `EMAIL_VERIFICATION_SECRET` are
 * shared; the `purpose` column namespaces codes per product.
 */

/** Per-product configuration for a verification instance. */
export interface VerificationDescriptor {
  /** Stable key, used only for log prefixes, e.g. "one-article". */
  key: string;
  /** The two purposes namespacing this product's codes. */
  purposes: { signup: string; preferences: string };
  /** httpOnly cookie name holding the verified-email session. */
  cookieName: string;
  /** Brand identity. Localized copy lives in email-copy.ts. */
  email: {
    /** Uppercase brand line, e.g. "OneRead · OneArticle". */
    brandLine: string;
    /** Product display name, e.g. "OneArticle". */
    productName: string;
    /** Theme colors for the verification email. */
    theme: {
      background: string;
      surface: string;
      accent: string;
      border: string;
    };
  };
}

/* ----------------------------------------------------------------------- */
/* Config (shared)                                                         */
/* ----------------------------------------------------------------------- */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function verificationConfig() {
  return {
    ttlMinutes: intEnv("EMAIL_VERIFICATION_CODE_TTL_MINUTES", 10),
    resendCooldownSeconds: intEnv("EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS", 60),
    maxAttempts: intEnv("EMAIL_VERIFICATION_MAX_ATTEMPTS", 5),
    sessionMinutes: 30,
    maxRequestsPerEmailPerHour: 5,
    maxRequestsPerIpPerHour: 20,
  };
}

export function emailVerificationSecretConfigured(): boolean {
  return Boolean(process.env.EMAIL_VERIFICATION_SECRET?.trim());
}

/** True when verification emails can actually be delivered (Resend configured). */
export function verificationEmailConfigured(): boolean {
  return getResendStatus().sendReady;
}

function secret(): string {
  const s = process.env.EMAIL_VERIFICATION_SECRET;
  if (!s || !s.trim()) {
    throw new Error("EMAIL_VERIFICATION_SECRET is not configured");
  }
  return s;
}

/* ----------------------------------------------------------------------- */
/* Hashing (shared)                                                        */
/* ----------------------------------------------------------------------- */

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(code: string, email: string, purpose: string): string {
  return createHmac("sha256", secret())
    .update(`${purpose}:${email}:${code}`)
    .digest("hex");
}

/** One-way fingerprint for abuse metadata. Never stores the raw value. */
export function hashMeta(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHmac("sha256", secret()).update(value).digest("hex").slice(0, 32);
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function signSession(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/* ----------------------------------------------------------------------- */
/* Result types (shared)                                                   */
/* ----------------------------------------------------------------------- */

export type RequestCodeResult =
  | { ok: true; cooldownSeconds: number; devCode?: string; emailSent: boolean }
  | { ok: false; reason: "cooldown" | "rate_limited"; retryAfterSeconds: number };

export type ConfirmCodeResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "too_many" | "incorrect" };

export type VerifiedEmailSession = {
  email: string;
  purpose: string;
  /**
   * What the user was verifying *for*, captured at confirm time and frozen
   * into the signed cookie. The billing boundary compares this against the
   * intent named by the checkout request, so a session verified for one offer
   * cannot silently be spent on another. `null` on sessions issued for flows
   * that carry no purchase intent (preferences, portal, lookup).
   */
  intent: string | null;
  verifiedAt: Date;
  expiresAt: Date;
};

type VerifiedSessionPayload = {
  email: string;
  purpose: string;
  intent?: string | null;
  verifiedAt: number;
  exp: number;
};

/* ----------------------------------------------------------------------- */
/* Factory                                                                 */
/* ----------------------------------------------------------------------- */

/**
 * Binds the verification logic to a product descriptor. Returns the full,
 * product-bound API surface (request/confirm + session cookie helpers). All
 * instances share the same DB table and secret; `purpose`/cookie name keep
 * them isolated.
 */
export function createVerification(product: VerificationDescriptor) {
  type Purpose = string;

  async function sendVerificationEmail(
    to: string,
    code: string,
    ttlMinutes: number,
    language?: string,
  ): Promise<boolean> {
    if (!verificationEmailConfigured()) return false;

    const text = renderVerificationText(product, code, ttlMinutes, language);
    const html = renderVerificationHtml(product, code, ttlMinutes, language);

    try {
      const { messageId } = await sendDailyEmail({
        to,
        subject: verificationCopy(language, product.email.productName, ttlMinutes).subject,
        text,
        html,
        operation: "send_verification",
        productKey: product.key,
      });
      return Boolean(messageId);
    } catch (err) {
      // sendDailyEmail emits the classified, PII-safe provider signal.
      return false;
    }
  }

  async function requestVerificationCode(args: {
    email: string;
    purpose: Purpose;
    intent?: string | null;
    language?: string;
    ipHash?: string | null;
    userAgentHash?: string | null;
  }): Promise<RequestCodeResult> {
    const { email, purpose } = args;
    const cfg = verificationConfig();
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const latest = await prisma.emailVerificationCode.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.resendAfter && now < latest.resendAfter) {
      return {
        ok: false,
        reason: "cooldown",
        retryAfterSeconds: Math.ceil((latest.resendAfter.getTime() - now.getTime()) / 1000),
      };
    }

    const [emailCount, ipCount] = await Promise.all([
      prisma.emailVerificationCode.count({ where: { email, createdAt: { gte: hourAgo } } }),
      args.ipHash
        ? prisma.emailVerificationCode.count({ where: { ipHash: args.ipHash, createdAt: { gte: hourAgo } } })
        : Promise.resolve(0),
    ]);
    if (
      emailCount >= cfg.maxRequestsPerEmailPerHour ||
      (args.ipHash && ipCount >= cfg.maxRequestsPerIpPerHour)
    ) {
      return { ok: false, reason: "rate_limited", retryAfterSeconds: 60 * 60 };
    }

    await prisma.emailVerificationCode.updateMany({
      where: { email, purpose, consumedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });

    const code = generateCode();
    await prisma.emailVerificationCode.create({
      data: {
        email,
        purpose,
        codeHash: hashCode(code, email, purpose),
        expiresAt: new Date(now.getTime() + cfg.ttlMinutes * 60 * 1000),
        resendAfter: new Date(now.getTime() + cfg.resendCooldownSeconds * 1000),
        maxAttempts: cfg.maxAttempts,
        ipHash: args.ipHash ?? null,
        userAgentHash: args.userAgentHash ?? null,
        intent: args.intent ?? null,
      },
    });

    const emailSent = await sendVerificationEmail(email, code, cfg.ttlMinutes, args.language);

    const isDev = process.env.NODE_ENV !== "production";
    if (!emailSent && isDev) {
      console.log(`[${product.key}-verification] dev code for ${email}: ${code}`);
    }

    return {
      ok: true,
      cooldownSeconds: cfg.resendCooldownSeconds,
      emailSent,
      devCode: !emailSent && isDev ? code : undefined,
    };
  }

  async function confirmVerificationCode(args: {
    email: string;
    purpose: Purpose;
    code: string;
  }): Promise<ConfirmCodeResult> {
    const { email, purpose, code } = args;
    const now = new Date();

    const row = await prisma.emailVerificationCode.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return { ok: false, reason: "invalid" };
    if (now >= row.expiresAt) return { ok: false, reason: "expired" };
    if (row.attempts >= row.maxAttempts) return { ok: false, reason: "too_many" };

    const matches = timingSafeStringEqual(row.codeHash, hashCode(code, email, purpose));
    if (!matches) {
      // Increment in the database rather than writing `row.attempts + 1`, so
      // parallel guesses each cost an attempt instead of overwriting one
      // another and effectively resetting the budget.
      const updated = await prisma.emailVerificationCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true, maxAttempts: true },
      });
      return {
        ok: false,
        reason: updated.attempts >= updated.maxAttempts ? "too_many" : "incorrect",
      };
    }

    // Single-use, enforced by the write itself: `consumedAt: null` is part of
    // the WHERE clause, so exactly one of any number of concurrent confirms
    // (or replays of the same code) can transition the row. The losers see
    // zero affected rows and are answered as if the code no longer exists,
    // which is what a replay is.
    const consumed = await prisma.emailVerificationCode.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) return { ok: false, reason: "invalid" };

    return { ok: true };
  }

  function createVerifiedSessionToken(
    email: string,
    purpose: Purpose,
    intent: string | null = null,
  ): string {
    const cfg = verificationConfig();
    const nowSec = Math.floor(Date.now() / 1000);
    const payload: VerifiedSessionPayload = {
      email,
      purpose,
      intent,
      verifiedAt: nowSec,
      exp: nowSec + cfg.sessionMinutes * 60,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${body}.${signSession(body)}`;
  }

  function verifyVerifiedSessionToken(token?: string): VerifiedEmailSession | null {
    if (!token || !emailVerificationSecretConfigured()) return null;
    const [body, sig] = token.split(".");
    if (!body || !sig || !timingSafeStringEqual(sig, signSession(body))) return null;
    try {
      const payload = JSON.parse(
        Buffer.from(body, "base64url").toString("utf8"),
      ) as VerifiedSessionPayload;
      if (!payload.email || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
        return null;
      }
      return {
        email: payload.email,
        purpose: payload.purpose,
        intent: typeof payload.intent === "string" ? payload.intent : null,
        verifiedAt: new Date(payload.verifiedAt * 1000),
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch {
      return null;
    }
  }

  function setVerifiedEmailCookie(
    res: NextResponse,
    email: string,
    purpose: Purpose,
    intent: string | null = null,
  ): void {
    const cfg = verificationConfig();
    res.cookies.set({
      name: product.cookieName,
      value: createVerifiedSessionToken(email, purpose, intent),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: cfg.sessionMinutes * 60,
    });
  }

  function clearVerifiedEmailCookie(res: NextResponse): void {
    res.cookies.set({
      name: product.cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  function getVerifiedEmailSession(): VerifiedEmailSession | null {
    const token = (cookies() as unknown as UnsafeUnwrappedCookies).get(product.cookieName)?.value;
    return verifyVerifiedSessionToken(token);
  }

  /**
   * Whether the current cookie proves control of `email`.
   *
   * When `intent` is given the session must have been verified for exactly
   * that intent. This is fail-closed on purpose: a session carrying no intent,
   * or a different one, does not satisfy an intent-scoped caller, so a user who
   * changes their mind after verifying has to re-verify rather than have the
   * server quietly bill the newly chosen thing against the old proof.
   */
  function hasVerifiedEmail(email: string, intent?: string): boolean {
    const session = getVerifiedEmailSession();
    if (!session) return false;
    if (session.email.toLowerCase() !== email.trim().toLowerCase()) return false;
    if (intent !== undefined && session.intent !== intent) return false;
    return true;
  }

  return {
    VERIFICATION_PURPOSES: product.purposes,
    VERIFIED_EMAIL_COOKIE: product.cookieName,
    requestVerificationCode,
    confirmVerificationCode,
    setVerifiedEmailCookie,
    clearVerifiedEmailCookie,
    getVerifiedEmailSession,
    hasVerifiedEmail,
  };
}
