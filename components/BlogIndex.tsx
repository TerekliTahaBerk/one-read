"use client";

import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { getSortedBlogPosts } from "@/lib/blog";

/**
 * Blog index — the same editorial identity as the legal pages: centered logo,
 * a quiet back arrow, and a measured reading column. Posts are listed as calm,
 * hairline-separated rows rather than cards to keep the page feeling like a
 * journal, not a dashboard.
 */
export function BlogIndex() {
  const { locale, dictionary } = useSiteLanguage();
  const posts = getSortedBlogPosts();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        <BackButton href="/" label={dictionary.common.backToOneRead} />
        <Logo />
      </header>

      <section className="flex-1 w-full max-w-[42rem] mx-auto pt-10 sm:pt-14">
        <p className="text-[11px] sm:text-[11.5px] uppercase tracking-eyebrow text-fog">
          {dictionary.blog.eyebrow}
        </p>
        <h1 className="mt-3 font-serif font-medium text-[2rem] sm:text-[2.6rem] leading-[1.05] tracking-[-0.02em] text-ink">
          {dictionary.blog.title}
        </h1>
        <p className="mt-4 max-w-[46ch] font-sans text-[15px] leading-[1.7] text-ash text-pretty">
          {dictionary.blog.intro}
        </p>

        <ul className="mt-9 sm:mt-11 border-t border-line">
          {posts.map((post) => (
            <li key={post.slug} className="border-b border-line">
              <Link
                href={`/blog/${post.slug}`}
                className="focus-ring group -mx-3 block rounded-2xl px-3 py-6 transition-colors duration-200 hover:bg-cream/60"
              >
                <div className="flex items-center gap-2 font-sans text-[11.5px] uppercase tracking-eyebrow text-fog">
                  <time dateTime={post.date}>
                    {dateFormatter.format(new Date(post.date))}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>
                    {post.readingMinutes} {dictionary.blog.minRead}
                  </span>
                </div>

                <h2 className="mt-2 flex items-center gap-2 font-serif font-medium text-[1.35rem] sm:text-[1.5rem] leading-[1.15] tracking-[-0.01em] text-ink">
                  <span>{post.title}</span>
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="mt-1 shrink-0 text-fog opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  >
                    <path
                      d="M2 7h10M8 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </h2>

                <p className="mt-1.5 max-w-[52ch] font-sans text-[14.5px] leading-[1.6] text-ash text-pretty">
                  {post.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Footer showBackHome backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}
