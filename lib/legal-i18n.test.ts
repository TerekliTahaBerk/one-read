import { describe, expect, it } from "vitest";
import { LEGAL_DICTIONARIES } from "./legal-i18n";

function flatten(value: unknown): string {
  return JSON.stringify(value);
}

describe("public legal copy", () => {
  it("contains no launch placeholders or obsolete contact domains", () => {
    const copy = flatten(LEGAL_DICTIONARIES);
    expect(copy).not.toMatch(/insert|lansman öncesi|vor dem launch|avant le lancement/i);
    expect(copy).not.toContain("hello@oneread.com");
    expect(copy).not.toContain("hello@oneread.app");
    expect(copy).toContain("hello@oneread.email");
  });

  it("keeps product scope, monthly billing, USD, and governing law aligned in every locale", () => {
    for (const legal of Object.values(LEGAL_DICTIONARIES)) {
      const terms = flatten(legal.terms);
      expect(terms).toContain("OneArticle");
      expect(terms).not.toContain("OneFilm");
      expect(terms).toMatch(/monthly|aylık|monat|mensuel/i);
      expect(terms).toContain("USD");
      expect(terms).toMatch(/Türkiye/);
    }
  });
});
