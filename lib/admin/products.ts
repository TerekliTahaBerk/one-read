/**
 * The OneRead product family. OneArticle and OneLingo are live and backed by
 * the database; the rest are waitlist products whose signups live in an
 * external Tally form, not our DB. We never fabricate waitlist counts — the
 * dashboard shows an explicit "not connected yet" note for those.
 */
export interface ProductInfo {
  key: string;
  name: string;
  status: "live" | "waitlist";
  /** True when subscriber data is in our database (OneArticle + OneLingo). */
  connected: boolean;
}

export const PRODUCTS: readonly ProductInfo[] = [
  { key: "one-article", name: "OneArticle", status: "live", connected: true },
  { key: "one-lingo", name: "OneLingo", status: "live", connected: true },
  { key: "one-news", name: "OneNews", status: "live", connected: true },
  { key: "one-film", name: "OneFilm", status: "live", connected: true },
  { key: "one-dish", name: "OneDish", status: "waitlist", connected: false },
];

export const WAITLIST_NOTE = "External Tally waitlist — not connected yet";
