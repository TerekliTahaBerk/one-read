import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const routePages = [
  ["/", "page.tsx"],
  ["/article", "article/page.tsx"],
  ["/pricing", "pricing/page.tsx"],
  ["/editorial", "editorial/page.tsx"],
  ["/samples/article", "samples/article/page.tsx"],
  ["/blog", "blog/page.tsx"],
];

describe("public page canonical metadata", () => {
  it.each(routePages)("uses the route itself as canonical for %s", (canonical, page) => {
    const source = readFileSync(new URL(page, import.meta.url), "utf8");
    expect(source).toContain(`canonical: "${canonical}"`);
  });

  it("does not impose the homepage canonical on every route from the root layout", () => {
    const source = readFileSync(new URL("layout.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("alternates: { canonical:");
  });
});
