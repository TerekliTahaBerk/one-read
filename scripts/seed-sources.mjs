// One Read — seed the Source table from lib/sources.ts.
//
// Usage:  npm run db:seed-sources
//
// Idempotent: upserts on slug. Safe to re-run after editing the catalog.

import { PrismaClient } from "@prisma/client";
// `tsconfig` paths don't apply to Node ESM scripts, so import the
// compiled JS at runtime via tsx is overkill; instead we recompile
// the source list here in lockstep. To avoid duplication, we read it
// dynamically through Prisma after seeding.

const prisma = new PrismaClient();

const SEED = [
  { slug: "openai-blog", name: "OpenAI Blog", feedUrl: "https://openai.com/blog/rss.xml", homepage: "https://openai.com/blog", defaultTopic: "artificial-intelligence", defaultSubtopics: ["llms","ai-products"], language: "English", active: true },
  { slug: "anthropic-news", name: "Anthropic News", feedUrl: "https://www.anthropic.com/news/rss.xml", homepage: "https://www.anthropic.com/news", defaultTopic: "artificial-intelligence", defaultSubtopics: ["llms","ai-safety"], language: "English", active: false, notes: "Feed URL changes frequently; verify before enabling." },
  { slug: "google-deepmind", name: "Google DeepMind", feedUrl: "https://deepmind.google/blog/rss.xml", homepage: "https://deepmind.google/discover/blog/", defaultTopic: "artificial-intelligence", defaultSubtopics: ["ai-research","machine-learning"], language: "English", active: false, notes: "DeepMind frequently rotates feed URLs; smoke-test on enable." },
  { slug: "huggingface-blog", name: "Hugging Face Blog", feedUrl: "https://huggingface.co/blog/feed.xml", homepage: "https://huggingface.co/blog", defaultTopic: "artificial-intelligence", defaultSubtopics: ["machine-learning","ai-research"], language: "English", active: true },
  { slug: "stanford-hai", name: "Stanford HAI", feedUrl: "https://hai.stanford.edu/news/rss.xml", homepage: "https://hai.stanford.edu/news", defaultTopic: "artificial-intelligence", defaultSubtopics: ["ai-research","ai-safety"], language: "English", active: false, notes: "Stanford HAI sometimes throttles; enable cautiously." },
  { slug: "mit-news-ai", name: "MIT News — AI", feedUrl: "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml", homepage: "https://news.mit.edu/topic/artificial-intelligence2", defaultTopic: "artificial-intelligence", defaultSubtopics: ["ai-research"], language: "English", active: true },
  { slug: "arxiv-cs-ai", name: "arXiv cs.AI", feedUrl: "https://export.arxiv.org/rss/cs.AI", homepage: "https://arxiv.org/list/cs.AI/recent", defaultTopic: "artificial-intelligence", defaultSubtopics: ["ai-research"], language: "English", active: false, notes: "Volume is high and quality is research-paper level; disabled by default until LLM scorer is firm." },

  { slug: "ycombinator-blog", name: "Y Combinator Blog", feedUrl: "https://www.ycombinator.com/blog/rss", homepage: "https://www.ycombinator.com/blog", defaultTopic: "startups", defaultSubtopics: ["founder-stories","saas"], language: "English", active: true },
  { slug: "first-round-review", name: "First Round Review", feedUrl: "https://review.firstround.com/feed.xml", homepage: "https://review.firstround.com", defaultTopic: "startups", defaultSubtopics: ["founder-stories","company-building"], language: "English", active: false, notes: "Feed URL returns 404 (verified 2026-06-14); find current feed path before enabling." },
  { slug: "a16z", name: "Andreessen Horowitz", feedUrl: "https://a16z.com/feed/", homepage: "https://a16z.com", defaultTopic: "startups", defaultSubtopics: ["venture-capital","saas"], language: "English", active: false, notes: "Feed URL returns 404 (verified 2026-06-14); a16z rotates feed paths — verify before enabling." },
  { slug: "stripe-blog", name: "Stripe Blog", feedUrl: "https://stripe.com/blog/feed.rss", homepage: "https://stripe.com/blog", defaultTopic: "business", defaultSubtopics: ["operations","company-building"], language: "English", active: true },
  { slug: "shopify-blog", name: "Shopify Blog", feedUrl: "https://www.shopify.com/blog.atom", homepage: "https://www.shopify.com/blog", defaultTopic: "business", defaultSubtopics: ["operations","case-studies"], language: "English", active: false, notes: "Shopify is heavy on product-promo posts; enable once scorer rejects them." },

  { slug: "github-blog", name: "The GitHub Blog", feedUrl: "https://github.blog/feed/", homepage: "https://github.blog", defaultTopic: "software-engineering", defaultSubtopics: ["engineering-culture","developer-tools"], language: "English", active: true },
  { slug: "cloudflare-blog", name: "The Cloudflare Blog", feedUrl: "https://blog.cloudflare.com/rss/", homepage: "https://blog.cloudflare.com", defaultTopic: "technology", defaultSubtopics: ["infrastructure","cybersecurity"], language: "English", active: true },
  { slug: "vercel-blog", name: "Vercel Blog", feedUrl: "https://vercel.com/atom", homepage: "https://vercel.com/blog", defaultTopic: "software-engineering", defaultSubtopics: ["frontend","developer-tools"], language: "English", active: true },
  { slug: "aws-architecture", name: "AWS Architecture Blog", feedUrl: "https://aws.amazon.com/blogs/architecture/feed/", homepage: "https://aws.amazon.com/blogs/architecture/", defaultTopic: "software-engineering", defaultSubtopics: ["architecture","cloud"], language: "English", active: true },
  { slug: "google-developers", name: "Google Developers Blog", feedUrl: "https://developers.googleblog.com/feeds/posts/default?alt=rss", homepage: "https://developers.googleblog.com", defaultTopic: "software-engineering", defaultSubtopics: ["developer-tools","platforms"], language: "English", active: true },

  { slug: "quanta-magazine", name: "Quanta Magazine", feedUrl: "https://www.quantamagazine.org/feed/", homepage: "https://www.quantamagazine.org", defaultTopic: "science", defaultSubtopics: ["physics","mathematics","biology"], language: "English", active: true },
  { slug: "mit-news", name: "MIT News", feedUrl: "https://news.mit.edu/rss/feed", homepage: "https://news.mit.edu", defaultTopic: "science", defaultSubtopics: ["research","discoveries"], language: "English", active: true },
  { slug: "the-conversation-science", name: "The Conversation — Science", feedUrl: "https://theconversation.com/global/topics/science-12/articles.atom", homepage: "https://theconversation.com/global/science", defaultTopic: "science", defaultSubtopics: ["research"], language: "English", active: true },

  { slug: "figma-blog", name: "Figma Blog", feedUrl: "https://www.figma.com/blog/rss/", homepage: "https://www.figma.com/blog/", defaultTopic: "design", defaultSubtopics: ["product-design","design-systems"], language: "English", active: false, notes: "Feed URL returns 404 (verified 2026-06-14); Figma has no stable public RSS — verify before enabling." },
  { slug: "nielsen-norman", name: "Nielsen Norman Group", feedUrl: "https://www.nngroup.com/feed/rss/", homepage: "https://www.nngroup.com/articles/", defaultTopic: "design", defaultSubtopics: ["ux"], language: "English", active: true },
  { slug: "linear-blog", name: "Linear Blog", feedUrl: "https://linear.app/rss.xml", homepage: "https://linear.app/blog", defaultTopic: "design", defaultSubtopics: ["product-design"], language: "English", active: false, notes: "Linear uses Atom under a different path historically; verify before enabling." },

  { slug: "imf-blog", name: "IMF Blog", feedUrl: "https://www.imf.org/en/Blogs/RSS", homepage: "https://www.imf.org/en/Blogs", defaultTopic: "economics", defaultSubtopics: ["macroeconomics","global-trade"], language: "English", active: false, notes: "Endpoint does not return valid RSS/Atom (verified 2026-06-14); find the real feed URL before enabling." },
  { slug: "world-bank-blog", name: "World Bank Blogs", feedUrl: "https://blogs.worldbank.org/en/all-blogs/rss", homepage: "https://blogs.worldbank.org", defaultTopic: "economics", defaultSubtopics: ["economic-policy","inequality"], language: "English", active: false, notes: "World Bank URL changes occasionally; smoke-test before enabling." },

  { slug: "the-conversation", name: "The Conversation", feedUrl: "https://theconversation.com/global/articles.atom", homepage: "https://theconversation.com/global", defaultTopic: "culture", defaultSubtopics: ["society"], language: "English", active: true },
  { slug: "behavioral-scientist", name: "Behavioral Scientist", feedUrl: "https://behavioralscientist.org/feed/", homepage: "https://behavioralscientist.org", defaultTopic: "psychology", defaultSubtopics: ["decision-making","behavior","cognitive-bias"], language: "English", active: false, notes: "Feed returns HTTP 403 to bots (verified 2026-06-14); blocked at the edge — leave disabled." },
];

async function main() {
  let created = 0;
  let updated = 0;
  for (const s of SEED) {
    const existed = await prisma.source.findUnique({ where: { slug: s.slug } });
    await prisma.source.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        feedUrl: s.feedUrl,
        homepage: s.homepage ?? null,
        defaultTopic: s.defaultTopic,
        defaultSubtopics: s.defaultSubtopics ?? [],
        language: s.language ?? "English",
        active: s.active ?? true,
        notes: s.notes ?? null,
      },
      create: {
        slug: s.slug,
        name: s.name,
        feedUrl: s.feedUrl,
        homepage: s.homepage ?? null,
        defaultTopic: s.defaultTopic,
        defaultSubtopics: s.defaultSubtopics ?? [],
        language: s.language ?? "English",
        active: s.active ?? true,
        notes: s.notes ?? null,
      },
    });
    if (existed) updated++; else created++;
  }
  const total = await prisma.source.count();
  const active = await prisma.source.count({ where: { active: true } });
  console.log(
    `[seed-sources] created=${created} updated=${updated} total=${total} active=${active}`,
  );
}

main()
  .catch((err) => {
    console.error("[seed-sources] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
