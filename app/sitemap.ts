import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = [
  "/",
  "/article",
  "/film",
  "/news",
  "/pricing",
  "/subscribe",
  "/preferences",
  "/terms",
  "/privacy",
] as const;

function siteUrl(path: string): string {
  const base = process.env.PUBLIC_BASE_URL?.trim() || "https://oneread.app";
  return new URL(path, base).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: siteUrl(route),
    lastModified: now,
  }));
}
