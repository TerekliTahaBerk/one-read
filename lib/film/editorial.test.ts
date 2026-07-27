import { describe, expect, it } from "vitest";
import {
  filmEditorialDeliveryIdempotencyKey,
  resolveFilmEditorialDeliveryStatus,
} from "./editorial";
import {
  filmEditorialReadinessChecks,
  validateFilmEditorialDraft,
  validateFilmEditorialIssue,
  validateFilmEditorialTest,
} from "./editorial-validation";

const valid = {
  emailLanguage: "English",
  subject: "One film for Saturday",
  filmTitle: "Perfect Days",
  bodyText: Array.from({ length: 120 }, (_, index) => `word${index}`).join(" "),
  heroImageUrl: "https://images.example.com/perfect-days.jpg",
  heroImageAlt: "A still from Perfect Days",
  filmYear: 2023,
  director: "Wim Wenders",
  sourceUrl: "https://example.com/perfect-days",
};

describe("OneFilm manual editorial", () => {
  it("accepts English and Turkish editions", () => {
    for (const emailLanguage of ["English", "Turkish"]) {
      expect(validateFilmEditorialIssue({ ...valid, emailLanguage })).toEqual({ ok: true });
    }
  });

  it("allows editions without a cover image but requires alt text when one is added", () => {
    expect(validateFilmEditorialIssue({ ...valid, heroImageUrl: "", heroImageAlt: "" })).toEqual({
      ok: true,
    });
    expect(validateFilmEditorialIssue({ ...valid, heroImageAlt: "" })).toEqual({
      ok: false,
      error: "hero_image_alt_required",
    });
  });

  it("allows useful draft tests before all publishing facts are complete", () => {
    expect(
      validateFilmEditorialTest({
        ...valid,
        bodyText: "A short draft.",
        director: "",
        filmYear: null,
        sourceUrl: "",
      }),
    ).toEqual({ ok: true });
    expect(validateFilmEditorialTest({ ...valid, filmTitle: "" })).toEqual({
      ok: false,
      error: "film_title_required",
    });
  });

  it("rejects unknown languages and unsafe URLs", () => {
    expect(validateFilmEditorialIssue({ ...valid, emailLanguage: "German" })).toEqual({
      ok: false,
      error: "invalid_email_language",
    });
    expect(validateFilmEditorialIssue({ ...valid, sourceUrl: "javascript:alert(1)" })).toEqual({
      ok: false,
      error: "invalid_source_url",
    });
  });

  it("allows incomplete drafts but blocks publication", () => {
    const draft = {
      emailLanguage: "English",
      subject: "",
      filmTitle: "",
      bodyText: "",
      heroImageUrl: "",
      heroImageAlt: "",
      director: "",
      sourceUrl: "",
    };
    expect(validateFilmEditorialDraft(draft)).toEqual({ ok: true });
    expect(validateFilmEditorialIssue(draft)).toEqual({ ok: false, error: "subject_required" });
    const checks = filmEditorialReadinessChecks(draft);
    expect(checks.filter((check) => check.key.startsWith("heroImage")).every((check) => check.passed)).toBe(true);
    expect(checks.filter((check) => !check.key.startsWith("heroImage")).every((check) => !check.passed)).toBe(true);
  });

  it("keeps failed deliveries visible and creates stable idempotency keys", () => {
    expect(resolveFilmEditorialDeliveryStatus(0, 1)).toBe("FAILED");
    expect(resolveFilmEditorialDeliveryStatus(4, 1)).toBe("PARTIALLY_FAILED");
    expect(resolveFilmEditorialDeliveryStatus(4, 0)).toBe("SENT");
    expect(filmEditorialDeliveryIdempotencyKey("issue-1", "contact-1")).toBe(
      "onefilm-issue-1-contact-1",
    );
  });
});
