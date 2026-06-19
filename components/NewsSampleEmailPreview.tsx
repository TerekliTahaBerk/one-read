"use client";

import { useState } from "react";

/**
 * Static OneNews sample email. Uses clearly generic, fake-free labels — no real
 * outlet names and no URLs, so nothing here can be mistaken for a real source.
 */
export function NewsSampleEmailPreview({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-left shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ash">What you’ll receive</div>
        <h2 className="mt-3 font-serif text-[24px] leading-tight text-ink">A morning with OneNews</h2>
        <p className="mt-1 font-serif text-[16px] italic text-ash">The stories worth knowing today</p>
        <p className="mt-3 text-[14px] leading-6 text-ash">
          A short, calm briefing with the main stories, why they matter, and links to the original sources.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-fog">The news, without a feed to fall into.</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 rounded-full border border-[var(--theme-border)] bg-white/60 px-4 py-1.5 text-[12.5px] text-ash"
        >
          {open ? "Hide the example" : "Read the example"}
        </button>

        {open && (
          <div className="mt-5 space-y-4 border-t border-[var(--theme-border)] pt-5 text-[14px] leading-6 text-ink">
            <Section title="Today’s brief">
              A few clear, calm summaries of the main stories — each with its source named and linked.
            </Section>
            <Section title="Why it matters">
              A sentence of plain context for each story, so you understand it without the noise.
            </Section>
            <Section title="One story to watch">
              A single forward-looking item, framed calmly — not as a crisis.
            </Section>
            <Section title="Sources">
              Every story links back to the original outlet. OneNews never invents the news.
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
