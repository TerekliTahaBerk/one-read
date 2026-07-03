import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { MockPortal } from "@/components/MockPortal";
import { productThemes } from "@/lib/product-themes";
import { parseEmail } from "@/lib/options";
import { isMockAllowed } from "@/lib/billing/mock";
import { findOneArticleSubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mock billing portal — OneArticle (dev)",
  robots: { index: false, follow: false },
};

export default async function MockPortalPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const theme = productThemes.article;
  const email = parseEmail(searchParams.email);
  const allowed = isMockAllowed();
  const sub = allowed && email ? await findOneArticleSubscription(email) : null;

  return (
    <main
      className="relative min-h-svh w-full flex flex-col items-center px-5 sm:px-6 pt-7 sm:pt-9 pb-6 sm:pb-8"
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
          "--theme-selected-surface": theme.selectedSurface,
          "--theme-page": theme.background,
          "--theme-focus": theme.accent,
        } as CSSProperties
      }
    >
      <header className="relative w-full flex justify-center">
        <BackButton href="/article/subscribe" label="Back to subscribe" />
        <Logo label="OneArticle" href="/" ariaLabel="OneArticle — OneRead home" />
      </header>

      <section className="w-full flex flex-col items-center max-w-[34rem] mx-auto py-8 sm:py-10 my-auto">
        {!allowed ? (
          <p className="font-sans text-[15px] text-ash text-center max-w-[40ch]">
            Mock billing portal is not available in this environment.
          </p>
        ) : !email || !sub ? (
          <p className="font-sans text-[15px] text-ash text-center max-w-[40ch]">
            No subscription found for that email. Start from{" "}
            <a className="underline" href="/article/subscribe">
              the subscribe page
            </a>
            .
          </p>
        ) : (
          <MockPortal
            email={email}
            initial={{
              status: sub.status,
              plan: sub.plan,
              currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            }}
          />
        )}
      </section>

      <Footer showBackHome backHref="/article/subscribe" backLabel="Back to subscribe" />
    </main>
  );
}
