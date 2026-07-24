import { describe, expect, it } from "vitest";
import {
  editorialDeliveryIdempotencyKey,
  resolveEditorialIssueDeliveryStatus,
} from "./editorial";
import {
  editorialReadinessChecks,
  validateEditorialDraft,
  validateEditorialIssue,
} from "./editorial-validation";

const valid = {
  readingLanguage: "Spanish",
  subject: "Una lectura para hoy",
  headline: "Una idea que merece tu tiempo",
  bodyText: Array.from({ length: 120 }, (_, index) => `palabra${index}`).join(" "),
  sourceTitle: "El artículo original",
  sourceUrl: "https://example.com/read",
};

describe("validateEditorialIssue", () => {
  it("accepts all five active reading languages", () => {
    for (const readingLanguage of ["English", "Turkish", "Spanish", "French", "German"]) {
      expect(validateEditorialIssue({ ...valid, readingLanguage })).toEqual({ ok: true });
    }
  });

  it("rejects unknown languages and unsafe URL protocols", () => {
    expect(validateEditorialIssue({ ...valid, readingLanguage: "Italian" })).toEqual({
      ok: false,
      error: "invalid_reading_language",
    });
    expect(validateEditorialIssue({ ...valid, sourceUrl: "javascript:alert(1)" })).toEqual({
      ok: false,
      error: "invalid_source_url",
    });
  });

  it("requires the editorial fields used by the dispatcher", () => {
    expect(validateEditorialIssue({ ...valid, bodyText: "" })).toEqual({
      ok: false,
      error: "body_too_short",
    });
    expect(validateEditorialIssue({ ...valid, sourceTitle: "" })).toEqual({
      ok: false,
      error: "source_title_required",
    });
  });

  it("allows incomplete drafts while keeping publishing gated", () => {
    const draft = {
      readingLanguage: "English",
      subject: "",
      headline: "",
      bodyText: "",
      sourceTitle: "",
      sourceUrl: "",
    };
    expect(validateEditorialDraft(draft)).toEqual({ ok: true });
    expect(validateEditorialIssue(draft)).toEqual({
      ok: false,
      error: "subject_required",
    });
    expect(editorialReadinessChecks(draft).every((check) => !check.passed)).toBe(true);
  });

  it("keeps exhausted deliveries visible as failures", () => {
    expect(resolveEditorialIssueDeliveryStatus(0, 1)).toBe("FAILED");
    expect(resolveEditorialIssueDeliveryStatus(4, 1)).toBe("PARTIALLY_FAILED");
    expect(resolveEditorialIssueDeliveryStatus(4, 0)).toBe("SENT");
  });

  it("creates a stable per-recipient provider idempotency key", () => {
    expect(editorialDeliveryIdempotencyKey("issue-1", "contact-1")).toBe(
      "onearticle-issue-1-contact-1",
    );
  });
});
