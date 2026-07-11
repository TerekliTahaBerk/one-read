import { afterEach, describe, expect, it } from "vitest";
import { getLaunchReadiness } from "./launch-readiness";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

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
});
