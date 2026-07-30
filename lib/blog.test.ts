import { describe, expect, it } from "vitest";
import {
  BLOG_POSTS,
  getBlogPost,
  getLatestBlogUpdate,
  getRelatedBlogPosts,
  getSortedBlogPosts,
} from "./blog";

function articleWordCount(slug: string): number {
  const post = getBlogPost(slug);
  if (!post) return 0;
  return [
    ...post.introduction,
    ...post.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
    ...post.takeaways,
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

describe("blog content integrity", () => {
  it("uses unique, stable-looking slugs", () => {
    const slugs = BLOG_POSTS.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
  });

  it("has complete SEO and editorial fields", () => {
    for (const post of BLOG_POSTS) {
      expect(post.seoTitle.length).toBeGreaterThanOrEqual(30);
      expect(post.seoTitle.length).toBeLessThanOrEqual(65);
      expect(post.excerpt.length).toBeGreaterThanOrEqual(110);
      expect(post.excerpt.length).toBeLessThanOrEqual(165);
      expect(post.keywords.length).toBeGreaterThanOrEqual(3);
      expect(post.sections.length).toBeGreaterThanOrEqual(4);
      expect(post.takeaways.length).toBeGreaterThanOrEqual(3);
      expect(articleWordCount(post.slug)).toBeGreaterThanOrEqual(300);
    }
  });

  it("keeps publication and update dates valid", () => {
    for (const post of BLOG_POSTS) {
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.updatedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.updatedDate >= post.date).toBe(true);
      expect(Number.isNaN(new Date(post.date).valueOf())).toBe(false);
    }
  });

  it("only references existing, non-self related posts", () => {
    for (const post of BLOG_POSTS) {
      const related = getRelatedBlogPosts(post);
      expect(related).toHaveLength(post.relatedSlugs.length);
      expect(related.every((item) => item.slug !== post.slug)).toBe(true);
    }
  });

  it("sorts newest first and exposes the latest update", () => {
    const sorted = getSortedBlogPosts();
    expect(sorted.map((post) => post.date)).toEqual(
      [...sorted.map((post) => post.date)].sort().reverse()
    );
    expect(getLatestBlogUpdate()).toBe(
      [...BLOG_POSTS.map((post) => post.updatedDate)].sort().at(-1)
    );
  });
});

