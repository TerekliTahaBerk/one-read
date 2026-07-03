import Link from "next/link";
import { Footer } from "@/components/Footer";
import { HomeReveal } from "@/components/HomeReveal";
import { Logo } from "@/components/Logo";
import { OneReadFamilyMascots } from "@/components/OneReadFamilyMascots";

export default function HomePage() {
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
        <header className="w-full flex justify-center reveal-item">
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
            One useful email at a time.
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
            OneRead brings small, single-purpose notes to your inbox — an
            article for the morning, a film for the weekend, and more quiet
            tools as they join the family.
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
              className="
                focus-ring inline-flex h-12 w-full items-center justify-center
                rounded-full bg-ink px-6 font-sans text-[14px] font-medium
                text-white transition-colors duration-200 hover:bg-ink/90
                sm:w-auto
              "
            >
              Start OneRead
            </Link>
            <Link
              href="#family"
              className="
                focus-ring inline-flex h-12 w-full items-center justify-center
                rounded-full border border-line-strong bg-white/65 px-6
                font-sans text-[14px] font-medium text-ink
                transition-colors duration-200 hover:bg-white
                sm:w-auto
              "
            >
              Meet the family
            </Link>
          </div>

          <p
            className="
              mt-5 font-sans text-[12.5px] leading-[1.55] text-fog
              text-center reveal-item reveal-item-4
            "
          >
            One subscription. One dollar. Every OneRead product included as the
            family grows.
          </p>

          <div className="w-full reveal-item reveal-item-4">
            <OneReadFamilyMascots />
          </div>
        </section>
      </HomeReveal>

      <Footer
        tagline="No feed to check. Just something worth opening."
        showManifesto
        showProducts
      />
    </main>
  );
}
