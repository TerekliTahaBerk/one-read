/**
 * The OneRead product catalog. Products can remain operational in admin while
 * hidden from the public marketing site.
 */
export interface ProductInfo {
  key: string;
  name: string;
  status: "live" | "waitlist";
  /** True when subscriber data is in our database. */
  connected: boolean;
  /** Public marketing visibility. Hidden products stay available in admin. */
  publicVisible: boolean;
}

export const PRODUCTS: readonly ProductInfo[] = [
  { key: "one-read", name: "OneRead (umbrella)", status: "live", connected: true, publicVisible: true },
  { key: "one-article", name: "OneArticle", status: "live", connected: true, publicVisible: true },
  { key: "one-film", name: "OneFilm", status: "live", connected: true, publicVisible: true },
  { key: "one-news", name: "OneNews", status: "live", connected: true, publicVisible: true },
  { key: "one-lingo", name: "OneLingo", status: "live", connected: true, publicVisible: false },
  { key: "one-dish", name: "OneDish", status: "waitlist", connected: false, publicVisible: false },
];

export const WAITLIST_NOTE = "External Tally waitlist — not connected yet";
