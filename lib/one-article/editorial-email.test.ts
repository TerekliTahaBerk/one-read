import { describe, expect, it } from "vitest";
import { renderEditorialEmail } from "./editorial-email";

const base = {
  readingLanguage: "English",
  subject: "A useful morning read",
  previewText: "One clear idea for today",
  headline: "Why small systems compound",
  bodyText: "First paragraph.\n\nSecond paragraph.",
  bodyHtml: null,
  sourceTitle: "The original article",
  sourceName: "Example Journal",
  sourceUrl: "https://example.com/article",
  ctaLabel: null,
  scheduledFor: new Date("2026-07-25T04:00:00.000Z"),
};

describe("renderEditorialEmail", () => {
  it("escapes authored text and keeps only the validated source link active", () => {
    const rendered = renderEditorialEmail(
      { ...base, headline: "<script>alert(1)</script>" },
      { unsubscribe: "https://oneread.app/unsubscribe?subscription=abc" },
    );
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain('href="https://example.com/article"');
    expect(rendered.text).toContain("First paragraph.");
  });

  it("uses translated chrome for every active non-English reading language", () => {
    const labels: Record<string, string> = {
      Turkish: "Aboneliği bırak",
      Spanish: "Cancelar suscripción",
      French: "Se désabonner",
      German: "Abmelden",
    };
    for (const [readingLanguage, unsubscribeLabel] of Object.entries(labels)) {
      const rendered = renderEditorialEmail(
        { ...base, readingLanguage },
        { unsubscribe: "https://oneread.app/unsubscribe?subscription=abc" },
      );
      expect(rendered.html).toContain(unsubscribeLabel);
      expect(rendered.text).toContain(unsubscribeLabel);
    }
  });

  it("includes preview text as a hidden preheader", () => {
    const rendered = renderEditorialEmail(base, {
      unsubscribe: "https://oneread.app/unsubscribe?subscription=abc",
    });
    expect(rendered.html).toContain("One clear idea for today");
    expect(rendered.subject).toBe("A useful morning read");
  });
});
