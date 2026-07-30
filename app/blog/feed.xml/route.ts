import { getSortedBlogPosts } from "@/lib/blog";
import { absoluteSiteUrl } from "@/lib/site-url";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const posts = getSortedBlogPosts();
  const feedUrl = absoluteSiteUrl("/blog/feed.xml");
  const items = posts
    .map((post) => {
      const url = absoluteSiteUrl(`/blog/${post.slug}`);
      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid isPermaLink="true">${escapeXml(url)}</guid>
          <description>${escapeXml(post.excerpt)}</description>
          <category>${escapeXml(post.category)}</category>
          <pubDate>${new Date(post.date).toUTCString()}</pubDate>
        </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>The OneRead Journal</title>
        <link>${escapeXml(absoluteSiteUrl("/blog"))}</link>
        <description>Practical essays on intentional reading, editorial curation, calmer email, and film.</description>
        <language>en</language>
        <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

