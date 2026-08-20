import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { getSortedBlogPosts } from "@/lib/blog";
import { absoluteSiteUrl } from "@/lib/site-url";

const description =
  "Practical essays from OneRead on intentional reading, editorial curation, and calmer email.";

export const metadata: Metadata = {
  title: "Intentional Reading & Editorial Curation — OneRead Journal",
  description,
  keywords: [
    "intentional reading",
    "curated newsletter",
    "information overload",
    "editorial curation",
    "calm technology",
  ],
  alternates: {
    canonical: "/blog",
    types: {
      "application/rss+xml": "/blog/feed.xml",
    },
  },
  openGraph: {
    title: "The OneRead Journal",
    description,
    type: "website",
    url: "/blog",
    siteName: "OneRead",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "The OneRead Journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The OneRead Journal",
    description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function BlogPage() {
  const posts = getSortedBlogPosts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${absoluteSiteUrl("/blog")}#blog`,
        url: absoluteSiteUrl("/blog"),
        name: "The OneRead Journal",
        description,
        publisher: {
          "@type": "Organization",
          "@id": `${absoluteSiteUrl("/")}#organization`,
          name: "OneRead",
          url: absoluteSiteUrl("/"),
        },
        blogPost: posts.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          dateModified: post.updatedDate,
          url: absoluteSiteUrl(`/blog/${post.slug}`),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "OneRead",
            item: absoluteSiteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Journal",
            item: absoluteSiteUrl("/blog"),
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <BlogIndex />
    </>
  );
}
