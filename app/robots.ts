import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/subscribe",
        "/preferences",
        "/unsubscribe",
        "/subscribe/success",
      ],
    },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
