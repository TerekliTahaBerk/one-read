import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const adminCredential = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { adminCredential },
}));

import {
  adminLoginConfigured,
  changeAdminPassword,
  configuredAdminEmails,
  generateAdminPasswordHash,
  validateAdminPassword,
  verifyAdminCredentials,
} from "./auth";

const KEYS = [
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD_HASH",
  "ADMIN_PASSWORD",
  "ADMIN_ADDITIONAL_ACCOUNTS",
  "ADMIN_SESSION_SECRET",
] as const;

const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

describe("multi-admin credentials", () => {
  beforeEach(() => {
    adminCredential.findUnique.mockReset();
    adminCredential.findUnique.mockResolvedValue(null);
    adminCredential.upsert.mockReset();
    for (const key of KEYS) delete process.env[key];
    process.env.ADMIN_SESSION_SECRET = "test-session-secret";
  });

  afterEach(() => {
    for (const key of KEYS) {
      const value = original[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("accepts primary and equally privileged additional hashed admins", async () => {
    process.env.ADMIN_EMAIL = "owner@example.com";
    process.env.ADMIN_PASSWORD_HASH = generateAdminPasswordHash("owner-password");
    process.env.ADMIN_ADDITIONAL_ACCOUNTS = JSON.stringify([
      {
        email: "Second.Admin@Example.com",
        passwordHash: generateAdminPasswordHash("second-password"),
      },
    ]);

    expect(adminLoginConfigured()).toBe(true);
    expect(configuredAdminEmails()).toEqual([
      "owner@example.com",
      "second.admin@example.com",
    ]);
    await expect(
      verifyAdminCredentials("second.admin@example.com", "second-password"),
    ).resolves.toBe(true);
    await expect(
      verifyAdminCredentials("owner@example.com", "owner-password"),
    ).resolves.toBe(true);
  });

  it("fails closed for malformed configuration or a wrong password", async () => {
    process.env.ADMIN_ADDITIONAL_ACCOUNTS = "{not-json";
    expect(adminLoginConfigured()).toBe(false);
    await expect(
      verifyAdminCredentials("second.admin@example.com", "second-password"),
    ).resolves.toBe(false);

    process.env.ADMIN_ADDITIONAL_ACCOUNTS = JSON.stringify([
      {
        email: "second.admin@example.com",
        passwordHash: generateAdminPasswordHash("correct-password"),
      },
    ]);
    await expect(
      verifyAdminCredentials("second.admin@example.com", "wrong-password"),
    ).resolves.toBe(false);
  });

  it("uses a database password override ahead of the bootstrap env hash", async () => {
    process.env.ADMIN_EMAIL = "owner@example.com";
    process.env.ADMIN_PASSWORD_HASH = generateAdminPasswordHash("Old-password-1");
    adminCredential.findUnique.mockResolvedValue({
      passwordHash: generateAdminPasswordHash("New-password-2"),
    });

    await expect(
      verifyAdminCredentials("owner@example.com", "Old-password-1"),
    ).resolves.toBe(false);
    await expect(
      verifyAdminCredentials("owner@example.com", "New-password-2"),
    ).resolves.toBe(true);
  });

  it("validates strong passwords without embedding the admin email", () => {
    expect(validateAdminPassword("short", "owner@example.com")).toBe(
      "password_too_short",
    );
    expect(validateAdminPassword("owner-Secure-Password-9", "owner@example.com")).toBe(
      "password_contains_email",
    );
    expect(validateAdminPassword("Correct-Horse-9-Battery", "owner@example.com")).toBeNull();
  });

  it("changes only the signed-in admin credential and increments session version", async () => {
    process.env.ADMIN_EMAIL = "owner@example.com";
    process.env.ADMIN_PASSWORD_HASH = generateAdminPasswordHash("Current-pass-1");
    adminCredential.upsert.mockResolvedValue({ sessionVersion: 3 });

    await expect(
      changeAdminPassword({
        email: "owner@example.com",
        currentPassword: "Current-pass-1",
        newPassword: "New-Secure-Pass-2!",
      }),
    ).resolves.toEqual({ ok: true, sessionVersion: 3 });
    expect(adminCredential.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "owner@example.com" },
        update: expect.objectContaining({
          sessionVersion: { increment: 1 },
          changedBy: "owner@example.com",
        }),
      }),
    );
  });
});
