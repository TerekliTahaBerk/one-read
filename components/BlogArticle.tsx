"use client";

import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import type { BlogPost } from "@/lib/blog";

/**
 * A single blog post. Mirrors the LegalLayout reading experience — a measured
 * column, serif headline, and calm body prose — so the blog never feels like a
 * different site. Post copy is passed in from the server page; only the chrome
 * (dates, "min read", back links) is localized here.
 */
export function BlogArticle({ post }: { post: BlogPost }) {
  const { locale, dictionary } = useSiteLanguage();
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.date));

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
        <BackButton href="/blog" label={dictionary.blog.backToBlog} />
        <Logo />
      </header>

      <article className="flex-1 w-full max-w-[42rem] mx-auto pt-10 sm:pt-14">
        <div className="flex items-center gap-2 font-sans text-[11.5px] uppercase tracking-eyebrow text-fog">
          <time dateTime={post.date}>{formattedDate}</time>
          <span aria-hidden="true">·</span>
          <span>
            {post.readingMinutes} {dictionary.blog.minRead}
          </span>
        </div>

        <h1 className="mt-3 font-serif font-medium text-[2rem] sm:text-[2.6rem] leading-[1.08] tracking-[-0.02em] text-ink text-balance">
          {post.title}
        </h1>

        <div className="mt-8 sm:mt-10 space-y-4">
          {post.body.map((paragraph, index) => (
            <p
              key={index}
              className="font-sans text-[15px] leading-[1.7] text-ash"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-10 sm:mt-12 border-t border-line pt-6">
          <Link
            href="/blog"
            className="focus-ring link-underline inline-flex items-center gap-1.5 rounded-sm font-sans text-[13px] text-ash transition-colors duration-200 hover:text-ink"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M12 7H2M6 3L2 7l4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {dictionary.blog.backToBlog}
          </Link>
        </div>
      </article>

      <Footer showBackHome backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}
