const DEFAULT_SITE_URL = "https://www.oneread.email";

export function getSiteOrigin(): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (!configured) return DEFAULT_SITE_URL;

  try {
    const url = new URL(configured);
    // Vercel permanently redirects the apex domain to www. Keep metadata,
    // structured data, feeds, and sitemap URLs on the same canonical host.
    if (url.hostname === "oneread.email") {
      url.hostname = "www.oneread.email";
    }
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteSiteUrl(path: string): string {
  return new URL(path, `${getSiteOrigin()}/`).toString();
}
