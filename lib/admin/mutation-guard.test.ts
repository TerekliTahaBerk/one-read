import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const adminCredential = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { adminCredential },
}));

import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminToken,
  requireAdminMutation,
  setAdminSessionCookie,
} from "./auth";

const ORIGIN = "https://www.oneread.email";
const URL_UNDER_TEST = `${ORIGIN}/api/admin/one-article/action`;

const originalToken = process.env.ADMIN_TOKEN;
const originalSecret = process.env.ADMIN_SESSION_SECRET;
const originalEmail = process.env.ADMIN_EMAIL;
const ADMIN = "owner@example.com";

/** Mints a genuine signed session cookie so the guard runs unmocked. */
async function sessionCookie(): Promise<string> {
  adminCredential.findUnique.mockResolvedValue({ sessionVersion: 1 });
  const response = NextResponse.json({ ok: true });
  await setAdminSessionCookie(response, ADMIN);
  return response.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_TOKEN = "machine-token";
  process.env.ADMIN_SESSION_SECRET = "session-secret-for-tests";
  process.env.ADMIN_EMAIL = ADMIN;
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.ADMIN_TOKEN;
  else process.env.ADMIN_TOKEN = originalToken;
  if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = originalSecret;
  if (originalEmail === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = originalEmail;
});

function post(headers: Record<string, string>) {
  return new Request(URL_UNDER_TEST, { method: "POST", headers });
}

describe("admin mutation same-origin guard", () => {
  it("rejects a request with no session and no bearer token", async () => {
    const denied = await requireAdminMutation(post({}));
    expect(denied?.status).toBe(401);
  });

  it("accepts a same-origin session mutation", async () => {
    const denied = await requireAdminMutation(
      post({ cookie: `${ADMIN_SESSION_COOKIE}=${await sessionCookie()}`, origin: ORIGIN }),
    );
    expect(denied).toBeNull();
  });

  it("rejects a session mutation posted from another origin", async () => {
    const denied = await requireAdminMutation(
      post({
        cookie: `${ADMIN_SESSION_COOKIE}=${await sessionCookie()}`,
        origin: "https://attacker.example",
      }),
    );
    expect(denied?.status).toBe(403);
    await expect(denied?.json()).resolves.toEqual({
      ok: false,
      error: "cross_origin_mutation_rejected",
    });
  });

  it("rejects a session mutation the browser marks as cross-site", async () => {
    const denied = await requireAdminMutation(
      post({
        cookie: `${ADMIN_SESSION_COOKIE}=${await sessionCookie()}`,
        "sec-fetch-site": "cross-site",
      }),
    );
    expect(denied?.status).toBe(403);
  });

  it("accepts a machine caller presenting the Authorization bearer", async () => {
    const denied = await requireAdminMutation(
      post({ authorization: "Bearer machine-token" }),
    );
    expect(denied).toBeNull();
  });

  it("rejects a machine caller presenting a wrong bearer", async () => {
    const denied = await requireAdminMutation(
      post({ authorization: "Bearer not-the-token" }),
    );
    expect(denied?.status).toBe(401);
  });
});

describe("admin token extraction", () => {
  it("reads the token only from the Authorization header", () => {
    const request = post({ authorization: "Bearer machine-token" });
    expect(getAdminToken(request)).toBe("machine-token");
  });

  it("never accepts a secret from the query string", () => {
    const request = new Request(`${URL_UNDER_TEST}?token=machine-token`, {
      method: "POST",
    });
    expect(getAdminToken(request)).toBe("");
  });

  it("never accepts a secret from the request body", () => {
    const request = post({});
    expect(getAdminToken(request, { token: "machine-token" })).toBe("");
  });

  it("refuses a query-string token end to end", async () => {
    const request = new Request(`${URL_UNDER_TEST}?token=machine-token`, {
      method: "POST",
    });
    const denied = await requireAdminMutation(request, { token: "machine-token" });
    expect(denied?.status).toBe(401);
  });
});
