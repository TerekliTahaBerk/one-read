import { SampleIssuePreview } from "./SampleIssuePreview";

/**
 * A small, email-like preview of what a subscriber receives each morning.
 * Static and trust-building. Mirrors the image-led article card used by the
 * panel preview, test sends and live OneArticle delivery.
 */
export function SampleEmailPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-[30rem] ${className}`}>
      <p className="text-center font-sans text-[11px] uppercase tracking-eyebrow text-fog">
        What you’ll receive
      </p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[#fafbfd] text-left">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="rounded-full bg-[#ffe144] px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-eyebrow text-ink">
            Article
          </span>
          <span className="font-sans text-[10px] uppercase tracking-eyebrow text-fog">
            6 min read
          </span>
        </div>

        <div
          role="img"
          aria-label="An editorial illustration of connected financial systems"
          className="mx-4 aspect-[16/8.5] rounded-xl bg-[radial-gradient(circle_at_28%_35%,rgba(255,225,68,.95),transparent_25%),linear-gradient(135deg,#171717_0%,#464641_48%,#d7d4c7_100%)]"
        />

        <div className="p-5 sm:p-6">
          <h3 className="font-serif font-semibold text-[1.35rem] leading-[1.16] text-ink sm:text-[1.5rem]">
            Stablecoins and the banking system’s biggest test
          </h3>

          <p className="mt-3 font-sans text-[14px] leading-[1.6] text-graphite">
            A short macro brief on how stablecoins could reshape deposits,
            government debt, and business credit.
          </p>

          <div className="mt-4 h-[3px] w-10 bg-[#ffe144]" />

          <p className="mt-4 font-serif italic text-[13px] text-ash">
            One paper. One useful idea. No feed to open.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <SampleIssuePreview />
      </div>
    </div>
  );
}
