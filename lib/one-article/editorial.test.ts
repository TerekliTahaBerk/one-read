import { describe, expect, it } from "vitest";
import {
  editorialDeliveryIdempotencyKey,
  resolveEditorialIssueDeliveryStatus,
} from "./editorial";
import {
  editorialReadinessChecks,
  validateEditorialDraft,
  validateEditorialIssue,
  validateEditorialTest,
} from "./editorial-validation";

const valid = {
  readingLanguage: "Spanish",
  subject: "Una lectura para hoy",
  headline: "Una idea que merece tu tiempo",
  bodyText: Array.from({ length: 120 }, (_, index) => `palabra${index}`).join(" "),
  heroImageUrl: "https://images.example.com/article.jpg",
  heroImageAlt: "La portada del artículo",
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

  it("requires the editorial fields used by the dispatcher while allowing no cover image", () => {
    expect(validateEditorialIssue({ ...valid, bodyText: "" })).toEqual({
      ok: false,
      error: "body_too_short",
    });
    expect(validateEditorialIssue({ ...valid, sourceTitle: "" })).toEqual({
      ok: false,
      error: "source_title_required",
    });
    expect(validateEditorialIssue({ ...valid, heroImageUrl: "", heroImageAlt: "" })).toEqual({
      ok: true,
    });
    expect(validateEditorialIssue({ ...valid, heroImageAlt: "" })).toEqual({
      ok: false,
      error: "hero_image_alt_required",
    });
  });

  it("allows incomplete drafts while keeping publishing gated", () => {
    const draft = {
      readingLanguage: "English",
      subject: "",
      headline: "",
      bodyText: "",
      heroImageUrl: "",
      heroImageAlt: "",
      sourceTitle: "",
      sourceUrl: "",
    };
    expect(validateEditorialDraft(draft)).toEqual({ ok: true });
    expect(validateEditorialIssue(draft)).toEqual({
      ok: false,
      error: "subject_required",
    });
    const checks = editorialReadinessChecks(draft);
    expect(checks.filter((check) => check.key.startsWith("heroImage")).every((check) => check.passed)).toBe(true);
    expect(checks.filter((check) => !check.key.startsWith("heroImage")).every((check) => !check.passed)).toBe(true);
  });

  it("allows useful draft tests before publishing is ready", () => {
    expect(
      validateEditorialTest({
        ...valid,
        bodyText: "A short draft.",
        sourceTitle: "",
        sourceUrl: "",
      }),
    ).toEqual({ ok: true });
    expect(validateEditorialTest({ ...valid, bodyText: "" })).toEqual({
      ok: false,
      error: "body_required_for_test",
    });
  });

  it("validates panel-controlled mobile metadata and native blocks", () => {
    expect(validateEditorialDraft({
      ...valid,
      mobileTopics: ["Macro", "Science"],
      mobilePriority: 25,
      mobileAudioUrl: "https://cdn.oneread.email/audio/edition.mp3",
      mobileAudioDurationSeconds: 420,
      nativeContent: [
        { type: "heading", text: "A useful frame" },
        { type: "paragraph", text: "The native reading body." },
      ],
    })).toEqual({ ok: true });
    expect(validateEditorialDraft({ ...valid, mobileTopics: ["Sports"] })).toEqual({ ok: false, error: "invalid_mobile_topic" });
    expect(validateEditorialDraft({ ...valid, mobileAudioUrl: "http://unsafe.example/audio.mp3" })).toEqual({ ok: false, error: "invalid_mobile_audio_url" });
    expect(validateEditorialDraft({ ...valid, nativeContent: [{ type: "image", url: "javascript:bad", alt: "" }] })).toEqual({ ok: false, error: "invalid_native_content" });
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
