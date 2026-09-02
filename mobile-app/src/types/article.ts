export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "callout"; title?: string; text: string }
  | { type: "divider" }
  | { type: "image"; url: string; alt: string; credit?: string }
  | { type: "sourceNote"; text: string };

export type Article = {
  id: string;
  date: string;
  label: "OneArticle";
  headline: string;
  deck: string | null;
  readingLanguage: string;
  readingMinutes: number;
  topics: ("Macro" | "Ideas" | "Society" | "Science")[];
  listen: { enabled: boolean; audioUrl: string | null; durationSeconds: number | null };
  heroImage: { url: string; alt: string; credit: string | null } | null;
  source: { title: string; name: string; url: string; ctaLabel: string } | null;
  blocks: ArticleBlock[];
  progress: number;
};

export type Today = { state: "UPCOMING" | "AVAILABLE" | "READ" | "NO_EDITION" | "SUBSCRIPTION_REQUIRED" | "ACCOUNT_INCOMPLETE" | "DELIVERY_FAILED_BUT_READABLE"; serverTime: string; issue: Article | null };
