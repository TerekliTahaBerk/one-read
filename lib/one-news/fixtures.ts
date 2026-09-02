import type { OneNewsContentInput, OneNewsSourceInput } from "./validation";
import type {
  OneNewsRenderCorrectionRow,
  OneNewsRenderIssue,
  OneNewsRenderSourceRow,
} from "./render-model";

/**
 * Shared editorial fixtures.
 *
 * Kept beside the domain rather than in a test file so the admin preview can
 * show an example edition without a second, drifting copy of the content.
 */

export const NOW = new Date("2026-09-02T09:00:00.000Z");

export function words(count: number, stem = "word"): string {
  return Array.from({ length: count }, (_, index) => `${stem}${index}`).join(" ");
}

export function sampleOneNewsContent(
  overrides: Partial<OneNewsContentInput> = {},
): OneNewsContentInput {
  return {
    readingLanguage: "English",
    subject: "The court ruling that changes who pays for a data breach",
    previewText: "One ruling, and the liability moves.",
    headline: "A court just moved data-breach liability onto the platform",
    dek: "An appeals court held that a platform, not its business customers, carries the cost of a breach it could have prevented.",
    whatHappened: words(220, "happened"),
    whyItMatters: words(180, "matters"),
    whatsContested: null,
    whatToWatch: words(140, "watch"),
    developing: false,
    asOf: null,
    ...overrides,
  };
}

export function sampleOneNewsSources(
  overrides: Partial<OneNewsSourceInput>[] = [],
): OneNewsSourceInput[] {
  const base: OneNewsSourceInput[] = [
    {
      url: "https://courts.example.gov/opinions/2026/breach-liability.pdf",
      title: "Opinion of the court, No. 26-114",
      publication: "Court of Appeals",
      sourceType: "PRIMARY",
      publishedAt: new Date("2026-09-01T00:00:00.000Z"),
      accessedAt: new Date("2026-09-02T07:00:00.000Z"),
      note: "The ruling itself.",
      sortOrder: 0,
    },
    {
      url: "https://news.example.com/2026/09/breach-liability-ruling",
      title: "Appeals court shifts breach liability to platforms",
      publication: "Example News",
      sourceType: "REPORTING",
      publishedAt: new Date("2026-09-01T18:00:00.000Z"),
      accessedAt: new Date("2026-09-02T07:10:00.000Z"),
      note: null,
      sortOrder: 1,
    },
  ];
  if (overrides.length === 0) return base;
  return overrides.map((override, index) => ({ ...(base[index] ?? base[0]), ...override }));
}

export function sampleOneNewsRenderIssue(
  overrides: Partial<OneNewsRenderIssue> = {},
): OneNewsRenderIssue {
  const content = sampleOneNewsContent();
  return {
    readingLanguage: content.readingLanguage,
    timezone: "Europe/Istanbul",
    subject: content.subject,
    previewText: content.previewText ?? null,
    headline: content.headline,
    dek: content.dek,
    whatHappened: content.whatHappened,
    whyItMatters: content.whyItMatters,
    whatsContested: content.whatsContested ?? null,
    whatToWatch: content.whatToWatch,
    developing: false,
    asOf: null,
    scheduledFor: new Date("2026-09-03T03:30:00.000Z"),
    sentAt: null,
    ...overrides,
  };
}

export function sampleOneNewsRenderSources(): OneNewsRenderSourceRow[] {
  return sampleOneNewsSources().map((source, index) => ({
    url: source.url,
    title: source.title,
    publication: source.publication,
    sourceType: source.sourceType,
    publishedAt: source.publishedAt ?? null,
    note: source.note ?? null,
    sortOrder: source.sortOrder ?? index,
  }));
}

export function sampleOneNewsCorrections(): OneNewsRenderCorrectionRow[] {
  return [
    {
      type: "MATERIAL",
      note: "An earlier version said the ruling applied nationwide. It binds one circuit.",
      createdAt: new Date("2026-09-03T09:00:00.000Z"),
    },
  ];
}
