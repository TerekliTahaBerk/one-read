import { topicInterestMatch, type SubscriberContext } from "@/lib/personalization";
import { articleTopics } from "@/lib/product-preferences";

type Candidate = { id: string; topics: string[]; createdAt: Date };
type Preferences = Parameters<typeof articleTopics>[0];

/** Reuses the canonical primary/secondary topic scorer for approved editions.
 * The earliest authored edition is the stable editorial fallback. Editorial
 * topic metadata uses the canonical taxonomy independently of mobile navigation.
 */
export function selectArticleEdition<T extends Candidate>(candidates: readonly T[], preferences: Preferences): T {
  const topics = articleTopics(preferences);
  const context: SubscriberContext = { primaryInterest: topics[0] ?? null, secondaryInterests: topics.slice(1), sourceLanguage: "Any", recentlySentTopics: [] };
  const ranked = candidates.map((candidate) => ({ candidate, score: Math.max(0, ...candidate.topics.map((topic) => topicInterestMatch({
    topic, subtopics: [], sourceLanguage: "Any", sourceName: "", qualityScore: 1, usefulnessScore: 1, morningReadScore: 1,
  }, context))) }));
  ranked.sort((a, b) => b.score - a.score || a.candidate.createdAt.getTime() - b.candidate.createdAt.getTime() || a.candidate.id.localeCompare(b.candidate.id));
  if (!ranked.length) throw new Error("no_approved_article_candidates");
  return ranked[0].candidate;
}
