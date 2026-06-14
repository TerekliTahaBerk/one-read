/**
 * One Read — URL canonicalization.
 *
 * Strips tracking params, fragments, trailing slashes; lowercases host.
 * Used for stronger deduplication when the same article surfaces from
 * multiple feeds with slightly different URLs.
 */

const TRACKING_PARAM_PREFIXES = [
  "utm_",
  "mc_",
  "vero_",
  "gclid",
  "fbclid",
  "mkt_tok",
  "ref_",
  "_hsenc",
  "_hsmi",
];

const TRACKING_PARAM_EXACT = new Set([
  "ref",
  "source",
  "src",
  "feature",
  "spm",
]);

export function canonicalizeUrl(input: string): string | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  url.protocol = "https:";
  url.hash = "";
  url.host = url.host.toLowerCase();

  // Drop common tracking params.
  const params = url.searchParams;
  const toDelete: string[] = [];
  for (const key of params.keys()) {
    const lower = key.toLowerCase();
    if (TRACKING_PARAM_EXACT.has(lower)) toDelete.push(key);
    else if (TRACKING_PARAM_PREFIXES.some((p) => lower.startsWith(p))) toDelete.push(key);
  }
  for (const k of toDelete) params.delete(k);
  // Sort remaining params for stable canonical form.
  const sorted = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [k, v] of sorted) url.searchParams.append(k, v);

  // Trim trailing slash on path (but not for root).
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}
