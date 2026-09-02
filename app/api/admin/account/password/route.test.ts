import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  readAdminSessionFromRequest: vi.fn(),
  changeAdminPassword: vi.fn(),
  setAdminSessionCookie: vi.fn(),
  // Stands in for the shared same-origin guard, which is unit-tested against
  // the real implementation in lib/admin/auth.test.ts.
  requireAdminMutation: vi.fn(),
}));
const recordAudit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/auth", () => auth);
vi.mock("@/lib/admin/audit", () => ({ recordAudit }));

import { POST } from "./route";

function request(body: unknown, origin = "https://www.oneread.email") {
  return new Request("https://www.oneread.email/api/admin/account/password", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/account/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.readAdminSessionFromRequest.mockResolvedValue({
      email: "owner@example.com",
      expiresAt: new Date(Date.now() + 60_000),
    });
    auth.changeAdminPassword.mockResolvedValue({ ok: true, sessionVersion: 2 });
    auth.requireAdminMutation.mockImplementation(async (req: Request) => {
      const origin = req.headers.get("origin");
      return origin && origin !== new URL(req.url).origin
        ? Response.json({ ok: false, error: "cross_origin_mutation_rejected" }, { status: 403 })
        : null;
    });
  });

  it("requires a browser admin session", async () => {
    auth.readAdminSessionFromRequest.mockResolvedValue(null);
    const response = await POST(
      request({ currentPassword: "Current-pass-1", newPassword: "New-pass-2!" }),
    );
    expect(response.status).toBe(401);
    expect(auth.changeAdminPassword).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin password change", async () => {
    const response = await POST(
      request(
        { currentPassword: "Current-pass-1", newPassword: "New-pass-2!" },
        "https://attacker.example",
      ),
    );
    expect(response.status).toBe(403);
    expect(auth.changeAdminPassword).not.toHaveBeenCalled();
  });

  it("changes the signed-in admin password, audits it, and refreshes the session", async () => {
    const response = await POST(
      request({
        currentPassword: "Current-pass-1",
        newPassword: "New-Secure-Pass-2!",
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: "password_changed",
      otherSessionsRevoked: true,
    });
    expect(auth.changeAdminPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      currentPassword: "Current-pass-1",
      newPassword: "New-Secure-Pass-2!",
    });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: "owner@example.com",
        action: "admin.password.changed",
      }),
    );
    expect(auth.setAdminSessionCookie).toHaveBeenCalledWith(
      expect.any(Response),
      "owner@example.com",
    );
  });
});
