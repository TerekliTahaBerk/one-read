"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { EditorialTrust } from "@/components/EditorialTrust";
import { HomeReveal } from "@/components/HomeReveal";
import { Logo } from "@/components/Logo";
import { OneReadLineUp } from "@/components/OneReadLineUp";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { OFFERS, OFFER_KEYS, type OfferKey } from "@/lib/products/registry";
import { entryPriceLine, offerCadenceLabel, offerContentsLine } from "@/lib/products/pricing-copy";
import { trackEvent } from "@/lib/analytics";

/**
 * Where each offer's card sends a reader who is not ready to buy. A standalone
 * offer shows its own product; the bundle has nothing to show that its two
 * products do not already, so it goes to the page that compares them.
 */
const OFFER_EXPLORE_HREF: Record<OfferKey, string> = {
  "one-article": "/samples/article",
  "one-news": "/samples/news",
  "one-read": "/pricing",
};

export function HomePageContent() {
  const { dictionary } = useSiteLanguage();

  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-5 sm:pt-6
        pb-4 sm:pb-5
      "
    >
      <HomeReveal>
        <header className="relative w-full flex justify-center reveal-item">
          <Logo href="/" />

        </header>

        <section
          className="
            flex-1 w-full
            flex flex-col items-center justify-center
            max-w-[54rem] mx-auto
            py-10 sm:py-14
          "
        >
          <h1
            className="
              font-serif font-medium
              text-[2.45rem] leading-[1.02]
              sm:text-[3.55rem] sm:leading-[0.99]
              tracking-[-0.026em]
              text-ink text-center text-balance
              max-w-[16ch]
              reveal-item reveal-item-2
            "
          >
            The internet has too much. We pick one.
          </h1>

          <p
            className="
              font-sans
              text-[15px] sm:text-[16px] leading-[1.65]
              text-ash text-center text-pretty
              mt-4 sm:mt-5
              max-w-[48ch]
              reveal-item reveal-item-3
            "
          >
            Someone trustworthy spends the time deciding what deserves yours. Human-reviewed editions, clear sources, and corrections when we get something wrong.
          </p>

          <div
            className="
              mt-7 sm:mt-8 flex w-full flex-col items-center gap-3
              sm:flex-row sm:justify-center
              reveal-item reveal-item-4
            "
          >
            <Link
              href="/subscribe"
              onClick={() => trackEvent("subscribe_cta_clicked")}
              className="
                focus-ring inline-flex h-12 w-full items-center justify-center
                rounded-full bg-ink px-6 font-sans text-[14px] font-medium
                text-white transition-colors duration-200 hover:bg-ink/90
                sm:w-auto
              "
            >
              Choose your plan
            </Link>
          </div>

          <p
            className="
              mt-5 font-sans text-[12.5px] leading-[1.55] text-fog
              text-center reveal-item reveal-item-4
            "
          >
            {entryPriceLine()}
          </p>

          <div className="w-full reveal-item reveal-item-4">
            <OneReadLineUp />
            <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
              {OFFER_KEYS.map((offer) => (
                <OfferLink
                  key={offer}
                  href={OFFER_EXPLORE_HREF[offer]}
                  title={OFFERS[offer].displayName}
                  body={OFFERS[offer].tagline}
                  detail={offerContentsLine(offer) ?? offerCadenceLabel(offer)}
                />
              ))}
            </div>
            <EditorialTrust />
          </div>
        </section>
      </HomeReveal>

      <Footer
        tagline={dictionary.home.tagline}
        showManifesto
        showPricing
      />
    </main>
  );
}

/**
 * One offer, named and described entirely from the registry. The third line is
 * a cadence for a product and a contents list for the bundle: a bundle spanning
 * two schedules has no single cadence to state, and saying what it contains is
 * the thing a reader actually needs before opening the pricing page.
 */
function OfferLink({ href, title, body, detail }: { href: string; title: string; body: string; detail: string }) {
  return <Link href={href} className="focus-ring rounded-2xl border border-black/10 bg-white/70 p-5"><strong className="font-serif text-xl">{title}</strong><span className="mt-2 block font-sans text-sm leading-6 text-ash">{body}</span><span className="mt-2 block font-sans text-xs leading-5 text-fog">{detail}</span></Link>;
}
