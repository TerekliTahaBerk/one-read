import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";

const PUBLIC_ROUTES = [
  "/",
  "/article",
  "/film",
  "/pricing",
  "/blog",
  "/terms",
  "/privacy",
  "/editorial",
  "/samples/article",
  "/samples/film",
] as const;

function siteUrl(path: string): string {
  const base = process.env.PUBLIC_BASE_URL?.trim() || "https://oneread.email";
  return new URL(path, base).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = PUBLIC_ROUTES.map((route) => ({
    url: siteUrl(route),
    changeFrequency: route === "/" ? "weekly" as const : "monthly" as const,
    priority: route === "/" ? 1 : route === "/article" || route === "/film" ? 0.9 : 0.7,
  }));

  const posts = BLOG_POSTS.map((post) => ({
    url: siteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
  }));

  return [...routes, ...posts];
}
