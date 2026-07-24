import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminLoginConfigured,
  configuredAdminEmails,
  generateAdminPasswordHash,
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
});
