"use client";

import { useState } from "react";

/**
 * Static OneFilm sample email. Uses no real film titles, ratings, or platform
 * claims — purely illustrative, spoiler-free copy.
 */
export function FilmSampleEmailPreview({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-left shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ash">What you’ll receive</div>
        <h2 className="mt-3 font-serif text-[24px] leading-tight text-ink">A note from OneFilm</h2>
        <p className="mt-1 font-serif text-[16px] italic text-ash">A quiet film for a long evening</p>
        <p className="mt-3 text-[14px] leading-6 text-ash">
          One thoughtful recommendation with a short note on why it is worth watching, what mood it fits, and who it might be for.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-fog">One film. One reason to watch. No endless browsing.</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 rounded-full border border-[var(--theme-border)] bg-white/60 px-4 py-1.5 text-[12.5px] text-ash"
        >
          {open ? "Hide the example" : "Read the example"}
        </button>

        {open && (
          <div className="mt-5 space-y-4 border-t border-[var(--theme-border)] pt-5 text-[14px] leading-6 text-ink">
            <Section title="Why this film">
              A short, original note on what makes it worth your evening — never copied from a review.
            </Section>
            <Section title="What it feels like">
              The mood and texture of the film, so you know what you’re settling into.
            </Section>
            <Section title="Best watched when">
              A gentle suggestion for the right moment — alone, with someone, late at night.
            </Section>
            <Section title="Before you press play">
              A spoiler-light heads-up. OneFilm never reveals twists unless you ask for full analysis.
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-[0.1em] text-[var(--theme-accent)]">{title}</div>
      <p className="mt-1 text-ash">{children}</p>
    </div>
  );
}
