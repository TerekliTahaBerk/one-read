/**
 * Strict shape of a OneNews daily issue's structured content (stored in
 * NewsDailyIssue.contentJson). OneNews is a Turkish-first, sponsor-free,
 * 5-minute morning brief sent at 06:30. It is source-grounded: every agenda /
 * weekend item carries a real source name + URL, copied verbatim from the
 * NewsSourceStory bundle by index. The generator and parser enforce this shape —
 * the pipeline never trusts raw model output and never invents stories.
 *
 * The shape is intentionally backward compatible: the legacy `topStories` /
 * `openingLine` fields are still populated (mirrored from `agendaItems`) so old
 * stored issues and any legacy renderer paths keep working. The new
 * agenda-based fields drive the redesigned 5-minute brief email.
 */

/** One agenda item in "Bugünün gündemi" — grounded to a real source. */
export interface NewsAgendaItem {
  /** Category, e.g. "Piyasalar", "Ekonomi", "Politika", "Teknoloji". */
  category: string;
  /** Short, plain title. */
  title: string;
  /** One short, calm, source-grounded sentence. */
  summary: string;
  /** Optional "Neden önemli?" — only when genuinely useful. */
  whyItMatters?: string;
  /** Source publication name (verbatim from bundle — never fabricated). */
  source: string;
  /** Link back to the original source (verbatim from bundle — never fabricated). */
  url: string;
}

/** One optional weekend add-on item ("Hafta sonu eki"). */
export interface NewsWeekendItem {
  title: string;
  summary: string;
  source: string;
  url: string;
}

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
  /* ---- New 5-minute morning-brief structure ---- */
  /** Short, natural greeting line, e.g. "20 Haziran Cumartesi sabahından günaydın." */
  greeting?: string;
  /** Compact headline from the 1–2 most important developments. */
  mainHeadline?: string;
  /** Short main summary paragraph (2–4 sentences). */
  mainSummary?: string;
  /** "Bugünün gündemi" — 5–8 grounded agenda items. */
  agendaItems?: NewsAgendaItem[];
  /** "Bugün ayrıca" — optional short list of less important items. */
  alsoToday?: string[];
  /** "Hafta sonu eki" — optional weekend add-on. */
  weekendExtra?: NewsWeekendItem[];

  /* ---- Legacy fields (kept populated for backward compatibility) ---- */
  /** Legacy calm 1-sentence opening line (mirrors greeting/mainSummary). */
  openingLine: string;
  /** Legacy top-stories array (mirrors agendaItems — drives grounding gates). */
  topStories: NewsStory[];
  /** Legacy "one story to watch". */
  oneStoryToWatch?: { title: string; note: string; source?: string; url?: string };
  /** Legacy quiet-context paragraph. */
  quietContext?: string;
  /** Source list (mirrors agenda/weekend URLs; kept explicit for the footer). */
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
