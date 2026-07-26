import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 30 * 60 * 1000;
const MAX_FAILURES = 5;

function throttleKey(kind: "email" | "ip", value: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is required for login throttling.");
  return createHmac("sha256", secret)
    .update(`${kind}:${value.trim().toLowerCase()}`)
    .digest("hex");
}

export function adminLoginThrottleKeys(email: string, ip: string | null): string[] {
  const keys = [throttleKey("email", email || "(empty)")];
  if (ip) keys.push(throttleKey("ip", ip));
  return keys;
}

export async function checkAdminLoginRateLimit(
  keys: string[],
  now = new Date(),
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const blocked = await prisma.adminLoginThrottle.findFirst({
    where: {
      key: { in: keys },
      blockedUntil: { gt: now },
    },
    orderBy: { blockedUntil: "desc" },
    select: { blockedUntil: true },
  });
  if (!blocked?.blockedUntil) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((blocked.blockedUntil.getTime() - now.getTime()) / 1000),
    ),
  };
}

export async function recordAdminLoginFailure(
  keys: string[],
  now = new Date(),
): Promise<void> {
  const cutoff = new Date(now.getTime() - WINDOW_MS);
  await prisma.$transaction(async (tx) => {
    for (const key of keys) {
      const current = await tx.adminLoginThrottle.findUnique({ where: { key } });
      const resetWindow = !current || current.windowStarted < cutoff;
      const attempts = resetWindow ? 1 : current.attempts + 1;
      const blockedUntil =
        attempts >= MAX_FAILURES ? new Date(now.getTime() + BLOCK_MS) : null;

      await tx.adminLoginThrottle.upsert({
        where: { key },
        create: {
          key,
          attempts,
          windowStarted: now,
          blockedUntil,
        },
        update: {
          attempts,
          windowStarted: resetWindow ? now : current.windowStarted,
          blockedUntil,
        },
      });
    }
  });
}

export async function clearAdminLoginFailures(keys: string[]): Promise<void> {
  await prisma.adminLoginThrottle.deleteMany({ where: { key: { in: keys } } });
}
