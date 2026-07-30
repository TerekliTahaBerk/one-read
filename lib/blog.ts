export type BlogSection = {
  heading: string;
  paragraphs: string[];
};

export type BlogPost = {
  /** Stable, human-readable URL slug. */
  slug: string;
  title: string;
  seoTitle: string;
  date: string;
  updatedDate: string;
  readingMinutes: number;
  excerpt: string;
  category: "Reading habits" | "Editorial practice" | "Calm technology" | "Film";
  keywords: string[];
  introduction: string[];
  sections: BlogSection[];
  takeaways: string[];
  relatedSlugs: string[];
  productLink: {
    href:
      | "/article"
      | "/film"
      | "/subscribe"
      | "/editorial"
      | "/samples/article";
    label: string;
    description: string;
  };
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-one-email-is-enough",
    title: "Why one useful email can be enough",
    seoTitle: "Why One Useful Email Is Enough for a Daily Reading Habit",
    date: "2026-05-12",
    updatedDate: "2026-07-30",
    readingMinutes: 4,
    excerpt:
      "A practical case for replacing an endless reading queue with one carefully chosen article each day — and building a habit that lasts.",
    category: "Reading habits",
    keywords: [
      "daily reading habit",
      "curated newsletter",
      "information overload",
      "intentional reading",
      "email newsletter",
    ],
    introduction: [
      "Most reading products begin with abundance: more sources, more feeds, and more unread items waiting for attention. A useful daily reading habit can begin from the opposite direction — one worthwhile piece, delivered at a predictable time, with a clear ending.",
      "The number one is not a productivity trick. It is an editorial constraint. When there is only one recommendation, the selection has to justify the few minutes it asks from you.",
    ],
    sections: [
      {
        heading: "A finite reading experience changes the decision",
        paragraphs: [
          "An endless feed makes you decide what to open, how long to continue, and when to stop. Those small decisions accumulate before the reading itself begins. A single-item format removes most of that negotiation: open the note, decide whether it matters, and finish.",
          "A defined endpoint also makes skipping harmless. If today’s subject is not for you, there is no backlog to clear. Tomorrow starts fresh. That makes consistency more realistic than a system built around catching up.",
        ],
      },
      {
        heading: "Curation is more than summarization",
        paragraphs: [
          "A summary can make any article shorter. Curation asks a different question first: is this article worth your time at all? Good curation considers the reliability of the source, the substance of the central idea, how recently the subject has been covered, and whether the piece matches the reader’s interests.",
          "Only after that selection should compression begin. The result should preserve the argument, useful context, and a direct route to the original source. The goal is informed choice, not replacing the source.",
        ],
      },
      {
        heading: "Why email is a useful boundary",
        paragraphs: [
          "Email is not automatically calm, but it can be finite. A newsletter arrives as a complete object rather than an interface designed to refill. It can be read later, archived, or ignored without opening another stream of recommendations.",
          "The format works best when the sender respects that boundary: a predictable cadence, a recognizable subject line, no manufactured urgency, and an unsubscribe path that is easy to find.",
        ],
      },
      {
        heading: "A simple way to test the habit",
        paragraphs: [
          "Choose one consistent moment for reading — a commute, the first coffee, or the quiet ten minutes before work. Keep the session short enough that it does not compete with the rest of the day. When something deserves deeper attention, save the original article intentionally rather than turning every link into a future obligation.",
          "After two weeks, judge the habit by recall rather than volume. If you can name a few ideas that stayed with you, the system is doing more useful work than a long list of items you barely remember opening.",
        ],
      },
    ],
    takeaways: [
      "A clear endpoint reduces the decisions that happen before reading.",
      "Selection quality matters more than the number of links delivered.",
      "A sustainable reading habit should make skipping safe and starting again easy.",
    ],
    relatedSlugs: ["the-case-against-the-feed", "how-we-choose-each-morning"],
    productLink: {
      href: "/article",
      label: "Meet OneArticle",
      description: "One carefully selected article brief on weekdays.",
    },
  },
  {
    slug: "the-case-against-the-feed",
    title: "The case against the endless feed",
    seoTitle: "Curated Newsletter vs. Endless Feed: A Calmer Way to Read",
    date: "2026-05-28",
    updatedDate: "2026-07-30",
    readingMinutes: 4,
    excerpt:
      "Feeds optimize for continuation. A curated newsletter can optimize for completion, useful context, lasting recall, and reader control.",
    category: "Calm technology",
    keywords: [
      "curated newsletter vs feed",
      "endless scrolling",
      "digital wellbeing",
      "information diet",
      "calm technology",
    ],
    introduction: [
      "A feed has no natural stopping point. New items appear faster than any reader can evaluate them, so the decision to stop is left to the person using a system designed for continuation.",
      "That design is useful when discovery is the goal. It is less useful when the goal is to understand one subject, remember what you read, and return to the rest of your day.",
    ],
    sections: [
      {
        heading: "Feeds optimize a different outcome",
        paragraphs: [
          "Ranking systems are effective at finding the next item likely to hold attention. That does not mean the next item is the most important, most reliable, or most useful one. Relevance to a moment and value over time are different measures.",
          "Because every interaction teaches the system what might keep you moving, novelty and emotional intensity can receive more weight than quiet significance. The reader gets variety, but not necessarily a coherent understanding.",
        ],
      },
      {
        heading: "Completion creates room for reflection",
        paragraphs: [
          "A finite edition gives reading a visible edge. Reaching that edge creates a small pause in which the idea can settle before another one competes with it. That pause is part of comprehension, even if it never appears in an engagement metric.",
          "Completion also makes attention easier to budget. You know what the format will ask before you open it. Trust grows when that expectation is kept consistently.",
        ],
      },
      {
        heading: "Discovery does not need to disappear",
        paragraphs: [
          "The alternative to a feed is not a closed world. A strong curator still looks broadly across publications, topics, and perspectives. The difference is that exploration happens before delivery instead of being outsourced to the reader.",
          "A useful edition should keep the original source visible and invite deeper reading. It narrows the doorway without pretending that one note contains the entire room.",
        ],
      },
      {
        heading: "Build an information diet with distinct jobs",
        paragraphs: [
          "Use fast feeds deliberately for live events or open-ended discovery. Use finite newsletters for recurring subjects where selection and context matter. Use saved reading for the few pieces that deserve uninterrupted time.",
          "When every tool has a job, no single stream has to carry the entire burden of staying informed. The result is not less curiosity; it is less accidental consumption.",
        ],
      },
    ],
    takeaways: [
      "Engagement ranking and durable usefulness are not the same objective.",
      "Finite editions make time expectations clear and completion possible.",
      "Feeds can remain discovery tools without becoming the default shape of reading.",
    ],
    relatedSlugs: ["why-one-email-is-enough", "notes-on-a-quieter-inbox"],
    productLink: {
      href: "/subscribe",
      label: "Start OneRead",
      description: "Choose the notes you want and keep the experience finite.",
    },
  },
  {
    slug: "how-we-choose-each-morning",
    title: "How OneRead chooses an article",
    seoTitle: "How OneRead Curates a Daily Article",
    date: "2026-06-14",
    updatedDate: "2026-07-30",
    readingMinutes: 4,
    excerpt:
      "Inside the editorial process: interest matching, source quality, novelty, human review, and transparent linking.",
    category: "Editorial practice",
    keywords: [
      "article curation process",
      "editorial curation",
      "curated news newsletter",
      "source evaluation",
      "AI assisted curation",
    ],
    introduction: [
      "A daily brief is only as useful as the decision made before it is written: which article deserves today’s limited attention? OneRead combines software-assisted discovery with explicit editorial standards and a final human-controlled publishing workflow.",
      "The purpose of the process is not to predict what will generate the most clicks. It is to find a credible, substantial piece that fits a reader’s interests and adds something meaningfully different from recent editions.",
    ],
    sections: [
      {
        heading: "1. Begin with the reader’s chosen interests",
        paragraphs: [
          "The process starts with the topics a reader selected. These preferences narrow the candidate pool without turning it into an echo chamber: a finance reader may receive economics, company analysis, or policy when the connection is genuinely useful.",
          "Preferences guide relevance; they do not override source quality. A weak article does not become a strong recommendation simply because its subject matches.",
        ],
      },
      {
        heading: "2. Evaluate the source and the article separately",
        paragraphs: [
          "A publication’s reputation is a useful signal, not a substitute for reading the piece. Candidates are evaluated for identifiable sourcing, clarity about what is known and uncertain, and whether the headline is supported by the article itself.",
          "Primary reporting and original analysis are preferred when available. Commentary can be valuable, but it should be presented as argument rather than fact.",
        ],
      },
      {
        heading: "3. Look for substance, novelty, and fit",
        paragraphs: [
          "The strongest candidate usually contains an idea that can be explained clearly without stripping away essential context. Repetition matters too: even a good article may be a poor choice if recent editions covered the same claim from the same angle.",
          "Timeliness is considered in relation to the subject. A breaking development may require freshness; a thoughtful essay can remain useful long after publication.",
        ],
      },
      {
        heading: "4. Use AI as an editorial instrument",
        paragraphs: [
          "Software can help compare candidates, detect duplication, structure a draft, and check whether required elements are present. It does not change the standard applied to the final edition.",
          "Before publishing, the edition can be reviewed for factual framing, tone, source attribution, and the accuracy of the link. Uncertain claims should remain qualified. The original article stays central and accessible.",
        ],
      },
      {
        heading: "5. Learn without chasing engagement",
        paragraphs: [
          "Reader preferences and direct feedback can improve relevance. They should not turn the product into a feed that rewards only what is immediately clickable. A calm editorial product needs room for useful surprise.",
          "The long-term measure is trust: the reader should understand why an article may have been selected and feel confident that opening it will not begin an endless session.",
        ],
      },
    ],
    takeaways: [
      "Reader interests shape relevance but never excuse weak sourcing.",
      "AI assists discovery and structure; publishing remains governed by editorial checks.",
      "Original sources, qualifications, and transparent links stay visible.",
    ],
    relatedSlugs: ["why-one-email-is-enough", "what-makes-a-newsletter-worth-opening"],
    productLink: {
      href: "/editorial",
      label: "Read our editorial standards",
      description: "See the principles applied across OneArticle and OneFilm.",
    },
  },
  {
    slug: "notes-on-a-quieter-inbox",
    title: "A practical guide to a quieter inbox",
    seoTitle: "How to Reduce Email Overload Without Missing What Matters",
    date: "2026-06-30",
    updatedDate: "2026-07-30",
    readingMinutes: 3,
    excerpt:
      "A small, repeatable system for reducing email overload while keeping the messages that genuinely help — without turning inbox zero into another job.",
    category: "Reading habits",
    keywords: [
      "reduce email overload",
      "calm inbox",
      "email management",
      "newsletter cleanup",
      "digital minimalism",
    ],
    introduction: [
      "A quieter inbox is not an empty inbox. It is an inbox in which the purpose of each recurring message is clear, the volume matches the time available, and unread counts do not become a measure of personal failure.",
      "The most useful changes are usually small enough to maintain. The aim is to reduce repeated decisions, not create another complicated system to manage.",
    ],
    sections: [
      {
        heading: "Give every recurring message a job",
        paragraphs: [
          "A newsletter can inform, teach, entertain, or prompt an action. If you cannot name the job it performs, it is probably surviving through habit rather than usefulness.",
          "Review recurring senders by asking what changed because you received them. Keep the few that consistently earn attention. Unsubscribe from the rest directly instead of building elaborate filters that preserve unwanted mail out of sight.",
        ],
      },
      {
        heading: "Separate reading from responding",
        paragraphs: [
          "Messages that require a reply create a different kind of attention from things you want to read. Treating them as one queue makes leisure reading feel like work and important replies feel buried.",
          "Use a short response window for actionable mail and a separate, optional moment for reading. The boundary can be as simple as two folders or two times of day.",
        ],
      },
      {
        heading: "Choose a cadence you can actually keep",
        paragraphs: [
          "A daily newsletter is only calm if its promise is small. Longer analysis may fit better weekly. Match the frequency of a subscription to how often you genuinely want to give that subject attention.",
          "When several newsletters cover the same area, keep the one with the clearest editorial point of view rather than the one with the greatest volume.",
        ],
      },
      {
        heading: "Make unread a neutral state",
        paragraphs: [
          "Not every useful message needs to be opened. A healthy information system permits absence. Archive old unread newsletters in one step and continue from today instead of turning the past into a reading debt.",
          "If a message matters beyond the inbox, move the specific action or insight to the tool where it belongs. The inbox should not become a permanent storage system for vague intentions.",
        ],
      },
    ],
    takeaways: [
      "Keep recurring email only when you can name the job it performs.",
      "Separate messages that require action from optional reading.",
      "Treat unread newsletters as missed moments, not accumulated debt.",
    ],
    relatedSlugs: ["why-one-email-is-enough", "the-case-against-the-feed"],
    productLink: {
      href: "/subscribe",
      label: "Build a smaller reading routine",
      description: "One subscription, with the OneRead notes you choose.",
    },
  },
  {
    slug: "what-makes-a-newsletter-worth-opening",
    title: "What makes a newsletter worth opening?",
    seoTitle: "What Makes an Email Newsletter Worth Reading?",
    date: "2026-07-16",
    updatedDate: "2026-07-30",
    readingMinutes: 4,
    excerpt:
      "The qualities that separate a trusted editorial email from another unread message, from clear selection and sourcing to cadence and consent.",
    category: "Editorial practice",
    keywords: [
      "good newsletter qualities",
      "email newsletter best practices",
      "editorial newsletter",
      "newsletter trust",
      "curated email",
    ],
    introduction: [
      "A good newsletter earns a place in the inbox repeatedly. That requires more than a compelling subject line. The reader needs to trust the selection, understand the promise, and know how much time the edition will ask from them.",
      "These qualities apply whether a newsletter is written by one person or produced by a larger editorial team.",
    ],
    sections: [
      {
        heading: "A specific and stable promise",
        paragraphs: [
          "The reader should be able to explain what they will receive in one sentence. A narrow promise makes editorial decisions clearer and lets subscribers decide whether the product fits their routine.",
          "Consistency does not mean every edition looks identical. It means changes in subject, length, or cadence still feel connected to the reason the reader subscribed.",
        ],
      },
      {
        heading: "Selection before accumulation",
        paragraphs: [
          "A long list of links transfers the hardest work to the reader. Curation adds value by deciding what matters, explaining why, and leaving out material that does not meet the standard.",
          "The number of items should follow the promise. If one piece is enough, adding nine more does not automatically create more value.",
        ],
      },
      {
        heading: "Visible sources and honest uncertainty",
        paragraphs: [
          "Readers should be able to reach the original material easily. Attribution needs to be specific enough to distinguish reporting, analysis, and the newsletter’s own interpretation.",
          "When evidence is incomplete or a subject is changing, responsible language says so. Confidence should reflect the source, not the desired tone.",
        ],
      },
      {
        heading: "Respect for time and consent",
        paragraphs: [
          "A trustworthy newsletter keeps its frequency promise, avoids misleading urgency, and makes account controls easy to find. Unsubscribing should be a direct action rather than a negotiation.",
          "The message should also work across common email clients, remain understandable without images, and use links whose destination is clear.",
        ],
      },
      {
        heading: "An editorial voice without noise",
        paragraphs: [
          "Voice helps a newsletter feel coherent, but style cannot replace substance. The strongest editions use personality to improve clarity and connection, not to inflate a simple idea.",
          "A useful test is whether the reader can recall the central point later in the day. Memorable language helps; a well-chosen idea helps more.",
        ],
      },
    ],
    takeaways: [
      "The promise, cadence, and expected reading time should be clear.",
      "Curation means making and explaining choices, not collecting links.",
      "Trust depends on visible sources, honest qualifications, and easy controls.",
    ],
    relatedSlugs: ["how-we-choose-each-morning", "why-one-email-is-enough"],
    productLink: {
      href: "/samples/article",
      label: "Read a sample OneArticle",
      description: "See the complete structure before subscribing.",
    },
  },
  {
    slug: "how-to-choose-a-film-without-endless-scrolling",
    title: "How to choose a film without endless scrolling",
    seoTitle: "How to Choose a Film Without Endless Scrolling",
    date: "2026-07-24",
    updatedDate: "2026-07-30",
    readingMinutes: 4,
    excerpt:
      "A better film-night method: begin with mood, time, and useful context, then make one confident choice without browsing every streaming catalogue.",
    category: "Film",
    keywords: [
      "how to choose a movie",
      "film recommendation",
      "decision fatigue streaming",
      "movie night ideas",
      "curated films",
    ],
    introduction: [
      "Streaming libraries solved access and created a new problem: choosing can take longer than the opening scene. More options do not reliably produce a more satisfying film night when every title arrives as a thumbnail competing for attention.",
      "A calmer method begins with the experience you want, narrows the field quickly, and gives one film a fair chance.",
    ],
    sections: [
      {
        heading: "Start with the evening, not the catalogue",
        paragraphs: [
          "Ask what kind of attention is available. Do you want something demanding or restorative, familiar or surprising, ninety minutes or an unhurried epic? These constraints are not limitations; they are useful editorial information.",
          "A film that fits tonight can be a better recommendation than a universally acclaimed film that asks for a different mood.",
        ],
      },
      {
        heading: "Use one meaningful dimension at a time",
        paragraphs: [
          "Genre labels are broad. Add one dimension that changes the experience: dialogue-driven, visually expansive, morally complicated, gently comic, or genuinely frightening.",
          "Avoid combining so many filters that the search becomes another form of browsing. Two strong constraints usually create a manageable set.",
        ],
      },
      {
        heading: "Read context, not a plot summary",
        paragraphs: [
          "The most helpful recommendation explains why a film is worth watching now: the director’s approach, a performance, the historical moment, or the formal idea that makes it distinctive.",
          "Detailed plot summaries can reduce curiosity without helping the decision. A good note creates orientation while preserving discovery.",
        ],
      },
      {
        heading: "Set a decision boundary",
        paragraphs: [
          "Choose from a shortlist of no more than three, or accept one trusted recommendation. If the film does not connect after a reasonable opening stretch, changing your mind is allowed. The boundary is there to end browsing, not to turn viewing into obligation.",
          "Keep a small personal list for films that genuinely require a different evening. Do not save every title that merely looks acceptable.",
        ],
      },
      {
        heading: "Let taste develop through attention",
        paragraphs: [
          "After the film, name one element that worked and one that did not. Over time, those observations become more useful than broad star ratings because they describe the experience you actually value.",
          "A curator can introduce unfamiliar work, but the best recommendations also help you understand your own taste more precisely.",
        ],
      },
    ],
    takeaways: [
      "Choose for the time and attention available tonight.",
      "Use two meaningful constraints instead of browsing every category.",
      "Good film context creates curiosity without retelling the plot.",
    ],
    relatedSlugs: ["the-case-against-the-feed", "what-makes-a-newsletter-worth-opening"],
    productLink: {
      href: "/film",
      label: "Meet OneFilm",
      description: "One thoughtful film note for Saturday.",
    },
  },
];

export function getSortedBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getRelatedBlogPosts(post: BlogPost): BlogPost[] {
  return post.relatedSlugs
    .map((slug) => getBlogPost(slug))
    .filter((related): related is BlogPost => Boolean(related));
}

export function getLatestBlogUpdate(): string {
  return BLOG_POSTS.reduce(
    (latest, post) => (post.updatedDate > latest ? post.updatedDate : latest),
    BLOG_POSTS[0]?.updatedDate ?? new Date(0).toISOString()
  );
}
