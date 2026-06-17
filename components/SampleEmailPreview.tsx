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
        Sample email preview
      </p>

      <div className="mt-3 rounded-2xl border border-[var(--theme-border)] bg-white/70 p-5 sm:p-6 text-left">
        <p className="font-sans text-[12.5px] text-fog">Tomorrow’s OneArticle</p>

        <h3 className="mt-2 font-serif font-medium text-[1.2rem] sm:text-[1.3rem] leading-[1.22] text-ink">
          Why AI agents are changing software work
        </h3>

        <p className="mt-3 font-sans text-[14px] leading-[1.6] text-graphite">
          A calm, short summary of one useful article, selected around your
          interests and delivered in a format you can read in under two minutes.
        </p>

        <p className="mt-4 border-t border-[var(--theme-border)] pt-3 font-serif italic text-[13px] text-ash">
          One article. One useful idea. No feed to open.
        </p>
      </div>

      <div className="mt-4">
        <SampleIssuePreview />
      </div>
    </div>
  );
}
