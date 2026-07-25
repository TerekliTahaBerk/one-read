import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "./csv";

describe("admin CSV", () => {
  it("escapes quotes, commas, and arrays safely", () => {
    expect(csvCell('Finance, "Markets"')).toBe('"Finance, ""Markets"""');
    expect(csvCell(["Drama", "Comedy"])).toBe('"Drama | Comedy"');
    expect(csvRow(["a@example.com", null])).toBe('"a@example.com",""');
  });
});
