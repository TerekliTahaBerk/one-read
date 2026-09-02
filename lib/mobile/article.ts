import type { OneArticleIssue } from "@prisma/client";

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "callout"; title?: string; text: string }
  | { type: "divider" }
  | { type: "image"; url: string; alt: string; credit?: string }
  | { type: "sourceNote"; text: string };

const safeHttpsUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

function isArticleBlock(value: unknown): value is ArticleBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as Record<string, unknown>;
  if (typeof block.type !== "string") return false;
  if (block.type === "divider") return true;
  if (block.type === "image") {
    return typeof block.url === "string" && Boolean(safeHttpsUrl(block.url)) && typeof block.alt === "string";
  }
  return typeof block.text === "string" && block.text.trim().length > 0;
}

export function issueBlocks(issue: Pick<OneArticleIssue, "nativeContent" | "bodyText">): ArticleBlock[] {
  if (Array.isArray(issue.nativeContent)) {
    const blocks = issue.nativeContent.filter(isArticleBlock).map((block) =>
      block.type === "image" ? { ...block, url: safeHttpsUrl(block.url)! } : block,
    );
    if (blocks.length > 0) return blocks;
  }
  return issue.bodyText
    .split(/\n\s*\n/g)
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph" as const, text }));
}

const topicSignals = {
  Macro: ["economy", "market", "finance", "business", "energy", "housing", "infrastructure", "trade"],
  Ideas: ["idea", "language", "education", "culture", "creativity", "design", "book", "library"],
  Society: ["public", "community", "city", "people", "social", "culture", "library", "health"],
  Science: ["science", "nuclear", "climate", "heat", "soil", "technology", "research", "energy"],
} as const;

export function issueTopics(issue: Pick<OneArticleIssue, "headline" | "previewText" | "bodyText">) {
  const text = `${issue.headline} ${issue.previewText ?? ""} ${issue.bodyText}`.toLowerCase();
  const matches = Object.entries(topicSignals).filter(([, signals]) => signals.some((signal) => text.includes(signal))).map(([topic]) => topic);
  return matches.length > 0 ? matches : ["Ideas"];
}

export function issueToMobileDto(issue: OneArticleIssue, progress = 0) {
  const wordCount = issue.bodyText.trim().split(/\s+/).filter(Boolean).length;
  return {
    id: issue.id,
    date: (issue.scheduledFor ?? issue.sentAt ?? issue.createdAt).toISOString(),
    label: "OneArticle" as const,
    headline: issue.headline,
    deck: issue.mobileDeck ?? issue.previewText,
    readingLanguage: issue.readingLanguage,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 220)),
    topics: issue.mobileTopics?.length > 0 ? issue.mobileTopics : issueTopics(issue),
    listen: {
      enabled: issue.mobileListenEnabled !== false,
      audioUrl: safeHttpsUrl(issue.mobileAudioUrl),
      durationSeconds: issue.mobileAudioDurationSeconds,
    },
    heroImage: safeHttpsUrl(issue.heroImageUrl)
      ? {
          url: safeHttpsUrl(issue.heroImageUrl)!,
          alt: issue.heroImageAlt?.trim() || "",
          credit: issue.heroImageCredit,
        }
      : null,
    source: safeHttpsUrl(issue.sourceUrl)
      ? {
          title: issue.sourceTitle || issue.headline,
          name: issue.sourceName || "Original source",
          url: safeHttpsUrl(issue.sourceUrl)!,
          ctaLabel: issue.ctaLabel || "Read the original",
        }
      : null,
    blocks: issueBlocks(issue),
    progress,
  };
}
