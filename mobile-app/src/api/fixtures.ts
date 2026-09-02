import type { Article, Today } from "@/types/article";

export const todayArticle: Article = {
  id: "fixture-cities-shade",
  date: "2026-08-20T04:00:00.000Z",
  label: "OneArticle",
  headline: "The quiet infrastructure that makes a city bearable in summer",
  deck: "Shade is easy to overlook. In a hotter world, it is becoming essential public infrastructure.",
  readingLanguage: "English",
  readingMinutes: 7,
  topics: ["Society", "Science"],
  listen: { enabled: true, audioUrl: null, durationSeconds: null },
  heroImage: null,
  source: { title: "Shade as civic infrastructure", name: "Works in Progress", url: "https://worksinprogress.co/", ctaLabel: "Read the original" },
  progress: 0,
  blocks: [
    { type: "paragraph", text: "Cities have always been shaped by what their residents need to move through them. Roads, lights, water and transit are treated as infrastructure. Shade rarely is." },
    { type: "paragraph", text: "That distinction is getting harder to defend. As extreme heat becomes more common, the difference between a shaded street and an exposed one can determine whether a short walk is pleasant, exhausting or dangerous." },
    { type: "quote", text: "The best public infrastructure often disappears into an ordinary day." },
    { type: "heading", text: "A small intervention with a wide reach" },
    { type: "paragraph", text: "Trees are the most generous answer, cooling the air as well as blocking direct sun. But they need years, soil, water and care. A serious shade strategy also uses awnings, arcades, canopies and well-placed transit shelters." },
    { type: "callout", title: "Why it matters", text: "Heat resilience is not only an engineering problem. It is a question of who can comfortably participate in public life." },
    { type: "paragraph", text: "The useful lesson is not that every pavement needs a roof. It is that comfort can be planned. A city that maps shade with the same seriousness as traffic begins to see the daily journeys that conventional infrastructure misses." },
    { type: "sourceNote", text: "OneRead summary based on the original reporting. The source remains authoritative." },
  ],
};

export const fixtureToday: Today = { state: "AVAILABLE", serverTime: new Date().toISOString(), issue: todayArticle };
export const fixtureArchive: Article[] = [
  todayArticle,
  { ...todayArticle, id: "fixture-small-nuclear", date: "2026-08-19T04:00:00.000Z", headline: "Why smaller nuclear reactors keep returning to the conversation", deck: "A measured look at the promise—and the constraints—of modular nuclear power.", readingMinutes: 6, topics: ["Macro", "Science"] },
  { ...todayArticle, id: "fixture-library", date: "2026-08-18T04:00:00.000Z", headline: "The library that lends more than books", deck: "What happens when public libraries treat useful objects as shared civic goods.", readingMinutes: 5, topics: ["Ideas", "Society"] },
  { ...todayArticle, id: "fixture-soil", date: "2026-08-15T04:00:00.000Z", headline: "The patient science of rebuilding soil", deck: "Healthy ground is made slowly, through thousands of small biological exchanges.", readingMinutes: 8, topics: ["Science", "Society"] },
  { ...todayArticle, id: "fixture-language", date: "2026-08-14T04:00:00.000Z", headline: "How a language becomes easier to learn", deck: "Good teaching makes patterns visible without sanding away their character.", readingMinutes: 5, topics: ["Ideas", "Society"] },
];
