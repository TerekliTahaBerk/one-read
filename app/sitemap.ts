import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";

const PUBLIC_ROUTES = [
  "/",
  "/article",
  "/pricing",
  "/subscribe",
  "/preferences",
  "/blog",
  "/terms",
  "/privacy",
] as const;

function siteUrl(path: string): string {
  const base = process.env.PUBLIC_BASE_URL?.trim() || "https://oneread.app";
  return new URL(path, base).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = PUBLIC_ROUTES.map((route) => ({
    url: siteUrl(route),
    lastModified: now,
  }));

  const posts = BLOG_POSTS.map((post) => ({
    url: siteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
  }));

  return [...routes, ...posts];
}
