import { describe, expect, it } from "vitest";
import { selectArticleEdition } from "./selection";
const candidates = [
  { id: "fallback", topics: ["business"], createdAt: new Date(1) },
  { id: "science", topics: ["science"], createdAt: new Date(2) },
  { id: "design", topics: ["design"], createdAt: new Date(3) },
];
describe("live OneArticle personalization using existing scorer", () => {
  it("prefers primary topic", () => expect(selectArticleEdition(candidates, { primaryInterest: "design", secondaryInterests: ["science"] }).id).toBe("design"));
  it("uses secondary topic", () => expect(selectArticleEdition(candidates, { primaryInterest: "health", secondaryInterests: ["science"] }).id).toBe("science"));
  it("uses deterministic fallback with no match or legacy empty preferences", () => {
    expect(selectArticleEdition(candidates, { interests: ["Health"] }).id).toBe("fallback");
    expect(selectArticleEdition(candidates, null).id).toBe("fallback");
  });
});
