import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const activeWritingAndDeliveryFiles = [
  "components/admin/EditorialIssueEditor.tsx",
  "app/api/admin/one-article/editorial/route.ts",
  "app/api/cron/daily/route.ts",
  "lib/one-article/editorial.ts",
  "lib/one-article/editorial-email.ts",
  "lib/one-article/editorial-validation.ts",
];

describe("manual OneArticle editorial boundary", () => {
  it("keeps AI, RSS and generation modules outside every active writing path", () => {
    for (const file of activeWritingAndDeliveryFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(
        /(?:@\/lib\/(?:llm|ai|pipeline|rss-source)|\/generator["'])/,
      );
    }
  });

  it("has no active OneArticle generation endpoint", () => {
    expect(() =>
      readFileSync(
        resolve(process.cwd(), "app/api/admin/one-article/generate/route.ts"),
        "utf8",
      ),
    ).toThrow();
  });
});
