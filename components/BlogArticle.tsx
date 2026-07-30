"use client";

import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { getRelatedBlogPosts, type BlogPost } from "@/lib/blog";

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
  const formattedUpdatedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.updatedDate));
  const relatedPosts = getRelatedBlogPosts(post);

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

      <article lang="en" className="flex-1 w-full max-w-[42rem] mx-auto pt-10 sm:pt-14">
        <div className="flex flex-wrap items-center gap-2 font-sans text-[11.5px] uppercase tracking-eyebrow text-fog">
          <span>{post.category}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.date}>{formattedDate}</time>
          <span aria-hidden="true">·</span>
          <span>
            {post.readingMinutes} {dictionary.blog.minRead}
          </span>
        </div>

        <h1 className="mt-3 font-serif font-medium text-[2rem] sm:text-[2.6rem] leading-[1.08] tracking-[-0.02em] text-ink text-balance">
          {post.title}
        </h1>

        <p className="mt-4 max-w-[58ch] font-sans text-[16px] leading-[1.7] text-ash text-pretty">
          {post.excerpt}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11.5px] text-fog">
          <span>By OneRead Editorial</span>
          {post.updatedDate !== post.date ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Updated{" "}
                <time dateTime={post.updatedDate}>{formattedUpdatedDate}</time>
              </span>
            </>
          ) : null}
        </div>

        <div className="mt-8 sm:mt-10 space-y-4">
          {post.introduction.map((paragraph, index) => (
            <p
              key={index}
              className="font-sans text-[15.5px] leading-[1.75] text-ash"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-9 sm:mt-11 space-y-9">
          {post.sections.map((section, sectionIndex) => {
            const headingId = `${post.slug}-section-${sectionIndex + 1}`;
            return (
            <section key={section.heading} aria-labelledby={headingId}>
              <h2
                id={headingId}
                className="font-serif text-[1.45rem] font-medium leading-[1.2] tracking-[-0.01em] text-ink"
              >
                {section.heading}
              </h2>
              <div className="mt-3.5 space-y-4">
                {section.paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="font-sans text-[15.5px] leading-[1.75] text-ash"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
            );
          })}
        </div>

        <aside className="mt-10 rounded-[1.5rem] border border-line bg-cream/45 px-5 py-5 sm:px-6">
          <h2 className="font-serif text-[1.2rem] font-medium text-ink">
            In short
          </h2>
          <ul className="mt-3 space-y-2.5">
            {post.takeaways.map((takeaway) => (
              <li
                key={takeaway}
                className="flex gap-3 font-sans text-[14px] leading-[1.65] text-ash"
              >
                <span aria-hidden="true" className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-fog" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </aside>

        <aside className="mt-6 rounded-[1.5rem] border border-line px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6">
          <div>
            <p className="font-serif text-[1.15rem] font-medium text-ink">
              {post.productLink.label}
            </p>
            <p className="mt-1 font-sans text-[13.5px] leading-[1.55] text-ash">
              {post.productLink.description}
            </p>
          </div>
          <Link
            href={post.productLink.href}
            className="focus-ring mt-4 inline-flex shrink-0 items-center rounded-full bg-ink px-5 py-2.5 font-sans text-[13px] text-white transition-opacity hover:opacity-85 sm:mt-0"
          >
            Explore
          </Link>
        </aside>

        {relatedPosts.length > 0 ? (
          <section className="mt-10 border-t border-line pt-7" aria-labelledby="related-reading">
            <h2
              id="related-reading"
              className="font-serif text-[1.25rem] font-medium text-ink"
            >
              Continue reading
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {relatedPosts.map((related) => (
                <li key={related.slug}>
                  <Link
                    href={`/blog/${related.slug}`}
                    className="focus-ring group -mx-2 flex items-center justify-between gap-4 rounded-xl px-2 py-3.5"
                  >
                    <span>
                      <span className="block font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">
                        {related.category}
                      </span>
                      <span className="mt-1 block font-serif text-[1.05rem] text-ink group-hover:underline">
                        {related.title}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-fog">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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
