import { SampleIssuePreview } from "./SampleIssuePreview";

/**
 * A small, email-like preview of what a subscriber receives each morning.
 * Static and trust-building — no fake inbox chrome, no stock images. Inherits
 * the OneArticle theme variables from its page wrapper.
 */
export function SampleEmailPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-[30rem] ${className}`}>
      <p className="text-center font-sans text-[11px] uppercase tracking-eyebrow text-fog">
        What you’ll receive
      </p>

      <div className="mt-3 rounded-2xl border border-[var(--theme-border)] bg-white/70 p-5 sm:p-6 text-left">
        <p className="font-sans text-[12.5px] text-fog">A morning with OneArticle</p>

        <h3 className="mt-2 font-serif font-medium text-[1.2rem] sm:text-[1.3rem] leading-[1.22] text-ink">
          When software starts working beside you
        </h3>

        <p className="mt-3 font-sans text-[14px] leading-[1.6] text-graphite">
          One carefully chosen article, rewritten into a short brief you can
          finish before the day gets noisy.
        </p>

        <p className="mt-4 border-t border-[var(--theme-border)] pt-3 font-serif italic text-[13px] text-ash">
          One good idea. No feed to open.
        </p>
      </div>

      <div className="mt-4">
        <SampleIssuePreview />
      </div>
    </div>
  );
}
