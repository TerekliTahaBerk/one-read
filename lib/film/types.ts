/**
 * Strict shape of a OneFilm daily note's structured content (stored in
 * FilmDailyIssue.contentJson). Commentary is ORIGINAL; factual metadata is only
 * present when grounded (admin-provided or verified). The generator never
 * invents cast, awards, ratings, or streaming availability.
 */

export interface FilmIssueContent {
  /**
   * Short, natural greeting for tonight (e.g. "Bu akşam için kısa bir film
   * notu."). Optional for backward compatibility with pre-v3 records.
   */
  greeting?: string;
  /** Calm 1-sentence opening line. */
  openingLine: string;
  /** The film's title (grounded — from catalog/admin). */
  filmTitle: string;
  /** Why this film — original recommendation reasoning. */
  whyThisFilm: string;
  /** What it feels like — mood/tone, original commentary. */
  whatItFeelsLike: string;
  /** Best watched when — original framing. */
  bestWatchedWhen: string;
  /** Before you press play — practical, spoiler-aware note. */
  beforeYouPressPlay: string;
  /** Spoiler note honoring the user's spoiler preference. */
  spoilerNote: string;
  /** Optional grounded metadata — omitted honestly when unknown. */
  metadata?: {
    year?: number;
    director?: string;
    language?: string;
    runtimeMinutes?: number;
    /** Only set when verified — never invented availability. */
    whereToWatch?: string;
  };
}

export interface GeneratedFilmIssue {
  title: string;
  subject: string;
  previewText: string;
  content: FilmIssueContent;
  /** False when generation was not possible (no film / no AI in prod). */
  generated: boolean;
  /** "NO_FILM" when no grounded film was available to write about. */
  reason?: string;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown>;
}
