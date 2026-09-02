import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const publicFiles = [
  "components/HomePageContent.tsx", "components/PricingPageContent.tsx",
  "components/OneReadSignup.tsx", "components/EditorialStandardsContent.tsx",
].map((path) => readFileSync(path, "utf8")).join("\n");

describe("public commercial truth", () => {
  it("does not restore closed or inaccurate claims", () => {
    expect(publicFiles).not.toMatch(/OneRead is \$1|one-click cancel|7-day free trial/i);
    expect(publicFiles).not.toMatch(/OneNews.{0,40}(every weekday|daily)/i);
  });

  it("keeps the six final prices and beta cadence visible", () => {
    for (const amount of [2, 18, 3, 27, 4, 36]) expect(publicFiles).toContain(String(amount));
    expect(publicFiles).toMatch(/Mon \/ Wed \/ Fri/);
  });
});
