import { describe, expect, it } from "vitest";
import { issueBlocks, issueToMobileDto } from "@/lib/mobile/article";

const issue = {
  id: "issue-1", readingLanguage: "English", status: "SENT", scheduledFor: new Date("2026-08-20T04:00:00Z"), timezone: "Europe/Istanbul",
  subject: "Subject", previewText: "Deck", headline: "A useful issue", bodyText: "First paragraph.\n\nSecond paragraph.", bodyHtml: "<script>bad()</script>", nativeContent: null,
  heroImageUrl: "http://unsafe.example/image.jpg", heroImageAlt: "", heroImageCredit: null, sourceTitle: "Source", sourceName: "Publisher", sourceUrl: "javascript:alert(1)", ctaLabel: null,
  adminNotes: "private", createdBy: "admin", updatedBy: "admin", version: 1, readyAt: null, scheduledAt: null, sentAt: new Date(), canceledAt: null, claimedAt: null, createdAt: new Date(), updatedAt: new Date(),
} as const;

describe("mobile article DTO", () => {
  it("falls back from existing body text to native paragraphs", () => expect(issueBlocks(issue as never)).toEqual([{ type: "paragraph", text: "First paragraph." }, { type: "paragraph", text: "Second paragraph." }]));
  it("drops unsafe URLs and never serializes email HTML or admin metadata", () => {
    const dto = issueToMobileDto(issue as never);
    expect(dto.heroImage).toBeNull(); expect(dto.source).toBeNull();
    expect(JSON.stringify(dto)).not.toContain("script"); expect(JSON.stringify(dto)).not.toContain("private");
  });

  it("uses explicit panel topics, mobile deck and Listen controls", () => {
    const dto = issueToMobileDto({
      ...issue,
      mobileDeck: "Mobile-specific deck",
      mobileTopics: ["Macro", "Science"],
      mobileListenEnabled: true,
      mobileAudioUrl: "https://cdn.oneread.email/edition.mp3",
      mobileAudioDurationSeconds: 360,
    } as never);
    expect(dto.deck).toBe("Mobile-specific deck");
    expect(dto.topics).toEqual(["Macro", "Science"]);
    expect(dto.listen).toEqual({ enabled: true, audioUrl: "https://cdn.oneread.email/edition.mp3", durationSeconds: 360 });
  });
});
