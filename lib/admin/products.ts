/**
 * The OneRead product family. OneArticle is live and backed by the database;
 * the rest are waitlist products whose signups live in an external Tally form,
 * not our DB. We never fabricate waitlist counts — the dashboard shows an
 * explicit "not connected yet" note for those.
 */
export interface ProductInfo {
  key: string;
  name: string;
  status: "live" | "waitlist";
  /** True when subscriber data is in our database (only OneArticle today). */
  connected: boolean;
}

export const PRODUCTS: readonly ProductInfo[] = [
  { key: "one-article", name: "OneArticle", status: "live", connected: true },
  { key: "one-lingo", name: "OneLingo", status: "waitlist", connected: false },
  { key: "one-goal", name: "OneGoal", status: "waitlist", connected: false },
  { key: "one-plate", name: "OnePlate", status: "waitlist", connected: false },
  { key: "one-move", name: "OneMove", status: "waitlist", connected: false },
];

export const WAITLIST_NOTE = "External Tally waitlist — not connected yet";
