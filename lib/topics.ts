/**
 * One Read — full editorial topic taxonomy.
 *
 * The UI shows a curated subset (`UI_INTEREST_LABELS`) so the form stays
 * minimal. The backend reasons about the full taxonomy via canonical slugs.
 *
 * Subscribers' `interests` field stores the *display labels* the user
 * actually picked (so existing rows keep working). Server code converts
 * to slugs via `interestLabelToSlug`. The new `primaryInterest` and
 * `secondaryInterests` columns store *slugs* — they're the canonical key
 * used for matching against `TopicDailyPick.topic`.
 */

export type TopicSlug = string;

export interface TopicEntry {
  /** Stable, lowercase, kebab-case identifier — never changes. */
  slug: TopicSlug;
  /** Human-facing label. */
  label: string;
  /** Optional ISO-639-1 hint of the label language ("en"). */
  subtopics: readonly string[];
}

/**
 * Canonical taxonomy. Order matters for deterministic rotation in the UI
 * fallbacks and in the admin preview.
 */
export const TOPIC_CATALOG = [
  {
    slug: "artificial-intelligence",
    label: "Artificial Intelligence",
    subtopics: [
      "llms",
      "ai-agents",
      "ai-safety",
      "machine-learning",
      "robotics",
      "automation",
      "ai-products",
      "ai-research",
    ],
  },
  {
    slug: "startups",
    label: "Startups",
    subtopics: [
      "saas",
      "growth",
      "venture-capital",
      "product-market-fit",
      "founder-stories",
      "marketplaces",
      "bootstrapping",
      "pricing",
    ],
  },
  {
    slug: "business",
    label: "Business",
    subtopics: [
      "strategy",
      "operations",
      "leadership",
      "management",
      "company-building",
      "competition",
      "case-studies",
    ],
  },
  {
    slug: "technology",
    label: "Technology",
    subtopics: [
      "consumer-tech",
      "platforms",
      "infrastructure",
      "cybersecurity",
      "hardware",
      "cloud",
      "developer-tools",
    ],
  },
  {
    slug: "software-engineering",
    label: "Software Engineering",
    subtopics: [
      "architecture",
      "databases",
      "frontend",
      "backend",
      "devops",
      "open-source",
      "engineering-culture",
      "programming-languages",
    ],
  },
  {
    slug: "science",
    label: "Science",
    subtopics: [
      "physics",
      "biology",
      "neuroscience",
      "space",
      "mathematics",
      "research",
      "discoveries",
    ],
  },
  {
    slug: "psychology",
    label: "Psychology",
    subtopics: [
      "behavior",
      "decision-making",
      "cognitive-bias",
      "habits",
      "mental-models",
      "motivation",
    ],
  },
  {
    slug: "health",
    label: "Health",
    subtopics: [
      "public-health",
      "longevity",
      "nutrition",
      "sleep",
      "medicine",
      "fitness",
      "mental-health",
    ],
  },
  {
    slug: "finance",
    label: "Finance",
    subtopics: [
      "investing",
      "markets",
      "fintech",
      "personal-finance",
      "crypto-quality",
      "banking",
    ],
  },
  {
    slug: "economics",
    label: "Economics",
    subtopics: [
      "macroeconomics",
      "labor-markets",
      "inflation",
      "inequality",
      "economic-policy",
      "global-trade",
    ],
  },
  {
    slug: "design",
    label: "Design",
    subtopics: [
      "product-design",
      "ux",
      "visual-design",
      "brand",
      "design-systems",
      "creativity",
    ],
  },
  {
    slug: "productivity",
    label: "Productivity",
    subtopics: [
      "focus",
      "time-management",
      "deep-work",
      "workflows",
      "tools",
      "personal-systems",
    ],
  },
  {
    slug: "education",
    label: "Education",
    subtopics: [
      "learning",
      "universities",
      "online-education",
      "teaching",
      "studying",
      "future-of-education",
    ],
  },
  {
    slug: "culture",
    label: "Culture",
    subtopics: [
      "internet-culture",
      "society",
      "books",
      "art",
      "media",
      "trends",
    ],
  },
  {
    slug: "history",
    label: "History",
    subtopics: [
      "world-history",
      "technology-history",
      "business-history",
      "science-history",
      "biographies",
    ],
  },
  {
    slug: "philosophy",
    label: "Philosophy",
    subtopics: [
      "ethics",
      "meaning",
      "knowledge",
      "modern-life",
      "technology-and-society",
    ],
  },
  {
    slug: "climate",
    label: "Climate",
    subtopics: [
      "climate-science",
      "energy",
      "sustainability",
      "clean-tech",
      "environment",
    ],
  },
  {
    slug: "future-of-work",
    label: "Future of Work",
    subtopics: [
      "remote-work",
      "organizations",
      "automation",
      "careers",
      "workplace-culture",
    ],
  },
  {
    slug: "marketing",
    label: "Marketing",
    subtopics: [
      "growth",
      "positioning",
      "storytelling",
      "consumer-psychology",
      "brand-strategy",
    ],
  },
  {
    slug: "media",
    label: "Media",
    subtopics: [
      "journalism",
      "newsletters",
      "creator-economy",
      "social-platforms",
      "publishing",
    ],
  },
  {
    slug: "creativity",
    label: "Creativity",
    subtopics: [
      "writing",
      "creative-process",
      "art",
      "ideation",
      "taste",
    ],
  },
  {
    slug: "personal-growth",
    label: "Personal Growth",
    subtopics: [
      "self-improvement",
      "habits",
      "discipline",
      "reflection",
      "life-strategy",
    ],
  },
] as const satisfies readonly TopicEntry[];

export type CanonicalTopic = (typeof TOPIC_CATALOG)[number];

/* ----------------------------------------------------------------------- */
/* Lookup tables                                                           */
/* ----------------------------------------------------------------------- */

const SLUG_TO_TOPIC = new Map<string, CanonicalTopic>(
  TOPIC_CATALOG.map((t) => [t.slug, t]),
);
const LABEL_TO_TOPIC = new Map<string, CanonicalTopic>(
  TOPIC_CATALOG.map((t) => [t.label.toLowerCase(), t]),
);

/** Returns the canonical entry, or null if unknown. */
export function topicBySlug(slug: string): CanonicalTopic | null {
  return SLUG_TO_TOPIC.get(slug) ?? null;
}

/** Returns the canonical entry, or null if unknown. */
export function topicByLabel(label: string): CanonicalTopic | null {
  return LABEL_TO_TOPIC.get(label.trim().toLowerCase()) ?? null;
}

/** Convert a user-facing label ("Artificial Intelligence") to slug. */
export function interestLabelToSlug(label: string): TopicSlug | null {
  return topicByLabel(label)?.slug ?? null;
}

/** Convert a list of UI labels (the ones stored in Subscriber.interests) to slugs. */
export function interestLabelsToSlugs(labels: readonly string[]): TopicSlug[] {
  const out: TopicSlug[] = [];
  const seen = new Set<TopicSlug>();
  for (const label of labels) {
    const slug = interestLabelToSlug(label);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

/** Slugs of every canonical top-level topic. */
export const ALL_TOPIC_SLUGS: readonly TopicSlug[] = TOPIC_CATALOG.map(
  (t) => t.slug,
);

/* ----------------------------------------------------------------------- */
/* UI subset                                                                */
/* ----------------------------------------------------------------------- */

/**
 * The labels we expose in the signup form. Derived directly from the
 * canonical catalog so the form always offers the full taxonomy and the
 * two lists can never drift out of sync. Catalog order is preserved.
 */
export type UIInterestLabel = CanonicalTopic["label"];

export const UI_INTEREST_LABELS: readonly UIInterestLabel[] = TOPIC_CATALOG.map(
  (t) => t.label,
);
