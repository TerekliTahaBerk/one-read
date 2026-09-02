import { afterEach, describe, expect, it } from "vitest";
import { getLaunchReadiness } from "./launch-readiness";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

/** NODE_ENV is typed readonly; this test exercises production mode. */
function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("launch readiness", () => {
  it("recognizes Gemini as a production AI provider", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "configured-for-test";
    const checks = getLaunchReadiness();
    expect(checks.find((c) => c.key === "AI_PROVIDER")?.status).toBe("pass");
    expect(checks.find((c) => c.key === "GEMINI_API_KEY / provider key")?.status).toBe("pass");
  });

  it("requires the selected Gemini key", () => {
    process.env.AI_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    const check = getLaunchReadiness().find((c) => c.key === "GEMINI_API_KEY / provider key");
    expect(check?.status).toBe("missing");
  });

  it("treats subscriber verification and the OneRead product as launch blockers", () => {
    setNodeEnv("production");
    process.env.BILLING_PROVIDER = "polar";
    delete process.env.EMAIL_VERIFICATION_SECRET;
    delete process.env.POLAR_ONEREAD_PRODUCT_ID;

    const checks = getLaunchReadiness();

    expect(checks.find((c) => c.key === "EMAIL_VERIFICATION_SECRET")?.status).toBe("missing");
    expect(checks.find((c) => c.key === "POLAR_ONEREAD_PRODUCT_ID")?.status).toBe("missing");
  });

  it("passes the OneRead launch-critical configuration when present", () => {
    process.env.EMAIL_VERIFICATION_SECRET = "configured-for-test";
    process.env.POLAR_ONEREAD_PRODUCT_ID = "product_test";

    const checks = getLaunchReadiness();

    expect(checks.find((c) => c.key === "EMAIL_VERIFICATION_SECRET")?.status).toBe("pass");
    expect(checks.find((c) => c.key === "POLAR_ONEREAD_PRODUCT_ID")?.status).toBe("pass");
  });
});
