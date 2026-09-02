import type { Metadata } from "next";
import Link from "next/link";
import { TrackEventOnMount } from "@/components/TrackEventOnMount";

export const metadata: Metadata = {
  title: "Full OneNews sample — OneRead",
  description: "Read a complete OneNews edition with its structure, sources, and notes.",
  alternates: { canonical: "/samples/news" },
  robots: { index: true, follow: true },
};

export default function OneNewsSamplePage() {
  return <main className="min-h-svh bg-[#efeee9] px-5 py-10 text-[#171714]">
    <TrackEventOnMount event="one_news_sample_viewed" properties={{ product: "one-news" }} />
    <article className="mx-auto max-w-[680px] overflow-hidden rounded-2xl border border-black/15 bg-white">
      <header className="bg-[#171714] p-7 text-white"><div className="flex justify-between"><Link href="/" className="font-serif text-xl">OneRead.</Link><span className="text-xs font-semibold uppercase tracking-[.16em] text-white/70">OneNews sample</span></div><p className="mt-5 text-xs text-white/70">Evergreen explainer · English · 4 min read</p></header>
      <div className="space-y-8 p-7 sm:p-9"><div><h1 className="font-serif text-4xl font-semibold leading-tight">Why the world needs a shared clock</h1><p className="mt-4 font-serif text-lg leading-7 text-ash">UTC gives systems a common reference even when people live, work, and read in different local times.</p></div>
        <Section title="What happened">Modern communications made local clocks insufficient for coordinating events across borders. Coordinated Universal Time, or UTC, became the common reference used by technical standards, networks, and international timekeeping.</Section>
        <Section title="Why it matters">A shared reference prevents the same instant from being recorded differently by every system. Local time still matters to people; UTC matters when computers, researchers, transport systems, and public institutions need an unambiguous point of comparison.</Section>
        <Section title="What to watch">Civil time remains a policy choice. Governments can change time-zone rules, while technical systems must keep their time-zone data current and preserve the underlying instant. Good software stores the instant and converts it for the reader.</Section>
        <section><h2 className={heading}>Sources & notes</h2><ol className="list-decimal space-y-3 pl-5 text-sm leading-6"><li><a className="underline" href="https://www.bipm.org/en/time-metrology" rel="noreferrer">BIPM — Time metrology</a><span className="block text-ash">Primary institutional background on international timekeeping and UTC.</span></li><li><a className="underline" href="https://www.rfc-editor.org/rfc/rfc3339" rel="noreferrer">IETF RFC 3339 — Date and Time on the Internet</a><span className="block text-ash">Primary technical standard for representing internet timestamps.</span></li></ol></section>
        <p className="font-serif italic text-ash">Today, one story was enough.</p>
      </div>
    </article>
    <div className="mx-auto mt-8 flex max-w-[680px] flex-col gap-3 sm:flex-row"><Link href="/subscribe?offer=one-news&interval=annual" className="focus-ring inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-white">Choose OneNews</Link><Link href="/pricing" className="focus-ring inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-black/20 bg-white px-5 text-sm">Compare plans</Link></div>
  </main>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className={heading}>{title}</h2><p className="mt-3 leading-7 text-[#2d2c28]">{children}</p></section>; }
const heading = "text-xs font-bold uppercase tracking-[.12em] text-fog";
