import { describe, expect, it } from "vitest";
import { selectOneNewsCandidate } from "./selection";
const candidates = [
  { id: "lead", topic: "business", subtopics: [], editorialRank: 0, readingLanguage: "English" },
  { id: "science", topic: "science", subtopics: [], editorialRank: 1, readingLanguage: "English" },
  { id: "design", topic: "design", subtopics: [], editorialRank: 2, readingLanguage: "English" },
  { id: "tr-lead", topic: "science", subtopics: [], editorialRank: 0, readingLanguage: "Turkish" },
];
describe("OneNews candidate selection", () => {
  it("prefers the primary topic over secondary topics and editorial rank", () => expect(selectOneNewsCandidate(candidates, ["design", "science"], "English").id).toBe("design"));
  it("uses a secondary topic when primary has no story", () => expect(selectOneNewsCandidate(candidates, ["technology", "science"], "English").id).toBe("science"));
  it.each([{ topics: [] }, { topics: ["health"] }])("falls back to the lead for legacy/empty or unmatched topics %j", ({ topics }) => expect(selectOneNewsCandidate(candidates, topics, "English").id).toBe("lead"));
  it("filters by this product's language", () => expect(selectOneNewsCandidate(candidates, ["science"], "Turkish").id).toBe("tr-lead"));
  it("requires an explicit editorial lead", () => expect(() => selectOneNewsCandidate(candidates.filter((c) => c.editorialRank !== 0), [], "English")).toThrow("publication_slot_requires_editorial_lead"));
  it("breaks ties by editorial rank independently of query order", () => {
    expect(selectOneNewsCandidate([...candidates, { ...candidates[1], id: "science-2", editorialRank: 4 }].reverse(), ["science"], "English").id).toBe("science");
  });
});
