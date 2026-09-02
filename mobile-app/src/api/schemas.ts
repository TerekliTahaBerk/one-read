import { z } from "zod";

const block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({ type: z.literal("heading"), text: z.string().min(1) }),
  z.object({ type: z.literal("quote"), text: z.string().min(1), attribution: z.string().optional() }),
  z.object({ type: z.literal("callout"), title: z.string().optional(), text: z.string().min(1) }),
  z.object({ type: z.literal("divider") }),
  z.object({ type: z.literal("image"), url: z.url({ protocol: /^https$/ }), alt: z.string(), credit: z.string().optional() }),
  z.object({ type: z.literal("sourceNote"), text: z.string().min(1) }),
]);

export const articleSchema = z.object({
  id: z.string().min(1), date: z.iso.datetime(), label: z.literal("OneArticle"), headline: z.string().min(1), deck: z.string().nullable(),
  readingLanguage: z.string(), readingMinutes: z.number().int().positive(),
  topics: z.array(z.enum(["Macro", "Ideas", "Society", "Science"])).default([]),
  listen: z.object({ enabled: z.boolean(), audioUrl: z.url({ protocol: /^https$/ }).nullable(), durationSeconds: z.number().int().positive().nullable() }),
  heroImage: z.object({ url: z.url({ protocol: /^https$/ }), alt: z.string(), credit: z.string().nullable() }).nullable(),
  source: z.object({ title: z.string(), name: z.string(), url: z.url({ protocol: /^https$/ }), ctaLabel: z.string() }).nullable(),
  blocks: z.array(block), progress: z.number().int().min(0).max(100),
});
export const todaySchema = z.object({ state: z.enum(["UPCOMING", "AVAILABLE", "READ", "NO_EDITION", "SUBSCRIPTION_REQUIRED", "ACCOUNT_INCOMPLETE", "DELIVERY_FAILED_BUT_READABLE"]), serverTime: z.iso.datetime(), issue: articleSchema.nullable() });
export const exploreSchema = z.object({ sections: z.array(z.object({ id: z.string(), title: z.string(), subtitle: z.string(), items: z.array(articleSchema).max(4) })).max(4) });
export const librarySchema = z.object({ items: z.array(articleSchema).max(20), page: z.number().int().positive(), hasMore: z.boolean() });
