"use client";

import Link from "next/link";
import { EditorialTrust } from "@/components/EditorialTrust";
import { Footer } from "@/components/Footer";
import { HomeReveal } from "@/components/HomeReveal";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { trackEvent } from "@/lib/analytics";
import type { OfferKey } from "@/lib/products/registry";

const products: ReadonlyArray<{
  offer: OfferKey;
  name: string;
  distinction: string;
  description: string;
  cadence: string;
  price: string;
  signupHref: string;
  sampleHref?: string;
}> = [
  { offer: "one-article", name: "OneArticle", distinction: "Something worth reading.", description: "One carefully edited article worth your time, selected by a human editor with concise context and the original source clearly linked.", cadence: "Weekday mornings.", price: "$2/month · $18/year", signupHref: "/subscribe?offer=one-article&interval=annual", sampleHref: "/samples/article" },
  { offer: "one-news", name: "OneNews", distinction: "Something worth understanding.", description: "One important story, human reviewed and explained with context drawn from multiple credible sources.", cadence: "Monday, Wednesday, Friday.", price: "$3/month · $27/year", signupHref: "/subscribe?offer=one-news&interval=annual", sampleHref: "/samples/news" },
  { offer: "one-read", name: "OneRead", distinction: "Both.", description: "Get OneArticle and OneNews together in one subscription.", cadence: "Both editorial products.", price: "$4/month · $36/year", signupHref: "/subscribe?offer=one-read&interval=annual" },
];

export function HomePageContent() {
  const { dictionary } = useSiteLanguage();

  return (
    <main className="relative flex min-h-svh w-full flex-col items-center px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
      <HomeReveal>
        <header className="relative flex w-full justify-center reveal-item"><Logo href="/" /></header>
        <section className="mx-auto flex w-full max-w-[58rem] flex-1 flex-col items-center py-10 sm:py-14">
          <p className="reveal-item reveal-item-2 font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">OneRead editorial email</p>
          <h1 className="reveal-item reveal-item-2 mt-3 max-w-[16ch] text-balance text-center font-serif text-[2.45rem] font-medium leading-[1.02] tracking-[-0.026em] text-ink sm:text-[3.55rem] sm:leading-[0.99]">The internet has too much. We pick one.</h1>
          <p className="reveal-item reveal-item-3 mt-4 max-w-[48ch] text-pretty text-center font-sans text-[15px] leading-[1.65] text-ash sm:mt-5 sm:text-[16px]">Someone trustworthy spends the time deciding what deserves yours. OneRead brings two calm, human-reviewed editorial products to your inbox, with clear sources and corrections when we get something wrong.</p>
          <div className="reveal-item reveal-item-4 mt-7 flex w-full flex-col items-center gap-3 sm:mt-8 sm:w-auto sm:flex-row">
            <Link href="/subscribe?offer=one-read&interval=annual" onClick={() => trackEvent("subscribe_cta_clicked", { product: "one-read" })} className={primaryLink}>Get OneRead</Link>
            <Link href="#products" className={secondaryLink}>Meet the products</Link>
          </div>

          <section id="products" aria-labelledby="products-heading" className="reveal-item reveal-item-4 mt-14 w-full scroll-mt-6 border-t border-line/80 pt-10 sm:mt-16">
            <p className="text-center font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">Two products. One clear choice at a time.</p>
            <h2 id="products-heading" className="mx-auto mt-3 max-w-[20ch] text-balance text-center font-serif text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[2.35rem]">Read what matters. Understand what matters.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">{products.map((product) => <Product key={product.offer} {...product} />)}</div>
            <p className="mt-6 text-center font-sans text-[12.5px] leading-6 text-fog">Annual plans are selected by default. Prefer monthly? You can switch before checkout.</p>
          </section>

          <EditorialTrust />
        </section>
      </HomeReveal>
      <Footer tagline={dictionary.home.tagline} showManifesto showPricing />
    </main>
  );
}

function Product(product: (typeof products)[number]) {
  const featured = product.offer === "one-read";
  return (
    <article className={`flex min-w-0 flex-col border-t px-1 pb-1 pt-6 ${featured ? "border-ink" : "border-line-strong"}`}>
      <p className="font-sans text-[10.5px] font-semibold uppercase tracking-eyebrow text-fog">{product.distinction}</p>
      <h3 className="mt-2 font-serif text-[1.65rem] font-medium text-ink">{product.name}</h3>
      <p className="mt-3 font-sans text-[13.5px] leading-[1.65] text-ash">{product.description}</p>
      <p className="mt-4 font-sans text-[12.5px] font-medium text-ink">{product.cadence}</p>
      <p className="mt-1 font-sans text-[13px] text-ash">{product.price}</p>
      <div className="mt-auto flex flex-col gap-2 pt-6">
        <Link href={product.signupHref} onClick={() => trackEvent("offer_selected", { offer: product.offer, interval: "annual" })} className={featured ? primaryLink : secondaryLink}>{featured ? "Choose OneRead" : `Choose ${product.name}`}</Link>
        {product.sampleHref ? <Link href={product.sampleHref} className={sampleLink}>Read a full {product.name} sample</Link> : <Link href="/pricing" className={sampleLink}>Compare all plans</Link>}
      </div>
    </article>
  );
}

const primaryLink = "focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 font-sans text-[14px] font-medium text-white transition-colors duration-200 hover:bg-ink/90 sm:w-auto";
const secondaryLink = "focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line-strong bg-white/70 px-6 font-sans text-[14px] font-medium text-ink transition-colors duration-200 hover:bg-white sm:w-auto";
const sampleLink = "focus-ring inline-flex min-h-11 items-center justify-center rounded-full px-4 text-center font-sans text-[13px] text-ink underline decoration-line-strong underline-offset-4";
