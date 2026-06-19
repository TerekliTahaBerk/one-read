import type { LingoSegment } from "./segments";
import type { GeneratedLingoLesson } from "./types";

interface HeuristicOptions {
  learningGoal?: string | null;
  interests?: string[];
}

const SAMPLE_BY_TARGET: Record<string, { words: string[]; phrase: string; example: string }> = {
  Spanish: {
    words: ["café", "agua", "cuenta", "por favor"],
    phrase: "Quisiera un café, por favor.",
    example: "Quisiera un café, por favor.",
  },
  French: {
    words: ["café", "eau", "addition", "s'il vous plaît"],
    phrase: "Je voudrais un café, s'il vous plaît.",
    example: "Je voudrais un café, s'il vous plaît.",
  },
  German: {
    words: ["Kaffee", "Wasser", "Rechnung", "bitte"],
    phrase: "Ich möchte einen Kaffee, bitte.",
    example: "Ich möchte einen Kaffee, bitte.",
  },
  Italian: {
    words: ["caffè", "acqua", "conto", "per favore"],
    phrase: "Vorrei un caffè, per favore.",
    example: "Vorrei un caffè, per favore.",
  },
  Turkish: {
    words: ["kahve", "su", "hesap", "lütfen"],
    phrase: "Bir kahve istiyorum, lütfen.",
    example: "Bir kahve istiyorum, lütfen.",
  },
  English: {
    words: ["coffee", "water", "bill", "please"],
    phrase: "I would like a coffee, please.",
    example: "I would like a coffee, please.",
  },
};

export function heuristicLesson(
  seg: LingoSegment,
  opts: HeuristicOptions = {},
): GeneratedLingoLesson {
  const sample = SAMPLE_BY_TARGET[seg.targetLanguage] ?? SAMPLE_BY_TARGET.English;
  const nativeIsTurkish = seg.nativeLanguage === "Turkish";
  const goal = opts.learningGoal ? ` ${opts.learningGoal.toLowerCase()} hedefin için` : "";
  const intro = nativeIsTurkish
    ? `Bugün${goal} kısa ve güvenli bir kafe siparişi pratiği yapacağız.`
    : `Today${goal} we will practice a short, safe cafe order.`;

  return {
    title: `${seg.targetLanguage} cafe order`,
    subject: `Today's OneLingo: a simple ${seg.targetLanguage} order`,
    previewText: `A 5-minute ${seg.targetLanguage} practice for ${seg.level} learners.`,
    content: {
      openingLine: nativeIsTurkish
        ? "Küçük bir ifadeyi rahatça kullanmak, dili günlük hayata taşır."
        : "One small phrase used well can make the language feel more practical.",
      lessonTitle: "Ordering a coffee",
      lessonIntro: intro,
      words: sample.words.map((word) => ({
        word,
        meaning: nativeIsTurkish ? "Günlük siparişlerde kullanılan kelime." : "A useful word for everyday orders.",
        example: sample.example,
      })),
      phrases: [
        {
          phrase: sample.phrase,
          translation: nativeIsTurkish ? "Bir kahve istiyorum, lütfen." : "I would like a coffee, please.",
          whenToUse: nativeIsTurkish
            ? "Nazik ve basit bir sipariş verirken."
            : "When making a simple, polite order.",
        },
      ],
      grammarNote: {
        title: nativeIsTurkish ? "Nazik istek kalıbı" : "Polite request pattern",
        explanation: nativeIsTurkish
          ? "Bu kalıp, doğrudan emir vermeden istek belirtir. Başlangıç ve orta seviyede güvenli bir seçenektir."
          : "This pattern lets you ask without sounding like a command. It is a safe choice for beginner and intermediate practice.",
      },
      exercises: [
        {
          kind: "translate",
          prompt: nativeIsTurkish ? "\"I would like water, please.\" çevir." : "Translate: \"I would like water, please.\"",
          answer: sample.phrase.replace(sample.words[0], sample.words[1]),
        },
        {
          kind: "fill-blank",
          prompt: `${sample.phrase.replace(sample.words[0], "_____")}`,
          answer: sample.words[0],
        },
      ],
      oneThingToRemember: nativeIsTurkish
        ? "Kısa ve nazik sipariş kalıpları gerçek hayatta en çok işe yarayan pratiklerdir."
        : "Short, polite request patterns are among the most useful real-life practices.",
      tomorrowHint: nativeIsTurkish
        ? "Yarın kısa bir cevap verme pratiği yapacağız."
        : "Tomorrow we will practice a short response.",
    },
    generated: true,
    provider: "heuristic",
    model: "heuristic",
    metadata: { source: "heuristic" },
  };
}
