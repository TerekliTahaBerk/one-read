import { describe, expect, it } from "vitest";
import { articlePreferenceFields, articleTopics, parseProductPreferences, parseProductTopics, requiredPreferenceProducts } from "./product-preferences";

describe("canonical product preferences", () => {
  it.each([[], Array(6).fill("science"), ["Science"], ["unknown"], ["science", "science"], null])("rejects invalid or unbounded selections %j", (topics) => {
    expect(parseProductTopics(topics)).toBeNull();
  });
  it("preserves primary selection, legacy labels, and secondary slugs", () => {
    const value = { topics: ["design", "science", "technology"], summaryLanguage: "Turkish" };
    expect(articlePreferenceFields(value)).toEqual({ interests: ["Design", "Science", "Technology"], primaryInterest: "design", secondaryInterests: ["science", "technology"], summaryLanguage: "Turkish" });
    expect(articleTopics(articlePreferenceFields(value))).toEqual(value.topics);
    expect(articleTopics({ interests: ["Science"] })).toEqual(["science"]);
  });
  it("rejects invalid language and returns independent copies", () => {
    expect(parseProductPreferences({ topics: ["science"], summaryLanguage: "Any" })).toBeNull();
    const source = ["science"];
    const saved = parseProductTopics(source)!;
    source.push("design");
    expect(saved).toEqual(["science"]);
  });
  it("orders the bundle article first", () => {
    expect(requiredPreferenceProducts("one-read")).toEqual(["one-article", "one-news"]);
  });
});
