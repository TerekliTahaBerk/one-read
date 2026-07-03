"use client";

import { useId, useState } from "react";

const SECTIONS = [
  {
    heading: "Why this film?",
    body: [
      "It's a small, unhurried story that trusts a quiet week to carry its weight — the kind of film that rewards attention rather than demanding it.",
      "Nothing about the premise is loud. A stranger arrives, routines shift a little, and the film lets that shift sit with you instead of rushing to explain it.",
    ],
  },
  {
    heading: "How does it feel?",
    body: [
      "Calm, warm, and a little melancholy — the sort of tone that suits a slow evening rather than a night you want to be swept along by.",
      "Long takes, natural light, very little score. It gives a scene room to breathe before it moves on.",
    ],
  },
  {
    heading: "When it fits best",
    body: [
      "After a long day, once the phone is face-down and there's nowhere else to be.",
      "Not a film for background noise — it asks for the room, but gives something back for it.",
    ],
  },
  {
    heading: "Before you start",
    body: [
      "No twist to brace for and nothing here spoils the ending. The only heads-up: it's slower than most, and that's the point.",
    ],
  },
] as const;

const NOTE_INTRO = [
  "Good evening.",
  "Tonight's pick is a small, character-driven story — the kind that doesn't announce itself but stays with you after the credits.",
  "If your week has been loud, this is the deliberate opposite: unhurried pacing, a handful of quiet performances, and a story more interested in a feeling than a twist.",
  "Here's the short version of why it's worth your evening, what mood it suits, and what — if anything — you should know before you press play.",
] as const;

const SOURCE = {
  label: "OneFilm | Saturday Film Note",
  pick: "A slow, tender character study about a stranger who quietly reshapes one ordinary week.",
  mood: "Calm, warm, a little melancholy — slow-burning rather than eventful.",
  bestFor: "A quiet evening when you want to feel something, not just watch something.",
  spoilerLevel: "Spoiler-light — enough to decide, nothing given away.",
  note:
    "This is an example of the format only — it does not name a real film, director, year, platform, or rating. Nothing in a OneFilm note is invented: only what's genuinely known about the film makes it in.",
} as const;

/**
 * An inline, accessible disclosure (no modal, no focus trap) that expands to a
 * fuller example of a OneFilm note. Mirrors OneArticle's SampleIssuePreview
 * exactly — same toggle, same card, same rhythm — so the two examples read as
 * one family, not two designs. Static/frontend-only, and deliberately generic:
 * no real film titles, director/year, platform claims, or ratings.
 */
export function FilmSampleIssuePreview() {
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
            {SOURCE.label}
          </p>
          <h3 className="mt-2 font-serif font-medium text-[1.25rem] sm:text-[1.4rem] leading-[1.2] text-ink">
            A quiet film for a long evening
          </h3>

          <div className="mt-4 rounded-xl border border-[var(--theme-border)] bg-white/60 p-4">
            <p className="font-sans text-[11px] uppercase tracking-eyebrow text-[var(--theme-accent)]">
              Tonight&apos;s pick
            </p>
            <p className="mt-1.5 font-sans text-[13.5px] leading-[1.55] text-graphite">
              {SOURCE.pick}
            </p>
          </div>

          <dl className="mt-4 grid gap-3 border-b border-[var(--theme-border)] pb-4 font-sans text-[12.5px] leading-[1.55]">
            <div>
              <dt className="text-fog">Mood</dt>
              <dd className="mt-0.5 text-graphite">{SOURCE.mood}</dd>
            </div>
            <div>
              <dt className="text-fog">Best for</dt>
              <dd className="mt-0.5 text-graphite">{SOURCE.bestFor}</dd>
            </div>
            <div>
              <dt className="text-fog">Spoiler level</dt>
              <dd className="mt-0.5 text-graphite">{SOURCE.spoilerLevel}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-3">
            {NOTE_INTRO.map((paragraph) => (
              <p key={paragraph} className="font-sans text-[14px] leading-[1.65] text-graphite">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            {SECTIONS.map((section) => (
              <div key={section.heading}>
                <p className="font-sans text-[11px] uppercase tracking-eyebrow text-[var(--theme-accent)]">
                  {section.heading}
                </p>
                <div className="mt-2 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="font-sans text-[14px] leading-[1.65] text-graphite">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 font-serif italic text-[14px] leading-[1.6] text-ash">
            Enjoy the evening. We&apos;ll be back Saturday with one more film worth
            watching.
          </p>

          <div className="mt-5 space-y-3 border-t border-[var(--theme-border)] pt-4">
            <p className="font-sans text-[12.5px] leading-[1.55] text-fog">
              {SOURCE.note}
            </p>
            <p className="font-sans text-[12.5px] leading-[1.55] text-fog">
              This is an example of the format. Real OneFilm notes are chosen
              around your genres, moods, and spoiler preference.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
