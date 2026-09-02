import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "ors_1";
const DEFAULT_SESSION_DAYS = 90;

function sessionSecret(): string {
  const value = process.env.MOBILE_SESSION_SECRET?.trim();
  if (!value) throw new Error("MOBILE_SESSION_SECRET is not configured");
  return value;
}

export function mobileSessionConfigured(): boolean {
  return Boolean(process.env.MOBILE_SESSION_SECRET?.trim());
}

function tokenHash(token: string): string {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return timingSafeEqual(left, right);
}

export async function createMobileSession(args: {
  contactId: string;
  deviceLabel?: string | null;
  now?: Date;
}): Promise<{ token: string; expiresAt: Date }> {
  const now = args.now ?? new Date();
  const days = Math.max(1, Number(process.env.MOBILE_SESSION_DAYS) || DEFAULT_SESSION_DAYS);
  const selector = randomBytes(12).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  const token = `${TOKEN_PREFIX}.${selector}.${secret}`;
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.mobileSession.create({
    data: {
      contactId: args.contactId,
      selector,
      tokenHash: tokenHash(token),
      deviceLabel: args.deviceLabel?.slice(0, 120) || null,
      expiresAt,
      lastUsedAt: now,
    },
  });
  return { token, expiresAt };
}

export type AuthenticatedMobileSession = {
  id: string;
  contactId: string;
};

export async function authenticateMobileRequest(
  request: Request | NextRequest,
  now = new Date(),
): Promise<AuthenticatedMobileSession | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(ors_1\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{43}))$/.exec(header);
  if (!match) return null;

  const token = match[1];
  const selector = match[2];
  const session = await prisma.mobileSession.findUnique({ where: { selector } });
  if (!session || session.revokedAt || session.expiresAt <= now) return null;
  if (!safeEqual(session.tokenHash, tokenHash(token))) return null;

  if (now.getTime() - session.lastUsedAt.getTime() > 15 * 60 * 1000) {
    await prisma.mobileSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { lastUsedAt: now },
    });
  }
  return { id: session.id, contactId: session.contactId };
}

export async function revokeMobileSession(id: string, now = new Date()) {
  await prisma.mobileSession.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: now },
  });
}

export function hashPushToken(token: string): string {
  return createHmac("sha256", sessionSecret()).update(`push:${token}`).digest("hex");
}
