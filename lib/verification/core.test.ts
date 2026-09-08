/**
 * The verification half of the verification → checkout boundary.
 *
 * These tests pin the properties the boundary depends on: the plaintext code
 * never reaches storage, an expired code is refused, a consumed code cannot be
 * replayed into a second state transition, and the session the flow issues
 * carries — and is checked against — the purchase intent it was created for.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (name: string) => {
    const value = cookieStore.get(name);
    return value === undefined ? undefined : { name, value };
  } }),
}));

vi.mock("@/lib/resend", () => ({
  getResendStatus: vi.fn(() => ({ sendReady: false })),
  sendDailyEmail: vi.fn(),
}));

import { createVerification, type VerificationDescriptor } from "@/lib/verification/core";
import { getResendStatus, sendDailyEmail } from "@/lib/resend";
import { prisma as prismaImport } from "@/lib/prisma";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

const descriptor: VerificationDescriptor = {
  key: "test-product",
  purposes: { signup: "test-signup", preferences: "test-preferences" },
  cookieName: "test_verified_email",
  email: {
    brandLine: "b", productName: "p",
    theme: { background: "#000", surface: "#fff", accent: "#111", border: "#222" },
  },
};

const verification = createVerification(descriptor);
const EMAIL = "reader@example.test";
const PURPOSE = descriptor.purposes.signup;

/** A stored code row, valid unless a test overrides a field. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "code_1",
    email: EMAIL,
    purpose: PURPOSE,
    codeHash: "",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    consumedAt: null,
    attempts: 0,
    maxAttempts: 5,
    ...overrides,
  };
}

/** Captures what `setVerifiedEmailCookie` writes, standing in for a NextResponse. */
function fakeResponse() {
  const written: Record<string, unknown>[] = [];
  return { written, res: { cookies: { set: (o: Record<string, unknown>) => { written.push(o); } } } };
}

beforeEach(() => {
  mockReset(prisma);
  cookieStore.clear();
  process.env.EMAIL_VERIFICATION_SECRET = "test-verification-secret";
  prisma.emailVerificationCode.count.mockResolvedValue(0 as never);
  prisma.emailVerificationCode.updateMany.mockResolvedValue({ count: 1 } as never);
  prisma.emailVerificationCode.create.mockResolvedValue(row() as never);
});

afterEach(() => {
  delete process.env.EMAIL_VERIFICATION_SECRET;
  vi.clearAllMocks();
});

/** Issues a real code and returns it with the row that would have been stored. */
async function issueCode(): Promise<{ code: string; stored: Record<string, unknown> }> {
  prisma.emailVerificationCode.findFirst.mockResolvedValue(null as never);
  await verification.requestVerificationCode({ email: EMAIL, purpose: PURPOSE });
  const stored = prisma.emailVerificationCode.create.mock.calls[0]![0]!.data as Record<string, unknown>;
  // The code itself is never returned by the API, so recover it the only way a
  // holder of the secret can: by finding the digit string whose hash matches.
  // Six digits is small enough to search and keeps this test independent of
  // the module's internals.
  const { createHmac } = await import("crypto");
  for (let n = 0; n < 1_000_000; n += 1) {
    const candidate = String(n).padStart(6, "0");
    const hash = createHmac("sha256", "test-verification-secret")
      .update(`${PURPOSE}:${EMAIL}:${candidate}`).digest("hex");
    if (hash === stored.codeHash) {
      // Issuing invalidates any earlier codes, which is itself an updateMany.
      // Clear it so assertions below only see the consume write.
      prisma.emailVerificationCode.updateMany.mockClear();
      return { code: candidate, stored };
    }
  }
  throw new Error("issued code did not match its stored hash");
}

describe("code storage", () => {
  it("never writes the plaintext code to the database row", async () => {
    const { code, stored } = await issueCode();

    expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(code);
  });

  it("stores hashed request metadata rather than the raw IP or user agent", async () => {
    prisma.emailVerificationCode.findFirst.mockResolvedValue(null as never);
    await verification.requestVerificationCode({
      email: EMAIL, purpose: PURPOSE, ipHash: "hashed-ip", userAgentHash: "hashed-ua",
    });
    const stored = prisma.emailVerificationCode.create.mock.calls[0]![0]!.data as Record<string, unknown>;

    expect(stored.ipHash).toBe("hashed-ip");
    expect(stored.userAgentHash).toBe("hashed-ua");
  });
});

describe("confirming a code", () => {
  it("accepts the correct code exactly once", async () => {
    const { code, stored } = await issueCode();
    prisma.emailVerificationCode.findFirst.mockResolvedValue(row({ codeHash: stored.codeHash }) as never);

    await expect(
      verification.confirmVerificationCode({ email: EMAIL, purpose: PURPOSE, code }),
    ).resolves.toEqual({ ok: true });
    expect(prisma.emailVerificationCode.updateMany).toHaveBeenCalledWith({
      where: { id: "code_1", consumedAt: null },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it("refuses a replay that loses the race to consume the row", async () => {
    const { code, stored } = await issueCode();
    prisma.emailVerificationCode.findFirst.mockResolvedValue(row({ codeHash: stored.codeHash }) as never);
    // The row was consumed between the read and the write: no rows affected.
    prisma.emailVerificationCode.updateMany.mockResolvedValue({ count: 0 } as never);

    await expect(
      verification.confirmVerificationCode({ email: EMAIL, purpose: PURPOSE, code }),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses an already-consumed code, which is never re-read", async () => {
    const { code } = await issueCode();
    // Consumed rows are excluded by the query itself.
    prisma.emailVerificationCode.findFirst.mockResolvedValue(null as never);

    await expect(
      verification.confirmVerificationCode({ email: EMAIL, purpose: PURPOSE, code }),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(prisma.emailVerificationCode.updateMany).not.toHaveBeenCalled();
  });

  it("refuses an expired code without consuming it", async () => {
    const { code, stored } = await issueCode();
    prisma.emailVerificationCode.findFirst.mockResolvedValue(
      row({ codeHash: stored.codeHash, expiresAt: new Date(Date.now() - 1000) }) as never,
    );

    await expect(
      verification.confirmVerificationCode({ email: EMAIL, purpose: PURPOSE, code }),
    ).resolves.toEqual({ ok: false, reason: "expired" });
    expect(prisma.emailVerificationCode.updateMany).not.toHaveBeenCalled();
  });

  it("charges a wrong guess against the attempt budget atomically", async () => {
    const { stored } = await issueCode();
    prisma.emailVerificationCode.findFirst.mockResolvedValue(row({ codeHash: stored.codeHash }) as never);
    prisma.emailVerificationCode.update.mockResolvedValue({ attempts: 1, maxAttempts: 5 } as never);

    await expect(
      verification.confirmVerificationCode({ email: EMAIL, purpose: PURPOSE, code: "000000" }),
    ).resolves.toEqual({ ok: false, reason: "incorrect" });
    expect(prisma.emailVerificationCode.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } }),
    );
  });

  it("stops guessing once the budget is spent", async () => {
    const { stored } = await issueCode();
    prisma.emailVerificationCode.findFirst.mockResolvedValue(row({ codeHash: stored.codeHash }) as never);
    prisma.emailVerificationCode.update.mockResolvedValue({ attempts: 5, maxAttempts: 5 } as never);

    await expect(
      verification.confirmVerificationCode({ email: EMAIL, purpose: PURPOSE, code: "000000" }),
    ).resolves.toEqual({ ok: false, reason: "too_many" });
  });
});

describe("the verified session and its intent", () => {
  /** Verifies `email` for `intent` and installs the resulting cookie. */
  function verifySession(email: string, intent: string | null) {
    const { written, res } = fakeResponse();
    verification.setVerifiedEmailCookie(res as never, email, PURPOSE, intent);
    const cookie = written[0]!;
    cookieStore.set(cookie.name as string, cookie.value as string);
    return cookie;
  }

  it("issues an httpOnly cookie carrying no plaintext credential", () => {
    const cookie = verifySession(EMAIL, "checkout:one-read:annual");

    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(verification.getVerifiedEmailSession()).toMatchObject({
      email: EMAIL, purpose: PURPOSE, intent: "checkout:one-read:annual",
    });
  });

  it("accepts the intent it was verified for", () => {
    verifySession(EMAIL, "checkout:one-read:annual");
    expect(verification.hasVerifiedEmail(EMAIL, "checkout:one-read:annual")).toBe(true);
  });

  it.each([
    ["a different offer", "checkout:one-article:annual"],
    ["a different interval", "checkout:one-read:monthly"],
  ])("refuses %s", (_label, intent) => {
    verifySession(EMAIL, "checkout:one-read:annual");
    expect(verification.hasVerifiedEmail(EMAIL, intent)).toBe(false);
  });

  it("refuses an intent-scoped check against a session that carries no intent", () => {
    verifySession(EMAIL, null);

    expect(verification.hasVerifiedEmail(EMAIL)).toBe(true);
    expect(verification.hasVerifiedEmail(EMAIL, "checkout:one-read:annual")).toBe(false);
  });

  it("refuses a session belonging to another email", () => {
    verifySession(EMAIL, "checkout:one-read:annual");
    expect(verification.hasVerifiedEmail("someone@else.test", "checkout:one-read:annual")).toBe(false);
  });

  it("refuses a tampered cookie, intent included", () => {
    const cookie = verifySession(EMAIL, "checkout:one-article:monthly");
    const [body, signature] = (cookie.value as string).split(".");
    const payload = JSON.parse(Buffer.from(body!, "base64url").toString("utf8"));
    payload.intent = "checkout:one-read:annual";
    const forged = Buffer.from(JSON.stringify(payload)).toString("base64url");
    cookieStore.set(cookie.name as string, `${forged}.${signature}`);

    expect(verification.getVerifiedEmailSession()).toBeNull();
    expect(verification.hasVerifiedEmail(EMAIL, "checkout:one-read:annual")).toBe(false);
  });
});

describe("localized verification delivery", () => {
  it("sends the localized subject, HTML and text through the production sender", async () => {
    vi.mocked(getResendStatus).mockReturnValue({ sendReady: true } as ReturnType<typeof getResendStatus>);
    vi.mocked(sendDailyEmail).mockResolvedValue({ messageId: "test-message" });
    try {
      const result = await verification.requestVerificationCode({ email: EMAIL, purpose: PURPOSE, language: "tr" });
      expect(result).toMatchObject({ ok: true, emailSent: true });
      expect(sendDailyEmail).toHaveBeenCalledWith(expect.objectContaining({
        subject: "p doğrulama kodunuz",
        html: expect.stringContaining('<html lang="tr">'),
        text: expect.stringContaining("Bu kod 10 dakika geçerlidir."),
      }));
    } finally {
      vi.mocked(getResendStatus).mockReturnValue({ sendReady: false } as ReturnType<typeof getResendStatus>);
    }
  });
});
