import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.PUBLIC_BASE_URL?.trim() || "https://oneread.email";
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
        "/waitlist",
      ],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
