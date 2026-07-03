import { describe, expect, it } from "vitest";
import { renderDailyEmail, type DailyEmailContext } from "@/lib/email-template";

function baseContext(overrides: Partial<DailyEmailContext> = {}): DailyEmailContext {
  return {
    date: "2026-06-14",
    matchedTopic: "ai",
    hasMultipleInterests: false,
    summaryLanguage: "English",
    article: {
      title: "Original Article Title",
      url: "https://example.com/article",
      sourceName: "Example Source",
    },
    summary: {
      bodyText: "A short summary of the article.",
    },
    links: {
      feedbackLoved: "https://oneread.email/feedback?r=loved",
      feedbackLiked: "https://oneread.email/feedback?r=liked",
      feedbackMeh: "https://oneread.email/feedback?r=meh",
      feedbackDisliked: "https://oneread.email/feedback?r=disliked",
      unsubscribe: "https://oneread.email/unsubscribe?send=abc123",
    },
    ...overrides,
  };
}

describe("renderDailyEmail", () => {
  it("includes the unsubscribe link in both the text and html output", () => {
    const ctx = baseContext();
    const { text, html } = renderDailyEmail(ctx);

    expect(text).toContain(ctx.links.unsubscribe);
    expect(html).toContain(ctx.links.unsubscribe);
  });

  it("uses a single-interest personalization line when hasMultipleInterests is false", () => {
    const { text: singleText } = renderDailyEmail(
      baseContext({ hasMultipleInterests: false }),
    );
    const { text: multiText } = renderDailyEmail(
      baseContext({ hasMultipleInterests: true }),
    );

    expect(singleText).not.toBe(multiText);
  });

  it("falls back to English strings for an unsupported summary language", () => {
    const { text } = renderDailyEmail(baseContext({ summaryLanguage: "Klingon" }));

    expect(text).toContain("Unsubscribe");
  });

  it("renders Turkish chrome strings when summaryLanguage is Turkish", () => {
    const { text } = renderDailyEmail(baseContext({ summaryLanguage: "Turkish" }));

    expect(text).not.toContain("Unsubscribe:");
  });

  it("shows the original title only when the structured display title differs from it", () => {
    const withoutStructured = renderDailyEmail(baseContext());
    expect(withoutStructured.text).not.toContain("Original Article Title)");

    const withStructured = renderDailyEmail(
      baseContext({
        summary: {
          bodyText: "A short summary of the article.",
          structured: {
            displayTitle: "Translated Headline",
          } as DailyEmailContext["summary"]["structured"],
        },
      }),
    );
    expect(withStructured.text).toContain("Translated Headline");
    expect(withStructured.text).toContain("Original Article Title");
  });
});
