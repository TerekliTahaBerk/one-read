/**
 * One Read — demo / sample article seed.
 *
 * Inserts a small set of SAFE, ORIGINAL demo articles so the editorial
 * pipeline (scoring → picks → summaries → email preview) can be tested
 * before real RSS/LLM providers are wired up.
 *
 * These are NOT scraped or copyrighted. Every body below is original text
 * written specifically for testing. Each is marked `sourceName:
 * "One Read Demo"` so demo content is always distinguishable from real
 * ingested articles, and uses a demo.oneread.app URL so nothing tries to
 * fetch a live page.
 *
 * Idempotent: upserts by url. Articles are inserted as PENDING so the
 * normal scorer runs over them — run `npm run score` afterwards (the
 * scorer trusts the supplied body and skips the network fetch).
 *
 * Usage:  npm run seed:demo-articles
 */

import { prisma } from "../lib/prisma";
import { canonicalizeUrl } from "../lib/url-canonical";

export const DEMO_SOURCE_NAME = "One Read Demo";

interface DemoArticle {
  slug: string;
  title: string;
  topic: string;
  subtopics: string[];
  sourceLanguage: "English" | "Turkish";
  excerpt: string;
  body: string;
}

const DEMO: DemoArticle[] = [
  {
    slug: "ai-context-windows",
    title: "Why Bigger Context Windows Don't Make Models Smarter",
    topic: "artificial-intelligence",
    subtopics: ["llms", "ai-research"],
    sourceLanguage: "English",
    excerpt:
      "A longer context window lets a model read more, but reading more is not the same as understanding more.",
    body: "A longer context window lets a model read more at once, but reading more is not the same as understanding more. As the window grows, useful signal often gets buried under repetition and boilerplate, and the model spends attention on tokens that do not matter. Teams that simply paste in everything they have tend to see accuracy plateau or even drop. The more durable gains come from curation: selecting the few passages that actually answer the question, ordering them so the most relevant material sits where the model attends most reliably, and trimming the noise. In practice, a tight three-thousand-token prompt with the right evidence beats a sprawling hundred-thousand-token dump. The lesson is old and familiar to any editor. Capacity is not comprehension. What you leave out shapes the answer as much as what you put in.",
  },
  {
    slug: "ai-evals-culture",
    title: "Treat Evaluations Like Tests, Not Like Trophies",
    topic: "artificial-intelligence",
    subtopics: ["ai-research", "machine-learning"],
    sourceLanguage: "English",
    excerpt:
      "Benchmarks are easy to celebrate and easy to game. A good eval is one you are a little afraid to run.",
    body: "Benchmarks are easy to celebrate and easy to game. A leaderboard number feels like progress, but it often measures how well a system fits a frozen dataset rather than how well it serves real users. The healthier habit is to treat evaluations the way good engineers treat tests: small, frequent, and honest. Write evals that capture the failures you actually saw last week, not the ones that flatter your model. Keep a private holdout so you cannot quietly overfit. Re-run them on every change, and watch for regressions in the unglamorous cases. A good eval is one you are slightly afraid to run, because it might tell you something you would rather not hear. That fear is the point. The teams that improve fastest are the ones who let their tests embarrass them in private before users do it in public.",
  },
  {
    slug: "startups-first-ten-customers",
    title: "Your First Ten Customers Are a Research Project",
    topic: "startups",
    subtopics: ["founder-stories", "product-market-fit"],
    sourceLanguage: "English",
    excerpt:
      "Early customers are not revenue. They are the cheapest market research you will ever buy.",
    body: "Early customers are not really revenue; they are the cheapest market research you will ever buy. The temptation is to treat the first ten sales as proof you are right, then rush to scale. The founders who last do the opposite. They sit with each early user, watch where the product confuses them, and write down the exact words people use to describe their problem. Those words become the landing page. The friction they observe becomes the roadmap. At this stage, a refund and an honest conversation is worth more than a reluctant renewal, because a customer who quietly churns teaches you nothing. Counterintuitively, you want a small number of users who would be genuinely upset if your product disappeared, rather than a large number who would shrug. Intensity beats breadth early. Breadth comes later, once you understand why the intense ones care.",
  },
  {
    slug: "startups-pricing-courage",
    title: "Pricing Is a Conversation About Value, Not Cost",
    topic: "startups",
    subtopics: ["pricing", "saas"],
    sourceLanguage: "English",
    excerpt:
      "Most early teams price from fear. They anchor on their costs instead of the customer's outcome.",
    body: "Most early teams price from fear. They anchor on their own costs, add a modest margin, and hope nobody notices the bill. But customers do not buy your costs; they buy an outcome. If your tool saves a team two days a month, the price should reference those two days, not your server bill. Underpricing is not humility, it is a quiet signal that even you are unsure the product is worth it, and it attracts the customers least likely to stick. Raising prices is uncomfortable, so practice it early while the stakes are small. Talk to customers about the value they got before you talk about the number. The goal is a price that a happy customer pays without resentment and an unhappy one declines without drama. That clarity protects both sides and tells you, fast, whether you have built something people truly value.",
  },
  {
    slug: "tech-default-settings",
    title: "Default Settings Are the Most Powerful Feature You Ship",
    topic: "technology",
    subtopics: ["consumer-tech", "platforms"],
    sourceLanguage: "English",
    excerpt:
      "Almost nobody changes the defaults. Whatever you ship as the default is, for most people, the product.",
    body: "Almost nobody changes the defaults. Study after study finds that the overwhelming majority of people keep whatever a product ships with, whether that is a privacy setting, a notification cadence, or a home screen layout. This makes the default the single most consequential design decision you will make, and also the easiest to treat carelessly. A default is a quiet recommendation from the maker to the user, and users read it that way even when you did not mean it. Ship aggressive notifications by default and you have decided, on behalf of millions, that their attention is yours to take. Ship a privacy-protective default and you have decided the opposite. Power that invisible should come with humility. Before arguing about which advanced options to add, ask the harder question: what should happen for the person who never opens settings at all? That answer is, for most people, the entire product.",
  },
  {
    slug: "swe-boring-technology",
    title: "In Praise of Boring Technology",
    topic: "software-engineering",
    subtopics: ["architecture", "engineering-culture"],
    sourceLanguage: "English",
    excerpt:
      "Every team gets a small budget of novelty. Spend it on the problem that makes you different, not the database.",
    body: "Every engineering team has a small, unspoken budget of novelty, and spending it wisely is most of the job. New tools are exciting, but each one carries a hidden tax: unknown failure modes, thin documentation, and a community too small to have hit the bug you will hit at 2 a.m. Boring, proven technology has already paid that tax. The databases, queues, and languages that have survived a decade are boring precisely because their sharp edges are well mapped. The discipline is to spend your novelty budget on the one or two places where being different is the whole point of your product, and to be relentlessly conventional everywhere else. A system assembled from mostly boring parts is easier to hire for, easier to operate, and far easier to reason about when something breaks. Novelty should be a deliberate investment, never a default reflex.",
  },
  {
    slug: "design-empty-states",
    title: "The Empty State Is Where Trust Begins",
    topic: "design",
    subtopics: ["product-design", "ux"],
    sourceLanguage: "English",
    excerpt:
      "A new user's first screen is almost always empty. Most products waste it; the best ones use it to teach.",
    body: "A new user's very first screen is almost always empty: no data, no history, nothing to act on. Most products waste this moment with a shrug, a blank canvas, or a cheerful illustration that says nothing useful. The best products treat the empty state as the most important screen they have, because it is the one every single user sees and the one that sets expectations. A good empty state answers three quiet questions at once: what is this for, what should I do first, and what will it look like once it is working. It shows a realistic example rather than a hollow placeholder, and it offers one obvious next action instead of ten. Done well, the empty state is not a gap to apologize for; it is the first lesson the product teaches, and the first small promise it keeps. Trust compounds from that first kept promise.",
  },
  {
    slug: "psychology-fresh-start",
    title: "The Fresh Start Effect, and How to Borrow It",
    topic: "psychology",
    subtopics: ["habits", "motivation"],
    sourceLanguage: "English",
    excerpt:
      "We are more motivated to change at moments that feel like new beginnings. You can manufacture those moments.",
    body: "People are reliably more motivated to pursue change at moments that feel like fresh beginnings: the new year, a birthday, the first of the month, even a Monday. Researchers call this the fresh start effect, and the mechanism is partly accounting. A temporal landmark draws a line between the old self who failed and a new self who has not yet, which makes the goal feel newly possible. The practical insight is that you do not have to wait for the calendar to hand you a landmark. You can manufacture one. Moving desks, changing a commute, finishing a big project, or simply naming a date as the start of something can all create the same psychological clean slate. The caution is that the effect is a spark, not an engine. It opens a window of motivation, but only a concrete plan and an easy first step turn that window into a habit that survives the second week.",
  },
  {
    slug: "finance-boring-portfolio",
    title: "A Boring Portfolio Is a Feature",
    topic: "finance",
    subtopics: ["investing", "personal-finance"],
    sourceLanguage: "English",
    excerpt:
      "Most investing advice is really behavior advice in disguise. The hard part is doing very little.",
    body: "Most investing advice is really behavior advice wearing a costume. The mechanics of a sensible long-term portfolio fit on an index card: spread money across broad, low-cost funds, add to them on a schedule, and leave them alone. The difficulty was never the math; it is the discipline of doing very little while the news insists you do something. Every crash feels like the one that will not recover, and every boom feels like a train leaving without you. Both feelings push toward action, and action is where ordinary investors quietly lose to their own funds by buying high and selling low. A boring portfolio is not a sign of low ambition; it is a structure designed to protect you from your own worst moments. The goal is to make the right behavior the easy, automatic, default behavior, so that good outcomes require no heroics and no forecasting you cannot actually do.",
  },
  {
    slug: "science-replication",
    title: "Why a Single Study Almost Never Settles Anything",
    topic: "science",
    subtopics: ["research", "discoveries"],
    sourceLanguage: "English",
    excerpt:
      "A headline reports one study. Knowledge is what survives after many studies disagree and converge.",
    body: "A headline reports one study; scientific knowledge is what survives after many studies argue with each other and slowly converge. Any single experiment is a noisy measurement shaped by its particular sample, methods, and luck. Sometimes a striking first result is real; often it is an outlier that looks dramatic precisely because it is extreme. This is why replication, the unglamorous work of running a study again, matters more than novelty, and why fields have grown wary of findings that never get repeated. For a reader, the practical filter is simple. Treat a lone, surprising result as a hypothesis rather than a fact, ask whether anyone has reproduced it, and notice whether the effect holds up when the sample grows. Real understanding rarely arrives in a single press release. It accumulates quietly, through patient repetition, until the weight of evidence tips and the picture finally holds still.",
  },
  {
    slug: "productivity-shutdown-ritual",
    title: "The Case for a Shutdown Ritual",
    topic: "productivity",
    subtopics: ["focus", "personal-systems"],
    sourceLanguage: "English",
    excerpt:
      "Knowledge work has no factory whistle. Without a clear end to the day, the day never really ends.",
    body: "Factory work had a whistle; knowledge work has nothing. Without a clear signal that the day is over, the day never really ends, and unfinished tasks keep tugging at attention through dinner and into sleep. A shutdown ritual is a small, deliberate ceremony that gives the mind permission to stop. It can be as simple as reviewing tomorrow's calendar, capturing every loose thread into a single trusted list, and saying a fixed phrase that marks the close. The capture is the active ingredient. Open loops occupy the mind not because they are urgent but because part of us fears we will forget them, and writing them somewhere reliable quiets that fear. The ritual works precisely because it is boring and repeatable; the brain learns the pattern and lets go a little faster each time. Rest is not the absence of work. It is a skill, and like any skill it benefits from a cue.",
  },
  {
    slug: "culture-slow-media",
    title: "The Quiet Return of Slow Media",
    topic: "culture",
    subtopics: ["media", "trends"],
    sourceLanguage: "English",
    excerpt:
      "After a decade of infinite feeds, more people are choosing fewer, slower, finite things to read.",
    body: "After a decade of infinite scroll, a quiet counter-movement is taking shape. More people are deliberately choosing fewer, slower, finite things to read: a single newsletter instead of a feed, a printed magazine instead of a timeline, one long article in the morning instead of a hundred fragments through the day. The appeal is not nostalgia so much as relief. Infinite media is engineered to never let you finish, and never finishing is its own low-grade stress. A finite thing, by contrast, offers the rare modern pleasure of completion: you read it, you are done, you carry one idea into your day instead of a blur. This is not a rejection of the internet but a maturing of how we use it. The new luxury is not access to everything; almost everyone has that. The new luxury is a small, well-chosen amount, and the calm that comes from knowing where the edges are.",
  },
];

/**
 * Upsert all demo articles (idempotent). Returns counts. Exported so the
 * demo-preview orchestrator can reuse it without a fragile side-effect
 * import. Does NOT disconnect Prisma — the caller owns the lifecycle.
 */
export async function seedDemoArticles(): Promise<{
  created: number;
  updated: number;
  total: number;
}> {
  let created = 0;
  let updated = 0;

  for (const a of DEMO) {
    const url = `https://demo.oneread.app/${a.slug}`;
    const canonicalUrl = canonicalizeUrl(url) ?? url;
    const existing = await prisma.article.findUnique({ where: { url } });

    await prisma.article.upsert({
      where: { url },
      update: {
        // Refresh content but reset to PENDING so re-seeding re-scores it.
        title: a.title,
        canonicalUrl,
        sourceName: DEMO_SOURCE_NAME,
        sourceLanguage: a.sourceLanguage,
        topic: a.topic,
        subtopics: a.subtopics,
        rawExcerpt: a.excerpt,
        cleanedText: a.body,
        scoringStatus: "PENDING",
        rejectionReason: null,
      },
      create: {
        url,
        canonicalUrl,
        title: a.title,
        sourceName: DEMO_SOURCE_NAME,
        sourceLanguage: a.sourceLanguage,
        topic: a.topic,
        subtopics: a.subtopics,
        tags: ["demo"],
        rawExcerpt: a.excerpt,
        cleanedText: a.body,
        publishedAt: new Date(),
        scoringStatus: "PENDING",
      },
    });

    if (existing) updated++;
    else created++;
  }

  const total = await prisma.article.count({
    where: { sourceName: DEMO_SOURCE_NAME },
  });
  return { created, updated, total };
}

/** CLI entrypoint — only runs when invoked directly, not when imported. */
async function main() {
  const { created, updated, total } = await seedDemoArticles();
  console.log(
    `[seed:demo-articles] created=${created} updated=${updated} demoTotal=${total}`,
  );
  console.log(
    "[seed:demo-articles] Next: `npm run score` to score them, then `npm run summarize` / open /admin.",
  );
}

// Run main() only when this file is the entrypoint (not when imported).
const isEntrypoint =
  typeof process.argv[1] === "string" &&
  process.argv[1].endsWith("seed-demo-articles.ts");

if (isEntrypoint) {
  main()
    .catch((err) => {
      console.error("[seed:demo-articles] failed:", err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
