import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("human unsubscribe page", () => {
  it("keeps GET render-only and submits an intentional POST", () => {
    const source = readFileSync(new URL("page.tsx", import.meta.url), "utf8");
    expect(source).toContain('method="post"');
    expect(source).toContain('action="/api/unsubscribe/human"');
    expect(source).not.toContain("prisma.");
    expect(source).not.toContain("applyUnsubscribe");
  });
});
