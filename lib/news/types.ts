/**
 * Strict shape of a OneNews daily issue's structured content (stored in
 * NewsDailyIssue.contentJson). OneNews is source-grounded: every story carries
 * a real source name + URL. The generator and parser enforce this shape — the
 * pipeline never trusts raw model output and never invents stories.
 */

export interface NewsStory {
  /** Headline (clear, non-sensational). */
  title: string;
  /** Source publication name, e.g. "Reuters". */
  source: string;
  /** A short, calm summary grounded in the source. */
  summary: string;
  /** Why this story matters — brief context, no speculation. */
  whyItMatters: string;
  /** Link back to the original source (required — never fabricated). */
  url: string;
}

export interface NewsIssueContent {
  /** Calm 1-sentence opening line. */
  openingLine: string;
  /** 3–5 top stories. */
  topStories: NewsStory[];
  /** One story to watch (forward-looking, calm). */
  oneStoryToWatch?: { title: string; note: string; source?: string; url?: string };
  /** Quiet context — a short non-anxious framing paragraph. */
  quietContext?: string;
  /** Source list (mirrors topStories URLs; kept explicit for the footer). */
  sources: { source: string; url: string }[];
}

/** Top-level generated issue: email framing + structured content + provenance. */
export interface GeneratedNewsIssue {
  title: string;
  subject: string;
  previewText: string;
  content: NewsIssueContent;
  /** False when generation was not possible (no sources / no AI in prod). */
  generated: boolean;
  /** "NO_SOURCES" when there was no real source material to brief from. */
  reason?: string;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown>;
}
