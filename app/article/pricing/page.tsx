import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { PricingCard } from "@/components/PricingCard";

export const metadata: Metadata = {
  title: "Pricing — One Article",
  description:
    "Simple pricing for One Article. One carefully selected article summary in your inbox every day — $2/month or $18/year.",
};

export default function ArticlePricingPage() {
  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-7 sm:pt-9
        pb-6 sm:pb-8
      "
    >
      <header className="w-full flex justify-center animate-rise">
        <Logo label="One Article" href="/" ariaLabel="One Article — One Read home" />
      </header>

      <section
        className="
          w-full
          flex flex-col items-center
          max-w-[34rem] mx-auto
          py-8 sm:py-10
          my-auto
        "
      >
        <h1
          className="
            font-serif font-medium
            text-[2rem] leading-[1.08]
            sm:text-[2.5rem] sm:leading-[1.06]
            tracking-[-0.012em]
            text-ink text-center
            max-w-[18ch]
            animate-rise-delayed
          "
        >
          Simple pricing for One Article.
        </h1>

        <p
          className="
            font-sans
            text-[15px] sm:text-[15.5px] leading-[1.65]
            text-ash text-center
            mt-5 max-w-[40ch]
            animate-rise-delayed-2
          "
        >
          One carefully selected article summary in your inbox every day.
        </p>

        <PricingCard />
      </section>

      <Footer showBackHome backHref="/article" backLabel="Back to One Article" />
    </main>
  );
}
