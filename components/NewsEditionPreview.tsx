"use client";

import { useId, useState } from "react";
import Link from "next/link";

/**
 * A complete OneNews edition, shown as an example.
 *
 * The OneNews counterpart to `SampleIssuePreview`: the same inline disclosure
 * (no modal, no focus trap) serving both surfaces, so the edition exists once
 * rather than being retyped on the landing page and again on the sample page.
 * The sections below are OneNews's own editorial structure — what happened,
 * why it matters, what to watch, then the sources it was built from — and are
 * deliberately not shaped to match OneArticle's format.
 */

const EDITION = {
  label: "OneNews | Evergreen explainer",
  meta: "Evergreen explainer · English · 4 min read",
  headline: "Why the world needs a shared clock",
  dek: "UTC gives systems a common reference even when people live, work, and read in different local times.",
  closing: "Today, one story was enough.",
} as const;

const SECTIONS = [
  {
    heading: "What happened",
    body: "Modern communications made local clocks insufficient for coordinating events across borders. Coordinated Universal Time, or UTC, became the common reference used by technical standards, networks, and international timekeeping.",
  },
  {
    heading: "Why it matters",
    body: "A shared reference prevents the same instant from being recorded differently by every system. Local time still matters to people; UTC matters when computers, researchers, transport systems, and public institutions need an unambiguous point of comparison.",
  },
  {
    heading: "What to watch",
    body: "Civil time remains a policy choice. Governments can change time-zone rules, while technical systems must keep their time-zone data current and preserve the underlying instant. Good software stores the instant and converts it for the reader.",
  },
] as const;

const SOURCES = [
  {
    title: "BIPM — Time metrology",
    url: "https://www.bipm.org/en/time-metrology",
    note: "Primary institutional background on international timekeeping and UTC.",
  },
  {
    title: "IETF RFC 3339 — Date and Time on the Internet",
    url: "https://www.rfc-editor.org/rfc/rfc3339",
    note: "Primary technical standard for representing internet timestamps.",
  },
] as const;

export function NewsEditionPreview({
  defaultOpen = false,
  hideToggle = false,
  showFullSampleLink = true,
}: {
  defaultOpen?: boolean;
  hideToggle?: boolean;
  /** Hidden on the sample page itself, where the reader is already there. */
  showFullSampleLink?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || hideToggle);
  const regionId = useId();

  return (
    <div className="w-full">
      {!hideToggle && (
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={regionId}
            className="
              focus-ring inline-flex items-center gap-1.5
              rounded-full px-3 py-1.5
              font-sans text-[13px] text-[var(--theme-accent)]
              transition-colors duration-200 hover:text-ink
            "
          >
            {open ? "Hide the example" : "Read the example"}
            <svg
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            >
              <path
                d="M3 5l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {showFullSampleLink && (
            <Link
              href="/samples/news"
              className="focus-ring inline-flex items-center rounded-full px-3 py-1.5 font-sans text-[13px] text-ink link-underline"
            >
              Open full sample
            </Link>
          )}
        </div>
      )}

      {open && (
        <div
          id={regionId}
          className="
            mt-4 overflow-hidden rounded-2xl border border-[var(--theme-border)]
            bg-[var(--theme-surface)] text-left animate-fade-in
          "
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-6">
            <span className="rounded-full bg-[var(--theme-selected-surface)] px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-eyebrow text-ink">
              News
            </span>
            <span className="font-sans text-[10px] uppercase tracking-eyebrow text-fog">
              4 min read
            </span>
          </div>

          <div className="bg-paper p-5 sm:p-6">
            <p className="font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">
              {EDITION.label}
            </p>
            <h2 className="mt-2 font-serif font-semibold text-[1.35rem] leading-[1.16] text-ink sm:text-[1.55rem]">
              {EDITION.headline}
            </h2>
            <p className="mt-3 font-serif text-[1rem] leading-[1.6] text-ash sm:text-[1.05rem]">
              {EDITION.dek}
            </p>
            <div className="mt-4 h-[3px] w-10 bg-[var(--theme-accent)]" />

            <p className="mt-4 font-sans text-[12px] leading-[1.55] text-fog">
              {EDITION.meta}
            </p>

            <div className="mt-5 space-y-5">
              {SECTIONS.map((section) => (
                <section key={section.heading}>
                  <h3 className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-[var(--theme-accent)]">
                    {section.heading}
                  </h3>
                  <p className="mt-2 font-sans text-[14px] leading-[1.65] text-graphite">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>

            <section className="mt-6 border-t border-[var(--theme-border)] pt-4">
              <h3 className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-[var(--theme-accent)]">
                Sources &amp; notes
              </h3>
              <ol className="mt-2 list-decimal space-y-3 pl-5 font-sans text-[13px] leading-[1.6]">
                {SOURCES.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring link-underline rounded-sm text-[var(--theme-accent)] hover:text-ink"
                    >
                      {source.title}
                    </a>
                    <span className="mt-0.5 block text-fog">{source.note}</span>
                  </li>
                ))}
              </ol>
            </section>

            <p className="mt-5 font-serif italic text-[14px] leading-[1.6] text-ash">
              {EDITION.closing}
            </p>

            <p className="mt-5 border-t border-[var(--theme-border)] pt-4 font-sans text-[12.5px] leading-[1.55] text-fog">
              This is an example of the format. Real OneNews editions cover a
              current story and carry the sources they were built from.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
