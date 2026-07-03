import { type ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

type Props = {
  title: string;
  lastUpdated: string;
  backLabel?: string;
  ariaLabel?: string;
  children: ReactNode;
};

/**
 * Shared reading layout for the long-form legal pages (Privacy, Terms).
 *
 * Unlike the homepage these pages may scroll — they are reference documents.
 * The visual identity stays the same: centered logo, a measured editorial
 * column, and the quiet footer with a "Back to OneRead" link.
 *
 * Prose styling is applied to the children container via arbitrary child
 * selectors so each page can be written as plain semantic HTML (h2 / p / ul).
 */
export function LegalLayout({
  title,
  lastUpdated,
  backLabel = "Back to OneRead",
  ariaLabel,
  children,
}: Props) {
  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-6 sm:pt-7
        pb-5 sm:pb-6
      "
    >
      <header className="relative w-full flex justify-center">
        <BackButton href="/" label={backLabel} />
        <Logo ariaLabel={ariaLabel} />
      </header>

      <article className="flex-1 w-full max-w-[42rem] mx-auto pt-10 sm:pt-14">
        <p className="text-[11px] sm:text-[11.5px] uppercase tracking-eyebrow text-fog">
          Last updated {lastUpdated}
        </p>
        <h1 className="font-serif font-medium text-[2rem] sm:text-[2.6rem] leading-[1.05] tracking-[-0.02em] text-ink mt-3">
          {title}
        </h1>

        <div
          className="
            mt-8 sm:mt-10
            [&>p]:text-[15px] [&>p]:leading-[1.7] [&>p]:text-ash [&>p]:mt-4
            [&>h2]:font-serif [&>h2]:font-medium [&>h2]:text-ink
            [&>h2]:text-[1.2rem] [&>h2]:tracking-[-0.01em]
            [&>h2]:mt-9 [&>h2]:mb-1
            [&>ul]:mt-3 [&>ul]:pl-5 [&>ul]:list-disc [&>ul]:space-y-1.5
            [&>ul>li]:text-[15px] [&>ul>li]:leading-[1.6] [&>ul>li]:text-ash [&>ul>li]:pl-1
            [&_a]:text-ink [&_a]:link-underline
            [&_strong]:text-graphite [&_strong]:font-medium
          "
        >
          {children}
        </div>
      </article>

      <Footer showBackHome backLabel={backLabel} />
    </main>
  );
}
