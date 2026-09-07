export type NewsCandidate = { id: string; readingLanguage: string; editorialRank: number; topic: string | null; subtopics: string[] };

/** First chosen topic is primary; secondary choices follow in saved order.
 * Rank breaks ties. Empty/legacy topics and no match always receive the lead.
 */
export function selectOneNewsCandidate<T extends NewsCandidate>(candidates: readonly T[], topics: readonly string[], language: string): T {
  const ordered = candidates.filter((candidate) => candidate.readingLanguage === language)
    .sort((a, b) => a.editorialRank - b.editorialRank || a.id.localeCompare(b.id));
  const lead = ordered.find((candidate) => candidate.editorialRank === 0);
  if (!lead) throw new Error("publication_slot_requires_editorial_lead");
  for (const topic of topics) {
    const match = ordered.find((candidate) => candidate.topic === topic)
      ?? ordered.find((candidate) => candidate.subtopics.includes(topic));
    if (match) return match;
  }
  return lead;
}
