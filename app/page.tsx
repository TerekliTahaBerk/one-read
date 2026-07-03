import Link from "next/link";
import { Footer } from "@/components/Footer";
import { HomeReveal } from "@/components/HomeReveal";
import { Logo } from "@/components/Logo";

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
            max-w-[40rem] mx-auto
            py-4 sm:py-5
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
            OneRead is a small family of quiet, single-purpose emails — one
            subscription unlocks all of them, today and as new ones join. No
            app. No feed. No noise.
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
              href="/pricing"
              className="
                focus-ring inline-flex h-12 w-full items-center justify-center
                rounded-full border border-line-strong bg-white/65 px-6
                font-sans text-[14px] font-medium text-ink
                transition-colors duration-200 hover:bg-white
                sm:w-auto
              "
            >
              See the OneRead family
            </Link>
          </div>

          <p
            className="
              mt-5 font-sans text-[12.5px] leading-[1.55] text-fog
              text-center reveal-item reveal-item-4
            "
          >
            One subscription. One dollar. The whole OneRead family included.
          </p>

          <div
            className="
              mt-8 sm:mt-10 w-full max-w-[32rem] border-y border-line/80
              py-5 text-center reveal-item reveal-item-4
            "
          >
            <p className="font-serif text-[1.25rem] font-medium leading-tight text-ink">
              Today: OneArticle on weekdays, OneFilm on Saturdays.
            </p>
            <p className="mt-3 font-sans text-[14px] leading-[1.65] text-ash">
              One subscription unlocks every product in the OneRead family —
              now, and whatever joins next.
            </p>
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
