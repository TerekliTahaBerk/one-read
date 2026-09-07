import { parseSummaryLanguage } from "./options";
import { interestLabelsToSlugs, topicBySlug } from "./topics";
import { OFFERS, type OfferKey } from "./products/registry";

export const MIN_PRODUCT_TOPICS = 1;
export const MAX_PRODUCT_TOPICS = 5;
export type EditorialPreferences = { topics: string[]; summaryLanguage: string };

/** The first selected topic is primary; removing it promotes the next one. */
export function parseProductTopics(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < MIN_PRODUCT_TOPICS || value.length > MAX_PRODUCT_TOPICS) return null;
  if (value.some((topic) => typeof topic !== "string" || !topicBySlug(topic))) return null;
  if (new Set(value).size !== value.length) return null;
  return [...value];
}

export function parseProductPreferences(value: { topics?: unknown; summaryLanguage?: unknown }): EditorialPreferences | null {
  const topics = parseProductTopics(value.topics);
  const summaryLanguage = parseSummaryLanguage(value.summaryLanguage);
  return topics && summaryLanguage ? { topics, summaryLanguage } : null;
}

export function articleTopics(value?: { primaryInterest?: string | null; secondaryInterests?: string[]; interests?: string[] } | null): string[] {
  if (!value) return [];
  return [...new Set([
    ...(value.primaryInterest ? [value.primaryInterest] : []),
    ...(value.secondaryInterests ?? []),
    ...interestLabelsToSlugs(value.interests ?? []),
  ])].filter((slug) => topicBySlug(slug));
}

export function articlePreferenceFields(value: EditorialPreferences) {
  return {
    interests: value.topics.map((slug) => topicBySlug(slug)!.label),
    primaryInterest: value.topics[0],
    secondaryInterests: value.topics.slice(1),
    summaryLanguage: value.summaryLanguage,
  };
}

export function requiredPreferenceProducts(offer: OfferKey) {
  return OFFERS[offer].grants;
}
