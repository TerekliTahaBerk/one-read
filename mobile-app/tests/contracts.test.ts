import { describe, expect, it } from "vitest";
import { articleSchema, exploreSchema, todaySchema } from "../src/api/schemas";
import { fixtureArchive, fixtureToday, todayArticle } from "../src/api/fixtures";
import { internalDestination } from "../src/utils/links";

describe("mobile contracts", () => {
  it("accepts the production-shaped Today fixture", () => expect(todaySchema.parse(fixtureToday).issue?.id).toBe(todayArticle.id));
  it("keeps Explore sections finite", () => expect(() => exploreSchema.parse({ sections: [{ id: "too-many", title: "No", subtitle: "No", items: [...fixtureArchive, todayArticle] }] })).toThrow());
  it("rejects insecure source URLs", () => expect(() => articleSchema.parse({ ...todayArticle, source: { ...todayArticle.source!, url: "http://example.com" } })).toThrow());
});

describe("deep links", () => {
  it("allows known destinations", () => expect(internalDestination("oneread://article/fixture-1")).toEqual({ pathname: "/article/[id]", params: { id: "fixture-1" } }));
  it("rejects redirects and unknown hosts", () => {
    expect(internalDestination("oneread://open?url=https://evil.example")).toBeNull();
    expect(internalDestination("https://evil.example/article/fixture-1")).toBeNull();
  });
});
