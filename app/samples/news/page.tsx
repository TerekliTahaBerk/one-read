import type { Metadata } from "next";
import Link from "next/link";
import { SamplePageContent } from "@/components/SamplePageContent";
import { TrackEventOnMount } from "@/components/TrackEventOnMount";

export const metadata: Metadata = {
  title: "Full OneNews sample — OneRead",
  description: "Read a complete OneNews edition with its structure, sources, and notes.",
  alternates: { canonical: "/samples/news" },
  robots: { index: true, follow: true },
};

export default function OneNewsSamplePage() {
  return (
    <>
      <TrackEventOnMount event="one_news_sample_viewed" properties={{ product: "one-news" }} />
      <SamplePageContent
        product="news"
        cta={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/subscribe?offer=one-news&interval=annual"
              className="focus-ring inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[var(--theme-accent)] px-5 font-sans text-sm font-medium text-paper transition-[filter] duration-200 hover:brightness-95"
            >
              Choose OneNews
            </Link>
            <Link
              href="/pricing"
              className="focus-ring inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[var(--theme-border)] bg-paper px-5 font-sans text-sm text-ink transition-colors duration-200 hover:bg-[var(--theme-surface)]"
            >
              Compare plans
            </Link>
          </div>
        }
      />
    </>
  );
}
