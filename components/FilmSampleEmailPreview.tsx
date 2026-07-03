import { FilmSampleIssuePreview } from "./FilmSampleIssuePreview";

/**
 * A small, email-like preview of what a subscriber receives each Saturday.
 * Mirrors OneArticle's SampleEmailPreview exactly — same eyebrow, same teaser
 * card, same disclosure below it — so the two "what you'll receive" sections
 * read as one family, not two designs. Static and trust-building: no fake
 * inbox chrome, no stock images, no real film titles or ratings. Inherits the
 * OneFilm theme variables from its page wrapper.
 */
export function FilmSampleEmailPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-[30rem] ${className}`}>
      <p className="text-center font-sans text-[11px] uppercase tracking-eyebrow text-fog">
        What you&apos;ll receive
      </p>

      <div className="mt-3 rounded-2xl border border-[var(--theme-border)] bg-white/70 p-5 sm:p-6 text-left">
        <p className="font-sans text-[12.5px] text-fog">A Saturday with OneFilm</p>

        <h3 className="mt-2 font-serif font-medium text-[1.2rem] sm:text-[1.3rem] leading-[1.22] text-ink">
          A quiet film for a long evening
        </h3>

        <p className="mt-3 font-sans text-[14px] leading-[1.6] text-graphite">
          A short, spoiler-light note on why one thoughtfully chosen film is
          worth your evening, what mood it suits, and what to know before you
          press play.
        </p>

        <p className="mt-4 border-t border-[var(--theme-border)] pt-3 font-serif italic text-[13px] text-ash">
          One film. One short note. One reason worth watching.
        </p>
      </div>

      <div className="mt-4">
        <FilmSampleIssuePreview />
      </div>
    </div>
  );
}
