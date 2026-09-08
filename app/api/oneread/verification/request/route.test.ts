import { beforeEach, describe, expect, it, vi } from "vitest";
const requestVerificationCode = vi.fn();
vi.mock("@/lib/oneread/verification", () => ({
  VERIFICATION_PURPOSES: { signup: "one-read-signup" },
  emailVerificationSecretConfigured: () => true,
  hashMeta: () => null,
  requestVerificationCode: (...args: unknown[]) => requestVerificationCode(...args),
}));
vi.mock("@/lib/observability", () => ({ reportOperationalEvent: vi.fn() }));
import { POST } from "./route";

beforeEach(() => requestVerificationCode.mockReset().mockResolvedValue({ ok: true, emailSent: true, cooldownSeconds: 60 }));

describe("verification email locale", () => {
  it.each([
    [{ locale: "tr" }, "en-US", "tr"],
    [{}, "de-DE,de;q=0.9", "de"],
    [{ locale: { unsafe: true } }, "fr-FR", "fr"],
    [{}, "ja", "en"],
  ])("passes a supported language to the sender", async (body, acceptLanguage, expected) => {
    const response = await POST(new Request("https://oneread.test/api/oneread/verification/request", {
      method: "POST", headers: { "accept-language": acceptLanguage },
      body: JSON.stringify({ email: "reader@example.com", ...body }),
    }));
    expect(response.status).toBe(200);
    expect(requestVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ language: expected, purpose: "one-read-signup" }));
  });
});
