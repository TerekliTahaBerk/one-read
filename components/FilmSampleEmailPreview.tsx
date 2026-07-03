"use client";

import { useState } from "react";

/**
 * Static OneFilm sample preview. It demonstrates the FORMAT of the film note —
 * short, tasteful, spoiler-light editorial style — using clearly generic,
 * example-only labels. It deliberately contains no real film titles, no
 * director/year, no platform/availability claims, and no ratings, so nothing
 * here can be mistaken for a real current recommendation.
 */
export function FilmSampleEmailPreview({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-left shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ash">Sample format</div>
        <h2 className="mt-3 font-serif text-[24px] leading-tight text-ink">A note from OneFilm</h2>
        <p className="mt-1 font-serif text-[16px] italic text-ash">A quiet film for a long evening</p>
        <p className="mt-3 text-[14px] leading-6 text-ash">
          One film, a short note on why it's worth watching, what mood it suits, and what to know before you press play. The example below shows the format only — it isn't a real recommendation.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-fog">No lists, no noise. Nothing beyond real metadata is invented.</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 rounded-full border border-[var(--theme-border)] bg-white/60 px-4 py-1.5 text-[12.5px] text-ash"
        >
          {open ? "Hide example" : "See example"}
        </button>

        {open && (
          <div className="mt-5 space-y-4 border-t border-[var(--theme-border)] pt-5 text-[14px] leading-6 text-ink">
            <Section title="The note">
              A short, original note on why tonight is the night to watch this film — never copied from a review.
            </Section>
            <Section title="Why this film?">
              A short, specific reason grounded in mood and premise — never a generic blurb.
            </Section>
            <Section title="How does it feel?">
              The film's tone and texture — calm, tense, warm, slow-burning — so you know what to expect.
            </Section>
            <Section title="When it fits best">
              A short suggestion for the right moment — after a long day, on an evening you can put the phone down.
            </Section>
            <Section title="Before you start">
              A spoiler-free heads-up. OneFilm never gives away surprises you didn't ask for.
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
