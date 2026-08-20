import type { MetadataRoute } from "next";
import { BLOG_POSTS, getLatestBlogUpdate } from "@/lib/blog";
import { absoluteSiteUrl } from "@/lib/site-url";

const PUBLIC_ROUTES = [
  "/",
  "/article",
  "/pricing",
  "/blog",
  "/terms",
  "/privacy",
  "/editorial",
  "/samples/article",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = PUBLIC_ROUTES.map((route) => ({
    url: absoluteSiteUrl(route),
    ...(route === "/blog"
      ? { lastModified: new Date(getLatestBlogUpdate()) }
      : {}),
    changeFrequency: route === "/" ? "weekly" as const : "monthly" as const,
    priority: route === "/" ? 1 : route === "/article" ? 0.9 : 0.7,
  }));

  const posts = BLOG_POSTS.map((post) => ({
    url: absoluteSiteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updatedDate),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...routes, ...posts];
}
