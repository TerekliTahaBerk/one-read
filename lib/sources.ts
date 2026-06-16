/**
 * OneRead — curated RSS source catalog.
 *
 * Quality over quantity. Each entry is a public RSS / Atom feed of a
 * publisher whose work tends to clear our editorial bar. Items still go
 * through scoring + summarization; this list is just the candidate pool.
 *
 * Conventions:
 *   - `slug` is stable, lowercase, kebab-case. It's the unique key in DB.
 *   - `defaultTopic` MUST be a slug from `lib/topics.ts`.
 *   - `active: false` keeps the row in the catalog but excluded from runs.
 *     Use it for feeds that are flaky, geo-blocked, or paywalled.
 *
 * Adding a feed:
 *   1) Add to this array.
 *   2) `npm run db:seed-sources` to upsert rows.
 *   3) The next pipeline run picks it up automatically.
 */

export interface SourceConfig {
  slug: string;
  name: string;
  feedUrl: string;
  homepage?: string;
  defaultTopic: string;
  defaultSubtopics?: readonly string[];
  /** Content language of the feed. Defaults to "English" when omitted. */
  language?: "English" | "Turkish" | "Spanish" | "French" | "German";
  active?: boolean;
  notes?: string;
}

export const SEED_SOURCES: readonly SourceConfig[] = [
  /* ----------------------------- AI ---------------------------------- */
  {
    slug: "openai-blog",
    name: "OpenAI Blog",
    feedUrl: "https://openai.com/blog/rss.xml",
    homepage: "https://openai.com/blog",
    defaultTopic: "artificial-intelligence",
    defaultSubtopics: ["llms", "ai-products"],
  },
  {
    slug: "anthropic-news",
    name: "Anthropic News",
    feedUrl: "https://www.anthropic.com/news/rss.xml",
    homepage: "https://www.anthropic.com/news",
    defaultTopic: "artificial-intelligence",
    defaultSubtopics: ["llms", "ai-safety"],
    active: false,
    notes: "Feed URL changes frequently; verify before enabling.",
  },
  {
    slug: "google-deepmind",
    name: "Google DeepMind",
    feedUrl: "https://deepmind.google/blog/rss.xml",
    homepage: "https://deepmind.google/discover/blog/",
    defaultTopic: "artificial-intelligence",
    defaultSubtopics: ["ai-research", "machine-learning"],
    active: false,
    notes: "DeepMind frequently rotates feed URLs; smoke-test on enable.",
  },
  {
    slug: "huggingface-blog",
    name: "Hugging Face Blog",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    homepage: "https://huggingface.co/blog",
    defaultTopic: "artificial-intelligence",
    defaultSubtopics: ["machine-learning", "ai-research"],
  },
  {
    slug: "stanford-hai",
    name: "Stanford HAI",
    feedUrl: "https://hai.stanford.edu/news/rss.xml",
    homepage: "https://hai.stanford.edu/news",
    defaultTopic: "artificial-intelligence",
    defaultSubtopics: ["ai-research", "ai-safety"],
    active: false,
    notes: "Stanford HAI sometimes throttles; enable cautiously.",
  },
  {
    slug: "mit-news-ai",
    name: "MIT News — AI",
    feedUrl: "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml",
    homepage: "https://news.mit.edu/topic/artificial-intelligence2",
    defaultTopic: "artificial-intelligence",
    defaultSubtopics: ["ai-research"],
  },
  {
    slug: "arxiv-cs-ai",
    name: "arXiv cs.AI",
    feedUrl: "https://export.arxiv.org/rss/cs.AI",
    homepage: "https://arxiv.org/list/cs.AI/recent",
    defaultTopic: "artificial-intelligence",
    defaultSubtopics: ["ai-research"],
    active: false,
    notes: "Volume is high and quality is research-paper level; disabled by default until LLM scorer is firm.",
  },

  /* ----------------------------- Startups ---------------------------- */
  {
    slug: "ycombinator-blog",
    name: "Y Combinator Blog",
    feedUrl: "https://www.ycombinator.com/blog/rss",
    homepage: "https://www.ycombinator.com/blog",
    defaultTopic: "startups",
    defaultSubtopics: ["founder-stories", "saas"],
  },
  {
    slug: "first-round-review",
    name: "First Round Review",
    feedUrl: "https://review.firstround.com/feed.xml",
    homepage: "https://review.firstround.com",
    defaultTopic: "startups",
    defaultSubtopics: ["founder-stories", "company-building"],
    active: false,
    notes: "Feed URL returns 404 (verified 2026-06-14); find current feed path before enabling.",
  },
  {
    slug: "a16z",
    name: "Andreessen Horowitz",
    feedUrl: "https://a16z.com/feed/",
    homepage: "https://a16z.com",
    defaultTopic: "startups",
    defaultSubtopics: ["venture-capital", "saas"],
    active: false,
    notes: "Feed URL returns 404 (verified 2026-06-14); a16z rotates feed paths — verify before enabling.",
  },
  {
    slug: "stripe-blog",
    name: "Stripe Blog",
    feedUrl: "https://stripe.com/blog/feed.rss",
    homepage: "https://stripe.com/blog",
    defaultTopic: "business",
    defaultSubtopics: ["operations", "company-building"],
  },
  {
    slug: "shopify-blog",
    name: "Shopify Blog",
    feedUrl: "https://www.shopify.com/blog.atom",
    homepage: "https://www.shopify.com/blog",
    defaultTopic: "business",
    defaultSubtopics: ["operations", "case-studies"],
    active: false,
    notes: "Shopify is heavy on product-promo posts; enable once scorer rejects them.",
  },

  /* --------------------------- Tech / SwE ---------------------------- */
  {
    slug: "github-blog",
    name: "The GitHub Blog",
    feedUrl: "https://github.blog/feed/",
    homepage: "https://github.blog",
    defaultTopic: "software-engineering",
    defaultSubtopics: ["engineering-culture", "developer-tools"],
  },
  {
    slug: "cloudflare-blog",
    name: "The Cloudflare Blog",
    feedUrl: "https://blog.cloudflare.com/rss/",
    homepage: "https://blog.cloudflare.com",
    defaultTopic: "technology",
    defaultSubtopics: ["infrastructure", "cybersecurity"],
  },
  {
    slug: "vercel-blog",
    name: "Vercel Blog",
    feedUrl: "https://vercel.com/atom",
    homepage: "https://vercel.com/blog",
    defaultTopic: "software-engineering",
    defaultSubtopics: ["frontend", "developer-tools"],
  },
  {
    slug: "aws-architecture",
    name: "AWS Architecture Blog",
    feedUrl: "https://aws.amazon.com/blogs/architecture/feed/",
    homepage: "https://aws.amazon.com/blogs/architecture/",
    defaultTopic: "software-engineering",
    defaultSubtopics: ["architecture", "cloud"],
  },
  {
    slug: "google-developers",
    name: "Google Developers Blog",
    feedUrl: "https://developers.googleblog.com/feeds/posts/default?alt=rss",
    homepage: "https://developers.googleblog.com",
    defaultTopic: "software-engineering",
    defaultSubtopics: ["developer-tools", "platforms"],
  },

  /* ----------------------------- Science ----------------------------- */
  {
    slug: "quanta-magazine",
    name: "Quanta Magazine",
    feedUrl: "https://www.quantamagazine.org/feed/",
    homepage: "https://www.quantamagazine.org",
    defaultTopic: "science",
    defaultSubtopics: ["physics", "mathematics", "biology"],
  },
  {
    slug: "mit-news",
    name: "MIT News",
    feedUrl: "https://news.mit.edu/rss/feed",
    homepage: "https://news.mit.edu",
    defaultTopic: "science",
    defaultSubtopics: ["research", "discoveries"],
  },
  {
    slug: "the-conversation-science",
    name: "The Conversation — Science",
    feedUrl: "https://theconversation.com/global/topics/science-12/articles.atom",
    homepage: "https://theconversation.com/global/science",
    defaultTopic: "science",
    defaultSubtopics: ["research"],
  },

  /* ----------------------------- Design ------------------------------ */
  {
    slug: "figma-blog",
    name: "Figma Blog",
    feedUrl: "https://www.figma.com/blog/rss/",
    homepage: "https://www.figma.com/blog/",
    defaultTopic: "design",
    defaultSubtopics: ["product-design", "design-systems"],
    active: false,
    notes: "Feed URL returns 404 (verified 2026-06-14); Figma has no stable public RSS — verify before enabling.",
  },
  {
    slug: "nielsen-norman",
    name: "Nielsen Norman Group",
    feedUrl: "https://www.nngroup.com/feed/rss/",
    homepage: "https://www.nngroup.com/articles/",
    defaultTopic: "design",
    defaultSubtopics: ["ux"],
  },
  {
    slug: "linear-blog",
    name: "Linear Blog",
    feedUrl: "https://linear.app/rss.xml",
    homepage: "https://linear.app/blog",
    defaultTopic: "design",
    defaultSubtopics: ["product-design"],
    active: false,
    notes: "Linear uses Atom under a different path historically; verify before enabling.",
  },

  /* ------------------------ Finance / Economics ---------------------- */
  {
    slug: "imf-blog",
    name: "IMF Blog",
    feedUrl: "https://www.imf.org/en/Blogs/RSS",
    homepage: "https://www.imf.org/en/Blogs",
    defaultTopic: "economics",
    defaultSubtopics: ["macroeconomics", "global-trade"],
    active: false,
    notes: "Endpoint does not return valid RSS/Atom (verified 2026-06-14); find the real feed URL before enabling.",
  },
  {
    slug: "world-bank-blog",
    name: "World Bank Blogs",
    feedUrl: "https://blogs.worldbank.org/en/all-blogs/rss",
    homepage: "https://blogs.worldbank.org",
    defaultTopic: "economics",
    defaultSubtopics: ["economic-policy", "inequality"],
    active: false,
    notes: "World Bank URL changes occasionally; smoke-test before enabling.",
  },

  /* ---------------------- Culture / Psychology ----------------------- */
  {
    slug: "the-conversation",
    name: "The Conversation",
    feedUrl: "https://theconversation.com/global/articles.atom",
    homepage: "https://theconversation.com/global",
    defaultTopic: "culture",
    defaultSubtopics: ["society"],
  },
  {
    slug: "behavioral-scientist",
    name: "Behavioral Scientist",
    feedUrl: "https://behavioralscientist.org/feed/",
    homepage: "https://behavioralscientist.org",
    defaultTopic: "psychology",
    defaultSubtopics: ["decision-making", "behavior", "cognitive-bias"],
    active: false,
    notes: "Feed returns HTTP 403 to bots (verified 2026-06-14); blocked at the edge — leave disabled.",
  },

  /* =================================================================== */
  /* Non-English sources                                                  */
  /*                                                                     */
  /* Curated for subscribers whose source-language preference is not     */
  /* English. The LLM still summarizes into each subscriber's chosen     */
  /* summary language, so these feed the "native source" experience.     */
  /* Aim for breadth (tech + science + culture) per language so most     */
  /* interests can be satisfied without falling back to English.         */
  /* =================================================================== */

  /* ----------------------------- Turkish ----------------------------- */
  {
    slug: "webrazzi",
    name: "Webrazzi",
    feedUrl: "https://webrazzi.com/feed/",
    homepage: "https://webrazzi.com",
    defaultTopic: "technology",
    defaultSubtopics: ["consumer-tech", "platforms"],
    language: "Turkish",
    notes: "TR tech/startup ecosystem. Verified 2026-06-16 (RSS, 20 items).",
  },
  {
    slug: "sarkac",
    name: "Sarkaç",
    feedUrl: "https://sarkac.org/feed/",
    homepage: "https://sarkac.org",
    defaultTopic: "science",
    defaultSubtopics: ["research", "discoveries"],
    language: "Turkish",
    notes: "TR science, written by academics. Verified 2026-06-16 (RSS, 50 items).",
  },
  {
    slug: "fikir-turu",
    name: "Fikir Turu",
    feedUrl: "https://fikirturu.com/feed/",
    homepage: "https://fikirturu.com",
    defaultTopic: "culture",
    defaultSubtopics: ["society"],
    language: "Turkish",
    notes: "TR ideas/society/economics essays. Verified 2026-06-16 (RSS, 10 items).",
  },

  /* ----------------------------- Spanish ----------------------------- */
  {
    slug: "xataka",
    name: "Xataka",
    feedUrl: "https://www.xataka.com/index.xml",
    homepage: "https://www.xataka.com",
    defaultTopic: "technology",
    defaultSubtopics: ["consumer-tech", "platforms"],
    language: "Spanish",
    notes: "ES technology. Verified 2026-06-16 (RSS, 26 items).",
  },
  {
    slug: "hipertextual",
    name: "Hipertextual",
    feedUrl: "https://hipertextual.com/feed",
    homepage: "https://hipertextual.com",
    defaultTopic: "technology",
    defaultSubtopics: ["consumer-tech"],
    language: "Spanish",
    notes: "ES tech/science/culture. Verified 2026-06-16 (RSS, 15 items).",
  },
  {
    slug: "elpais-ciencia",
    name: "El País — Ciencia",
    feedUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ciencia/portada",
    homepage: "https://elpais.com/ciencia/",
    defaultTopic: "science",
    defaultSubtopics: ["research", "discoveries"],
    language: "Spanish",
    notes: "ES science. Verified 2026-06-16 (RSS, 40 items).",
  },

  /* ----------------------------- French ------------------------------ */
  {
    slug: "numerama",
    name: "Numerama",
    feedUrl: "https://www.numerama.com/feed/",
    homepage: "https://www.numerama.com",
    defaultTopic: "technology",
    defaultSubtopics: ["consumer-tech", "platforms"],
    language: "French",
    notes: "FR technology. Verified 2026-06-16 (RSS, 40 items).",
  },
  {
    slug: "korben",
    name: "Korben",
    feedUrl: "https://korben.info/feed",
    homepage: "https://korben.info",
    defaultTopic: "software-engineering",
    defaultSubtopics: ["developer-tools", "open-source"],
    language: "French",
    notes: "FR dev/tools/tech. Verified 2026-06-16 (RSS, 20 items).",
  },
  {
    slug: "futura-sciences",
    name: "Futura Sciences",
    feedUrl: "https://www.futura-sciences.com/rss/actualites.xml",
    homepage: "https://www.futura-sciences.com",
    defaultTopic: "science",
    defaultSubtopics: ["research", "discoveries"],
    language: "French",
    notes: "FR science. Verified 2026-06-16 (RSS, 50 items).",
  },

  /* ----------------------------- German ------------------------------ */
  {
    slug: "heise",
    name: "heise online",
    feedUrl: "https://www.heise.de/rss/heise-atom.xml",
    homepage: "https://www.heise.de",
    defaultTopic: "technology",
    defaultSubtopics: ["consumer-tech", "cybersecurity"],
    language: "German",
    notes: "DE technology. Verified 2026-06-16 (Atom, 155 items).",
  },
  {
    slug: "t3n",
    name: "t3n",
    feedUrl: "https://t3n.de/rss.xml",
    homepage: "https://t3n.de",
    defaultTopic: "technology",
    defaultSubtopics: ["platforms", "developer-tools"],
    language: "German",
    notes: "DE digital business/tech. Verified 2026-06-16 (RSS, 20 items).",
  },
  {
    slug: "spektrum",
    name: "Spektrum der Wissenschaft",
    feedUrl: "https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406",
    homepage: "https://www.spektrum.de",
    defaultTopic: "science",
    defaultSubtopics: ["research", "physics", "biology"],
    language: "German",
    notes: "DE science. Verified 2026-06-16 (RSS, 20 items).",
  },
];

export const ACTIVE_SEED_SOURCES = SEED_SOURCES.filter(
  (s) => s.active !== false,
);
