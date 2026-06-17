"use client";

import { useId, useState } from "react";

const SECTIONS = [
  {
    heading: "Why it matters",
    body: "Software work is moving from writing every step manually to directing systems that can plan, draft, test, and revise. The value is shifting from doing more tasks to asking better questions and making better decisions.",
  },
  {
    heading: "The short version",
    body: "AI agents are becoming more useful because they can work across multiple steps instead of only answering one prompt at a time. For builders, this means faster experiments, more automation, and a greater need for judgment.",
  },
  {
    heading: "One useful idea",
    body: "The best use of AI is not replacing attention. It is protecting attention for the parts of the work where taste, context, and decisions matter most.",
  },
  {
    heading: "Worth thinking about",
    body: "If a tool can do more of the execution, the real skill becomes knowing what should be built, why it matters, and what good looks like.",
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
          {open ? "Hide sample issue" : "See a sample issue"}
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
            Why AI agents are changing software work
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
            This is an example of the format. Real OneArticle emails are selected
            around your interests and language preferences.
          </p>
        </div>
      )}
    </div>
  );
}
