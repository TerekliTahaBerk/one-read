import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResendStatus, sendDailyEmail } from "@/lib/resend";

/**
 * Product-agnostic email verification core. Proves a user controls an email by
 * sending a 6-digit code and checking it back. It deliberately does NOT grant
 * any billing/trial access — the billing provider (Polar) remains the sole
 * source of truth. Codes are never stored in plaintext (HMAC only).
 *
 * Each product (OneArticle, OneLingo, …) instantiates this via
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
  /** Verification email copy. */
  email: {
    subject: string;
    /** Uppercase brand line, e.g. "OneRead · OneArticle". */
    brandLine: string;
    /** Lead sentence, e.g. "Your OneArticle verification code is:". */
    intro: string;
    /** Plain-text first line, e.g. "Your OneArticle code is:". */
    textIntro: string;
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
  return getResendStatus().hasApiKey;
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
  verifiedAt: Date;
  expiresAt: Date;
};

type VerifiedSessionPayload = {
  email: string;
  purpose: string;
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
  ): Promise<boolean> {
    if (!verificationEmailConfigured()) return false;

    const text = [
      product.email.textIntro,
      ``,
      code,
      ``,
      `This code expires in ${ttlMinutes} minutes.`,
      ``,
      `If you did not request this, you can ignore this email.`,
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;">
            <tr>
              <td style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#6B6B6B;padding-bottom:24px;">
                ${product.email.brandLine}
              </td>
            </tr>
            <tr>
              <td style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111111;padding-bottom:16px;">
                ${product.email.intro}
              </td>
            </tr>
            <tr>
              <td style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:34px;font-weight:600;letter-spacing:0.18em;color:#111111;padding:8px 0 20px;">
                ${code}
              </td>
            </tr>
            <tr>
              <td style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.6;color:#6B6B6B;">
                This code expires in ${ttlMinutes} minutes.<br />
                If you did not request this, you can ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    try {
      const { messageId } = await sendDailyEmail({
        to,
        subject: product.email.subject,
        text,
        html,
      });
      return Boolean(messageId);
    } catch (err) {
      console.error(`[${product.key}-verification] send failed:`, err);
      return false;
    }
  }

  async function requestVerificationCode(args: {
    email: string;
    purpose: Purpose;
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
      },
    });

    const emailSent = await sendVerificationEmail(email, code, cfg.ttlMinutes);

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
      const attempts = row.attempts + 1;
      await prisma.emailVerificationCode.update({
        where: { id: row.id },
        data: { attempts },
      });
      return { ok: false, reason: attempts >= row.maxAttempts ? "too_many" : "incorrect" };
    }

    await prisma.emailVerificationCode.update({
      where: { id: row.id },
      data: { consumedAt: now },
    });
    return { ok: true };
  }

  function createVerifiedSessionToken(email: string, purpose: Purpose): string {
    const cfg = verificationConfig();
    const nowSec = Math.floor(Date.now() / 1000);
    const payload: VerifiedSessionPayload = {
      email,
      purpose,
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
  ): void {
    const cfg = verificationConfig();
    res.cookies.set({
      name: product.cookieName,
      value: createVerifiedSessionToken(email, purpose),
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
    const token = cookies().get(product.cookieName)?.value;
    return verifyVerifiedSessionToken(token);
  }

  function hasVerifiedEmail(email: string): boolean {
    const session = getVerifiedEmailSession();
    return Boolean(session && session.email.toLowerCase() === email.trim().toLowerCase());
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
