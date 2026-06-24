"use client";

import { useId, useState } from "react";

const SECTIONS = [
  {
    heading: "Today’s focus: a new financial force, not just a crypto tool",
    body: [
      "Hofmann, Kaldorf, and Rottner argue that stablecoins create two powerful macroeconomic forces that move in opposite directions.",
      "On one side, stablecoin issuers often invest their reserves in short-term government debt. That creates extra demand for Treasury bills and can lower the government’s borrowing costs.",
      "On the other side, when households or firms move money out of bank deposits and into stablecoins, banks lose one of their cheapest funding sources. To keep deposits, banks may need to pay higher rates. Higher funding costs can then translate into higher lending rates and tighter credit for businesses.",
      "That is the tension at the heart of the paper: stablecoins may make government borrowing easier while making private credit more expensive.",
    ],
  },
  {
    heading: "How the mechanism works",
    body: [
      "The paper’s model can be understood through two channels.",
      "First, the banking channel. When deposits leave the banking system and move into stablecoins, commercial banks have less cheap funding available. To replace it, they either compete harder for deposits or rely on more expensive funding. Both routes can raise their cost of lending. Over time, this can reduce credit supply to the real economy.",
      "Second, the fiscal-space channel. Stablecoin issuers typically hold safe and liquid assets against the tokens they issue. In practice, that often means short-term government securities. As stablecoin demand grows, so does demand for these securities. That can push government borrowing costs down and give the public sector more fiscal room.",
      "The paper’s key finding is that, under its benchmark calibration, the negative banking-channel effect dominates. In other words, the drag from tighter bank credit can outweigh the benefit of cheaper government borrowing.",
    ],
  },
  {
    heading: "The important caveats",
    body: [
      "The result is not inevitable. Regulation changes the story.",
      "If stablecoin reserves were required to sit inside the banking system, or at the central bank, the deposit drain could be much smaller. The macroeconomic effect would depend less on stablecoin adoption itself and more on how reserves are held.",
      "The source of demand also matters. If stablecoin demand comes from abroad, the domestic banking system may avoid some of the deposit loss while still receiving capital inflows.",
      "There is also a stability caveat. The model assumes stablecoins maintain their peg. Real markets are messier. If confidence breaks, a stablecoin run could create a much sharper stress event than the model’s calm baseline suggests.",
    ],
  },
  {
    heading: "Why it matters",
    body: [
      "For executives, founders, investors, and policymakers, the message is that stablecoins are no longer a side story inside crypto.",
      "They may become a direct competitor to bank deposits, a new buyer of government debt, and a structural force in credit markets. If their market share keeps growing, the cost and availability of business credit may depend not only on central bank policy, but also on how much money sits inside digital wallets.",
      "The quiet lesson is this: the future of finance may not be shaped only by interest-rate decisions. It may also be shaped by where people choose to park their most liquid money.",
    ],
  },
] as const;

const INTRO = [
  "Good morning.",
  "If you have taken your first sip of coffee, let’s look at one of the most “boring” actors in finance — and one of the most important: stablecoins.",
  "If you mostly follow crypto through price spikes and crashes, stablecoins may look like simple digital dollars: tokens designed to stay close to $1 and used as a parking spot between trades. But a new BIS working paper argues that these instruments may be quietly moving into the plumbing of the traditional banking system — with consequences that reach far beyond crypto markets.",
  "The central question is simple: what happens when money that once sat inside bank deposits starts moving into privately issued digital dollars?",
  "Today’s paper suggests that the answer is not just about payments. It is about bank funding, government debt, credit conditions, and the future cost of financing the real economy.",
] as const;

const SOURCE = {
  subject:
    "☕️ Today, we’re looking at the quiet revolution in your pocket: stablecoins and the banking system’s biggest test",
  label: "OneArticle | Daily Macro Brief",
  study: "The Macroeconomics of Stablecoins (BIS Working Paper No. 1363)",
  authors:
    "Boris Hofmann, Matthias Kaldorf, and Matthias Rottner — Bank for International Settlements (BIS)",
  date: "June 23, 2026",
  url: "https://www.bis.org/publ/work1363.htm",
  note:
    "This brief was written by OneArticle as an original and transformative reading guide to synthesize the main ideas of the referenced academic work. It is not a substitute for the original paper. Nothing in this brief should be understood as investment advice, financial guidance, or a recommendation to buy, sell, or hold any asset.",
} as const;

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
            Stablecoins and the banking system’s biggest test
          </h3>

          <div className="mt-4 rounded-xl border border-[var(--theme-border)] bg-white/60 p-4">
            <p className="font-sans text-[11px] uppercase tracking-eyebrow text-[var(--theme-accent)]">
              Subject
            </p>
            <p className="mt-1.5 font-sans text-[13.5px] leading-[1.55] text-graphite">
              {SOURCE.subject}
            </p>
          </div>

          <dl className="mt-4 grid gap-3 border-b border-[var(--theme-border)] pb-4 font-sans text-[12.5px] leading-[1.55]">
            <div>
              <dt className="text-fog">Source study</dt>
              <dd className="mt-0.5 text-graphite">{SOURCE.study}</dd>
            </div>
            <div>
              <dt className="text-fog">Authors</dt>
              <dd className="mt-0.5 text-graphite">{SOURCE.authors}</dd>
            </div>
            <div>
              <dt className="text-fog">Publication date</dt>
              <dd className="mt-0.5 text-graphite">{SOURCE.date}</dd>
            </div>
            <div>
              <dt className="text-fog">Original work</dt>
              <dd className="mt-0.5">
                <a
                  href={SOURCE.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline text-[var(--theme-accent)] hover:text-ink"
                >
                  {SOURCE.url}
                </a>
              </dd>
            </div>
          </dl>

          <div className="mt-4 space-y-3">
            {INTRO.map((paragraph) => (
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
            Have a thoughtful day. We’ll be back tomorrow morning with one more
            idea worth reading.
          </p>

          <div className="mt-5 space-y-3 border-t border-[var(--theme-border)] pt-4">
            <p className="font-sans text-[12.5px] leading-[1.55] text-fog">
              {SOURCE.note}
            </p>
            <p className="font-sans text-[12.5px] leading-[1.55] text-fog">
              This is an example of the format. Real OneArticle emails are chosen
              around your interests, source language, and summary preferences.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
