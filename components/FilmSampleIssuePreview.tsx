"use client";

import { useId, useState } from "react";
import Link from "next/link";

const SECTIONS = [
  {
    heading: "Why this film?",
    body: [
      "It's a small, unhurried story that trusts a quiet week to carry its weight — the kind of film that rewards attention rather than demanding it.",
      "Hirayama cleans public toilets in Tokyo and moves through a precise daily routine. The film watches closely enough for repetition to reveal its small differences.",
    ],
  },
  {
    heading: "How does it feel?",
    body: [
      "Calm, warm, and a little melancholy — the sort of tone that suits a slow evening rather than a night you want to be swept along by.",
      "The pace is patient and observant. Music, trees, streets, and ordinary gestures are allowed to carry as much weight as dialogue.",
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
  "Tonight's pick is Perfect Days, Wim Wenders' quiet character study set around one man's daily life in Tokyo.",
  "If your week has been loud, this is the deliberate opposite: unhurried pacing, a precise central performance, and a story more interested in attention than plot mechanics.",
  "Here's the short version of why it's worth your evening, what mood it suits, and what — if anything — you should know before you press play.",
] as const;

const SOURCE = {
  label: "OneFilm | Saturday Film Note",
  pick: "Perfect Days — a gentle character study about routine, attention, and the small variations that make one day different from the next.",
  director: "Wim Wenders",
  year: "2023",
  language: "Japanese",
  runtime: "124 minutes",
  mood: "Calm, warm, a little melancholy — slow-burning rather than eventful.",
  bestFor: "A quiet evening when you want to feel something, not just watch something.",
  spoilerLevel: "Spoiler-light — enough to decide, nothing given away.",
  sourceUrl: "https://www.perfectdays-movie.jp/en/",
  note:
    "Film identity and story details are grounded in the official Perfect Days website. OneRead does not claim current streaming availability, and this note contains no paid placement or affiliate link.",
} as const;

/**
 * An inline, accessible disclosure (no modal, no focus trap) that expands to a
 * fuller example of a OneFilm note. Mirrors OneArticle's SampleIssuePreview
 * exactly — same toggle, same card, same rhythm — so the two examples read as
 * one family, not two designs. Static/frontend-only, with factual identity and
 * story details linked to the film's official website.
 */
export function FilmSampleIssuePreview({
  defaultOpen = false,
  hideToggle = false,
}: {
  defaultOpen?: boolean;
  hideToggle?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || hideToggle);
  const regionId = useId();

  return (
    <div className="w-full">
      {!hideToggle && <div className="flex flex-wrap justify-center gap-3">
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
        <Link
          href="/samples/film"
          className="focus-ring inline-flex items-center rounded-full px-3 py-1.5 font-sans text-[13px] text-ink link-underline"
        >
          Open full sample
        </Link>
      </div>}

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
            Perfect Days — a quiet film for a loud week
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
              <dt className="text-fog">Film</dt>
              <dd className="mt-0.5 text-graphite">
                {SOURCE.year} · {SOURCE.director} · {SOURCE.language} · {SOURCE.runtime}
              </dd>
            </div>
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
            <div>
              <dt className="text-fog">Official source</dt>
              <dd className="mt-0.5">
                <a href={SOURCE.sourceUrl} target="_blank" rel="noopener noreferrer" className="link-underline text-[var(--theme-accent)] hover:text-ink">
                  Perfect Days official website
                </a>
              </dd>
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
              This is a complete format sample. Real OneFilm notes use the same
              grounded, spoiler-light structure.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
