"use client";

import { useId, useState } from "react";

const SECTIONS = [
  {
    heading: "Why this is worth your time",
    body: "AI agents are changing the shape of software work. Not by making human judgment disappear, but by moving more of the routine execution into systems that can plan, draft, test, and revise with less hand-holding.",
  },
  {
    heading: "The short version",
    body: "The important shift is not that software can answer a prompt. It is that software can now carry work across several steps. That makes speed easier to access, but it also makes direction, taste, and review more important.",
  },
  {
    heading: "The useful idea",
    body: "When tools become better at execution, the valuable work moves upstream. Knowing what to ask for, what to ignore, and what “good” should look like becomes harder to outsource.",
  },
  {
    heading: "A question to keep",
    body: "If more of the doing becomes automated, where should your attention actually go?",
  },
] as const;

/**
 * An inline, accessible disclosure (no modal, no focus trap) that expands to a
 * fuller example of a OneArticle issue. Static/frontend-only.
 */
export function SampleIssuePreview() {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  return (
    <div className="w-full">
      <div className="flex justify-center">
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
          {open ? "Hide the sample" : "Read the sample"}
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
      </div>

      {open && (
        <div
          id={regionId}
          className="
            mt-4 rounded-2xl border border-[var(--theme-border)] bg-white/70
            p-5 sm:p-6 text-left animate-fade-in
          "
        >
          <p className="font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">
            Sample OneArticle
          </p>
          <h3 className="mt-2 font-serif font-medium text-[1.25rem] sm:text-[1.4rem] leading-[1.2] text-ink">
            When software starts working beside you
          </h3>

          <div className="mt-4 space-y-4">
            {SECTIONS.map((section) => (
              <div key={section.heading}>
                <p className="font-sans text-[11px] uppercase tracking-eyebrow text-[var(--theme-accent)]">
                  {section.heading}
                </p>
                <p className="mt-1.5 font-sans text-[14px] leading-[1.6] text-graphite">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 border-t border-[var(--theme-border)] pt-4 font-sans text-[12.5px] leading-[1.55] text-fog">
            This is only a sample format. Real OneArticle emails are chosen
            around your interests, source language, and summary preferences.
          </p>
        </div>
      )}
    </div>
  );
}
