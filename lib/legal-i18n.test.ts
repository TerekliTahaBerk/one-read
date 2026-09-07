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

  it("keeps product scope, both billing intervals, USD, and governing law aligned in every locale", () => {
    for (const legal of Object.values(LEGAL_DICTIONARIES)) {
      const terms = flatten(legal.terms);
      // Both launch products are in scope; the retired one never is.
      expect(terms).toContain("OneArticle");
      expect(terms).toContain("OneNews");
      expect(terms).not.toContain("OneFilm");
      // Offers are sold monthly *and* annually, so the terms may not describe
      // OneRead as a monthly-only subscription.
      expect(terms).toMatch(/monthly|aylık|monat|au mois/i);
      expect(terms).toMatch(/annually|yıllık|jährlich|à l'année/i);
      expect(terms).toContain("USD");
      expect(terms).toMatch(/Türkiye/);
    }
  });
});
