import { describe, expect, it } from "vitest";
import {
  canMarkOneNewsReady,
  validateOneNewsDraft,
  validateOneNewsIssue,
  ONE_NEWS_TARGET_WORDS,
} from "./validation";
import { NOW, sampleOneNewsContent, sampleOneNewsSources, words } from "./fixtures";

const codes = (issues: { code: string }[]) => issues.map((issue) => issue.code);

describe("validateOneNewsIssue — required structure", () => {
  it("accepts a standard, well-sourced issue", () => {
    const result = validateOneNewsIssue(sampleOneNewsContent(), sampleOneNewsSources(), NOW);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(canMarkOneNewsReady(result)).toBe(true);
  });

  it("accepts every supported reading language and rejects others", () => {
    for (const readingLanguage of ["English", "Turkish", "Spanish", "French", "German"]) {
      const result = validateOneNewsIssue(
        sampleOneNewsContent({ readingLanguage }),
        sampleOneNewsSources(),
        NOW,
      );
      expect(result.valid).toBe(true);
    }
    const italian = validateOneNewsIssue(
      sampleOneNewsContent({ readingLanguage: "Italian" }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(codes(italian.errors)).toContain("invalid_reading_language");
  });

  it.each([
    ["headline", "headline_required"],
    ["dek", "dek_required"],
    ["whatHappened", "what_happened_required"],
    ["whyItMatters", "why_it_matters_required"],
    ["whatToWatch", "what_to_watch_required"],
    ["subject", "subject_required"],
  ])("blocks READY when %s is missing", (field, code) => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({ [field]: "" }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(codes(result.errors)).toContain(code);
    expect(result.valid).toBe(false);
  });

  it("preserves multilingual content without mangling it", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({
        readingLanguage: "Turkish",
        headline: "Mahkeme kararı: sorumluluk platforma geçti",
        dek: "Bir istinaf mahkemesi, önlenebilir bir ihlalin maliyetini platforma yükledi.",
      }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(result.valid).toBe(true);
  });
});

describe("validateOneNewsIssue — optional contested section", () => {
  it("is valid when the section is omitted", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({ whatsContested: null }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(result.valid).toBe(true);
    expect(result.hasContestedSection).toBe(false);
    expect(codes(result.errors)).not.toContain("whats_contested_too_short");
  });

  it("is valid with substantive contested content", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({
        whatsContested:
          "The plaintiffs read the ruling as binding nationwide; the defendants say it reaches one circuit only.",
      }),
      [...sampleOneNewsSources(), thirdSource()],
      NOW,
    );
    expect(result.valid).toBe(true);
    expect(result.hasContestedSection).toBe(true);
  });

  it("treats whitespace as an absent section, not an empty one", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({ whatsContested: "   \n  " }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(result.hasContestedSection).toBe(false);
    expect(result.valid).toBe(true);
  });

  it("rejects a contested section that names no actual disagreement", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({ whatsContested: "Some disagree." }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(codes(result.errors)).toContain("whats_contested_too_short");
  });

  it("warns rather than blocks when a contested story is thinly sourced", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({
        whatsContested:
          "The plaintiffs read the ruling as binding nationwide; the defendants say it reaches one circuit only.",
      }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(result.valid).toBe(true);
    expect(codes(result.warnings)).toContain("contested_story_undersourced");
  });
});

describe("validateOneNewsIssue — sources", () => {
  it("blocks READY with zero or one source", () => {
    expect(codes(validateOneNewsIssue(sampleOneNewsContent(), [], NOW).errors)).toContain(
      "insufficient_sources",
    );
    const one = validateOneNewsIssue(
      sampleOneNewsContent(),
      [sampleOneNewsSources()[0]],
      NOW,
    );
    expect(codes(one.errors)).toContain("insufficient_sources");
  });

  it("accepts two independent sources", () => {
    const result = validateOneNewsIssue(sampleOneNewsContent(), sampleOneNewsSources(), NOW);
    expect(result.sourceCount).toBe(2);
    expect(result.independentSourceCount).toBe(2);
    expect(result.valid).toBe(true);
    expect(codes(result.warnings)).toContain("few_independent_sources");
  });

  it("does not count two links from the same publication as independent", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent(),
      sampleOneNewsSources([
        {},
        {
          url: "https://courts.example.gov/opinions/2026/breach-liability-summary.pdf",
          title: "Summary of the opinion",
          publication: "Court of Appeals",
          sourceType: "REPORTING",
        },
      ]),
      NOW,
    );
    expect(result.independentSourceCount).toBe(1);
    expect(codes(result.errors)).toContain("insufficient_independent_sources");
  });

  it("reports a primary source when one is cited and warns when none is", () => {
    const withPrimary = validateOneNewsIssue(
      sampleOneNewsContent(),
      sampleOneNewsSources(),
      NOW,
    );
    expect(withPrimary.hasPrimarySource).toBe(true);
    expect(codes(withPrimary.warnings)).not.toContain("no_primary_source");

    const withoutPrimary = validateOneNewsIssue(
      sampleOneNewsContent(),
      sampleOneNewsSources([{ sourceType: "REPORTING" }, {}]),
      NOW,
    );
    expect(withoutPrimary.hasPrimarySource).toBe(false);
    expect(codes(withoutPrimary.warnings)).toContain("no_primary_source");
    expect(withoutPrimary.valid).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "not a url at all",
    "https://exa mple.com/story",
    "ftp://files.example.com/report.pdf",
  ])("rejects the unsafe or malformed source URL %s", (url) => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent(),
      sampleOneNewsSources([{ url }, {}]),
      NOW,
    );
    expect(codes(result.errors)).toContain("unsafe_source_url");
    expect(result.valid).toBe(false);
  });

  it("requires source title, publication and a known type", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent(),
      sampleOneNewsSources([{ title: "", publication: "", sourceType: "RUMOR" }, {}]),
      NOW,
    );
    expect(codes(result.errors)).toEqual(
      expect.arrayContaining([
        "source_title_required",
        "source_publication_required",
        "invalid_source_type",
      ]),
    );
  });

  it("warns when source dating is incomplete", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent(),
      sampleOneNewsSources([{ publishedAt: null, accessedAt: null }, {}]),
      NOW,
    );
    expect(codes(result.warnings)).toContain("source_metadata_incomplete");
    expect(result.valid).toBe(true);
  });
});

describe("validateOneNewsIssue — developing stories", () => {
  it("blocks a developing issue with no as-of timestamp", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({ developing: true, asOf: null }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(codes(result.errors)).toContain("developing_requires_as_of");
  });

  it("accepts a developing issue with an as-of timestamp", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({
        developing: true,
        asOf: new Date("2026-09-02T08:00:00.000Z"),
      }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(result.valid).toBe(true);
  });

  it("accepts a non-developing issue with no as-of timestamp", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({ developing: false, asOf: null }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(result.valid).toBe(true);
  });

  it("refuses an as-of timestamp in the future and warns about a stale one", () => {
    const future = validateOneNewsIssue(
      sampleOneNewsContent({ developing: true, asOf: new Date("2026-09-03T08:00:00.000Z") }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(codes(future.errors)).toContain("as_of_in_future");

    const stale = validateOneNewsIssue(
      sampleOneNewsContent({ developing: true, asOf: new Date("2026-08-28T08:00:00.000Z") }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(codes(stale.warnings)).toContain("as_of_stale");
    expect(stale.valid).toBe(true);
  });
});

describe("validateOneNewsIssue — length guidance", () => {
  it("never blocks READY on word count alone", () => {
    const short = validateOneNewsIssue(
      sampleOneNewsContent({
        whatHappened: words(30, "a"),
        whyItMatters: words(20, "b"),
        whatToWatch: words(10, "c"),
      }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(short.valid).toBe(true);
    expect(codes(short.warnings)).toContain("below_target_length");
    expect(short.wordCount).toBeLessThan(ONE_NEWS_TARGET_WORDS.min);

    const long = validateOneNewsIssue(
      sampleOneNewsContent({ whatHappened: words(900, "a") }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(long.valid).toBe(true);
    expect(codes(long.warnings)).toContain("above_target_length");
  });

  it("reports a reading time alongside the word count", () => {
    const result = validateOneNewsIssue(sampleOneNewsContent(), sampleOneNewsSources(), NOW);
    expect(result.wordCount).toBe(540);
    expect(result.readingMinutes).toBe(3);
  });

  it("warns when the dek stops being one sentence", () => {
    const result = validateOneNewsIssue(
      sampleOneNewsContent({ dek: "A ruling landed. It moves liability. It applies now." }),
      sampleOneNewsSources(),
      NOW,
    );
    expect(codes(result.warnings)).toContain("dek_multi_sentence");
    expect(result.valid).toBe(true);
  });
});

describe("validateOneNewsDraft", () => {
  it("lets an editor save an unfinished draft", () => {
    const result = validateOneNewsDraft(
      sampleOneNewsContent({ headline: "", whatHappened: "", whyItMatters: "" }),
      [],
      NOW,
    );
    expect(result.valid).toBe(true);
  });

  it("still refuses an unsafe link or an unknown language in a draft", () => {
    expect(
      codes(
        validateOneNewsDraft(
          sampleOneNewsContent(),
          sampleOneNewsSources([{ url: "javascript:alert(1)" }, {}]),
          NOW,
        ).errors,
      ),
    ).toContain("unsafe_source_url");
    expect(
      codes(
        validateOneNewsDraft(sampleOneNewsContent({ readingLanguage: "Klingon" }), [], NOW).errors,
      ),
    ).toContain("invalid_reading_language");
  });
});

function thirdSource() {
  return {
    url: "https://analysis.example.org/2026/liability-shift",
    title: "What the liability shift means in practice",
    publication: "Example Policy Review",
    sourceType: "ANALYSIS",
    publishedAt: new Date("2026-09-02T06:00:00.000Z"),
    accessedAt: new Date("2026-09-02T07:20:00.000Z"),
    note: null,
    sortOrder: 2,
  };
}
