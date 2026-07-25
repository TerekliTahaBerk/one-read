import { describe, expect, it } from "vitest";
import { renderFilmEditorialEmail } from "./editorial-email";

const base = {
  emailLanguage: "English",
  subject: "One film for Saturday",
  previewText: "A quiet, beautifully observed story",
  filmTitle: "Perfect Days",
  bodyText: "First paragraph.\n\nSecond paragraph.",
  bodyHtml: null,
  heroImageUrl: "https://images.example.com/perfect-days.jpg",
  heroImageAlt: "A still from Perfect Days",
  heroImageCredit: "Image: Example Studio",
  filmYear: 2023,
  director: "Wim Wenders",
  filmLanguage: "Japanese",
  runtimeMinutes: 124,
  sourceName: "Official film page",
  sourceUrl: "https://example.com/perfect-days",
  ctaLabel: null,
  scheduledFor: new Date("2026-07-25T07:00:00.000Z"),
};

describe("renderFilmEditorialEmail", () => {
  it("escapes authored text and keeps the validated source link active", () => {
    const rendered = renderFilmEditorialEmail(
      { ...base, filmTitle: "<script>alert(1)</script>" },
      { unsubscribe: "https://oneread.email/unsubscribe?subscription=abc" },
    );
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain('href="https://example.com/perfect-days"');
    expect(rendered.text).toContain("First paragraph.");
  });

  it("renders cover, grounded film metadata, preheader and reading time", () => {
    const rendered = renderFilmEditorialEmail(base, {
      unsubscribe: "https://oneread.email/unsubscribe?subscription=abc",
    });
    expect(rendered.subject).toBe("One film for Saturday");
    expect(rendered.html).toContain("A quiet, beautifully observed story");
    expect(rendered.html).toContain("https://images.example.com/perfect-days.jpg");
    expect(rendered.html).toContain("2023 · Wim Wenders · Japanese · 124 min");
    expect(rendered.html).toContain("1 min read");
  });

  it("uses Turkish newsletter chrome for Turkish editions", () => {
    const rendered = renderFilmEditorialEmail(
      { ...base, emailLanguage: "Turkish" },
      { unsubscribe: "https://oneread.email/unsubscribe?subscription=abc" },
    );
    expect(rendered.html).toContain("Aboneliği bırak");
    expect(rendered.text).toContain("Film hakkında daha fazla bilgi");
  });
});
