import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/site-url";

const PUBLIC_ROUTES = [
  "/",
  "/article",
  "/pricing",
  "/terms",
  "/privacy",
  "/editorial",
  "/samples/article",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = PUBLIC_ROUTES.map((route) => ({
    url: absoluteSiteUrl(route),
    changeFrequency: route === "/" ? "weekly" as const : "monthly" as const,
    priority: route === "/" ? 1 : route === "/article" ? 0.9 : 0.7,
  }));

  return routes;
}
