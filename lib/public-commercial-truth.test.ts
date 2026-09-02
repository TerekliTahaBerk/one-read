import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const publicFiles = [
  "components/HomePageContent.tsx", "components/PricingPageContent.tsx",
  "components/OneReadSignup.tsx", "components/EditorialStandardsContent.tsx",
].map((path) => readFileSync(path, "utf8")).join("\n");

const homepage = readFileSync("components/HomePageContent.tsx", "utf8");

describe("public commercial truth", () => {
  it("does not restore closed or inaccurate claims", () => {
    expect(publicFiles).not.toMatch(/OneRead is \$1|one-click cancel|7-day free trial/i);
    expect(publicFiles).not.toMatch(/OneNews.{0,40}(every weekday|daily)/i);
  });

  it("keeps the six final prices and beta cadence visible", () => {
    for (const amount of [2, 18, 3, 27, 4, 36]) expect(publicFiles).toContain(String(amount));
    expect(publicFiles).toMatch(/Mon \/ Wed \/ Fri/);
  });

  it("integrates the complete product portfolio into the homepage", () => {
    expect(homepage).toContain("One carefully edited article worth your time");
    expect(homepage).toContain("One important story");
    expect(homepage).toContain("Monday, Wednesday, Friday");
    expect(homepage).toContain("Get OneArticle and OneNews together in one subscription");
    for (const price of ["$2/month · $18/year", "$3/month · $27/year", "$4/month · $36/year"]) expect(homepage).toContain(price);
  });

  it("uses product-aware signup and exposes both full samples", () => {
    expect(homepage).toContain('/subscribe?offer=one-article&interval=annual');
    expect(homepage).toContain('/subscribe?offer=one-news&interval=annual');
    expect(homepage).toContain('/subscribe?offer=one-read&interval=annual');
    expect(homepage).toContain('/samples/article');
    expect(homepage).toContain('/samples/news');
  });

  it("keeps retired products and claims off the homepage", () => {
    expect(homepage).not.toMatch(/\$1(?!\d)|free trial|OneFilm|OneLingo/i);
    expect(homepage).not.toMatch(/OneNews.{0,60}(daily|weekday)/i);
  });
});
