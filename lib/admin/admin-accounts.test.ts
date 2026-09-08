import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => undefined }) }));

import { prisma as prismaImport } from "@/lib/prisma";
import {
  inviteAdmin,
  listAdminAccounts,
  peekAdminInvite,
  redeemAdminInvite,
  revokeAdmin,
  verifyAdminCredentials,
  generateAdminPasswordHash,
} from "./auth";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

type Row = {
  email: string;
  passwordHash: string | null;
  createdBy: string | null;
  inviteExpiresAt: Date | null;
  updatedAt: Date;
};

function row(overrides: Partial<Row> = {}): Row {
  return {
    email: "invited@example.com",
    passwordHash: null,
    createdBy: "root@oneread",
    inviteExpiresAt: new Date(Date.now() + 3_600_000),
    updatedAt: new Date(),
    ...overrides,
  };
}

function manyRows(rows: Row[]) {
  (prisma.adminCredential.findMany as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue(rows as never);
}
function oneRow(value: unknown) {
  (prisma.adminCredential.findUnique as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue(value as never);
}
function firstRow(value: unknown) {
  (prisma.adminCredential.findFirst as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue(value as never);
}
function updateManyCount(count: number) {
  (prisma.adminCredential.updateMany as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue({ count } as never);
}

beforeEach(() => {
  mockReset(prisma);
  vi.stubEnv("ADMIN_EMAIL", "root@oneread.email");
  vi.stubEnv("ADMIN_PASSWORD_HASH", generateAdminPasswordHash("RootPassword!2026"));
  vi.stubEnv("ADMIN_ADDITIONAL_ACCOUNTS", "");
  manyRows([]);
  oneRow(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("listAdminAccounts", () => {
  it("merges deployment and panel accounts, marking which are removable", async () => {
    manyRows([row({ email: "panel@example.com", passwordHash: "pbkdf2_sha256:1:a:b" })]);

    const accounts = await listAdminAccounts();
    expect(accounts).toEqual([
      expect.objectContaining({ email: "root@oneread.email", origin: "deployment", removable: false, active: true }),
      expect.objectContaining({ email: "panel@example.com", origin: "panel", removable: true, active: true }),
    ]);
  });

  it("marks an unredeemed invitation as unable to sign in", async () => {
    manyRows([row()]);
    const invited = (await listAdminAccounts()).find((a) => a.email === "invited@example.com")!;
    expect(invited).toMatchObject({ active: false, invitePending: true });
  });

  it("does not duplicate a deployment admin that also has a password override", async () => {
    manyRows([row({ email: "root@oneread.email", passwordHash: "pbkdf2_sha256:1:a:b" })]);
    const accounts = await listAdminAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ email: "root@oneread.email", origin: "deployment" });
  });

  it("still lists deployment admins when the database is unreachable", async () => {
    (prisma.adminCredential.findMany as unknown as { mockRejectedValue: (v: unknown) => void })
      .mockRejectedValue(new Error("connection refused"));
    const accounts = await listAdminAccounts();
    expect(accounts.map((a) => a.email)).toEqual(["root@oneread.email"]);
  });
});

describe("inviteAdmin", () => {
  it("creates an account with no password and returns a one-time token", async () => {
    const result = await inviteAdmin("New.Admin@Example.com ", "root@oneread.email");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.email).toBe("new.admin@example.com");
    expect(result.token).toHaveLength(43); // 32 random bytes, base64url

    const call = (prisma.adminCredential.upsert as unknown as { mock: { calls: [Record<string, never>][] } })
      .mock.calls[0][0] as unknown as { create: { passwordHash: unknown; inviteTokenHash: string } };
    expect(call.create.passwordHash).toBeNull();
    // The token is stored hashed, never in plaintext.
    expect(call.create.inviteTokenHash).not.toContain(result.token);
  });

  it("refuses an address that is already an active administrator", async () => {
    oneRow({ passwordHash: "pbkdf2_sha256:1:a:b" });
    await expect(inviteAdmin("panel@example.com", "root@oneread.email"))
      .resolves.toEqual({ ok: false, error: "already_an_admin" });
    expect(prisma.adminCredential.upsert).not.toHaveBeenCalled();
  });

  it("refuses an address the deployment already names", async () => {
    await expect(inviteAdmin("root@oneread.email", "root@oneread.email"))
      .resolves.toEqual({ ok: false, error: "already_a_deployment_admin" });
  });

  it("rejects a malformed address", async () => {
    await expect(inviteAdmin("not-an-email", "root@oneread.email"))
      .resolves.toEqual({ ok: false, error: "invalid_email" });
  });
});

describe("revokeAdmin", () => {
  it("refuses to remove a deployment administrator", async () => {
    await expect(revokeAdmin("root@oneread.email", "root@oneread.email"))
      .resolves.toEqual({ ok: false, error: "cannot_remove_deployment_admin" });
    expect(prisma.adminCredential.delete).not.toHaveBeenCalled();
  });

  it("refuses to remove the last administrator who can sign in", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    manyRows([row({ email: "only@example.com", passwordHash: "pbkdf2_sha256:1:a:b" })]);

    await expect(revokeAdmin("only@example.com", "actor"))
      .resolves.toEqual({ ok: false, error: "cannot_remove_last_admin" });
    expect(prisma.adminCredential.delete).not.toHaveBeenCalled();
  });

  it("removes a panel administrator when another can still sign in", async () => {
    manyRows([row({ email: "panel@example.com", passwordHash: "pbkdf2_sha256:1:a:b" })]);
    await expect(revokeAdmin("panel@example.com", "root@oneread.email")).resolves.toEqual({ ok: true });
    expect(prisma.adminCredential.delete).toHaveBeenCalledWith({ where: { email: "panel@example.com" } });
  });
});

describe("redeemAdminInvite", () => {
  it("enforces the same password policy as a password change", async () => {
    firstRow({ email: "invited@example.com" });
    await expect(redeemAdminInvite("token", "Taha123"))
      .resolves.toEqual({ ok: false, error: "password_too_short" });
    expect(prisma.adminCredential.updateMany).not.toHaveBeenCalled();
  });

  it("sets the password and clears the token in one conditional write", async () => {
    firstRow({ email: "invited@example.com" });
    updateManyCount(1);
    oneRow({ sessionVersion: 1 });

    const result = await redeemAdminInvite("token", "ValidPassword!2026");
    expect(result).toMatchObject({ ok: true, email: "invited@example.com" });

    const call = (prisma.adminCredential.updateMany as unknown as { mock: { calls: [Record<string, never>][] } })
      .mock.calls[0][0] as unknown as { where: { passwordHash: null }; data: { inviteTokenHash: null } };
    expect(call.where.passwordHash).toBeNull();
    expect(call.data.inviteTokenHash).toBeNull();
  });

  it("cannot be replayed once the token is consumed", async () => {
    firstRow({ email: "invited@example.com" });
    updateManyCount(0); // another redemption won the race
    await expect(redeemAdminInvite("token", "ValidPassword!2026"))
      .resolves.toEqual({ ok: false, error: "invite_invalid_or_expired" });
  });

  it("rejects an unknown or expired token without revealing which", async () => {
    firstRow(null);
    await expect(redeemAdminInvite("nope", "ValidPassword!2026"))
      .resolves.toEqual({ ok: false, error: "invite_invalid_or_expired" });
    await expect(peekAdminInvite("nope")).resolves.toBeNull();
  });
});

describe("verifyAdminCredentials", () => {
  it("authenticates a panel administrator with no deployment entry", async () => {
    oneRow({ passwordHash: generateAdminPasswordHash("PanelPassword!2026") });
    await expect(verifyAdminCredentials("panel@example.com", "PanelPassword!2026")).resolves.toBe(true);
  });

  it("refuses an invited administrator who has not chosen a password", async () => {
    oneRow({ passwordHash: null });
    await expect(verifyAdminCredentials("invited@example.com", "anything at all")).resolves.toBe(false);
  });

  it("still refuses an address that is not an administrator at all", async () => {
    oneRow(null);
    await expect(verifyAdminCredentials("stranger@example.com", "whatever")).resolves.toBe(false);
  });

  it("lets a database override replace a deployment password", async () => {
    oneRow({ passwordHash: generateAdminPasswordHash("RotatedPassword!2026") });
    await expect(verifyAdminCredentials("root@oneread.email", "RotatedPassword!2026")).resolves.toBe(true);
    await expect(verifyAdminCredentials("root@oneread.email", "RootPassword!2026")).resolves.toBe(false);
  });
});
