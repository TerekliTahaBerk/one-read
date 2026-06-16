/**
 * One Read — email + summary chrome translations.
 *
 * The LLM writes the *editorial* content (summary, hook, takeaways) in the
 * subscriber's chosen language. This module owns the surrounding *chrome*:
 * button labels, reaction prompts, the tagline, date locale, and the
 * personalization line. One dictionary per supported summary language, with
 * a safe English fallback for any value we haven't translated.
 *
 * Add a language: extend `SUMMARY_LANGUAGES` in `lib/options.ts`, then add a
 * matching entry to `STRINGS`, `LOCALES`, and `HTML_LANGS` here.
 */

export interface EmailStrings {
  readLabel: string;
  reactionPrompt: string;
  reactionLoved: string;
  reactionLiked: string;
  reactionMeh: string;
  reactionDisliked: string;
  unsubscribeLabel: string;
  tagline: string;
  originalTitleLabel: string;
  keyTakeawaysLabel: string;
  rememberLabel: string;
  /** "From {source}, on {topic}:" framing used by the heuristic summarizer. */
  heuristicIntro: (sourceName: string, topicLabel: string) => string;
  /** Generic fallback body when an article has no excerpt (heuristic only). */
  heuristicFallback: string;
  /** Personalization line above the headline. */
  personalizationLine: (topicLabel: string, hasMultiple: boolean) => string;
}

const EN: EmailStrings = {
  readLabel: "Read the full article",
  reactionPrompt: "How was this read?",
  reactionLoved: "Loved it",
  reactionLiked: "Liked it",
  reactionMeh: "Meh",
  reactionDisliked: "Not for me",
  unsubscribeLabel: "Unsubscribe",
  tagline: "One article. Every morning. Curated for you.",
  originalTitleLabel: "Original title",
  keyTakeawaysLabel: "Key takeaways",
  rememberLabel: "Remember",
  heuristicIntro: (source, topic) => `From ${source}, on ${topic}:`,
  heuristicFallback:
    "A short read to start your morning: the main idea, distilled — follow the link for the full piece.",
  personalizationLine: (topic, multiple) =>
    multiple
      ? `Picked from your ${topic} track today.`
      : `Picked for your interest in ${topic}.`,
};

const TR: EmailStrings = {
  readLabel: "Tam yazıyı oku",
  reactionPrompt: "Bu yazıyı beğendin mi?",
  reactionLoved: "Çok iyiydi",
  reactionLiked: "İyiydi",
  reactionMeh: "İdare eder",
  reactionDisliked: "Olmadı",
  unsubscribeLabel: "Aboneliği bırak",
  tagline: "Bir makale. Her sabah. Sana göre seçilmiş.",
  originalTitleLabel: "Orijinal başlık",
  keyTakeawaysLabel: "Öne çıkanlar",
  rememberLabel: "Aklında kalsın",
  heuristicIntro: (source, topic) =>
    `${source} kaynağından, ${topic} alanında bir yazı:`,
  heuristicFallback:
    "Sabaha bir okuma: ana fikri kısaca aktarır, gerekirse tam metne yönlendirir.",
  personalizationLine: (topic, multiple) =>
    multiple ? `Bugün ${topic} hattından.` : `${topic} ilgin için seçildi.`,
};

const ES: EmailStrings = {
  readLabel: "Leer el artículo completo",
  reactionPrompt: "¿Qué te pareció esta lectura?",
  reactionLoved: "Me encantó",
  reactionLiked: "Me gustó",
  reactionMeh: "Regular",
  reactionDisliked: "No es para mí",
  unsubscribeLabel: "Cancelar suscripción",
  tagline: "Un artículo. Cada mañana. Elegido para ti.",
  originalTitleLabel: "Título original",
  keyTakeawaysLabel: "Puntos clave",
  rememberLabel: "Para recordar",
  heuristicIntro: (source, topic) => `De ${source}, sobre ${topic}:`,
  heuristicFallback:
    "Una lectura breve para empezar la mañana: la idea principal, resumida — sigue el enlace para el texto completo.",
  personalizationLine: (topic, multiple) =>
    multiple
      ? `Elegido hoy de tu sección de ${topic}.`
      : `Elegido por tu interés en ${topic}.`,
};

const FR: EmailStrings = {
  readLabel: "Lire l'article complet",
  reactionPrompt: "Cette lecture vous a plu ?",
  reactionLoved: "Excellent",
  reactionLiked: "Bien",
  reactionMeh: "Bof",
  reactionDisliked: "Pas pour moi",
  unsubscribeLabel: "Se désabonner",
  tagline: "Un article. Chaque matin. Choisi pour vous.",
  originalTitleLabel: "Titre original",
  keyTakeawaysLabel: "À retenir",
  rememberLabel: "Le point essentiel",
  heuristicIntro: (source, topic) => `De ${source}, sur ${topic} :`,
  heuristicFallback:
    "Une courte lecture pour bien commencer la matinée : l'idée principale, condensée — suivez le lien pour l'article complet.",
  personalizationLine: (topic, multiple) =>
    multiple
      ? `Choisi aujourd'hui dans votre fil ${topic}.`
      : `Choisi pour votre intérêt pour ${topic}.`,
};

const DE: EmailStrings = {
  readLabel: "Den ganzen Artikel lesen",
  reactionPrompt: "Wie war diese Lektüre?",
  reactionLoved: "Großartig",
  reactionLiked: "Gut",
  reactionMeh: "Geht so",
  reactionDisliked: "Nichts für mich",
  unsubscribeLabel: "Abmelden",
  tagline: "Ein Artikel. Jeden Morgen. Für dich ausgewählt.",
  originalTitleLabel: "Originaltitel",
  keyTakeawaysLabel: "Das Wichtigste",
  rememberLabel: "Zum Merken",
  heuristicIntro: (source, topic) => `Von ${source}, über ${topic}:`,
  heuristicFallback:
    "Eine kurze Lektüre für den Morgen: der Kerngedanke, verdichtet — dem Link für den ganzen Text folgen.",
  personalizationLine: (topic, multiple) =>
    multiple
      ? `Heute aus deiner ${topic}-Auswahl.`
      : `Ausgewählt wegen deines Interesses an ${topic}.`,
};

const STRINGS: Record<string, EmailStrings> = {
  English: EN,
  Turkish: TR,
  Spanish: ES,
  French: FR,
  German: DE,
};

const LOCALES: Record<string, string> = {
  English: "en-US",
  Turkish: "tr-TR",
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
};

const HTML_LANGS: Record<string, string> = {
  English: "en",
  Turkish: "tr",
  Spanish: "es",
  French: "fr",
  German: "de",
};

/** Resolve the chrome strings for a language, falling back to English. */
export function getEmailStrings(lang: string): EmailStrings {
  return STRINGS[lang] ?? EN;
}

/** BCP-47 locale for `Date.toLocaleDateString`, falling back to en-US. */
export function localeFor(lang: string): string {
  return LOCALES[lang] ?? "en-US";
}

/** `<html lang>` value, falling back to "en". */
export function htmlLangFor(lang: string): string {
  return HTML_LANGS[lang] ?? "en";
}
