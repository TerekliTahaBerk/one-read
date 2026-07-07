/**
 * OneRead blog content.
 *
 * A small, hand-curated set of posts kept intentionally light. Posts live here
 * as plain data so both server components (metadata, static params, sitemap)
 * and client components (rendering with the localized chrome) can import them
 * without pulling in React. The surrounding UI (eyebrow, "min read", back
 * links) is localized via the site dictionary; the post copy itself stays in
 * one voice for now — see lib/site-i18n.ts for the chrome strings.
 */

export type BlogPost = {
  /** URL slug — must be unique and stable. */
  slug: string;
  title: string;
  /** ISO date (YYYY-MM-DD), used for ordering and <time>. */
  date: string;
  /** Whole minutes, rendered next to the localized "min read" label. */
  readingMinutes: number;
  /** One-line summary shown on the index and used for metadata. */
  excerpt: string;
  /** Body as an ordered list of short paragraphs. */
  body: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-one-email-is-enough",
    title: "Why one email is enough",
    date: "2026-05-12",
    readingMinutes: 3,
    excerpt:
      "The whole idea behind OneRead in a sentence: less to open, more worth reading.",
    body: [
      "Most reading tools start from abundance. More sources, more feeds, more unread counts quietly asking for your attention. OneRead starts from the opposite instinct — one email, chosen with care, and nothing waiting behind it.",
      "A single note has a certain kind of confidence. It can't hide a weak pick behind ten stronger ones, so it has to earn the few minutes it asks for. That constraint is the whole product.",
      "There's no library to maintain and no backlog to feel guilty about. Read it or don't — tomorrow brings exactly one more.",
    ],
  },
  {
    slug: "the-case-against-the-feed",
    title: "The case against the feed",
    date: "2026-05-28",
    readingMinutes: 4,
    excerpt: "Feeds are designed to never end. That is precisely the problem.",
    body: [
      "A feed has no natural stopping point. It is built to refill faster than you can empty it, which means the decision to stop is always yours to make, alone, against a system designed to make stopping feel like missing out.",
      "We wanted the opposite: a clear edge. When you finish today's OneRead, you are finished. The satisfaction of reaching the end is part of the point, not an accident.",
      "Fewer things, chosen well, tend to stay with you longer than a hundred things skimmed. That is the quiet bet we are making.",
    ],
  },
  {
    slug: "how-we-choose-each-morning",
    title: "How we choose each morning's article",
    date: "2026-06-14",
    readingMinutes: 3,
    excerpt: "A short look at what happens between your interests and your inbox.",
    body: [
      "It starts with the handful of topics you actually care about — not a trending list, not whatever the internet is loud about today. Those interests are the filter everything else passes through.",
      "From there we read the source properly and write a short, clear summary of the one idea worth knowing. No link-and-run, no padding to hit a word count.",
      "The goal is a brief you can finish before the day gets noisy, and still feel like you learned something worth keeping.",
    ],
  },
  {
    slug: "notes-on-a-quieter-inbox",
    title: "Notes on a quieter inbox",
    date: "2026-06-30",
    readingMinutes: 2,
    excerpt: "Small habits that make email feel calm again.",
    body: [
      "A calm inbox is less about tools and more about permission — permission to let most things go unread without treating it as a failure.",
      "One habit helps more than any filter: decide what a message is for the moment you open it. Read it, reply, or let it go. Leaving it half-open is what turns an inbox into a to-do list you never agreed to.",
      "OneRead is our attempt to send you exactly one thing that always passes that test.",
    ],
  },
];

/** Posts sorted newest-first for the index. */
export function getSortedBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Look up a single post by slug. */
export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
