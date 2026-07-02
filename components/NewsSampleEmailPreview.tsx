"use client";

import { useState } from "react";

/**
 * Static OneNews sample preview. It demonstrates the FORMAT of the 5-minute
 * morning brief — concise style, sponsor-free layout, source-grounded structure
 * — using clearly generic, example-only labels. It deliberately contains no real
 * outlet names, no URLs, and no fixed fake current events, so nothing here can
 * be mistaken for real, live news.
 */
export function NewsSampleEmailPreview({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-left shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ash">Sample format</div>
        <h2 className="mt-3 font-serif text-[24px] leading-tight text-ink">A morning with OneNews</h2>
        <p className="mt-1 font-serif text-[16px] italic text-ash">A 5-minute morning briefing</p>
        <p className="mt-3 text-[14px] leading-6 text-ash">
          A short morning headline, a brief top summary, and a plain, source-linked rundown. The example below shows the format only — it is not real, live news.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-fog">No sponsor section. Linked to real sources.</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 rounded-full border border-[var(--theme-border)] bg-white/60 px-4 py-1.5 text-[12.5px] text-ash"
        >
          {open ? "Hide example" : "See example"}
        </button>

        {open && (
          <div className="mt-5 space-y-4 border-t border-[var(--theme-border)] pt-5 text-[14px] leading-6 text-ink">
            <Section title="Morning headline">
              A short, plain headline combining the day's 1–2 most important developments. (Sample format)
            </Section>
            <Section title="Brief top summary">
              A calm paragraph summarizing the day's highlights in 2–4 sentences.
            </Section>
            <Section title="Today's rundown">
              Organized by category, 5–8 one-sentence items — in order of priority:
            </Section>
            <Bullet label="Markets">A brief look at indices and exchange rates for the day.</Bullet>
            <Bullet label="Economy">A one-sentence summary of a data point or policy headline.</Bullet>
            <Bullet label="Business">A short note on a company or sector development.</Bullet>
            <Bullet label="Politics">A plain summary of a current decision.</Bullet>
            <Bullet label="Technology">A notable technology development.</Bullet>
            <Section title="Weekend extra">
              A light section added only on weekends or when relevant content exists.
            </Section>
            <Section title="Sources">
              Every item links to its real source. OneNews never invents news.
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

function Bullet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pl-3">
      <span className="text-[12.5px] font-medium text-ink">{label}.</span>{" "}
      <span className="text-[13.5px] text-ash">{children}</span>
    </div>
  );
}
