import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/BlogArticle";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { absoluteSiteUrl } from "@/lib/site-url";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const post = getBlogPost(params.slug);
  if (!post) return { title: "Journal — OneRead" };

  const path = `/blog/${post.slug}`;
  const image = `${path}/opengraph-image`;

  return {
    title: post.seoTitle,
    description: post.excerpt,
    keywords: post.keywords,
    category: post.category,
    authors: [
      {
        name: "OneRead Editorial",
        url: "/editorial",
      },
    ],
    creator: "OneRead Editorial",
    publisher: "OneRead",
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: post.seoTitle,
      description: post.excerpt,
      type: "article",
      url: path,
      siteName: "OneRead",
      publishedTime: new Date(post.date).toISOString(),
      modifiedTime: new Date(post.updatedDate).toISOString(),
      authors: ["OneRead Editorial"],
      tags: post.keywords,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle,
      description: post.excerpt,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function BlogPostPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const url = absoluteSiteUrl(`/blog/${post.slug}`);
  const image = absoluteSiteUrl(`/blog/${post.slug}/opengraph-image`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": url,
        },
        headline: post.title,
        description: post.excerpt,
        image: [image],
        datePublished: post.date,
        dateModified: post.updatedDate,
        articleSection: post.category,
        keywords: post.keywords.join(", "),
        wordCount: [
          ...post.introduction,
          ...post.sections.flatMap((section) => section.paragraphs),
          ...post.takeaways,
        ]
          .join(" ")
          .split(/\s+/)
          .filter(Boolean).length,
        author: {
          "@type": "Organization",
          name: "OneRead Editorial",
          url: absoluteSiteUrl("/editorial"),
        },
        publisher: {
          "@type": "Organization",
          "@id": `${absoluteSiteUrl("/")}#organization`,
          name: "OneRead",
          url: absoluteSiteUrl("/"),
          logo: {
            "@type": "ImageObject",
            url: absoluteSiteUrl("/icon.png"),
          },
        },
        isPartOf: {
          "@type": "Blog",
          "@id": `${absoluteSiteUrl("/blog")}#blog`,
          name: "The OneRead Journal",
        },
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
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: url,
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
      <BlogArticle post={post} />
    </>
  );
}
